import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 950 } });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e).slice(0,200)));
await p.goto("http://localhost:5173/research", { waitUntil: "networkidle" });
await p.waitForTimeout(900);
console.log("before:", (await p.locator(".research-output header b").innerText()).trim(),
            "| empty state:", await p.locator(".research-empty").count());
await p.locator(".research-buttons button.button-dark").click();
// Wait for the run to finish and metrics to appear.
await p.locator(".research-metrics").waitFor({ timeout: 90000 });
await p.waitForTimeout(600);
console.log("after: ", (await p.locator(".research-output header b").innerText()).trim());
const metrics = await p.locator(".research-metrics dd").allInnerTexts();
console.log("metrics:", metrics.join("  |  "));
console.log("diagnostic:", (await p.locator(".diagnostic-note p").innerText()).replace(/\s+/g," ").slice(0,150));
await p.screenshot({ path: "output/shots/research.png" });
console.log(errs.length ? "ERRORS: " + errs[0] : "no errors");
await b.close();
