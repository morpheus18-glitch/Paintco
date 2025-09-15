import { NextRequest, NextResponse } from 'next/server';
import { EstimateInput } from '@lib/schema';
import { estimateFromPhotos as heuristicV2 } from '@lib/estimator';
import { estimatePro } from '@lib/estimator_pro';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const USE_PRO = process.env.USE_PRO_ESTIMATOR === '1';

function daysUntil(dateStr?: string | null) {
  if (!dateStr) return undefined;
  const target = new Date(String(dateStr));
  if (Number.isNaN(target.getTime())) return undefined;
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

export async function POST(req: NextRequest) {
  try {
    const fd = await req.formData();

    const blobs = fd.getAll('photos') as unknown as Blob[];
    if (!blobs || blobs.length === 0) {
      return NextResponse.json({ error: 'No photos uploaded' }, { status: 400 });
    }

    // ✅ Defaults so the client can send ONLY photos
    const heightFtRaw = fd.get('heightFt') ?? '9';
    const coatsRaw = fd.get('coats') ?? '2';
    const finishRaw = (fd.get('finish') as string) ?? 'eggshell';

    const parsed = EstimateInput.safeParse({
      heightFt: heightFtRaw,
      coats: coatsRaw,
      finish: finishRaw
    });
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    // Optional fields (unused in “no input” flow; safe defaults)
    const distanceMiles = Number(fd.get('distanceMiles') || 0);
    const preferredDays = Number(fd.get('preferredDays') || 0) || undefined;
    const rushToggle = String(fd.get('rush') || '') === 'true';
    const weekend = String(fd.get('weekend') || '') === 'true';

    // Optional deadline → automatic rush bump
    const deadlineStr = String(fd.get('deadline') || '') || undefined;
    const daysLeft = daysUntil(deadlineStr);
    const deadlineRush =
      typeof daysLeft === 'number' ? (daysLeft <= 3 ? 0.30 : daysLeft <= 7 ? 0.20 : 0) : 0;

    // Convert blobs to buffers
    const buffers: Buffer[] = [];
    for (const b of blobs) buffers.push(Buffer.from(await (b as Blob).arrayBuffer()));

    if (USE_PRO) {
      const result = await estimatePro(buffers, {
        ...parsed.data,
        distanceMiles,
        preferredDays,
        rush: rushToggle || deadlineRush > 0,
        weekend
      });

      if (deadlineRush > 0) {
        const mult = 1 + deadlineRush;
        result.rangeLow = +(result.rangeLow * mult).toFixed(2);
        result.rangeHigh = +(result.rangeHigh * mult).toFixed(2);
        (result as any).total = +(((result as any).total ?? result.subtotal) * mult).toFixed(2);
        result.notes.push(`Deadline premium applied: +${Math.round(deadlineRush * 100)}% based on date needed.`);
      }

      return NextResponse.json(result);
    } else {
      const result = await heuristicV2(buffers, parsed.data);
      if (rushToggle || deadlineRush > 0) {
        const mult = 1 + (rushToggle ? 0.07 : 0) + deadlineRush;
        result.subtotal = +(result.subtotal * mult).toFixed(2);
        result.rangeLow = +(result.rangeLow * mult).toFixed(2);
        result.rangeHigh = +(result.rangeHigh * mult).toFixed(2);
        result.notes.push(`Rush/deadline premium applied.`);
      }
      return NextResponse.json(result);
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to estimate' }, { status: 500 });
  }
}
