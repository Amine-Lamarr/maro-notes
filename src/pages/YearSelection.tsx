import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router';
import { ArrowRight, Trash2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { deleteYearWithFiles } from '@/lib/deleteHelpers';

interface Year {
  id: string;
  name: string;
}

export default function YearSelection() {
  const [years, setYears] = useState<Year[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchYears();
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      const roleValue = data?.role?.toLowerCase();
      if (roleValue === 'admin' || roleValue === 'true') {
         setIsAdmin(true);
      }
    }
  };

  const deleteYear = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    toast("Delete this Year and all its files permanently?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteYearWithFiles(id);
            toast.success("Year and all associated files deleted.");
            fetchYears();
          } catch (err: any) {
            console.error(err);
            toast.error(err.message);
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const fetchYears = async () => {
    const { data } = await supabase.from('years').select('*').order('name');
    if (data) setYears(data);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-10 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 sm:pt-6 pb-20">
      
      {/* Header */}
      <div className="rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-16 md:p-20 bg-gradient-to-br from-[#090214] via-[#1a0130] to-[#3a0269] border border-purple-900/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4 sm:space-y-5 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#df6000]/20 blur-[80px] rounded-full pointer-events-none glow-blob" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-[#2563EB]/20 blur-[60px] rounded-full pointer-events-none glow-blob" />
        
        <div className="relative z-10 space-y-4 sm:space-y-5">
          <div className="font-mono text-xs sm:text-sm uppercase tracking-widest text-black bg-white border border-white/20 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-sm inline-flex items-center gap-2 font-bold backdrop-blur-md">
            <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-black" />
            Academic Curriculum
          </div>
          <h1 className="font-serif text-3xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight drop-shadow-md">
            Select Your <span className="text-[#ffad6b] italic">Academic Year</span>
          </h1>
          <p className="text-purple-100/80 text-sm sm:text-xl font-normal max-w-2xl leading-relaxed">
            Choose your current level of study to access structured syllabus modules and revision sets.
          </p>
        </div>
      </div>

      {/* Years List */}
      <div className="grid grid-cols-1 gap-5">
        {years.length === 0 ? (
          <div className="text-center text-[#64748B] my-12 font-mono text-sm uppercase tracking-wider border border-dashed border-[#CBD5E1] py-12 rounded-2xl bg-white dark:bg-[#111]/60 shadow-sm">
            No academic years found.
          </div>
        ) : (
          years.map((year, index) => (
            <div 
              key={year.id} 
              className="group cursor-pointer bg-white dark:bg-[#111] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] hover:border-purple-300 shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-0"
              onClick={() => navigate(`/modules?year_id=${year.id}`)}
            >
              <div className="absolute right-8 top-1/2 -translate-y-1/2 text-[110px] sm:text-[140px] font-serif font-black text-slate-100 group-hover:text-purple-100/50 transition-colors duration-500 pointer-events-none select-none">
                0{index + 1}
              </div>
              <div className="relative z-10 flex items-center gap-6 w-full sm:w-auto">
                <div>
                  <span className="font-mono text-xs uppercase tracking-wider text-[#2563EB] font-semibold block mb-1">
                    Level 0{index + 1}
                  </span>
                  <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy mb-1 group-hover:text-[#0d0178] transition-colors">
                    {year.name}
                  </h2>
                  <p className="text-[#64748B] text-xs sm:text-sm font-normal">Browse courses, lesson notes & exercises</p>
                </div>
              </div>
              <div className="relative z-10 flex items-center gap-4 self-end sm:self-auto w-full sm:w-auto justify-end">
                {isAdmin && (
                  <button 
                    onClick={(e) => deleteYear(year.id, e)}
                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors relative z-20 cursor-pointer"
                    title="Delete Year"
                  >
                    <Trash2 className="w-5 h-5 pointer-events-none" />
                  </button>
                )}
                <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-[#222] group-hover:bg-[#0d0178] text-navy group-hover:text-white shadow-xs flex items-center justify-center transition-all duration-300">
                  <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
