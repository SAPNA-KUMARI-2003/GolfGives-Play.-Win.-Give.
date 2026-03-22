'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import toast from 'react-hot-toast';
import Link from 'next/link';
import {
  Trophy, Heart, TrendingUp, Calendar, CreditCard,
  Plus, Trash2, Upload, CheckCircle, XCircle, Clock,
  ChevronRight, LogOut, Settings, AlertCircle, BarChart2
} from 'lucide-react';
import { formatCurrency, formatDate, getMatchLabel } from '../../lib/utils';
import Navbar from '../../components/Navbar';

export default function DashboardPage() {
  const supabase = createClient();
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [scores, setScores] = useState([]);
  const [charities, setCharities] = useState([]);
  const [myCharity, setMyCharity] = useState(null);
  const [winnings, setWinnings] = useState([]);
  const [draws, setDraws] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Score form
  const [scoreVal, setScoreVal] = useState('');
  const [scoreDate, setScoreDate] = useState(new Date().toISOString().split('T')[0]);
  const [addingScore, setAddingScore] = useState(false);

  // Charity contribution
  const [contribPct, setContribPct] = useState(10);
  const [savingCharity, setSavingCharity] = useState(false);

  const loadData = useCallback(async () => {
    const { data: { user: u } } = await supabase.auth.getUser();
    if (!u) { router.push('/login'); return; }
    setUser(u);

    const [profileRes, subRes, scoresRes, charitiesRes, charSelRes, winnersRes, drawsRes] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', u.id).single(),
      supabase.from('subscriptions').select('*').eq('user_id', u.id).order('created_at', { ascending: false }).limit(1).maybeSingle(),
      supabase.from('scores').select('*').eq('user_id', u.id).order('played_on', { ascending: false }).limit(5),
      supabase.from('charities').select('*').eq('is_active', true),
      supabase.from('user_charity_selections').select('*, charities(*)').eq('user_id', u.id).maybeSingle(),
      supabase.from('winners').select('*, draws(draw_month, draw_year)').eq('user_id', u.id).order('created_at', { ascending: false }),
      supabase.from('draws').select('*').eq('status', 'published').order('draw_year', { ascending: false }).order('draw_month', { ascending: false }).limit(6),
    ]);

    setProfile(profileRes.data);
    setSubscription(subRes.data);
    setScores(scoresRes.data || []);
    setCharities(charitiesRes.data || []);
    setMyCharity(charSelRes.data);
    if (charSelRes.data?.contribution_percentage) setContribPct(charSelRes.data.contribution_percentage);
    setWinnings(winnersRes.data || []);
    setDraws(drawsRes.data || []);
    setLoading(false);
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const addScore = async () => {
    const val = parseInt(scoreVal);
    if (!val || val < 1 || val > 45) { toast.error('Score must be 1–45'); return; }
    if (!scoreDate) { toast.error('Please select a date'); return; }
    setAddingScore(true);

    // Keep only 5 scores — remove oldest if needed
    if (scores.length >= 5) {
      const oldest = scores[scores.length - 1];
      await supabase.from('scores').delete().eq('id', oldest.id);
    }

    const { error } = await supabase.from('scores').insert({
      user_id: user.id,
      score: val,
      played_on: scoreDate,
    });

    if (error) { toast.error('Failed to save score'); } else {
      toast.success('Score added!');
      setScoreVal('');
      await loadData();
    }
    setAddingScore(false);
  };

  const removeScore = async (id) => {
    await supabase.from('scores').delete().eq('id', id);
    setScores(prev => prev.filter(s => s.id !== id));
    toast.success('Score removed');
  };

  const saveCharity = async (charityId) => {
    setSavingCharity(true);
    const { error } = await supabase.from('user_charity_selections').upsert({
      user_id: user.id,
      charity_id: charityId,
      contribution_percentage: contribPct,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    if (error) { toast.error('Failed to save charity'); } else {
      toast.success('Charity selection saved!');
      await loadData();
    }
    setSavingCharity(false);
  };

  const cancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription?')) return;
    const res = await fetch('/api/subscriptions', { method: 'DELETE' });
    if (res.ok) {
      toast.success('Subscription cancelled');
      await loadData();
    } else {
      toast.error('Failed to cancel');
    }
  };

  const handleProofUpload = async (winnerId, file) => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${winnerId}_proof.${fileExt}`;
    const { data, error } = await supabase.storage.from('winner-proofs').upload(fileName, file, { upsert: true });
    if (error) { toast.error('Upload failed'); return; }
    const { data: { publicUrl } } = supabase.storage.from('winner-proofs').getPublicUrl(fileName);
    await supabase.from('winners').update({ proof_url: publicUrl }).eq('id', winnerId);
    toast.success('Proof uploaded!');
    await loadData();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
          <p className="text-white/40 text-sm">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const isActive = subscription?.status === 'active';
  const totalWon = winnings.reduce((sum, w) => sum + (w.prize_amount || 0), 0);
  const monthlyCharityAmount = subscription ? (subscription.amount * contribPct / 100) : 0;

  const tabs = [
    { key: 'overview', label: 'Overview', icon: BarChart2 },
    { key: 'scores', label: 'My Scores', icon: TrendingUp },
    { key: 'charity', label: 'Charity', icon: Heart },
    { key: 'draws', label: 'Draws', icon: Calendar },
    { key: 'winnings', label: 'Winnings', icon: Trophy },
    { key: 'account', label: 'Account', icon: Settings },
  ];

  return (
    <>
      <Navbar user={user} />
      <div className="min-h-screen pt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">

          {/* Header */}
          <div className="flex items-start justify-between mb-8">
            <div>
              <p className="text-white/40 text-sm mb-1">Welcome back</p>
              <h1 className="font-display text-4xl text-white tracking-wide">{profile?.full_name || 'Player'}</h1>
            </div>
            <button onClick={handleLogout} className="btn-secondary flex items-center gap-2 text-sm py-2">
              <LogOut size={15} /> Sign out
            </button>
          </div>

          {/* Subscription banner */}
          {!isActive && (
            <div className="card border-amber-500/30 bg-amber-500/5 p-4 flex items-center gap-3 mb-6">
              <AlertCircle size={18} className="text-amber-500 flex-shrink-0" />
              <p className="text-amber-200/80 text-sm">
                Your subscription is {subscription?.status || 'inactive'}.{' '}
                <Link href="/signup" className="underline">Renew now</Link> to participate in draws.
              </p>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto mb-8 pb-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.key
                    ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/20'
                }`}
              >
                <tab.icon size={14} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* ── OVERVIEW TAB ── */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: 'Subscription', value: isActive ? 'Active' : 'Inactive', sub: subscription ? `${subscription.plan} — ${formatCurrency(subscription.amount)}` : 'Not subscribed', icon: CreditCard, color: isActive ? '#3b82f6' : '#ef4444' },
                  { label: 'Scores Entered', value: `${scores.length}/5`, sub: scores.length === 5 ? 'Draw ready!' : `${5 - scores.length} more needed`, icon: TrendingUp, color: '#3b82f6' },
                  { label: 'Monthly to Charity', value: formatCurrency(monthlyCharityAmount), sub: myCharity?.charities?.name || 'No charity selected', icon: Heart, color: '#6366f1' },
                  { label: 'Total Winnings', value: formatCurrency(totalWon), sub: `${winnings.length} prize(s) won`, icon: Trophy, color: '#f59e0b' },
                ].map(card => (
                  <div key={card.label} className="card p-5">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-slate-400 text-xs font-medium">{card.label}</span>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${card.color}20` }}>
                        <card.icon size={14} style={{ color: card.color }} />
                      </div>
                    </div>
                    <div className="font-display text-2xl text-slate-100 tracking-wide">{card.value}</div>
                    <div className="text-slate-500 text-xs mt-1">{card.sub}</div>
                  </div>
                ))}
              </div>

              {/* Quick scores preview */}
              <div className="card p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-100">My Scores (Draw Entries)</h3>
                  <button onClick={() => setActiveTab('scores')} className="text-blue-400 text-xs hover:text-slate-300 flex items-center gap-1">
                    Manage <ChevronRight size={12} />
                  </button>
                </div>
                {scores.length > 0 ? (
                  <div className="flex flex-wrap gap-3">
                    {scores.map((s) => (
                      <div key={s.id} className="w-14 h-14 rounded-xl bg-blue-500/15 border border-blue-500/30 flex flex-col items-center justify-center">
                        <span className="font-display text-xl text-blue-400">{s.score}</span>
                        <span className="text-blue-400/50 text-[10px]">pts</span>
                      </div>
                    ))}
                    {[...Array(5 - scores.length)].map((_, i) => (
                      <div key={i} className="w-14 h-14 rounded-xl border border-slate-600/30 border-dashed flex items-center justify-center">
                        <span className="text-slate-500 text-lg">+</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-500 text-sm">No scores yet. Add your first score to enter draws.</p>
                )}
              </div>
            </div>
          )}

          {/* ── SCORES TAB ── */}
          {activeTab === 'scores' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-1">Add New Score</h3>
                <p className="text-white/40 text-sm mb-5">Your 5 most recent scores are used as draw entries. Adding a 6th replaces the oldest.</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="sm:col-span-1">
                    <label className="label">Stableford Score (1–45)</label>
                    <input
                      type="number"
                      min={1} max={45}
                      value={scoreVal}
                      onChange={e => setScoreVal(e.target.value)}
                      placeholder="e.g. 32"
                      className="input-field"
                    />
                  </div>
                  <div className="sm:col-span-1">
                    <label className="label">Date Played</label>
                    <input
                      type="date"
                      value={scoreDate}
                      onChange={e => setScoreDate(e.target.value)}
                      max={new Date().toISOString().split('T')[0]}
                      className="input-field"
                    />
                  </div>
                  <div className="sm:col-span-1 flex items-end">
                    <button
                      onClick={addScore}
                      disabled={addingScore}
                      className="btn-primary w-full flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Plus size={16} /> {addingScore ? 'Adding...' : 'Add Score'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-slate-100 mb-4">My 5 Scores — Draw Entries</h3>
                {scores.length === 0 ? (
                  <p className="text-slate-500 text-sm">No scores recorded yet.</p>
                ) : (
                  <div className="space-y-3">
                    {scores.map((s, idx) => (
                      <div key={s.id} className="flex items-center justify-between py-3 border-b border-slate-600/20 last:border-0">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 rounded-xl bg-blue-500/15 border border-blue-500/25 flex items-center justify-center">
                            <span className="font-display text-lg text-blue-400">{s.score}</span>
                          </div>
                          <div>
                            <p className="text-slate-100 text-sm font-medium">{s.score} Stableford points</p>
                            <p className="text-slate-500 text-xs">{formatDate(s.played_on)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {idx === 0 && <span className="text-blue-400 text-xs bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">Latest</span>}
                          {idx === scores.length - 1 && scores.length === 5 && (
                            <span className="text-slate-500 text-xs bg-slate-700/20 px-2 py-0.5 rounded-full">Next to replace</span>
                          )}
                          <button onClick={() => removeScore(s.id)} className="text-slate-500 hover:text-red-400 transition-colors">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CHARITY TAB ── */}
          {activeTab === 'charity' && (
            <div className="space-y-6">
              {/* Current charity */}
              {myCharity?.charities && (
                <div className="card border-blue-500/30 bg-blue-500/5 p-6">
                  <p className="text-[#a78bfa] text-xs font-semibold tracking-widest uppercase mb-2">Currently Supporting</p>
                  <h3 className="font-semibold text-white text-lg">{myCharity.charities.name}</h3>
                  <p className="text-white/40 text-sm mt-1">{myCharity.charities.description}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-white/40 text-sm">Your contribution:</span>
                    <span className="text-[#a78bfa] font-semibold">{myCharity.contribution_percentage}%</span>
                    <span className="text-white/30 text-sm">= {formatCurrency(monthlyCharityAmount * myCharity.contribution_percentage / contribPct)}/month</span>
                  </div>
                </div>
              )}

              {/* Contribution slider */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Charity Contribution</h3>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-white/40 text-sm">Minimum: 10% · Maximum: 100%</span>
                  <span className="text-[#a78bfa] font-display text-2xl">{contribPct}%</span>
                </div>
                <input
                  type="range"
                  min={10} max={100} step={5}
                  value={contribPct}
                  onChange={e => setContribPct(Number(e.target.value))}
                  className="w-full accent-[#a78bfa]"
                />
                <p className="text-white/30 text-sm mt-2">
                  = {formatCurrency(subscription ? (subscription.amount * contribPct / 100) : 0)} per month to your chosen charity
                </p>
              </div>

              {/* Charity selector */}
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Choose a Charity</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {charities.map((c) => (
                    <div
                      key={c.id}
                      className={`p-4 rounded-xl border transition-all cursor-pointer ${
                        myCharity?.charity_id === c.id
                          ? 'border-[#a78bfa]/50 bg-[#a78bfa]/10'
                          : 'border-white/[0.06] hover:border-white/20 bg-white/[0.02]'
                      }`}
                      onClick={() => saveCharity(c.id)}
                    >
                      <div className="flex items-start justify-between">
                        <h4 className="text-white font-medium text-sm leading-tight">{c.name}</h4>
                        {myCharity?.charity_id === c.id && <CheckCircle size={14} className="text-[#a78bfa] flex-shrink-0 mt-0.5" />}
                      </div>
                      <p className="text-white/30 text-xs mt-1 line-clamp-2">{c.description}</p>
                      {c.category && <span className="text-white/20 text-xs mt-2 inline-block bg-white/[0.04] px-2 py-0.5 rounded-full">{c.category}</span>}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── DRAWS TAB ── */}
          {activeTab === 'draws' && (
            <div className="space-y-4">
              <div className="card p-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#16C784]/15 flex items-center justify-center flex-shrink-0">
                  <Calendar size={18} className="text-[#16C784]" />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">Draws run monthly</p>
                  <p className="text-white/40 text-xs">Your 5 scores are automatically entered into each month&apos;s draw.</p>
                </div>
              </div>

              {draws.length === 0 ? (
                <div className="card p-8 text-center">
                  <p className="text-white/30">No published draws yet. Check back soon!</p>
                </div>
              ) : (
                draws.map((draw) => (
                  <div key={draw.id} className="card p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-display text-xl text-white tracking-wide">
                          {new Date(draw.draw_year, draw.draw_month - 1).toLocaleString('en', { month: 'long', year: 'numeric' })} Draw
                        </h3>
                        <p className="text-white/40 text-xs mt-1">Published {draw.published_at ? formatDate(draw.published_at) : ''}</p>
                      </div>
                      <span className="bg-[#16C784]/15 text-[#16C784] text-xs px-2.5 py-1 rounded-full border border-[#16C784]/25 font-medium">Published</span>
                    </div>

                    {draw.winning_numbers && (
                      <div>
                        <p className="text-white/30 text-xs mb-2">Winning numbers:</p>
                        <div className="flex gap-2">
                          {draw.winning_numbers.map((num, i) => (
                            <div key={i} className={`number-ball ${
                              scores.some(s => s.score === num)
                                ? 'bg-[#16C784] border-[#16C784] text-black'
                                : 'bg-white/[0.06] border-white/[0.15] text-white/60'
                            }`}>
                              {num}
                            </div>
                          ))}
                        </div>
                        {scores.some(s => draw.winning_numbers.includes(s.score)) && (
                          <p className="text-[#16C784] text-xs mt-2">✓ You matched {scores.filter(s => draw.winning_numbers.includes(s.score)).length} number(s)</p>
                        )}
                      </div>
                    )}

                    <div className="mt-4 grid grid-cols-3 gap-3">
                      {[
                        { label: '5-Match', val: draw.prize_pool_5match, match: 5 },
                        { label: '4-Match', val: draw.prize_pool_4match, match: 4 },
                        { label: '3-Match', val: draw.prize_pool_3match, match: 3 },
                      ].map(p => (
                        <div key={p.match} className="bg-white/[0.03] rounded-xl p-3 text-center">
                          <div className="text-white font-semibold text-sm">{formatCurrency(p.val || 0)}</div>
                          <div className="text-white/30 text-xs">{p.label} pool</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── WINNINGS TAB ── */}
          {activeTab === 'winnings' && (
            <div className="space-y-4">
              <div className="card p-5 flex items-center justify-between">
                <div>
                  <p className="text-white/40 text-xs">Total Won</p>
                  <p className="font-display text-3xl text-[#F0B429] tracking-wide">{formatCurrency(totalWon)}</p>
                </div>
                <Trophy size={28} className="text-[#F0B429]/40" />
              </div>

              {winnings.length === 0 ? (
                <div className="card p-8 text-center">
                  <Trophy size={32} className="text-white/10 mx-auto mb-3" />
                  <p className="text-white/30">No winnings yet — keep playing!</p>
                </div>
              ) : (
                winnings.map((w) => (
                  <div key={w.id} className="card p-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-white font-medium">{w.draws ? new Date(w.draws.draw_year, w.draws.draw_month - 1).toLocaleString('en', { month: 'long', year: 'numeric' }) : 'Draw'}</h4>
                        <p className="text-[#F0B429] text-sm">{getMatchLabel(w.match_type)}</p>
                        <p className="font-display text-2xl text-white mt-1">{formatCurrency(w.prize_amount)}</p>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                        w.payment_status === 'paid' ? 'bg-[#16C784]/15 text-[#16C784] border border-[#16C784]/25' :
                        w.payment_status === 'rejected' ? 'bg-red-500/15 text-red-400 border border-red-500/25' :
                        w.payment_status === 'verified' ? 'bg-blue-500/15 text-blue-400 border border-blue-500/25' :
                        'bg-amber-500/15 text-amber-400 border border-amber-500/25'
                      }`}>
                        {w.payment_status === 'paid' && <CheckCircle size={12} />}
                        {w.payment_status === 'rejected' && <XCircle size={12} />}
                        {(w.payment_status === 'pending' || w.payment_status === 'verified') && <Clock size={12} />}
                        {w.payment_status}
                      </div>
                    </div>

                    {w.payment_status === 'pending' && !w.proof_url && (
                      <div className="mt-4">
                        <p className="text-white/40 text-xs mb-2">Upload your score proof (screenshot from your golf platform):</p>
                        <label className="btn-secondary text-sm inline-flex items-center gap-2 cursor-pointer py-2">
                          <Upload size={14} /> Upload Proof
                          <input type="file" accept="image/*,.pdf" className="hidden" onChange={e => {
                            if (e.target.files[0]) handleProofUpload(w.id, e.target.files[0]);
                          }} />
                        </label>
                      </div>
                    )}
                    {w.proof_url && (
                      <p className="text-[#16C784]/70 text-xs mt-2">✓ Proof submitted — awaiting admin review</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── ACCOUNT TAB ── */}
          {activeTab === 'account' && (
            <div className="space-y-6">
              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Profile</h3>
                <div className="space-y-3">
                  <div>
                    <label className="label">Full Name</label>
                    <p className="text-white/70">{profile?.full_name || '—'}</p>
                  </div>
                  <div>
                    <label className="label">Email</label>
                    <p className="text-white/70">{profile?.email}</p>
                  </div>
                </div>
              </div>

              <div className="card p-6">
                <h3 className="font-semibold text-white mb-4">Subscription</h3>
                {subscription ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-white/40 text-sm">Plan</span>
                      <span className="text-white capitalize">{subscription.plan}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/40 text-sm">Status</span>
                      <span className={isActive ? 'text-[#16C784]' : 'text-red-400'} style={{ textTransform: 'capitalize' }}>{subscription.status}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white/40 text-sm">Amount</span>
                      <span className="text-white">{formatCurrency(subscription.amount)}</span>
                    </div>
                    {subscription.current_period_end && (
                      <div className="flex justify-between items-center">
                        <span className="text-white/40 text-sm">Renewal date</span>
                        <span className="text-white">{formatDate(subscription.current_period_end)}</span>
                      </div>
                    )}
                    {isActive && (
                      <button onClick={cancelSubscription} className="mt-4 text-red-400 hover:text-red-300 text-sm transition-colors">
                        Cancel subscription
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-white/40 text-sm mb-4">No active subscription.</p>
                    <Link href="/signup" className="btn-primary text-sm">Subscribe Now</Link>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
