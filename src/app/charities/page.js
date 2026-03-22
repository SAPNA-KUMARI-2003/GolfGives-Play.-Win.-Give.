import { createClient } from '../../lib/supabaseServer';
import Navbar from '../../components/Navbar';
import Link from 'next/link';
import { Heart, ExternalLink, Search } from 'lucide-react';

export const metadata = {
  title: 'Charities — GolfGives',
  description: 'Browse all charities supported through GolfGives subscriptions.',
};

export default async function CharitiesPage() {
  const supabase = createClient();
  const [{ data: { user } }, { data: charities }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('charities').select('*').eq('is_active', true).order('is_featured', { ascending: false }).order('name'),
  ]);

  const categories = [...new Set((charities || []).map(c => c.category).filter(Boolean))];
  const featured = (charities || []).filter(c => c.is_featured);
  const all = charities || [];

  return (
    <>
      <Navbar user={user} />
      <div className="min-h-screen pt-24 pb-20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
        {/* Background */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden -z-0">
          <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-indigo-600/6 rounded-full blur-[140px]" />
          <div className="absolute bottom-1/3 left-1/4 w-80 h-80 bg-blue-600/8 rounded-full blur-[120px]" />
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 relative">
          {/* Header */}
          <div className="text-center mb-16">
            <p className="text-blue-400 text-sm font-semibold tracking-widest uppercase mb-3">Our Impact</p>
            <h1 className="font-display text-[clamp(3rem,8vw,6rem)] leading-none tracking-wide text-slate-100 mb-4">
              CHARITIES WE <span className="gradient-text-blue">SUPPORT</span>
            </h1>
            <p className="text-slate-400 max-w-xl mx-auto text-lg">
              Every subscription on GolfGives sends money to charities that matter.
              You choose which one receives your contribution.
            </p>
          </div>

          {/* Featured */}
          {featured.length > 0 && (
            <section className="mb-16">
              <div className="flex items-center gap-2 mb-6">
                <div className="w-1 h-6 bg-blue-500 rounded-full" />
                <h2 className="font-display text-2xl text-slate-100 tracking-wide">SPOTLIGHT CHARITIES</h2>
              </div>
              <div className="grid md:grid-cols-3 gap-6">
                {featured.map(c => (
                  <CharityCard key={c.id} charity={c} featured />
                ))}
              </div>
            </section>
          )}

          {/* All charities */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="w-1 h-6 bg-blue-500 rounded-full" />
                <h2 className="font-display text-2xl text-slate-100 tracking-wide">ALL CHARITIES</h2>
              </div>
              <span className="text-slate-500 text-sm">{all.length} charities</span>
            </div>

            {/* Category filters */}
            {categories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-8">
                <span className="text-slate-300 text-xs px-3 py-1.5 rounded-full bg-slate-700/40 border border-slate-600/40">All</span>
                {categories.map(cat => (
                  <span key={cat} className="text-slate-400 text-xs px-3 py-1.5 rounded-full bg-slate-700/20 border border-slate-600/30 hover:border-slate-500/60 cursor-pointer transition-all">{cat}</span>
                ))}
              </div>
            )}

            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {all.map(c => (
                <CharityCard key={c.id} charity={c} />
              ))}
            </div>
          </section>

          {/* CTA */}
          <div className="mt-20 card border-blue-500/20 p-10 text-center">
            <Heart size={32} className="text-blue-400 mx-auto mb-4" />
            <h3 className="font-display text-3xl text-slate-100 tracking-wide mb-3">READY TO GIVE BACK?</h3>
            <p className="text-slate-400 mb-6 max-w-sm mx-auto text-sm">Subscribe to GolfGives and choose which charity receives your monthly contribution.</p>
            <Link href={user ? '/dashboard' : '/signup'} className="btn-primary inline-flex items-center gap-2">
              {user ? 'Go to Dashboard' : 'Subscribe Now'} <Heart size={16} />
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

function CharityCard({ charity: c, featured }) {
  return (
    <div className={`card overflow-hidden group hover:border-slate-500/40 transition-all duration-300 flex flex-col ${featured ? 'border-blue-500/20' : ''}`}>
      {/* Image */}
      <div className="h-48 overflow-hidden bg-slate-700/20 relative">
        {c.image_url ? (
          <img
            src={c.image_url}
            alt={c.name}
            className="w-full h-full object-cover opacity-60 group-hover:opacity-80 group-hover:scale-105 transition-all duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Heart size={32} className="text-slate-500/30" />
          </div>
        )}
        {featured && (
          <div className="absolute top-3 left-3 bg-blue-500/20 backdrop-blur-sm border border-blue-500/30 text-blue-400 text-xs font-bold px-2.5 py-1 rounded-full">
            ★ Featured
          </div>
        )}
        {c.category && (
          <div className="absolute top-3 right-3 bg-slate-900/60 backdrop-blur-sm text-slate-400 text-xs px-2 py-0.5 rounded-full">
            {c.category}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-semibold text-slate-100 mb-2 leading-tight">{c.name}</h3>
        <p className="text-slate-400 text-sm leading-relaxed flex-1">{c.description}</p>

        {c.total_raised > 0 && (
          <div className="mt-3 pt-3 border-t border-slate-600/20">
            <p className="text-slate-500 text-xs">Raised through GolfGives</p>
            <p className="text-blue-400 font-semibold text-sm">
              {new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' }).format(c.total_raised)}
            </p>
          </div>
        )}

        {c.website_url && (
          <a
            href={c.website_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 text-slate-500 hover:text-blue-400 text-xs inline-flex items-center gap-1 transition-colors"
          >
            Visit website <ExternalLink size={10} />
          </a>
        )}
      </div>
    </div>
  );
}
