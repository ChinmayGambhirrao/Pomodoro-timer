import { useState, useEffect } from 'react';
import { useTimer } from './hooks/useTimer';
import './index.css';

function App() {
  const {
    sessionType,
    isRunning,
    remaining,
    sessionCount,
    history,
    settings,
    setSettings,
    startTimer,
    pauseTimer,
    resetTimer,
    requestNotificationPermission,
    progress,
  } = useTimer();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showPulse, setShowPulse] = useState(false);
  // Video state
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoId, setVideoId] = useState<string>('');

  // Checklist state
  const [checklistInput, setChecklistInput] = useState('');
  const [checklistItems, setChecklistItems] = useState<Array<{id:string, text:string, checked:boolean}>>([]);

  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(
      2,
      '0'
    )}`;
  };

  // Extract YouTube ID from URL
  const extractYtId = (url: string) => {
    if (!url) return null;

    // Expanded regex to capture more YouTube URL formats (including shorts)
    const regExp = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=|shorts\/))((?:\w|-){11})(?:\S+)?$/;
    const match = url.match(regExp);
    return match ? match[1] : null;
  }

  const handleVideoSubmit = () => {
    if (!videoUrl.trim()) {
      alert('Please enter a YouTube URL');
      return;
    }

    const id = extractYtId(videoUrl);
    if (id) {
      setVideoId(id);
      setVideoUrl(videoUrl); // Update state to reflect current value
      localStorage.setItem('pomodoro-video-url', videoUrl);
    } else {
      alert('Please enter a valid YouTube URL');
    }
  };

  const handleClearVideo = () => {
    setVideoId('');
    setVideoUrl('');
    localStorage.removeItem('pomodoro-video-url');
  };

  const handleAddChecklistItem = () => {
    const trimmed = checklistInput.trim();
    if (trimmed) {
      const newItem = {
        id: crypto.randomUUID(),
        text: trimmed,
        checked: false,
      };
      setChecklistItems(prev => [...prev, newItem]);
      setChecklistInput('');
    }
  };

  const handleToggleChecklistItem = (id: string) => {
    setChecklistItems(prev =>
      prev.map(item =>
        item.id === id ? { ...item, checked: !item.checked } : item
      )
    );
  };

  
  
  // Trigger pulse effect when a session ends (remaining goes to 0)
  useEffect(() => {
    if (remaining === 0 && !isRunning) {
      // Just ended
      setShowPulse(true);
      setTimeout(() => setShowPulse(false), 1000);
    }
  }, [remaining, isRunning]);

  // Request notification permission on first load
  useEffect(() => {
    requestNotificationPermission();
  }, [requestNotificationPermission]);

  // Load video URL from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('pomodoro-video-url');
    if (saved) {
      setVideoUrl(saved);
      const id = extractYtId(saved);
      if (id) setVideoId(id);
    }
  }, [])


  return (
    <>
    <div
      className={`min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-gray-800 text-white px-4 py-8 sm:py-12 transition-all duration-500 ${showPulse ? 'scale-105' : 'scale-100'}`}
    >
      {/* Timer Display */}
      <div className="relative w-60 h-60 mx-auto mb-6">
        {/* Circular Progress Ring */}
        <svg
          className="absolute inset-0"
          width="100%"
          height="100%"
          viewBox="0 0 256 256"
        >
          {/* Background ring */}
          <circle
            cx="128"
            cy="128"
            r="115"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="20"
            fill="none"
          />
          {/* Progressive ring */}
          <circle
            cx="128"
            cy="128"
            r="115"
            stroke="currentColor"
            strokeWidth="20"
            fill="none"
            strokeDasharray="722.6" // 2 * PI * 115 ≈ 722.6
            strokeDashoffset={`${722.6 * (1 - progress)}`}
            transform="rotate(-90 128 128)"
            className="transition-[stroke-dashoffset] duration-300 ease"
          />
        </svg>

        {/* Timer Text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-6xl font-display font-bold tracking-tighter">
            {formatTime(remaining)}
          </div>
          <div className="text-lg font-manrope mt-2 opacity-90">
            {sessionType === 'work'
              ? 'Work Session'
              : sessionType === 'shortBreak'
              ? 'Short Break'
              : 'Long Break'}
          </div>
        </div>
      </div>

      {/* Checklist Input */}
      <div className="mb-6 flex flex-col space-y-2">
        <label htmlFor="checklist-input" className="block text-sm font-manrope mb-2">
          Checklist:
        </label>
        <div className="flex space-x-2">
          <input
            id="checklist-input"
            type="text"
            value={checklistInput}
            onChange={(e) => setChecklistInput(e.target.value)}
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    handleAddChecklistItem();
                }
            }}
            placeholder="Add a checklist item..."
            className="flex-1 px-4 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/50 text-white text-lg font-manrope"
          />
          <button
            onClick={handleAddChecklistItem}
            className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-manrope"
          >
            Add
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex space-x-4 mb-8">
        <button
          onClick={isRunning ? pauseTimer : startTimer}
          disabled={remaining === 0 && !isRunning}
          className="flex-1 px-6 py-3 font-semibold rounded-lg transition-all duration-200 hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRunning ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimer}
          className="flex-1 px-6 py-3 font-semibold rounded-lg border border-gray-600 bg-transparent transition-all duration-200 hover:bg-gray-800/50"
        >
          Reset
        </button>
      </div>
      {/* Checklist Items */}
      <div className="mb-4 bg-gray-800/50 rounded-lg p-4 border border-gray-700">
        {checklistItems.length > 0 ? (
          <>
            <p className="mb-2 font-semibold text-sm font-manrope">Checklist:</p>
            <div className="space-y-2">
              {checklistItems.map((item) => (
                <div key={item.id} className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleChecklistItem(item.id)}
                    className="h-4 w-4 text-accent-500 bg-gray-700 border-gray-600 rounded focus:ring-accent-500"
                  />
                  <label
                    className={`flex-1 text-sm font-manrope ${item.checked ? 'line-through text-gray-400' : ''}`}
                    onClick={() => handleToggleChecklistItem(item.id)}
                  >
                    {item.text}
                  </label>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-center text-gray-400 text-sm">No checklist items yet.</p>
        )}
      </div>

      {/* Session Counter */}
      <div className="text-center text-sm font-manrope mb-6 opacity-80">
        Completed today: {sessionCount}{' '}
        {sessionCount === 1 ? 'session' : 'sessions'}
      </div>

      {/* History List */}
      <div className="w-full max-w-2xl mb-8">
        <h2 className="text-xl font-display font-bold mb-4 text-center">
          Today's Sessions
        </h2>
        {history.length === 0 ? (
          <p className="text-center text-gray-400">No sessions yet today.</p>
        ) : (
          <div className="space-y-3">
            {history
              .slice()
              .reverse()
              .map((session) => (
                <div
                  key={session.id}
                  className="flex items-center p-3 bg-gray-800/50 rounded-lg"
                >
                  <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full">
                    {session.sessionType === 'work' ? (
                      <span className="text-accent-500 font-bold">●</span>
                    ) : (
                      <span className="text-accent-300 font-bold">●</span>
                    )}
                  </div>
                  <div className="flex-1 ml-4">
                    <p className="font-manrope font-medium truncate">
                      {session.task}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(session.completedAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })} • {formatTime(session.duration)}
                    </p>
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>

      {/* Settings Button */}
      <button
        onClick={() => setSettingsOpen(true)}
        className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/70 rounded-lg text-sm font-manrope transition-colors"
      >
        Settings
      </button>

      {/* Settings Panel (Modal) */}
      {settingsOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900/80 backdrop-blur-md rounded-2xl p-8 w-full max-w-md space-y-6">
            <h2 className="text-xl font-display font-bold text-center">
              Timer Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-manrope mb-2">
                  Work Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.workDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      setSettings((prev) => ({
                        ...prev,
                        workDuration: val,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/50 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-manrope mb-2">
                  Short Break Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={settings.shortBreakDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      setSettings((prev) => ({
                        ...prev,
                        shortBreakDuration: val,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/50 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-manrope mb-2">
                  Long Break Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={settings.longBreakDuration}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val) && val > 0) {
                      setSettings((prev) => ({
                        ...prev,
                        longBreakDuration: val,
                      }));
                    }
                  }}
                  className="w-full px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/50 text-white"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="auto-start"
                  checked={settings.autoStartNext}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      autoStartNext: e.target.checked,
                    }));
                  }}
                  className="h-4 w-4 text-accent-500 bg-gray-700 border-gray-600 rounded focus:ring-accent-500"
                />
                <label
                  htmlFor="auto-start"
                  className="ml-2 text-sm font-manrope"
                >
                  Auto-start next session
                </label>
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="sound-toggle"
                  checked={settings.soundEnabled}
                  onChange={(e) => {
                    setSettings((prev) => ({
                      ...prev,
                      soundEnabled: e.target.checked,
                    }));
                  }}
                  className="h-4 w-4 text-accent-500 bg-gray-700 border-gray-600 rounded focus:ring-accent-500"
                />
                <label
                  htmlFor="sound-toggle"
                  className="ml-2 text-sm font-manrope"
                >
                  Enable sound notifications
                </label>
              </div>
            </div>

            <div>
              <label className='block text-sm font-manrope mb-2'>
                Background YouTube URL
              </label>
              <div className='flex space-x-2'>
                <input
                  type='text'
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  onKeyDown={(e) => {
                      console.log('Video input keydown:', e.key);
                      if (e.key === 'Enter') {
                          handleVideoSubmit();
                      }
                      // Allow spacebar and other keys to behave normally
                  }}
                  placeholder='https://www.youtube.com/watch?v=...'
                  className='flex-1 px-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg focus:border-accent-400 focus:outline-none focus:ring-2 focus:ring-accent-400/50 text-white'
                />
                <button
                  onClick={handleVideoSubmit}
                  className='px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg font-manrope'
                >
                  Load Video
                </button>
              </div>
              {videoId && (
                <div className='mt-2 text-sm text-gray-400'>
                  Video loaded: https://youtu.be/{videoId}
                </div>
              )}
              <div className='mt-2 flex space-x-2'>
                <button
                  onClick={handleClearVideo}
                  className='px-3 py-2 bg-gray-600 hover-bg-gray-500 text-white rounded font-manrope'
                >
                  Clear Video
                </button>
                <label className='flex items-center text-sm font-manrope'>
                  <input
                    type='checkbox'
                    checked={!!videoId}
                    onChange={(e) => {
                      if (!e.target.checked) {
                        handleClearVideo();
                      }
                    }}
                    className='h-4 w-4 text-accent-500 bg-gray-700 border-gray-600 rounded focus:ring-accent-500'
                  />
                  Show video overlay
                </label>
              </div>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setSettingsOpen(false)}
                className="px-4 py-2 bg-gray-700/50 hover:bg-gray-600/70 rounded-lg text-sm font-manrope"
              >
                Close
              </button>
              <button
                onClick={() => {
                  resetTimer();
                  setSettingsOpen(false);
                }}
                className="px-4 py-2 bg-accent-500 hover:bg-accent-600 text-white rounded-lg text-sm font-manrope"
              >
                Reset Timer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
      <div className='fixed bottom-4 right-4'>
        {videoId ? (
          <iframe
            title="YouTube video player"
            width="320"
            height="180"
            src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&loop=1&playlist=${videoId}`}
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
            style={{ objectFit: 'cover' }}
          />
        ) : null}
        {videoId && (
          <button
            onClick={handleClearVideo}
            className='absolute top-0 right-0 -mt-2 -mr-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600'
          >
            ×
          </button>
        )}
      </div>
      </>
  );
}

export default App;