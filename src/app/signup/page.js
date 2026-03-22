'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Trophy, CheckCircle, Eye, EyeOff } from 'lucide-react';

export default function SignupPage() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ name: '', email: '', password: '', plan: 'monthly' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSignup = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { data, error } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
      options: { data: { full_name: form.name } },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    // Create subscription via Stripe
    try {
      const res = await fetch('/api/subscriptions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: form.plan, userId: data.user?.id }),
      });
      const { url } = await res.json();
      if (url) {
        window.location.href = url;
        return;
      }
    } catch (err) {
      console.error('Stripe error', err);
    }

    toast.success('Account created! Please check your email.');
    router.push('/dashboard');
    setLoading(false);
  };

  const plans = [
    {
      key: 'monthly',
      label: 'Monthly',
      price: '$9.99',
      per: 'per month',
      features: ['Full draw participation', '10% to charity', 'Cancel anytime'],
    },
    {
      key: 'yearly',
      label: 'Yearly',
      price: '$99.99',
      per: 'per year',
      note: 'Save 17%',
      features: ['Everything in Monthly', 'Best value (2 months free)', 'Priority support'],
    },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 relative bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-1/4 right-1/3 w-[400px] h-[400px] bg-indigo-600/6 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-blue-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-lg relative">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center">
              <Trophy size={18} className="text-white" />
            </div>
            <span className="font-display text-2xl sm:text-3xl tracking-wider text-slate-100">GOLFGIVES</span>
          </Link>
          <h1 className="font-display text-3xl sm:text-4xl text-slate-100 tracking-wide">CREATE ACCOUNT</h1>
          <p className="text-slate-400 mt-2 text-sm">Join the community. Play. Win. Give.</p>
        </div>

        <div className="card p-8">
          <form onSubmit={handleSignup} className="space-y-5">
            {/* Name */}
            <div>
              <label className="label">Full name</label>
              <input
                type="text"
                value={form.name}
                onChange={e => handleChange('name', e.target.value)}
                placeholder="John Smith"
                required
                className="input-field"
              />
            </div>

            {/* Email */}
            <div>
              <label className="label">Email address</label>
              <input
                type="email"
                value={form.email}
                onChange={e => handleChange('email', e.target.value)}
                placeholder="you@example.com"
                required
                className="input-field"
              />
            </div>

            {/* Password */}
            <div>
              <label className="label">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => handleChange('password', e.target.value)}
                  placeholder="8+ characters"
                  required
                  minLength={8}
                  className="input-field pr-12"
                />
                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Plan selection */}
            <div>
              <label className="label">Choose your plan</label>
              <div className="grid grid-cols-2 gap-3">
                {plans.map((plan) => (
                  <button
                    key={plan.key}
                    type="button"
                    onClick={() => handleChange('plan', plan.key)}
                    className={`relative p-4 rounded-xl border text-left transition-all duration-200 ${
                      form.plan === plan.key
                        ? 'border-blue-500/60 bg-blue-500/10'
                        : 'border-slate-600/40 bg-slate-700/20 hover:border-slate-500/60'
                    }`}
                  >
                    {plan.note && (
                      <div className="absolute top-2 right-2 bg-blue-500/20 text-blue-400 text-[10px] font-bold px-1.5 py-0.5 rounded-full">{plan.note}</div>
                    )}
                    <div className="font-display text-xl text-slate-100 tracking-wide">{plan.price}</div>
                    <div className="text-slate-400 text-xs">{plan.per}</div>
                    <div className="text-slate-300 text-sm font-medium mt-1">{plan.label}</div>
                    {form.plan === plan.key && (
                      <CheckCircle size={14} className="text-blue-400 absolute bottom-3 right-3" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full py-3.5 mt-2 disabled:opacity-50"
            >
              {loading ? 'Creating account...' : 'Create account & subscribe'}
            </button>

            <p className="text-slate-500 text-xs text-center leading-relaxed">
              By subscribing you agree to our Terms. You can cancel anytime. Charity contribution is non-refundable.
            </p>
          </form>
        </div>

        <p className="text-center text-slate-400 text-sm mt-6">
          Already have an account?{' '}
          <Link href="/login" className="text-blue-400 hover:text-blue-300 transition-colors font-medium">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
