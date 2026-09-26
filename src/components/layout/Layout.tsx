import * as React from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import { supabase } from '@/lib/supabase';
import { useEffect, useState } from 'react';
import { LogOut, BookOpen, GraduationCap, Menu, X, Mail } from 'lucide-react';
import { toast } from 'sonner';
import SecurityProtection from '@/components/security/SecurityProtection';
import SingleSessionEnforcer from '@/components/security/SingleSessionEnforcer';

export default function Layout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    document.documentElement.classList.remove('dark');
    localStorage.removeItem('theme');
  }, []);

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    // Global network error listener to help debug "Failed to fetch" which is often 
    // caused by a paused Supabase project or missing CORS headers.
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (event.reason instanceof TypeError && event.reason.message === 'Failed to fetch') {
        // Prevent toast spam if multiple fetches fail at once
        if (!(window as any)._hasShownFetchError) {
          (window as any)._hasShownFetchError = true;
          toast.error("Network error: Failed to fetch. Is your Supabase project paused or offline?", { duration: 10000 });
          setTimeout(() => { (window as any)._hasShownFetchError = false; }, 10000);
        }
      }
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      checkRole(session?.user?.id, session?.user?.email);
    }).catch(e => {
      console.error("Auth session error:", e);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      checkRole(session?.user?.id, session?.user?.email);
    });

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  const checkRole = async (userId: string | undefined, userEmail: string | undefined) => {
    if (!userId) {
      console.log("No userId, setting admin false");
      setIsAdmin(false);
      return;
    }
    
    // Check if profile exists
    console.log("Checking role for user:", userId);
    let { data, error } = await supabase.from('profiles').select('role').eq('id', userId).single();
    console.log("Profile data from DB:", data, "Error:", error);
    
    if (error && error.code !== 'PGRST116') {
       toast.error(`Database Error: ${error.message}. Is your Supabase project running?`);
    }
    
    // If no profile exists, try to create one
    if (error && error.code === 'PGRST116') {
      console.log("No profile found, attempting to create one...");
      // PGRST116 means zero rows returned (not found)
      const role = 'user';
      
      const { data: newProfile, error: insertError } = await supabase.from('profiles').insert([
        { id: userId, email: userEmail, role: role }
      ]).select().single();
      
      console.log("Insert result:", newProfile, "Insert error:", insertError);
      if (!insertError && newProfile) {
        data = newProfile;
      }
    }

    const roleValue = data?.role?.toLowerCase();
    if (roleValue === 'admin' || roleValue === 'true') {
      console.log("User is admin, setting state true");
      setIsAdmin(true);
    } else {
      console.log("User is NOT admin, setting state false");
      setIsAdmin(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    localStorage.removeItem('device_id');
    navigate('/');
  };

  return (
    <div className="min-h-screen flex flex-col font-sans relative text-navy selection:bg-cerulean/30">
      <SecurityProtection session={session} />
      <SingleSessionEnforcer />
      <div className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#7000ab] via-[#2563EB] to-[#0c0291] z-[60]"></div>
      <header className="sticky top-0 z-50 w-full bg-gradient-to-r from-[#7000ab] via-[#470ba0] to-[#0c0291] text-white shadow-[0_12px_36px_rgba(0,0,0,0.35)] border-b border-purple-400/20 backdrop-blur-md transform-gpu">
        <div className="container mx-auto px-4 sm:px-8 h-24 flex items-center justify-between">
          <Link to="/" className="flex items-center space-x-3 sm:space-x-3.5 transition-all group shrink-0 hover:opacity-95">
            <div className="flex items-center justify-center w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 backdrop-blur-md text-white border border-white/20 shadow-md group-hover:scale-105 transition-all shrink-0">
              <GraduationCap className="h-6 w-6 text-white stroke-[2.2] shrink-0" />
            </div>
            <span className="hidden min-[380px]:inline-block font-serif font-bold tracking-tight text-xl sm:text-3xl text-white">
              MaroNotes
            </span>
          </Link>
          
          <nav className="flex items-center shrink-0">
            <div className="hidden md:flex items-center gap-3 lg:gap-6">
              <Link 
                to="/years" 
                className="px-3.5 lg:px-4 py-2 rounded-xl text-xs lg:text-sm font-mono font-bold tracking-wider uppercase text-white/90 hover:text-white hover:bg-white/15 transition-all shadow-[0_4px_12px_rgba(0,0,0,0.25)] bg-white/10"
              >
                Curriculum
              </Link>
              
              {session ? (
                <>
                  {/* Current Active Account Email Pill */}
                  <div className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/20 rounded-full backdrop-blur-md shadow-xs transition-colors" title={`Logged in as ${session.user?.email}`}>
                    <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-white shrink-0">
                      <Mail className="w-3.5 h-3.5 text-white" />
                    </div>
                    <div className="flex flex-col text-left">
                      <span className="text-[9px] uppercase font-mono tracking-wider text-purple-200 leading-none">Account</span>
                      <span className="text-xs font-mono font-bold text-white truncate max-w-[140px] md:max-w-[170px] lg:max-w-[220px] leading-tight">
                        {session.user?.email}
                      </span>
                    </div>
                  </div>

                  {isAdmin && (
                    <Link to="/admin" className="font-mono text-xs uppercase tracking-wider text-purple-200 hover:text-white transition-colors font-medium">
                      Admin Panel
                    </Link>
                  )}
                  
                  <div className="hidden xl:flex items-center gap-2 px-3.5 py-1.5 bg-white/15 border border-white/20 rounded-full backdrop-blur-sm shadow-xs">
                    <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="font-mono text-[10px] text-white tracking-widest font-bold">{isAdmin ? 'ADMIN' : 'USER'} ROLE</span>
                  </div>

                  <Link to="/dashboard" className="flex items-center justify-center gap-1.5 lg:gap-2 hover:bg-slate-100 dark:bg-[#222] px-3.5 lg:px-6 py-2 lg:py-3 shadow-md bg-white dark:bg-[#111] text-navy rounded-full transition-all font-bold">
                    <BookOpen className="h-4 w-4 lg:h-4.5 lg:w-4.5 stroke-[#0F172A] shrink-0" />
                    <span className="font-mono text-xs uppercase tracking-wider pr-1 font-bold text-navy">Dashboard</span>
                  </Link>
                  <button onClick={handleLogout} className="flex items-center justify-center gap-1.5 lg:gap-2 text-white hover:bg-white/15 px-3.5 lg:px-6 py-2 lg:py-3 border border-white/30 bg-transparent rounded-full transition-all font-bold cursor-pointer">
                    <LogOut className="h-4 w-4 lg:h-4.5 lg:w-4.5 stroke-white shrink-0" />
                    <span className="font-mono text-xs uppercase tracking-wider pr-1 font-bold text-white">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="font-mono text-xs lg:text-sm uppercase tracking-wider text-purple-100 hover:text-white transition-colors font-medium px-2">
                    Login
                  </Link>
                  <Link to="/register" className="flex items-center justify-center px-4 lg:px-7 py-2.5 lg:py-3.5 bg-white dark:bg-[#111] text-navy hover:bg-slate-100 dark:bg-[#222] rounded-full transition-all shadow-md font-bold">
                    <span className="font-mono tracking-widest text-xs lg:text-sm uppercase text-navy whitespace-nowrap">Get Started</span>
                  </Link>
                </>
              )}
            </div>

            <div className="md:hidden flex items-center gap-2">
              {session?.user?.email && (
                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 border border-white/20 rounded-full text-white max-w-[130px] sm:max-w-[160px] truncate" title={`Signed in as ${session.user.email}`}>
                  <Mail className="w-3 h-3 text-purple-200 shrink-0" />
                  <span className="font-mono text-[11px] font-bold truncate">{session.user.email}</span>
                </div>
              )}
              <Link 
                to="/years" 
                className="px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold tracking-wider uppercase text-white/90 shadow-[0_2px_8px_rgba(0,0,0,0.25)] bg-white/10"
              >
                Curriculum
              </Link>
              <button 
                className="p-1.5 text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                aria-label="Toggle navigation menu"
              >
                {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </nav>
        </div>

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-[#470ba0] border-b border-purple-400/20 shadow-xl overflow-hidden animate-in slide-in-from-top-2">
            <div className="flex flex-col p-4 space-y-3">
              {session ? (
                <>
                  {/* Prominent Active Account Card on Mobile Drawer */}
                  <div className="p-3.5 bg-white/10 border border-white/20 rounded-2xl flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-white shrink-0">
                      <Mail className="w-4 h-4 text-white" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[10px] uppercase font-mono tracking-wider text-purple-200 font-semibold">Current Working Email</p>
                      <p className="text-xs sm:text-sm font-mono font-bold text-white truncate" title={session.user?.email}>
                        {session.user?.email}
                      </p>
                    </div>
                  </div>

                  {isAdmin && (
                    <Link to="/admin" className="p-3 bg-white/5 rounded-xl font-mono text-sm uppercase tracking-wider text-white text-center font-bold">
                      Admin Panel
                    </Link>
                  )}
                  
                  <div className="flex items-center justify-center gap-2 p-3 bg-white/5 border border-white/10 rounded-xl">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse"></div>
                    <span className="font-mono text-xs text-white tracking-widest font-bold">{isAdmin ? 'ADMIN' : 'USER'} ROLE</span>
                  </div>

                  <Link to="/dashboard" className="flex items-center justify-center gap-2 bg-white dark:bg-[#111] text-navy p-4 rounded-xl shadow-md font-bold">
                    <BookOpen className="h-5 w-5 stroke-[#0F172A]" />
                    <span className="font-mono text-sm uppercase tracking-wider text-navy">Dashboard</span>
                  </Link>
                  
                  <button onClick={handleLogout} className="flex items-center justify-center gap-2 text-white border border-white/30 p-4 rounded-xl font-bold cursor-pointer">
                    <LogOut className="h-5 w-5 stroke-white" />
                    <span className="font-mono text-sm uppercase tracking-wider text-white">Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="p-4 text-center font-mono text-sm uppercase tracking-wider text-white font-bold bg-white/10 rounded-xl border border-white/10">
                    Login
                  </Link>
                  <Link to="/register" className="p-4 text-center bg-white dark:bg-[#111] text-navy rounded-xl shadow-md font-bold">
                    <span className="font-mono tracking-widest text-sm uppercase text-navy">Get Started</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 w-full mx-auto container px-4 sm:px-8 py-6 sm:py-12">
        {children}
      </main>

      <footer className="border-t border-purple-400/20 py-12 mt-16 bg-gradient-to-r from-[#0c0291] via-[#470ba0] to-[#7000ab] text-white shadow-2xl relative">
        <div className="container mx-auto px-4 sm:px-8 flex flex-col items-center justify-between gap-6 md:flex-row">
          <div className="flex flex-col items-center md:items-start gap-2 text-center md:text-left text-xs sm:text-sm text-purple-100/90 font-medium">
            <p className="text-purple-100 flex flex-wrap items-center justify-center md:justify-start gap-2">
              <span className="font-serif font-bold text-base text-white">MaroNotes</span>
              <span className="text-purple-300/60">&middot;</span>
              <span>Built for Academic Success</span>
              <span className="text-purple-300/60">&middot;</span>
              <span>Secure & Organized</span>
            </p>
            <p className="text-purple-200">
              Developed by <a href="https://www.instagram.com/aminecanflyy" target="_blank" rel="noopener noreferrer" className="text-white font-bold hover:text-purple-300 transition-colors underline decoration-purple-300 underline-offset-2">@aminecanfly</a>
            </p>
          </div>
          <div className="flex items-center space-x-6">
            <Link to="/terms" className="font-mono text-xs uppercase tracking-wider text-purple-100 hover:text-white transition-colors font-semibold">Terms</Link>
            <Link to="/privacy" className="font-mono text-xs uppercase tracking-wider text-purple-100 hover:text-white transition-colors font-semibold">Privacy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
