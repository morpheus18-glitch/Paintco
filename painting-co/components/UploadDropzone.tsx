'use client';
import { useState, useRef } from 'react';

export default function UploadDropzone({ onSubmit, disabled }:{ onSubmit:(files:File[])=>void, disabled?:boolean }) {
  const [files, setFiles] = useState<File[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const list = Array.from(e.dataTransfer.files).slice(0,5);
    setFiles(list);
  };

  const onPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files ? Array.from(e.target.files).slice(0,5) : [];
    setFiles(list);
  };

  return (
    <div className="grid" style={{gap:12, marginTop:16}}>
      <div
        className="card"
        onDragOver={(e)=>e.preventDefault()}
        onDrop={onDrop}
        style={{textAlign:'center', padding:'30px 20px', borderStyle:'dashed'}}
      >
        <p style={{margin:0}}>Drag & drop 1–5 photos (JPG/PNG), or</p>
        <button className="btn" onClick={()=>inputRef.current?.click()} disabled={disabled}>Choose files</button>
        <input ref={inputRef} type="file" accept="image/*" multiple onChange={onPick} style={{display:'none'}}/>
      </div>

      {files.length>0 && (
        <div className="card">
          <strong>Selected:</strong>
          <ul style={{marginTop:8}}>
            {files.map((f,i)=><li key={i}>{f.name} — {(f.size/1024/1024).toFixed(2)} MB</li>)}
          </ul>
          <button className="btn" onClick={()=>onSubmit(files)} disabled={disabled}>Get Estimate</button>
        </div>
      )}
    </div>
  );
}
