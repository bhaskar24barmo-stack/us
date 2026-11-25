import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/authStore';
import { useLock } from '@/features/lock/lockStore';
import { currentDeviceId, listDevices, revokeDevice } from '@/services/devices';

type Device = Awaited<ReturnType<typeof listDevices>>[number];
const TIMEOUTS = [[30_000, '30 seconds'], [60_000, '1 minute'], [300_000, '5 minutes'], [900_000, '15 minutes']] as const;

export default function SecuritySettings() {
  const navigate = useNavigate();
  const { signOut, signOutEverywhere } = useAuth();
  const lock = useLock();
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);

  const refresh = () => listDevices().then(setDevices).catch(() => setNote('Could not load devices'));
  useEffect(() => { void refresh(); }, []);

  async function togglePin() {
    if (!/^\d{6}$/.test(pin)) return setNote('Enter exactly 6 digits');
    if (lock.enabled) setNote((await lock.removePin(pin)) ? 'PIN removed' : 'Wrong PIN');
    else { await lock.setPin(pin); setNote('PIN set'); }
    setPin('');
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-28 mx-auto max-w-md space-y-5 no-scrollbar">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="h-9 w-9 rounded-xl glass flex items-center justify-center text-white/75 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-rose-glow" /> Security &amp; App Lock
          </h1>
          <p className="text-[11px] text-white/55">Local device lock &amp; session controls</p>
        </div>
      </div>

      <section className="glass rounded-2xl p-4 space-y-3">
        <h2 className="font-medium">App PIN</h2>
        <input inputMode="numeric" maxLength={6} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder={lock.enabled ? 'Enter PIN to remove' : 'Choose 6-digit PIN'} className="w-full rounded-xl bg-white/5 px-4 py-3 outline-none" />
        <button onClick={togglePin} className="w-full rounded-xl bg-love-gradient py-2">{lock.enabled ? 'Remove PIN' : 'Set PIN'}</button>
        {lock.enabled && (<>
          <select value={lock.timeoutMs} onChange={(e) => lock.setTimeoutMs(Number(e.target.value))} className="w-full rounded-xl bg-ink-800 px-4 py-3">
            {TIMEOUTS.map(([v, l]) => <option key={v} value={v}>Auto-lock after {l}</option>)}
          </select>
          <button onClick={async () => setNote((await lock.enableBiometric()) ? 'Biometric unlock enabled' : 'Biometrics not available here')}
            className="w-full rounded-xl border border-white/15 py-2">{lock.biometric ? 'Biometric: on (re-enroll)' : 'Enable biometric unlock'}</button>
        </>)}
        <p className="text-xs text-white/40">The app lock protects against someone picking up your unlocked phone. It does not replace your account password.</p>
      </section>

      <section className="glass rounded-2xl p-4 space-y-2">
        <h2 className="font-medium">Devices</h2>
        {devices.length === 0 ? (
          <div className="flex items-center justify-between text-xs text-white/65 py-1">
            <span>This Browser (Local Prototype Session)</span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px]">Active</span>
          </div>
        ) : (
          devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm">
              <span>{d.label}{d.id === currentDeviceId() && ' (this device)'}{d.revoked_at && ' · revoked'}</span>
              {d.id !== currentDeviceId() && !d.revoked_at && (
                <button className="text-rose-300" onClick={async () => { await revokeDevice(d.id); await refresh(); }}>Revoke</button>)}
            </div>
          ))
        )}
      </section>

      <section className="space-y-2">
        <button onClick={signOut} className="w-full rounded-xl border border-white/15 py-3">Sign out</button>
        <button onClick={signOutEverywhere} className="w-full rounded-xl border border-rose-400/40 py-3 text-rose-300">Sign out on all devices</button>
      </section>
      {note && <p role="status" className="text-center text-sm text-white/60">{note}</p>}
    </div>
  );
}
