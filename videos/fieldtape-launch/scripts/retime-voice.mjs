import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { dirname, join, resolve } from "node:path";

const project = resolve(process.cwd());
const sourceMeta = resolve(project, process.argv[2] ?? "audio_meta_slow.json");
const outputMeta = resolve(project, process.argv[3] ?? "audio_meta.json");
const rate = Number(process.argv[4] ?? "0.69");

if (!(rate >= 0.5 && rate <= 2)) {
  throw new Error(`atempo rate must be between 0.5 and 2; received ${rate}`);
}

const meta = JSON.parse(readFileSync(sourceMeta, "utf8"));
const outputDir = join(project, "assets", "voice-retimed");
mkdirSync(outputDir, { recursive: true });

for (const voice of meta.voices ?? []) {
  const source = resolve(project, voice.path);
  const basename = `${String(voice.frame).padStart(2, "0")}.wav`;
  const output = join(outputDir, basename);
  const result = spawnSync(
    "ffmpeg",
    ["-y", "-v", "error", "-i", source, "-filter:a", `atempo=${rate}`, output],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    throw new Error(`ffmpeg failed for frame ${voice.frame}: ${result.stderr}`);
  }

  voice.path = `assets/voice-retimed/${basename}`;
  voice.duration_s = Number((voice.duration_s / rate).toFixed(3));
  voice.words = (voice.words ?? []).map((word) => ({
    ...word,
    start: Number((word.start / rate).toFixed(3)),
    end: Number((word.end / rate).toFixed(3)),
  }));
}

writeFileSync(outputMeta, `${JSON.stringify(meta, null, 2)}\n`);
const total = (meta.voices ?? []).reduce((sum, voice) => sum + voice.duration_s, 0);
console.log(`retimed ${(meta.voices ?? []).length} voices at ${rate}x → ${total.toFixed(3)}s`);
