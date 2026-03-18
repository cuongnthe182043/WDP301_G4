import React from "react";
import { Divider } from "@heroui/react";
import {
  BarChart2, Activity, TrendingDown, DollarSign,
  ShoppingCart, Tag, Image, Menu, X, Zap,
} from "lucide-react";

const MENU_ITEMS = [
  { id: "analytics",        name: "Analytics",        icon: BarChart2,    color: "#38bdf8", bg: "rgba(56,189,248,0.15)"  },
  { id: "chart",            name: "Chart",             icon: Activity,     color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
  { id: "forecast",         name: "Forecast",          icon: TrendingDown, color: "#fb923c", bg: "rgba(251,146,60,0.15)"  },
  { id: "revenue",          name: "Revenue",           icon: DollarSign,   color: "#4ade80", bg: "rgba(74,222,128,0.15)"  },
  { id: "manage_products",  name: "Manage Products",   icon: ShoppingCart, color: "#f472b6", bg: "rgba(244,114,182,0.15)" },
  { id: "manage_vouchers",  name: "Manage Voucher",    icon: Tag,          color: "#fbbf24", bg: "rgba(251,191,36,0.15)"  },
  { id: "manage_banners",   name: "Manage Banner",     icon: Image,        color: "#34d399", bg: "rgba(52,211,153,0.15)"  },
  { id: "manage_flashsale", name: "Manage Flashsale",  icon: Zap,          color: "#f87171", bg: "rgba(248,113,113,0.15)" },
];

export default function Sidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen }) {
  return (
    <div
      className={`relative flex flex-col h-full transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] overflow-hidden flex-shrink-0 ${
        sidebarOpen ? "w-64" : "w-[72px]"
      }`}
      style={{
        background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
        boxShadow: "2px 0 24px rgba(0,0,0,0.3), 1px 0 0 rgba(255,255,255,0.04)",
      }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-4 flex-shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-bold text-base flex-shrink-0"
            style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
            }}
          >
            A
          </div>
          <div
            className="overflow-hidden transition-all duration-300"
            style={{ width: sidebarOpen ? "auto" : 0, opacity: sidebarOpen ? 1 : 0 }}
          >
            <p className="text-white font-bold text-sm whitespace-nowrap leading-tight">Shop Admin</p>
            <p className="text-slate-400 text-[11px] whitespace-nowrap leading-tight">Dashboard</p>
          </div>
        </div>

        {/* Toggle button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 transition-all duration-200 ml-1"
          style={{ background: "rgba(255,255,255,0.06)" }}
          onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.12)"}
          onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.06)"}
        >
          {sidebarOpen ? <X size={16} /> : <Menu size={16} />}
        </button>
      </div>

      {/* User info */}
      <div className="px-3 py-3 flex-shrink-0" style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <div
          className="flex items-center gap-3 rounded-xl px-2.5 py-2"
          style={{ background: "rgba(255,255,255,0.05)" }}
        >
          <img
            src="https://ui-avatars.com/api/?name=Shop+Owner&background=6366f1&color=fff"
            alt="User"
            className="w-8 h-8 rounded-full flex-shrink-0"
            style={{ boxShadow: "0 0 0 2px rgba(99,102,241,0.4)" }}
          />
          <div
            className="overflow-hidden transition-all duration-300 min-w-0"
            style={{ width: sidebarOpen ? "auto" : 0, opacity: sidebarOpen ? 1 : 0 }}
          >
            <p className="text-white text-[13px] font-semibold whitespace-nowrap leading-tight">Shop Owner</p>
            <p className="text-slate-400 text-[11px] whitespace-nowrap leading-tight">Hi, Welcome back 👋</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = activeMenu === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              title={!sidebarOpen ? item.name : undefined}
              className="w-full flex items-center rounded-xl transition-all duration-200 relative overflow-hidden"
              style={{
                gap: sidebarOpen ? "12px" : "0",
                padding: sidebarOpen ? "10px 12px" : "10px 0",
                justifyContent: sidebarOpen ? "flex-start" : "center",
                color: active ? "#fff" : "rgba(148,163,184,0.9)",
                background: active
                  ? `linear-gradient(90deg, ${item.bg.replace("0.15","0.25")} 0%, transparent 100%)`
                  : "transparent",
                border: active ? `1px solid ${item.color}35` : "1px solid transparent",
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                  e.currentTarget.style.color = "#fff";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "rgba(148,163,184,0.9)";
                }
              }}
            >
              {/* Active left bar */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                  style={{ background: item.color, boxShadow: `0 0 8px ${item.color}` }}
                />
              )}

              {/* Icon box */}
              <span
                className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all duration-200"
                style={{
                  background: active ? item.bg.replace("0.15","0.3") : item.bg,
                  color: item.color,
                }}
              >
                <Icon size={17} />
              </span>

              {/* Label */}
              <span
                className="text-[15px] font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
                style={{
                  maxWidth: sidebarOpen ? "160px" : "0px",
                  opacity: sidebarOpen ? 1 : 0,
                }}
              >
                {item.name}
              </span>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="flex-shrink-0 px-4 py-3"
        style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}
      >
        <p
          className="text-[11px] text-slate-500 whitespace-nowrap overflow-hidden transition-all duration-300 text-center"
          style={{ opacity: sidebarOpen ? 1 : 0, maxHeight: sidebarOpen ? "20px" : 0 }}
        >
          © 2025 Shop Manager
        </p>
        {!sidebarOpen && (
          <div className="w-6 h-1 rounded-full mx-auto" style={{ background: "rgba(255,255,255,0.1)" }} />
        )}
      </div>
    </div>
  );
}