import sharp from 'sharp';

export type InferredFeatures = {
  interior: boolean;
  trimDensity: 'low'|'medium'|'high';
  estHeightFt: number | null;
  drywallRepair: 'none'|'light'|'moderate'|'heavy';
  confidence: number;
};

export async function inferFeatures(buffers: Buffer[]): Promise<InferredFeatures> {
  const buf = buffers[0];
  const { data, info } = await sharp(buf)
    .resize({ width: 800, withoutEnlargement: true })
    .toColorspace('rgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width, h = info.height, N = w*h;
  const gray = new Uint8Array(N);
  let rSum=0,gSum=0,bSum=0,satSum=0;

  for (let i=0, p=0; i<N; i++, p+=3) {
    const r = data[p], g = data[p+1], b = data[p+2];
    rSum += r; gSum += g; bSum += b;
    const y = (0.299*r + 0.587*g + 0.114*b) | 0;
    gray[i] = y;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    satSum += max === 0 ? 0 : (max-min)/max;
  }

  const avgR=rSum/N, avgG=gSum/N, avgB=bSum/N, avgSat=satSum/N;

  const EDGE_T=54;
  let edges=0, accDx=0, accDy=0, borderEdges=0, interiorEdges=0;
  for (let y=1; y<h-1; y++) {
    for (let x=1; x<w-1; x++) {
      const i = y*w + x;
      const g00=gray[(y-1)*w + (x-1)], g01=gray[(y-1)*w + x], g02=gray[(y-1)*w + (x+1)];
      const g10=gray[y*w + (x-1)], g12=gray[y*w + (x+1)];
      const g20=gray[(y+1)*w + (x-1)], g21=gray[(y+1)*w + x], g22=gray[(y+1)*w + (x+1)];
      const dx=(g02+2*g12+g22)-(g00+2*g10+g20), dy=(g20+2*g21+g22)-(g00+2*g01+g02);
      const mag = Math.abs(dx)+Math.abs(dy);
      if (mag>EDGE_T){ edges++; accDx+=Math.abs(dx); accDy+=Math.abs(dy);
        const nearBorder = (x<Math.floor(0.12*w) || x>Math.floor(0.88*w) || y<Math.floor(0.12*h) || y>Math.floor(0.88*h));
        if (nearBorder) borderEdges++; else interiorEdges++;
      }
    }
  }
  const edgeDensity = edges / N;
  const vStrength = accDy / Math.max(1, accDx+accDy);
  const hStrength = accDx / Math.max(1, accDx+accDy);

  const greenish = avgG > avgR && avgG > avgB && (avgG - Math.min(avgR, avgB)) > 8;
  const bluish = avgB > avgR && avgB > avgG && (avgB - Math.min(avgR, avgG)) > 8;
  const likelyExterior = (greenish || bluish) && edgeDensity > 0.018 && (vStrength>0.55 || hStrength>0.55);

  const borderRatio = borderEdges / Math.max(1, interiorEdges);
  const trimDensity: 'low'|'medium'|'high' =
    borderRatio > 0.55 ? 'high' : borderRatio > 0.3 ? 'medium' : 'low';

  let estHeightFt: number | null = null;
  if (!likelyExterior && vStrength > 0.52) {
    if (vStrength > 0.70) estHeightFt = 10.0;
    else if (vStrength > 0.62) estHeightFt = 9.0;
    else estHeightFt = 8.0;
  }

  let patchScore = 0, samples=0;
  const step=40;
  for (let cy=step; cy<h-step; cy+=step) {
    for (let cx=step; cx<w-step; cx+=step) {
      let sum=0, sum2=0, cnt=0;
      for (let yy=-4; yy<=4; yy++){
        for (let xx=-4; xx<=4; xx++){
          const v = gray[(cy+yy)*w + (cx+xx)];
          sum += v; sum2 += v*v; cnt++;
        }
      }
      const mean = sum/cnt;
      const std = Math.sqrt(Math.max(0, sum2/cnt - mean*mean));
      patchScore += std; samples++;
    }
  }
  patchScore = samples ? patchScore/samples : 0;
  const drywallRepair: 'none'|'light'|'moderate'|'heavy' =
    patchScore > 22 ? 'heavy' : patchScore > 16 ? 'moderate' : patchScore > 11 ? 'light' : 'none';

  const interior = !likelyExterior;
  const confidence = Math.min(0.95, 0.5 + Math.abs(vStrength-hStrength) + Math.abs(borderRatio-0.3) + (interior ? 0.1 : 0.05));

  return { interior, trimDensity, estHeightFt, drywallRepair, confidence };
}
