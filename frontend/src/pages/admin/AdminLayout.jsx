import React, { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Button, Divider, Avatar } from "@heroui/react";
import {
  Store, Settings, ChevronLeft, ChevronRight, FileText,
  BarChart2, Key, Shield, Package, Clock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { to: "/admin/shops",            label: "Quản lý Shop",       icon: Store },
  { divider: true },
  { to: "/admin/products",         label: "Tất cả sản phẩm",    icon: Package },
  { to: "/admin/products/pending", label: "Chờ duyệt",          icon: Clock },
  { divider: true },
  { to: "/admin/audit-logs",       label: "Audit Logs",         icon: FileText },
  { to: "/admin/reconciliation",   label: "Đối soát",           icon: BarChart2 },
  { to: "/admin/api-keys",         label: "API Keys",           icon: Key },
  { divider: true },
  { to: "/admin/system-config",    label: "Cấu hình hệ thống",  icon: Settings },
];

export default function AdminLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height,64px))] bg-gray-50">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-white border-r border-gray-200 shadow-sm transition-all duration-300 flex-shrink-0 ${
          collapsed ? "w-16" : "w-56"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-gray-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center">
                <Shield size={14} className="text-white" />
              </div>
              <span className="font-bold text-gray-800 text-sm">Admin Panel</span>
            </div>
          )}
          <Button
            isIconOnly size="sm" variant="light"
            onPress={() => setCollapsed((c) => !c)}
            className={collapsed ? "mx-auto" : ""}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </Button>
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map((item, idx) => {
            if (item.divider) return <Divider key={`div-${idx}`} className="my-2" />;
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-red-500 text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`
                }
                title={collapsed ? item.label : undefined}
              >
                <Icon size={17} className="flex-shrink-0" />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-3 border-t border-gray-100">
          {!collapsed ? (
            <div className="flex items-center gap-2 p-2 rounded-xl hover:bg-gray-50">
              <Avatar name={user?.name?.charAt(0)} src={user?.avatar_url} size="sm" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-gray-800 truncate">{user?.name}</p>
                <p className="text-[10px] text-gray-400 truncate">System Admin</p>
              </div>
            </div>
          ) : (
            <Avatar name={user?.name?.charAt(0)} src={user?.avatar_url} size="sm" className="mx-auto" />
          )}
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
