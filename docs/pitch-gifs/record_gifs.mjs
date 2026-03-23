import { chromium } from 'playwright';
import { execSync } from 'child_process';
import { mkdirSync, existsSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const pages = [
  { file: '01_auto_filing.html', out: '01_auto_filing.gif', duration: 13000, fps: 10 },
  { file: '02_human_confirm_llm.html', out: '02_human_confirm_llm.gif', duration: 15000, fps: 10 },
  { file: '03_control_center.html', out: '03_control_center.gif', duration: 13000, fps: 10 },
];

async function recordPage({ file, out, duration, fps }) {
  const framesDir = path.join(__dirname, `_frames_${path.basename(file, '.html')}`);
  if (!existsSync(framesDir)) mkdirSync(framesDir, { recursive: true });

  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
  const page = await ctx.newPage();

  const filePath = path.join(__dirname, file);
  await page.goto(`file://${filePath.replace(/\\/g, '/')}`);

  // Wait for fonts
  await page.waitForTimeout(500);

  const interval = 1000 / fps;
  const totalFrames = Math.ceil(duration / interval);

  console.log(`  Recording ${totalFrames} frames...`);

  for (let i = 0; i < totalFrames; i++) {
    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath });
    await page.waitForTimeout(interval);
  }

  // Hold last frame for 3 more seconds
  for (let i = totalFrames; i < totalFrames + fps * 3; i++) {
    const framePath = path.join(framesDir, `frame_${String(i).padStart(4, '0')}.png`);
    await page.screenshot({ path: framePath });
  }

  await browser.close();

  // Convert to GIF using Python + Pillow
  const gifPath = path.join(__dirname, out);
  console.log(`  Converting to GIF...`);

  const pyScript = `
import glob, os
from PIL import Image

frames_dir = r"${framesDir.replace(/\\/g, '\\\\')}"
out_path = r"${gifPath.replace(/\\/g, '\\\\')}"

frame_files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.png")))
if not frame_files:
    print("No frames found!")
    exit(1)

frames = [Image.open(f).convert("RGB") for f in frame_files]
# Optimize: reduce to 256 colors per frame
frames[0].save(
    out_path,
    save_all=True,
    append_images=frames[1:],
    duration=${Math.round(interval)},
    loop=0,
    optimize=True,
)
print(f"Saved {len(frames)} frames -> {out_path}")

# Cleanup frames
import shutil
shutil.rmtree(frames_dir)
`;

  execSync(`python -c "${pyScript.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"`, { stdio: 'inherit' });
  console.log(`  ✓ ${out}`);
}

(async () => {
  for (const p of pages) {
    console.log(`\nRecording: ${p.file}`);
    await recordPage(p);
  }
  console.log('\nAll GIFs recorded!');
})();
