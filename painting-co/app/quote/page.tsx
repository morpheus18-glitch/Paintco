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
  detected?: { type:string; confidence:number; complexity:string };
};

export default function QuotePage() {
  const [response, setResponse] = useState<EstimateResponse|null>(null);
  const [loading, setLoading] = useState(false);

  const onSubmit = async (files: File[]) => {
    setLoading(true);
    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('photos', f));
      // We don't append any other fields; API has defaults.
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
    <section className="grid" style={{ gap: 24 }}>
      <div className="card">
        <h1>Smart Photo Quote</h1>
        <p className="lead">Drop 1–5 photos. We’ll detect the project and give a ballpark with a real crew plan.</p>
        <UploadDropzone onSubmit={onSubmit} disabled={loading}/>
      </div>
      <div className="card">
        {loading ? <p>Crunching pixels…</p>
         : response ? <EstimateResult data={response}/>
         : <p>No estimate yet. Add photos to begin.</p>}
      </div>
    </section>
  );
}
