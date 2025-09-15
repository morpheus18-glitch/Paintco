import Link from 'next/link';

export default function NavBar() {
  return (
    <nav className="container nav">
      <Link href="/" className="brand">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="10" fill="#5aa1ff"/><path d="M6 13l3 3 9-9" stroke="#071226" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span>ProPaint Co.</span>
      </Link>

      <div className="spacer" />

      <Link href="/">Home</Link>
      <Link href="/quote">Smart Quote</Link>
      <a href="#services">Services</a>
      <a href="#contact">Contact</a>

      <Link href="/quote" className="btn" style={{marginLeft:12}}>Get a Quote</Link>
    </nav>
  );
}
