// frontend/src/components/shop/ShopSideNav.jsx
import { useNavigate, useLocation } from "react-router-dom";
import { X, LayoutDashboard, Package, PlusCircle, AlertTriangle, Tag, Sliders, Award, FileSpreadsheet, ChevronRight } from "lucide-react";

const groups = [
  {
    title: "Tổng quan",
    items: [
      { t: "Bảng điều khiển", to: "/shop/dashboard", icon: LayoutDashboard, color: "#38bdf8", bg: "rgba(56,189,248,0.15)" },
    ],
  },
  {
    title: "Sản phẩm",
    items: [
      { t: "Tất cả sản phẩm", to: "/shop/products", icon: Package, color: "#a78bfa", bg: "rgba(167,139,250,0.15)" },
      { t: "Thêm sản phẩm", to: "/shop/products/new", icon: PlusCircle, color: "#34d399", bg: "rgba(52,211,153,0.15)" },
      { t: "Hàng sắp hết", to: "/shop/inventory/low-stock", icon: AlertTriangle, color: "#fb923c", bg: "rgba(251,146,60,0.15)" },
    ],
  },
  {
    title: "Danh mục & Thuộc tính",
    items: [
      { t: "Danh mục", to: "/shop/catalog/categories", icon: Tag, color: "#f472b6", bg: "rgba(244,114,182,0.15)" },
      { t: "Thuộc tính", to: "/shop/catalog/attributes", icon: Sliders, color: "#fbbf24", bg: "rgba(251,191,36,0.15)" },
      { t: "Brand", to: "/shop/catalog/brands", icon: Award, color: "#f87171", bg: "rgba(248,113,113,0.15)" },
    ],
  },
  {
    title: "Dữ liệu",
    items: [
      { t: "Import Excel", to: "/shop/products#import", icon: FileSpreadsheet, color: "#4ade80", bg: "rgba(74,222,128,0.15)" },
    ],
  },
];

export default function ShopSideNav({ open, onClose }) {
  const nav = useNavigate();
  const location = useLocation();

  // Find the single best-matching path for the current URL
  const allPaths = groups
    .flatMap((g) => g.items)
    .map((it) => it.to.split("#")[0]);

  const bestMatch = allPaths
    .filter((p) => location.pathname === p || location.pathname.startsWith(p + "/"))
    .sort((a, b) => b.length - a.length)[0]; // longest match wins

  const isActive = (to) => {
    const path = to.split("#")[0];
    return path === bestMatch;
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className={`fixed left-0 top-0 h-full w-72 z-50 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          background: "linear-gradient(160deg, #0f172a 0%, #1e293b 60%, #0f172a 100%)",
          boxShadow: "8px 0 32px rgba(0,0,0,0.4), 1px 0 0 rgba(255,255,255,0.05)",
        }}
      >
        {/* Top header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                boxShadow: "0 4px 12px rgba(99,102,241,0.4)",
              }}
            >
              <Package size={16} className="text-white" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm leading-tight">Shop Manager</p>
              <p className="text-slate-400 text-[11px] leading-tight">Quản lý cửa hàng</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 transition-all duration-200"
            style={{ background: "rgba(255,255,255,0.05)" }}
            onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.1)"}
            onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.05)"}
          >
            <X size={16} />
          </button>
        </div>

        {/* Nav groups */}
        <div className="overflow-y-auto h-[calc(100%-72px)] py-3 px-3">
          {groups.map((g, gi) => (
            <div key={g.title} className={gi > 0 ? "mt-5" : ""}>
              {/* Section label */}
              <p
                className="px-3 mb-1 text-[10px] font-bold uppercase tracking-widest"
                style={{ color: "rgba(148,163,184,0.5)" }}
              >
                {g.title}
              </p>

              {/* Items */}
              <div className="space-y-0.5">
                {g.items.map((it) => {
                  const active = isActive(it.to);
                  const Icon = it.icon;

                  return (
                    <button
                      key={it.t}
                      onClick={() => { nav(it.to); onClose?.(); }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-[15px] font-medium transition-all duration-200 group relative overflow-hidden"
                      style={{
                        color: active ? "#fff" : "rgba(148,163,184,0.9)",
                        background: active
                          ? `linear-gradient(90deg, ${it.bg.replace("0.15", "0.2")} 0%, transparent 100%)`
                          : "transparent",
                        border: active
                          ? `1px solid ${it.color}40`
                          : "1px solid transparent",
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.background = "rgba(255,255,255,0.05)";
                          e.currentTarget.style.color = "rgba(255,255,255,0.95)";
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
                          style={{ background: it.color, boxShadow: `0 0 8px ${it.color}` }}
                        />
                      )}

                      {/* Icon */}
                      <span
                        className="flex items-center justify-center w-8 h-8 rounded-lg flex-shrink-0 transition-all duration-200"
                        style={{
                          background: active ? it.bg.replace("0.15", "0.25") : it.bg,
                          color: it.color,
                        }}
                      >
                        <Icon size={17} />
                      </span>

                      {/* Label */}
                      <span className="flex-1 text-left">{it.t}</span>

                      {/* Arrow (active) */}
                      {active && (
                        <ChevronRight size={15} style={{ color: it.color, opacity: 0.8 }} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Bottom spacer */}
          <div className="h-4" />
        </div>

        {/* Footer */}
        <div
          className="absolute bottom-0 left-0 right-0 px-5 py-4"
          style={{
            borderTop: "1px solid rgba(255,255,255,0.06)",
            background: "rgba(15,23,42,0.8)",
            backdropFilter: "blur(8px)",
          }}
        >
          <p className="text-[11px] text-slate-500 text-center">
            © 2025 Shop Manager — v1.0
          </p>
        </div>
      </div>
    </>
  );
}