import { encodeImage } from "../lib/media/encode";
import { makePhoto } from "../tests/support/media-fixtures";

/** Prints the size of every generated variant for one synthetic 3000x2000 "photo" (no real photo is in the repo). */
async function main() {
  const t0 = Date.now();
  const source = await makePhoto(3000, 2000);
  const t1 = Date.now();
  const enc = await encodeImage(source, "image/jpeg");
  const t2 = Date.now();

  const kb = (n: number) => `${(n / 1024).toFixed(1).padStart(8)} KB`;
  console.log(`source JPEG (q88)     ${kb(source.length)}   3000x2000   (generated in ${t1 - t0} ms)`);
  console.log(`stored original       ${kb(enc.original.data.length)}   ${enc.original.width}x${enc.original.height}  (EXIF stripped, re-encoded mozjpeg q90)`);
  console.log("\nwidth    height     AVIF q50      WebP q78    JPEG q80 (fallback)");
  for (const v of enc.variants) {
    console.log(`${String(v.width).padStart(5)}  ${String(v.height).padStart(6)}  ${kb(v.avif.length)}  ${kb(v.webp.length)}  ${kb(v.fallback.length)}`);
  }
  const all = enc.variants.reduce((n, v) => n + v.avif.length + v.webp.length + v.fallback.length, 0) + enc.original.data.length;
  console.log(`\nencode time ${t2 - t1} ms; total on disk ${(all / 1024 / 1024).toFixed(2)} MB; dominant colour ${enc.dominantColor}; fallback ${enc.fallbackFormat}`);
  console.log(`a phone loading the 480 px AVIF downloads ${(enc.variants[0].avif.length / source.length * 100).toFixed(1)}% of the source bytes `);
}

main().catch((e: Error) => {
  console.error(e.message);
  process.exit(1);
});
