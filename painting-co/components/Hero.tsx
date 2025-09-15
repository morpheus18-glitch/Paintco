import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="card hero">
      <div>
        <h1>Crisp lines. Clean cut-ins. Zero surprises.</h1>
        <p className="lead">
          Residential & commercial painting with tight schedules, tidy job sites, and transparent pricing.
          Try a Smart Photo Quote in under two minutes.
        </p>
        <div className="badges">
          <span className="badge">Licensed & Insured</span>
          <span className="badge">Lead-Safe Certified</span>
          <span className="badge">5-Year Workmanship</span>
        </div>
        <div style={{display:'flex', gap:12, marginTop:16}}>
          <Link href="/quote" className="btn">Get Smart Quote</Link>
          <a href="#contact" className="btn ghost">Book a Walkthrough</a>
        </div>
      </div>

      <div className="hero-visual">
        <Image src="/hero.jpg" alt="Fresh interior repaint" width={1200} height={800} priority />
      </div>
    </section>
  );
}
