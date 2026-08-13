import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 820 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0,200)));
p.on("console", (m) => m.type()==="error" && errs.push(m.text().slice(0,160)));
await p.goto("http://localhost:5173/village", { waitUntil: "networkidle" });
await p.waitForTimeout(4000);
await p.locator(".v3d-canvas").click({ position: { x: 700, y: 400 } });
await p.locator(".v3d-wrap").screenshot({ path: "output/shots/v3d-ground.png" });
console.log("ground prompt:", await p.locator(".v3d-prompt").count() ? (await p.locator(".v3d-prompt").innerText()).trim() : "(none)");

// Walk toward the helicopter at (16,26) from spawn (6,30), then board.
for (let i=0;i<4;i++){ await p.keyboard.down("d"); await p.waitForTimeout(400); await p.keyboard.up("d"); await p.waitForTimeout(150); }
await p.waitForTimeout(500);
const prompt = await p.locator(".v3d-prompt").count() ? (await p.locator(".v3d-prompt").innerText()).trim() : "(none)";
console.log("near-heli prompt:", prompt);
await p.keyboard.press("f");
await p.waitForTimeout(700);
console.log("riding:", await p.locator(".v3d-vehicle").count() ? (await p.locator(".v3d-vehicle").innerText()).trim() : "(not shown)");

// Climb.
for (let i=0;i<8;i++){ await p.keyboard.down(" "); await p.waitForTimeout(500); await p.keyboard.up(" "); await p.waitForTimeout(120); }
await p.waitForTimeout(400);
console.log("altitude prompt:", await p.locator(".v3d-prompt").count() ? (await p.locator(".v3d-prompt").innerText()).trim() : "(none)");
await p.locator(".v3d-wrap").screenshot({ path: "output/shots/v3d-flight.png" });
console.log(errs.length ? "ERRORS: " + errs.slice(0,2).join(" | ") : "no console errors");
await b.close();
