import { BRAND } from "../brand";
import { MusicDock } from "./MusicDock";
import { BookOpenText, FlaskConical, Gamepad2, GraduationCap, Menu, Mountain, Radio, Trophy, X } from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BrandMark } from "./BrandMark";

const nav = [
  { to: "/play", label: "Play", icon: Gamepad2 },
  { to: "/village", label: "Village", icon: Mountain },
  { to: "/how-to-play", label: "How to play", icon: GraduationCap },
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
        <BrandMark size={30} />
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
          <NavLink className="profile-link" to="/profile">Profile</NavLink>
        </div>
      </header>
      <main id="main" className="app-main">
        <Outlet />
      </main>
      <footer className="app-footer">
        <span>{BRAND.name} — {BRAND.tagline}</span>
        <NavLink to="/story">About</NavLink>
      </footer>
      <MusicDock />
    </div>
  );
}

