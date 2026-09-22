import React, { useState } from 'react';
import { X, UploadCloud, Settings } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

interface Note {
  id: string;
  title: string;
  description: string;
  price: number;
  thumbnail_url: string;
  file_path?: string;
  preview_file_path?: string;
  hasPurchased?: boolean;
}

interface EditNoteModalProps {
  note: Note;
  moduleId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditNoteModal({ note, moduleId, onClose, onSuccess }: EditNoteModalProps) {
  const [title, setTitle] = useState(note.title);
  const [description, setDescription] = useState(note.description || '');
  const [price, setPrice] = useState(note.price.toString());
  
  const [thumbnail, setThumbnail] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [previewPdfFile, setPreviewPdfFile] = useState<File | null>(null);
  
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      let updatedData: any = {
        title,
        description,
        price: parseFloat(price) || 0,
      };

      // Upload new pdf
      if (pdfFile) {
        const pdfPath = `${moduleId}/${Date.now()}_${pdfFile.name}`;
        const { error: pdfUploadError } = await supabase.storage.from('modules').upload(pdfPath, pdfFile);
        if (pdfUploadError) throw new Error('Failed to upload PDF: ' + pdfUploadError.message);
        updatedData.file_path = pdfPath;
        
        // Remove old file
        if (note.file_path) {
          await supabase.storage.from('modules').remove([note.file_path]);
        }
      }

      // Upload new preview pdf
      if (previewPdfFile) {
        const previewPdfPath = `${moduleId}/preview_${Date.now()}_${previewPdfFile.name}`;
        const { error: previewUploadError } = await supabase.storage.from('modules').upload(previewPdfPath, previewPdfFile);
        if (previewUploadError) throw new Error('Failed to upload Preview PDF: ' + previewUploadError.message);
        updatedData.preview_file_path = previewPdfPath;
        
        // Remove old preview file
        if (note.preview_file_path) {
          await supabase.storage.from('modules').remove([note.preview_file_path]);
        }
      }

      // Upload new thumbnail
      if (thumbnail) {
        const thumbPath = `thumbnails/${Date.now()}_${thumbnail.name}`;
        const { error: thumbError } = await supabase.storage.from('modules').upload(thumbPath, thumbnail);
        if (thumbError) throw new Error('Failed to upload thumbnail: ' + thumbError.message);
        const { data } = supabase.storage.from('modules').getPublicUrl(thumbPath);
        updatedData.thumbnail_url = data.publicUrl;
        
        // Remove old thumbnail
        if (note.thumbnail_url) {
          const match = note.thumbnail_url.match(/\/public\/modules\/(.+)$/);
          let extractedPath = '';
          if (match && match[1]) {
            extractedPath = match[1];
          } else {
            const urlParts = note.thumbnail_url.split('/modules/');
            if (urlParts.length === 2) {
              extractedPath = urlParts[1];
            }
          }
          if (extractedPath) {
            extractedPath = extractedPath.split('?')[0];
            extractedPath = decodeURIComponent(extractedPath);
            await supabase.storage.from('modules').remove([extractedPath]);
          }
        }
      }

      const { error: updateError } = await supabase
        .from('notes')
        .update(updatedData)
        .eq('id', note.id);

      if (updateError) throw new Error(updateError.message);

      toast.success('Lesson updated successfully!');
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err.message || 'An error occurred while updating.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white border border-[#E2E8F0] shadow-2xl rounded-3xl p-6 sm:p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto relative animate-in zoom-in-95 duration-200">
        <button 
          onClick={onClose}
          className="absolute top-5 right-5 p-2 bg-slate-100 hover:bg-slate-200 text-[#0F172A] rounded-full transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>
        
        <div className="mb-6">
          <div className="font-mono text-xs uppercase tracking-widest text-[#2563EB] font-bold mb-1">
            Editor
          </div>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#0F172A]">Edit Lesson Details</h2>
        </div>
        
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-4">
            <div className="space-y-1.5 flex flex-col">
              <label className="font-mono text-xs uppercase tracking-wider text-[#475569] font-semibold">
                Lesson Title
              </label>
              <input 
                value={title} 
                onChange={e => setTitle(e.target.value)} 
                required 
                className="bg-white border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all font-sans"
              />
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="font-mono text-xs uppercase tracking-wider text-[#475569] font-semibold">
                Description
              </label>
              <textarea 
                value={description} 
                onChange={e => setDescription(e.target.value)} 
                rows={3}
                className="bg-white border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all font-sans resize-none"
              />
            </div>

            <div className="space-y-1.5 flex flex-col">
              <label className="font-mono text-xs uppercase tracking-wider text-[#475569] font-semibold">
                Price ($ USD)
              </label>
              <input 
                type="number" 
                step="0.01" 
                value={price} 
                onChange={e => setPrice(e.target.value)} 
                required
                className="bg-white border border-[#CBD5E1] rounded-xl px-4 py-3 text-sm text-[#0F172A] focus:outline-none focus:border-[#2563EB] focus:ring-2 focus:ring-blue-100 transition-all font-mono max-w-xs"
              />
            </div>
          </div>

          <div className="space-y-4 bg-[#F8FAFC] p-5 sm:p-6 rounded-2xl border border-[#E2E8F0]">
            <p className="text-xs text-[#64748B] font-medium">Click or drag & drop files below to replace current documents.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Thumbnail Cover */}
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-[#0F172A] font-bold block">
                  Thumbnail (Optional)
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
                  onClick={() => document.getElementById('edit-thumb-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    thumbnail ? 'border-purple-400 bg-purple-50/40' : 'border-slate-300 hover:border-purple-400 bg-white'
                  }`}
                >
                  <input 
                    id="edit-thumb-input"
                    type="file" 
                    accept="image/png, image/jpeg, image/webp" 
                    onChange={e => setThumbnail(e.target.files?.[0] || null)} 
                    className="hidden" 
                  />
                  <UploadCloud className={`w-5 h-5 mb-1 ${thumbnail ? 'text-[#7000ab]' : 'text-slate-500'}`} />
                  <p className="font-mono text-[11px] font-bold text-[#0F172A] truncate max-w-full">
                    {thumbnail ? thumbnail.name : "Choose File"}
                  </p>
                </div>
              </div>

              {/* Full PDF */}
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-[#0F172A] font-bold block">
                  Full PDF Document
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
                  onClick={() => document.getElementById('edit-pdf-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    pdfFile ? 'border-emerald-400 bg-emerald-50/40' : 'border-slate-300 hover:border-[#0d0178] bg-white'
                  }`}
                >
                  <input 
                    id="edit-pdf-input"
                    type="file" 
                    accept="application/pdf" 
                    onChange={e => setPdfFile(e.target.files?.[0] || null)} 
                    className="hidden" 
                  />
                  <UploadCloud className={`w-5 h-5 mb-1 ${pdfFile ? 'text-emerald-700' : 'text-slate-500'}`} />
                  <p className="font-mono text-[11px] font-bold text-[#0F172A] truncate max-w-full">
                    {pdfFile ? pdfFile.name : "Replace PDF"}
                  </p>
                </div>
              </div>

              {/* Preview PDF */}
              <div className="space-y-1.5">
                <label className="font-mono text-[11px] uppercase tracking-wider text-[#0F172A] font-bold block">
                  Sample Preview PDF
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
                  onClick={() => document.getElementById('edit-preview-pdf-input')?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                    previewPdfFile ? 'border-blue-400 bg-blue-50/40' : 'border-slate-300 hover:border-[#2563EB] bg-white'
                  }`}
                >
                  <input 
                    id="edit-preview-pdf-input"
                    type="file" 
                    accept="application/pdf" 
                    onChange={e => setPreviewPdfFile(e.target.files?.[0] || null)} 
                    className="hidden" 
                  />
                  <UploadCloud className={`w-5 h-5 mb-1 ${previewPdfFile ? 'text-[#2563EB]' : 'text-slate-500'}`} />
                  <p className="font-mono text-[11px] font-bold text-[#0F172A] truncate max-w-full">
                    {previewPdfFile ? previewPdfFile.name : "Drag & Drop"}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full bg-gradient-to-r from-[#7000ab] to-[#0c0291] hover:opacity-95 text-white py-3.5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-md shadow-purple-950/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {isSaving ? (
              <>
                <Settings className="w-4 h-4 animate-spin" />
                Saving Changes...
              </>
            ) : (
              <>
                <UploadCloud className="w-4 h-4" />
                Save Lesson Updates
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
