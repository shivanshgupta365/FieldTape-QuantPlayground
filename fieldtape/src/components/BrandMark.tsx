import { BRAND } from "../brand"

/**
 * Alpstead mark: an alpine peak sitting on three furrows.
 *
 * Reads at 20px in a nav bar and at 512px on a store listing, which rules out
 * fine detail. The whole idea has to survive as four shapes — peak, snowline,
 * sun, furrows — so it stays legible as a favicon.
 */
export function BrandMark({ size = 32 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label={`${BRAND.name} logo`}
      fill="none"
    >
      <rect width="48" height="48" rx="10" fill="#15140f" />
      {/* Sun, low and warm — evening light on the valley. */}
      <circle cx="34" cy="15" r="4.5" fill="#e7a72f" />
      {/* Far peak, held back so the near peak reads as closer. */}
      <path d="M6 30 L15 15 L24 30 Z" fill="#3a5c33" />
      {/* Near peak with a snow cap. */}
      <path d="M16 32 L27 12 L38 32 Z" fill="#4f7a45" />
      <path d="M27 12 L32 21 L29.5 20 L27 22 L24.5 20 L22 21 Z" fill="#f5f0e3" />
      {/* Three furrows: the farm, and a horizon line for the lake. */}
      <rect x="5" y="34" width="38" height="2.4" rx="1.2" fill="#e7a72f" />
      <rect x="8" y="38.4" width="32" height="2.4" rx="1.2" fill="#b8842a" />
      <rect x="13" y="42.8" width="22" height="2.2" rx="1.1" fill="#6b4430" />
    </svg>
  )
}

/** Mark plus wordmark, for headers and the landing hero. */
export function BrandLockup({ size = 32, tagline = true }: { size?: number; tagline?: boolean }) {
  return (
    <span className="brand-lockup">
      <BrandMark size={size} />
      <span className="brand-words">
        <strong>{BRAND.name}</strong>
        {tagline && <small>{BRAND.tagline}</small>}
      </span>
    </span>
  )
}
