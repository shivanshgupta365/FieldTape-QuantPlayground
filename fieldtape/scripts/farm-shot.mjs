import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0,140)));
await p.goto((process.env.BASE ?? "http://localhost:5173") + "/play", { waitUntil: "networkidle" });
await p.waitForTimeout(2500);
// Plant a few crops so the board is not empty.
for (const i of [0,1,2,3]) {
  await p.locator(".farm3d-hit").nth(i * 11).click();
  await p.waitForTimeout(180);
  await p.keyboard.press("1");
  await p.waitForTimeout(220);
  const pick = p.locator(".crop-picker button").nth(i % 5);
  if (await pick.count()) { await pick.click(); await p.waitForTimeout(250); }
}
await p.waitForTimeout(900);
await p.screenshot({ path: "output/shots/farm3d.png" });
console.log("canvas:", await p.locator("canvas.farm3d-canvas").count());
console.log(errs.length ? "ERRORS: " + errs.slice(0,2).join(" | ") : "no console errors");
await b.close();
