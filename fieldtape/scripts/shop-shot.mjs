import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
await p.goto((process.env.BASE ?? "http://localhost:5173") + "/village", { waitUntil: "networkidle" });
await p.waitForTimeout(900);
await p.locator(".village-canvas").click();
// Walk north-west toward the bakery, then interact.
for (const [key, ms] of [["ArrowUp", 1500], ["ArrowRight", 500]]) {
  await p.keyboard.down(key); await p.waitForTimeout(ms); await p.keyboard.up(key);
}
await p.waitForTimeout(400);
await p.keyboard.press("e");
await p.waitForTimeout(900);
const open = await p.locator(".shop-panel").count();
console.log(open ? "shop opened" : "no shop at this position");
if (open) console.log("title:", await p.locator(".shop-panel h2").innerText());
await p.screenshot({ path: "output/shots/shop.png" });
console.log(errs.length ? "ERRORS: " + errs[0] : "no console errors");
await b.close();
