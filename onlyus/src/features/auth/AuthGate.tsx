import { useEffect, useState, type ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { registerDevice } from '@/services/devices';
import { useAuth } from './authStore';

type Check = 'pending' | 'ok' | 'denied';

/** UX gate only. The real enforcement is RLS: an unapproved user gets zero rows regardless of this component. */
export default function AuthGate({ children }: { children: ReactNode }) {
  const { session, ready, recovering, signOut } = useAuth();
  const [check, setCheck] = useState<Check>('pending');
  const uid = session?.user.id;

  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      if (!supabase) { setCheck('ok'); return; }
      const { data } = await supabase.from('approved_users').select('id').eq('user_id', uid).maybeSingle();
      if (cancelled) return;
      if (!data) { setCheck('denied'); await signOut(); return; }
      const deviceOk = await registerDevice(uid);
      if (cancelled) return;
      if (!deviceOk) { await signOut(); return; }
      setCheck('ok');
    })();
    return () => { cancelled = true; };
  }, [uid, signOut]);

  if (!ready) return <div className="h-full grid place-items-center text-4xl animate-pulse">❤️</div>;
  if (!session) return <Navigate to="/login" replace />;
  if (recovering) return <Navigate to="/reset" replace />;
  if (check === 'denied') return <Navigate to="/login" replace />;
  if (check === 'pending') return <div className="h-full grid place-items-center text-4xl animate-pulse">❤️</div>;
  return <>{children}</>;
}
