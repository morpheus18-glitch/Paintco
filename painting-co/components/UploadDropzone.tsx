'use client';

import { useState } from 'react';

export default function UploadDropzone({ onSubmit }: { onSubmit: (files: File[], previews: string[]) => void }) {
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const arr = Array.from(files);
    const previews = arr.map((f) => URL.createObjectURL(f));
    onSubmit(arr, previews);
  };

  return (
    <div
      className={`dropzone ${dragOver ? 'over' : ''}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
    >
      <input
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => handleFiles(e.target.files)}
        style={{ display: 'none' }}
        id="file-input"
      />
      <label htmlFor="file-input" className="btn-primary">
        Upload Photos
      </label>
      <p style={{ color: 'var(--muted)', fontSize: 13 }}>Drop or tap to select (JPG, PNG)</p>
    </div>
  );
}
