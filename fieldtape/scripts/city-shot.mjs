import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 820 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0,220)));
p.on("console", (m) => m.type()==="error" && errs.push(m.text().slice(0,180)));
const t0 = Date.now();
await p.goto("http://localhost:5173/village", { waitUntil: "networkidle" });
await p.waitForTimeout(5000);
console.log("load+build:", ((Date.now()-t0)/1000).toFixed(1)+"s");
console.log("district:", await p.locator(".v3d-district").count() ? (await p.locator(".v3d-district").innerText()).trim() : "(none)");
await p.locator(".v3d-wrap").screenshot({ path: "output/shots/city-ground.png" });
// Fly up for a skyline shot.
await p.locator(".v3d-canvas").click({ position: { x: 700, y: 400 } });
for (let i=0;i<4;i++){ await p.keyboard.down("d"); await p.waitForTimeout(400); await p.keyboard.up("d"); await p.waitForTimeout(120); }
await p.keyboard.press("f");
await p.waitForTimeout(500);
for (let i=0;i<10;i++){ await p.keyboard.down(" "); await p.waitForTimeout(500); await p.keyboard.up(" "); await p.waitForTimeout(100); }
await p.waitForTimeout(600);
console.log("altitude:", await p.locator(".v3d-prompt").count() ? (await p.locator(".v3d-prompt").innerText()).trim() : "(none)");
await p.locator(".v3d-wrap").screenshot({ path: "output/shots/city-air.png" });
console.log("fullscreen button:", await p.locator(".v3d-fullscreen").count() ? (await p.locator(".v3d-fullscreen").innerText()).trim() : "MISSING");
console.log(errs.length ? "ERRORS: " + errs.slice(0,2).join(" | ") : "no console errors");
await b.close();
