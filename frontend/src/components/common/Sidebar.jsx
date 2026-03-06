import React from "react";
import { Button, Divider } from "@heroui/react";
import {
  BarChart2, Activity, TrendingDown, DollarSign,
  ShoppingCart, Tag, Image, Menu, X,
} from "lucide-react";

const MENU_ITEMS = [
  { id: "analytics",       name: "Analytics",       icon: BarChart2 },
  { id: "chart",           name: "Chart",            icon: Activity },
  { id: "forecast",        name: "Forecast",         icon: TrendingDown },
  { id: "revenue",         name: "Revenue",          icon: DollarSign },
  { id: "manage_products", name: "Manage Products",  icon: ShoppingCart },
  { id: "manage_vouchers", name: "Manage Voucher",   icon: Tag },
  { id: "manage_banners",  name: "Manage Banner",    icon: Image },
  { id: "manage_flashsale","name": "Manage Flashsale", icon: Image },
];

export default function Sidebar({ activeMenu, setActiveMenu, sidebarOpen, setSidebarOpen }) {
  return (
    <div
      className={`flex flex-col bg-white shadow-md transition-all duration-300 ${
        sidebarOpen ? "w-64 p-4" : "w-20 p-3"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-default-100 pb-3 mb-3">
        <div className={`flex items-center ${!sidebarOpen ? "justify-center w-full" : ""}`}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
            A
          </div>
          {sidebarOpen && <span className="ml-3 font-bold text-default-800">Shop</span>}
        </div>
        {sidebarOpen && (
          <Button isIconOnly size="sm" variant="light" onPress={() => setSidebarOpen(false)}>
            <X size={18} />
          </Button>
        )}
      </div>

      {/* User info */}
      <div className="mb-4">
        <div className="flex items-center gap-2 bg-default-50 rounded-xl px-3 py-2">
          <img
            src="https://ui-avatars.com/api/?name=Shop+Owner&background=random"
            alt="User"
            className="w-9 h-9 rounded-full flex-shrink-0"
          />
          {sidebarOpen && (
            <div>
              <p className="text-sm font-semibold text-default-800 leading-tight">Shop Owner</p>
              <p className="text-xs text-default-500">Hi, Welcome back</p>
            </div>
          )}
        </div>
      </div>

      <Divider className="mb-3" />

      {/* Menu */}
      <nav className="flex-1 space-y-1">
        {MENU_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveMenu(item.id)}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
                isActive
                  ? "bg-primary text-white"
                  : "text-default-600 hover:bg-default-100 hover:text-default-900"
              } ${!sidebarOpen ? "justify-center" : ""}`}
              title={!sidebarOpen ? item.name : undefined}
            >
              <Icon size={18} className="flex-shrink-0" />
              {sidebarOpen && <span>{item.name}</span>}
            </button>
          );
        })}
      </nav>

      {/* Toggle when collapsed */}
      {!sidebarOpen && (
        <Button
          isIconOnly
          variant="light"
          onPress={() => setSidebarOpen(true)}
          className="mt-auto mx-auto"
        >
          <Menu size={20} />
        </Button>
      )}
    </div>
  );
}
