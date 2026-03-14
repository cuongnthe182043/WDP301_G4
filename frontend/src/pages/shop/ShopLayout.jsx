import React, { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Button, Divider } from "@heroui/react";
import {
  LayoutDashboard, Package, PackagePlus, AlertTriangle,
  FolderTree, Tag, Award, ChevronLeft, ChevronRight, Store, Settings,
  ShoppingCart, RefreshCw, Users, Star, Wallet, Megaphone,
} from "lucide-react";

const NAV_ITEMS = [
  { to: "/shop/dashboard",             label: "Dashboard",         icon: LayoutDashboard },
  { divider: true, label: "Đơn hàng" },
  { to: "/shop/orders",                label: "Đơn hàng",          icon: ShoppingCart },
  { to: "/shop/refunds",               label: "Hoàn/Đổi trả",      icon: RefreshCw },
  { to: "/shop/customers",             label: "Khách hàng",         icon: Users },
  { divider: true, label: "Sản phẩm" },
  { to: "/shop/admin/products",        label: "Sản phẩm",          icon: Package },
  { to: "/shop/admin/products/new",    label: "Thêm sản phẩm",     icon: PackagePlus },
  { to: "/shop/inventory/low-stock",   label: "Hàng sắp hết",      icon: AlertTriangle },
  { divider: true, label: "Danh mục" },
  { to: "/shop/catalog/categories",    label: "Danh mục",           icon: FolderTree },
  { to: "/shop/catalog/attributes",    label: "Thuộc tính",         icon: Tag },
  { to: "/shop/catalog/brands",        label: "Thương hiệu",        icon: Award },
  { divider: true, label: "Tương tác" },
  { to: "/shop/reviews",               label: "Đánh giá",           icon: Star },
  { to: "/shop/marketing",             label: "Marketing",          icon: Megaphone },
  { divider: true, label: "Tài chính" },
  { to: "/shop/wallet",                label: "Ví cửa hàng",        icon: Wallet },
  { divider: true },
  { to: "/shop/settings",              label: "Cài đặt shop",       icon: Settings },
];

export default function ShopLayout() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="flex min-h-[calc(100dvh-var(--header-height))] bg-[#f6fbff]">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-white border-r border-default-200 shadow-sm transition-all duration-300 flex-shrink-0 ${
          collapsed ? "w-16" : "w-[var(--sidebar-width,220px)]"
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between px-3 py-4 border-b border-default-100">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <Store size={14} className="text-white" />
              </div>
              <span className="font-bold text-default-800 text-sm">DFS Seller</span>
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
            if (item.divider) {
              return (
                <div key={`div-${idx}`}>
                  <Divider className="my-2" />
                  {!collapsed && item.label && (
                    <p className="text-[10px] font-bold text-default-400 uppercase px-3 mb-1">{item.label}</p>
                  )}
                </div>
              );
            }
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/shop/dashboard"}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? "bg-primary text-white shadow-sm"
                      : "text-default-600 hover:bg-default-100 hover:text-default-900"
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
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
