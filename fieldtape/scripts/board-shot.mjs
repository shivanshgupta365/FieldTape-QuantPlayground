import { chromium } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 760, height: 760 }, deviceScaleFactor: 2 });
await p.goto((process.env.BASE ?? "http://localhost:5173") + "/capture", { waitUntil: "networkidle" });
await p.waitForTimeout(800);
const el = await p.locator(".farm-canvas-wrap").first();
await el.screenshot({ path: "output/shots/board.png" });
console.log("board captured");
await b.close();
