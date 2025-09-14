'use client';
import { useState } from 'react';
import UploadDropzone from '@components/UploadDropzone';
import EstimateResult from '@components/EstimateResult';

type EstimateResponse = {
  subtotal: number;
  labor: number;
  materials: number;
  prep: number;
  difficulty: 'low'|'medium'|'high';
  sqft: number;
  notes: string[];
};

export default function QuotePage() {
  const [heightFt, setHeightFt] = useState(9);
  const [coats, setCoats] = useState(2);
  const [finish, setFinish] = useState<'matte'|'eggshell'|'semi-gloss'>('eggshell');
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
        <p>Upload 1–5 photos of each area. Add room height, coats, and finish. You’ll get an instant ballpark with line items.</p>
        <div className="grid" style={{gridTemplateColumns:'1fr 1fr', gap:16, marginTop:12}}>
          <div>
            <label>Average wall/ceiling height (ft)</label>
            <input type="number" min={7} max={20} value={heightFt} onChange={e=>setHeightFt(Number(e.target.value))}/>
          </div>
          <div>
            <label>Number of coats</label>
            <select value={coats} onChange={e=>setCoats(Number(e.target.value))}>
              <option value={1}>1</option><option value={2}>2</option><option value={3}>3</option>
            </select>
          </div>
          <div>
            <label>Finish</label>
            <select value={finish} onChange={e=>setFinish(e.target.value as any)}>
              <option value="matte">Matte</option>
              <option value="eggshell">Eggshell</option>
              <option value="semi-gloss">Semi-gloss</option>
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
