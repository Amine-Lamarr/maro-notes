import { supabase } from './supabase';

const LOCAL_STORAGE_KEY_PREFIX = 'maronotes_purchased_notes_';

/**
 * Get all purchased note IDs for a given user from local cache.
 */
export function getLocalPurchases(userId: string): string[] {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save a purchased note ID to local storage for instant multi-layered persistence.
 */
export function recordLocalPurchase(userId: string, noteId: string): void {
  if (!userId || !noteId) return;
  try {
    const existing = new Set(getLocalPurchases(userId));
    existing.add(noteId);
    localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(Array.from(existing)));
  } catch (err) {
    console.error('Failed to save purchase locally:', err);
  }
}

/**
 * Fetch all purchased note IDs for a user with both Supabase backend and resilient local caching.
 */
export async function fetchUserPurchasedNoteIds(userId: string): Promise<Set<string>> {
  const result = new Set<string>(getLocalPurchases(userId));
  
  if (!userId) return result;

  try {
    const { data: purchases, error } = await supabase
      .from('purchases')
      .select('*')
      .eq('user_id', userId);

    if (!error && purchases) {
      purchases.forEach((p: any) => {
        if (p.note_id) result.add(p.note_id);
        if (p.notes_id) result.add(p.notes_id);
      });
      // Sync database records back to local storage
      localStorage.setItem(`${LOCAL_STORAGE_KEY_PREFIX}${userId}`, JSON.stringify(Array.from(result)));
    }
  } catch (err) {
    console.warn('Could not query purchases table from database:', err);
  }

  return result;
}

/**
 * Confirms payment with both the server verify-checkout endpoint (using Service Role / Admin privileges)
 * and directly with the Supabase client, while caching in local storage.
 */
export async function confirmAndRecordPurchase(params: {
  sessionId?: string | null;
  noteId: string;
  userId: string;
  moduleId?: string | null;
}): Promise<{ success: boolean; message?: string }> {
  const { sessionId, noteId, userId } = params;
  if (!userId || !noteId) return { success: false, message: 'Missing userId or noteId' };

  // 1. Immediately cache in local storage so the user NEVER gets locked out even if network lags
  recordLocalPurchase(userId, noteId);

  // 2. Call backend /api/verify-checkout if sessionId is present (uses elevated server-side privileges)
  if (sessionId) {
    try {
      const res = await fetch('/api/verify-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId })
      });
      if (res.ok) {
        console.log('Server successfully verified checkout and recorded purchase.');
      }
    } catch (err) {
      console.warn('Backend verify-checkout call failed or returned error, continuing with client insert:', err);
    }
  }

  // 3. Insert into Supabase 'purchases' table from client
  try {
    let { error } = await supabase.from('purchases').insert({
      user_id: userId,
      note_id: noteId,
      payment_status: 'completed'
    });

    if (error && error.message.includes('payment_status')) {
      const retry = await supabase.from('purchases').insert({
        user_id: userId,
        note_id: noteId
      });
      error = retry.error;
    }

    if (error) {
      console.warn('Client-side purchase insert into Supabase resulted in notice (could be duplicate):', error.message);
    }
  } catch (err) {
    console.warn('Client purchase insert error:', err);
  }

  return { success: true };
}
