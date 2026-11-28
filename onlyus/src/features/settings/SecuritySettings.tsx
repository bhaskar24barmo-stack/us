import { ArrowLeft, ShieldCheck, Smartphone, Lock, Fingerprint } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { COPY } from '@/copy';
import { useAuth } from '@/features/auth/authStore';
import { useLock } from '@/features/lock/lockStore';
import { currentDeviceId, listDevices, revokeDevice } from '@/services/devices';

type Device = Awaited<ReturnType<typeof listDevices>>[number];
const TIMEOUTS = [
  [30_000, '30 seconds'],
  [60_000, '1 minute'],
  [300_000, '5 minutes'],
  [900_000, '15 minutes'],
] as const;

export default function SecuritySettings() {
  const navigate = useNavigate();
  const { signOut, signOutEverywhere } = useAuth();
  const lock = useLock();
  const [pin, setPin] = useState('');
  const [note, setNote] = useState('');
  const [devices, setDevices] = useState<Device[]>([]);

  const refresh = () =>
    listDevices()
      .then(setDevices)
      .catch(() => setNote('Could not load devices'));

  useEffect(() => {
    void refresh();
  }, []);

  async function togglePin() {
    if (!/^\d{6}$/.test(pin)) return setNote('Enter exactly 6 digits');
    if (lock.enabled) setNote((await lock.removePin(pin)) ? 'PIN removed' : 'Wrong PIN');
    else {
      await lock.setPin(pin);
      setNote('PIN set');
    }
    setPin('');
  }

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-28 mx-auto max-w-md space-y-5 no-scrollbar">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-2xl glass flex items-center justify-center text-white/75 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2 bg-love-gradient bg-clip-text text-transparent">
            <ShieldCheck className="h-5 w-5 text-rose-glow" /> Security &amp; App Lock
          </h1>
          <p className="text-[11px] text-white/55">Local device lock &amp; session controls</p>
        </div>
      </div>

      <Card variant="glow" className="p-4 space-y-3.5">
        <div className="flex items-center gap-2">
          <Lock className="h-4 w-4 text-rose-glow" />
          <h2 className="font-semibold text-sm">App PIN Protection</h2>
        </div>
        <input
          inputMode="numeric"
          maxLength={6}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          placeholder={lock.enabled ? 'Enter 6-digit PIN to remove' : 'Choose 6-digit PIN'}
          className="w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 outline-none focus:border-rose-glow text-white text-sm"
        />
        <Button
          variant={lock.enabled ? 'secondary' : 'primary'}
          size="md"
          onClick={togglePin}
          className="w-full text-xs font-semibold"
        >
          {lock.enabled ? 'Remove PIN' : 'Set PIN'}
        </Button>

        {lock.enabled && (
          <div className="space-y-3 pt-2">
            <select
              value={lock.timeoutMs}
              onChange={(e) => lock.setTimeoutMs(Number(e.target.value))}
              className="w-full rounded-2xl bg-ink-800 border border-white/15 px-4 py-3 text-xs text-white outline-none"
            >
              {TIMEOUTS.map(([v, l]) => (
                <option key={v} value={v}>
                  Auto-lock after {l}
                </option>
              ))}
            </select>
            <Button
              variant="secondary"
              size="md"
              onClick={async () =>
                setNote(
                  (await lock.enableBiometric())
                    ? 'Local device biometric enabled'
                    : 'Biometrics not available on this device'
                )
              }
              className="w-full flex items-center justify-center gap-2 text-xs"
            >
              <Fingerprint className="h-4 w-4 text-rose-glow" />
              {lock.biometric ? 'Biometric Unlock: Active' : 'Enable Biometric Unlock'}
            </Button>
          </div>
        )}
        <p className="text-[11px] text-white/45 leading-relaxed">
          The app lock protects against someone opening ONLYUS on an unlocked phone.
        </p>
      </Card>

      <Card variant="glass" className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-emerald-400" />
          <h2 className="font-semibold text-sm">Active Devices</h2>
        </div>
        {devices.length === 0 ? (
          <div className="flex items-center justify-between text-xs text-white/65 py-2">
            <span>This Device (Active Session)</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-[10px] font-medium border border-emerald-500/25">
              Active
            </span>
          </div>
        ) : (
          devices.map((d) => (
            <div key={d.id} className="flex items-center justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
              <span className="text-xs">
                {d.label}
                {d.id === currentDeviceId() && ' (this device)'}
                {d.revoked_at && ' · revoked'}
              </span>
              {d.id !== currentDeviceId() && !d.revoked_at && (
                <button
                  type="button"
                  className="min-h-[36px] px-3 py-1 text-xs text-rose-300 hover:text-rose-200 transition-colors"
                  onClick={async () => {
                    await revokeDevice(d.id);
                    await refresh();
                  }}
                >
                  {COPY.actions.revoke}
                </button>
              )}
            </div>
          ))
        )}
      </Card>

      <div className="space-y-2.5">
        <Button
          variant="secondary"
          size="md"
          onClick={signOut}
          className="w-full text-xs font-semibold"
        >
          {COPY.actions.signOut}
        </Button>
        <Button
          variant="danger"
          size="md"
          onClick={signOutEverywhere}
          className="w-full text-xs font-semibold"
        >
          {COPY.actions.signOutAll}
        </Button>
      </div>

      {note && (
        <p role="status" className="text-center text-xs text-white/70 py-2">
          {note}
        </p>
      )}
    </div>
  );
}
