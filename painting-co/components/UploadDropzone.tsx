'use client';
import { useState, useRef } from 'react';
import { compressToJpeg } from '@lib/client-image';

type Props = { onSubmit:(files:File[])=>void, disabled?:boolean };

export default function UploadDropzone({ onSubmit, disabled }:Props) {
  const [files, setFiles] = useState<File[]>([]);
  const [compressed, setCompressed] = useState<File[] | null>(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const takeFirst5 = (list: FileList | File[]) => Array.from(list).slice(0,5);
  const acceptList = 'image/*,.heic,.heif';

  const pick = async (list: FileList | File[]) => {
    const chosen = takeFirst5(list);
    setFiles(chosen);
    setBusy(true);
    try {
      const processed: File[] = [];
      for (const f of chosen) {
        try {
          const jpg = await compressToJpeg(f, { maxDim: 1600, targetBytes: 1.5*1024*1024 });
          processed.push(jpg);
        } catch (e:any) {
          alert(`${f.name}: ${e.message || 'Unsupported image format. Please use JPG/PNG/HEIC.'}`);
        }
      }
      if (processed.length === 0) { setCompressed(null); return; }
      setCompressed(processed);
    } finally {
      setBusy(false);
    }
  };

  const onDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    await pick(e.dataTransfer.files);
  };

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) await pick(e.target.files);
  };

  const handleSubmit = () => onSubmit(compressed ?? files);
  const list = compressed ?? files;

  return (
    <div className="grid" style={{gap:12, marginTop:16}}>
      <div
        className="card"
        onDragOver={(e)=>e.preventDefault()}
        onDrop={onDrop}
        style={{textAlign:'center', padding:'30px 20px', borderStyle:'dashed'}}
      >
        <p style={{margin:0}}>Drag & drop 1–5 photos (JPG/PNG/HEIC). We’ll auto-compress.</p>
        <button className="btn" onClick={()=>inputRef.current?.click()} disabled={disabled || busy}>
          {busy ? 'Processing…' : 'Choose files'}
        </button>
        <input ref={inputRef} type="file" accept={acceptList} multiple onChange={onPick} style={{display:'none'}} />
      </div>

      {list.length>0 && (
        <div className="card">
          <strong>Selected:</strong>
          <ul style={{marginTop:8}}>
            {list.map((f,i)=><li key={i}>{f.name} — {(f.size/1024/1024).toFixed(2)} MB</li>)}
          </ul>
          <button className="btn" onClick={handleSubmit} disabled={disabled || busy}>
            {busy ? 'Compressing…' : 'Get Estimate'}
          </button>
          <p style={{color:'#a7b0d6', marginTop:8, fontSize:12}}>
            RAW/ProRAW (.dng) isn’t supported in-browser. Use JPG/HEIC or take a standard photo.
          </p>
        </div>
      )}
    </div>
  );
}
