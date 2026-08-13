import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 760 } });
await p.goto((process.env.BASE ?? "http://localhost:5173") + "/village", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
for (const [v, name] of [[4, "dusk"], [5, "night"]]) {
  await p.locator(".village-time input").fill(String(v));
  await p.waitForTimeout(700);
  await p.locator(".village-wrap").screenshot({ path: `output/shots/village-${name}.png` });
  console.log(name, "->", await p.locator(".village-time b").innerText());
}
await b.close();
