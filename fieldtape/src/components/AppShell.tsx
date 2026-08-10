import { BookOpenText, FlaskConical, Gamepad2, Menu, Radio, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BrandMark } from "./BrandMark";

const nav = [
  { to: "/play", label: "Play", icon: Gamepad2 },
  { to: "/watch", label: "Watch", icon: Radio },
  { to: "/lab", label: "Learn", icon: BookOpenText },
  { to: "/research", label: "Research", icon: FlaskConical },
  { to: "/leaderboard", label: "Board", icon: Trophy },
];

export function AppShell() {
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  return (
    <div className="app-shell">
      <header className="app-header">
        <BrandMark />
        <button className="menu-button" onClick={() => setOpen((value) => !value)} aria-expanded={open} aria-label="Toggle navigation">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
        <nav className={open ? "app-nav is-open" : "app-nav"} aria-label="Primary">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => (isActive ? "active" : undefined)}>
              <Icon size={15} strokeWidth={1.8} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="header-meta">
          <span className="live-dot" aria-hidden="true" />
          <span>SIM / PUBLIC</span>
          <NavLink className="profile-link" to="/profile">Local profile</NavLink>
        </div>
      </header>
      <main id="main" className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>Unofficial educational simulation</span>
        <span>Not investment advice</span>
        <NavLink to="/story">Methods & attribution ↗</NavLink>
      </footer>
    </div>
  );
}

