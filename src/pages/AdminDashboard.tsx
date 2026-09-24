import * as React from 'react';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { Settings, UploadCloud, Sparkles, FolderPlus, BookOpen, Layers, CheckCircle2, Key, CreditCard, Check, AlertTriangle } from 'lucide-react';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [years, setYears] = useState<any[]>([]);
  const [modules, setModules] = useState<any[]>([]);
  const navigate = useNavigate();

  // Unified Form State
  const [yearName, setYearName] = useState('');
  const [fieldName, setFieldName] = useState('');
  
  const [lessonTitle, setLessonTitle] = useState('');
  const [lessonDesc, setLessonDesc] = useState('');
  const [lessonPrice, setLessonPrice] = useState('');
  
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [previewPdfFile, setPreviewPdfFile] = useState<File | null>(null);

  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'stripe'>('upload');

  // Stripe Management State
  const [stripeSecretKeyInput, setStripeSecretKeyInput] = useState('');
  const [stripeStatus, setStripeStatus] = useState<{ configured: boolean; keyMasked: string; isTest?: boolean }>({
    configured: false,
    keyMasked: '',
  });
  const [isVerifyingStripe, setIsVerifyingStripe] = useState(false);

  useEffect(() => {
    checkAdmin();
    fetchData();
    fetchStripeStatus();
  }, []);

  const fetchStripeStatus = async () => {
    try {
      const res = await fetch('/api/stripe/status');
      if (res.ok) {
        const data = await res.json();
        setStripeStatus(data);
      }
    } catch (e) {
      console.warn("Could not check stripe status:", e);
    }
  };

  const handleSaveStripeKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripeSecretKeyInput.trim()) {
      toast.error('Please enter your Stripe Secret Key (e.g. sk_test_...)');
      return;
    }

    try {
      setIsVerifyingStripe(true);
      toast.loading('Validating key with Stripe...', { id: 'stripe-key' });
      const res = await fetch('/api/stripe/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secretKey: stripeSecretKeyInput.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save Stripe key');
      }
      toast.success(data.message || 'Stripe API key connected successfully!', { id: 'stripe-key' });
      setStripeSecretKeyInput('');
      await fetchStripeStatus();
    } catch (err: any) {
      toast.error(err.message || 'Verification failed. Please check your Stripe key.', { id: 'stripe-key' });
    } finally {
      setIsVerifyingStripe(false);
    }
  };

  const checkAdmin = async () => {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (!session) {
      navigate('/'); 
      return;
    }
    const { data, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
    const roleValue = data?.role?.toLowerCase();
    if (roleValue !== 'admin' && roleValue !== 'true') {
      navigate('/dashboard');
    } else {
      setIsAdmin(true);
    }
  };

  const fetchData = async () => {
    const { data: yrs } = await supabase.from('years').select('*').order('created_at', { ascending: true });
    if (yrs) setYears(yrs);

    const { data: mods } = await supabase.from('modules').select('*').order('created_at', { ascending: true });
    if (mods) setModules(mods);
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pdfFile || !yearName.trim() || !fieldName.trim()) return;
    
    setIsUploading(true);
    let targetYearId = '';
    let targetModuleId = '';

    try {
      // 0. Find or Create Year
      const { data: existingYears } = await supabase.from('years').select('id').ilike('name', yearName.trim());
      if (existingYears && existingYears.length > 0) {
        targetYearId = existingYears[0].id;
      } else {
        const { data: newYear, error: yearError } = await supabase.from('years').insert({
          name: yearName.trim(),
        }).select().single();
        
        if (yearError) throw new Error('Failed to create Year: ' + yearError.message);
        if (!newYear) throw new Error('Failed to create Year: No data returned from insert');
        targetYearId = newYear.id;
      }

      // 1. Find or create Field (Module)
      const { data: existingMods } = await supabase.from('modules')
        .select('id')
        .eq('year_id', targetYearId)
        .ilike('title', fieldName.trim());

      if (existingMods && existingMods.length > 0) {
        targetModuleId = existingMods[0].id;
      } else {
        const { data: newMod, error: modError } = await supabase.from('modules').insert({
          title: fieldName.trim(),
          year_id: targetYearId,
        }).select().single();
        
        if (modError) throw new Error('Failed to create field: ' + modError.message);
        targetModuleId = newMod.id;
      }

      // 2. Upload PDF
      const pdfPath = `${targetModuleId}/${Date.now()}_${pdfFile.name}`;
      const { error: pdfUploadError } = await supabase.storage.from('modules').upload(pdfPath, pdfFile);
      if (pdfUploadError) throw new Error('Failed to upload PDF: ' + pdfUploadError.message);

      // 2b. Upload Preview PDF (Optional)
      let previewPdfPath = null;
      if (previewPdfFile) {
        previewPdfPath = `${targetModuleId}/preview_${Date.now()}_${previewPdfFile.name}`;
        const { error: previewUploadError } = await supabase.storage.from('modules').upload(previewPdfPath, previewPdfFile);
        if (previewUploadError) throw new Error('Failed to upload Preview PDF: ' + previewUploadError.message);
      }

      // 3. Upload Thumbnail (Optional)
      let thumbnailUrl = null;
      if (thumbnail) {
        const thumbPath = `thumbnails/${Date.now()}_${thumbnail.name}`;
        const { error: thumbError } = await supabase.storage.from('modules').upload(thumbPath, thumbnail);
        if (thumbError) throw new Error('Failed to upload thumbnail: ' + thumbError.message);
        const { data } = supabase.storage.from('modules').getPublicUrl(thumbPath);
        thumbnailUrl = data.publicUrl;
      }

      // 4. Create Note (Lesson)
      const { error: dbError } = await supabase.from('notes').insert({
        module_id: targetModuleId,
        title: lessonTitle,
        description: lessonDesc,
        price: parseFloat(lessonPrice) || 0,
        thumbnail_url: thumbnailUrl,
        file_path: pdfPath,
        preview_file_path: previewPdfPath,
        type: 'PDF',
      });

      if (dbError) throw new Error(dbError.message);

      toast.success('Lesson uploaded successfully!');
      
      setLessonTitle('');
      setLessonDesc('');
      setLessonPrice('');
      setPdfFile(null);
      setPreviewPdfFile(null);
      setThumbnail(null);
      
      await fetchData();

    } catch (err: any) {
      toast.error(err.message || 'An error occurred');
    } finally {
      setIsUploading(false);
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-4">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-[#7000ab] rounded-full animate-spin"></div>
        <p className="font-mono text-sm uppercase tracking-widest text-navy-muted">Authenticating Administrator...</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500 pt-4 pb-24">
      
      {/* Header Banner */}
      <div className="rounded-[2.5rem] p-12 sm:p-16 md:p-20 bg-gradient-to-br from-[#090214] via-[#1a0130] to-[#3a0269] border border-purple-900/50 shadow-[0_20px_50px_rgba(0,0,0,0.4)] space-y-5 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#df6000]/20 blur-[80px] rounded-full pointer-events-none" />
        <div className="absolute bottom-0 left-10 w-48 h-48 bg-[#2563EB]/20 blur-[60px] rounded-full pointer-events-none" />
        
        <div className="relative z-10 space-y-5">
          <div className="font-mono text-xs sm:text-sm uppercase tracking-widest text-[#ffad6b] bg-white dark:bg-[#111]/5 border border-white/10 px-5 py-2 rounded-full shadow-sm inline-flex items-center gap-2 font-bold backdrop-blur-md">
            <Sparkles className="w-4 h-4 text-[#ffad6b]" />
            Management Center
          </div>
          <h1 className="font-serif text-5xl sm:text-6xl md:text-7xl font-extrabold text-white tracking-tight drop-shadow-md">
            Admin <span className="text-[#ffad6b] italic">Publishing Suite</span>
          </h1>
          <p className="text-purple-100/80 text-lg sm:text-xl font-normal max-w-2xl leading-relaxed">
            Publish curriculum modules, upload secure PDF files, create sample previews, and set prices.
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-3 p-1.5 bg-slate-100 rounded-2xl border border-slate-200 max-w-md">
        <button
          onClick={() => setActiveTab('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
            activeTab === 'upload'
              ? 'bg-white text-navy shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-navy hover:bg-white/50'
          }`}
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload Lesson</span>
        </button>

        <button
          onClick={() => setActiveTab('stripe')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-mono text-xs uppercase tracking-wider font-bold transition-all cursor-pointer ${
            activeTab === 'stripe'
              ? 'bg-white text-navy shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-navy hover:bg-white/50'
          }`}
        >
          <CreditCard className="w-4 h-4 text-[#7000ab]" />
          <span>Stripe Settings</span>
          {stripeStatus.configured && (
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          )}
        </button>
      </div>

      {activeTab === 'stripe' ? (
        /* Stripe API Configuration Section */
        <div className="bg-gradient-to-br from-[#7000ab]/[0.07] via-[#2563EB]/[0.04] to-[#0c0291]/[0.08] rounded-3xl p-8 sm:p-12 border border-purple-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.18)] relative overflow-hidden backdrop-blur-xs space-y-8 animate-in fade-in duration-300">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-4 mb-2">
              <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy flex items-center gap-3">
                <CreditCard className="w-7 h-7 text-[#7000ab]" />
                Stripe Payment Gateway
              </h2>

              <div className="flex items-center gap-2">
                {stripeStatus.configured ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    {stripeStatus.isTest ? 'TEST MODE CONNECTED' : 'LIVE CONNECTED'}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold bg-amber-100 text-amber-800 border border-amber-300">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    KEYS NEEDED
                  </span>
                )}
              </div>
            </div>
            <p className="text-navy-muted text-sm max-w-xl">
              Configure your Stripe Secret Key below. Payments are automatically processed through Stripe Checkout, unlocking courses for registered students upon successful payment.
            </p>
          </div>

          {/* Current Status Box */}
          <div className="bg-[#F8FAFC] p-6 rounded-2xl border border-[#E2E8F0] space-y-4">
            <h3 className="font-mono text-xs uppercase tracking-wider text-navy font-bold flex items-center gap-2">
              <Key className="w-4 h-4 text-purple-700" />
              Active Stripe Key Status
            </h3>

            <div className="flex items-center justify-between flex-wrap gap-3 p-4 bg-white rounded-xl border border-slate-200">
              <div>
                <p className="text-xs text-slate-500 font-mono">Current Secret Key</p>
                <p className="text-sm font-mono font-bold text-navy mt-0.5">
                  {stripeStatus.configured ? stripeStatus.keyMasked : 'Not configured yet'}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchStripeStatus}
                className="text-xs font-mono font-bold text-[#2563EB] hover:underline"
              >
                Refresh Status
              </button>
            </div>
          </div>

          {/* Input Form for New Key */}
          <form onSubmit={handleSaveStripeKey} className="space-y-6">
            <div className="space-y-3 bg-[#F8FAFC] p-6 rounded-2xl border border-[#E2E8F0]">
              <label className="font-mono text-xs uppercase tracking-wider text-navy font-bold flex items-center gap-2">
                Stripe Secret Key (Must start with <span className="text-[#2563EB]">sk_test_</span> or <span className="text-[#2563EB]">sk_live_</span>)
              </label>
              
              <div className="relative">
                <input
                  type="text"
                  value={stripeSecretKeyInput}
                  onChange={(e) => setStripeSecretKeyInput(e.target.value.trim())}
                  placeholder="sk_test_51..."
                  className={`w-full bg-white border rounded-xl px-4 py-3.5 text-sm text-navy placeholder:text-[#94A3B8] font-mono focus:outline-none transition-all shadow-xs ${
                    stripeSecretKeyInput.startsWith('pk_') 
                      ? 'border-red-500 ring-2 ring-red-100' 
                      : 'border-[#CBD5E1] focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100'
                  }`}
                />
              </div>

              {stripeSecretKeyInput.startsWith('pk_') && (
                <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium space-y-1">
                  <p className="font-bold flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    You pasted the Publishable Key (<code className="font-mono font-bold">pk_...</code>)!
                  </p>
                  <p>
                    Stripe requires the <strong>Secret Key</strong> which begins with <code className="font-mono font-bold text-red-900 bg-red-100 px-1 py-0.5 rounded">sk_test_...</code>. 
                    In Stripe Dashboard, click <strong>"Reveal test key"</strong> next to Secret key.
                  </p>
                </div>
              )}

              <p className="text-xs text-slate-500">
                Go to: <strong>Stripe Dashboard &gt; Developers &gt; API keys</strong> &gt; look for the row named <strong>"Secret key"</strong> (starts with <code className="font-mono bg-slate-100 px-1 py-0.5 rounded">sk_test_...</code>), click <strong>Reveal test key</strong>, and paste it here.
              </p>
            </div>

            <button
              type="submit"
              disabled={isVerifyingStripe || !stripeSecretKeyInput.trim() || stripeSecretKeyInput.startsWith('pk_')}
              className="w-full bg-gradient-to-r from-[#7000ab] to-[#0c0291] hover:opacity-95 text-white py-4 rounded-xl font-mono font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-950/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isVerifyingStripe ? (
                <>
                  <Settings className="w-5 h-5 animate-spin" />
                  Verifying with Stripe...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" />
                  Save & Validate Stripe Secret Key
                </>
              )}
            </button>
          </form>

          {/* Testing Tips */}
          <div className="p-6 rounded-2xl bg-blue-50/80 border border-blue-200 text-slate-800 space-y-2">
            <h4 className="font-mono text-xs uppercase font-bold text-blue-900 tracking-wider">
              Stripe Test Card Info for Development
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">
              When in test mode (<code className="bg-blue-100 px-1 py-0.5 rounded text-blue-900 font-mono">sk_test_...</code>), you can test checkout using card number: <strong className="font-mono text-blue-900">4242 4242 4242 4242</strong> with any future expiration date and any 3-digit CVC (e.g. 123).
            </p>
          </div>
        </div>
      ) : (
      /* Main Upload Form Card */
      <div className="bg-gradient-to-br from-[#7000ab]/[0.07] via-[#2563EB]/[0.04] to-[#0c0291]/[0.08] rounded-3xl p-8 sm:p-12 border border-purple-200/60 shadow-[0_20px_50px_rgba(0,0,0,0.18)] relative overflow-hidden backdrop-blur-xs">
        <h2 className="font-serif text-2xl sm:text-3xl font-bold text-navy mb-8 pb-4 border-b border-purple-200/40">
          Upload New Lesson
        </h2>
        
        <form onSubmit={handleUpload} className="space-y-8">
          
          {/* Step 1: Categorization */}
          <div className="space-y-5 bg-[#F8FAFC] p-6 sm:p-7 rounded-2xl border border-[#E2E8F0] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7000ab] to-[#0c0291] flex items-center justify-center text-white text-xs font-mono font-bold shadow-xs">
                1
              </div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-navy font-bold">
                Categorization & Level
              </h3>
            </div>
            
            <div className="grid md:grid-cols-2 gap-5">
              <div className="space-y-1.5 flex flex-col">
                <label className="font-mono text-xs uppercase tracking-wider text-navy-muted font-semibold">
                  Academic Year
                </label>
                <input 
                  value={yearName} 
                  onChange={e => setYearName(e.target.value)} 
                  placeholder="e.g. 1st Year, Senior Year..."
                  required 
                  className="bg-white dark:bg-[#111] border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm text-navy placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all font-sans shadow-xs"
                  list="year-options"
                />
                <datalist id="year-options">
                  {years.map(y => <option key={y.id} value={y.name} />)}
                </datalist>
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="font-mono text-xs uppercase tracking-wider text-navy-muted font-semibold">
                  Course / Module Title
                </label>
                <input 
                  value={fieldName} 
                  onChange={e => setFieldName(e.target.value)} 
                  placeholder="e.g. Biology, Mathematics..."
                  required 
                  className="bg-white dark:bg-[#111] border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm text-navy placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all font-sans shadow-xs"
                  list="field-options"
                />
                <datalist id="field-options">
                  {modules
                    .filter(m => !yearName || m.year_id === years.find(y => y.name.toLowerCase() === yearName.toLowerCase())?.id)
                    .map(m => <option key={m.id} value={m.title} />)}
                </datalist>
              </div>
            </div>
          </div>

          {/* Step 2: Lesson Details */}
          <div className="space-y-5 bg-[#F8FAFC] p-6 sm:p-7 rounded-2xl border border-[#E2E8F0] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7000ab] to-[#0c0291] flex items-center justify-center text-white text-xs font-mono font-bold shadow-xs">
                2
              </div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-navy font-bold">
                Lesson Information
              </h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-1.5 flex flex-col">
                <label className="font-mono text-xs uppercase tracking-wider text-navy-muted font-semibold">
                  Lesson Title
                </label>
                <input 
                  value={lessonTitle} 
                  onChange={e => setLessonTitle(e.target.value)} 
                  required 
                  placeholder="e.g. Chapter 1: Foundations & Key Principles"
                  className="bg-white dark:bg-[#111] border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm text-navy placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all font-sans shadow-xs"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="font-mono text-xs uppercase tracking-wider text-navy-muted font-semibold">
                  Description
                </label>
                <textarea 
                  value={lessonDesc} 
                  onChange={e => setLessonDesc(e.target.value)} 
                  rows={3}
                  placeholder="Brief overview of the syllabus topics, solved questions, and document content..."
                  className="bg-white dark:bg-[#111] border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm text-navy placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all font-sans placeholder:text-[#94A3B8] resize-none shadow-xs"
                />
              </div>

              <div className="space-y-1.5 flex flex-col">
                <label className="font-mono text-xs uppercase tracking-wider text-navy-muted font-semibold">
                  Price ($ USD)
                </label>
                <input 
                  type="number" 
                  step="0.01" 
                  value={lessonPrice} 
                  onChange={e => setLessonPrice(e.target.value)} 
                  required
                  placeholder="0.00"
                  className="bg-white dark:bg-[#111] border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm text-navy placeholder:text-[#94A3B8] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all font-mono shadow-xs max-w-xs"
                />
              </div>
            </div>
          </div>

          {/* Step 3: Files / Assets with Drag-Drop */}
          <div className="space-y-6 bg-[#F8FAFC] p-6 sm:p-8 rounded-2xl border border-[#E2E8F0] shadow-[0_8px_20px_rgba(0,0,0,0.12)]">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#7000ab] to-[#0c0291] flex items-center justify-center text-white text-xs font-mono font-bold shadow-xs">
                3
              </div>
              <h3 className="font-mono text-xs uppercase tracking-wider text-navy font-bold">
                ASSETS
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Full PDF (Required) - Spans 2 cols on desktop or 1 */}
              <div className="md:col-span-2 space-y-2">
                <label className="font-mono text-xs uppercase tracking-wider text-navy font-bold block">
                  FULL PDF DOCUMENT (REQUIRED)
                </label>
                <div 
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setPdfFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('full-pdf-input')?.click()}
                  className={`group border-2 border-dashed rounded-2xl p-6 sm:p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                    pdfFile 
                      ? 'border-emerald-400 bg-emerald-50/40' 
                      : 'border-slate-300 hover:border-[#0d0178] bg-[#e1e1e1] hover:bg-[#d5d5d5] shadow-xs'
                  }`}
                >
                  <input 
                    id="full-pdf-input"
                    type="file" 
                    accept="application/pdf" 
                    onChange={e => setPdfFile(e.target.files?.[0] || null)} 
                    className="hidden" 
                  />
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 transition-colors ${
                    pdfFile ? 'bg-emerald-100 text-emerald-700' : 'bg-[#ffffff] text-slate-700 group-hover:text-[#0d0178] shadow-xs'
                  }`}>
                    <UploadCloud className="w-6 h-6 stroke-[1.8]" />
                  </div>
                  {pdfFile ? (
                    <div className="space-y-1">
                      <p className="font-mono text-xs font-bold text-emerald-800 break-all">{pdfFile.name}</p>
                      <p className="text-[11px] text-emerald-600 font-mono">{(pdfFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Click or drop to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-mono text-sm font-bold text-navy group-hover:text-[#0d0178]">Choose File</p>
                      <p className="text-xs text-[#64748B] font-mono">Drag & Drop PDF document here</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Thumbnail Cover (Optional) */}
              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-wider text-navy font-bold block">
                  THUMBNAIL COVER (OPTIONAL)
                </label>
                <div 
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setThumbnail(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('thumb-input')?.click()}
                  className={`group border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[150px] ${
                    thumbnail 
                      ? 'border-purple-400 bg-purple-50/40' 
                      : 'border-slate-300 hover:border-purple-400 bg-[#e1e1e1] hover:bg-[#d5d5d5] shadow-xs'
                  }`}
                >
                  <input 
                    id="thumb-input"
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={e => setThumbnail(e.target.files?.[0] || null)} 
                    className="hidden" 
                  />
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2.5 transition-colors ${
                    thumbnail ? 'bg-purple-100 text-[#7000ab]' : 'bg-[#ffffff] text-slate-700 group-hover:text-[#7000ab] shadow-xs'
                  }`}>
                    <UploadCloud className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  {thumbnail ? (
                    <div className="space-y-1">
                      <p className="font-mono text-xs font-bold text-purple-900 break-all">{thumbnail.name}</p>
                      <p className="text-[11px] text-purple-600 font-mono">{(thumbnail.size / 1024).toFixed(1)} KB &bull; Click to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-mono text-xs sm:text-sm font-bold text-navy group-hover:text-[#7000ab]">Choose File</p>
                      <p className="text-[11px] text-[#64748B] font-mono">Drag & Drop Image</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Free Preview PDF (Optional) */}
              <div className="space-y-2">
                <label className="font-mono text-xs uppercase tracking-wider text-navy font-bold block">
                  UPLOAD FREE PREVIEW PDF (OPTIONAL)
                </label>
                <div 
                  onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                      setPreviewPdfFile(e.dataTransfer.files[0]);
                    }
                  }}
                  onClick={() => document.getElementById('preview-pdf-input')?.click()}
                  className={`group border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[150px] ${
                    previewPdfFile 
                      ? 'border-blue-400 bg-blue-50/40' 
                      : 'border-slate-300 hover:border-[#2563EB] bg-[#e1e1e1] hover:bg-[#d5d5d5] shadow-xs'
                  }`}
                >
                  <input 
                    id="preview-pdf-input"
                    type="file" 
                    accept="application/pdf" 
                    onChange={e => setPreviewPdfFile(e.target.files?.[0] || null)} 
                    className="hidden" 
                  />
                  <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-2.5 transition-colors ${
                    previewPdfFile ? 'bg-blue-100 text-[#2563EB]' : 'bg-[#ffffff] text-slate-700 group-hover:text-[#2563EB] shadow-xs'
                  }`}>
                    <UploadCloud className="w-5 h-5 stroke-[1.8]" />
                  </div>
                  {previewPdfFile ? (
                    <div className="space-y-1">
                      <p className="font-mono text-xs font-bold text-blue-900 break-all">{previewPdfFile.name}</p>
                      <p className="text-[11px] text-blue-600 font-mono">{(previewPdfFile.size / (1024 * 1024)).toFixed(2)} MB &bull; Click to replace</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-mono text-xs sm:text-sm font-bold text-navy group-hover:text-[#2563EB]">Drag & Drop</p>
                      <p className="text-[11px] text-[#64748B] font-mono">Choose File or Drop PDF</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <p className="text-xs text-[#64748B] pt-1">
              If provided, non-purchased users can view this free sample.
            </p>
          </div>

          <button 
            type="submit" 
            disabled={isUploading}
            className="w-full bg-gradient-to-r from-[#7000ab] to-[#0c0291] hover:opacity-95 text-white py-4 rounded-xl font-mono font-bold text-sm uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-950/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isUploading ? (
              <>
                <Settings className="w-5 h-5 animate-spin" />
                Uploading & Processing...
              </>
            ) : (
              <>
                <UploadCloud className="w-5 h-5" />
                Publish Lesson to Catalog
              </>
            )}
          </button>
        </form>
      </div>
      )}
    </div>
  );
}
