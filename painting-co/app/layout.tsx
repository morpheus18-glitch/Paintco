import './globals.css';
import type { ReactNode } from 'react';
import NavBar from '@components/NavBar';
import Footer from '@components/Footer';

export const metadata = {
  title: 'Smart Photo Quote',
  description: 'Upload photos, get a ballpark with a real crew plan.',
  viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover' },
  themeColor: '#0b0f1a',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header className="site-header">
          <NavBar />
        </header>

        <main className="app-shell">{children}</main>

        {/* Mobile-only bottom bar (hidden on desktop via CSS) */}
        <nav className="mobile-bottom-bar" aria-label="Primary">
          <a href="/" aria-label="Home">Home</a>
          <a href="/quote" aria-current="page">Quote</a>
          <a href="/contact">Contact</a>
        </nav>

        <Footer />
      </body>
    </html>
  );
}
