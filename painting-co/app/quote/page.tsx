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
  difficulty: 'low' | 'medium' | 'high';
  sqft: number;
  notes: string[];
  crew?: { people: number; days: number; hoursTotal: number; productivitySqftHr: number };
  materialsDetail?: { gallons: number; unitCost: number; wastePct: number };
  lineItems?: { label: string; amount: number }[];
  detected?: { type: string; confidence: number; complexity: string };
};

export default function QuotePage() {
  const [response, setResponse] = useState<EstimateResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [thumbs, setThumbs] = useState<string[]>([]);
  const [err, setErr] = useState<string | null>(null);

  const onSubmit = async (files: File[], previews: string[]) => {
    setThumbs(previews);
    setLoading(true);
    setErr(null);
    setResponse(null);

    try {
      const fd = new FormData();
      files.forEach((f) => fd.append('photos', f));

      const res = await fetch('/api/estimate', {
        method: 'POST',
        body: fd,
      });

      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(text || `Request failed (${res.status})`);
      }

      const data: EstimateResponse = await res.json();
      setResponse(data);
    } catch (e: any) {
      setErr(e?.message || 'Failed to estimate. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Left column (uploader) on desktop, stacked first on mobile */}
      <section className="card">
        <h1 style={{ margin: '0 0 4px' }}>Smart Photo Quote</h1>
        <p style={{ color: 'var(--muted)', marginTop: 4, fontSize: 14 }}>
          Add 1–5 photos. We’ll detect the project and price it.
        </p>

        <UploadDropzone onSubmit={onSubmit} />

        {thumbs.length > 0 && (
          <div className="thumb-grid">
            {thumbs.map((src, i) => (
              <div key={i} className="thumb">
                <img src={src} alt={`photo ${i + 1}`} />
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Right column (results) on desktop, stacked second on mobile */}
      <section className="result">
        {loading && (
          <div style={{ display: 'grid', gap: 8 }}>
            <div className="skeleton" style={{ height: 24 }}></div>
            <div className="skeleton"></div>
            <div className="skeleton" style={{ width: '70%' }}></div>
          </div>
        )}

        {!loading && err && (
          <div className="card" style={{ padding: 12, borderColor: 'rgba(255,80,80,.4)' }}>
            <strong style={{ display: 'block', marginBottom: 6 }}>Something went wrong</strong>
            <p style={{ color: 'var(--muted)', margin: 0, fontSize: 14 }}>{err}</p>
          </div>
        )}

        {!loading && response && <EstimateResult data={response} />}

        {!loading && !response && !err && (
          <p style={{ color: 'var(--muted)', margin: 0 }}>No estimate yet — add photos to begin.</p>
        )}
      </section>
    </>
  );
}
