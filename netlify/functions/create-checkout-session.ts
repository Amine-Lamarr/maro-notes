import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { noteId, title, noteTitle, price, priceMAD, currency = 'usd', userId, moduleId } = JSON.parse(event.body || '{}');
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      return { 
        statusCode: 500, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'STRIPE_SECRET_KEY is missing in your deployment environment variables.' }) 
      };
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any,
    });

    const rawPrice = Number(priceMAD ?? price ?? 0);
    const validCurrency = (currency || 'usd').toLowerCase();
    const productName = (title || noteTitle || 'MaroNotes Premium Course').trim() || 'MaroNotes Course Material';

    // Get origin URL
    const origin = event.headers.origin || (event.headers.host ? `https://${event.headers.host}` : (process.env.URL || 'http://localhost:3000'));

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [
        {
          price_data: {
            currency: validCurrency,
            product_data: {
              name: productName,
              description: 'MaroNotes Academic Premium Access',
            },
            unit_amount: Math.round(rawPrice * 100),
          },
          quantity: 1,
        },
      ],
      client_reference_id: userId,
      metadata: {
        noteId,
        moduleId,
        userId,
      },
      success_url: `${origin}/dashboard?success=true&session_id={CHECKOUT_SESSION_ID}&note_id=${noteId}&module_id=${moduleId}`,
      cancel_url: `${origin}/modules/${moduleId}?canceled=true`,
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (error: any) {
    console.error('Stripe error:', error);
    return { 
      statusCode: 500, 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message || 'Failed to create Stripe session' }) 
    };
  }
};
