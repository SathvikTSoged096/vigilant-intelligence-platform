import {
    Activity,
    BrainCircuit,
    Files,
    GitBranch,
    LogOut,
    Settings,
} from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const links = [
  ["Dashboard", "/dashboard", Activity],
  ["Documents", "/documents", Files],
  ["AI Report", "/reports", BrainCircuit],
  ["Knowledge Graph", "/graph", GitBranch],
  ["Settings", "/settings", Settings],
];

export default function Sidebar() {
  const { user, logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 w-56 border-r border-line bg-obsidian flex flex-col">

      <div className="h-14 border-b border-line p-3 flex gap-3 items-center">
        <div className="w-8 h-8 flex items-center justify-center">
          <img
            src="/logo/vigilant.svg"
            alt="Vigilant"
            className="w-8 h-8"
          />
        </div>

        <div>
          <div className="font-mono tracking-widest text-white">
            VIGILANT
          </div>

          <div className="eyebrow">
            INTELLIGENCE PLATFORM
          </div>
        </div>
      </div>

      <nav className="p-2 space-y-1">
        {links.map(([label, path, Icon]) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              `flex items-center gap-3 p-2 text-xs border ${
                isActive
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-300"
                  : "border-transparent text-slate-500 hover:text-slate-300"
              }`
            }
          >
            <Icon size={15} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto p-2 border-t border-line">
        <div className="font-mono text-[9px] text-slate-400">
          {user?.username}
        </div>

        <div className="font-mono text-[8px] text-blue-400">
          CLEARANCE: {user?.clearance || "LEVEL_1"}
        </div>

        <button
          onClick={logout}
          className="mt-3 w-full text-red-400 border border-red-500/20 p-2 text-[9px]"
        >
          <LogOut size={12} className="inline mr-1" />
          TERMINATE SESSION
        </button>
      </div>
    </aside>
  );
}