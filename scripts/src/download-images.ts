/**
 * Download CloudFront images (/hobby/... paths) to local public/images/ directory.
 * Only downloads images that need signing — bandai-hobby.net direct links are left as-is.
 *
 * Usage:
 *   pnpm tsx scripts/src/download-images.ts
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const DATA_DIR = path.join(PROJECT_ROOT, 'public', 'data');
const IMAGES_DIR = path.join(PROJECT_ROOT, 'public', 'images');

const CLOUDFRONT_HOST = 'https://d3bk8pkqsprcvh.cloudfront.net';
const SIGN_API = 'https://assets-signedurl.bandai-hobby.net/get-signed-url';

interface ModelData {
  id: string;
  series: string;
  imageUrl: string;
  [key: string]: unknown;
}

async function ensureDir(dir: string) {
  await fs.mkdir(dir, { recursive: true });
}

async function getSignedUrl(imagePath: string): Promise<string | null> {
  try {
    const res = await fetch(`${SIGN_API}?path=${encodeURIComponent(imagePath)}`);
    if (!res.ok) return null;
    const data = (await res.json()) as { signedUrl?: string };
    return data.signedUrl ?? null;
  } catch {
    return null;
  }
}

async function downloadImage(url: string, destPath: string): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
      },
    });
    if (!res.ok) return false;
    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return false;
    await fs.writeFile(destPath, buffer);
    return true;
  } catch {
    return false;
  }
}

function getExtension(url: string): string {
  const clean = url.split('?')[0];
  const ext = path.extname(clean).toLowerCase();
  return ext || '.jpg';
}

async function main() {
  await ensureDir(IMAGES_DIR);

  let totalCount = 0;
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const series of ['hg', 'rg', 'mg', 'pg']) {
    const seriesImgDir = path.join(IMAGES_DIR, series);
    const filePath = path.join(DATA_DIR, `${series}.json`);

    let rawContent: string;
    try {
      rawContent = await fs.readFile(filePath, 'utf-8');
    } catch {
      continue;
    }

    const data: ModelData[] = JSON.parse(rawContent);
    const needDownload = data.filter(
      (d) => d.imageUrl.startsWith('/hobby/') || d.imageUrl.includes('cloudfront.net'),
    );

    if (needDownload.length === 0) {
      console.log(`[${series}] No CloudFront images, skipping.`);
      continue;
    }

    await ensureDir(seriesImgDir);
    console.log(`[${series}] ${needDownload.length} images to download...`);

    for (const model of needDownload) {
      totalCount++;
      const ext = getExtension(model.imageUrl);
      const localFilename = `${model.id}${ext}`;
      const localPath = path.join(seriesImgDir, localFilename);
      const localUrl = `images/${series}/${localFilename}`;

      // Skip if already downloaded
      try {
        const stat = await fs.stat(localPath);
        if (stat.size > 100) {
          model.imageUrl = localUrl;
          skipCount++;
          continue;
        }
      } catch {
        // proceed
      }

      // Extract /hobby/... path from either format
      let hobbyPath: string;
      if (model.imageUrl.startsWith('/hobby/')) {
        hobbyPath = model.imageUrl;
      } else {
        // Full CloudFront URL — extract pathname
        try {
          hobbyPath = new URL(model.imageUrl).pathname;
        } catch {
          hobbyPath = model.imageUrl;
        }
      }

      // Get fresh signed URL, fallback to unsigned
      const signed = await getSignedUrl(hobbyPath);
      const downloadUrl = signed ?? `${CLOUDFRONT_HOST}${hobbyPath}`;

      const ok = await downloadImage(downloadUrl, localPath);
      if (ok) {
        model.imageUrl = localUrl;
        successCount++;
        console.log(`  OK: ${model.id}`);
      } else {
        failCount++;
        console.warn(`  FAIL: ${model.id} - ${downloadUrl}`);
      }

      await new Promise((r) => setTimeout(r, 100));
    }

    await fs.writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf-8');
    console.log(`[${series}] Saved.`);
  }

  console.log('\n' + '='.repeat(40));
  console.log(`Downloaded: ${successCount}`);
  console.log(`Skipped:    ${skipCount}`);
  console.log(`Failed:     ${failCount}`);
  console.log(`Total:      ${totalCount}`);
  console.log('='.repeat(40));
}

main().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
