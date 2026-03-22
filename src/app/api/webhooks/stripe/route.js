import { stripe } from '../../../lib/stripe';
import { createServiceClient } from '../../../lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function POST(req) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature');

  let event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  const supabase = createServiceClient();

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id || session.metadata?.userId;
      const plan = session.metadata?.plan || 'monthly';

      if (!userId) break;

      // Get subscription from Stripe
      const stripeSubscription = await stripe.subscriptions.retrieve(session.subscription);

      await supabase.from('subscriptions').upsert({
        user_id: userId,
        stripe_subscription_id: stripeSubscription.id,
        stripe_customer_id: session.customer,
        plan,
        status: 'active',
        amount: stripeSubscription.items.data[0]?.price?.unit_amount / 100,
        current_period_start: new Date(stripeSubscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(stripeSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'stripe_subscription_id' });
      break;
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object;
      await supabase.from('subscriptions')
        .update({
          status: sub.status === 'active' ? 'active' : sub.status,
          current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await supabase.from('subscriptions')
        .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
        .eq('stripe_subscription_id', sub.id);
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      if (invoice.subscription) {
        await supabase.from('subscriptions')
          .update({ status: 'past_due' })
          .eq('stripe_subscription_id', invoice.subscription);
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
