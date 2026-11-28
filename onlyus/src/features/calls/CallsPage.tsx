import { motion } from 'framer-motion';
import { Phone, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from 'lucide-react';
import AvatarBubble from '@/components/AvatarBubble';
import { Card } from '@/design-system/Card';
import { Button } from '@/design-system/Button';
import { EmptyState } from '@/design-system/EmptyState';
import { COPY } from '@/copy';
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
    <div className="h-full overflow-y-auto px-4 pt-[max(1.25rem,env(safe-area-inset-top))] pb-[max(6rem,calc(env(safe-area-inset-bottom)+5.5rem))] space-y-5 no-scrollbar">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold bg-love-gradient bg-clip-text text-transparent">
            {COPY.calls.title}
          </h1>
          <p className="text-xs text-white/60">
            {lk.configured ? 'LiveKit HD Connected' : 'LiveKit HD Voice & Video'}
          </p>
        </div>
        <div className="flex gap-2">
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => startCall('voice')}
            aria-label="Start voice call"
            className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-2xl glass flex items-center justify-center text-rose-glow hover:border-rose-glow/50 transition-colors"
          >
            <Phone className="h-5 w-5" />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => startCall('video')}
            aria-label="Start video call"
            className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-2xl bg-love-gradient text-white flex items-center justify-center shadow-glow-pink transition-transform"
          >
            <Video className="h-5 w-5" />
          </motion.button>
        </div>
      </div>

      {/* Quick Call Card */}
      <Card variant="glow" className="p-5 space-y-4">
        <div className="flex items-center gap-3.5">
          <AvatarBubble profile={partner} size="lg" showOnline />
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-base truncate">{partner.display_name}</h2>
            <p className="text-xs text-white/65 truncate">{partner.status_text || 'Ready to talk'}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5">
          <Button
            variant="secondary"
            size="md"
            onClick={() => startCall('voice')}
            className="flex items-center justify-center gap-2 text-xs font-semibold"
          >
            <Phone className="h-4 w-4 text-rose-glow" /> {COPY.calls.voiceCall}
          </Button>
          <Button
            variant="primary"
            size="md"
            onClick={() => startCall('video')}
            className="flex items-center justify-center gap-2 text-xs font-semibold shadow-glow-pink"
          >
            <Video className="h-4 w-4" /> {COPY.calls.videoCall}
          </Button>
        </div>
      </Card>

      {/* Recent Call History */}
      <div className="space-y-2.5">
        <h3 className="text-xs uppercase tracking-wider text-white/50 font-semibold px-1">Recent Calls</h3>
        {calls.length === 0 ? (
          <EmptyState
            icon="📞"
            title={COPY.calls.emptyTitle}
            description={COPY.calls.emptyDesc}
            actionLabel={COPY.calls.emptyAction}
            onAction={() => startCall('voice')}
          />
        ) : (
          calls.map((c) => {
            const isOutgoing = c.caller_id === me.id;
            const isMissed = c.status === 'missed' || c.status === 'declined';
            return (
              <Card key={c.id} variant="glass" className="p-3.5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
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
                  type="button"
                  onClick={() => startCall(c.kind)}
                  aria-label={`Call back ${c.kind}`}
                  className="min-h-[44px] min-w-[44px] h-11 w-11 rounded-xl glass flex items-center justify-center text-white/75 hover:text-rose-glow transition-colors"
                >
                  {c.kind === 'video' ? <Video className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                </button>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
