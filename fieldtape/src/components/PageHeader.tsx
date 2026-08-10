import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, dek, aside }: { eyebrow: string; title: string; dek: string; aside?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <p className="eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="page-dek">{dek}</p>
      </div>
      {aside && <div className="page-header-aside">{aside}</div>}
    </header>
  );
}

