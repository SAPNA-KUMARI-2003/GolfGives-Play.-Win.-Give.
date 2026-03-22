# GolfGives — Golf Charity Subscription Platform

> Play. Win. Give. — A subscription platform combining Stableford golf scoring, monthly prize draws, and charitable giving.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 14 (App Router) |
| Styling | Tailwind CSS |
| Backend | Next.js API Routes |
| Database | Supabase (PostgreSQL + RLS) |
| Auth | Supabase Auth |
| Payments | Stripe (Subscriptions + Webhooks) |
| Deployment | Vercel |

---

## Features Implemented

- ✅ Public landing page (hero, how it works, prize tiers, pricing, charities)
- ✅ User signup / login (Supabase Auth)
- ✅ Monthly + yearly Stripe subscription plans
- ✅ Rolling 5-score system (Stableford 1–45, auto-replaces oldest)
- ✅ Monthly draw engine (random + algorithmic weighted modes)
- ✅ Prize pool split: 40% jackpot / 35% 4-match / 25% 3-match
- ✅ Jackpot rollover if no 5-match winner
- ✅ Charity directory with featured/spotlight section
- ✅ Per-user charity selection (10–100% contribution)
- ✅ Winner verification flow (proof upload → admin review → paid)
- ✅ Full user dashboard (scores, draws, charity, winnings, account)
- ✅ Full admin panel (users, draw engine, winner review, charity management)
- ✅ Row-Level Security on all tables
- ✅ Stripe webhook handler
- ✅ Mobile-first responsive design

---

## Setup — Step by Step

### 1. Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project (use a **new account**)
2. Copy your **Project URL** and **anon key** from Settings → API
3. Also copy the **service_role key** (keep secret)
4. Go to the SQL Editor and run the contents of `supabase/schema.sql`
5. Go to Storage → Create a new bucket called `winner-proofs` (set to public)

### 2. Create Stripe Account

1. Go to [stripe.com](https://stripe.com) → Create account (use a **new account**)
2. In Test Mode, go to Products → Add Product:
   - **GolfGives Monthly** — $9.99/month (recurring) → copy Price ID
   - **GolfGives Yearly** — $99.99/year (recurring) → copy Price ID
3. Copy your **Publishable Key** and **Secret Key** from Developers → API Keys
4. Set up a Webhook (Developers → Webhooks → Add endpoint):
   - URL: `https://your-app.vercel.app/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`
   - Copy the **Webhook Signing Secret**

### 3. Deploy to Vercel

1. Push this project to a **new GitHub repository**
2. Go to [vercel.com](https://vercel.com) → New Project → Import repo (use a **new Vercel account**)
3. Add all Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_xxx
STRIPE_SECRET_KEY=sk_test_xxx
STRIPE_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID=price_xxx
NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID=price_xxx
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

4. Deploy → get your live URL
5. Update `NEXT_PUBLIC_APP_URL` in Vercel env to your actual URL
6. Update your Stripe webhook URL to match your live URL

### 4. Create Admin User

After deploying, sign up normally through the app. Then in Supabase SQL Editor:

```sql
UPDATE public.profiles 
SET is_admin = true 
WHERE email = 'your-email@example.com';
```

### 5. Test Credentials (for evaluators)

Create these accounts after deploying:

**User account:** signup at `/signup`
**Admin account:** signup → run the SQL above to make admin → visit `/admin`

For Stripe test payments, use card: `4242 4242 4242 4242` with any future date and CVC.

---

## Local Development

```bash
# Install dependencies
npm install

# Copy env file
cp .env.example .env.local
# Fill in your values

# Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Testing Checklist

- [ ] User signup & login
- [ ] Monthly + yearly subscription flow (Stripe test)
- [ ] Score entry (1–45 Stableford)
- [ ] 5-score rolling logic (6th score replaces oldest)
- [ ] Charity selection + contribution % slider
- [ ] Admin: draw simulation (random and algorithmic)
- [ ] Admin: publish draw → winners created automatically
- [ ] User: view winnings + upload proof
- [ ] Admin: verify/reject proof, mark as paid
- [ ] Admin: add/edit/delete charities
- [ ] Admin: manage users (make admin)
- [ ] Responsive on mobile + desktop

---

## Architecture Notes

- All database access protected by Supabase RLS policies
- Service role key only used in server-side API routes
- Middleware handles auth redirect on every request
- Draw engine is server-side; admins simulate before publishing
- Stripe webhooks update subscription state asynchronously
- Scores strictly limited to 5 per user at DB level
