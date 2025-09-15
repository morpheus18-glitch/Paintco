import './globals.css';
import NavBar from '@components/NavBar';
import Footer from '@components/Footer';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'ProPaint Co. — Smart Photo Quotes',
  description: 'Upload photos. Get a ballpark with a real crew plan.',
  themeColor: '#0b1020',
  viewport: { width: 'device-width', initialScale: 1, viewportFit: 'cover' }
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header><NavBar/></header>
        <main className="container app-shell">{children}</main>
        <Footer/>
      </body>
    </html>
  );
}
