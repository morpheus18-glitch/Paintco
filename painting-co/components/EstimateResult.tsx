export default function EstimateResult({ data }:{ data: {
  subtotal:number; labor:number; materials:number; prep:number; difficulty:'low'|'medium'|'high'; sqft:number; notes:string[];
}}) {
  const fmt = (n:number)=> `$${n.toFixed(2)}`;
  return (
    <div>
      <h2 style={{marginTop:0}}>Ballpark Estimate</h2>
      <p style={{marginTop:-8, color:'#64748b'}}>Not a final quote. We’ll verify on-site.</p>
      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          <h3>Totals</h3>
          <p>Estimated Area: <strong>{Math.round(data.sqft)} sq ft</strong></p>
          <p>Difficulty: <strong>{data.difficulty}</strong></p>
          <p>Labor: <strong>{fmt(data.labor)}</strong></p>
          <p>Materials: <strong>{fmt(data.materials)}</strong></p>
          <p>Prep: <strong>{fmt(data.prep)}</strong></p>
          <hr/>
          <p style={{fontSize:18}}>Subtotal: <strong>{fmt(data.subtotal)}</strong></p>
        </div>
        <div className="card">
          <h3>Notes & Assumptions</h3>
          <ul>
            {data.notes.map((n,i)=><li key={i}>{n}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
