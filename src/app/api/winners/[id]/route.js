import { createClient, createServiceClient } from '../../../../lib/supabaseServer';
import { NextResponse } from 'next/server';

// Update winner status (admin) or upload proof (user)
export async function PATCH(req, { params }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = params;
  const body = await req.json();

  // Check if admin
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();

  if (profile?.is_admin) {
    // Admin can update payment_status and notes
    const serviceClient = createServiceClient();
    const updates = {};
    if (body.payment_status) updates.payment_status = body.payment_status;
    if (body.admin_notes) updates.admin_notes = body.admin_notes;
    if (body.payment_status === 'verified') updates.verified_at = new Date().toISOString();
    if (body.payment_status === 'paid') updates.paid_at = new Date().toISOString();

    const { data, error } = await serviceClient.from('winners').update(updates).eq('id', id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ winner: data });
  } else {
    // User can only update their own proof_url
    const { data: winner } = await supabase.from('winners').select('user_id').eq('id', id).single();
    if (winner?.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { data, error } = await supabase
      .from('winners')
      .update({ proof_url: body.proof_url })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ winner: data });
  }
}
