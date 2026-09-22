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

let stripeClient: Stripe | null = null;
function getStripe() {
  if (!stripeClient) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) throw new Error('STRIPE_SECRET_KEY is missing');
    stripeClient = new Stripe(key, { apiVersion: '2023-10-16' as any });
  }
  return stripeClient;
}

let supabaseAdmin: any = null;
function getSupabaseAdmin() {
  if (!supabaseAdmin) {
    const url = process.env.VITE_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Supabase admin credentials missing');
    supabaseAdmin = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
  }
  return supabaseAdmin;
}

app.post('/api/create-checkout-session', async (req, res) => {
  try {
    const { noteId, title, priceMAD, userId, moduleId } = req.body;
    const stripe = getStripe();
    
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: 'mad',
            product_data: {
              name: title,
              description: 'MaroNotes Premium Module Access',
            },
            unit_amount: priceMAD * 100, // Stripe expects amount in cents
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
      success_url: `${req.headers.origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&note_id=${noteId}&module_id=${moduleId}`,
      cancel_url: `${req.headers.origin}/modules/${moduleId}/viewer?note=${noteId}&canceled=true`,
    });

    res.json({ url: session.url });
  } catch (error: any) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: error.message });
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
