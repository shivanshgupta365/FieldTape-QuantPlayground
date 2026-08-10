import { CircleDollarSign, Droplets, HandCoins, Sprout, Tractor, Wheat } from "lucide-react";

export type ActionId = "plant" | "water" | "harvest" | "sell" | "hire" | "land";

const actions: { id: ActionId; label: string; hint: string; icon: typeof Sprout }[] = [
  { id: "plant", label: "Plant", hint: "10–80¢", icon: Sprout },
  { id: "water", label: "Water", hint: "1 move", icon: Droplets },
  { id: "harvest", label: "Harvest", hint: "1 move", icon: Wheat },
  { id: "sell", label: "Sell", hint: "moves price", icon: HandCoins },
  { id: "hire", label: "Hire", hint: "next day", icon: Tractor },
  { id: "land", label: "Land", hint: "1,000¢+", icon: CircleDollarSign },
];

export function ActionDock({ active, disabled = [], onAction }: { active?: ActionId; disabled?: readonly ActionId[]; onAction: (action: ActionId) => void }) {
  return (
    <div className="action-dock" role="toolbar" aria-label="Farm actions">
      {actions.map(({ id, label, hint, icon: Icon }, index) => (
        <button key={id} type="button" className={active === id ? "active" : undefined} disabled={disabled.includes(id)} onClick={() => onAction(id)}>
          <kbd>{index + 1}</kbd>
          <Icon size={19} strokeWidth={1.7} />
          <span>{label}<small>{hint}</small></span>
        </button>
      ))}
    </div>
  );
}

