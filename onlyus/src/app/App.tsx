import { MotionConfig } from 'framer-motion';
import { useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import ConfettiBurst from '@/components/ConfettiBurst';
import FloatingHearts from '@/components/FloatingHearts';
import InstallAppBar from '@/components/InstallAppBar';
import NetworkStatusPill from '@/components/NetworkStatusPill';
import PageTransition from '@/components/PageTransition';
import SplashAndOnboarding from '@/features/auth/SplashAndOnboarding';
import ActiveCallOverlay from '@/features/calls/ActiveCallOverlay';
import CallsPage from '@/features/calls/CallsPage';
import CameraPage from '@/features/camera/CameraPage';
import ChatPage from '@/features/chat/ChatPage';
import LockGate from '@/features/lock/LockGate';
import MediaViewerModal from '@/features/media/MediaViewerModal';
import MemoriesPage from '@/features/memories/MemoriesPage';
import NotificationCenter, { ToastStack } from '@/features/notifications/NotificationCenter';
import ProfilePage from '@/features/settings/ProfilePage';
import SecuritySettings from '@/features/settings/SecuritySettings';
import { useAppStore } from '@/stores/useAppStore';

function AppRoutes({ onOpenNotifications }: { onOpenNotifications: () => void }) {
  const location = useLocation();
  const hideNav = location.pathname === '/camera';

  return (
    <>
      <main className="relative z-10 h-full w-full">
        <PageTransition>
          <Routes location={location}>
            <Route path="/" element={<Navigate to="/chats" replace />} />
            <Route path="/chats" element={<ChatPage onOpenNotifications={onOpenNotifications} />} />
            <Route path="/camera" element={<CameraPage />} />
            <Route path="/calls" element={<CallsPage />} />
            <Route path="/memories" element={<MemoriesPage />} />
            <Route path="/profile" element={<ProfilePage onOpenNotifications={onOpenNotifications} />} />
            <Route path="/settings/security" element={<SecuritySettings />} />
            <Route path="*" element={<Navigate to="/chats" replace />} />
          </Routes>
        </PageTransition>
      </main>
      {!hideNav && <BottomNav />}
    </>
  );
}

export default function App() {
  const { currentUserRole, onboarded, settings } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);

  const wallpaperBg =
    settings.wallpaper === 'nebula'
      ? 'bg-[radial-gradient(circle_at_30%_20%,rgba(139,92,246,0.22),transparent_50%),radial-gradient(circle_at_80%_80%,rgba(255,77,141,0.18),transparent_50%)]'
      : settings.wallpaper === 'minimal'
      ? ''
      : 'bg-midnight-radial';

  return (
    <MotionConfig reducedMotion={settings.reducedMotionOverride ? 'always' : 'user'}>
      <BrowserRouter>
        <div className="h-full w-full flex items-center justify-center bg-[#040208] md:p-3">
          <div
            className={`relative h-full w-full max-w-[430px] md:h-[min(900px,calc(100dvh-1.5rem))] md:rounded-[40px] md:border md:border-white/15 md:shadow-[0_28px_90px_rgba(0,0,0,0.85)] overflow-hidden md:transform-gpu ${wallpaperBg}`}
          >
            {!currentUserRole || !onboarded ? (
              <SplashAndOnboarding />
            ) : (
              <LockGate>
                <div className="relative h-full w-full overflow-hidden">
                  {(settings.wallpaper === 'hearts' || settings.wallpaper === 'constellation') && (
                    <FloatingHearts density="subtle" />
                  )}
                  <ToastStack />
                  <InstallAppBar />
                  <NetworkStatusPill />
                  <ConfettiBurst />
                  <ActiveCallOverlay />
                  <MediaViewerModal />
                  <NotificationCenter open={notifOpen} onClose={() => setNotifOpen(false)} />
                  <AppRoutes onOpenNotifications={() => setNotifOpen(true)} />
                </div>
              </LockGate>
            )}
          </div>
        </div>
      </BrowserRouter>
    </MotionConfig>
  );
}
