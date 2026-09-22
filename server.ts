import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import Stripe from 'stripe';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON bodies
  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  // Proxy for fetching PDFs to bypass Supabase Storage CORS
  app.get('/api/proxy-pdf', async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl) return res.status(400).json({ error: 'Missing url parameter' });
      
      const response = await fetch(targetUrl);
      if (!response.ok) {
        return res.status(response.status).json({ error: 'Failed to fetch from remote' });
      }
      
      res.setHeader('Content-Type', 'application/pdf');
      
      // Node.js fetch response body is a Web Stream
      if (response.body) {
        // We can just use arrayBuffer
        const buffer = await response.arrayBuffer();
        res.send(Buffer.from(buffer));
      } else {
        res.status(500).json({ error: 'No response body' });
      }
    } catch (error: any) {
      console.error('Proxy error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Stripe Checkout Endpoint
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      const { noteId, noteTitle, price, userId, moduleId } = req.body;
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      
      if (!stripeKey) {
        return res.status(500).json({ error: 'Stripe configuration missing.' });
      }

      const stripe = new Stripe(stripeKey, {
        apiVersion: '2026-04-22.dahlia' as any,
      });

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'usd',
              product_data: {
                name: noteTitle,
              },
              unit_amount: Math.round(price * 100), // Price in cents
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        // In this App context, we'll return to the modules (courses) page, or a success page.
        success_url: `${process.env.APP_URL || 'http://localhost:3000'}/dashboard?success=true&note_id=${noteId}&module_id=${moduleId}`,
        cancel_url: `${process.env.APP_URL || 'http://localhost:3000'}/modules/${moduleId}?canceled=true`,
        client_reference_id: userId,
        metadata: {
          noteId,
          moduleId,
          userId,
        },
      });

      res.json({ id: session.id, url: session.url });
    } catch (error: any) {
      console.error('Stripe error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite integration
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

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
