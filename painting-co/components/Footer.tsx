export default function Footer() {
  return (
    <footer>
      <div className="container" style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <small>© {new Date().getFullYear()} ProPaint Co. · Licensed & Insured</small>
        <small>Call: (555) 555-0199 · hello@propaint.example</small>
      </div>
    </footer>
  );
}
