import Link from 'next/link';
import { createClient } from '../lib/supabaseServer';
import Navbar from '../components/Navbar';
import { Heart, Trophy, TrendingUp, CheckCircle, ArrowRight, Star } from 'lucide-react';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Fetch stats
  const [{ count: subscriberCount }, { data: charities }] = await Promise.all([
    supabase.from('subscriptions').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('charities').select('id, name, description, image_url, is_featured, total_raised').eq('is_featured', true).limit(3),
  ]);

  const totalDonated = (subscriberCount || 0) * 1.0; // $1/sub/month to charity approx
  const totalPrizePool = (subscriberCount || 0) * 4.99;

  return (
    <>
      <Navbar user={user} />

      {/* Hero Section */}
      <section className=" relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-600/8 rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-600/6 rounded-full blur-[100px]" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-slate-700/5 rounded-full blur-[150px]" />
          {/* Grid pattern */}
          <div className="absolute inset-0" style={{
            backgroundImage: 'linear-gradient(rgba(100, 116, 139, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 116, 139, 0.03) 1px, transparent 1px)',
            backgroundSize: '60px 60px',
          }} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 pt-28 pb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-slate-800/60 border border-slate-600/30 rounded-full px-4 py-1.5 text-sm text-slate-300 mb-8 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            Monthly draw now active
          </div>

          {/* Main headline */}
          <h1 className="flex   flex-col justify-center text-center font-display text-[clamp(3rem,12vw,8rem)] leading-[0.9] tracking-wide mb-6 max-w-5xl">
            <span className="block text-slate-100">PLAY GOLF.</span>
            <span className="block text-slate-100">WIN PRIZES.</span>
            <span className="block gradient-text-blue">CHANGE LIVES.</span>
          </h1>

          <p className="text-slate-400 text-lg md:text-xl max-w-xl mb-10 leading-relaxed text-center">
            Enter your Stableford scores. Get entered into our monthly draw. 
            A portion of every subscription goes to the charity you choose.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 mb-16 justify-center">
            <Link href="/signup" className="btn-primary py-4 px-8 text-base inline-flex items-center gap-2 glow-blue">
              Start Your Journey <ArrowRight size={18} />
            </Link>
            <Link href="/charities" className="btn-secondary py-4 px-8 text-base inline-flex items-center gap-2">
              <Heart size={18} className="text-blue-400" /> Explore Charities
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            {[
              { value: `${subscriberCount || 0}+`, label: 'Active Players' },
              { value: `£${Math.round(totalPrizePool).toLocaleString()}`, label: 'Prize Pool' },
              { value: '6', label: 'Charities Listed' },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 text-center">
                <div className="font-display text-2xl text-blue-400">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-24 relative bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-3">The Process</p>
            <h2 className="section-title">HOW IT WORKS</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                num: '01',
                icon: TrendingUp,
                title: 'Enter Your Scores',
                desc: 'Log your latest 5 Stableford scores (1–45). Your rolling score history updates automatically each time you play.',
                color: '#3b82f6',
              },
              {
                num: '02',
                icon: Trophy,
                title: 'Enter the Monthly Draw',
                desc: 'Your 5 scores become your draw entries. Match 3, 4 or all 5 drawn numbers to win from the monthly prize pool.',
                color: '#f59e0b',
              },
              {
                num: '03',
                icon: Heart,
                title: 'Support Your Charity',
                desc: 'Choose any charity from our directory. A minimum of 10% of your subscription goes directly to them each month.',
                color: '#6366f1',
              },
            ].map((step) => (
              <div key={step.num} className="card p-8 group hover:border-slate-500/40 transition-all duration-300">
                <div className="flex items-start justify-between mb-6">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${step.color}20`, border: `1px solid ${step.color}30` }}>
                    <step.icon size={22} style={{ color: step.color }} />
                  </div>
                  <span className="font-display text-5xl text-slate-600">{step.num}</span>
                </div>
                <h3 className="font-display text-2xl text-slate-100 mb-3 tracking-wide">{step.title}</h3>
                <p className="text-slate-400 leading-relaxed text-sm">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Prize Tiers */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-b from-slate-800/30 to-slate-900/50">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-amber-400 text-sm font-semibold tracking-widest uppercase mb-3">Monthly Prizes</p>
            <h2 className="section-title">WIN BIG EVERY MONTH</h2>
            <p className="text-slate-400 mt-4 max-w-xl mx-auto">Match your scores against the drawn numbers. The more you match, the more you win.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                match: '5 NUMBERS',
                label: 'JACKPOT',
                share: '40%',
                desc: 'Rolls over to next month if unclaimed. Grows until someone wins.',
                color: '#f59e0b',
                featured: true,
              },
              {
                match: '4 NUMBERS',
                label: '2ND TIER',
                share: '35%',
                desc: 'Split equally between all 4-match winners that month.',
                color: '#3b82f6',
                featured: false,
              },
              {
                match: '3 NUMBERS',
                label: '3RD TIER',
                share: '25%',
                desc: 'Split equally between all 3-match winners that month.',
                color: '#6366f1',
                featured: false,
              },
            ].map((tier) => (
              <div key={tier.match} className={`card p-8 relative overflow-hidden ${tier.featured ? 'border-amber-500/30' : ''}`}>
                {tier.featured && (
                  <div className="absolute top-4 right-4 bg-amber-500/20 text-amber-400 text-xs font-bold px-2 py-0.5 rounded-full border border-amber-500/30">JACKPOT</div>
                )}
                <div className="font-display text-5xl mb-1" style={{ color: tier.color }}>{tier.share}</div>
                <div className="text-slate-500 text-xs mb-4">of total pool</div>
                <div className="font-display text-2xl text-slate-100 tracking-wide mb-1">{tier.match}</div>
                <div className="text-slate-400 text-xs tracking-widest uppercase mb-4">{tier.label}</div>
                <p className="text-slate-400 text-sm leading-relaxed">{tier.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subscription Plans */}
      <section className="py-24 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-3">Pricing</p>
            <h2 className="section-title">SIMPLE, TRANSPARENT</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {[
              {
                plan: 'Monthly',
                price: '$9.99',
                per: '/month',
                features: ['All 5 scores entered each month', 'Monthly draw participation', 'Choose your charity', '10%+ goes to charity', 'Cancel anytime'],
                cta: 'Start Monthly',
                highlighted: false,
              },
              {
                plan: 'Yearly',
                price: '$99.99',
                per: '/year',
                note: 'Save 17%',
                features: ['Everything in Monthly', 'Best value — 2 months free', 'Priority draw entry', 'Annual charity report', 'Locked-in pricing'],
                cta: 'Start Yearly',
                highlighted: true,
              },
            ].map((plan) => (
              <div key={plan.plan} className={`card p-8 relative ${plan.highlighted ? 'border-blue-500/40 glow-blue' : ''}`}>
                {plan.note && (
                  <div className="absolute top-4 right-4 bg-blue-500/20 text-blue-400 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-500/30">{plan.note}</div>
                )}
                <div className="text-slate-400 text-sm font-medium mb-3">{plan.plan}</div>
                <div className="flex items-end gap-1 mb-6">
                  <span className="font-display text-6xl text-slate-100">{plan.price}</span>
                  <span className="text-slate-500 text-sm mb-2">{plan.per}</span>
                </div>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-3 text-slate-300 text-sm">
                      <CheckCircle size={15} className="text-blue-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className={plan.highlighted ? 'btn-primary w-full text-center block' : 'btn-secondary w-full text-center block'}>
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Charities */}
      {charities && charities.length > 0 && (
        <section className="py-24 border-t border-slate-700/50 bg-slate-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="flex items-end justify-between mb-12">
              <div>
                <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-3">Impact</p>
                <h2 className="section-title">FEATURED CHARITIES</h2>
              </div>
              <Link href="/charities" className="text-blue-400 text-sm hover:text-slate-300 transition-colors flex items-center gap-1">
                View all <ArrowRight size={14} />
              </Link>
            </div>

            <div className="grid md:grid-cols-3 gap-6">
              {charities.map((charity) => (
                <div key={charity.id} className="card overflow-hidden group hover:border-slate-500/40 transition-all duration-300">
                  <div className="h-40 overflow-hidden bg-slate-700/30">
                    {charity.image_url && (
                      <img src={charity.image_url} alt={charity.name} className="w-full h-full object-cover opacity-70 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500" />
                    )}
                  </div>
                  <div className="p-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Star size={12} className="text-amber-400 fill-current" />
                      <span className="text-amber-400 text-xs font-semibold tracking-widest uppercase">Featured</span>
                    </div>
                    <h3 className="font-semibold text-slate-100 mb-2">{charity.name}</h3>
                    <p className="text-slate-400 text-sm line-clamp-2">{charity.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 relative overflow-hidden bg-gradient-to-br from-blue-600/5 via-transparent to-indigo-600/5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="font-display text-[clamp(3rem,8vw,7rem)] leading-none tracking-wide mb-6">
            <span className="text-slate-100">READY TO</span><br />
            <span className="gradient-text-blue">MAKE AN IMPACT?</span>
          </h2>
          <p className="text-slate-400 text-lg mb-10 max-w-xl mx-auto">
            Join hundreds of golfers who play better, win prizes, and fund causes they care about — every single month.
          </p>
          <Link href="/signup" className="btn-primary py-4 px-10 text-lg inline-flex items-center gap-2 glow-blue">
            Subscribe Now — It Only Takes 2 Minutes <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-6 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-blue-600 flex items-center justify-center">
              <Trophy size={12} className="text-white" />
            </div>
            <span className="font-display text-xl tracking-wider text-slate-400">GOLFGIVES</span>
          </div>
          <p className="text-slate-500 text-sm">© 2026 GolfGives. Subscription-based platform for golf & charity.</p>
          <div className="flex items-center gap-6">
            <Link href="/charities" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Charities</Link>
            <Link href="/login" className="text-slate-500 hover:text-slate-300 text-sm transition-colors">Sign in</Link>
          </div>
        </div>
      </footer>
    </>
  );
}
