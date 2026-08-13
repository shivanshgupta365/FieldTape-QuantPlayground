import { Link } from "react-router-dom"
import { VillageView } from "../village/VillageView"

export function VillagePage() {
  return (
    <div className="village-page">
      <header className="village-head">
        <div>
          <p className="eyebrow">Lucerne valley</p>
          <h1>The village</h1>
        </div>
        <nav>
          <Link className="button" to="/play">Back to the farm</Link>
        </nav>
      </header>
      <VillageView />
      <p className="village-caption">
        Walk down to the lake, drive the tractor across the fields, herd the sheep
        toward the barn, or just stand in the plaza and listen. Nothing here is on
        a timer.
      </p>
    </div>
  )
}
