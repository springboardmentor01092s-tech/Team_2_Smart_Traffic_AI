import React from "react";
import { NavLink } from "react-router-dom";

const mainNav = [
  { to: "/dashboard", label: "Dashboard", icon: "🏠" },
  { to: "/live-monitoring", label: "Live Monitoring", icon: "📡" },
  { to: "/traffic-prediction", label: "Traffic Prediction", icon: "🧠" },
  { to: "/route-analysis", label: "Route Analysis", icon: "🧭" },
  { to: "/alerts", label: "Alerts & Notifications", icon: "🔔" },
  { to: "/traffic-history", label: "Traffic History", icon: "🕘" },
  { to: "/reports", label: "Reports & Analytics", icon: "📊" },
];

const adminNav = [
  { to: "/users-roles", label: "Users & Roles", icon: "👥" },
  { to: "/system-settings", label: "System Settings", icon: "⚙️" },
];

const personalNav = [
  { to: "/profile", label: "Profile", icon: "👤" },
];

export default function Sidebar({ user }) {
  const isAdmin =
    user?.role === "admin" || user?.role === "super_admin";

  const renderItem = ({ to, label, icon }) => (
    <NavLink
      key={to}
      to={to}
      className={({ isActive }) =>
        `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
          isActive
            ? "bg-accent/15 text-accent-light font-medium"
            : "text-slate-400 hover:bg-bg-hover hover:text-slate-200"
        }`
      }
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </NavLink>
  );

  return (
    <aside className="w-64 shrink-0 bg-bg-panel border-r border-border h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent to-green-400 flex items-center justify-center text-lg">
          🚦
        </div>

        <div>
          <p className="font-semibold text-slate-100 leading-tight">
            Traffic
            <span className="text-accent-light">Vision</span> AI
          </p>
          <p className="text-[11px] text-slate-500">
            Smart Traffic, Safer Cities
          </p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        <p className="px-3 text-[11px] uppercase tracking-wider text-slate-600 mb-1">
          Main Menu
        </p>

        {mainNav.map(renderItem)}

        {isAdmin && (
          <>
            <p className="px-3 text-[11px] uppercase tracking-wider text-slate-600 mt-4 mb-1">
              Administration
            </p>

            {adminNav.map(renderItem)}
          </>
        )}

        <p className="px-3 text-[11px] uppercase tracking-wider text-slate-600 mt-4 mb-1">
          Personal
        </p>

        {personalNav.map(renderItem)}
      </nav>

      {/* Footer */}
      <div className="px-4 py-4 border-t border-border">
        <div className="flex items-center gap-2 text-xs text-green-400">
          <span className="w-2 h-2 rounded-full bg-green-400" />
          All systems operational
        </div>
      </div>
    </aside>
  );
}

