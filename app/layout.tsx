import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sensai // Adaptive Video Curriculum Decomposition',
  description: 'Dynamic video-to-course engine decomposing plain YouTube targets into interactive domain-specific courses.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-black text-zinc-100 min-h-screen antialiased selection:bg-red-950 selection:text-red-200">
        {children}
      </body>
    </html>
  );
}

