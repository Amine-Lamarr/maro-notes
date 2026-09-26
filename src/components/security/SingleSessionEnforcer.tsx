import { useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';

export default function SingleSessionEnforcer() {
  const navigate = useNavigate();
  const location = useLocation();
  const checkedSessionRef = useRef<string | null>(null);

  useEffect(() => {
    // Only check if they are logged in, but we can do a background check periodically
    // or on every route change.
    const enforceSingleSession = async () => {
      try {
        if (typeof document !== 'undefined' && document.hidden) return;
        const localDeviceId = localStorage.getItem('device_id');
        if (!localDeviceId) return; // Not logged in on this browser

        const { data: { user }, error } = await supabase.auth.getUser();
        if (error || !user) return;

        const currentMetadataDeviceId = user.user_metadata?.device_id;

        // If the user has a device_id in metadata, and it doesn't match the local one,
        // it means they logged in on another device after this one.
        if (currentMetadataDeviceId && currentMetadataDeviceId !== localDeviceId) {
          // Log them out!
          await supabase.auth.signOut();
          localStorage.removeItem('device_id');
          toast.error("You have been logged out because your account was accessed from another device.");
          navigate('/login');
        }
      } catch (e) {
        console.error("Error checking single session:", e);
      }
    };

    enforceSingleSession();

    // Check periodically (every 25 seconds) to catch simultaneous active sessions without battery drain
    const intervalId = setInterval(enforceSingleSession, 25000);

    return () => clearInterval(intervalId);
  }, [location.pathname, navigate]); // re-run check slightly on route change as well

  return null;
}
