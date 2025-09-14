import { promises as fs } from 'fs';
import path from 'path';

export async function ensureUploadsDir() {
  const dir = path.join(process.cwd(), 'uploads');
  try { await fs.mkdir(dir, { recursive: true }); } catch {}
  return dir;
}
