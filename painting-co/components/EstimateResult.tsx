import { useState } from 'react';

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
  const [open, setOpen] = useState(false);
  const fmt = (n:number)=> `$${n.toFixed(0)}`;

  return (
    <div className="grid" style={{gap:10}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', gap:12}}>
        <div>
          <div className="price">{fmt((data as any).total ?? data.subtotal)}</div>
          <div className="band">Range {fmt(data.rangeLow)}–{fmt(data.rangeHigh)}</div>
        </div>
        <div style={{textAlign:'right'}}>
          {data.detected && (
            <div style={{fontSize:13, color:'var(--muted)'}}>
              {data.detected.type.replace('_',' ')} · {Math.round(data.detected.confidence*100)}%
            </div>
          )}
          <div style={{fontSize:13, color:'var(--muted)'}}>
            ~{Math.round(data.sqft)} sq ft · {data.difficulty}
          </div>
        </div>
      </div>

      {data.crew && (
        <div className="kv">
          <span>Crew Plan</span>
          <strong>{data.crew.people} painters · {data.crew.days} day(s)</strong>
        </div>
      )}
      <div className="kv"><span>Labor</span><strong>{fmt(data.labor)}</strong></div>
      <div className="kv"><span>Materials</span><strong>{fmt(data.materials)}</strong></div>
      <div className="kv"><span>Ops / Overhead</span><strong>{fmt(data.prep)}</strong></div>

      <button className="btn ghost" onClick={()=>setOpen(v=>!v)} aria-expanded={open} style={{width:'100%'}}>
        {open ? 'Hide Details' : 'View Line Items & Notes'}
      </button>

      {open && (
        <div className="card" style={{padding:12}}>
          <h3 style={{marginTop:0}}>Line Items</h3>
          <ul style={{marginTop:6}}>
            {(data.lineItems ?? []).map((li,i)=>(
              <li key={i} style={{display:'flex', justifyContent:'space-between', padding:'6px 0', borderBottom:'1px solid var(--line)'}}>
                <span>{li.label}</span><strong>{fmt(li.amount)}</strong>
              </li>
            ))}
          </ul>
          <h3 style={{marginTop:14}}>Notes</h3>
          <ul style={{marginTop:6}}>
            {data.notes.map((n,i)=><li key={i} style={{color:'var(--muted)'}}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
