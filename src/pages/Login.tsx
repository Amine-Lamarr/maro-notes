import * as React from 'react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, Link } from 'react-router';
import { toast } from 'sonner';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      toast.error(error.message);
    } else {
      const deviceId = crypto.randomUUID();
      localStorage.setItem('device_id', deviceId);
      await supabase.auth.updateUser({ data: { device_id: deviceId } });
      toast.success('Logged in successfully!');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[70vh] animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="w-full max-w-xl p-12 sm:p-16 rounded-[3rem] bg-white border border-[#E2E8F0] shadow-[0_25px_65px_rgba(0,0,0,0.08)] relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 w-72 h-72 bg-blue-100/50 blur-[90px] -translate-y-1/2 translate-x-1/3 rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-purple-100/50 blur-[90px] translate-y-1/2 -translate-x-1/3 rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-10">
          <div className="space-y-3">
            <h1 className="font-serif text-4xl sm:text-5xl font-extrabold text-[#0F172A] tracking-tight drop-shadow-sm">Welcome Back</h1>
            <p className="text-base sm:text-lg text-[#475569] font-normal">Access your premium study materials</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="email" className="small-caps text-[#475569] ml-1 font-bold">Email</label>
                <input 
                  id="email" 
                  type="email" 
                  placeholder="name@example.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-5 py-4 text-base focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/50 transition-all font-mono placeholder:text-[#94A3B8] text-[#0F172A]"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label htmlFor="password" className="small-caps text-[#475569] ml-1 font-bold">Password</label>
                <input 
                  id="password" 
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="bg-[#F8FAFC] border border-[#CBD5E1] rounded-xl px-5 py-4 text-base focus:outline-none focus:border-[#2563EB] focus:ring-1 focus:ring-[#2563EB]/50 transition-all font-mono placeholder:text-[#94A3B8] text-[#0F172A]"
                />
              </div>
            </div>

            <div className="space-y-4 pt-2">
              <button 
                type="submit" 
                disabled={loading}
                className="w-full bg-[#0d0178] text-white hover:bg-[#1402a8] py-4 rounded-xl small-caps font-bold tracking-widest transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_4px_14px_rgba(13,1,120,0.3)] text-base"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
              </button>
              
              <div className="text-center pt-2">
                <span className="text-sm text-[#475569]">New to MaroNotes? </span>
                <Link to="/register" className="text-sm small-caps text-[#0d0178] font-bold hover:text-[#2563EB] transition-colors">
                  Create Account
                </Link>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
