import Link from 'next/link';
import { Trophy } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 text-center">
      <div>
        <div className="font-display text-[12rem] leading-none text-white/[0.04] select-none">404</div>
        <h1 className="font-display text-5xl text-white tracking-wide -mt-8 mb-4">LOST IN THE ROUGH</h1>
        <p className="text-white/40 mb-8">This page doesn&apos;t exist. Let&apos;s get you back on the fairway.</p>
        <Link href="/" className="btn-primary inline-flex items-center gap-2">
          <Trophy size={16} /> Back to Home
        </Link>
      </div>
    </div>
  );
}
