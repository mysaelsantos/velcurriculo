import type { Handler, HandlerEvent } from "@netlify/functions";
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20',
});

const handler: Handler = async (event: HandlerEvent) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: { 'Allow': 'POST' },
      body: 'Method Not Allowed',
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const { isDiscounted } = body;
    const amount = isDiscounted ? 250 : 500; // R$2,50 for discount, R$5,00 standard

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amount,
      currency: 'brl',
      payment_method_types: ['pix'],
    });

    if (!paymentIntent.client_secret || !paymentIntent.next_action?.pix_display_qr_code) {
        throw new Error('Não foi possível gerar os dados do pagamento Pix.');
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        paymentIntentId: paymentIntent.id,
        clientSecret: paymentIntent.client_secret,
        qrCodeUrl: paymentIntent.next_action.pix_display_qr_code.data_url,
        copyPasteCode: paymentIntent.next_action.pix_display_qr_code.copy_and_paste_data,
      }),
    };

  } catch (err) {
    const error = err as Error;
    console.error(`Stripe Error creating Pix payment: ${error.message}`);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: error.message }),
    };
  }
};

export { handler };
