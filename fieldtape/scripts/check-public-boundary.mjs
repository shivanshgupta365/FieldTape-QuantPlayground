import { readFile, readdir, stat } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const sourceRoot = join(root, "src");
const distRoot = join(root, "dist");
const errors = [];
const textExtensions = new Set([".ts", ".tsx", ".js", ".mjs", ".json", ".css", ".html", ".map"]);
const forbidden = [
  { label: "private agent import", pattern: /(?:from\s+|import\s*\()["'][^"']*(?:\.\.\/)+agent(?:\/|["'])/i },
  { label: "service-role credential", pattern: /SUPABASE_SERVICE_ROLE_KEY|service_role\s*[:=]/i },
  { label: "Kaggle credential", pattern: /KAGGLE_(?:KEY|USERNAME)/ },
];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (await Promise.all(entries.map(async (entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? walk(path) : [path];
  }))).flat();
}

for (const file of await walk(sourceRoot)) {
  if (!textExtensions.has(extname(file))) continue;
  const text = await readFile(file, "utf8");
  for (const rule of forbidden) if (rule.pattern.test(text)) errors.push(`${relative(root, file)} contains ${rule.label}`);
}

try {
  for (const file of await walk(distRoot)) {
    if (file.endsWith(".map")) errors.push(`${relative(root, file)} is a production source map`);
    if ((await stat(file)).size > 6_000_000) errors.push(`${relative(root, file)} exceeds the 6 MB public artifact guard`);
  }
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

if (errors.length) {
  console.error("Public-boundary check failed:\n" + errors.map((error) => `- ${error}`).join("\n"));
  process.exit(1);
}
console.log("Public-boundary check passed: no private imports, credential markers, source maps, or oversized artifacts.");
