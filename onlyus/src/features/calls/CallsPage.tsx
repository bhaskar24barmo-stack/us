import { motion } from 'framer-motion';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react';
import AvatarBubble from '@/components/AvatarBubble';
import TiltCard from '@/components/TiltCard';
import { getLiveKitConfig } from '@/services/livekit';
import { useAppStore } from '@/stores/useAppStore';

function formatDur(sec?: number) {
  if (!sec) return 'No answer';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m ${s}s`;
}

export default function CallsPage() {
  const { currentUserRole, profiles, calls, startCall } = useAppStore();
  const role = currentUserRole ?? 'me';
  const me = profiles[role];
  const partner = profiles[role === 'me' ? 'partner' : 'me'];

  const lk = getLiveKitConfig();

  return (
    <div className="h-full overflow-y-auto px-4 pt-5 pb-28 space-y-5 no-scrollbar">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calls</h1>
          <p className="text-xs text-white/60">
            {lk.configured ? 'LiveKit HD Connected' : 'LiveKit HD Voice & Video'}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => startCall('voice')}
            aria-label="Start voice call"
            className="h-11 w-11 rounded-2xl glass flex items-center justify-center text-rose-glow hover:border-rose-glow/50"
          >
            <Phone className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => startCall('video')}
            aria-label="Start video call"
            className="h-11 w-11 rounded-2xl bg-love-gradient text-white flex items-center justify-center shadow-glow-pink"
          >
            <Video className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Quick Call Card */}
      <TiltCard className="glass rounded-3xl p-5 bg-love-gradient-soft border border-rose-glow/25 space-y-4">
        <div className="flex items-center gap-3.5">
          <AvatarBubble profile={partner} size="lg" showOnline />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base truncate">{partner.display_name}</h2>
            <p className="text-xs text-white/65 truncate">{partner.status_text}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <button
            onClick={() => startCall('voice')}
            className="py-3 rounded-2xl glass hover:bg-white/10 text-xs font-semibold flex items-center justify-center gap-2"
          >
            <Phone className="h-4 w-4 text-rose-glow" /> Voice Call
          </button>
          <button
            onClick={() => startCall('video')}
            className="py-3 rounded-2xl bg-love-gradient text-xs font-semibold flex items-center justify-center gap-2 shadow-glow-pink"
          >
            <Video className="h-4 w-4" /> Video Call
          </button>
        </div>
      </TiltCard>

      {/* Recent Call History */}
      <div className="space-y-2.5">
        <h3 className="text-xs uppercase tracking-wider text-white/50 font-semibold px-1">Recent Calls</h3>
        {calls.length === 0 ? (
          <div className="glass rounded-3xl p-8 text-center space-y-2">
            <div className="text-3xl">📞</div>
            <p className="text-sm font-medium">No calls yet</p>
            <p className="text-xs text-white/55">Tap Voice Call or Video Call above to start a session.</p>
          </div>
        ) : (
          calls.map((c) => {
          const isOutgoing = c.caller_id === me.id;
          const isMissed = c.status === 'missed' || c.status === 'declined';
          return (
            <div key={c.id} className="glass rounded-2xl p-3.5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div
                  className={`h-10 w-10 rounded-xl flex items-center justify-center ${
                    isMissed ? 'bg-rose-500/20 text-rose-400' : 'bg-white/10 text-white/80'
                  }`}
                >
                  {isMissed ? (
                    <PhoneMissed className="h-4 w-4" />
                  ) : isOutgoing ? (
                    <PhoneOutgoing className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <PhoneIncoming className="h-4 w-4 text-sky-400" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium flex items-center gap-2">
                    <span>{partner.display_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 uppercase">
                      {c.kind}
                    </span>
                  </div>
                  <p className="text-xs text-white/55">
                    {isMissed ? 'Missed' : formatDur(c.duration_sec)} •{' '}
                    {new Date(c.created_at).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => startCall(c.kind)}
                aria-label={`Call back ${c.kind}`}
                className="h-9 w-9 rounded-xl glass flex items-center justify-center text-white/75 hover:text-rose-glow"
              >
                {c.kind === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
              </button>
            </div>
          );
        })
        )}
      </div>
    </div>
  );
}
