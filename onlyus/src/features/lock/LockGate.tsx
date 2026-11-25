import { useEffect, type ReactNode } from 'react';
import { useLock } from './lockStore';
import LockScreen from './LockScreen';

/** Locks after inactivity and when the app has been in the background longer than the timeout. */
export default function LockGate({ children }: { children: ReactNode }) {
  const { init, locked, enabled, timeoutMs, lock } = useLock();

  useEffect(() => { init(); }, [init]);

  useEffect(() => {
    if (!enabled) return;
    let last = Date.now();
    let hiddenAt = 0;
    const touch = () => { last = Date.now(); };
    const onVis = () => {
      if (document.hidden) hiddenAt = Date.now();
      else if (hiddenAt && Date.now() - hiddenAt > Math.min(timeoutMs, 15_000)) lock();
    };
    const evts = ['pointerdown', 'keydown', 'touchstart', 'scroll'] as const;
    evts.forEach((e) => window.addEventListener(e, touch, { passive: true }));
    document.addEventListener('visibilitychange', onVis);
    const t = setInterval(() => { if (Date.now() - last > timeoutMs) lock(); }, 5_000);
    return () => {
      evts.forEach((e) => window.removeEventListener(e, touch));
      document.removeEventListener('visibilitychange', onVis);
      clearInterval(t);
    };
  }, [enabled, timeoutMs, lock]);

  return (
    <>
      <div aria-hidden={locked} className={locked ? 'invisible' : ''}>{children}</div>
      {locked && <LockScreen />}
    </>
  );
}
