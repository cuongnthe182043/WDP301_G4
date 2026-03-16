import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Divider, Avatar } from "@heroui/react";
import {
  Store, Settings, ChevronLeft, ChevronRight, FileText,
  BarChart2, Key, Shield, Package, Clock, MessageSquare,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const NAV_ITEMS = [
  { to: "/admin/shops",            label: "Quản lý Shop",        icon: Store,          color: "#6366f1", bg: "rgba(99,102,241,0.1)"  },
  { divider: true },
  { to: "/admin/products",         label: "Tất cả sản phẩm",     icon: Package,        color: "#0ea5e9", bg: "rgba(14,165,233,0.1)",  exact: true },
  { to: "/admin/products/pending", label: "Chờ duyệt",           icon: Clock,          color: "#f97316", bg: "rgba(249,115,22,0.1)"  },
  { divider: true },
  { to: "/admin/reviews",          label: "Kiểm duyệt đánh giá", icon: MessageSquare,  color: "#10b981", bg: "rgba(16,185,129,0.1)"  },
  { divider: true },
  { to: "/admin/audit-logs",       label: "Audit Logs",          icon: FileText,       color: "#8b5cf6", bg: "rgba(139,92,246,0.1)"  },
  { to: "/admin/reconciliation",   label: "Đối soát",            icon: BarChart2,      color: "#14b8a6", bg: "rgba(20,184,166,0.1)"  },
  { to: "/admin/api-keys",         label: "API Keys",            icon: Key,            color: "#f59e0b", bg: "rgba(245,158,11,0.1)"  },
  { divider: true },
  { to: "/admin/system-config",    label: "Cấu hình hệ thống",   icon: Settings,       color: "#64748b", bg: "rgba(100,116,139,0.1)" },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const S = {
    sidebar:     isDark ? { background: "#18181b", borderRight: "1px solid #27272a", boxShadow: "2px 0 16px rgba(0,0,0,0.35)" }
                        : { background: "#ffffff",  borderRight: "1px solid #e8edf5", boxShadow: "2px 0 12px rgba(239,68,68,0.05)" },
    topBorder:   isDark ? { borderBottom: "1px solid #27272a" } : { borderBottom: "1px solid #f0f4fb" },
    brandText:   isDark ? "#f4f4f5" : "#1e293b",
    subText:     isDark ? "#52525b" : "#94a3b8",
    collapseBtn: isDark ? { background: "#27272a", color: "#71717a" } : { background: "#f1f5f9", color: "#94a3b8" },
    collapseBtnHover: isDark ? { background: "#3f3f46", color: "#d4d4d8" } : { background: "#e2e8f0", color: "#475569" },
    divider:     isDark ? "#27272a" : "#f0f4fb",
    navInactive: isDark ? "#71717a" : "#64748b",
    navHoverBg:  isDark ? "#27272a" : "#f8fafc",
    navHoverTxt: isDark ? "#f4f4f5" : "#1e293b",
    footerBorder:isDark ? { borderTop: "1px solid #27272a" } : { borderTop: "1px solid #f0f4fb" },
    userHoverBg: isDark ? "#27272a" : "#f8fafc",
  };

  return (
    <div
      className="flex min-h-[calc(100dvh-var(--header-height,64px))]"
      style={{ background: isDark ? "#09090b" : "#f8fafc" }}
    >

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col flex-shrink-0 transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]"
        style={{ width: collapsed ? "68px" : "220px", ...S.sidebar }}
      >
        {/* Brand */}
        <div
          className="flex items-center justify-between px-3 py-[13px] flex-shrink-0"
          style={S.topBorder}
        >
          <div className="flex items-center gap-2.5 min-w-0 overflow-hidden">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: "linear-gradient(135deg, #ef4444, #f97316)",
                boxShadow: "0 3px 10px rgba(239,68,68,0.3)",
              }}
            >
              <Shield size={15} className="text-white" />
            </div>
            <span
              className="font-bold text-sm whitespace-nowrap transition-all duration-300 overflow-hidden"
              style={{ maxWidth: collapsed ? 0 : "120px", opacity: collapsed ? 0 : 1, color: S.brandText }}
            >
              Admin Panel
            </span>
          </div>

          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-200"
            style={S.collapseBtn}
            onMouseEnter={e => { Object.assign(e.currentTarget.style, S.collapseBtnHover); }}
            onMouseLeave={e => { Object.assign(e.currentTarget.style, S.collapseBtn); }}
          >
            {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: "8px" }}>
          {NAV_ITEMS.map((item, idx) => {
            if (item.divider) {
              return <Divider key={`div-${idx}`} className="my-1" style={{ background: S.divider }} />;
            }

            const Icon = item.icon;

            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={!!item.exact}
                title={collapsed ? item.label : undefined}
                className="block mb-0.5"
              >
                {({ isActive }) => (
                  <div
                    className="flex items-center rounded-xl transition-all duration-150 relative overflow-hidden cursor-pointer"
                    style={{
                      gap: collapsed ? 0 : "10px",
                      padding: collapsed ? "9px 0" : "8px 10px",
                      justifyContent: collapsed ? "center" : "flex-start",
                      color: isActive ? item.color : S.navInactive,
                      background: isActive ? item.bg : "transparent",
                      border: isActive ? `1px solid ${item.color}22` : "1px solid transparent",
                    }}
                    onMouseEnter={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = S.navHoverBg;
                        e.currentTarget.style.color = S.navHoverTxt;
                      }
                    }}
                    onMouseLeave={e => {
                      if (!isActive) {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = S.navInactive;
                      }
                    }}
                  >
                    {/* Active left bar */}
                    {isActive && (
                      <span
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
                        style={{ background: item.color }}
                      />
                    )}

                    {/* Icon box */}
                    <span
                      className="flex items-center justify-center w-7 h-7 rounded-lg flex-shrink-0"
                      style={{ background: item.bg, color: item.color }}
                    >
                      <Icon size={15} />
                    </span>

                    {/* Label */}
                    <span
                      className="text-[13px] font-medium whitespace-nowrap overflow-hidden transition-all duration-300"
                      style={{ maxWidth: collapsed ? 0 : "150px", opacity: collapsed ? 0 : 1 }}
                    >
                      {item.label}
                    </span>
                  </div>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div
          className="flex-shrink-0 p-3"
          style={S.footerBorder}
        >
          <div
            className="flex items-center rounded-xl transition-all duration-200 cursor-pointer overflow-hidden"
            style={{
              gap: collapsed ? 0 : "10px",
              padding: collapsed ? "6px 0" : "8px 10px",
              justifyContent: collapsed ? "center" : "flex-start",
              background: "transparent",
            }}
            onMouseEnter={e => e.currentTarget.style.background = S.userHoverBg}
            onMouseLeave={e => e.currentTarget.style.background = "transparent"}
          >
            <Avatar
              name={user?.name?.charAt(0)}
              src={user?.avatar_url}
              size="sm"
              className="flex-shrink-0"
              style={{ width: "28px", height: "28px" }}
            />
            <div
              className="min-w-0 overflow-hidden transition-all duration-300"
              style={{ maxWidth: collapsed ? 0 : "140px", opacity: collapsed ? 0 : 1 }}
            >
              <p className="text-[13px] font-semibold truncate whitespace-nowrap" style={{ color: S.brandText }}>{user?.name}</p>
              <p className="text-[10px] truncate whitespace-nowrap" style={{ color: S.subText }}>System Admin</p>
            </div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-auto p-6" style={{ background: isDark ? "#09090b" : undefined }}>
        <Outlet />
      </main>
    </div>
  );
}