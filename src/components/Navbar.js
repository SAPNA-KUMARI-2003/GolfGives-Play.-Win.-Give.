'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../lib/supabase';
import { Menu, X, Trophy } from 'lucide-react';

export default function Navbar({ user }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 bg-slate-900/95  border-b border-slate-700/50' : 'bg-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center group-hover:shadow-[0_0_20px_rgba(59,130,246,0.5)] transition-all">
            <Trophy size={16} className="text-white" />
          </div>
          <span className="font-display text-xl sm:text-2xl tracking-wider text-slate-100">GOLFGIVES</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/charities" className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium">Charities</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium">Dashboard</Link>
              <button onClick={handleLogout} className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-400 hover:text-slate-100 transition-colors text-sm font-medium">Sign in</Link>
              <Link href="/signup" className="btn-primary py-2 px-5 text-sm">Get Started</Link>
            </>
          )}
        </div>

        {/* Mobile menu button */}
        <button className="md:hidden text-slate-400 hover:text-slate-100" onClick={() => setOpen(!open)}>
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="md:hidden bg-slate-900/98 backdrop-blur-xl border-t border-slate-700/50 px-4 py-4 flex flex-col gap-4">
          <Link href="/charities" className="text-slate-400 hover:text-slate-100 text-base py-2" onClick={() => setOpen(false)}>Charities</Link>
          {user ? (
            <>
              <Link href="/dashboard" className="text-slate-400 hover:text-slate-100 text-base py-2" onClick={() => setOpen(false)}>Dashboard</Link>
              <button onClick={handleLogout} className="text-left text-slate-400 hover:text-slate-100 text-base py-2">Sign out</button>
            </>
          ) : (
            <>
              <Link href="/login" className="text-slate-400 hover:text-slate-100 text-base py-2" onClick={() => setOpen(false)}>Sign in</Link>
              <Link href="/signup" className="btn-primary text-center" onClick={() => setOpen(false)}>Get Started</Link>
            </>
          )}
        </div>
      )}
    </nav>
  );
}
