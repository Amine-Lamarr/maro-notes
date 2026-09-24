import { Handler } from '@netlify/functions';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { session_id } = JSON.parse(event.body || '{}');
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return { 
        statusCode: 500, 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'STRIPE_SECRET_KEY missing' }) 
      };
    }

    const stripe = new Stripe(stripeKey, { apiVersion: '2023-10-16' as any });
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status === 'paid') {
      const { noteId, userId } = session.metadata as any;

      const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
      if (url && key) {
        const supabase = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
        
        const { data: existing } = await supabase
          .from('purchases')
          .select('*')
          .eq('user_id', userId)
          .eq('note_id', noteId)
          .single();

        if (!existing) {
          await supabase.from('purchases').insert({
            user_id: userId,
            note_id: noteId
          });
        }
      }

      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: true }),
      };
    } else {
      return {
        statusCode: 400,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ success: false, message: 'Payment not completed' }),
      };
    }
  } catch (error: any) {
    console.error('Verify error:', error);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message }),
    };
  }
};
