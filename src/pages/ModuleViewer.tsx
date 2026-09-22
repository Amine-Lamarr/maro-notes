import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useParams, useNavigate, useSearchParams } from 'react-router';
import { Document, Page, pdfjs } from 'react-pdf';
import { ArrowLeft, ChevronLeft, ChevronRight, Monitor, FileCode2, Maximize, Minimize, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

// Set up the PDF.js worker using unpkg / cdn matching pdfjs version for stability across dev and production
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

export default function ModuleViewer() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const [notes, setNotes] = useState<any[]>([]);
  const [activeNote, setActiveNote] = useState<any>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'presentation' | 'scroll'>('presentation');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const [zoom, setZoom] = useState(1);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        await containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        await document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    // Force re-render on resize to update PDF scale
    const handleResize = () => setWindowWidth(window.innerWidth);

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    window.addEventListener('resize', handleResize);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const navigate = useNavigate();

  useEffect(() => {
    checkAccessAndFetchNotes();
  }, [id]);

  const checkAccessAndFetchNotes = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate('/login'); return;
    }

    // Check if admin
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    const isAdmin = profile?.role?.toLowerCase() === 'admin' || profile?.role?.toLowerCase() === 'true';

    // Fetch purchases for this user safely
    let purchasedIds = new Set<string>();
    try {
      const { data: purchases, error: purchaseError } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', session.user.id);
        
      if (!purchaseError && purchases) {
        purchases.forEach((p: any) => {
          if (p.note_id) purchasedIds.add(p.note_id);
          if (p.notes_id) purchasedIds.add(p.notes_id);
          if (p.module_id) purchasedIds.add(p.module_id);
          if (p.id) purchasedIds.add(p.id);
        });
      }
    } catch (err) {
      console.warn("Could not query purchases table:", err);
    }

    // Fetch all notes for this module
    const { data: notesData } = await supabase.from('notes').select('*').eq('module_id', id).order('order_index');
    
    if (notesData) {
      // Allow notes that are either purchased, user is admin, or have a preview file available
      const allowedNotes = notesData.map((n: any) => ({
         ...n,
         hasPurchased: isAdmin ? true : purchasedIds.has(n.id)
      })).filter((n: any) => n.hasPurchased || n.preview_file_path);
      
      if (allowedNotes.length === 0) {
        toast.error('You do not have access to any documents in this course.');
        navigate('/dashboard');
        return;
      }
      
      setNotes(allowedNotes);
      
      const targetNoteId = params.get('note');
      const targetNote = targetNoteId ? allowedNotes.find(n => n.id === targetNoteId) : allowedNotes[0];
      
      if (targetNote) {
        setActiveNote(targetNote);
      } else {
        setActiveNote(allowedNotes[0]);
      }
    } else {
      toast.error('Course not found.');
      navigate('/dashboard');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (activeNote) {
      // Determine which file path to load: full or preview
      const targetPath = activeNote.hasPurchased ? activeNote.file_path : activeNote.preview_file_path;
      if (targetPath) {
        loadPdf(targetPath);
      } else {
        toast.error('No readable file available for this lesson.');
      }
    }
  }, [activeNote]);

  const [pdfError, setPdfError] = useState<string | null>(null);

  const loadPdf = async (filePath: string) => {
    setPdfError(null);
    const { data, error } = await supabase.storage.from('modules').createSignedUrl(filePath, 3600);
    if (error) {
      toast.error('Failed to load PDF: ' + error.message);
      setPdfError('Failed to generate secure URL: ' + error.message);
    } else {
      // Use direct signedUrl with proxy fallback
      setPdfUrl(`/api/proxy-pdf?url=${encodeURIComponent(data.signedUrl)}`);
      setPageNumber(1);
    }
  };

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
    setPdfError(null);
  };

  const onDocumentLoadError = (error: Error) => {
    console.error('PDF load error:', error);
    setPdfError(error.message || 'Invalid or unreadable PDF structure.');
  };

  if (loading) return <div className="text-center py-24 small-caps tracking-widest animate-pulse">Initializing Viewer...</div>;

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col md:flex-row ${isFullscreen ? 'h-screen w-screen fixed inset-0 z-[100] m-0 rounded-none border-none bg-black' : 'h-[calc(100vh-8rem)] md:h-[85vh] overflow-hidden -mx-4 sm:-mx-8 md:border border-white/10 md:rounded-2xl bg-black'} relative transition-all duration-300`}
    >
      {isFullscreen && (
        <button 
          onClick={toggleFullscreen}
          className="fixed top-6 right-6 w-12 h-12 z-[110] rounded-full bg-black/50 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white dark:bg-[#111] hover:text-black transition-colors shadow-2xl"
          title="Exit Fullscreen"
        >
          <Minimize className="w-5 h-5" />
        </button>
      )}
      {/* Sidebar */}
      {!isFullscreen && (
        <div className="w-full md:w-72 bg-gradient-to-b from-[#000000] via-[#1a0130] to-[#3a0269] border-b md:border-b-0 md:border-r border-purple-900/40 flex flex-col z-20 h-auto max-h-[35vh] md:max-h-none md:h-full shrink-0 shadow-2xl">
          <div className="p-4 md:p-6 border-b border-purple-900/30 flex flex-col gap-3 md:gap-4 shrink-0 bg-black/40">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 md:gap-4">
              <button 
                className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full border border-white/10 flex items-center justify-center bg-[#aba6e1] text-black hover:bg-[#9c95d9] transition-colors"
                onClick={() => navigate('/dashboard')}
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <span className="font-serif text-base md:text-lg truncate tracking-tight pr-2 text-[#ffad6b]">Documents</span>
            </div>
            <button 
              onClick={toggleFullscreen}
              className="w-8 h-8 md:w-10 md:h-10 shrink-0 rounded-full border border-white/10 flex items-center justify-center bg-[#aba6e1] text-black hover:bg-[#9c95d9] transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>
          </div>
          
          <div className="flex bg-[#cdc8c8] rounded-lg p-1 border border-black shrink-0">
            <button
              onClick={() => setViewMode('presentation')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-mono tracking-wider rounded-md transition-all ${
                viewMode === 'presentation' ? 'bg-white dark:bg-[#111] text-black shadow-md border border-black' : 'text-slate-700 hover:text-black hover:bg-white dark:bg-[#111]/40'
              }`}
            >
              <div className="flex items-center gap-1.5 border border-black px-1 py-0.5 rounded">
                <Monitor className="w-3 h-3" />
                <span>SLIDES</span>
              </div>
            </button>
            <button
              onClick={() => setViewMode('scroll')}
              className={`flex-1 flex items-center justify-center gap-2 py-2 text-xs font-mono tracking-wider rounded-md transition-all ${
                viewMode === 'scroll' ? 'bg-white dark:bg-[#111] text-black shadow-md border border-black' : 'text-slate-700 hover:text-black hover:bg-white dark:bg-[#111]/40'
              }`}
            >
              <div className="flex items-center gap-1.5 px-1 py-0.5 rounded">
                <FileCode2 className="w-3 h-3" />
                <span>SCROLL</span>
              </div>
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2 max-h-[30vh] md:max-h-full">
          {notes.map((note, index) => {
            const isActive = activeNote?.id === note.id;
            return (
              <button
                key={note.id}
                onClick={() => setActiveNote(note)}
                className={`w-full text-left px-4 py-4 justify-start rounded-xl text-sm font-medium transition-all duration-300 flex items-start gap-4 ${
                  isActive 
                    ? 'bg-white dark:bg-[#111] text-black shadow-[0_0_20px_rgba(255,255,255,0.1)]' 
                    : 'hover:bg-white dark:bg-[#111]/5 text-white/50 hover:text-white'
                }`}
              >
                <div className="font-mono text-xs opacity-90 pt-0.5 text-[#0e00b8] font-bold">
                  {(index + 1).toString().padStart(2, '0')}
                </div>
                <div>
                  <div className={`font-serif text-base line-clamp-2 ${isActive ? 'text-black' : 'text-white'}`}>
                    {note.title}
                  </div>
                  <div className={`text-[10px] mt-2 font-mono uppercase tracking-widest text-[#cc7100] font-bold flex items-center gap-2`}>
                    {note.type}
                    {!note.hasPurchased && note.preview_file_path && (
                      <span className="bg-amber-500/20 text-[#cc7100] px-1.5 py-0.5 rounded tracking-widest font-bold">PREVIEW</span>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
      )}

      {/* Main PDF Area */}
      <div className="flex-1 relative flex flex-col items-center overflow-auto w-full z-10 bg-gradient-to-br from-[#000000] via-[#1f0138] to-[#3a0269]" onContextMenu={(e) => e.preventDefault()}>
        
        {/* Deep ambient glow matching standard background for the pdf area */}
        <div className="absolute inset-0 bg-radial from-[#3a0269]/30 via-transparent to-black/80 pointer-events-none" />

        {/* Zoom Controls */}
        <div className="fixed bottom-20 right-4 sm:bottom-24 sm:right-6 md:fixed md:bottom-12 md:right-12 flex flex-col gap-2 z-[110]">
          <button 
            onClick={() => setZoom(z => Math.min(z + 0.1, 3))}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#eb993f] text-white flex items-center justify-center hover:opacity-90 transition-colors shadow-2xl active:scale-95"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4 text-white" />
          </button>
          <div className="flex items-center justify-center h-8 w-8 md:h-10 md:w-10 text-[10px] md:text-xs font-mono font-bold bg-[#df6000] text-white rounded-full border border-white/20 shadow-2xl cursor-pointer" onClick={() => setZoom(1)} title="Reset Zoom">
            {Math.round(zoom * 100)}%
          </div>
          <button 
            onClick={() => setZoom(z => Math.max(z - 0.1, 0.5))}
            className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-[#b20000] text-white flex items-center justify-center hover:opacity-90 transition-colors shadow-2xl active:scale-95"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4 text-white" />
          </button>
        </div>

        {activeNote && !activeNote.hasPurchased && (
          <div className="absolute top-4 left-4 right-4 md:left-auto md:right-auto z-[110] bg-white dark:bg-[#111]/10 border border-white/20 text-white px-4 md:px-6 py-2 md:py-3 rounded-full backdrop-blur-xl shadow-[0_0_20px_rgba(255,255,255,0.1)] font-sans font-bold text-[10px] md:text-xs tracking-widest uppercase flex items-center justify-center gap-2 md:gap-3 text-center">
             <div className="w-1.5 h-1.5 md:w-2 md:h-2 rounded-full bg-secondary shadow-[0_0_8px_rgba(var(--secondary),0.8)] animate-pulse shrink-0" />
             <span className="line-clamp-2">Free Preview Mode - Unlock full course for more</span>
          </div>
        )}

        {pdfError && (
          <div className="relative z-20 my-12 max-w-md mx-auto p-6 rounded-2xl bg-red-950/40 border border-red-500/30 text-center text-white backdrop-blur-md">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <h3 className="font-serif text-lg font-bold mb-1">Unable to Render PDF</h3>
            <p className="text-xs text-red-200/80 mb-4">{pdfError}</p>
            <p className="text-xs text-white/50 mb-4">The uploaded file may be corrupted, still processing, or not a standard PDF format.</p>
            {activeNote && (
              <button
                onClick={() => {
                  const target = activeNote.hasPurchased ? activeNote.file_path : activeNote.preview_file_path;
                  if (target) loadPdf(target);
                }}
                className="px-4 py-2 bg-white/10 hover:bg-white/20 text-xs font-mono uppercase tracking-wider rounded-lg transition-colors"
              >
                Retry Loading
              </button>
            )}
          </div>
        )}

        {pdfUrl && !pdfError ? (
          viewMode === 'scroll' ? (
             <div className="w-full h-full relative z-10 flex flex-col items-center py-12 px-4 space-y-8">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={<div className="py-24 text-white/40 animate-pulse small-caps tracking-widest font-mono">Loading Document...</div>}
                  className="pdf-document flex flex-col gap-8 items-center w-full"
                >
                  {Array.from(new Array(numPages), (_, index) => (
                    <div key={`page_${index + 1}`}>
                      <Page 
                        pageNumber={index + 1} 
                        renderTextLayer={false}
                        renderAnnotationLayer={false}
                        className="shadow-2xl rounded-lg border border-white/10 overflow-hidden"
                        width={windowWidth < 768 ? windowWidth * 0.92 : Math.min(windowWidth * (isFullscreen ? 0.8 : 0.6), isFullscreen ? 1200 : 800)}
                        scale={zoom}
                      />
                    </div>
                  ))}
                </Document>
             </div>
          ) : (
            <div className="flex flex-col items-center w-full py-12 select-none relative z-10 min-h-full">
              <div className="w-full flex justify-center pdf-container px-4">
                <Document
                  file={pdfUrl}
                  onLoadSuccess={onDocumentLoadSuccess}
                  onLoadError={onDocumentLoadError}
                  loading={<div className="py-24 text-white/40 animate-pulse small-caps tracking-widest font-mono">Loading Document...</div>}
                  className="pdf-document"
                >
                  <Page 
                    pageNumber={pageNumber} 
                    renderTextLayer={false}
                    renderAnnotationLayer={false}
                    className="shadow-2xl rounded-lg border border-white/10 overflow-hidden"
                    width={windowWidth < 768 ? windowWidth * 0.92 : Math.min(windowWidth * (isFullscreen ? 0.8 : 0.6), isFullscreen ? 1200 : 800)}
                    scale={zoom}
                  />
                </Document>
              </div>
              
              {/* Minimal Luxury Pagination Controls */}
              {numPages > 0 && (
                <div className="fixed bottom-6 md:bottom-12 left-1/2 md:left-[calc(50%+9rem)] -translate-x-1/2 flex items-center gap-3 md:gap-6 glass-panel px-4 md:px-8 py-2 md:py-4 rounded-full border border-white/10 shadow-2xl z-50">
                  <button 
                    onClick={() => setPageNumber(p => Math.max(1, p - 1))}
                    disabled={pageNumber <= 1}
                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-[#020000] hover:bg-white dark:bg-[#111] hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="flex items-center gap-1 md:gap-2 text-[10px] md:text-sm font-mono tracking-widest shrink-0">
                    <span className="font-bold">{pageNumber.toString().padStart(2, '0')}</span> 
                    <span className="text-white/30 mx-0.5 md:mx-1">/</span> 
                    <span className="text-white/60">{numPages.toString().padStart(2, '0')}</span>
                  </span>
                  <button 
                    onClick={() => setPageNumber(p => Math.min(numPages, p + 1))}
                    disabled={pageNumber >= numPages}
                    className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full border border-[#000000] hover:bg-white dark:bg-[#111] hover:text-black transition-colors disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
              
              {/* Elegant Watermark */}
              <div className="pointer-events-none fixed inset-0 flex items-center justify-center opacity-[0.02] text-7xl font-sans font-bold tracking-tighter rotate-[-30deg] z-50">
                MARONOTES
              </div>
            </div>
          )
        ) : (
          <div className="flex flex-1 items-center justify-center text-white/30 small-caps tracking-widest font-mono">
            Select a document to begin
          </div>
        )}
      </div>
    </div>
  );
}
