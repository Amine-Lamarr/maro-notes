import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate, useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { ArrowRight, BookOpen, GraduationCap, Sparkles, Mail } from 'lucide-react';
import { confirmAndRecordPurchase, getLocalPurchases } from '@/lib/purchasesStore';

interface Year {
  id: string;
  name: string;
}

export default function Dashboard() {
  const [params] = useSearchParams();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [years, setYears] = useState<Year[]>([]);
  const [userEmail, setUserEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const handleSuccess = async () => {
      if (params.get('success') === 'true' && params.get('note_id')) {
        const noteId = params.get('note_id')!;
        const sessionId = params.get('session_id');
        const moduleId = params.get('module_id');
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          toast.success('Payment verified! Document unlocked permanently.', { id: 'purchase-success' });
          await confirmAndRecordPurchase({
            sessionId,
            noteId,
            userId: session.user.id,
            userEmail: session.user.email,
            moduleId
          });
          
          if (moduleId) {
            navigate(`/modules/${moduleId}/viewer?note=${noteId}`, { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }
      }
    };
    handleSuccess();
  }, [params, navigate]);

  useEffect(() => {
    fetchData();
  }, [params]);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login');
      return;
    }
    setUserEmail(session.user.email || '');

    let purchaseData: any[] = [];
    try {
      const { data, error } = await supabase
        .from('purchases')
        .select('*, notes(*)')
        .eq('user_id', session.user.id);
        
      if (error) {
        // Fallback to select without relation
        const { data: fallbackData } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', session.user.id);
        purchaseData = fallbackData || [];
      } else if (data) {
        purchaseData = data;
      }
    } catch (err) {
      console.warn("Purchases fetch error:", err);
    }

    // Also include any locally stored purchases that might not have returned yet from the database
    const localPurchasedIds = getLocalPurchases(session.user.id);
    const existingNoteIds = new Set(purchaseData.map(p => p.note_id || p.notes_id || p.id));
    for (const localId of localPurchasedIds) {
      if (!existingNoteIds.has(localId)) {
        purchaseData.push({
          id: `local-${localId}`,
          user_id: session.user.id,
          note_id: localId
        });
        existingNoteIds.add(localId);
      }
    }

    // If any items lack `notes` relation details, fetch them in batch from 'notes'
    const notesToFetch = purchaseData.filter(p => !p.notes && (p.note_id || p.notes_id)).map(p => p.note_id || p.notes_id);
    if (notesToFetch.length > 0) {
      try {
        const { data: fetchedNotes } = await supabase.from('notes').select('*').in('id', notesToFetch);
        if (fetchedNotes) {
          const notesMap = new Map(fetchedNotes.map(n => [n.id, n]));
          purchaseData = purchaseData.map(p => {
            const nId = p.note_id || p.notes_id;
            if (!p.notes && notesMap.has(nId)) {
              return { ...p, notes: notesMap.get(nId) };
            }
            return p;
          });
        }
      } catch (err) {
        console.warn("Could not batch load note details for purchases:", err);
      }
    }
      
    setPurchases(purchaseData);

    const { data: yearsData } = await supabase.from('years').select('*').order('name');
    if (yearsData) setYears(yearsData);

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-[#7000ab] rounded-full animate-spin"></div>
        <p className="font-mono text-sm uppercase tracking-widest text-navy-muted">Loading Workspace...</p>
      </div>
    );
  }

  return (
    <div className="space-y-14 max-w-6xl mx-auto pt-4 pb-20 relative z-10 animate-in fade-in duration-700">
      
      {/* Header Banner */}
      <div className="rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-16 md:p-20 bg-gradient-to-br from-[#090214] via-[#1a0130] to-[#3a0269] border border-purple-900/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 sm:gap-8 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#df6000]/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-[#2563EB]/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="space-y-4 sm:space-y-5 relative z-10">
          <div className="flex flex-wrap items-center gap-3">
            <div className="font-mono text-xs sm:text-sm uppercase tracking-widest text-[#ffad6b] bg-white dark:bg-[#111]/5 border border-white/10 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-sm inline-flex items-center gap-2 font-bold backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#ffad6b]" />
              Personal Workspace
            </div>
            {userEmail && (
              <div className="font-mono text-xs sm:text-sm text-white bg-white/15 border border-white/20 px-3.5 sm:px-4 py-1.5 sm:py-2 rounded-full shadow-sm inline-flex items-center gap-2 backdrop-blur-md">
                <Mail className="w-3.5 h-3.5 text-purple-200 shrink-0" />
                <span className="text-purple-200">Email:</span>
                <span className="font-bold text-white">{userEmail}</span>
              </div>
            )}
          </div>
          <h1 className="font-serif text-3xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight drop-shadow-md">
            Your Dashboard
          </h1>
          <p className="text-purple-100/80 text-sm sm:text-xl font-normal max-w-2xl leading-relaxed">
            Access your unlocked course materials, revision papers, and explore academic years.
          </p>
        </div>

        {userEmail && (
          <div className="relative z-10 w-full sm:w-auto bg-white/10 border border-white/20 backdrop-blur-md rounded-2xl p-4 sm:p-5 flex items-center gap-4 text-white shadow-lg shrink-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
              <Mail className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] uppercase font-mono tracking-widest text-purple-200 font-semibold">Current Working Email</p>
              <p className="font-mono text-sm sm:text-base font-bold text-white truncate max-w-[220px] sm:max-w-[280px]" title={userEmail}>
                {userEmail}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Unlocked Notes */}
      {purchases.length > 0 && (
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7000ab] to-[#0c0291] flex items-center justify-center text-white shadow-[0_4px_14px_rgba(0,0,0,0.3)]">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy">My Unlocked Lessons</h2>
              <p className="text-xs sm:text-sm text-[#64748B]">Purchased & ready to study</p>
            </div>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {purchases.map((p) => (
              <div 
                key={p.id} 
                className="group bg-white dark:bg-[#111] rounded-2xl p-6 flex flex-col justify-between border border-[#E2E8F0] hover:border-purple-300 shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-all duration-300 relative overflow-hidden cursor-pointer"
                onClick={() => navigate(`/modules/${p.notes?.module_id}/viewer?note=${p.note_id}`)}
              >
                <div className="mb-6 relative z-10">
                  <div className="font-mono text-[11px] uppercase tracking-wider text-emerald-700 font-bold mb-3 bg-emerald-50 border border-emerald-200 inline-block px-3 py-1 rounded-full">
                    ✓ Unlocked Lesson
                  </div>
                  <h3 className="font-serif text-xl sm:text-2xl font-bold text-navy leading-tight mb-2 line-clamp-2 group-hover:text-[#2563EB] transition-colors">
                    {p.notes?.title || "Academic Lesson"}
                  </h3>
                  <p className="text-sm text-[#64748B] line-clamp-2 font-normal leading-relaxed">
                    {p.notes?.description || "Structured curriculum notes and exercises."}
                  </p>
                </div>

                <div className="mt-auto pt-4 border-t border-[#F1F5F9] flex items-center justify-between relative z-10">
                  <span className="font-mono text-xs uppercase tracking-wider font-bold text-navy group-hover:text-[#2563EB] transition-colors">
                    Access PDF Document
                  </span>
                  <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-[#222] group-hover:bg-[#0d0178] text-navy group-hover:text-white flex items-center justify-center transition-all shadow-xs">
                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Explore Years */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#7000ab] to-[#0c0291] flex items-center justify-center text-white shadow-[0_4px_14px_rgba(0,0,0,0.3)]">
            <GraduationCap className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy">Explore Academic Years</h2>
            <p className="text-xs sm:text-sm text-[#64748B]">Choose your academic level to browse modules</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {years.length === 0 ? (
            <div className="md:col-span-2 text-center text-[#64748B] my-8 font-mono text-sm uppercase tracking-wider border border-dashed border-[#CBD5E1] py-12 rounded-2xl bg-white dark:bg-[#111]/60">
              No academic years available yet.
            </div>
          ) : (
            years.map((year, index) => (
              <div 
                key={year.id} 
                className="group cursor-pointer bg-white dark:bg-[#111] p-7 sm:p-8 rounded-2xl border border-[#E2E8F0] hover:border-purple-300 shadow-[0_10px_30px_rgba(0,0,0,0.12)] hover:shadow-[0_15px_35px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 relative overflow-hidden flex flex-col justify-between min-h-[160px]"
                onClick={() => navigate(`/modules?year_id=${year.id}`)}
              >
                <div className="absolute right-4 top-2 text-[100px] font-serif font-black text-slate-100 group-hover:text-purple-100/60 transition-colors duration-500 pointer-events-none select-none leading-none">
                  0{index + 1}
                </div>
                <div className="relative z-10">
                  <span className="font-mono text-xs uppercase tracking-wider text-[#2563EB] font-semibold block mb-1">
                    Curriculum Level
                  </span>
                  <h3 className="font-serif text-2xl sm:text-3xl font-bold text-navy mb-1 group-hover:text-[#0d0178] transition-colors">
                    {year.name}
                  </h3>
                  <p className="text-[#64748B] text-xs sm:text-sm font-normal">Browse associated syllabus modules</p>
                </div>
                <div className="relative z-10 flex justify-end mt-6">
                  <div className="w-11 h-11 rounded-full bg-slate-100 dark:bg-[#222] group-hover:bg-[#0d0178] text-navy group-hover:text-white shadow-xs flex items-center justify-center transition-all duration-300">
                    <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-0.5" />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
