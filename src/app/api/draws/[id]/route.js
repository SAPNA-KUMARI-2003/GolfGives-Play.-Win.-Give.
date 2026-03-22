import { createClient } from '../../../lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
  const supabase = createClient();
  const { id } = params;

  const { data, error } = await supabase
    .from('draws')
    .select('*, draw_entries(count)')
    .eq('id', id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json({ draw: data });
}
