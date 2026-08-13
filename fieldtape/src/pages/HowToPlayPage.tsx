import { Fragment } from "react"
import { Link } from "react-router-dom"
import { useState } from "react"
import {
  ArrowRight,
  Banknote,
  CalendarClock,
  Coins,
  Droplets,
  Scissors,
  Sprout,
  TrendingDown,
  Users,
} from "lucide-react"
import { CROP_SPECS, CROP_IDS, MARKET_CURVES, DEFAULT_GAME_CONFIG } from "../game"
import type { CropId } from "../game"
import { BRAND } from "../brand"

const CROP_LABEL: Record<CropId, string> = {
  WHEAT: "Wheat",
  CARROT: "Carrot",
  TOMATO: "Tomato",
  STRAWBERRY: "Strawberry",
  MELON: "Melon",
}

const SHAPE: Record<CropId, string> = {
  WHEAT: "Pays fast, pays little. Your rent money.",
  CARROT: "A day slower, a little richer.",
  TOMATO: "Keeps paying once established.",
  STRAWBERRY: "Slow, expensive, best total haul.",
  MELON: "The lottery ticket. Enormous, and brutal if you plant it late.",
}

const STEPS = [
  {
    icon: Sprout,
    title: "Plant",
    body: "Pick an unlocked plot and choose a seed. The cost leaves your bank immediately; nothing comes back for days.",
  },
  {
    icon: Droplets,
    title: "Water — every single day",
    body: "An unwatered plant dies after two dry days, and a dead plot is worse than an empty one because you already paid for the seed.",
  },
  {
    icon: Scissors,
    title: "Harvest",
    body: "Crops reach full yield on a specific day. Cut early and you leave units in the ground; leave a one-time crop too long and it is destroyed.",
  },
  {
    icon: Banknote,
    title: "Sell into the market",
    body: "Every unit you sell pushes that price down. Dumping a full shed at once is the most expensive way to sell it.",
  },
  {
    icon: Users,
    title: "Hire hands",
    body: "Each hand adds 24 actions a day, and each hire today costs more than the last. Hire too late and you cannot service what you planted.",
  },
]

export function HowToPlayPage() {
  const [openCrop, setOpenCrop] = useState<CropId | null>(null)
  const turnsPerDay = DEFAULT_GAME_CONFIG.turnsPerDay
  const days = DEFAULT_GAME_CONFIG.days
  const totalTurns = turnsPerDay * days

  return (
    <div className="howto-page">
      <header className="howto-hero">
        <p className="eyebrow">How to play</p>
        <h1>You have {totalTurns.toLocaleString()} moves. Spend them well.</h1>
        <p className="howto-sub">
          {BRAND.name} looks like a farming game. It behaves like a budgeting problem with
          a deadline. Here is everything you need before your first season.
        </p>
      </header>

      {/* The one idea most players miss, so it goes first and gets its own block. */}
      <section className="howto-keystone">
        <div className="keystone-figure" aria-hidden="true">
          <div className="keystone-bar">
            <span style={{ width: "100%" }}>1 farmer · 24 actions</span>
          </div>
          <div className="keystone-bar need">
            <span style={{ width: "100%" }}>25 planted tiles · 25 waterings</span>
          </div>
          <p>One action short, before you plant, harvest, or sell anything.</p>
        </div>
        <div>
          <h2><CalendarClock size={20} /> Your real budget is moves, not money</h2>
          <p>
            Every worker gets {turnsPerDay} actions a day. Watering one tile is one action.
            So a single farmer cannot even water a full 25-tile quadrant — not
            <em> should not</em>, <strong>cannot</strong>. The arithmetic runs out before the day does.
          </p>
          <p>
            This is why expanding your farm can make you poorer. Land you cannot
            service grows weeds, and you already paid for the seed.
          </p>
        </div>
      </section>

      <section className="howto-steps">
        <h2>The loop</h2>
        <ol>
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <i aria-hidden="true"><step.icon size={19} /></i>
              <div>
                <h3><span>{index + 1}</span>{step.title}</h3>
                <p>{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="howto-crops">
        <h2>Every crop is a different bet</h2>
        <p className="howto-lead">
          Three numbers decide everything: what it costs, how long your money is
          stuck, and what comes back. Tap a row for the shape of the bet.
        </p>
        <table>
          <thead>
            <tr>
              <th>Crop</th>
              <th>Seed</th>
              <th>First yield</th>
              <th>Max units</th>
              <th>Base price</th>
            </tr>
          </thead>
          <tbody>
            {CROP_IDS.map((crop) => {
              const spec = CROP_SPECS[crop]
              const open = openCrop === crop
              return (
                <Fragment key={crop}>
                  <tr
                    className={open ? "open" : undefined}
                    onClick={() => setOpenCrop(open ? null : crop)}
                    tabIndex={0}
                    role="button"
                    aria-expanded={open}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault()
                        setOpenCrop(open ? null : crop)
                      }
                    }}
                  >
                    <td>{CROP_LABEL[crop]}</td>
                    <td>¢{spec.seedCost}</td>
                    <td>day {spec.firstYieldDay}</td>
                    <td>{spec.maxYield}</td>
                    <td>¢{MARKET_CURVES[crop].base}</td>
                  </tr>
                  {open && (
                    <tr className="crop-detail">
                      <td colSpan={5}>{SHAPE[crop]}</td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
        </table>
      </section>

      <section className="howto-market">
        <h2><TrendingDown size={20} /> The market moves against you</h2>
        <p>
          Prices are not fixed. Selling pushes the price down, and both farms sell
          into the same market — so a rival dumping strawberries hurts your
          strawberries too. Sell in slices, and sell after the town has eaten.
        </p>
      </section>

      <section className="howto-clock">
        <h2><Coins size={20} /> Day {days} does not care</h2>
        <p>
          The season is a hard wall. A melon needs {CROP_SPECS.MELON.firstYieldDay} days
          before its first unit — plant one on day 25 and you have simply set the money
          on fire. What is optimal on day 3 and on day 27 are not the same portfolio,
          and nothing in the game will tell you when it flipped.
        </p>
      </section>

      <footer className="howto-cta">
        <Link className="button button-gold" to="/play">Start your first season <ArrowRight size={17} /></Link>
        <Link className="button" to="/village">Walk the village first</Link>
        <Link className="button" to="/lab">Go deeper in the Lab</Link>
      </footer>
    </div>
  )
}
