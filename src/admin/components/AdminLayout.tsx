// src/admin/components/AdminLayout.tsx
import React from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

const navItems = [
  { path: "/admin", label: "Dashboard" },
  { path: "/admin/seasons", label: "Seasons" },
  { path: "/admin/feature-schedule", label: "Feature Schedule" },
  { path: "/admin/roulette", label: "Roulette" },
  { path: "/admin/dice", label: "Dice" },
  { path: "/admin/lottery", label: "Lottery" },
  { path: "/admin/external-ranking", label: "External Ranking" },
  { path: "/admin/game-tokens", label: "Coin Grant" },
  { path: "/admin/game-token-logs", label: "Coin Logs" },
  { path: "/admin/users", label: "Users" },
  { path: "/admin/user-segments", label: "User Segments" },
  { path: "/admin/segment-rules", label: "Segment Rules" },
  { path: "/admin/team-battle", label: "Team Battle" },
  { path: "/admin/surveys", label: "Surveys" },
];

const AdminLayout: React.FC = () => {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <aside className="hidden w-64 flex-shrink-0 border-r border-emerald-800/50 bg-slate-900/80 px-4 py-6 shadow-lg shadow-emerald-900/30 sm:block">
        <div className="mb-6 text-center text-lg font-bold text-emerald-300">
          <Link to="/admin">🎄 Admin</Link>
        </div>
        <nav className="space-y-2 text-sm">
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `block rounded px-3 py-2 transition ${isActive ? "bg-emerald-600 text-white" : "text-slate-200 hover:bg-slate-800"}`
              }
              end
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <main className="flex-1 px-4 py-6 sm:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
