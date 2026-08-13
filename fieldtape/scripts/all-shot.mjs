import { chromium } from "@playwright/test";
const b = await chromium.launch({ args: ["--use-gl=angle","--use-angle=swiftshader","--enable-unsafe-swiftshader"] });
const p = await b.newPage({ viewport: { width: 1440, height: 900 } });
for (const r of ["/","/play","/village","/watch","/daily","/how-to-play","/leaderboard","/lab"]) {
  const errs = [];
  p.on("pageerror", (e) => errs.push(String(e)));
  await p.goto((process.env.BASE ?? "http://localhost:5173") + r, { waitUntil: "networkidle" });
  await p.waitForTimeout(1800);
  const txt = (await p.locator("body").innerText()).trim();
  console.log(`${(errs.length ? "ERR " : "ok  ")}${r.padEnd(14)} ${String(txt.length).padStart(5)} chars ${errs[0]?.slice(0,90) ?? ""}`);
  p.removeAllListeners("pageerror");
}
await b.close();
