import express from 'express';
import cors from 'cors';
import Stripe from 'stripe';
import path from 'path';
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

// Dynamically check Stripe configuration
let dynamicStripeSecretKey = process.env.STRIPE_SECRET_KEY || '';

export function getStripeKey(): string {
  return dynamicStripeSecretKey || process.env.STRIPE_SECRET_KEY || '';
}

export function setStripeKey(key: string) {
  dynamicStripeSecretKey = key.trim();
  stripeClient = null; // Re-instantiate with new key
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
  const isConfigured = Boolean(currentKey && currentKey.startsWith('sk_'));
  const keyMasked = currentKey 
    ? `${currentKey.substring(0, 7)}...${currentKey.substring(currentKey.length - 4)}` 
    : '';

  res.json({
    configured: isConfigured,
    keyMasked,
    isTest: currentKey.startsWith('sk_test_'),
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
    if (!cleanKey.startsWith('sk_test_') && !cleanKey.startsWith('sk_live_')) {
      return res.status(400).json({ error: 'Invalid Stripe Secret Key. Keys typically start with sk_test_ or sk_live_.' });
    }

    // Verify key by doing a test call to Stripe
    const testStripe = new Stripe(cleanKey, { apiVersion: '2023-10-16' as any });
    await testStripe.balance.retrieve();

    setStripeKey(cleanKey);
    return res.json({ 
      success: true, 
      message: 'Stripe API key connected and verified successfully!',
      isTest: cleanKey.startsWith('sk_test_')
    });
  } catch (err: any) {
    console.error('Stripe key verification failed:', err);
    return res.status(400).json({ 
      error: 'Invalid Stripe Secret Key: ' + (err.message || 'Verification failed')
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

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { noteId, title, noteTitle, price, priceMAD, currency = 'usd', userId, moduleId } = req.body;
    const stripe = getStripe();
    
    // Normalize price: priceMAD or price
    const rawPrice = Number(priceMAD ?? price ?? 0);
    const validCurrency = (currency || 'usd').toLowerCase();
    const productName = (title || noteTitle || 'MaroNotes Premium Lesson').trim() || 'MaroNotes Lesson';

    if (rawPrice <= 0) {
      return res.status(400).json({ error: 'This item is free or has invalid price' });
    }

    const origin = req.headers.origin || (req.headers.host ? `${req.protocol || 'https'}://${req.headers.host}` : 'http://localhost:3000');

    const session = await stripe.checkout.sessions.create({
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
        noteId,
        moduleId,
        userId
      },
      success_url: `${origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&note_id=${noteId}&module_id=${moduleId}`,
      cancel_url: `${origin}/modules/${moduleId}?canceled=true`,
    });

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
      const { noteId, userId } = session.metadata as any;
      
      // Check if already purchased
      const { data: existing } = await supabase
        .from('purchases')
        .select('*')
        .eq('user_id', userId)
        .eq('note_id', noteId)
        .single();
        
      if (!existing) {
        // Grant access
        const { error } = await supabase.from('purchases').insert({
          user_id: userId,
          note_id: noteId
        });
        
        if (error) {
           console.error("Purchase insert error:", error);
           return res.status(500).json({ error: 'Failed to record purchase' });
        }
      }
      
      res.json({ success: true });
    } else {
      res.status(400).json({ success: false, message: 'Payment not completed' });
    }
  } catch (error: any) {
    console.error('Verify error:', error);
    res.status(500).json({ error: error.message });
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
