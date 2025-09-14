import { NextRequest, NextResponse } from 'next/server';
import formidable from 'formidable';
import { estimateFromPhotos } from '@lib/estimator';
import { EstimateInput } from '@lib/schema';

export const runtime = 'nodejs'; // required for sharp/formidable
export const dynamic = 'force-dynamic';

async function parseForm(req: NextRequest) {
  const contentType = req.headers.get('content-type') || '';
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json({ error: 'Expected multipart/form-data' }, { status: 400 });
  }

  const buffers: Buffer[] = [];
  const fields: Record<string, any> = {};

  // formidable needs a Node stream; NextRequest is web stream. Convert via arrayBuffer.
  const ab = await req.arrayBuffer();
  const form = formidable({ multiples: true, maxFiles: 5, maxFileSize: 10 * 1024 * 1024 });
  const [fieldsOut, filesOut] = await new Promise<[Record<string,any>, formidable.Files]>((resolve, reject) => {
    form.parse(Buffer.from(ab) as any, (err, flds, fls) => {
      if (err) reject(err);
      else resolve([flds, fls]);
    });
  }).catch((e)=>{ throw new Error('Upload parse failed: '+e.message); });

  Object.assign(fields, fieldsOut);

  const photos = filesOut['photos'];
  const list = Array.isArray(photos) ? photos : photos ? [photos] : [];
  for (const file of list) {
    // @ts-ignore
    const data: Buffer = file._writeStream?.buffer || file.toJSON?.().buffer;
    if (!data) throw new Error('Could not read file buffer');
    buffers.push(Buffer.from(data));
  }

  return { fields, buffers };
}

export async function POST(req: NextRequest) {
  try {
    const { fields, buffers } = await parseForm(req);
    if (buffers.length === 0) return NextResponse.json({ error: 'No photos uploaded' }, { status: 400 });

    const parsed = EstimateInput.safeParse({
      heightFt: fields.heightFt, coats: fields.coats, finish: fields.finish
    });
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

    const result = await estimateFromPhotos(buffers, parsed.data);
    return NextResponse.json(result);
  } catch (e:any) {
    return NextResponse.json({ error: e.message || 'Failed to estimate' }, { status: 500 });
  }
}
