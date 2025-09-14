import Image from 'next/image';
import Link from 'next/link';

export default function Hero() {
  return (
    <section className="card" style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:24, alignItems:'center'}}>
      <div>
        <h1 style={{marginTop:0}}>Crisp lines. Clean cut-ins. No drama.</h1>
        <p>Residential & commercial painting with dust control, tight schedules, and a spotless clean-up. Try our Smart Photo Quote.</p>
        <div style={{display:'flex', gap:12}}>
          <Link href="/quote" className="btn">Get Smart Quote</Link>
          <a href="#contact" className="btn secondary">Book a walkthrough</a>
        </div>
      </div>
      <div className="card" style={{padding:0, overflow:'hidden'}}>
        <Image src="/hero.jpg" alt="Freshly painted living room" width={1200} height={800} />
      </div>
    </section>
  );
}
