export default function NavBar() {
  return (
    <div className="site-header__inner">
      <div className="brand">Smart Quote</div>
      <nav className="desktop-nav" aria-label="Primary">
        <a href="/">Home</a>
        <a href="/quote">Quote</a>
        <a href="/contact">Contact</a>
      </nav>
    </div>
  );
}
