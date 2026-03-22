'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabaseServer';
import toast from 'react-hot-toast';
import {
  Users, Trophy, Heart, BarChart2, Settings, Play, Eye,
  CheckCircle, XCircle, DollarSign, RefreshCw, Zap,
  Plus, Trash2, Edit3, Shield, ChevronDown, ChevronUp,
  TrendingUp, Calendar
} from 'lucide-react';
import { formatCurrency, formatDate, generateRandomDraw, generateAlgorithmicDraw, calculatePrizePools } from '@/lib/utils';
import Navbar from '@/components/Navbar';

export default function AdminPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  // Data
  const [users, setUsers] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [draws, setDraws] = useState([]);
  const [winners, setWinners] = useState([]);
  const [charities, setCharities] = useState([]);
  const [stats, setStats] = useState({});

  // Draw form
  const [drawForm, setDrawForm] = useState({ month: new Date().getMonth() + 1, year: new Date().getFullYear(), type: 'random' });
  const [simResult, setSimResult] = useState(null);
  const [simRunning, setSimRunning] = useState(false);

  // Charity form
  const [charityForm, setCharityForm] = useState({ name: '', description: '', long_description: '', category: '', website_url: '', image_url: '', is_featured: false });
  const [editingCharity, setEditingCharity] = useState(null);

  const loadData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);

    const { data: prof } = await supabase.from('profiles').select('*').eq('id', u.id).single();
    if (!prof?.is_admin) { router.push('/dashboard'); return; }
    setIsAdmin(true);

    const [
      { data: allProfiles },
      { data: allSubs },
      { data: allDraws },
      { data: allWinners },
      { data: allCharities },
    ] = await Promise.all([
      supabase.from('profiles').select('*, subscriptions(plan, status, amount)').order('created_at', { ascending: false }),
      supabase.from('subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('draws').select('*').order('draw_year', { ascending: false }).order('draw_month', { ascending: false }),
      supabase.from('winners').select('*, profiles(full_name, email), draws(draw_month, draw_year)').order('created_at', { ascending: false }),
      supabase.from('charities').select('*').order('name'),
    ]);

    setUsers(allProfiles || []);
    setSubscriptions(allSubs || []);
    setDraws(allDraws || []);
    setWinners(allWinners || []);
    setCharities(allCharities || []);

    const activeCount = (allSubs || []).filter(s => s.status === 'active').length;
    const totalPool = (allSubs || []).filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount * 0.499, 0);
    const totalCharity = (allSubs || []).filter(s => s.status === 'active').reduce((sum, s) => sum + s.amount * 0.1, 0);

    setStats({
      totalUsers: (allProfiles || []).length,
      activeSubscribers: activeCount,
      totalPrizePool: totalPool,
      totalCharity,
      pendingWinners: (allWinners || []).filter(w => w.payment_status === 'pending' && w.proof_url).length,
    });

    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  // Simulate draw
  const runSimulation = async () => {
    setSimRunning(true);
    try {
      // Fetch all active user scores for algorithmic draw
      const { data: allScores } = await supabase
        .from('scores')
        .select('score, user_id')
        .in('user_id',
          subscriptions.filter(s => s.status === 'active').map(s => s.user_id)
        );

      const allScoreVals = (allScores || []).map(s => s.score);
      const numbers = drawForm.type === 'algorithmic'
        ? generateAlgorithmicDraw(allScoreVals)
        : generateRandomDraw();

      // Count active subscribers with scores
      const { data: activeScores } = await supabase
        .from('scores')
        .select('user_id, score');

      const userScoreMap = {};
      (activeScores || []).forEach(s => {
        if (!userScoreMap[s.user_id]) userScoreMap[s.user_id] = [];
        userScoreMap[s.user_id].push(s.score);
      });

      const totalPool = stats.totalPrizePool || 0;
      const pools = calculatePrizePools(totalPool, 0);

      let fiveMatches = 0, fourMatches = 0, threeMatches = 0;
      Object.values(userScoreMap).forEach(scores => {
        const matches = scores.filter(s => numbers.includes(s)).length;
        if (matches === 5) fiveMatches++;
        else if (matches === 4) fourMatches++;
        else if (matches === 3) threeMatches++;
      });

      setSimResult({
        numbers,
        totalPool,
        pools,
        fiveMatches,
        fourMatches,
        threeMatches,
        perWinner5: fiveMatches > 0 ? pools.fiveMatch / fiveMatches : 0,
        perWinner4: fourMatches > 0 ? pools.fourMatch / fourMatches : 0,
        perWinner3: threeMatches > 0 ? pools.threeMatch / threeMatches : 0,
      });
    } catch (e) {
      toast.error('Simulation failed');
    }
    setSimRunning(false);
  };

  // Publish draw
  const publishDraw = async () => {
    if (!simResult) { toast.error('Run a simulation first'); return; }
    if (!confirm(`Publish draw for ${drawForm.month}/${drawForm.year}? This cannot be undone.`)) return;

    const { data: draw, error } = await supabase.from('draws').upsert({
      draw_month: drawForm.month,
      draw_year: drawForm.year,
      draw_type: drawForm.type,
      status: 'published',
      winning_numbers: simResult.numbers,
      total_pool: simResult.totalPool,
      prize_pool_5match: simResult.pools.fiveMatch,
      prize_pool_4match: simResult.pools.fourMatch,
      prize_pool_3match: simResult.pools.threeMatch,
      participant_count: stats.activeSubscribers,
      published_at: new Date().toISOString(),
    }, { onConflict: 'draw_month,draw_year' }).select().single();

    if (error) { toast.error(error.message); return; }

    // Create winner records
    if (draw) {
      const { data: allScores } = await supabase.from('scores').select('user_id, score');
      const userScoreMap = {};
      (allScores || []).forEach(s => {
        if (!userScoreMap[s.user_id]) userScoreMap[s.user_id] = [];
        userScoreMap[s.user_id].push(s.score);
      });

      const winnerInserts = [];
      Object.entries(userScoreMap).forEach(([userId, scores]) => {
        const matches = scores.filter(s => simResult.numbers.includes(s)).length;
        if (matches >= 3) {
          const prizePool = matches === 5 ? simResult.pools.fiveMatch : matches === 4 ? simResult.pools.fourMatch : simResult.pools.threeMatch;
          const winners = matches === 5 ? simResult.fiveMatches : matches === 4 ? simResult.fourMatches : simResult.threeMatches;
          winnerInserts.push({
            draw_id: draw.id,
            user_id: userId,
            match_type: matches,
            prize_amount: winners > 0 ? prizePool / winners : 0,
            payment_status: 'pending',
          });
        }
      });

      if (winnerInserts.length > 0) {
        await supabase.from('winners').insert(winnerInserts);
      }
    }

    toast.success('Draw published successfully!');
    setSimResult(null);
    await loadData();
  };

  // Winner status update
  const updateWinnerStatus = async (id, status) => {
    const updates = { payment_status: status };
    if (status === 'verified') updates.verified_at = new Date().toISOString();
    if (status === 'paid') updates.paid_at = new Date().toISOString();

    const { error } = await supabase.from('winners').update(updates).eq('id', id);
    if (error) { toast.error(error.message); } else {
      toast.success(`Winner marked as ${status}`);
      await loadData();
    }
  };

  // Save charity
  const saveCharity = async () => {
    if (!charityForm.name) { toast.error('Name required'); return; }

    if (editingCharity) {
      const { error } = await supabase.from('charities').update({ ...charityForm, updated_at: new Date().toISOString() }).eq('id', editingCharity);
      if (error) { toast.error(error.message); } else { toast.success('Charity updated'); }
    } else {
      const { error } = await supabase.from('charities').insert(charityForm);
      if (error) { toast.error(error.message); } else { toast.success('Charity added'); }
    }

    setCharityForm({ name: '', description: '', long_description: '', category: '', website_url: '', image_url: '', is_featured: false });
    setEditingCharity(null);
    await loadData();
  };

  const deleteCharity = async (id) => {
    if (!confirm('Delete this charity?')) return;
    await supabase.from('charities').delete().eq('id', id);
    toast.success('Charity deleted');
    await loadData();
  };

  const editCharity = (c) => {
    setEditingCharity(c.id);
    setCharityForm({ name: c.name, description: c.description || '', long_description: c.long_description || '', category: c.category || '', website_url: c.website_url || '', image_url: c.image_url || '', is_featured: c.is_featured });
    setTab('charities');
  };

  // Toggle admin
  const toggleAdmin = async (userId, current) => {
    await supabase.from('profiles').update({ is_admin: !current }).eq('id', userId);
    toast.success(`User ${!current ? 'made admin' : 'removed from admin'}`);
    await loadData();
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-10 h-10 border-2 border-[#16C784]/30 border-t-[#16C784] rounded-full animate-spin" />
    </div>
  );

  if (!isAdmin) return null;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart2 },
    { key: 'users', label: 'Users', icon: Users },
    { key: 'draws', label: 'Draw Engine', icon: Zap },
    { key: 'winners', label: 'Winners', icon: Trophy },
    { key: 'charities', label: 'Charities', icon: Heart },
  ];

  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  return (
    <>
      <Navbar user={user} />
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#F0B429]/20 border border-[#F0B429]/30 flex items-center justify-center">
              <Shield size={18} className="text-[#F0B429]" />
            </div>
            <div>
              <h1 className="font-display text-4xl text-white tracking-wide">ADMIN PANEL</h1>
              <p className="text-white/30 text-sm">GolfGives management console</p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto mb-8 pb-1">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${tab === t.key ? 'bg-[#F0B429]/15 text-[#F0B429] border border-[#F0B429]/30' : 'text-white/40 hover:text-white/70 hover:bg-white/[0.04]'}`}>
                <t.icon size={14} /> {t.label}
                {t.key === 'winners' && stats.pendingWinners > 0 && (
                  <span className="bg-red-500 text-white text-[10px] w-4 h-4 rounded-full flex items-center justify-center">{stats.pendingWinners}</span>
                )}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Total Users', value: stats.totalUsers || 0, icon: Users, color: '#16C784' },
                  { label: 'Active Subscribers', value: stats.activeSubscribers || 0, icon: CheckCircle, color: '#16C784' },
                  { label: 'Total Prize Pool', value: formatCurrency(stats.totalPrizePool || 0), icon: Trophy, color: '#F0B429' },
                  { label: 'Charity This Month', value: formatCurrency(stats.totalCharity || 0), icon: Heart, color: '#a78bfa' },
                  { label: 'Pending Reviews', value: stats.pendingWinners || 0, icon: Eye, color: stats.pendingWinners > 0 ? '#ef4444' : '#16C784' },
                ].map(card => (
                  <div key={card.label} className="card p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-white/40 text-xs">{card.label}</span>
                      <card.icon size={14} style={{ color: card.color }} />
                    </div>
                    <div className="font-display text-2xl text-white tracking-wide">{card.value}</div>
                  </div>
                ))}
              </div>

              {/* Recent activity summary */}
              <div className="grid md:grid-cols-2 gap-6">
                <div className="card p-6">
                  <h3 className="font-semibold text-white mb-4">Recent Draws</h3>
                  {draws.slice(0,4).length === 0 ? <p className="text-white/30 text-sm">No draws yet</p> : (
                    <div className="space-y-3">
                      {draws.slice(0,4).map(d => (
                        <div key={d.id} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                          <span className="text-white/70 text-sm">{monthNames[d.draw_month-1]} {d.draw_year}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === 'published' ? 'bg-[#16C784]/15 text-[#16C784]' : 'bg-white/[0.06] text-white/40'}`}>{d.status}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="card p-6">
                  <h3 className="font-semibold text-white mb-4">Prize Pool Breakdown</h3>
                  {[
                    { label: 'Jackpot (5-match)', share: '40%', pool: formatCurrency((stats.totalPrizePool || 0) * 0.4) },
                    { label: '4-Match Pool', share: '35%', pool: formatCurrency((stats.totalPrizePool || 0) * 0.35) },
                    { label: '3-Match Pool', share: '25%', pool: formatCurrency((stats.totalPrizePool || 0) * 0.25) },
                  ].map(tier => (
                    <div key={tier.label} className="flex items-center justify-between py-2 border-b border-white/[0.04] last:border-0">
                      <span className="text-white/60 text-sm">{tier.label}</span>
                      <div className="text-right">
                        <div className="text-white text-sm font-medium">{tier.pool}</div>
                        <div className="text-white/30 text-xs">{tier.share} of pool</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── USERS ── */}
          {tab === 'users' && (
            <div className="space-y-4">
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                  <h3 className="font-semibold text-white">All Users ({users.length})</h3>
                  <span className="text-white/30 text-xs">{stats.activeSubscribers} active subscribers</span>
                </div>
                <div className="divide-y divide-white/[0.04]">
                  {users.map(u => {
                    const sub = u.subscriptions?.[0];
                    return (
                      <div key={u.id} className="p-4 flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-[#16C784]/15 border border-[#16C784]/25 flex items-center justify-center flex-shrink-0">
                            <span className="text-[#16C784] text-xs font-bold">{(u.full_name || u.email || '?')[0].toUpperCase()}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-white text-sm font-medium truncate">{u.full_name || '—'}</p>
                            <p className="text-white/30 text-xs truncate">{u.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          {sub && (
                            <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${sub.status === 'active' ? 'bg-[#16C784]/15 text-[#16C784]' : 'bg-white/[0.06] text-white/40'}`}>
                              {sub.plan} · {sub.status}
                            </span>
                          )}
                          {u.is_admin && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-[#F0B429]/15 text-[#F0B429] border border-[#F0B429]/25">Admin</span>
                          )}
                          <button onClick={() => toggleAdmin(u.id, u.is_admin)} className="text-white/20 hover:text-[#F0B429] transition-colors" title={u.is_admin ? 'Remove admin' : 'Make admin'}>
                            <Shield size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── DRAW ENGINE ── */}
          {tab === 'draws' && (
            <div className="space-y-6">
              {/* Config */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-5">Configure Draw</h3>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div>
                    <label className="label">Month</label>
                    <select value={drawForm.month} onChange={e => setDrawForm(p => ({ ...p, month: Number(e.target.value) }))} className="input-field">
                      {monthNames.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Year</label>
                    <select value={drawForm.year} onChange={e => setDrawForm(p => ({ ...p, year: Number(e.target.value) }))} className="input-field">
                      {[2025,2026,2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="label">Draw Type</label>
                    <select value={drawForm.type} onChange={e => setDrawForm(p => ({ ...p, type: e.target.value }))} className="input-field">
                      <option value="random">Random (Lottery-style)</option>
                      <option value="algorithmic">Algorithmic (Score-weighted)</option>
                    </select>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-white/[0.03] border border-white/[0.06]">
                  <p className="text-white/50 text-xs">
                    {drawForm.type === 'random'
                      ? '⚡ Random: 5 numbers (1–45) selected with equal probability — standard lottery style.'
                      : '🧠 Algorithmic: Numbers weighted by frequency of user scores. Popular scores have higher probability of being drawn.'}
                  </p>
                </div>

                <div className="flex gap-3 mt-5">
                  <button onClick={runSimulation} disabled={simRunning} className="btn-secondary flex items-center gap-2 disabled:opacity-50">
                    <Play size={14} /> {simRunning ? 'Simulating...' : 'Run Simulation'}
                  </button>
                  {simResult && (
                    <button onClick={publishDraw} className="btn-gold flex items-center gap-2">
                      <Zap size={14} /> Publish Draw
                    </button>
                  )}
                </div>
              </div>

              {/* Simulation Result */}
              {simResult && (
                <div className="card border-[#F0B429]/30 p-6">
                  <div className="flex items-center gap-2 mb-5">
                    <div className="w-6 h-6 rounded-full bg-[#F0B429]/20 flex items-center justify-center">
                      <Eye size={12} className="text-[#F0B429]" />
                    </div>
                    <h3 className="font-semibold text-[#F0B429]">Simulation Preview — Not Published</h3>
                  </div>

                  <div className="mb-5">
                    <p className="text-white/40 text-xs mb-2">Drawn numbers:</p>
                    <div className="flex gap-2">
                      {simResult.numbers.map((n, i) => (
                        <div key={i} className="number-ball bg-[#F0B429]/20 border-[#F0B429]/50 text-[#F0B429]">{n}</div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-5">
                    {[
                      { label: '5 Matches', count: simResult.fiveMatches, prize: simResult.perWinner5, color: '#F0B429' },
                      { label: '4 Matches', count: simResult.fourMatches, prize: simResult.perWinner4, color: '#16C784' },
                      { label: '3 Matches', count: simResult.threeMatches, prize: simResult.perWinner3, color: '#a78bfa' },
                    ].map(tier => (
                      <div key={tier.label} className="bg-white/[0.03] rounded-xl p-4">
                        <p className="text-white/40 text-xs">{tier.label}</p>
                        <p className="font-display text-2xl" style={{ color: tier.color }}>{tier.count}</p>
                        <p className="text-white/30 text-xs">winners</p>
                        <p className="text-white/60 text-sm font-medium mt-1">{formatCurrency(tier.prize)} each</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                    <span className="text-amber-300/70 text-xs">
                      {simResult.fiveMatches === 0 ? '⚠ No jackpot winner — 40% pool will roll over to next month.' : `✓ Jackpot winner(s) found.`}
                    </span>
                  </div>
                </div>
              )}

              {/* Published draws */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Published Draws</h3>
                {draws.filter(d => d.status === 'published').length === 0 ? (
                  <p className="text-white/30 text-sm">No published draws yet.</p>
                ) : (
                  <div className="space-y-3">
                    {draws.filter(d => d.status === 'published').map(d => (
                      <div key={d.id} className="flex items-center justify-between p-4 bg-white/[0.02] rounded-xl">
                        <div>
                          <p className="text-white font-medium text-sm">{monthNames[d.draw_month-1]} {d.draw_year}</p>
                          <p className="text-white/30 text-xs">{d.participant_count} participants · {d.draw_type}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[#F0B429] text-sm font-medium">{formatCurrency(d.total_pool || 0)}</p>
                          <p className="text-white/30 text-xs">total pool</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── WINNERS ── */}
          {tab === 'winners' && (
            <div className="space-y-4">
              {winners.length === 0 ? (
                <div className="card p-8 text-center">
                  <Trophy size={32} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/30">No winners yet</p>
                </div>
              ) : (
                winners.map(w => (
                  <div key={w.id} className="card p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-white font-medium">{w.profiles?.full_name || 'Unknown'}</p>
                        <p className="text-white/40 text-sm">{w.profiles?.email}</p>
                        <p className="text-white/30 text-xs mt-1">
                          {w.draws ? `${monthNames[w.draws.draw_month-1]} ${w.draws.draw_year}` : ''} · {w.match_type}-match · {formatCurrency(w.prize_amount)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-medium capitalize ${
                          w.payment_status === 'paid' ? 'bg-[#16C784]/15 text-[#16C784] border border-[#16C784]/25' :
                          w.payment_status === 'rejected' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                          w.payment_status === 'verified' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                          'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                        }`}>
                          {w.payment_status}
                        </span>
                      </div>
                    </div>

                    {w.proof_url && (
                      <a href={w.proof_url} target="_blank" rel="noopener noreferrer" className="mt-3 text-[#16C784]/70 text-xs hover:text-[#16C784] inline-flex items-center gap-1">
                        <Eye size={12} /> View proof document
                      </a>
                    )}

                    {w.payment_status === 'pending' && (
                      <div className="mt-4 flex gap-2 flex-wrap">
                        {w.proof_url ? (
                          <>
                            <button onClick={() => updateWinnerStatus(w.id, 'verified')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#16C784]/15 text-[#16C784] border border-[#16C784]/25 text-xs hover:bg-[#16C784]/25 transition-all">
                              <CheckCircle size={12} /> Approve
                            </button>
                            <button onClick={() => updateWinnerStatus(w.id, 'rejected')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/15 text-red-400 border border-red-500/25 text-xs hover:bg-red-500/25 transition-all">
                              <XCircle size={12} /> Reject
                            </button>
                          </>
                        ) : (
                          <p className="text-amber-400/60 text-xs">Awaiting proof upload from winner</p>
                        )}
                      </div>
                    )}
                    {w.payment_status === 'verified' && (
                      <button onClick={() => updateWinnerStatus(w.id, 'paid')} className="mt-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F0B429]/15 text-[#F0B429] border border-[#F0B429]/25 text-xs hover:bg-[#F0B429]/25 transition-all">
                        <DollarSign size={12} /> Mark as Paid
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── CHARITIES ── */}
          {tab === 'charities' && (
            <div className="space-y-6">
              {/* Form */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">{editingCharity ? 'Edit Charity' : 'Add New Charity'}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="label">Charity Name *</label>
                    <input value={charityForm.name} onChange={e => setCharityForm(p => ({...p, name: e.target.value}))} placeholder="e.g. Macmillan Cancer Support" className="input-field" />
                  </div>
                  <div>
                    <label className="label">Short Description</label>
                    <input value={charityForm.description} onChange={e => setCharityForm(p => ({...p, description: e.target.value}))} placeholder="One sentence summary" className="input-field" />
                  </div>
                  <div>
                    <label className="label">Category</label>
                    <input value={charityForm.category} onChange={e => setCharityForm(p => ({...p, category: e.target.value}))} placeholder="Health, Children, Animals..." className="input-field" />
                  </div>
                  <div>
                    <label className="label">Image URL</label>
                    <input value={charityForm.image_url} onChange={e => setCharityForm(p => ({...p, image_url: e.target.value}))} placeholder="https://..." className="input-field" />
                  </div>
                  <div>
                    <label className="label">Website URL</label>
                    <input value={charityForm.website_url} onChange={e => setCharityForm(p => ({...p, website_url: e.target.value}))} placeholder="https://..." className="input-field" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="label">Full Description</label>
                    <textarea value={charityForm.long_description} onChange={e => setCharityForm(p => ({...p, long_description: e.target.value}))} placeholder="Detailed description..." rows={3} className="input-field resize-none" />
                  </div>
                  <div className="sm:col-span-2 flex items-center gap-2">
                    <input type="checkbox" id="featured" checked={charityForm.is_featured} onChange={e => setCharityForm(p => ({...p, is_featured: e.target.checked}))} className="accent-[#16C784]" />
                    <label htmlFor="featured" className="text-white/60 text-sm cursor-pointer">Feature on homepage</label>
                  </div>
                </div>
                <div className="flex gap-3 mt-4">
                  <button onClick={saveCharity} className="btn-primary flex items-center gap-2">
                    {editingCharity ? <><Edit3 size={14} /> Update</> : <><Plus size={14} /> Add Charity</>}
                  </button>
                  {editingCharity && (
                    <button onClick={() => { setEditingCharity(null); setCharityForm({ name:'',description:'',long_description:'',category:'',website_url:'',image_url:'',is_featured:false }); }} className="btn-secondary">Cancel</button>
                  )}
                </div>
              </div>

              {/* List */}
              <div className="card overflow-hidden">
                <div className="p-4 border-b border-white/[0.06]">
                  <h3 className="font-semibold text-white">All Charities ({charities.length})</h3>
                </div>
                {charities.map(c => (
                  <div key={c.id} className="p-4 flex items-center justify-between gap-4 border-b border-white/[0.04] last:border-0">
                    <div className="flex items-center gap-3 min-w-0">
                      {c.image_url && <img src={c.image_url} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-white text-sm font-medium truncate">{c.name}</p>
                          {c.is_featured && <span className="text-[#F0B429] text-[10px] bg-[#F0B429]/10 px-1.5 py-0.5 rounded-full flex-shrink-0">Featured</span>}
                        </div>
                        <p className="text-white/30 text-xs truncate">{c.category} · {c.description?.slice(0,60)}...</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button onClick={() => editCharity(c)} className="text-white/30 hover:text-[#16C784] transition-colors">
                        <Edit3 size={14} />
                      </button>
                      <button onClick={() => deleteCharity(c.id)} className="text-white/30 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
