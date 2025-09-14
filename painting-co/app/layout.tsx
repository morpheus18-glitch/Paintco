import './globals.css';
import NavBar from '@components/NavBar';
import Footer from '@components/Footer';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'ProPaint Co. — Residential & Commercial Painting',
  description: 'Crisp lines, clean edges, fair prices. Instant photo quotes.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <header><NavBar/></header>
        <main className="container">{children}</main>
        <Footer/>
      </body>
    </html>
  );
}
