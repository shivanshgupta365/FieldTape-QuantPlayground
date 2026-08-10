import { Link } from "react-router-dom";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link className="brand-mark" to="/" aria-label="FieldTape for Kaggriculture home">
      <span className="brand-glyph" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      <span>
        <strong>FIELDTAPE</strong>
        {!compact && <small>for Kaggriculture</small>}
      </span>
    </Link>
  );
}
