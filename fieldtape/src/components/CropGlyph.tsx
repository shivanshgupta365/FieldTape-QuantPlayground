export type CropKind = "wheat" | "carrot" | "tomato" | "strawberry" | "melon" | "goose" | "cow" | "sheep" | "weed" | "empty";

export function CropGlyph({ crop, stage = 3 }: { crop: CropKind; stage?: number }) {
  if (crop === "empty") return null;
  const scale = 0.55 + Math.min(3, Math.max(0, stage)) * 0.13;
  const colors: Record<CropKind, [string, string]> = {
    wheat: ["#d8a438", "#f0c964"],
    carrot: ["#4f813c", "#df7131"],
    tomato: ["#4e853e", "#d95639"],
    strawberry: ["#46783b", "#bb3f3f"],
    melon: ["#668b43", "#b7c96a"],
    goose: ["#eee4cb", "#d79a35"],
    cow: ["#e6d9bd", "#332820"],
    sheep: ["#e9e2cf", "#7f7362"],
    weed: ["#53644b", "#77866b"],
    empty: ["transparent", "transparent"],
  };
  const [leaf, fruit] = colors[crop];
  if (crop === "goose" || crop === "cow" || crop === "sheep") {
    const body = crop === "cow" ? "#e8ddc3" : crop === "sheep" ? "#f0e9d6" : "#eee4cb";
    const patch = crop === "cow" ? "#3d3027" : crop === "sheep" ? "#9c9382" : "#d79a35";
    return <svg className="crop-glyph animal-glyph" style={{ transform: `scale(${scale})` }} viewBox="0 0 32 32" aria-label={crop} role="img"><ellipse cx="16" cy="18" rx="10" ry="7" fill={body}/><circle cx="24" cy="13" r="5" fill={body}/><path d="M8 23v6m7-5v5m6-5v5" stroke={patch} strokeWidth="2"/><circle cx="26" cy="12" r="1" fill="#15140f"/>{crop === "cow" && <path d="M11 14l8 8m-2-9L9 21" stroke={patch} strokeWidth="3"/>}{crop === "sheep" && <path d="M8 15q8-8 16 0" fill="none" stroke={patch} strokeWidth="3"/>}{crop === "goose" && <path d="m28 14 4 2-4 2z" fill={patch}/>}</svg>;
  }
  return (
    <svg className="crop-glyph" style={{ transform: `scale(${scale})` }} viewBox="0 0 32 32" aria-label={`${crop}, growth stage ${stage}`} role="img">
      <path d="M16 28V12M16 18 9 12M16 20l7-7" stroke={leaf} strokeWidth="3" strokeLinecap="square" />
      <path d="M10 13C5 12 5 7 5 7s6-1 7 4M22 14c5-1 5-6 5-6s-6-1-7 4" fill={leaf} />
      {crop === "wheat" ? <path d="m12 9 4-6 4 6-4 5z" fill={fruit} /> : <circle cx="16" cy="10" r={crop === "melon" ? 7 : 5} fill={fruit} />}
    </svg>
  );
}
