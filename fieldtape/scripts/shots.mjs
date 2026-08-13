import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";
const BASE = process.env.BASE ?? "http://localhost:5173";
const ROUTES = process.env.ROUTES?.split(",") ?? ["/village","/how-to-play","/play","/"];
await mkdir("output/shots", { recursive: true });
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
const errs = [];
p.on("pageerror", (e) => errs.push(String(e)));
p.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0,110)));
for (const r of ROUTES) {
  errs.length = 0;
  const name = r === "/" ? "landing" : r.replace(/\//g,"").replace(/-/g,"");
  await p.goto(BASE + r, { waitUntil: "networkidle" });
  await p.waitForTimeout(1400);
  await p.screenshot({ path: `output/shots/${name}.png` });
  const txt = (await p.locator("body").innerText()).trim();
  console.log(`${(errs.length?"ERR ":"ok  ")}${r.padEnd(14)} ${String(txt.length).padStart(5)} chars ${errs[0]??""}`);
}
await b.close();
