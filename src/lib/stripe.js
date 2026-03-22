import Stripe from 'stripe';

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-04-10',
});

// Subscription plans config
export const PLANS = {
  monthly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_MONTHLY_PRICE_ID,
    amount: 999, // $9.99 in cents
    label: 'Monthly',
    prize_pool_contribution: 499, // $4.99 goes to prize pool
    charity_min: 100, // $1.00 minimum charity
  },
  yearly: {
    priceId: process.env.NEXT_PUBLIC_STRIPE_YEARLY_PRICE_ID,
    amount: 9999, // $99.99 in cents
    label: 'Yearly',
    prize_pool_contribution: 4999,
    charity_min: 1000,
  },
};

// Calculate prize pool tiers
export function calculatePrizePools(totalPool, rolloverAmount = 0) {
  const jackpotPool = totalPool * 0.40 + rolloverAmount;
  return {
    fiveMatch: jackpotPool,
    fourMatch: totalPool * 0.35,
    threeMatch: totalPool * 0.25,
  };
}
