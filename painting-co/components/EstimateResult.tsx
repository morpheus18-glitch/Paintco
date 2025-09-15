export default function EstimateResult({ data }:{
  data: {
    subtotal:number; total?:number; rangeLow:number; rangeHigh:number;
    labor:number; materials:number; prep:number;
    difficulty:'low'|'medium'|'high'; sqft:number; notes:string[];
    crew?: { people:number; days:number; hoursTotal:number; productivitySqftHr:number; };
    materialsDetail?: { gallons:number; unitCost:number; wastePct:number; };
    lineItems?: { label:string; amount:number; }[];
    detected?: { type:string; confidence:number; complexity:string };
  }
}) {
  const fmt = (n:number)=> `$${n.toFixed(2)}`;
  return (
    <div>
      <h2 style={{marginTop:0}}>Ballpark Estimate</h2>
      <p style={{marginTop:-8, color:'#a7b0d6'}}>Not a final quote — on-site walkthrough will confirm.</p>

      <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:16}}>
        <div className="card">
          <h3>Totals</h3>
          <p>Estimated Area: <strong>{Math.round(data.sqft)} sq ft</strong></p>
          <p>Difficulty: <strong>{data.difficulty}</strong></p>
          {data.detected && (
            <p>Detected Project: <strong>{data.detected.type.replace('_',' ')}</strong>
              <small style={{color:'#a7b0d6'}}> ({Math.round(data.detected.confidence*100)}% confidence)</small>
            </p>
          )}
          {data.crew && <p>Crew Plan: <strong>{data.crew.people} painters × {data.crew.days} day(s)</strong> (~{data.crew.hoursTotal} hrs)</p>}
          <p>Labor: <strong>{fmt(data.labor)}</strong></p>
          <p>Materials: <strong>{fmt(data.materials)}</strong>
            {data.materialsDetail && <> &nbsp;<small style={{color:'#a7b0d6'}}>({data.materialsDetail.gallons} gal @ ${data.materialsDetail.unitCost}/gal)</small></>}
          </p>
          <p>Ops/Overhead: <strong>{fmt(data.prep)}</strong></p>
          <hr/>
          <p style={{fontSize:18, marginBottom:6}}>Suggested Price: <strong>{fmt((data as any).total ?? data.subtotal)}</strong></p>
          <p style={{fontSize:13, color:'#a7b0d6', marginTop:0}}>
            Confidence band: <strong>{fmt(data.rangeLow)}</strong> – <strong>{fmt(data.rangeHigh)}</strong>
          </p>
        </div>

        <div className="card">
          <h3>Line Items</h3>
          <ul>
            {(data.lineItems ?? []).map((li,i)=>
              <li key={i} style={{display:'flex', justifyContent:'space-between'}}>
                <span>{li.label}</span><strong>{fmt(li.amount)}</strong>
              </li>
            )}
          </ul>
          <h3 style={{marginTop:16}}>Notes & Assumptions</h3>
          <ul>{data.notes.map((n,i)=><li key={i}>{n}</li>)}</ul>
        </div>
      </div>
    </div>
  );
}
