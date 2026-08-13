import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
const errs = [];
p.on("pageerror", (e) => errs.push("PAGEERROR: " + String(e).slice(0,300)));
p.on("console", (m) => m.type() === "error" && errs.push("CONSOLE: " + m.text().slice(0,300)));
await p.goto("http://localhost:5173/research", { waitUntil: "networkidle" });
await p.waitForTimeout(1200);
console.log("--- buttons on page ---");
const btns = await p.locator("button").all();
for (const btn of btns) console.log("  [" + (await btn.innerText()).replace(/\n/g," ").trim().slice(0,50) + "] disabled=" + await btn.isDisabled());
console.log("--- clicking each ---");
for (let i = 0; i < btns.length; i++) {
  const t = (await btns[i].innerText()).replace(/\n/g," ").trim().slice(0,40);
  try { await btns[i].click({ timeout: 3000 }); await p.waitForTimeout(500); console.log("  clicked:", t); }
  catch (e) { console.log("  FAILED to click:", t, String(e).slice(0,80)); }
}
await p.waitForTimeout(800);
await p.screenshot({ path: "output/shots/research.png", fullPage: true });
console.log(errs.length ? errs.slice(0,4).join("\n") : "no errors");
await b.close();
