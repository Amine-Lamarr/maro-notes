import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { FileText, Lock, ArrowRight, Trash2, Edit2, ArrowLeft, CheckCircle2, ExternalLink, X } from 'lucide-react';
import { toast } from 'sonner';
import { deleteNoteWithFiles } from '@/lib/deleteHelpers';
import EditNoteModal from '@/components/EditNoteModal';
import { fetchUserPurchasedNoteIds, confirmAndRecordPurchase } from '@/lib/purchasesStore';

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
    const checkSuccess = async () => {
      const isSuccess = searchParams.get('success') === 'true';
      const noteId = searchParams.get('note_id');
      const sessionId = searchParams.get('session_id');
      if (isSuccess && noteId) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          toast.success("Document unlocked permanently!", { id: 'purchase-success' });
          await confirmAndRecordPurchase({
            sessionId,
            noteId,
            userId: session.user.id,
            moduleId: id
          });
          fetchData();
        }
      }
    };
    checkSuccess();
  }, [canceled, searchParams]);

  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [checkoutUrlModal, setCheckoutUrlModal] = useState<{ url: string; title: string; price: number } | null>(null);

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
          // Fetch purchased note IDs from both Supabase and resilient client storage
          const purchasedIds = await fetchUserPurchasedNoteIds(session.user.id);
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

  const [purchasingNoteId, setPurchasingNoteId] = useState<string | null>(null);

  const handlePurchase = async (note: Note) => {
    if (!session) {
      toast.info("Please login or register to purchase access to this lesson.");
      navigate('/login');
      return;
    }

    try {
      setPurchasingNoteId(note.id);
      toast.loading("Preparing secure Stripe Checkout...", { id: 'stripe-checkout' });

      const res = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          noteId: note.id,
          title: `${mod?.title || 'Course'} - ${note.title || 'Document'}`,
          noteTitle: note.title || `${mod?.title || 'Course'} - ${note.title || 'Document'}`,
          price: Number(note.price || 0),
          currency: 'usd',
          userId: session.user.id,
          userEmail: session.user.email,
          moduleId: id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initiate Stripe checkout');
      }

      toast.success("Ready! Redirecting to Stripe...", { id: 'stripe-checkout' });
      if (data.url) {
        (window as any).__isRedirectingToCheckout = true;
        setCheckoutUrlModal({ url: data.url, title: note.title, price: note.price });

        // Try direct navigation
        try {
          if (window.top && window.top !== window) {
            window.top.location.href = data.url;
          } else {
            window.location.href = data.url;
          }
        } catch {
          window.location.href = data.url;
        }
      } else {
        throw new Error("No checkout URL returned from server.");
      }
    } catch (err: any) {
      console.error("Purchase initiation error:", err);
      toast.error(err.message || "Failed to start checkout. Please ensure Stripe keys are configured in Admin.", { id: 'stripe-checkout' });
    } finally {
      setPurchasingNoteId(null);
    }
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
      <div className="rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] p-5 sm:p-10 md:p-16 bg-gradient-to-br from-[#090214] via-[#1a0130] to-[#3a0269] border border-purple-900/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-4 sm:space-y-5 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#df6000]/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-[#2563EB]/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-3 sm:space-y-5 min-w-0">
          <button 
            onClick={() => navigate('/modules')} 
            className="font-mono text-xs sm:text-sm uppercase tracking-wider text-[#ffad6b] hover:text-[#fff] inline-flex items-center gap-1.5 font-bold transition-colors mb-1 bg-white/5 border border-white/10 px-3.5 sm:px-4 py-1.5 rounded-full backdrop-blur-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Courses
          </button>
          <div>
            <div className="font-mono text-[11px] sm:text-xs uppercase tracking-widest text-black bg-white border border-white/20 px-3.5 sm:px-4 py-1 sm:py-1.5 rounded-full shadow-sm inline-flex items-center gap-1.5 font-bold backdrop-blur-md">
              Course Syllabus
            </div>
          </div>
          <h1 className="font-serif text-2xl min-[360px]:text-3xl sm:text-5xl md:text-6xl font-extrabold text-white tracking-tight drop-shadow-md break-words">
            {mod.title}
          </h1>
          <p className="text-purple-100/80 text-xs sm:text-base md:text-lg font-normal max-w-2xl leading-relaxed">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8 content-auto">
            {notes.map((note) => (
              <div key={note.id} className="bg-white dark:bg-[#111] border border-[#E2E8F0] hover:border-purple-300 rounded-2xl overflow-hidden flex flex-col group relative shadow-sm hover:shadow-lg transition-all duration-300 transform-gpu">
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
                    <img 
                      src={note.thumbnail_url} 
                      alt={note.title} 
                      loading="lazy" 
                      decoding="async" 
                      crossOrigin="anonymous" 
                      referrerPolicy="no-referrer" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                    />
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
                        disabled={purchasingNoteId === note.id}
                        className="w-full bg-gradient-to-r from-[#7000ab] to-[#0c0291] hover:opacity-95 text-white py-3.5 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all duration-300 flex items-center justify-center gap-2 shadow-md shadow-purple-950/20 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                        onClick={() => handlePurchase(note)}
                      >
                        {purchasingNoteId === note.id ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            <span>Redirecting to Stripe...</span>
                          </>
                        ) : (
                          <>
                            <Lock className="w-4 h-4 text-white" /> 
                            <span>Unlock Document &bull; ${note.price}</span>
                          </>
                        )}
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

      {/* Stripe Checkout Direct Link Modal */}
      {checkoutUrlModal && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-purple-200 space-y-5 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-[#7000ab]">
                  <Lock className="w-4 h-4" />
                </div>
                <h3 className="font-serif text-lg font-bold text-navy">Stripe Checkout Ready</h3>
              </div>
              <button 
                onClick={() => setCheckoutUrlModal(null)} 
                className="p-1.5 text-slate-400 hover:text-navy rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-2xl bg-purple-50/70 border border-purple-100">
              <p className="font-serif font-bold text-navy text-sm">{checkoutUrlModal.title}</p>
              <p className="font-mono text-xs text-purple-700 font-bold mt-1">Amount: ${checkoutUrlModal.price}</p>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              If your browser didn't redirect automatically or opened a blank skeleton screen, click below to open the checkout page in a clean new tab:
            </p>

            <div className="space-y-2.5">
              <a
                href={checkoutUrlModal.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => {
                  (window as any).__isRedirectingToCheckout = true;
                }}
                className="w-full bg-gradient-to-r from-[#7000ab] to-[#0c0291] hover:opacity-95 text-white py-3.5 px-4 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-950/20 cursor-pointer"
              >
                <span>Proceed to Stripe Checkout</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                type="button"
                onClick={() => setCheckoutUrlModal(null)}
                className="w-full py-2.5 text-xs font-mono font-bold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
