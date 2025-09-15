// app/api/estimate/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { estimateFromPhotos } from '@lib/estimator';
import { EstimateInput } from '@lib/schema';

export const runtime = 'nodejs';       // required for sharp
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Parse multipart without formidable
    const fd = await req.formData();

    const blobs = fd.getAll('photos') as unknown as Blob[];
    if (!blobs || blobs.length === 0) {
      return NextResponse.json({ error: 'No photos uploaded' }, { status: 400 });
    }

    // Gather fields
    const heightFt = fd.get('heightFt');
    const coats = fd.get('coats');
    const finish = fd.get('finish');

    const parsed = EstimateInput.safeParse({ heightFt, coats, finish });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Convert Blobs to Buffers for sharp
    const buffers: Buffer[] = [];
    for (const b of blobs) {
      const ab = await (b as Blob).arrayBuffer();
      buffers.push(Buffer.from(ab));
    }

    const result = await estimateFromPhotos(buffers, parsed.data);
    return NextResponse.json(result);
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to estimate' }, { status: 500 });
  }
}
