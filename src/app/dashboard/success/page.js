'use client';
import { useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '../../../lib/supabase';
import toast from 'react-hot-toast';
import { CheckCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Suspense } from 'react';

function SuccessContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const isSuccess = searchParams.get('subscription') === 'success';
  const isCancelled = searchParams.get('subscription') === 'cancelled';

  useEffect(() => {
    if (isSuccess) toast.success('🎉 Subscription activated! Welcome to GolfGives!');
  }, [isSuccess]);

  if (!isSuccess && !isCancelled) {
    router.replace('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        {isSuccess ? (
          <>
            <div className="w-16 h-16 rounded-full bg-[#16C784]/20 border border-[#16C784]/30 flex items-center justify-center mx-auto mb-6">
              <CheckCircle size={28} className="text-[#16C784]" />
            </div>
            <h1 className="font-display text-4xl text-white tracking-wide mb-3">YOU'RE IN!</h1>
            <p className="text-white/50 mb-8">Your subscription is active. Start entering your scores and pick your charity.</p>
            <Link href="/dashboard" className="btn-primary inline-flex items-center gap-2">
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          </>
        ) : (
          <>
            <h1 className="font-display text-4xl text-white tracking-wide mb-3">CHECKOUT CANCELLED</h1>
            <p className="text-white/50 mb-8">No payment was taken. You can try again anytime.</p>
            <Link href="/signup" className="btn-primary inline-flex items-center gap-2">
              Try Again <ArrowRight size={16} />
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-[#16C784]/30 border-t-[#16C784] rounded-full animate-spin" /></div>}>
      <SuccessContent />
    </Suspense>
  );
}
