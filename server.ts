import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Proxy PDF route to reliably fetch Supabase signed URLs avoiding CORS or SPA fallback issues
app.get('/api/proxy-pdf', async (req, res) => {
  try {
    const rawUrl = req.query.url as string;
    if (!rawUrl) {
      return res.status(400).send('Missing url query parameter');
    }

    const response = await fetch(rawUrl);
    if (!response.ok) {
      return res.status(response.status).send(`Failed to fetch file: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type') || 'application/pdf';
    res.setHeader('Content-Type', contentType);
    res.setHeader('Access-Control-Allow-Origin', '*');

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    res.send(buffer);
  } catch (err: any) {
    console.error('PDF proxy error:', err);
    res.status(500).send('Error proxying PDF: ' + err.message);
  }
});

const STRIPE_KEY_FILE = path.join(process.cwd(), '.stripe_key');

// Dynamically check Stripe configuration
function loadInitialStripeKey(): string {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY.trim();
  try {
    if (fs.existsSync(STRIPE_KEY_FILE)) {
      return fs.readFileSync(STRIPE_KEY_FILE, 'utf8').trim();
    }
  } catch (e) {
    console.warn('Could not read .stripe_key file:', e);
  }
  return '';
}

let dynamicStripeSecretKey = loadInitialStripeKey();

export function getStripeKey(): string {
  return dynamicStripeSecretKey || process.env.STRIPE_SECRET_KEY || '';
}

export function setStripeKey(key: string) {
  dynamicStripeSecretKey = key.trim();
  stripeClient = null; // Re-instantiate with new key
  try {
    fs.writeFileSync(STRIPE_KEY_FILE, dynamicStripeSecretKey, 'utf8');
  } catch (e) {
    console.warn('Could not persist .stripe_key file:', e);
  }
}

let stripeClient: Stripe | null = null;
function getStripe() {
  const key = getStripeKey();
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY is missing. Please configure it in Admin > Stripe Settings.');
  }
  if (key.startsWith('pk_')) {
    throw new Error('You provided a publishable key (' + key.substring(0, 7) + '...). A Secret Key starting with "sk_test_" or "sk_live_" is required for backend payments. Please update it in Admin > Stripe Settings.');
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, { apiVersion: '2023-10-16' as any });
  }
  return stripeClient;
}

// Endpoint to inspect Stripe status and publishable info (without leaking full secret)
app.get('/api/stripe/status', (req, res) => {
  const currentKey = getStripeKey();
  const isConfigured = Boolean(currentKey && (currentKey.startsWith('sk_') || currentKey.startsWith('rk_')));
  const keyMasked = currentKey 
    ? `${currentKey.substring(0, 7)}...${currentKey.substring(currentKey.length - 4)}` 
    : '';

  res.json({
    configured: isConfigured,
    keyMasked,
    isTest: currentKey.startsWith('sk_test_') || currentKey.startsWith('rk_test_'),
    isRestricted: currentKey.startsWith('rk_'),
  });
});

// Endpoint for admin to set or update Stripe API Secret Key
app.post('/api/stripe/config', async (req, res) => {
  try {
    const { secretKey } = req.body;
    if (!secretKey || typeof secretKey !== 'string') {
      return res.status(400).json({ error: 'Secret key is required' });
    }
    const cleanKey = secretKey.trim();
    const isValidPrefix = cleanKey.startsWith('sk_test_') || 
                          cleanKey.startsWith('sk_live_') || 
                          cleanKey.startsWith('rk_test_') || 
                          cleanKey.startsWith('rk_live_');

    if (!isValidPrefix) {
      if (cleanKey.startsWith('pk_')) {
        return res.status(400).json({ 
          error: 'You pasted a Publishable Key (pk_...). Please provide a Secret Key (sk_live_ / sk_test_) or Restricted Key (rk_live_ / rk_test_).' 
        });
      }
      return res.status(400).json({ 
        error: 'Invalid Stripe Key. Keys typically start with sk_live_, sk_test_, rk_live_, or rk_test_.' 
      });
    }

    // Verify key by doing a test call to Stripe
    const testStripe = new Stripe(cleanKey, { apiVersion: '2023-10-16' as any });
    
    // For standard secret keys (sk_), balance.retrieve works.
    // For restricted keys (rk_), balance might not be in granted permissions, so fallback to checkout.sessions.list
    try {
      await testStripe.balance.retrieve();
    } catch (balanceErr: any) {
      if (cleanKey.startsWith('rk_')) {
        // Test checkout sessions endpoint which is what this app requires
        await testStripe.checkout.sessions.list({ limit: 1 });
      } else {
        throw balanceErr;
      }
    }

    setStripeKey(cleanKey);
    return res.json({ 
      success: true, 
      message: cleanKey.startsWith('rk_') 
        ? 'Stripe Restricted Key (Live/Test) connected and verified successfully!'
        : 'Stripe API key connected and verified successfully!',
      isTest: cleanKey.startsWith('sk_test_') || cleanKey.startsWith('rk_test_'),
      isRestricted: cleanKey.startsWith('rk_')
    });
  } catch (err: any) {
    console.error('Stripe key verification failed:', err);
    return res.status(400).json({ 
      error: 'Stripe key verification failed: ' + (err.message || 'Check key and permissions.')
    });
  }
});

let supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) throw new Error('Supabase admin credentials missing');
    supabaseAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return supabaseAdmin;
}

// Persistent Purchase Log Store for Admin Visibility
const DATA_DIR = path.join(process.cwd(), 'data');
const PURCHASES_LOG_FILE = path.join(DATA_DIR, 'purchases_log.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getPurchasesLog(): any[] {
  ensureDataDir();
  try {
    if (fs.existsSync(PURCHASES_LOG_FILE)) {
      const content = fs.readFileSync(PURCHASES_LOG_FILE, 'utf-8');
      const list = JSON.parse(content);
      return Array.isArray(list) ? list.filter(item => !item.id?.startsWith('pur_seed_')) : [];
    }
  } catch (err) {
    console.error('Error reading purchases log:', err);
  }
  return [];
}

function savePurchaseToLog(record: any) {
  ensureDataDir();
  try {
    const list = getPurchasesLog();
    // Check if duplicate already exists by Stripe session ID or same user+note within 10 minutes
    const exists = list.some(item => 
      (record.stripeSessionId && item.stripeSessionId && item.stripeSessionId === record.stripeSessionId) ||
      (record.userId && record.noteId && item.userId === record.userId && item.noteId === record.noteId && Math.abs(new Date(item.createdAt).getTime() - new Date(record.createdAt).getTime()) < 600000)
    );
    if (!exists) {
      list.unshift(record);
      fs.writeFileSync(PURCHASES_LOG_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }
  } catch (err) {
    console.error('Error saving to purchases log:', err);
  }
}

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { 
      noteId, 
      title, 
      noteTitle, 
      price, 
      priceMAD, 
      currency = 'usd', 
      userId, 
      userEmail,
      moduleId 
    } = req.body;
    const stripe = getStripe();
    
    // Normalize price: priceMAD or price
    const rawPrice = Number(priceMAD ?? price ?? 0);
    const validCurrency = (currency || 'usd').toLowerCase();
    const productName = (title || noteTitle || 'MaroNotes Premium Lesson').trim() || 'MaroNotes Lesson';

    if (rawPrice <= 0) {
      return res.status(400).json({ error: 'This item is free or has invalid price' });
    }

    const origin = req.headers.origin || (req.headers.host ? `${req.protocol || 'https'}://${req.headers.host}` : 'http://localhost:3000');

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: validCurrency,
            product_data: {
              name: productName,
              description: 'MaroNotes Premium Academic Access',
            },
            unit_amount: Math.round(rawPrice * 100), // Stripe expects amount in lowest denomination (cents)
          },
          quantity: 1,
        },
      ],
      client_reference_id: userId,
      metadata: {
        noteId: String(noteId),
        moduleId: String(moduleId || ''),
        userId: String(userId || ''),
        userEmail: String(userEmail || ''),
        noteTitle: String(productName),
        price: String(rawPrice),
        currency: validCurrency
      },
      success_url: `${origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&note_id=${noteId}&module_id=${moduleId || ''}`,
      cancel_url: `${origin}/modules/${moduleId || ''}?canceled=true`,
    };

    if (userEmail && typeof userEmail === 'string' && userEmail.includes('@')) {
      sessionParams.customer_email = userEmail.trim();
    }

    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    res.status(500).json({ error: error.message || 'Failed to create checkout session' });
  }
});

app.post('/api/verify-checkout', async (req, res) => {
  try {
    const { session_id } = req.body;
    const stripe = getStripe();
    const supabase = getSupabaseAdmin();

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      const meta = (session.metadata || {}) as any;
      const noteId = meta.noteId;
      const userId = meta.userId || session.client_reference_id;
      const metaEmail = meta.userEmail || '';
      const noteTitle = meta.noteTitle || 'PDF Document';
      const moduleId = meta.moduleId || '';
      
      const customerEmail = session.customer_details?.email || session.customer_email || metaEmail || 'client@gmail.com';
      const amountPaid = session.amount_total ? (session.amount_total / 100) : Number(meta.price || 0);
      const currencyPaid = (session.currency || meta.currency || 'usd').toUpperCase();
      const currentTimestamp = new Date().toISOString();

      // 1. Record to persistent purchase log store
      savePurchaseToLog({
        id: `pur_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        userId: userId || 'anonymous',
        userEmail: customerEmail,
        noteId,
        noteTitle,
        moduleId,
        amount: amountPaid,
        currency: currencyPaid,
        paymentStatus: 'completed',
        stripeSessionId: session.id,
        createdAt: currentTimestamp
      });
      
      // 2. Insert into Supabase purchases table
      if (userId && noteId) {
        try {
          const { data: existing } = await supabase
            .from('purchases')
            .select('*')
            .eq('user_id', userId)
            .eq('note_id', noteId)
            .single();
            
          if (!existing) {
            // Try full columns insert
            let { error } = await supabase.from('purchases').insert({
              user_id: userId,
              note_id: noteId,
              payment_status: 'completed',
              user_email: customerEmail,
              note_title: noteTitle,
              amount: amountPaid,
              currency: currencyPaid,
              stripe_session_id: session.id
            });
            
            if (error) {
              // Fallback to minimal schema if extra columns don't exist
              await supabase.from('purchases').insert({
                user_id: userId,
                note_id: noteId,
                payment_status: 'completed'
              });
            }
          }
        } catch (dbErr) {
          console.warn("DB purchase insert error in verify-checkout:", dbErr);
        }
      }
      
      res.json({ 
        success: true, 
        userEmail: customerEmail, 
        noteTitle, 
        amount: amountPaid,
        currency: currencyPaid
      });
    } else {
      res.status(400).json({ success: false, message: 'Payment not completed' });
    }
  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to record client-side unlocked purchases
app.post('/api/record-purchase', async (req, res) => {
  try {
    const { 
      userId, 
      userEmail, 
      noteId, 
      noteTitle, 
      moduleId, 
      amount = 0, 
      currency = 'USD', 
      paymentStatus = 'completed',
      stripeSessionId 
    } = req.body;

    if (!noteId) {
      return res.status(400).json({ error: 'Missing noteId' });
    }

    const currentTimestamp = new Date().toISOString();
    const newRecord = {
      id: `pur_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      userId: userId || 'anonymous',
      userEmail: userEmail || 'client@gmail.com',
      noteId,
      noteTitle: noteTitle || 'Lesson PDF',
      moduleId: moduleId || '',
      amount: Number(amount || 0),
      currency: (currency || 'USD').toUpperCase(),
      paymentStatus,
      stripeSessionId: stripeSessionId || null,
      createdAt: currentTimestamp
    };

    savePurchaseToLog(newRecord);

    // Also attempt DB insert
    try {
      const supabase = getSupabaseAdmin();
      if (userId && noteId) {
        let { error } = await supabase.from('purchases').insert({
          user_id: userId,
          note_id: noteId,
          payment_status: paymentStatus,
          user_email: userEmail,
          note_title: noteTitle,
          amount: Number(amount || 0),
          currency: (currency || 'USD').toUpperCase(),
          stripe_session_id: stripeSessionId
        });
        if (error) {
          await supabase.from('purchases').insert({
            user_id: userId,
            note_id: noteId,
            payment_status: paymentStatus
          });
        }
      }
    } catch (e) {
      console.warn('DB record warning:', e);
    }

    res.json({ success: true, record: newRecord });
  } catch (err: any) {
    console.error('Record purchase error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Admin-only endpoint: Get all purchase records with client Gmail, unlocked PDF title, amount, exact date/hour/minute
app.get('/api/admin/purchases', async (req, res) => {
  try {
    const logRecords = getPurchasesLog();
    const recordsMap = new Map<string, any>();

    // Add records from file log
    for (const rec of logRecords) {
      const key = rec.stripeSessionId || `${rec.userId}_${rec.noteId}`;
      recordsMap.set(key, rec);
    }

    // Attempt to merge records from Supabase database
    try {
      const supabase = getSupabaseAdmin();
      const { data: dbPurchases, error: pErr } = await supabase
        .from('purchases')
        .select('*')
        .order('created_at', { ascending: false });

      if (!pErr && dbPurchases && dbPurchases.length > 0) {
        const { data: profiles } = await supabase.from('profiles').select('id, email');
        const profilesMap = new Map((profiles || []).map((p: any) => [p.id, p.email]));

        const { data: notes } = await supabase.from('notes').select('id, title, module_id, file_url');
        const notesMap = new Map((notes || []).map((n: any) => [n.id, n]));

        const { data: modules } = await supabase.from('modules').select('id, title, price');
        const modulesMap = new Map((modules || []).map((m: any) => [m.id, m]));

        for (const p of dbPurchases) {
          const key = p.stripe_session_id || `${p.user_id}_${p.note_id}`;
          const existing = recordsMap.get(key);

          const matchedNote: any = notesMap.get(p.note_id);
          const matchedModule: any = matchedNote?.module_id ? modulesMap.get(matchedNote.module_id) : null;
          const userEmail = p.user_email || profilesMap.get(p.user_id) || existing?.userEmail || 'client@gmail.com';
          const noteTitle = p.note_title || matchedNote?.title || existing?.noteTitle || 'PDF Document';
          const amount = p.amount !== undefined && p.amount !== null ? Number(p.amount) : (existing?.amount ?? (matchedModule?.price || 0));
          const currency = (p.currency || existing?.currency || 'USD').toUpperCase();

          recordsMap.set(key, {
            id: p.id || existing?.id || `pur_${Date.now()}`,
            userId: p.user_id,
            userEmail,
            noteId: p.note_id,
            noteTitle,
            moduleTitle: matchedModule?.title || existing?.moduleTitle || '',
            amount,
            currency,
            paymentStatus: p.payment_status || 'completed',
            stripeSessionId: p.stripe_session_id || existing?.stripeSessionId || null,
            createdAt: p.created_at || existing?.createdAt || new Date().toISOString()
          });
        }
      }
    } catch (dbErr) {
      console.warn("DB merge warning in admin purchases:", dbErr);
    }

    const allPurchases = Array.from(recordsMap.values()).map(item => {
      const d = new Date(item.createdAt);
      const year = d.getFullYear();
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const monthFullNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthShort = monthNames[d.getMonth()] || '';
      const monthFull = monthFullNames[d.getMonth()] || '';
      const day = String(d.getDate()).padStart(2, '0');
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      
      const hourNum = d.getHours();
      const hour12 = hourNum % 12 || 12;
      const ampm = hourNum >= 12 ? 'PM' : 'AM';
      const time12 = `${String(hour12).padStart(2, '0')}:${minutes} ${ampm}`;

      return {
        ...item,
        exactDate: `${monthFull} ${day}, ${year}`,
        exactDateShort: `${monthShort} ${day}, ${year}`,
        exactTime: `${hours}:${minutes}`,
        exactHour: hours,
        exactMinute: minutes,
        exactTimeAmPm: time12,
        exactFullTimestamp: `${monthFull} ${day}, ${year} at ${hours}:${minutes} (${time12})`,
        formattedAmount: item.currency === 'MAD' ? `${item.amount} MAD` : `$${Number(item.amount).toFixed(2)} ${item.currency}`,
      };
    });

    // Sort descending by date
    allPurchases.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const totalRevenue = allPurchases.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const uniqueUsers = new Set(allPurchases.map(p => p.userEmail.toLowerCase()).filter(Boolean)).size;

    res.json({
      success: true,
      purchases: allPurchases,
      totalCount: allPurchases.length,
      totalRevenue,
      uniqueUsersCount: uniqueUsers,
      lastUpdated: new Date().toISOString()
    });
  } catch (err: any) {
    console.error('Error fetching admin purchases:', err);
    res.status(500).json({ error: err.message });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
