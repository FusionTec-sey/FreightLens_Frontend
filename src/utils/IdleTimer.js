import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

/**
 * IdleLogoutProvider
 * Wrap your app with this provider (put it near the top, e.g. inside BrowserRouter)
 * Props:
 * - timeoutMs: total inactivity time before automatic logout (default 15 minutes)
 * - warningMs: how long before logout to show the "Stay signed in" warning (default 60 seconds)
 * - onLogout: optional callback to run when logging out (default clears authToken and navigates to /login)
 */
export default function IdleLogoutProvider({
  children,
  timeoutMs = 15 * 60 * 1000,
  warningMs = 60 * 1000,
  onLogout,
}) {
  const navigate = useNavigate();
  const timerRef = useRef(null);
  const [isWarningVisible, setWarningVisible] = useState(false);
  const [timeLeftMs, setTimeLeftMs] = useState(timeoutMs);
  const lastActivityRef = useRef(Date.now());
  const warningStartRef = useRef(null);
  const intervalRef = useRef(null);
  const location = useLocation();
  const doLogout = useCallback(() => {
    // Default logout behaviour
    try {
      localStorage.removeItem('token');
      // sessionStorage.removeItem('authToken');
      navigate('/');
    } catch (e) {
      console.warn('Could not clear storage on logout', e);
    }

    // if (onLogout && typeof onLogout === 'function') {
    //   onLogout();
    // } else {
    //   navigate('/');
    // }
  }, [navigate, onLogout]);

  const resetTimers = useCallback(() => {
    lastActivityRef.current = Date.now();
    setWarningVisible(false);

    // clear existing timer
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // start new master timer for logout
    timerRef.current = setTimeout(() => {
      // time's up -> logout
      setWarningVisible(false);
      doLogout();
    }, timeoutMs);

    // start an interval to update `timeLeftMs` and show warning when needed
    intervalRef.current = setInterval(() => {
      const elapsed = Date.now() - lastActivityRef.current;
      const remaining = Math.max(0, timeoutMs - elapsed);
      setTimeLeftMs(remaining);

      if (remaining <= warningMs) {
        setWarningVisible(true);
        // once warning visible, we can stop the interval that checks the warning condition
        // but we keep updating timeLeftMs so the UI countdown works
      }

      if (remaining === 0) {
        // cleanup handled by the timeout but be safe
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }, 500); // update twice a second for a smooth countdown
  }, [timeoutMs, warningMs, doLogout]);

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];

    // activity handler should reset timers
    const activity = () => resetTimers();

    events.forEach((ev) => window.addEventListener(ev, activity));

    // initialize
    resetTimers();

    return () => {
      events.forEach((ev) => window.removeEventListener(ev, activity));
      if (timerRef.current) clearTimeout(timerRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [resetTimers]);

  // Called when user clicks "Stay signed in"
  const handleStaySignedIn = () => {
    resetTimers();
  };

  const handleLogoutNow = () => {
    // clear timers then logout
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
    doLogout();
  };

  // Format remaining seconds for display
  const secondsLeft = Math.ceil(timeLeftMs / 1000);

  return (
    <>
      {children}

      {/* Warning modal - simple Tailwind-based UI. You can replace with your own modal component. */}
      {isWarningVisible && location.pathname !== "/" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" />

          <div className="relative z-10 w-full max-w-md mx-4 p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl">
            <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-gray-100">Session timeout</h3>
            <p className="mb-4 text-sm text-gray-700 dark:text-gray-300">
              You've been inactive. For your security you'll be logged out in <strong>{secondsLeft}</strong> second{secondsLeft !== 1 ? 's' : ''}.
            </p>

            <div className="flex gap-3 justify-end">
              <button
                onClick={handleLogoutNow}
                className="px-4 py-2 rounded-lg border text-sm font-medium bg-transparent hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Log out now
              </button>

              <button
                onClick={handleStaySignedIn}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
              >
                Stay signed in
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/**
 * Example usage in your `index.jsx` or `App.jsx`
 *
 * import React from 'react';
 * import ReactDOM from 'react-dom/client';
 * import { BrowserRouter } from 'react-router-dom';
 * import IdleLogoutProvider from './IdleLogoutWithWarning';
 * import App from './App';
 *
 * ReactDOM.createRoot(document.getElementById('root')).render(
 *   <BrowserRouter>
 *     <IdleLogoutProvider timeoutMs={15 * 60 * 1000} warningMs={60 * 1000}>
 *       <App />
 *     </IdleLogoutProvider>
 *   </BrowserRouter>
 * );
 */
