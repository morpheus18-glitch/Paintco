import Link from 'next/link';

export default function NavBar() {
  return (
    <nav className="container" style={{display:'flex', alignItems:'center', gap:24, height:64}}>
      <Link href="/" style={{fontWeight:800}}>ProPaint Co.</Link>
      <div style={{marginLeft:'auto', display:'flex', gap:16}}>
        <Link href="/">Home</Link>
        <Link href="/quote">Smart Quote</Link>
        <a href="#services">Services</a>
        <a href="#contact">Contact</a>
      </div>
    </nav>
  );
}
