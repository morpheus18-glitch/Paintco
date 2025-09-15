export type CompressOpts = {
  maxDim?: number;
  quality?: number;
  targetBytes?: number;
  minQuality?: number;
};

export async function compressToJpeg(file: File, opts: CompressOpts = {}) {
  const {
    maxDim = 1600,
    quality = 0.86,
    targetBytes = 1.5 * 1024 * 1024,
    minQuality = 0.6
  } = opts;

  const lower = file.name.toLowerCase();
  if (lower.endsWith('.dng') || file.type === 'image/x-adobe-dng') {
    throw new Error('RAW/ProRAW (.dng) is not supported. Please upload JPG or HEIC/PNG.');
    }

  const bitmap = await readAsImageBitmap(file);
  const { width, height } = scaleToFit(bitmap.width, bitmap.height, maxDim);

  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas unavailable');
  ctx.drawImage(bitmap, 0, 0, width, height);

  let q = quality;
  let blob = await canvasToBlob(canvas, 'image/jpeg', q);
  while (blob.size > targetBytes && q > minQuality) {
    q = Math.max(minQuality, q - 0.06);
    blob = await canvasToBlob(canvas, 'image/jpeg', q);
  }

  const outName = file.name.replace(/\.(\w+)$/i, '') + '.jpg';
  return new File([blob], outName, { type: 'image/jpeg', lastModified: Date.now() });
}

function scaleToFit(w: number, h: number, maxDim: number) {
  if (Math.max(w, h) <= maxDim) return { width: w, height: h };
  const ratio = w >= h ? maxDim / w : maxDim / h;
  return { width: Math.round(w * ratio), height: Math.round(h * ratio) };
}

async function readAsImageBitmap(file: File): Promise<ImageBitmap> {
  const blob = file.slice(0, file.size, file.type || 'application/octet-stream');
  try {
    return await createImageBitmap(blob);
  } catch {
    const url = URL.createObjectURL(blob);
    try {
      const img = await loadHtmlImage(url);
      const bmp = await createImageBitmap(img);
      URL.revokeObjectURL(url);
      return bmp;
    } catch {
      URL.revokeObjectURL(url);
      throw new Error('Unsupported image format in browser (try JPG/PNG/HEIC).');
    }
  }
}

function loadHtmlImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality);
  });
}
