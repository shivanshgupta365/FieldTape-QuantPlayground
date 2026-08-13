/**
 * The farm board in 3D, matching the valley's look.
 *
 * Same pixelation path as the village — low-resolution render target, nearest
 * upscale, flat shading — so the two screens now share one visual language
 * instead of one being lit 3D and the other flat 2D.
 *
 * Two things the 2D board did well that are preserved deliberately:
 *
 *  - Accessibility. The canvas is aria-hidden and a transparent focusable grid of
 *    real buttons sits on top, exactly as before, so keyboard navigation and
 *    screen-reader labels survive the move to WebGL. A raycast-only board would
 *    be unusable without a mouse.
 *  - Determinism. Nothing animates. A given (tiles, camera) always produces the
 *    same frame, so replay scrubbing still lands on an identical image.
 */

import { useEffect, useRef, useState } from "react"
import * as THREE from "three"
import { PAL } from "../art/palette"
import type { CanvasTile } from "./types"

const BOARD = 10
/** World units per plot. */
const CELL = 2
const PIXEL = 3

function mat(colour: string): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color: new THREE.Color(colour), flatShading: true })
}

/** Crop geometry per stage. Silhouette differs by crop, as in the sprite atlas. */
function cropMesh(crop: string, stage: number): THREE.Group {
  const g = new THREE.Group()
  const grow = [0.28, 0.5, 0.8, 1].at(Math.max(0, Math.min(3, stage)))!

  if (crop === "WHEAT") {
    for (const [dx, dz] of [[-0.4, -0.4], [0.4, -0.35], [-0.35, 0.4], [0.42, 0.42]] as const) {
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.06, 1.5 * grow, 4),
        mat(PAL.stem),
      )
      stalk.position.set(dx, (1.5 * grow) / 2, dz)
      stalk.castShadow = true
      g.add(stalk)
      if (stage >= 3) {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.42, 0.14), mat(PAL.gold))
        ear.position.set(dx, 1.5 * grow + 0.18, dz)
        g.add(ear)
      }
    }
    return g
  }

  if (crop === "CARROT") {
    // Frond fan, splaying from a single crown.
    for (let i = -2; i <= 2; i += 1) {
      const frond = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 1.0 * grow, 0.06),
        mat(PAL.stem),
      )
      frond.position.set(i * 0.16, (1.0 * grow) / 2, 0)
      frond.rotation.z = i * 0.22
      frond.castShadow = true
      g.add(frond)
    }
    if (stage >= 3) {
      const root = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.5, 6), mat(PAL.orange))
      root.rotation.x = Math.PI
      root.position.y = 0.16
      g.add(root)
    }
    return g
  }

  if (crop === "TOMATO") {
    const cane = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.08, 1.7 * grow, 5),
      mat(PAL.stemDark),
    )
    cane.position.y = (1.7 * grow) / 2
    cane.castShadow = true
    g.add(cane)
    for (let i = 1; i <= 3; i += 1) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.06, 0.28), mat(PAL.stem))
      leaf.position.y = (1.7 * grow * i) / 4
      leaf.rotation.y = i * 1.1
      g.add(leaf)
    }
    if (stage >= 3) {
      for (const [dx, dy, dz] of [[0.3, 0.7, 0.1], [-0.28, 1.1, -0.1], [0.1, 1.4, 0.3]] as const) {
        const fruit = new THREE.Mesh(new THREE.DodecahedronGeometry(0.2, 0), mat(PAL.red))
        fruit.position.set(dx, dy, dz)
        g.add(fruit)
      }
    }
    return g
  }

  if (crop === "STRAWBERRY") {
    // Low rosette; never exceeds a third of a tile in height.
    for (let i = 0; i < 6; i += 1) {
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.34), mat(PAL.stemDark))
      leaf.position.set(Math.cos(i) * 0.34, 0.12 + grow * 0.2, Math.sin(i) * 0.34)
      leaf.rotation.y = i
      g.add(leaf)
    }
    if (stage >= 3) {
      for (let i = 0; i < 3; i += 1) {
        const berry = new THREE.Mesh(new THREE.DodecahedronGeometry(0.13, 0), mat(PAL.red))
        berry.position.set(Math.cos(i * 2.1) * 0.3, 0.3, Math.sin(i * 2.1) * 0.3)
        g.add(berry)
      }
    }
    return g
  }

  // MELON: sprawling vine with a fat striped fruit at maturity.
  for (let i = 0; i < 5; i += 1) {
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.08, 0.4), mat("#2f6b3a"))
    leaf.position.set(-0.6 + i * 0.3, 0.12, Math.sin(i) * 0.35)
    g.add(leaf)
  }
  if (stage >= 2) {
    const size = stage >= 3 ? 0.46 : 0.24
    const fruit = new THREE.Mesh(new THREE.SphereGeometry(size, 7, 5), mat("#2f6b3a"))
    fruit.position.set(0.1, size * 0.9, 0.1)
    fruit.castShadow = true
    g.add(fruit)
    if (stage >= 3) {
      for (let i = 0; i < 3; i += 1) {
        const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.06, size * 1.7, 0.06), mat("#7bab5c"))
        stripe.position.set(0.1 + Math.cos(i * 2.1) * size * 0.7, size * 0.9, 0.1 + Math.sin(i * 2.1) * size * 0.7)
        g.add(stripe)
      }
    }
  }
  return g
}

function animalMesh(animal: string): THREE.Group {
  const g = new THREE.Group()
  const body = new THREE.Mesh(
    new THREE.DodecahedronGeometry(animal === "GOOSE" ? 0.32 : 0.46, 0),
    mat(animal === "COW" ? PAL.cream : animal === "SHEEP" ? PAL.cream : "#efeade"),
  )
  body.position.y = animal === "GOOSE" ? 0.42 : 0.56
  body.castShadow = true
  g.add(body)
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, 0.22, 0.26),
    mat(animal === "COW" ? PAL.ink : animal === "GOOSE" ? "#efeade" : PAL.ink),
  )
  head.position.set(0, animal === "GOOSE" ? 0.76 : 0.62, 0.4)
  g.add(head)
  if (animal === "COW") {
    for (const dx of [-0.22, 0.22]) {
      const patch = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), mat(PAL.ink))
      patch.position.set(dx, 0.62, -0.1)
      g.add(patch)
    }
  }
  if (animal === "GOOSE") {
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.2, 4), mat(PAL.orange))
    beak.rotation.x = Math.PI / 2
    beak.position.set(0, 0.76, 0.58)
    g.add(beak)
  }
  return g
}

export function Farm3D({
  tiles,
  selectedId,
  onSelect,
  label,
}: {
  tiles: readonly CanvasTile[]
  selectedId?: string
  onSelect?: (tile: CanvasTile) => void
  label: string
}) {
  const mountRef = useRef<HTMLDivElement | null>(null)
  const plotsRef = useRef<THREE.Group | null>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const renderRef = useRef<() => void>(() => {})
  /**
   * Screen position of each plot centre, as a percentage of the canvas.
   *
   * The hit targets cannot be a CSS grid rectangle: the board is a perspective
   * projection, so a rectangle only lines up near the centre and drifts badly at
   * the far corners — clicks land on the wrong plot. Projecting each plot centre
   * through the actual camera puts every button exactly where its plot is drawn.
   * Computed once, because the camera does not move.
   */
  const [hits, setHits] = useState<Array<{ id: string; left: number; top: number }>>([])

  // ------------------------------------------------------------------ setup
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    const scene = new THREE.Scene()
    scene.background = new THREE.Color("#a8c4d2")

    const camera = new THREE.PerspectiveCamera(40, 1, 0.5, 200)
    const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: "low-power" })
    renderer.setPixelRatio(1)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.BasicShadowMap
    renderer.domElement.className = "farm3d-canvas"
    mount.appendChild(renderer.domElement)
    rendererRef.current = renderer

    const target = new THREE.WebGLRenderTarget(1, 1, {
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
    })
    // Linear by default; without this the whole board renders about half as
    // bright, which looks like a lighting bug and is a colour-space one.
    target.texture.colorSpace = THREE.SRGBColorSpace
    const blitScene = new THREE.Scene()
    const blitCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1)
    blitScene.add(
      new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: target.texture })),
    )

    // Fixed late-afternoon light. The board is a working view, so the lighting
    // stays put; a moving sun would make plots harder to compare hour to hour.
    const sun = new THREE.DirectionalLight(0xfff2dc, 1.9)
    sun.position.set(14, 20, 10)
    sun.castShadow = true
    sun.shadow.mapSize.set(1024, 1024)
    sun.shadow.camera.near = 1
    sun.shadow.camera.far = 80
    const shadowCam = sun.shadow.camera
    shadowCam.left = -16
    shadowCam.right = 16
    shadowCam.top = 16
    shadowCam.bottom = -16
    shadowCam.updateProjectionMatrix()
    scene.add(sun, new THREE.HemisphereLight(0xdbe8ef, 0x6b7a52, 0.7), new THREE.AmbientLight(0xffffff, 0.36))

    // Grass base, slightly larger than the board so plots sit in a field.
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(BOARD * CELL + 4, 0.6, BOARD * CELL + 4),
      mat(PAL.grass),
    )
    base.position.y = -0.3
    base.receiveShadow = true
    scene.add(base)

    // Hedgerow border, so the farm reads as enclosed land like the old board.
    for (const [dx, dz, w, d] of [
      [0, -(BOARD * CELL) / 2 - 1.6, BOARD * CELL + 4, 1.2],
      [0, (BOARD * CELL) / 2 + 1.6, BOARD * CELL + 4, 1.2],
      [-(BOARD * CELL) / 2 - 1.6, 0, 1.2, BOARD * CELL + 4],
      [(BOARD * CELL) / 2 + 1.6, 0, 1.2, BOARD * CELL + 4],
    ] as const) {
      const hedge = new THREE.Mesh(new THREE.BoxGeometry(w, 1.3, d), mat(PAL.pineDeep))
      hedge.position.set(dx, 0.65, dz)
      hedge.castShadow = true
      hedge.receiveShadow = true
      scene.add(hedge)
    }

    const plots = new THREE.Group()
    scene.add(plots)
    plotsRef.current = plots

    // Camera looks down the board at a raking angle: high enough to read the
    // grid, low enough that crops have visible height. Pulled back far enough
    // that the whole 10x10 plus hedgerow fits with margin.
    camera.position.set(0, 26, 27)
    camera.lookAt(0, 0, 0)

    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h, false)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
      target.setSize(Math.max(1, Math.ceil(w / PIXEL)), Math.max(1, Math.ceil(h / PIXEL)))
      renderRef.current()
    }

    renderRef.current = () => {
      renderer.setRenderTarget(target)
      renderer.clear()
      renderer.render(scene, camera)
      renderer.setRenderTarget(null)
      renderer.render(blitScene, blitCamera)
    }

    // Project plot centres to screen percentages for the hit layer.
    const offsetForHits = ((BOARD - 1) * CELL) / 2
    const projected: Array<{ id: string; left: number; top: number }> = []
    const v = new THREE.Vector3()
    camera.updateMatrixWorld()
    camera.updateProjectionMatrix()
    for (let y = 0; y < BOARD; y += 1) {
      for (let x = 0; x < BOARD; x += 1) {
        v.set(x * CELL - offsetForHits, 0.3, y * CELL - offsetForHits).project(camera)
        projected.push({
          id: `${x}:${y}`,
          left: (v.x * 0.5 + 0.5) * 100,
          top: (-v.y * 0.5 + 0.5) * 100,
        })
      }
    }
    setHits(projected)

    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(mount)

    return () => {
      observer.disconnect()
      target.dispose()
      renderer.dispose()
      scene.traverse((object) => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose?.()
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m?.dispose?.()
      })
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement)
      rendererRef.current = null
      plotsRef.current = null
    }
  }, [])

  // ------------------------------------------------------- rebuild on change
  useEffect(() => {
    const plots = plotsRef.current
    if (!plots) return

    // Full rebuild rather than diffing. A hundred small groups is nothing, and it
    // happens once per player action, not per frame — diffing would be more code
    // and more places for the board to disagree with the game state.
    for (const child of [...plots.children]) {
      plots.remove(child)
      child.traverse((object) => {
        const mesh = object as THREE.Mesh
        mesh.geometry?.dispose?.()
        const m = mesh.material as THREE.Material | THREE.Material[] | undefined
        if (Array.isArray(m)) m.forEach((x) => x.dispose())
        else m?.dispose?.()
      })
    }

    const offset = ((BOARD - 1) * CELL) / 2

    for (const tile of tiles) {
      const g = new THREE.Group()
      g.position.set(tile.x * CELL - offset, 0, tile.y * CELL - offset)

      if (tile.locked) {
        const scrub = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.94, 0.16, CELL * 0.94), mat(PAL.scrub))
        scrub.position.y = 0.08
        scrub.receiveShadow = true
        g.add(scrub)
      } else if (tile.crop || tile.animal || tile.weed) {
        // Raised soil bed. The lip is what made plots countable on the 2D board.
        const bed = new THREE.Mesh(
          new THREE.BoxGeometry(CELL * 0.9, 0.3, CELL * 0.9),
          mat(tile.watered ? PAL.wet : PAL.soil),
        )
        bed.position.y = 0.15
        bed.receiveShadow = true
        g.add(bed)

        // Furrow ridges, so soil reads as worked at any zoom.
        for (let i = -1; i <= 1; i += 1) {
          const ridge = new THREE.Mesh(
            new THREE.BoxGeometry(CELL * 0.86, 0.08, 0.16),
            mat(tile.watered ? PAL.wetRidge : PAL.soilLight),
          )
          ridge.position.set(0, 0.31, i * 0.5)
          g.add(ridge)
        }

        if (tile.weed) {
          for (let i = 0; i < 4; i += 1) {
            const weed = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.08), mat(PAL.scrubDark))
            weed.position.set(Math.cos(i * 1.6) * 0.4, 0.55, Math.sin(i * 1.6) * 0.4)
            g.add(weed)
          }
        }
        if (tile.crop) {
          const crop = cropMesh(tile.crop, tile.stage)
          crop.position.y = 0.3
          g.add(crop)
        }
        if (tile.animal) {
          const animal = animalMesh(tile.animal)
          animal.position.y = 0.3
          g.add(animal)
        }
        // Dry warning: a slim amber post, the 3D equivalent of the corner tick.
        if (tile.crop && !tile.watered) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.7, 0.1), mat(PAL.gold))
          post.position.set(-0.7, 0.65, -0.7)
          g.add(post)
        }
        if (tile.ready) {
          const pip = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), mat(PAL.goldLight))
          pip.position.set(0.7, 1.5, -0.7)
          g.add(pip)
        }
      } else {
        const turf = new THREE.Mesh(new THREE.BoxGeometry(CELL * 0.94, 0.12, CELL * 0.94), mat(PAL.grassLight))
        turf.position.y = 0.06
        turf.receiveShadow = true
        g.add(turf)
      }

      if (selectedId === tile.id) {
        // Selection ring sits proud of everything so it is never hidden by a crop.
        const ring = new THREE.Mesh(
          new THREE.BoxGeometry(CELL * 1.0, 0.06, CELL * 1.0),
          new THREE.MeshBasicMaterial({ color: new THREE.Color(PAL.gold) }),
        )
        ring.position.y = 0.02
        g.add(ring)
      }

      plots.add(g)
    }

    renderRef.current()
  }, [tiles, selectedId])

  const byId = new Map(hits.map((h) => [h.id, h]))

  return (
    <div className="farm3d-wrap">
      <div className="farm3d-mount" ref={mountRef} aria-hidden="true" />

      {/*
        Transparent hit layer. It carries every aria label and all keyboard focus;
        the WebGL canvas is decorative and aria-hidden, so keyboard and screen
        reader users get the same board they had in 2D.
      */}
      <div className="farm3d-hits" role="grid" aria-label={`${label}, 10 by 10 farm`}>
        {tiles.map((tile) => {
          const at = byId.get(tile.id)
          return (
            <button
              key={tile.id}
              type="button"
              role="gridcell"
              className={`farm3d-hit${selectedId === tile.id ? " selected" : ""}`}
              disabled={tile.locked || !onSelect}
              onClick={() => !tile.locked && onSelect?.(tile)}
              aria-selected={selectedId === tile.id}
              aria-label={describe(tile)}
              style={at ? { left: `${at.left}%`, top: `${at.top}%` } : { display: "none" }}
            />
          )
        })}
      </div>
    </div>
  )
}

function describe(tile: CanvasTile): string {
  const at = `Plot ${tile.x + 1}, ${tile.y + 1}`
  if (tile.locked) return `${at}, locked land`
  if (tile.weed) return `${at}, weed, needs clearing`
  if (tile.animal) return `${at}, ${tile.animal.toLowerCase()}${tile.ready ? ", product ready" : ""}`
  if (tile.crop) {
    const parts = [`${at}, ${tile.crop.toLowerCase()}`, `stage ${tile.stage} of 3`]
    if (tile.ready) parts.push("ready to harvest")
    if (!tile.watered) parts.push("not watered, dies after two dry days")
    return parts.join(", ")
  }
  return `${at}, empty`
}
