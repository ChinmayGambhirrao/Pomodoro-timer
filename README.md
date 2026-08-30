# Pomodoro Timer

A beautiful, minimal, and fun Pomodoro timer web app built with Vite, React, TypeScript, and Tailwind CSS.

## Features

- Timer with work/break sessions (default 25/5/15)
- Start / pause / reset controls
- Auto-transition between session types
- Browser notification and pleasant sound when a session ends
- Live countdown in the browser tab title
- Session counter for today
- Task input before starting a session
- Session history list for today
- Settings panel for customizing durations, auto-start, and sound
- Keyboard shortcut: spacebar to start/pause
- Fully responsive design
- Accurate timer engine using end-timestamp approach (works even when tab is backgrounded)

## Design

- Dark mode by default with a warm coral accent color
- Modern font pairing: Space Grotesk for headings/timer, Manrope for body
- Timer display as the visual centerpiece with a circular progress ring
- Micro-interactions: smooth transitions, subtle animations
- Ambient background gradient for depth

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS for styling
- LocalStorage for persistence (no backend needed)

## Getting Started

1.  Clone the repository
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Start the development server:
    ```bash
    npm run dev
    ```
4.  Build for production:
    ```bash
    npm run build
    ```

## Customization

Adjust the default durations and other settings in the Settings panel (accessible via the gear icon).

## Browser Support

Works in all modern browsers that support:
- LocalStorage
- Notifications API
- ES6+ JavaScript

## Notes

- Notification permission is requested when needed.
- The timer uses an end-timestamp approach to remain accurate even when the tab is throttled in the background.
- Session history and counters are persisted per day using LocalStorage.

## Acknowledgements

- Inspired by the Pomodoro Technique
- Built with Vite and React