import type { Metadata } from 'next';
import { Space_Grotesk, Plus_Jakarta_Sans, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const ninjaFont = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-ninja',
  display: 'swap',
});

const sansFont = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

const monoFont = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sensai // Adaptive Video Curriculum Decomposition',
  description:
    'Dynamic video-to-course engine decomposing plain YouTube targets into interactive domain-specific courses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`dark ${ninjaFont.variable} ${sansFont.variable} ${monoFont.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen antialiased bg-stone-50 text-stone-900 dark:bg-black dark:text-zinc-100 font-sans transition-colors duration-200 selection:bg-red-500/20 selection:text-red-700 dark:selection:bg-red-950 dark:selection:text-red-200">
        {children}
      </body>
    </html>
  );
}
