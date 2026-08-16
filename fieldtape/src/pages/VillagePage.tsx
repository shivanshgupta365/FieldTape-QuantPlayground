import { Link } from "react-router-dom"
import { Village3D } from "../village3d/Village3D"

export function VillagePage() {
  return (
    <div className="village-page">
      <header className="village-head">
        <div>
          <p className="eyebrow">Lucerne valley</p>
          <h1>The valley</h1>
        </div>
        <nav>
          <Link className="button" to="/play">Back to the farm</Link>
        </nav>
      </header>
      <Village3D />
      <p className="village-caption">
        Ninety-six squares of valley. Walk up to the ridge viewpoint, take the
        jetty out over the lake, drive a tractor through the orchard terraces, or
        find the old mill. Twenty-five places to discover, and nothing on a timer.
      </p>
    </div>
  )
}
