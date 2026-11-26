import { MotionConfig } from 'framer-motion';
import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import BottomNav from '@/components/BottomNav';
import ConfettiBurst from '@/components/ConfettiBurst';
import FloatingHearts from '@/components/FloatingHearts';
import InstallAppBar from '@/components/InstallAppBar';
import NetworkStatusPill from '@/components/NetworkStatusPill';
import PageTransition from '@/components/PageTransition';
import { useAuth } from '@/features/auth/authStore';
import SplashAndOnboarding from '@/features/auth/SplashAndOnboarding';
import LockGate from '@/features/lock/LockGate';
import MediaViewerModal from '@/features/media/MediaViewerModal';
import NotificationCenter, { ToastStack } from '@/features/notifications/NotificationCenter';
import { subscribeCallSignals } from '@/services/callSignaling';
import { playSoftChime } from '@/services/notifications';
import { useAppStore } from '@/stores/useAppStore';

const ActiveCallOverlay = lazy(() => import('@/features/calls/ActiveCallOverlay'));

const HomePage = lazy(() => import('@/features/couple/HomePage'));
const ChatPage = lazy(() => import('@/features/chat/ChatPage'));
const CameraPage = lazy(() => import('@/features/camera/CameraPage'));
const CallsPage = lazy(() => import('@/features/calls/CallsPage'));
const GalleryPage = lazy(() => import('@/features/gallery/GalleryPage'));
const MorePage = lazy(() => import('@/features/settings/MorePage'));
const ProfilePage = lazy(() => import('@/features/settings/ProfilePage'));
const SecuritySettings = lazy(() => import('@/features/settings/SecuritySettings'));
const CountdownsPage = lazy(() => import('@/features/couple/CountdownsPage'));
const BucketListPage = lazy(() => import('@/features/couple/BucketListPage'));
const JournalPage = lazy(() => import('@/features/couple/JournalPage'));
const LoginPage = lazy(() => import('@/features/auth/LoginPage'));
const ForgotPasswordPage = lazy(() => import('@/features/auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('@/features/auth/ResetPasswordPage'));

function RouteLoader() {
  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-rose-glow border-t-transparent animate-spin" />
    </div>
  );
}

function AppRoutes({ onOpenNotifications }: { onOpenNotifications: () => void }) {
  const location = useLocation();
  const hideNav = location.pathname === '/camera';

  return (
    <>
      <main className="relative z-10 h-full w-full overflow-hidden">
        <PageTransition>
          <Suspense fallback={<RouteLoader />}>
            <Routes location={location}>
              <Route path="/" element={<Navigate to="/home" replace />} />
              <Route path="/home" element={<HomePage />} />
              <Route path="/chats" element={<ChatPage onOpenNotifications={onOpenNotifications} />} />
              <Route path="/camera" element={<CameraPage />} />
              <Route path="/calls" element={<CallsPage />} />
              <Route path="/gallery" element={<GalleryPage />} />
              <Route path="/more" element={<MorePage onOpenNotifications={onOpenNotifications} />} />
              <Route path="/memories" element={<Navigate to="/gallery" replace />} />
              <Route path="/us" element={<Navigate to="/home" replace />} />
              <Route path="/profile" element={<ProfilePage onOpenNotifications={onOpenNotifications} />} />
              <Route path="/settings/security" element={<SecuritySettings />} />
              <Route path="/countdowns" element={<CountdownsPage />} />
              <Route path="/bucket-list" element={<BucketListPage />} />
              <Route path="/journal" element={<JournalPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/forgot" element={<ForgotPasswordPage />} />
              <Route path="/reset" element={<ResetPasswordPage />} />
              <Route path="*" element={<Navigate to="/home" replace />} />
            </Routes>
          </Suspense>
        </PageTransition>
      </main>
      {!hideNav && <BottomNav />}
    </>
  );
}

export default function App() {
  const { currentUserRole, onboarded, pairCode, settings } = useAppStore();
  const [notifOpen, setNotifOpen] = useState(false);

  useEffect(() => useAuth.getState().init(), []);

  useEffect(() => {
    if (!currentUserRole || !onboarded) return;
    return subscribeCallSignals(pairCode, currentUserRole, (signal) => {
      const state = useAppStore.getState();
      if (signal.type === 'call:ring') {
        if (!state.activeCall) {
          useAppStore.setState({
            activeCall: {
              id: signal.callId,
              kind: signal.kind,
              direction: 'incoming',
              status: 'ringing',
              minimized: false,
              startedAt: null,
              simulated: false,
            },
          });
          if (state.settings.soundEffects) playSoftChime('ring');
        }
      } else if (signal.type === 'call:accept') {
        if (state.activeCall?.id === signal.callId && state.activeCall.status === 'ringing') {
          useAppStore.setState({
            activeCall: { ...state.activeCall, status: 'active', startedAt: Date.now() },
          });
        }
      } else if (signal.type === 'call:decline' || signal.type === 'call:end') {
        if (state.activeCall?.id === signal.callId) {
          useAppStore.setState({ activeCall: null });
        }
      }
    });
  }, [currentUserRole, onboarded, pairCode]);

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
                  <Suspense fallback={null}>
                    <ActiveCallOverlay />
                  </Suspense>
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
