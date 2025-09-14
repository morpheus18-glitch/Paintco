import Hero from '@components/Hero';
import FeatureCards from '@components/FeatureCards';

export default function Home() {
  return (
    <>
      <Hero/>
      <section className="grid grid-3" style={{marginTop:24}}>
        <FeatureCards/>
      </section>
      <section className="card" style={{marginTop:24}}>
        <h2>Why homeowners choose ProPaint</h2>
        <ul>
          <li>Licensed & insured crews</li>
          <li>Dust control & clean job sites</li>
          <li>EPA lead-safe certified</li>
          <li>Flexible scheduling</li>
          <li>Transparent pricing</li>
        </ul>
      </section>
    </>
  );
}
