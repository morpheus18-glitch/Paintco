import Hero from '@components/Hero';
import FeatureCards from '@components/FeatureCards';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="shell page-gap">
      <Hero />

      <section id="services" className="container" style={{padding:0}}>
        <div className="grid grid-3">
          <FeatureCards/>
        </div>
      </section>

      <section className="card" style={{display:'grid', gap:14}}>
        <h2>What you can expect</h2>
        <ul className="list">
          <li>Clear scope and line-item pricing before work begins</li>
          <li>Dust control, daily tidy-up, and a final walkthrough</li>
          <li>Proper prep: patching, sanding, primer that actually adheres</li>
          <li>Flexible scheduling and dedicated project lead</li>
        </ul>
      </section>

      <section id="contact" className="card" style={{display:'grid', gap:14}}>
        <h2>Contact</h2>
        <p className="lead">Tell us about your project. We’ll reply the same day.</p>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:16}}>
          <div>
            <label>Name</label>
            <input className="input" placeholder="Your name" />
          </div>
          <div>
            <label>Email or phone</label>
            <input className="input" placeholder="you@example.com" />
          </div>
          <div style={{gridColumn:'1 / -1'}}>
            <label>Project details</label>
            <textarea className="input" rows={4} placeholder="Rooms, timelines, special notes"></textarea>
          </div>
        </div>
        <div>
          <Link href="/quote" className="btn">Or get an instant Smart Photo Quote</Link>
        </div>
      </section>
    </div>
  );
}
