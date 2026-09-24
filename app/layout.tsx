import type { Metadata } from 'next';
import '@fontsource/geist/400.css';
import '@fontsource/geist/500.css';
import '@fontsource/geist/600.css';
import './globals.css';

export const metadata: Metadata = {
  title: 'Google Fluid — a Jev search experiment',
  description: 'A search bar that takes the shape of your curiosity. Explore 21 interactive search interfaces powered by TypeSafe Jev.',
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
