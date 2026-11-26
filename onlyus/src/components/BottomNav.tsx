import { motion } from 'framer-motion';
import { Home, Image, Menu, MessageCircleHeart, Phone } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '@/stores/useAppStore';

const TABS = [
  { path: '/home', label: 'Home', icon: Home },
  { path: '/chats', label: 'Chat', icon: MessageCircleHeart },
  { path: '/gallery', label: 'Gallery', icon: Image },
  { path: '/calls', label: 'Calls', icon: Phone },
  { path: '/more', label: 'More', icon: Menu },
];

export default function BottomNav() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const role = useAppStore((s) => s.currentUserRole ?? 'me');
  const myId = useAppStore((s) => s.profiles[role].id);
  const unreadChats = useAppStore(
    (s) => s.messages.filter((m) => m.sender_id !== myId && !m.read_at && !m.deleted_at).length
  );

  return (
    <nav
      aria-label="Main navigation"
      className="absolute bottom-0 inset-x-0 z-30 px-3 pb-[max(0.65rem,env(safe-area-inset-bottom))] pt-2 pointer-events-none"
    >
      <div className="mx-auto max-w-md glass-strong rounded-[28px] px-2 py-1.5 shadow-glass pointer-events-auto flex items-center justify-around">
        {TABS.map((tab) => {
          const active =
            pathname === tab.path ||
            (tab.path === '/home' && pathname === '/') ||
            (tab.path === '/more' &&
              (pathname === '/profile' ||
                pathname === '/settings/security' ||
                pathname === '/countdowns' ||
                pathname === '/bucket-list' ||
                pathname === '/journal'));
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              aria-label={tab.label}
              className="relative flex flex-col items-center justify-center px-3 py-1.5 rounded-2xl transition-colors"
            >
              {active && (
                <motion.span
                  layoutId="nav-active-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 30 }}
                  className="absolute inset-0 rounded-2xl bg-love-gradient-soft border border-rose-glow/30 shadow-glow-pink"
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-0.5">
                <Icon
                  className={`h-5 w-5 transition-colors ${
                    active ? 'text-rose-glow' : 'text-white/55 hover:text-white/80'
                  }`}
                />
                <span
                  className={`text-[10px] font-medium tracking-wide ${
                    active ? 'text-white' : 'text-white/50'
                  }`}
                >
                  {tab.label}
                </span>
              </div>
              {tab.path === '/chats' && unreadChats > 0 && (
                <span className="absolute top-0.5 right-1.5 z-20 min-w-[16px] h-4 px-1 rounded-full bg-rose-glow text-[10px] font-bold text-white flex items-center justify-center shadow-glow-pink">
                  {unreadChats}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
