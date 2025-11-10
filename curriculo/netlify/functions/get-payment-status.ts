import type { Handler, HandlerEvent } from "@netlify/functions";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'GET') {
    return {
        statusCode: 405,
        headers: { 'Allow': 'GET' },
        body: 'Method Not Allowed',
    };
  }

  const paymentIntentId = event.queryStringParameters?.paymentIntentId;

  if (!paymentIntentId || typeof paymentIntentId !== 'string') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Payment Intent ID is required.' }),
    };
  }

  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);

    return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            status: paymentIntent.status,
        }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`Stripe Error retrieving payment status: ${error.message}`);
    return {
        statusCode: 500,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: error.message }),
    };
  }
};

// --- CORREÇÃO: ADICIONADO O EXPORT ---
export { handler };
