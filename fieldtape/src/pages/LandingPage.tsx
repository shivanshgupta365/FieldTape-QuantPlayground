/**
 * Marketing landing page. The first thing anyone sees.
 *
 * Imports NOTHING from the 3D renderers. The previous version mounted a live
 * WebGL board in the hero, which pulled ~120 kB gzip of three.js and a GPU
 * context onto the most important page in the product before first paint. The
 * hero art here is inline SVG: a few hundred bytes, renders instantly, and looks
 * the same in a screenshot.
 */

import { Link } from "react-router-dom"
import {
  ArrowRight,
  CalendarClock,
  Coins,
  Mountain,
  Music,
  Sprout,
  TrendingDown,
  Trophy,
} from "lucide-react"
import { BRAND } from "../brand"
import { BrandMark } from "../components/BrandMark"

/** Static hero scene. Same palette and silhouettes as the game, zero runtime. */
function HeroArt() {
  return (
    <svg className="hero-art" viewBox="0 0 640 360" role="img" aria-label="The Alpstead valley at golden hour">
      <defs>
        <linearGradient id="hsky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5f86ad" />
          <stop offset="0.55" stopColor="#e2a765" />
          <stop offset="1" stopColor="#f0d3a4" />
        </linearGradient>
      </defs>
      <rect width="640" height="360" fill="url(#hsky)" />
      <circle cx="470" cy="96" r="26" fill="#f3c765" />

      {/* Far range with snow, then nearer ridges: the parallax stack, frozen. */}
      <path d="M0 190 L90 96 L150 150 L210 84 L300 190 Z" fill="#8fa9bd" />
      <path d="M210 84 L238 128 L224 122 L210 134 L196 122 L182 128 Z" fill="#eef1ef" />
      <path d="M250 200 L340 110 L430 200 Z" fill="#6d8c9c" />
      <path d="M340 110 L368 154 L354 148 L340 160 L326 148 L312 154 Z" fill="#eef1ef" />
      <path d="M400 205 L520 118 L640 205 Z" fill="#55786b" />

      {/* Lake, then the shore and meadow shelves. */}
      <rect y="205" width="640" height="52" fill="#4d7f96" />
      <rect y="205" width="640" height="8" fill="#6d9fb2" />
      <path d="M0 252 L640 244 L640 268 L0 276 Z" fill="#c8b48a" />
      <rect y="266" width="640" height="94" fill="#7ba36b" />
      <rect y="266" width="640" height="6" fill="#86ac72" />

      {/* Ploughed strips. */}
      {[292, 308, 324, 340].map((y) => (
        <g key={y}>
          <rect x="0" y={y} width="640" height="9" fill="#6b4430" />
          <rect x="0" y={y} width="640" height="2" fill="#835540" />
        </g>
      ))}

      {/* Chalet and barn, gabled. */}
      <g>
        <rect x="86" y="240" width="52" height="34" fill="#dcd3bd" />
        <path d="M78 240 L112 214 L146 240 Z" fill="#a9533c" />
        <rect x="96" y="252" width="12" height="12" fill="#f3d98a" />
        <rect x="118" y="252" width="12" height="12" fill="#f3d98a" />
      </g>
      <g>
        <rect x="470" y="246" width="64" height="30" fill="#8a4032" />
        <path d="M462 246 L502 222 L542 246 Z" fill="#5a3a2a" />
        <rect x="492" y="256" width="20" height="20" fill="#f2ede1" />
      </g>

      {/* Chapel spire, the village silhouette marker. */}
      <g>
        <rect x="292" y="236" width="26" height="38" fill="#e2ded1" />
        <path d="M292 236 L305 196 L318 236 Z" fill="#57707f" />
        <rect x="303" y="188" width="4" height="10" fill="#e7a72f" />
      </g>

      {/* Conifers. */}
      {[30, 208, 386, 610].map((x) => (
        <g key={x}>
          <rect x={x + 6} y="258" width="4" height="14" fill="#4a3520" />
          <path d={`M${x - 6} 258 L${x + 8} 226 L${x + 22} 258 Z`} fill="#2f5232" />
          <path d={`M${x - 2} 240 L${x + 8} 214 L${x + 18} 240 Z`} fill="#39603a" />
        </g>
      ))}

      {/* Tractor and farmer. */}
      <g>
        <rect x="200" y="296" width="34" height="14" fill="#c0392b" />
        <rect x="222" y="286" width="16" height="12" fill="#96271b" />
        <circle cx="208" cy="312" r="8" fill="#2b2118" />
        <circle cx="234" cy="314" r="6" fill="#2b2118" />
      </g>
      <g>
        <rect x="352" y="300" width="10" height="14" fill="#3f5d8c" />
        <rect x="351" y="288" width="12" height="14" fill="#d8dcc4" />
        <circle cx="357" cy="282" r="6" fill="#e8c39a" />
        <ellipse cx="357" cy="277" rx="11" ry="4" fill="#d8ac54" />
      </g>

      {/* Sheep. */}
      {[418, 442, 462].map((x, i) => (
        <g key={x}>
          <ellipse cx={x} cy={318 + i * 4} rx="10" ry="7" fill="#f2ede1" />
          <rect x={x + 7} y={314 + i * 4} width="7" height="6" fill="#2b2118" />
        </g>
      ))}
    </svg>
  )
}

const PILLARS = [
  {
    icon: CalendarClock,
    title: "Thirty days, and they do not wait",
    body: "A melon needs eleven days before its first unit. Plant one on day 25 and you have set the money on fire. What is optimal on day 3 is not optimal on day 27, and nothing tells you when it flipped.",
  },
  {
    icon: Coins,
    title: "Your budget is moves, not money",
    body: "Every worker gets 24 actions a day. Watering one tile is one action. So a single farmer cannot water a full quadrant — not should not, cannot. This is why expanding your farm can make you poorer.",
  },
  {
    icon: TrendingDown,
    title: "The market moves against you",
    body: "Prices are not fixed. Every unit you sell pushes that price down, and both farms sell into the same market. Dumping a full shed at once is the most expensive way to sell it.",
  },
]

const FEATURES = [
  { icon: Mountain, label: "A valley to roam", note: "256 units of alpine land, twenty places to find, on foot or by tractor" },
  { icon: Sprout, label: "A farm to run", note: "Plant, water, harvest, hire, expand — into one shared market" },
  { icon: Trophy, label: "A board to climb", note: "Full seasons, replayed on the server before they count" },
  { icon: Music, label: "Sound that never repeats", note: "Five ambient beds, synthesised live in the browser" },
]

export function LandingPage() {
  return (
    <div className="landing">
      <header className="landing-nav">
        <Link to="/" className="landing-brand" aria-label={BRAND.name}>
          <BrandMark size={34} />
          <strong>{BRAND.name}</strong>
        </Link>
        <nav>
          <Link to="/how-to-play">How to play</Link>
          <Link to="/story">About</Link>
          <Link className="button button-gold" to="/play">
            Play <ArrowRight size={15} />
          </Link>
        </nav>
      </header>

      <section className="landing-hero">
        <div className="hero-copy">
          <p className="eyebrow">{BRAND.location}</p>
          <h1>{BRAND.tagline}</h1>
          <p className="hero-pitch">{BRAND.pitch}</p>
          <div className="hero-actions">
            <Link className="button button-gold button-lg" to="/play">
              Start a season <ArrowRight size={17} />
            </Link>
            <Link className="button button-lg" to="/village">
              Walk the valley first
            </Link>
          </div>
          <p className="hero-note">No download. Set your board name once, then play.</p>
        </div>
        <HeroArt />
      </section>

      <section className="landing-hook">
        <p>
          Alpstead looks like a farming game. It behaves like a budgeting problem with a
          deadline.
        </p>
      </section>

      <section className="landing-pillars">
        {PILLARS.map((p) => (
          <article key={p.title}>
            <i aria-hidden="true"><p.icon size={22} /></i>
            <h2>{p.title}</h2>
            <p>{p.body}</p>
          </article>
        ))}
      </section>

      <section className="landing-features">
        <h2>What is in it</h2>
        <ul>
          {FEATURES.map((f) => (
            <li key={f.label}>
              <i aria-hidden="true"><f.icon size={19} /></i>
              <div>
                <strong>{f.label}</strong>
                <span>{f.note}</span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="landing-cta">
        <h2>One valley. Thirty days. One shared market.</h2>
        <Link className="button button-gold button-lg" to="/play">
          Enter {BRAND.name} <ArrowRight size={17} />
        </Link>
      </section>

      <footer className="landing-footer">
        <span>
          {BRAND.name} — {BRAND.tagline}
        </span>
        <span className="landing-footer-links">
          <Link to="/how-to-play">How to play</Link>
          <Link to="/village">The valley</Link>
          <Link to="/leaderboard">Leaderboard</Link>
          <Link to="/story">About</Link>
        </span>
        <small>A game, not a market. Invented crops, invented coins.</small>
      </footer>
    </div>
  )
}
