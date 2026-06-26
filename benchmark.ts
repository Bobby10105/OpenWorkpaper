import fs from 'fs/promises';
import path from 'path';
import JSZip from 'jszip';
import crypto from 'crypto';

// Setup mock data
const numFiles = 10;
const testDir = path.join(process.cwd(), 'test_benchmark_uploads');

async function run() {
  await fs.mkdir(testDir, { recursive: true });

  const zip = new JSZip();
  const filesToRestore: any[] = [];

  for (let i = 0; i < numFiles; i++) {
    const filename = `file_${i}.txt`;
    zip.file(`attachments/${filename}`, crypto.randomBytes(1024 * 1024 * 5)); // 5MB each
    filesToRestore.push({ url: `/uploads/${filename}`, name: `File ${i}` });
  }

  // Measure sequential
  let start = performance.now();
  for (const f of filesToRestore) {
    if (f.url) {
      const diskFilename = path.basename(f.url);
      const zipFile = zip.file(`attachments/${diskFilename}`);
      if (zipFile) {
        const fileBuffer = await zipFile.async('nodebuffer');
        await fs.writeFile(path.join(testDir, diskFilename), fileBuffer);
      }
    }
  }
  let end = performance.now();
  const seqTime = end - start;

  // Clean up
  for (const f of filesToRestore) {
    await fs.unlink(path.join(testDir, path.basename(f.url)));
  }

  // Measure parallel
  start = performance.now();
  const restorePromises = filesToRestore.map(async (f) => {
    if (f.url) {
      const diskFilename = path.basename(f.url);
      const zipFile = zip.file(`attachments/${diskFilename}`);
      if (zipFile) {
        const fileBuffer = await zipFile.async('nodebuffer');
        await fs.writeFile(path.join(testDir, diskFilename), fileBuffer);
      }
    }
  });
  await Promise.all(restorePromises);
  end = performance.now();
  const parTime = end - start;

  // Clean up
  for (const f of filesToRestore) {
    await fs.unlink(path.join(testDir, path.basename(f.url)));
  }
  await fs.rmdir(testDir);

  console.log(`Sequential: ${seqTime.toFixed(2)}ms`);
  console.log(`Parallel: ${parTime.toFixed(2)}ms`);
  console.log(`Improvement: ${((seqTime - parTime) / seqTime * 100).toFixed(2)}%`);
}

run().catch(console.error);
