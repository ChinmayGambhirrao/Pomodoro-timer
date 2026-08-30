import { useState, useEffect, useCallback, useRef } from 'react';

// Types
type SessionType = 'work' | 'shortBreak' | 'longBreak';

interface TimerState {
  sessionType: SessionType;
  isRunning: boolean;
  endTimestamp: number | null; // timestamp when the session should end (null when not running)
  remaining: number; // remaining time in seconds (when paused, this is the fixed remaining; when running, it's derived from endTimestamp but we update via effect)
  sessionCount: number; // number of completed work sessions today
  task: string; // current task input
  history: Array<{
    id: string;
    task: string;
    sessionType: SessionType;
    completedAt: number; // timestamp
    duration: number; // in seconds
  }>;
}

// Default durations in minutes
const DEFAULT_WORK_DURATION = 25;
const DEFAULT_SHORT_BREAK = 5;
const DEFAULT_LONG_BREAK = 15;

// Storage keys
const SETTINGS_KEY = 'pomodoro-settings';
const HISTORY_KEY = 'pomodoro-history';

// Helper to get today's date string (YYYY-MM-DD)
const getTodayKey = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

export const useTimer = () => {
  const [state, setState] = useState<TimerState>({
    sessionType: 'work',
    isRunning: false,
    endTimestamp: null,
    remaining: DEFAULT_WORK_DURATION * 60,
    sessionCount: 0,
    task: '',
    history: [],
  });

  const [settings, setSettings] = useState<{
    workDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    autoStartNext: boolean;
    soundEnabled: boolean;
  }>({
    workDuration: DEFAULT_WORK_DURATION,
    shortBreakDuration: DEFAULT_SHORT_BREAK,
    longBreakDuration: DEFAULT_LONG_BREAK,
    autoStartNext: true,
    soundEnabled: true,
  });

  // Refs for timeout IDs and audio element
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Load settings and history from localStorage
  useEffect(() => {
    const loadSettings = () => {
      const saved = localStorage.getItem(SETTINGS_KEY);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          // Merge with defaults to ensure all keys exist
          return {
            workDuration: parsed.workDuration ?? DEFAULT_WORK_DURATION,
            shortBreakDuration: parsed.shortBreakDuration ?? DEFAULT_SHORT_BREAK,
            longBreakDuration: parsed.longBreakDuration ?? DEFAULT_LONG_BREAK,
            autoStartNext: parsed.autoStartNext ?? true,
            soundEnabled: parsed.soundEnabled ?? true,
          };
        } catch (e) {
          console.error('Failed to parse settings', e);
          return {
            workDuration: DEFAULT_WORK_DURATION,
            shortBreakDuration: DEFAULT_SHORT_BREAK,
            longBreakDuration: DEFAULT_LONG_BREAK,
            autoStartNext: true,
            soundEnabled: true,
          };
        }
      }
      return {
        workDuration: DEFAULT_WORK_DURATION,
        shortBreakDuration: DEFAULT_SHORT_BREAK,
        longBreakDuration: DEFAULT_LONG_BREAK,
        autoStartNext: true,
        soundEnabled: true,
      };
    };

    const loadHistory = () => {
      const todayKey = getTodayKey();
      const saved = localStorage.getItem(`${HISTORY_KEY}-${todayKey}`);
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.error('Failed to parse history', e);
          return [];
        }
      }
      return [];
    };

    setSettings(loadSettings());
    setState((prev) => ({
      ...prev,
      history: loadHistory(),
    }));
  }, []);

  // Save settings and history to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    const todayKey = getTodayKey();
    localStorage.setItem(`${HISTORY_KEY}-${todayKey}`, JSON.stringify(state.history));
  }, [state.history]);

  // Update document title with remaining time
  useEffect(() => {
    const updateTitle = () => {
      const minutes = Math.floor(state.remaining / 60);
      const seconds = state.remaining % 60;
      const timeString = `${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
      const prefix = state.isRunning ? '(●) ' : '(○) ';
      document.title = `${prefix}${timeString} - Pomodoro Timer`;
    };

    // If we have an endTimestamp and are running, we update the title every second
    // Otherwise, we just update once
    if (state.endTimestamp !== null && state.isRunning) {
      const interval = setInterval(updateTitle, 1000);
      updateTitle(); // immediate update
      return () => clearInterval(interval);
    } else {
      updateTitle();
    }
  }, [state.remaining, state.isRunning, state.endTimestamp]);

  // Timer tick effect: when endTimestamp is set and isRunning, we update remaining every second
  useEffect(() => {
    if (state.endTimestamp !== null && state.isRunning) {
      const interval = setInterval(() => {
        const now = Date.now();
        const remaining = Math.max(0, Math.floor((state.endTimestamp! - now) / 1000));
        setState((prev) => ({
          ...prev,
          remaining,
        }));

        if (remaining <= 0) {
          clearInterval(interval);
          handleSessionEnd();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
    return undefined;
  }, [state.endTimestamp, state.isRunning]);

  // Play sound
  const playSound = useCallback(() => {
    if (!settings.soundEnabled) return;
    if (audioRef.current) {
      audioRef.current.play().catch((e) => console.error('Failed to play sound', e));
    }
  }, [settings.soundEnabled]);

  // Handle session end
  const handleSessionEnd = useCallback(() => {
    // Play sound
    playSound();

    // Show notification
    if (Notification.permission === 'granted') {
      const title =
        state.sessionType === 'work'
          ? 'Work session completed!'
          : state.sessionType === 'shortBreak'
          ? 'Break over!'
          : 'Long break over!';
      const body = `Time to ${state.sessionType === 'work' ? 'take a break' : 'get back to work'}`;
      new Notification(title, { body });
    }

    // Add to history if it's a work session
    const newHistoryItem =
      state.sessionType === 'work'
        ? {
            id: crypto.randomUUID(),
            task: state.task,
            sessionType: state.sessionType,
            completedAt: Date.now(),
            duration:
              state.sessionType === 'work'
                ? settings.workDuration * 60
                : state.sessionType === 'shortBreak'
                ? settings.shortBreakDuration * 60
                : settings.longBreakDuration * 60,
          }
        : null;

    // Determine next session type
    let nextSessionType: SessionType;
    let newSessionCount = state.sessionCount;
    if (state.sessionType === 'work') {
      newSessionCount = state.sessionCount + 1;
      // Every 4 work sessions, the next break is long
      if (newSessionCount % 4 === 0) {
        nextSessionType = 'longBreak';
      } else {
        nextSessionType = 'shortBreak';
      }
    } else {
      // After a break, next is work
      nextSessionType = 'work';
    }

    // Update state
    setState((prev) => {
      let updatedHistory = prev.history;
      if (newHistoryItem) {
        updatedHistory = [...prev.history, newHistoryItem];
      }
      return {
        ...prev,
        sessionType: nextSessionType,
        isRunning: settings.autoStartNext,
        endTimestamp:
          settings.autoStartNext
            ? Date.now() +
              (nextSessionType === 'work'
                ? settings.workDuration * 60 * 1000
                : nextSessionType === 'shortBreak'
                ? settings.shortBreakDuration * 60 * 1000
                : settings.longBreakDuration * 60 * 1000)
            : null,
        remaining:
          settings.autoStartNext
            ? nextSessionType === 'work'
              ? settings.workDuration * 60
              : nextSessionType === 'shortBreak'
                ? settings.shortBreakDuration * 60
                : settings.longBreakDuration * 60
            : 0, // if not auto-start, remaining is 0? Actually, we want to show the full duration of the next session so user can start manually.
        sessionCount: newSessionCount,
        task: '', // clear task after session ends
        history: updatedHistory,
      };
    });
  }, [
    state.sessionType,
    state.task,
    state.sessionCount,
    settings,
    playSound,
  ]);

  // Start timer
  const startTimer = useCallback(() => {
    if (state.isRunning) return;

    let durationInSeconds = 0;
    switch (state.sessionType) {
      case 'work':
        durationInSeconds = settings.workDuration * 60;
        break;
      case 'shortBreak':
        durationInSeconds = settings.shortBreakDuration * 60;
        break;
      case 'longBreak':
        durationInSeconds = settings.longBreakDuration * 60;
        break;
    }

    setState((prev) => ({
      ...prev,
      isRunning: true,
      endTimestamp: Date.now() + durationInSeconds * 1000,
      // Note: remaining will be updated by the effect
    }));
  }, [state.sessionType, settings.workDuration, settings.shortBreakDuration, settings.longBreakDuration]);

  // Pause timer
  const pauseTimer = useCallback(() => {
    if (!state.isRunning) return;
    setState((prev) => ({
      ...prev,
      isRunning: false,
      // We keep endTimestamp to calculate remaining when resuming
      // remaining will stay as the last value from the effect (which is correct)
    }));
  }, [state.isRunning]);

  // Reset timer
  const resetTimer = useCallback(() => {
    setState((prev) => {
      // Reset to work session, but keep sessionCount and history?
      // Typically reset means starting over, but we might want to keep today's progress?
      // Let's assume reset means reset the current session only, not the day's progress.
      // We'll reset the current session to work, with the default work duration.
      return {
        ...prev,
        sessionType: 'work',
        isRunning: false,
        endTimestamp: null,
        remaining: settings.workDuration * 60,
        task: '', // clear task
      };
    });
  }, [settings.workDuration]);

  // Set task
  const setTask = useCallback((task: string) => {
    setState((prev) => ({
      ...prev,
      task: task.trim(),
    }));
  }, []);

  // Skip current session (for testing or manual skip)
  const skipSession = useCallback(() => {
    handleSessionEnd();
  }, [handleSessionEnd]);

  // Initialize audio element
  useEffect(() => {
    const audio = new Audio(
      'https://assets.mixkit.co/sfx/preview/mixkit-alarm-digital-clock-beep-989.mp3'
    );
    audioRef.current = audio;
    return () => {
      audioRef.current = null;
    };
  }, []);

  // Request notification permission
  const requestNotificationPermission = useCallback(async () => {
    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return Notification.permission;
  }, []);

  // Return values
  return {
    // State
    ...state,
    settings,
    setSettings,
    // Methods
    startTimer,
    pauseTimer,
    resetTimer,
    setTask,
    skipSession,
    requestNotificationPermission,
    // Derived values
    progress: // 0 to 1
      state.endTimestamp !== null
        ? 1 -
          state.remaining /
          (state.sessionType === 'work'
            ? settings.workDuration * 60
            : state.sessionType === 'shortBreak'
              ? settings.shortBreakDuration * 60
              : settings.longBreakDuration * 60)
        : 0,
    isWork: state.sessionType === 'work',
    isBreak: state.sessionType === 'shortBreak' || state.sessionType === 'longBreak',
    isLongBreak: state.sessionType === 'longBreak',
  };
};