import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { FileText, Lock, ArrowRight, Trash2, Edit2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteNoteWithFiles } from '@/lib/deleteHelpers';
import EditNoteModal from '@/components/EditNoteModal';

interface Module {
  id: string;
  title: string;
  description?: string;
  thumbnail_url?: string | null;
}

interface Note {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail_url: string;
  preview_file_path?: string;
  hasPurchased?: boolean;
}

export default function ModuleDetails() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const canceled = searchParams.get('canceled');
  const [mod, setMod] = useState<Module | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (canceled) {
      toast.error("Payment canceled.");
    }
  }, [canceled]);

  const [editingNote, setEditingNote] = useState<Note | null>(null);

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setSession(session);
    
    let _isAdmin = false;
    if (session) {
      const { data } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      const roleValue = data?.role?.toLowerCase();
      if (roleValue === 'admin' || roleValue === 'true') {
         _isAdmin = true;
         setIsAdmin(true);
      }
    }
    
    if (id) {
      // Fetch course
      const { data: modData, error: modErr } = await supabase.from('modules').select('*').eq('id', id).single();
      if (modErr) setErrorMsg("Course fetch: " + modErr.message);
      if (modData) setMod(modData);

      // Fetch PDFs
      const { data: notesData, error: notesErr } = await supabase.from('notes').select('*').eq('module_id', id).order('order_index');
      if (notesErr) setErrorMsg("Lessons fetch: " + notesErr.message);
      
      let docs = notesData || [];

      // Check ownership per note
      if (session && docs.length > 0) {
        if (_isAdmin) {
           docs = docs.map(d => ({...d, hasPurchased: true}) as Note);
        } else {
          let purchasedIds = new Set<string>();
          try {
            // First attempt with * to detect actual columns
            const { data: purchases, error: pErr } = await supabase
              .from('purchases')
              .select('*')
              .eq('user_id', session.user.id);
              
            if (!pErr && purchases) {
              purchases.forEach((p: any) => {
                if (p.note_id) purchasedIds.add(p.note_id);
                if (p.notes_id) purchasedIds.add(p.notes_id);
                if (p.module_id) purchasedIds.add(p.module_id);
                if (p.id) purchasedIds.add(p.id);
              });
            }
          } catch (e) {
            console.warn("Could not query purchases table:", e);
          }
            
          docs = docs.map(d => ({...d, hasPurchased: purchasedIds.has(d.id)}) as Note);
        }
      }
      
      setNotes(docs);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const deleteNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    toast("Delete this Lesson and its files permanently?", {
      action: {
        label: "Delete",
        onClick: async () => {
          try {
            await deleteNoteWithFiles(noteId);
            toast.success("Lesson and files deleted.");
            setNotes(notes.filter(n => n.id !== noteId));
          } catch (err: any) {
            console.error(err);
            toast.error(err.message);
          }
        }
      },
      cancel: { label: 'Cancel', onClick: () => {} },
    });
  };

  const handlePurchase = async (note: Note) => {
    if (!session) {
      navigate('/login');
      return;
    }
    
    toast.info("Payment system not available yet.");
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-[#7000ab] rounded-full animate-spin"></div>
        <p className="font-mono text-sm uppercase tracking-widest text-navy-muted">Loading Course Materials...</p>
      </div>
    );
  }
  
  if (errorMsg) return <div className="text-center py-24 text-red-600 font-medium">Database Error: {errorMsg}</div>;
  if (!mod) return <div className="text-center py-24 font-serif text-3xl text-navy">Course not found</div>;

  return (
    <div className="max-w-6xl mx-auto space-y-10 sm:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 pb-20">
      
      {/* Header */}
      <div className="rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-16 md:p-20 bg-gradient-to-br from-[#090214] via-[#1a0130] to-[#3a0269] border border-purple-900/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4 sm:space-y-5 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#df6000]/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-[#2563EB]/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-4 sm:space-y-5">
          <button 
            onClick={() => navigate('/modules')} 
            className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#ffad6b] hover:text-[#fff] inline-flex items-center gap-1.5 font-bold transition-colors mb-1 sm:mb-2 bg-white dark:bg-[#111]/5 border border-white/10 px-3.5 sm:px-4 py-1.5 rounded-full backdrop-blur-md"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </button>
          <div className="font-mono text-[11px] sm:text-sm uppercase tracking-widest text-white bg-white dark:bg-[#111]/10 border border-white/20 px-4 sm:px-5 py-1.5 sm:py-2 rounded-full shadow-sm inline-flex items-center gap-2 font-bold backdrop-blur-md block w-max">
            Course Syllabus
          </div>
          <h1 className="font-serif text-3xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold text-white tracking-tight drop-shadow-md">
            {mod.title}
          </h1>
          <p className="text-purple-100/80 text-sm sm:text-xl font-normal max-w-2xl leading-relaxed">
            {mod.description || "Browse structured lesson notes, sample previews, and full downloadable curriculum documents."}
          </p>
        </div>
      </div>

      {/* PDFs Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-[#E2E8F0]">
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy">PDF Lessons & Notes</h2>
          <span className="font-mono text-xs uppercase tracking-wider text-black font-semibold">{notes.length} Available</span>
        </div>
        
        {notes.length === 0 ? (
          <div className="text-center py-20 text-[#64748B] border rounded-2xl border-dashed border-[#CBD5E1] bg-white dark:bg-[#111]/60 font-mono text-sm uppercase tracking-wider">
            No lessons uploaded yet for this course.
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {notes.map((note) => (
              <div key={note.id} className="bg-white dark:bg-[#111] border border-[#E2E8F0] hover:border-purple-300 rounded-2xl overflow-hidden flex flex-col group relative shadow-sm hover:shadow-lg transition-all duration-300">
                {isAdmin && (
                  <div className="absolute top-3 right-3 z-20 flex gap-2">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        setEditingNote(note);
                      }}
                      className="p-2 text-slate-700 bg-white dark:bg-[#111]/90 hover:bg-white dark:bg-[#111] hover:text-black rounded-lg shadow-sm transition-all border border-slate-200 cursor-pointer"
                      title="Edit Lesson"
                    >
                      <Edit2 className="w-4 h-4 pointer-events-none" />
                    </button>
                    <button 
                      onClick={(e) => deleteNote(note.id, e)}
                      className="p-2 text-slate-700 bg-white dark:bg-[#111]/90 hover:bg-red-50 hover:text-red-600 rounded-lg shadow-sm transition-all border border-slate-200 cursor-pointer"
                      title="Delete Lesson"
                    >
                      <Trash2 className="w-4 h-4 pointer-events-none" />
                    </button>
                  </div>
                )}

                {/* Thumbnail */}
                {note.thumbnail_url ? (
                  <div className="w-full h-48 relative overflow-hidden bg-slate-100 dark:bg-[#222] border-b border-[#E2E8F0]">
                    <img src={note.thumbnail_url} alt={note.title} crossOrigin="anonymous" referrerPolicy="no-referrer" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  </div>
                ) : (
                  <div className="w-full h-44 bg-purple-50/60 border-b border-purple-100 flex items-center justify-center">
                    <FileText className="w-12 h-12 text-purple-300" />
                  </div>
                )}
                
                {/* Content */}
                <div className="p-6 flex flex-col flex-1 relative z-10">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-serif text-xl sm:text-2xl font-bold text-navy group-hover:text-[#0d0178] transition-colors line-clamp-1">
                      {note.title}
                    </h3>
                    {note.hasPurchased && (
                       <span className="font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-full whitespace-nowrap">
                         ✓ Unlocked
                       </span>
                    )}
                  </div>
                  
                  <p className="text-[#64748B] text-xs sm:text-sm font-normal leading-relaxed mb-6 flex-1 line-clamp-2">
                    {note.description || "No description provided."}
                  </p>
                  
                  <div className="flex flex-col gap-2.5 mt-auto pt-2">
                    {/* Preview Button */}
                    <button 
                      disabled={!note.preview_file_path}
                      className={`w-full py-3 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 border ${
                        note.preview_file_path 
                          ? "bg-white text-black hover:bg-purple-50/60 border-purple-200/90 shadow-xs cursor-pointer hover:border-purple-300" 
                          : "bg-slate-50 text-slate-400 cursor-not-allowed border-slate-200"
                      }`}
                      onClick={() => {
                        if (note.preview_file_path) {
                          navigate(`/modules/${mod.id}/viewer?note=${note.id}&preview=true`);
                        }
                      }}
                    >
                      <FileText className="w-3.5 h-3.5 text-black" /> 
                      <span className="text-black">{note.preview_file_path ? "Free Preview" : "No Preview"}</span>
                    </button>

                    {/* Purchase or Open Full Document Button */}
                    {note.hasPurchased ? (
                      <button 
                        className="w-full bg-[#0d0178] hover:bg-[#1402a8] text-white py-3.5 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-blue-950/20 cursor-pointer"
                        onClick={() => navigate(`/modules/${mod.id}/viewer?note=${note.id}`)}
                      >
                         <FileText className="w-4 h-4" /> Open Full Document
                      </button>
                    ) : (
                      <button 
                        className="w-full bg-gradient-to-r from-[#7000ab] to-[#0c0291] hover:opacity-95 text-white py-3.5 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-purple-950/20 cursor-pointer"
                        onClick={() => handlePurchase(note)}
                      >
                        <Lock className="w-4 h-4 text-white" /> 
                        <span>Unlock Document &bull; ${note.price}</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {editingNote && mod && (
        <EditNoteModal
          note={editingNote}
          moduleId={mod.id}
          onClose={() => setEditingNote(null)}
          onSuccess={fetchData}
        />
      )}
    </div>
  );
}
