import { Handler } from '@netlify/functions';
import Stripe from 'stripe';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { noteId, noteTitle, price, userId, moduleId } = JSON.parse(event.body || '{}');
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    
    if (!stripeKey) {
      return { statusCode: 500, body: JSON.stringify({ error: 'Stripe configuration missing.' }) };
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: '2023-10-16' as any, // Using a stable API version type
    });

    // App URL where we return
    const APP_URL = process.env.URL || 'http://localhost:3000'; // Netlify sets URL environment variable

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
      success_url: `${APP_URL}/dashboard?success=true&note_id=${noteId}&module_id=${moduleId}`,
      cancel_url: `${APP_URL}/modules/${moduleId}?canceled=true`,
      client_reference_id: userId,
      metadata: {
        noteId,
        moduleId,
        userId,
      },
    });

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: session.id, url: session.url }),
    };
  } catch (error: any) {
    console.error('Stripe error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};
