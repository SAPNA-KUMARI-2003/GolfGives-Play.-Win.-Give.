import { createClient } from '../../../lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data, error } = await supabase
    .from('user_charity_selections')
    .select('*, charities(*)')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ selection: data });
}

export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { charity_id, contribution_percentage } = await req.json();

  if (!charity_id) return NextResponse.json({ error: 'Charity ID required' }, { status: 400 });
  if (contribution_percentage < 10 || contribution_percentage > 100) {
    return NextResponse.json({ error: 'Contribution must be 10–100%' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_charity_selections')
    .upsert({
      user_id: user.id,
      charity_id,
      contribution_percentage,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    .select('*, charities(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ selection: data });
}
