import { createClient, createServiceClient } from '../../../lib/supabaseServer';
import { generateRandomDraw, generateAlgorithmicDraw } from '../../../lib/utils';
import { calculatePrizePools } from '../../../lib/stripe';
import { NextResponse } from 'next/server';

// Admin: simulate or publish a draw
export async function POST(req) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { action, month, year, draw_type } = await req.json();
  const serviceClient = createServiceClient();

  if (action === 'simulate') {
    // Get all active user scores
    const { data: activeSubs } = await serviceClient
      .from('subscriptions')
      .select('user_id')
      .eq('status', 'active');

    const activeUserIds = (activeSubs || []).map(s => s.user_id);

    const { data: scores } = await serviceClient
      .from('scores')
      .select('user_id, score')
      .in('user_id', activeUserIds);

    const allScoreVals = (scores || []).map(s => s.score);
    const numbers = draw_type === 'algorithmic'
      ? generateAlgorithmicDraw(allScoreVals)
      : generateRandomDraw();

    // Count subscriber pool
    const { data: activeSubs2 } = await serviceClient
      .from('subscriptions')
      .select('amount')
      .eq('status', 'active');

    const totalPool = (activeSubs2 || []).reduce((s, sub) => s + sub.amount * 0.499, 0);
    const pools = calculatePrizePools(totalPool, 0);

    // Count matches
    const userScoreMap = {};
    (scores || []).forEach(s => {
      if (!userScoreMap[s.user_id]) userScoreMap[s.user_id] = [];
      userScoreMap[s.user_id].push(s.score);
    });

    let five = 0, four = 0, three = 0;
    Object.values(userScoreMap).forEach(userScores => {
      const count = userScores.filter(s => numbers.includes(s)).length;
      if (count === 5) five++;
      else if (count === 4) four++;
      else if (count === 3) three++;
    });

    return NextResponse.json({
      numbers,
      totalPool,
      pools,
      fiveMatches: five,
      fourMatches: four,
      threeMatches: three,
      participantCount: activeUserIds.length,
    });
  }

  return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
}
