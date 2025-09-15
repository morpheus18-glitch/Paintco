export default function Footer() {
  return (
    <footer>
      <div className="container" style={{display:'flex', flexWrap:'wrap', gap:12, justifyContent:'space-between', alignItems:'center'}}>
        <small style={{color:'var(--muted)'}}>© {new Date().getFullYear()} ProPaint Co. — Residential & Commercial</small>
        <small style={{color:'var(--muted)'}}>Call (555) 555-0199 · hello@propaint.example</small>
      </div>
    </footer>
  );
}
