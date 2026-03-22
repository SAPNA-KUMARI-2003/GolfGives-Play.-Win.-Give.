import { Bebas_Neue, Outfit } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';

const bebasNeue = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-bebas',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata = {
  title: 'GolfGives — Play. Win. Give.',
  description: 'A subscription platform combining golf performance, monthly draws, and charitable impact.',
  keywords: 'golf, charity, subscription, prize draw, stableford',
  openGraph: {
    title: 'GolfGives — Play. Win. Give.',
    description: 'Enter your golf scores. Win monthly prizes. Support a charity you love.',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${bebasNeue.variable} ${outfit.variable}`}>
      <body className="bg-slate-900 text-slate-100 font-body antialiased">
        {children}
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1e293b',
              color: '#f1f5f9',
              border: '1px solid rgba(71, 85, 105, 0.3)',
              fontFamily: 'var(--font-outfit)',
              backdropFilter: 'blur(8px)',
            },
            success: { iconTheme: { primary: '#3b82f6', secondary: '#0f172a' } },
            error: { iconTheme: { primary: '#ef4444', secondary: '#0f172a' } },
          }}
        />
      </body>
    </html>
  );
}
