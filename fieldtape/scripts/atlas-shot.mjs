// Dev-only: screenshot the /capture sprite sheet so the pixel art can be
// reviewed without playing 12 in-game days to see a mature melon.
import { chromium } from "@playwright/test";
import { mkdir } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://localhost:5173";
await mkdir("output/shots", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 900, height: 1000 } });
const errors = [];
page.on("pageerror", (e) => errors.push(String(e)));
page.on("console", (m) => m.type() === "error" && errors.push(m.text()));

await page.goto(`${BASE}/capture`, { waitUntil: "networkidle" });
await page.waitForTimeout(600);
await page.screenshot({ path: "output/shots/atlas.png", fullPage: true });

console.log(errors.length ? `ERRORS: ${errors.join("; ")}` : "atlas rendered clean");
await browser.close();
