import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
await p.goto("http://localhost:5173/research", { waitUntil: "networkidle" });
await p.waitForTimeout(700);
const sliders = p.locator(".parameter-list input");
// [horizon, tiles, workers, premium, impact]
const configs = [
  [30, 12, 2, 30, 45],
  [30, 22, 3, 30, 70],
  [30, 30, 4, 20, 80],
  [30, 8,  1, 60, 45],
  [30, 22, 3, 70, 70],
];
for (const c of configs) {
  for (let i = 0; i < c.length; i++) await sliders.nth(i).fill(String(c[i]));
  await p.waitForTimeout(150);
  await p.locator(".research-buttons button.button-dark").click();
  await p.locator(".research-metrics").waitFor({ timeout: 120000 });
  // Wait until the run finishes (button returns to "Run").
  await p.waitForFunction(() => !document.querySelector(".research-progress"), { timeout: 120000 });
  await p.waitForTimeout(300);
  const m = await p.locator(".research-metrics dd").allInnerTexts();
  console.log(`tiles=${String(c[1]).padStart(2)} workers=${c[2]} premium=${String(c[3]).padStart(2)} impact=${String(c[4]).padStart(2)} -> terminal ${m[0].padStart(8)}  win ${m[1].padStart(4)}  lost ${m[2]}`);
}
await b.close();
