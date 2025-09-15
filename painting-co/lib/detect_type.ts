import sharp from 'sharp';

export type ProjectType = 'interior_walls' | 'fence' | 'deck' | 'custom_shoes';

export type DetectedType = {
  type: ProjectType;
  confidence: number;
  complexity: 'simple'|'medium'|'complex';
  meta?: Record<string, number>;
};

export async function detectProjectType(buffers: Buffer[]): Promise<DetectedType> {
  const buf = buffers[0];
  const { data, info } = await sharp(buf)
    .resize({ width: 640, withoutEnlargement: true })
    .toColorspace('rgb')
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width, h = info.height, N = w*h;
  const gray = new Uint8Array(N);
  let satSum=0, rSum=0, gSum=0, bSum=0;

  for (let i=0, p=0; i<N; i++, p+=3) {
    const r = data[p], g = data[p+1], b = data[p+2];
    rSum += r; gSum += g; bSum += b;
    const y = (0.299*r + 0.587*g + 0.114*b) | 0;
    gray[i] = y;
    const max = Math.max(r,g,b), min = Math.min(r,g,b);
    satSum += max === 0 ? 0 : (max - min)/max;
  }
  const avgSat = satSum / N;
  const avgR = rSum/N, avgG = gSum/N, avgB = bSum/N;

  let edges=0, accDx=0, accDy=0;
  const EDGE_T = 52;
  for (let y=1; y<h-1; y++) {
    for (let x=1; x<w-1; x++) {
      const i = y*w + x;
      const g00=gray[(y-1)*w + (x-1)], g01=gray[(y-1)*w + x], g02=gray[(y-1)*w + (x+1)];
      const g10=gray[y*w + (x-1)],   g12=gray[y*w + (x+1)];
      const g20=gray[(y+1)*w + (x-1)], g21=gray[(y+1)*w + x], g22=gray[(y+1)*w + (x+1)];
      const dx = (g02 + 2*g12 + g22) - (g00 + 2*g10 + g20);
      const dy = (g20 + 2*g21 + g22) - (g00 + 2*g01 + g02);
      const mag = Math.abs(dx) + Math.abs(dy);
      if (mag > EDGE_T) { edges++; accDx += Math.abs(dx); accDy += Math.abs(dy); }
    }
  }
  const edgeDensity = edges / N;
  const vStrength = accDy / Math.max(1, accDx + accDy);
  const hStrength = accDx / Math.max(1, accDx + accDy);
  const orientRatio = Math.max(vStrength, hStrength) / Math.max(0.001, Math.min(vStrength, hStrength));

  const brownish = avgR>avgG && avgG>avgB && avgR-avgB>15;

  const TILE = 32;
  let tileEdgeVar = 0, tCount=0;
  for (let yy=0; yy<=h-TILE; yy+=TILE) {
    for (let xx=0; xx<=w-TILE; xx+=TILE) {
      let e=0;
      for (let y2=yy+1; y2<yy+TILE-1; y2++)
        for (let x2=xx+1; x2<xx+TILE-1; x2++) {
          const i = y2*w + x2;
          const gx = gray[i+1]-gray[i-1];
          const gy = gray[i+w]-gray[i-w];
          if (Math.abs(gx)+Math.abs(gy) > 80) e++;
        }
      tileEdgeVar += e; tCount++;
    }
  }
  tileEdgeVar = tCount ? tileEdgeVar/tCount : 0;

  let sDeck=0, sFence=0, sShoes=0, sWalls=0;

  if (brownish && hStrength>0.55 && orientRatio>1.2 && edgeDensity>0.02) sDeck += 0.6;
  if (tileEdgeVar>140) sDeck += 0.2;
  if (avgSat<0.35) sDeck += 0.1;

  if (brownish && vStrength>0.58 && orientRatio>1.25 && edgeDensity>0.02) sFence += 0.6;
  if (tileEdgeVar>140) sFence += 0.2;
  if (avgSat<0.35) sFence += 0.1;

  if (avgSat>0.35 && edgeDensity>0.018) sShoes += 0.6;
  if (!brownish && Math.abs(vStrength-hStrength)<0.1) sShoes += 0.2;

  if (edgeDensity<0.018 && Math.abs(vStrength-hStrength)<0.2) sWalls += 0.6;
  if (!brownish) sWalls += 0.1;

  const scores = [
    { type:'deck', v:sDeck },
    { type:'fence', v:sFence },
    { type:'custom_shoes', v:sShoes },
    { type:'interior_walls', v:sWalls },
  ] as const;
  const top = scores.reduce((a,b)=> b.v>a.v? b:a);
  const confidence = Math.max(0.35, Math.min(0.95, top.v));
  const complexity = (avgSat>0.42 || edgeDensity>0.03) ? 'complex' : (avgSat>0.28 || edgeDensity>0.02) ? 'medium' : 'simple';

  return { type: top.type, confidence, complexity, meta: { edgeDensity, vStrength, hStrength, avgSat } };
}
