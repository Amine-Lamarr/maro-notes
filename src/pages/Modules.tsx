import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useSearchParams, useNavigate } from 'react-router';
import { BookOpen, Search, ArrowRight, Folder, Trash2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { deleteModuleWithFiles } from '@/lib/deleteHelpers';

interface Module {
  id: string;
  title: string;
}

export default function Modules() {
  const [searchParams] = useSearchParams();
  const yearId = searchParams.get('year_id');
  const [modules, setModules] = useState<Module[]>([]);
  const [search, setSearch] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchModules();
    checkAdmin();
  }, [yearId]);

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

  const deleteModule = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    toast("Delete this Course and all its files permanently?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteModuleWithFiles(id);
            toast.success("Course and associated files deleted.");
            fetchModules();
          } catch (err: any) {
            console.error(err);
            toast.error(err.message);
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchModules = async () => {
    let query = supabase.from('modules').select('*').order('title');
    if (yearId) {
      query = query.eq('year_id', yearId);
    }
    const { data, error } = await query;
    if (error) {
      console.error(error);
      setErrorMsg(error.message);
    }
    if (data) setModules(data);
  };

  const filteredModules = modules.filter(m => m.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 pb-20">
      
      {/* Header & Search */}
      <div className="rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-5 sm:p-10 md:p-16 bg-gradient-to-br from-[#090214] via-[#1a0130] to-[#3a0269] border border-purple-900/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col md:flex-row md:items-end justify-between gap-5 sm:gap-8 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#df6000]/20 blur-[80px] rounded-full pointer-events-none glow-blob" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-[#2563EB]/20 blur-[60px] rounded-full pointer-events-none glow-blob" />
        
        <div className="space-y-3 sm:space-y-5 relative z-10 min-w-0 flex-1">
          <button 
            onClick={() => navigate('/years')} 
            className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#ffad6b] hover:text-[#fff] inline-flex items-center gap-1.5 font-bold transition-colors mb-1 bg-white/5 border border-white/10 px-3.5 sm:px-4 py-1.5 rounded-full backdrop-blur-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Years
          </button>
          <h1 className="font-serif text-2xl min-[360px]:text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-md break-words">
            Available <span className="text-[#ffad6b] italic">Courses</span>
          </h1>
          <p className="text-purple-100/80 text-xs sm:text-base md:text-lg font-normal max-w-xl leading-relaxed">
            Select a subject course to view available lesson modules and revision PDF files.
          </p>
        </div>
        
        <div className="relative w-full md:w-80 relative z-10 mt-2 sm:mt-6 md:mt-0">
          <Search className="absolute left-4 sm:left-5 top-3.5 sm:top-4 h-5 w-5 text-slate-400" />
          <input 
            placeholder="Search courses..." 
            className="w-full bg-white border border-white/20 rounded-full pl-11 sm:pl-12 pr-4 sm:pr-5 py-3 sm:py-4 text-sm sm:text-base text-black placeholder:text-slate-500 focus:outline-none focus:border-[#ffad6b] focus:ring-2 focus:ring-[#ffad6b]/30 transition-all font-sans shadow-lg"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {errorMsg ? (
        <div className="text-center py-16 text-red-600 border rounded-2xl border-dashed border-red-300 bg-red-50 p-6">
          <p className="font-medium">Database Error: {errorMsg}</p>
        </div>
      ) : filteredModules.length === 0 ? (
        <div className="text-center py-20 text-[#64748B] border rounded-2xl border-dashed border-[#CBD5E1] bg-white dark:bg-[#111]/60 font-mono text-sm uppercase tracking-wider space-y-3">
          <BookOpen className="mx-auto h-8 w-8 text-[#94A3B8]" />
          <p>No courses found for this year level.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 content-auto">
          {filteredModules.map((mod) => (
            <div 
              key={mod.id} 
              className="group bg-white dark:bg-[#111] rounded-2xl border border-[#E2E8F0] hover:border-purple-300 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer p-6 flex flex-col justify-between transform-gpu"
              onClick={() => navigate(`/modules/${mod.id}`)}
            >
              <div className="flex items-start justify-between relative z-10 mb-6">
                <div className="w-12 h-12 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center group-hover:bg-gradient-to-br group-hover:from-[#7000ab] group-hover:to-[#0c0291] transition-all shadow-xs">
                  <Folder className="w-6 h-6 text-[#7000ab] group-hover:text-white transition-colors" />
                </div>
                {isAdmin && (
                  <button 
                    onClick={(e) => deleteModule(mod.id, e)}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors relative z-20 cursor-pointer"
                    title="Delete Course"
                  >
                    <Trash2 className="w-5 h-5 pointer-events-none" />
                  </button>
                )}
              </div>
              
              <div className="flex flex-col flex-1 relative z-10">
                <span className="font-mono text-xs uppercase tracking-wider text-[#2563EB] font-semibold mb-1">
                  Course
                </span>
                <h3 className="font-serif text-2xl font-bold text-navy mb-2 line-clamp-2 group-hover:text-[#0d0178] transition-colors">
                  {mod.title}
                </h3>
                
                <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#F1F5F9]">
                  <span className="font-mono text-xs font-bold text-navy group-hover:text-[#2563EB] uppercase tracking-wider transition-colors">
                    Explore Lessons
                  </span>
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#222] group-hover:bg-[#0d0178] text-navy group-hover:text-white shadow-xs flex items-center justify-center transition-all">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
