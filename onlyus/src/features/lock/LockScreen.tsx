import { useEffect, useState } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { Delete, Fingerprint } from 'lucide-react';
import { useLock } from './lockStore';

export default function LockScreen() {
  const { unlockWithPin, unlockWithBiometric, biometric } = useLock();
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  const shake = useAnimation();

  useEffect(() => { if (biometric) void unlockWithBiometric(); }, [biometric, unlockWithBiometric]);

  async function press(d: string) {
    if (pin.length >= 6) return;
    const next = pin + d;
    setPin(next);
    if (next.length < 6) return;
    const r = await unlockWithPin(next);
    if (r !== 'ok') {
      setMsg(r === 'wait' ? 'Too many tries. Wait a moment.' : r === 'wiped' ? 'Too many tries. Please sign in again.' : 'Wrong PIN');
      await shake.start({ x: [0, -12, 12, -8, 8, 0], transition: { duration: 0.4 } });
      setPin('');
    }
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink-950/95 backdrop-blur-2xl">
      <div className="w-72 text-center">
        <div className="text-4xl">🔒</div>
        <p className="mt-2 text-white/60">{msg || 'Enter your PIN'}</p>
        <motion.div animate={shake} className="my-6 flex justify-center gap-3">
          {Array.from({ length: 6 }, (_, i) => (
            <span key={i} className={`h-3 w-3 rounded-full ${i < pin.length ? 'bg-love-gradient' : 'bg-white/20'}`} />
          ))}
        </motion.div>
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} onClick={() => press(d)} className="glass h-16 rounded-2xl text-xl active:scale-95">{d}</button>
          ))}
          <button onClick={() => void unlockWithBiometric()} disabled={!biometric} aria-label="Biometric unlock" className="h-16 grid place-items-center disabled:opacity-0"><Fingerprint /></button>
          <button onClick={() => press('0')} className="glass h-16 rounded-2xl text-xl active:scale-95">0</button>
          <button onClick={() => setPin((p) => p.slice(0, -1))} aria-label="Delete" className="h-16 grid place-items-center"><Delete /></button>
        </div>
      </div>
    </div>
  );
}
