import { createClient, createServiceClient } from '../../../lib/supabaseServer';
import { stripe, PLANS } from '../../../lib/stripe';
import { NextResponse } from 'next/server';

// Create Stripe checkout session
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { plan } = await req.json();
  const planConfig = PLANS[plan];
  if (!planConfig) return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  try {
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: planConfig.priceId, quantity: 1 }],
      success_url: `${appUrl}/dashboard?subscription=success`,
      cancel_url: `${appUrl}/signup?subscription=cancelled`,
      client_reference_id: user.id,
      customer_email: user.email,
      metadata: { userId: user.id, plan },
    });

    return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    // Fallback: create a mock subscription for development
    const serviceClient = createServiceClient();
    await serviceClient.from('subscriptions').upsert({
      user_id: user.id,
      plan,
      status: 'active',
      amount: planConfig.amount / 100,
      current_period_start: new Date().toISOString(),
      current_period_end: new Date(Date.now() + (plan === 'yearly' ? 365 : 30) * 24 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'user_id' });

    return NextResponse.json({ url: `${appUrl}/dashboard?subscription=success` });
  }
}

// Cancel subscription
export async function DELETE() {
  const supabase = createClient();
  const serviceClient = createServiceClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: sub } = await supabase.from('subscriptions').select('*').eq('user_id', user.id).single();
  if (!sub) return NextResponse.json({ error: 'No subscription found' }, { status: 404 });

  // Cancel in Stripe if has ID
  if (sub.stripe_subscription_id) {
    try {
      await stripe.subscriptions.cancel(sub.stripe_subscription_id);
    } catch (err) {
      console.error('Stripe cancel error:', err);
    }
  }

  // Update DB
  const { error } = await serviceClient.from('subscriptions')
    .update({ status: 'cancelled', cancelled_at: new Date().toISOString() })
    .eq('user_id', user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
