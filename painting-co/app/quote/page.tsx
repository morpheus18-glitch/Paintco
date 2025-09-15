'use client';
import { useState } from 'react';
import UploadDropzone from '@components/UploadDropzone';
import EstimateResult from '@components/EstimateResult';

type EstimateResponse = {
  subtotal: number;
  total?: number;
  rangeLow: number;
  rangeHigh: number;
  labor: number;
  materials: number;
  prep: number;
  difficulty: 'low'|'medium'|'high';
  sqft: number;
  notes: string[];
  crew?: { people:number; days:number; hoursTotal:number; productivitySqftHr:number; };
  materialsDetail?: { gallons:number; unitCost:number; wastePct:number; };
  lineItems?: { label:string; amount:number; }[];
};

export default function QuotePage() {
  const [heightFt, setHeightFt] = useState(9);
  const [coats, setCoats] = useState(2);
  const [finish, setFinish] = useState<'matte'|'eggshell'|'semi-gloss'>('eggshell');
  const [distanceMiles, setDistanceMiles] = useState<number>(0);
  const [preferredDays, setPreferredDays] = useState<number>(0); // 0 = auto
  const [rush, setRush] = useState(false);
  const [weekend, setWeekend] = useState(false);
  const [deadline, setDeadline] = useState<string>(''); // YYYY-MM-DD

  const [response, setResponse] = useState<EstimateResponse|null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (files: File[]) => {
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('photos', f));
      fd.append('heightFt', String(heightFt));
      fd.append('coats', String(coats));
      fd.append('finish', finish);
      if (distanceMiles) fd.append('distanceMiles', String(distanceMiles));
      if (preferredDays) fd.append('preferredDays', String(preferredDays));
      fd.append('rush', String(rush));
      fd.append('weekend', String(weekend));
      if (deadline) fd.append('deadline', deadline);

      const res = await fetch('/api/estimate', { method: 'POST', body: fd });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResponse(data);
    } catch (e:any) {
      alert(e.message || 'Failed to estimate.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="grid" style={{gap:24}}>
      <div className="card">
        <h1>Smart Photo Quote</h1>
        <p className="lead">Upload 1–5 photos. Add a few details. Get a ballpark with a real crew plan.</p>

        <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:16, marginTop:12}}>
          <div>
            <label>Average wall/ceiling height (ft)</label>
            <input className="input" type="number" min={7} max={20} value={heightFt} onChange={e=>setHeightFt(Number(e.target.value))}/>
          </div>
          <div>
            <label>Number of coats</label>
            <select className="input" value={coats} onChange={e=>setCoats(Number(e.target.value))}>
              <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
            </select>
          </div>
          <div>
            <label>Finish</label>
            <select className="input" value={finish} onChange={e=>setFinish(e.target.value as any)}>
              <option value="matte">Matte</option>
              <option value="eggshell">Eggshell</option>
              <option value="semi-gloss">Semi-gloss</option>
            </select>
          </div>
          <div>
            <label>Distance (miles)</label>
            <input className="input" type="number" min={0} value={distanceMiles} onChange={e=>setDistanceMiles(Number(e.target.value))}/>
          </div>
          <div>
            <label>Target duration (days)</label>
            <input className="input" type="number" min={0} value={preferredDays} onChange={e=>setPreferredDays(Number(e.target.value))}/>
            <small style={{color:'var(--muted)'}}>Leave 0 to auto-size the crew</small>
          </div>
          <div>
            <label>Date needed (deadline)</label>
            <input className="input" type="date" value={deadline} onChange={e=>setDeadline(e.target.value)}/>
          </div>
          <div>
            <label>Rush?</label>
            <select className="input" value={rush ? 'yes':'no'} onChange={(e)=>setRush(e.target.value==='yes')}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </div>
          <div>
            <label>Weekend work?</label>
            <select className="input" value={weekend ? 'yes':'no'} onChange={(e)=>setWeekend(e.target.value==='yes')}>
              <option value="no">No</option><option value="yes">Yes</option>
            </select>
          </div>
        </div>

        <UploadDropzone onSubmit={onSubmit} disabled={loading}/>
      </div>

      <div className="card">
        {loading ? <p>Crunching pixels…</p> : response ? <EstimateResult data={response}/> : <p>No estimate yet. Add photos and click “Get Estimate”.</p>}
      </div>
    </section>
  );
}
