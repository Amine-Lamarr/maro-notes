import { supabase } from './supabase';

export const deleteFilesForNotes = async (notes: any[]) => {
  const pathsToDelete: string[] = [];
  
  notes.forEach((note) => {
    if (note.file_path) {
      pathsToDelete.push(note.file_path);
    }
    if (note.preview_file_path) {
      pathsToDelete.push(note.preview_file_path);
    }
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
        pathsToDelete.push(extractedPath);
      }
    }
  });

  if (pathsToDelete.length > 0) {
    const { error } = await supabase.storage.from('modules').remove(pathsToDelete);
    if (error) {
      console.error('Error deleting files from storage:', error);
    } else {
      console.log('Successfully deleted files from storage:', pathsToDelete);
    }
  }
};

export const deleteYearWithFiles = async (yearId: string) => {
  // Find all modules for this year
  const { data: modules } = await supabase.from('modules').select('id').eq('year_id', yearId);
  const moduleIds = modules?.map(m => m.id) || [];

  if (moduleIds.length > 0) {
    // Find all notes for these modules
    const { data: notes } = await supabase.from('notes').select('file_path, preview_file_path, thumbnail_url').in('module_id', moduleIds);
    if (notes && notes.length > 0) {
      await deleteFilesForNotes(notes);
    }
  }

  // The DB ON DELETE CASCADE handles deleting the modules and notes rows
  const { error } = await supabase.from('years').delete().eq('id', yearId);
  if (error) throw error;
};

export const deleteModuleWithFiles = async (moduleId: string) => {
  // Find all notes for this module
  const { data: notes } = await supabase.from('notes').select('file_path, preview_file_path, thumbnail_url').eq('module_id', moduleId);
  if (notes && notes.length > 0) {
    await deleteFilesForNotes(notes);
  }

  // Ensure DB deletion goes through, cascade takes care of notes rows
  const { error } = await supabase.from('modules').delete().eq('id', moduleId);
  if (error) throw error;
};

export const deleteNoteWithFiles = async (noteId: string) => {
  // Find the note
  const { data: notes } = await supabase.from('notes').select('file_path, preview_file_path, thumbnail_url').eq('id', noteId);
  if (notes && notes.length > 0) {
    await deleteFilesForNotes(notes);
  }

  // Delete note row
  const { error } = await supabase.from('notes').delete().eq('id', noteId);
  if (error) throw error;
};
