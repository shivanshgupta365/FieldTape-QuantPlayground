import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1000, height: 600 } });
await p.goto("http://localhost:5173/village", { waitUntil: "networkidle" });
await p.waitForTimeout(3500);
await p.locator(".v3d-canvas").click({ position: { x: 500, y: 300 } });
for (let i = 1; i <= 10; i++) {
  await p.keyboard.down("d"); await p.waitForTimeout(400); await p.keyboard.up("d");
  await p.waitForTimeout(250);
  const n = await p.locator(".v3d-prompt").count();
  const t = n ? (await p.locator(".v3d-prompt").innerText()).trim() : "-";
  console.log(`step ${i} (${i*0.4}s of D): ${t}`);
  if (n) break;
}
await b.close();
