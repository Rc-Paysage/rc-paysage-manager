// Génère les icônes PWA (PNG) à partir d'un rendu HTML, via le Chromium pré-installé.
const { chromium } = require("/opt/node22/lib/node_modules/playwright");
const path = require("path");
const fs = require("fs");

const outDir = path.resolve(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });

const html = (size) => `<!doctype html><html><body style="margin:0">
<div style="width:${size}px;height:${size}px;background:#1f7a5c;display:flex;align-items:center;justify-content:center;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <div style="color:white;font-weight:700;font-size:${Math.round(size * 0.42)}px;letter-spacing:-0.04em">eP</div>
</div></body></html>`;

(async () => {
  const browser = await chromium.launch({ executablePath: "/opt/pw-browsers/chromium" });
  for (const [name, size] of [["icon-192.png", 192], ["icon-512.png", 512], ["apple-touch-icon.png", 180]]) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(html(size));
    await page.screenshot({ path: path.join(outDir, name), clip: { x: 0, y: 0, width: size, height: size } });
    await page.close();
  }
  await browser.close();
  console.log("icons written to", outDir);
})();
