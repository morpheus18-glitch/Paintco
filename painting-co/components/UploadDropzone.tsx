'use client';
import { useEffect, useRef, useState } from 'react';
import { compressToJpeg } from '@lib/client-image';

type Props = { onSubmit: (files: File[]) => void; disabled?: boolean; };

export default function UploadDropzone({ onSubmit, disabled }: Props) {
  const [raw, setRaw] = useState<File[]>([]);
  const [processed, setProcessed] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [autoKicked, setAutoKicked] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const acceptList = 'image/*,.heic,.heif';
  const takeFirst5 = (list: FileList | File[]) => Array.from(list).slice(0, 5);

  const handleFiles = async (list: FileList | File[]) => {
    const chosen = takeFirst5(list);
    setRaw(chosen);
    setBusy(true);
    try {
      const out: File[] = [];
      for (const f of chosen) {
        try {
          const jpg = await compressToJpeg(f, { maxDim: 1600, targetBytes: 1.5 * 1024 * 1024 });
          out.push(jpg);
        } catch (e: any) {
          console.warn('compress error', e);
        }
      }
      setProcessed(out);
    } finally {
      setBusy(false);
    }
  };

  // Auto-submit once we finish processing
  useEffect(() => {
    if (!busy && processed.length > 0 && !autoKicked) {
      setAutoKicked(true);
      onSubmit(processed);
    }
  }, [busy, processed, autoKicked, onSubmit]);

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    await handleFiles(e.dataTransfer.files);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await handleFiles(e.target.files);
  };

  return (
    <div className="grid" style={{ gap: 12, marginTop: 12 }}>
      <div
        className="card"
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        style={{ textAlign: 'center', padding: '30px 20px', borderStyle: 'dashed' }}
      >
        <p style={{ margin: 0 }}>Drag & drop 1–5 photos (JPG/PNG/HEIC). We’ll auto-compress and estimate.</p>
        <button className="btn" onClick={() => inputRef.current?.click()} disabled={disabled || busy}>
          {busy ? 'Processing…' : 'Choose photos'}
        </button>
        <input ref={inputRef} type="file" accept={acceptList} multiple onChange={onPick} style={{ display: 'none' }} />
      </div>

      {raw.length > 0 && (
        <div className="card">
          <strong>Selected:</strong>
          <ul style={{ marginTop: 8 }}>
            {raw.map((f, i) => (
              <li key={i}>{f.name}</li>
            ))}
          </ul>
          <p style={{ color: '#a7b0d6', marginTop: 8, fontSize: 12 }}>
            We’ll submit automatically once the images are optimized.
          </p>
        </div>
      )}
    </div>
  );
}
