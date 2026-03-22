import { clsx } from 'clsx';

export function cn(...inputs) {
  return clsx(inputs);
}

export function formatCurrency(amount, currency = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

export function getMonthName(month) {
  return new Date(2024, month - 1, 1).toLocaleString('en', { month: 'long' });
}

// Draw engine — match user scores against drawn numbers
export function calculateMatches(userScores, drawnNumbers) {
  const userSet = new Set(userScores);
  return drawnNumbers.filter(n => userSet.has(n)).length;
}

// Generate random draw (5 unique numbers between 1–45)
export function generateRandomDraw() {
  const numbers = [];
  while (numbers.length < 5) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!numbers.includes(n)) numbers.push(n);
  }
  return numbers.sort((a, b) => a - b);
}

// Generate algorithmic draw weighted by score frequencies
export function generateAlgorithmicDraw(allUserScores) {
  if (!allUserScores || allUserScores.length === 0) return generateRandomDraw();

  // Count frequency of each score
  const freq = {};
  for (let i = 1; i <= 45; i++) freq[i] = 0;
  allUserScores.forEach(s => { freq[s] = (freq[s] || 0) + 1; });

  // Sort by most frequent (weighted lottery)
  const weighted = [];
  Object.entries(freq).forEach(([score, count]) => {
    const weight = Math.max(1, count);
    for (let i = 0; i < weight; i++) weighted.push(Number(score));
  });

  // Pick 5 unique numbers
  const drawn = [];
  const pool = [...weighted];
  while (drawn.length < 5 && pool.length > 0) {
    const idx = Math.floor(Math.random() * pool.length);
    const num = pool[idx];
    if (!drawn.includes(num)) drawn.push(num);
    pool.splice(idx, 1);
  }

  // Fill remaining with random if needed
  while (drawn.length < 5) {
    const n = Math.floor(Math.random() * 45) + 1;
    if (!drawn.includes(n)) drawn.push(n);
  }

  return drawn.sort((a, b) => a - b);
}

export function getMatchLabel(count) {
  if (count === 5) return '🏆 5-Number Match — JACKPOT';
  if (count === 4) return '🥈 4-Number Match';
  if (count === 3) return '🥉 3-Number Match';
  return null;
}
