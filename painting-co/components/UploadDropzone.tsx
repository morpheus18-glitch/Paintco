'use client';
import { useRef, useState } from 'react';

type Props = { onSubmit: (files: File[], previews: string[]) => void };

export default function UploadDropzone({ onSubmit }: Props) {
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = async (list: FileList | null) => {
    if (!list) return;
    const chosen = Array.from(list).slice(0, 5);
    setBusy(true);
    try {
      const previews: string[] = chosen.map((f) => URL.createObjectURL(f));
      onSubmit(chosen, previews);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    await handle(e.dataTransfer.files);
  };

  return (
    <div
      className="upload-tile"
      onDragOver={(e) => e.preventDefault()}
      onDrop={onDrop}
      role="button"
      onClick={() => inputRef.current?.click()}
      aria-label="Add photos for quote"
    >
      <div>
        <svg width="44" height="44" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M12 5v14M5 12h14" stroke="#87f0ff" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <div style={{ height: 6 }} />
        <button className="btn" type="button" disabled={busy}>
          {busy ? 'Processing…' : 'Add Photos'}
        </button>
        <p className="upload-hint">Use your camera or photo library. We’ll do the rest.</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*,.heic,.heif"
          multiple
          capture="environment"
          onChange={(e) => handle(e.target.files)}
          style={{ display: 'none' }}
        />
      </div>
    </div>
  );
}
