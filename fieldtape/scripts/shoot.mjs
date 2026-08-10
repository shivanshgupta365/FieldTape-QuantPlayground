// Dev-only screenshot probe. Renders each route in a real browser and reports
// whether it painted anything, so "200 OK" from an SPA can't be mistaken for
// "the route works".
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://localhost:5173";
const OUT = "output/shots";
const ROUTES = ["/", "/play", "/watch", "/story", "/daily", "/labs", "/leaderboard"];

await mkdir(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

const errors = [];
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
page.on("pageerror", (e) => errors.push(String(e)));

for (const route of ROUTES) {
  errors.length = 0;
  const name = route === "/" ? "landing" : route.slice(1).replace(/\//g, "-");
  await page.goto(BASE + route, { waitUntil: "networkidle" });
  await page.waitForTimeout(400);

  const text = (await page.locator("body").innerText()).trim();
  await page.screenshot({ path: `${OUT}/${name}.png`, fullPage: false });

  const status = text.length < 40 ? "BLANK" : "ok";
  console.log(
    `${status.padEnd(6)} ${route.padEnd(14)} ${String(text.length).padStart(5)} chars` +
      (errors.length ? `  ${errors.length} console error(s): ${errors[0].slice(0, 90)}` : ""),
  );
}

await browser.close();
