import type { Metadata } from 'next';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'ChatGPT Fluid — a Jev experiment',
  description: 'An interface that follows your train of thought. Explore a ChatGPT-inspired composer with live intent routing by TypeSafe Jev.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
