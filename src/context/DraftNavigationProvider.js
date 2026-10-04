import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useBlocker } from 'react-router-dom';
import { DraftNavigationContext } from './DraftNavigationContext';

export default function DraftNavigationProvider({ children }) {
  const guard = useRef(null), inFlight = useRef(false), stayButton = useRef(null);
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const register = useCallback(value => {
    guard.current = value; setRegistered(true);
    return () => { if (guard.current === value) { guard.current = null; setRegistered(false); } };
  }, []);
  const shouldBlock = useCallback(() => Boolean(guard.current?.shouldBlock()), []);
  const blocker = useBlocker(shouldBlock);
  useEffect(() => {
    if (blocker.state === 'blocked') {
      setError(''); stayButton.current?.focus();
      if (!registered) blocker.reset();
    }
  }, [blocker, registered]);
  async function leave() {
    if (inFlight.current || blocker.state !== 'blocked') return;
    const owner = guard.current;
    if (!owner) { blocker.reset(); return; }
    inFlight.current = true; setBusy(true); setError('');
    try {
      await owner.prepareToLeave();
      // Company/user/editor changes revoke this pending navigation decision.
      if (guard.current === owner) blocker.proceed();
    } catch (failure) {
      if (guard.current === owner) setError(failure.message || 'Recovery could not be retained. Stay in this draft and retry.');
    } finally { inFlight.current = false; setBusy(false); }
  }
  return <DraftNavigationContext.Provider value={register}>
    {children}
    {blocker.state === 'blocked' && registered && <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4">
      <section role="alertdialog" aria-modal="true" aria-labelledby="draft-leave-title" aria-describedby="draft-leave-description"
        className="flex max-h-[90vh] w-full max-w-md flex-col rounded-xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        onKeyDown={event => {
          if (event.key === 'Escape' && !busy) blocker.reset();
          if (event.key === 'Tab') {
            const buttons = [...event.currentTarget.querySelectorAll('button:not(:disabled)')];
            const first = buttons[0], last = buttons[buttons.length - 1];
            if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
          }
        }}>
        <h2 id="draft-leave-title" className="shrink-0 font-semibold">Leave this sales draft?</h2>
        <div className="min-h-0 overflow-y-auto">
        <p id="draft-leave-description" className="mt-2 text-sm">Keep a recovery copy on this browser before leaving. An unconfirmed save keeps its exact retry identity; leaving does not confirm or cancel it.</p>
        {error && <p role="alert" className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p>}
        </div>
        <div className="mt-4 flex shrink-0 flex-wrap gap-2">
          <button ref={stayButton} type="button" disabled={busy} className="min-h-[44px] rounded-lg border px-3 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40" onClick={() => blocker.reset()}>Stay in draft</button>
          <button type="button" disabled={busy} className="min-h-[44px] rounded-lg bg-indigo-600 px-3 text-white hover:bg-indigo-700 disabled:opacity-40" onClick={leave}>{busy ? 'Retaining recovery…' : 'Keep locally and leave'}</button>
        </div>
      </section>
    </div>}
  </DraftNavigationContext.Provider>;
}
