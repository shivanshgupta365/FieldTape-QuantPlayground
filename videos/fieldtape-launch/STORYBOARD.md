---
format: 1920x1080
duration: 56s
message: "FieldTape turns Kaggriculture's public farming mechanics into a playable lesson in capital allocation under pressure"
arc: "Demo Loop: stakes → product → action constraint → scaling trade-off → market impact → risk and deadline → CTA"
audience: "Kaggle competitors, quant-curious builders, strategy-game players, and game developers"
mode: autonomous
music: none
captions: true
---

## Video direction

- Palette: warm paper canvas and ink carry every frame; soil brown belongs to farm surfaces, harvest gold marks opportunity/action, market cyan marks price/flow, and risk red is reserved for the season wall or a loss-of-control warning. Dark surfaces use warm navy/ink rather than pure black.
- Type: display scale carries hooks and section claims; body scale explains one decision only; mono/index scale labels turns, days, bank, price, and probability. Real UI remains readable and is never buried under decorative copy.
- Motion grammar: one paused deterministic timeline per frame, smooth long-tail settles, and VO-paced sequential reveals across the back half. Use only the named moves and rules; no bounce as a default. Every screenshot crop is clipped inside a sharp editorial frame and all critical content stays above the bottom caption band.
- Rhythm: Frames 1, 4, and 5 build in clear beats; Frame 2 locks wide after its single reveal; Frame 6 allocates a still read after the season wall; Frame 7 is the calmest held card. During holds, use stillness or one bounded subtle jitter only.
- Negative list: no glossy AI gradients, bokeh, browser chrome, fake cursors, generic feature cards, floating independent elements, lazy breathing, back-half camera drift, random particles, slideshow front-loading, screensaver motion, or private-agent material.

## Frame 1 — The Constraint

- scene: Three hard numeric beats make the season feel finite before the product appears
- voiceover: "Seven hundred twenty moves. Thirty days. One shared market."
- duration: 5.565s
- poster: 2.1s
- transition_in: cut
- status: animated
- src: compositions/frames/01-the-constraint.html
- type: hook
- persuasion: Stakes compression
- beat: tension + curiosity
- blueprint: kinetic-type-beats — three escalating number beats resolving on the market
- asset_candidates:
- focal: typography only
- roles: no captured asset; numbers and words are the subject
- sfx: impact-bass-1

narrativeRole: Establish the binding world in outcome language; the viewer immediately understands this is a finite strategic contest.
keyMessage: Every decision competes for scarce time inside one coupled economy.

kinetic-type-beats (Adapt): keep the centered-beat-triptych signature and its arrive-hold-clear law; replace playful spring punctuation with clean hard cuts and one market-cyan rule.
Scene 1 (0.0–1.6s): warm paper field; “720” arrives alone as a value-scaled counter while “MOVES” locks beneath in mono — Centered, primary visual fills the upper 58%, ink over paper, with a gold index rule drawing in beside it (`counting-dynamic-scale`, `svg-path-draw`).
Scene 2 (1.6–3.1s): at the second spoken cue, hard-cut the center state to “30 DAYS”; the outgoing number clears at peak velocity and the new phrase lands full-opacity with a short motion-blur streak that resolves sharp — same anchor, no co-resident copy (`discrete-text-sequence`, `motion-blur-streak`; velocity-matched waterfall cut).
Scene 3 (3.1–5.565s): on “one shared market,” hard-cut to a wide two-line lockup; a market-cyan line self-draws between two small farm labels, then the phrase holds still through the cut — Centered full-width strip, three depth layers from paper texture, ink type, and cyan rule (`discrete-text-sequence`, `svg-path-draw`).

## Frame 2 — Meet FieldTape

- scene: The real split-farm spectator opens from a tight clock detail into the whole shared-market board
- voiceover: "FieldTape turns a cozy farm into a playable lesson in capital allocation."
- duration: 7.729s
- poster: 5.4s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/02-meet-fieldtape.html
- type: product_intro
- persuasion: Category reframing
- beat: surprise + clarity
- blueprint: zoom-out-workspace-reveal — clock detail re-scopes into the full spectator surface
- asset_candidates: assets/watch-start.png — split-farm spectator, town, market, banks, lead, clock, controls, and scrubber
- focal: assets/watch-start.png
- roles: watch-start.png = background and hero surface; clock = tight detail; FieldTape thesis = foreground annotation
- sfx: whoosh-cinematic

narrativeRole: Land the value promise by beat two and reveal the actual product as proof.
keyMessage: The farm is the interface; capital allocation is the lesson.

zoom-out-workspace-reveal (Reproduce): the real spectator is authored once at final layout; one outward move re-scopes a clock detail into the full two-farm world, then the camera stops.
Scene 1 (0.0–2.0s): open full-bleed on the screenshot’s day/turn clock, magnified but kept crisp; a gold “SCARCE TIME” index types beside the real digits — layered-depth close-up, no other UI visible (`dynamic-content-sequencing`).
Scene 2 (2.0–5.6s): one continuous decelerating zoom-out reveals clock → shared town → both farms → bank lead, with the screenshot living inside a sharp warm-paper editorial frame; “cozy farm” appears at the intermediate scale and “capital allocation” waits until the full board lands — full-width hero occupying the top 76%, one world wrapper only (`viewport-change`, `coordinate-target-zoom`, `dynamic-content-sequencing`).
Scene 3 (5.6–7.729s): camera locked wide; a small FieldTape wordmark and “PLAYABLE QUANT LESSON” rule reveal above the spectator while the real board holds completely still — asymmetric 70/30 hierarchy, product surface dominant, caption band clear (`svg-path-draw`; static hold).

## Frame 3 — Actions Are Capital

- scene: A real planting action changes bank, clock, selected tile, and market while the frame annotates the obligation it creates
- voiceover: "Planting is easy. Servicing every tile before the clock runs out is the trade."
- duration: 7.668s
- poster: 6.2s
- transition_in: crossfade
- status: animated
- src: compositions/frames/03-actions-are-capital.html
- type: feature_showcase
- persuasion: Show-don't-tell proof
- beat: pressure + understanding
- blueprint: device-surface-showcase — one real interface held as hero while the action consequences are revealed
- asset_candidates: assets/play-after-plant.png — real Play route after a wheat planting, with farm plots, bank, clock, market, selected-tile ledger, and action dock
- focal: assets/play-after-plant.png
- roles: play-after-plant.png = hero surface; bank and clock = supporting evidence; obligation annotation = foreground
- sfx: click-soft

narrativeRole: Convert the first interaction into the central quant lesson: actions, not cash, bind the strategy.
keyMessage: An asset is only valuable if the action budget can service it.

device-surface-showcase (Adapt): keep a persistent real interface and discrete state beats; remove invented cursor choreography and use evidence callouts tied to the captured planting result.
Scene 1 (0.0–1.8s): the Play screenshot settles into a wide, slightly tilted paper frame; the farm grid is the largest object and everything outside it dims, while a gold “PLANT” receipt slides directly into the upper-left margin — asymmetric 70/30, four depth layers (`depth-of-field-blur`).
Scene 2 (1.8–3.6s): on “planting is easy,” the selected tile and −10 bank delta receive synchronized line strokes; one seed icon drops into the receipt and the action count advances — same hero surface, cause and cost coupled (`svg-path-draw`, `discrete-text-sequence`).
Scene 3 (3.6–5.9s): as “servicing every tile” arrives, three thin obligation lines extend from the planted tile to WATER / RETURN / HARVEST labels one at a time; the clock receives a cyan progress fill that shortens with each label — rule-of-thirds annotation over the upper 76%, sequential back-half reveal (`svg-path-draw`, `stat-bars-and-fills`).
Scene 4 (5.9–7.668s): “THE TRADE: TIME, NOT CASH” types into the freed right column as the farm and evidence hold static; one red bracket frames the remaining-turn readout, then everything rests — strong 3:1 hierarchy, no camera motion (`discrete-text-sequence`, `svg-path-draw`; static hold).

## Frame 4 — Scale Has Carry

- scene: Harvest, hire, and land-expansion decisions assemble around the real farm as obligations rather than feature badges
- voiceover: "Harvest. Hire. Expand. Every action you add is another obligation."
- duration: 7.606s
- poster: 7.6s
- transition_in: push-slide LEFT
- status: animated
- src: compositions/frames/04-scale-has-carry.html
- type: benefit_highlight
- persuasion: Feature-to-cost translation
- beat: control + caution
- blueprint: grid-card-assemble — three decision receipts assemble and stay co-resident around the live farm surface
- asset_candidates: assets/play-after-plant.png — real Play route with visible action dock and farm state
- focal: assets/play-after-plant.png
- roles: play-after-plant.png = background hero; HARVEST/HIRE/EXPAND receipts = foreground decision field
- sfx: pop

narrativeRole: Show why growth is not automatically good; every expansion purchases future workload.
keyMessage: Scale is a liability until enough hands and turns can carry it.

grid-card-assemble (Adapt): keep the accumulating co-resident list signature; use three ledger receipts as obligations, not a decorative feature grid, and reserve the last third for the liability payoff.
Scene 1 (0.0–1.4s): real farm surface seats left in a clipped 60/40 editorial split while an empty ledger column opens right; “SCALE HAS CARRY” draws on as a mono index above it — screenshot remains ≥55% of the canvas and top aligned (`svg-path-draw`).
Scene 2 (1.4–2.8s): on “harvest,” the HARVEST receipt enters directly into ledger slot one with a gold return figure and a cyan turn-cost bar; no other receipt is visible yet (`center-outward-expansion` short-path form, `stat-bars-and-fills`).
Scene 3 (2.8–4.2s): on “hire,” the HIRE receipt enters slot two; an extra HAND badge lights, but its recurring 24-turn capacity line arrives a beat later — vertical-list build, gold opportunity above cyan capacity (`center-outward-expansion`, `discrete-text-sequence`).
Scene 4 (4.2–5.6s): on “expand,” LAND enters slot three directly into its authored slot as its empty-tile footprint self-draws behind the receipt — list remains co-resident, no floating cards (`center-outward-expansion`, `svg-path-draw`).
Scene 5 (5.6–7.606s): the three receipt totals align into one risk-red “OBLIGATIONS” column; “MORE ASSETS ≠ MORE CONTROL” reveals beneath and holds while the screenshot stays readable — asymmetric 60/40 final ledger, static camera (`discrete-text-sequence`; held read).

## Frame 5 — Your Sale Moves Their Price

- scene: The spectator board yields to a cyan price trace that bends downward as a sell order lands, then reconnects to both farms
- voiceover: "Sell into one shared market, and price moves against you. Timing becomes risk."
- duration: 7.328s
- poster: 8.7s
- transition_in: squeeze
- status: animated
- src: compositions/frames/05-shared-market.html
- type: feature_showcase
- persuasion: Mechanism reveal
- beat: intrigue + strategic power
- blueprint: video-text-pivot — the real spectator surface slides aside to hand weight to the market-impact curve
- asset_candidates: assets/watch-start.png — shared-market spectator at season opening; assets/watch-terminal.png — terminal spectator with final banks and season completion
- focal: assets/watch-start.png
- roles: watch-start.png = hero surface; watch-terminal.png = supporting terminal receipt; price curve = foreground data instrument
- sfx: notification

narrativeRole: Reveal the coupling that turns a solo farm into a game against another allocator.
keyMessage: Execution changes the opportunity set; selling is not price-taking.

video-text-pivot (Adapt): preserve the signature weight transfer from real product surface to one hero data instrument; replace the required video clip with a clipped spectator still whose internal bank/market labels animate independently.
Scene 1 (0.0–1.5s): `watch-start.png` arrives centered in a wide dark-ink frame; FARM A / FARM B bank figures and the central market are the only bright regions, connected by one market-cyan rule — layered-depth hero, camera static (`svg-path-draw`).
Scene 2 (1.5–3.3s): on “sell into one shared market,” the spectator slides and scales into the left 42% while a large cyan price curve self-draws into the exact space it vacates; a SELL 120 order stamp lands at the curve’s peak — same-anchor weight transfer, asymmetric 40/60 (`scale-swap-transition`, `svg-path-draw`).
Scene 3 (3.3–5.3s): as “price moves against you,” a tracking line scrubs across the curve and the quoted value steps down at the sell marker; the terminal screenshot appears as a narrow supporting bank receipt beneath the chart — data and consequence reveal on the spoken cue (`chart-scrub-readout`, `discrete-text-sequence`).
Scene 4 (5.3–7.328s): surface and receipt clear to the margins; “TIMING BECOMES RISK” types into center while a cyan rule seats beneath TIMING and a red bracket frames RISK one beat later, then the read holds still — Centered upper 65%, caption band empty (`discrete-text-sequence`, `svg-path-draw`).

## Frame 6 — The Objective Flips

- scene: P(win) rises on the completed variance lab, then a red season wall cuts the timeline at day 30 and terminal scores replace the chart
- voiceover: "Behind, variance can save you. Ahead, the hard season wall rewards control."
- duration: 7.822s
- poster: 6.8s
- transition_in: zoom-through
- status: animated
- src: compositions/frames/06-objective-flips.html
- type: benefit_highlight
- persuasion: Decision-rule reversal
- beat: revelation + urgency
- blueprint: dataviz-countup — probability result and deadline become the argument
- asset_candidates: assets/lab-variance-result.png — completed prediction-first variance lab with P(win) result; assets/watch-terminal.png — turn-720 result and day-30 terminal state
- focal: assets/lab-variance-result.png
- roles: lab-variance-result.png = hero data surface; watch-terminal.png = supporting terminal receipt; day-30 wall = foreground risk instrument
- sfx: ping

narrativeRole: Teach that maximizing expected coins is not always maximizing the probability of winning.
keyMessage: Risk posture depends on the lead, and the season deadline is absolute.

dataviz-countup (Adapt): keep data as the argument and land one hero metric; replace a generic dashboard tour with the real prediction-first lab, then let the deadline interrupt it.
Scene 1 (0.0–2.0s): the completed variance lab seats as a dark hero plane on warm paper; all regions dim by authored treatment except the prediction and P(win) result, while “BEHIND” and “AHEAD” sit as opposing mono anchors — split-screen hierarchy inside one real surface (static establish).
Scene 2 (2.0–3.8s): on “variance can save you,” the P(win) value counts to its real displayed result as its cyan progress arc draws in; the BEHIND anchor receives a flat cyan field — centered data instrument over the screenshot, not an invented claim (`counting-dynamic-scale`, `stat-bars-and-fills`).
Scene 3 (3.8–5.7s): on “ahead,” the probability instrument yields left and a risk-red vertical rule self-draws at DAY 30; a DAY 31 ghost label meets the wall and stops in a threshold state rather than crossing — rule-of-thirds composition, deadline is the dominant foreground (`svg-path-draw`, `scale-swap-transition`).
Scene 4 (5.7–7.822s): `watch-terminal.png` scale-swaps into the right 58% with final banks and day 30 legible; “CONTROL WINS THE WALL” reveals with the same-center handoff, then the whole frame locks for the final 1.3 seconds — lab remains a dim supporting strip left, camera static (`scale-swap-transition`; allocated stillness).

## Frame 7 — Play the Thesis

- scene: Play, Watch, and Learn lock into the FieldTape name before the URL and official Kaggle replay invitation hold
- voiceover: "Play the public mechanics. Watch a synthetic season. Learn the quant. Then see the real game on Kaggle."
- duration: 10.265s
- poster: 6.4s
- transition_in: blur-crossfade
- status: outline
- src: compositions/frames/07-play-the-thesis.html
- type: cta
- persuasion: Low-friction invitation + authority handoff
- beat: motivation + curiosity-to-act
- blueprint: titlecard-reveal — calm statement, action line, and held URL card
- asset_candidates: assets/landing-desktop.png — FieldTape identity and route previews; assets/watch-terminal.png — synthetic season result
- focal: assets/landing-desktop.png
- roles: landing-desktop.png = background brand proof; watch-terminal.png = supporting season receipt; final URL = foreground lockup
- sfx: chime

narrativeRole: Convert the lesson into an immediate product action while handing official replay authority back to Kaggle.
keyMessage: FieldTape is where you can play and learn; Kaggle is where the official competition lives.

titlecard-reveal (Adapt): use the calm CTA card-chain variant; each action receives one allocated still card and the final FieldTape URL gets the longest hold.
Scene 1 (0.0–1.6s): hard cut to a cream card reading “PLAY” in display type with a tightly cropped landing farm strip beneath; one gold underline draws on, then the card holds — Centered upper 72%, no secondary message (`svg-path-draw`; static hold).
Scene 2 (1.6–3.2s): instant full-opacity cut to “WATCH” with the terminal result seated as a small sharp receipt; one market-cyan line connects the two final banks, then hold (`discrete-text-sequence`, `svg-path-draw`).
Scene 3 (3.2–5.0s): instant cut to “LEARN THE QUANT”; a three-item mono rail ACTIONS / MARKET / RISK reveals sequentially below, then clears at peak velocity (`dynamic-content-sequencing`; waterfall cut).
Scene 4 (5.0–10.265s): instant cut to the final lockup: FieldTape for Kaggriculture, `fieldtape-kaggriculture.vercel.app`, “UNOFFICIAL · PUBLIC MECHANICS · OFFICIAL REPLAYS ON KAGGLE”; the URL reveals left-to-right and holds completely still for the final 3.8 seconds — sharp editorial frame, maximum contrast, caption band reserved (`discrete-text-sequence`; longest static hold).
