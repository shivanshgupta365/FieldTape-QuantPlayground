export function SectionRule({ index, label, value }: { index: string; label: string; value?: string }) {
  return (
    <div className="section-rule" aria-hidden="true">
      <span>{index}</span>
      <i />
      <b>{label}</b>
      {value && <em>{value}</em>}
    </div>
  );
}

