import React, { useState, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import dfsLogo from "../../assets/icons/DFS-NonBG.png";
import {
  Navbar, NavbarBrand, NavbarContent, NavbarItem,
  NavbarMenuToggle, NavbarMenu, NavbarMenuItem,
  Button, Avatar,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem, DropdownSection,
} from "@heroui/react";
import {
  Search, ShoppingCart, Bell, User, UserPlus, LogIn,
  Receipt, LogOut, Heart, Wallet, X, ChevronRight, Store,
  Package, CreditCard, Tag, Settings, Check, Trash2, ExternalLink,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";

/* ── font helper injected once ── */
if (typeof document !== "undefined" && !document.getElementById("header-font-override")) {
  const s = document.createElement("style");
  s.id = "header-font-override";
  s.textContent = `
    .dfs-header, .dfs-header * {
      font-family: 'Quicksand', 'Segoe UI', sans-serif !important;
    }
    .dfs-header .brand-name {
      font-family: 'Baloo 2', cursive !important;
      font-weight: 800;
    }
    .dfs-header .nav-menu-item {
      font-family: 'Quicksand', sans-serif !important;
      font-weight: 600;
    }
  `;
  document.head.appendChild(s);
}

/* ── Scroll detector ── */
function useScrolled(threshold = 12) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > threshold);
    handler();
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, [threshold]);
  return scrolled;
}

/* ── Notification type → icon + colour ── */
const NOTIF_META = {
  "order.placed":    { Icon: Package,    color: "#2563EB", bg: "#EFF6FF" },
  "order.confirmed": { Icon: Package,    color: "#7C3AED", bg: "#EDE9FE" },
  "order.shipped":   { Icon: Package,    color: "#0284C7", bg: "#E0F2FE" },
  "order.delivered": { Icon: Package,    color: "#16A34A", bg: "#DCFCE7" },
  "order.cancelled": { Icon: Package,    color: "#DC2626", bg: "#FEE2E2" },
  "payment.success": { Icon: CreditCard, color: "#16A34A", bg: "#DCFCE7" },
  "payment.failed":  { Icon: CreditCard, color: "#DC2626", bg: "#FEE2E2" },
  "system.password": { Icon: Settings,   color: "#D97706", bg: "#FEF3C7" },
  "system.security": { Icon: Settings,   color: "#DC2626", bg: "#FEE2E2" },
  "promotion":       { Icon: Tag,        color: "#DB2777", bg: "#FCE7F3" },
  order:             { Icon: Package,    color: "#2563EB", bg: "#EFF6FF" },
  payment:           { Icon: CreditCard, color: "#16A34A", bg: "#DCFCE7" },
  system:            { Icon: Settings,   color: "#D97706", bg: "#FEF3C7" },
  promotion:         { Icon: Tag,        color: "#DB2777", bg: "#FCE7F3" },
};

function getNotifMeta(n) {
  return NOTIF_META[n.subtype] || NOTIF_META[n.type] || NOTIF_META.system;
}

function timeAgo(date) {
  try {
    const diff = Date.now() - new Date(date).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return "vừa xong";
    if (m < 60) return `${m} phút trước`;
    const h = Math.floor(m / 60);
    if (h < 24) return `${h} giờ trước`;
    const d = Math.floor(h / 24);
    if (d < 7) return `${d} ngày trước`;
    return new Date(date).toLocaleDateString("vi-VN");
  } catch { return ""; }
}

/* ── Notification dropdown panel ── */
function NotificationDropdown({ scrolled }) {
  const navigate = useNavigate();
  const { notifications, unreadCount, markRead, markAllRead, deleteNotif } = useNotifications();
  const iconColor = scrolled ? "#1D4ED8" : "#ffffff";

  const preview = notifications.slice(0, 6);

  return (
    <Dropdown placement="bottom-end" backdrop="transparent">
      <DropdownTrigger>
        <motion.button
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
          className="relative w-9 h-9 flex items-center justify-center rounded-full outline-none focus:outline-none"
          style={{ color: iconColor }}
        >
          <div
            className="w-9 h-9 flex items-center justify-center rounded-full"
            style={scrolled ? {} : { background: "rgba(255,255,255,0.12)" }}
          >
            <Bell size={19} />
          </div>
          <AnimatePresence>
            {unreadCount > 0 && (
              <motion.span
                key="badge"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                exit={{ scale: 0 }}
                transition={{ type: "spring", stiffness: 500, damping: 20 }}
                className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-black text-white px-0.5"
                style={{
                  background: "#EF4444",
                  boxShadow: "0 0 0 2px " + (scrolled ? "#fff" : "#1D4ED8"),
                  fontFamily: "'Quicksand', sans-serif",
                }}
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </DropdownTrigger>

      <DropdownMenu
        aria-label="Thông báo"
        className="p-0 overflow-hidden"
        style={{
          width: 360,
          maxHeight: "calc(100vh - 80px)",
          fontFamily: "'Quicksand', sans-serif",
          borderRadius: 20,
          boxShadow: "0 8px 40px rgba(29,78,216,0.16), 0 2px 12px rgba(0,0,0,0.08)",
          border: "1.5px solid #DBEAFE",
          background: "#fff",
        }}
      >
        {/* Header row */}
        <DropdownItem
          key="header"
          isReadOnly
          className="cursor-default px-4 py-3 opacity-100 rounded-none border-b border-blue-50"
          style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)" }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-blue-600" />
              <span className="font-black text-blue-900 text-sm">Thông báo</span>
              {unreadCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">
                  {unreadCount}
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); markAllRead(); }}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Check size={11} />
                Đọc tất cả
              </button>
            )}
          </div>
        </DropdownItem>

        {/* Notification items */}
        {preview.length === 0 ? (
          <DropdownItem key="empty" isReadOnly className="cursor-default py-10 text-center opacity-100">
            <div className="flex flex-col items-center gap-2">
              <Bell size={28} className="text-blue-200" />
              <p className="text-sm text-gray-400 font-semibold">Không có thông báo</p>
            </div>
          </DropdownItem>
        ) : (
          preview.map((n) => {
            const { Icon, color, bg } = getNotifMeta(n);
            return (
              <DropdownItem
                key={n._id}
                isReadOnly
                className="cursor-pointer px-0 py-0 opacity-100 rounded-none"
              >
                <div
                  onClick={() => {
                    if (!n.isRead) markRead(n._id);
                    if (n.link) navigate(n.link);
                  }}
                  className="flex gap-3 px-4 py-3 transition-colors hover:bg-blue-50 cursor-pointer"
                  style={{ background: n.isRead ? "transparent" : "#F0F7FF" }}
                >
                  {/* Icon */}
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: bg }}
                  >
                    <Icon size={16} style={{ color }} />
                  </div>

                  {/* Text */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-1">
                      <p className={`text-xs leading-tight ${n.isRead ? "font-semibold text-gray-700" : "font-black text-gray-900"}`}>
                        {n.title}
                      </p>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: "#2563EB" }} />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>
                    <p className="text-[10px] text-blue-400 mt-1 font-semibold">
                      {timeAgo(n.createdAt)}
                    </p>
                  </div>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}
                    className="flex-shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100 p-1 rounded-lg hover:bg-red-50 transition-all"
                    title="Xoá"
                  >
                    <Trash2 size={12} className="text-red-400" />
                  </button>
                </div>
              </DropdownItem>
            );
          })
        )}

        {/* Footer */}
        <DropdownItem
          key="view-all"
          isReadOnly
          className="cursor-pointer opacity-100 rounded-none border-t border-blue-50 px-4 py-2.5"
          style={{ background: "#F8FBFF" }}
        >
          <button
            onClick={() => navigate("/notifications")}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ExternalLink size={12} />
            Xem tất cả thông báo
          </button>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/change-password"];

const NAV_BLUE = {
  background: "linear-gradient(135deg, #1E40AF 0%, #1D4ED8 50%, #2563EB 100%)",
  boxShadow: "0 4px 24px rgba(30,64,175,0.35)",
};
const NAV_WHITE = {
  background: "#ffffff",
  boxShadow: "0 2px 16px rgba(30,64,175,0.10)",
  borderBottom: "1.5px solid #EFF6FF",
};

export default function Header({ cartCount = 0, notifyCount = 0, user = null, onSearch, onLogout }) {
  const location  = useLocation();
  const navigate  = useNavigate();
  const scrolled  = useScrolled();
  const isAuth    = AUTH_PATHS.some(p => location.pathname.startsWith(p));

  const [searchQ,     setSearchQ]     = useState("");
  const [menuOpen,    setMenuOpen]    = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const submitSearch = (e) => {
    e?.preventDefault();
    const kw = searchQ.trim();
    if (!kw) return;
    setMenuOpen(false);
    navigate(`/search?q=${encodeURIComponent(kw)}`);
  };

  const iconColor = scrolled ? "#1D4ED8" : "#ffffff";
  const iconCls   = scrolled ? "text-blue-700" : "text-white";

  return (
    <Navbar
      isMenuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      isBordered={false}
      maxWidth="full"
      style={scrolled ? NAV_WHITE : NAV_BLUE}
      className="dfs-header"
      classNames={{
        base: "sticky top-0 z-50 transition-all duration-300",
        wrapper: "px-4 sm:px-6 max-w-7xl mx-auto h-[64px]",
      }}
    >
      {/* ════ BRAND ════ */}
      <NavbarBrand className="flex-shrink-0 gap-0">
        <RouterLink to="/" className="flex items-center gap-2.5 no-underline group">
          <motion.div
            whileHover={{ scale: 1.08, rotate: -4 }}
            transition={{ type: "spring", stiffness: 500, damping: 18 }}
            className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0 shadow-md"
            style={{
              boxShadow: scrolled
                ? "0 0 0 2px rgba(29,78,216,0.2), 0 2px 8px rgba(29,78,216,0.15)"
                : "0 0 0 2px rgba(255,255,255,0.35), 0 2px 8px rgba(0,0,0,0.15)"
            }}
          >
            <img src={dfsLogo} alt="DFS" className="w-full h-full object-cover" />
          </motion.div>

          {!isAuth && (
            <div className="hidden sm:flex flex-col leading-[1.15]">
              <span className={`brand-name text-[17px] tracking-tight ${scrolled ? "text-blue-800" : "text-white"}`}>
                Daily Fit
              </span>
              <span
                className="text-[9px] font-bold uppercase tracking-[0.18em]"
                style={{ color: scrolled ? "#93C5FD" : "rgba(255,255,255,0.6)" }}
              >
                Smart Fashion
              </span>
            </div>
          )}
        </RouterLink>
      </NavbarBrand>

      {/* ════ SEARCH ════ */}
      {!isAuth && (
        <NavbarContent className="hidden md:flex flex-1 max-w-[480px] mx-6" justify="center">
          <form onSubmit={submitSearch} className="w-full">
            <div
              className="flex items-center gap-2 w-full h-9 rounded-full px-3 transition-all duration-200"
              style={{
                background: scrolled
                  ? searchFocus ? "#EFF6FF" : "#F1F5F9"
                  : searchFocus ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.15)",
                boxShadow: searchFocus
                  ? scrolled
                    ? "0 0 0 2px #3B82F6, 0 2px 8px rgba(59,130,246,0.15)"
                    : "0 0 0 2px rgba(255,255,255,0.5), 0 2px 8px rgba(0,0,0,0.1)"
                  : "none",
                border: scrolled
                  ? `1.5px solid ${searchFocus ? "#3B82F6" : "#E2E8F0"}`
                  : `1.5px solid ${searchFocus ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)"}`,
              }}
            >
              <Search size={14} style={{ color: scrolled ? (searchFocus ? "#2563EB" : "#94A3B8") : "rgba(255,255,255,0.7)", flexShrink: 0 }} />
              <input
                type="search"
                placeholder="Tìm sản phẩm, thương hiệu…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                className="flex-1 bg-transparent border-none outline-none text-sm min-w-0 font-semibold"
                style={{ color: scrolled ? "#1E293B" : "#ffffff", fontFamily: "'Quicksand', sans-serif" }}
              />
              <style>{`
                input[type="search"]::placeholder { color: ${scrolled ? "#94A3B8" : "rgba(255,255,255,0.55)"}; font-family: 'Quicksand', sans-serif; }
                input[type="search"]::-webkit-search-cancel-button { display: none; }
              `}</style>
              <AnimatePresence>
                {searchQ && (
                  <motion.button
                    type="button"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setSearchQ("")}
                    className="rounded-full p-0.5 flex-shrink-0"
                    style={{ color: scrolled ? "#94A3B8" : "rgba(255,255,255,0.6)" }}
                  >
                    <X size={13} />
                  </motion.button>
                )}
              </AnimatePresence>
              <button type="submit" className="sr-only">Tìm</button>
            </div>
          </form>
        </NavbarContent>
      )}

      {/* ════ RIGHT ACTIONS ════ */}
      <NavbarContent justify="end" className="gap-1 flex-shrink-0">

        {/* GUEST */}
        {!isAuth && !user && (
          <>
            <NavbarItem className="md:hidden">
              <motion.button whileTap={{ scale: 0.92 }}
                className={`w-9 h-9 flex items-center justify-center rounded-full transition-colors ${scrolled ? "hover:bg-blue-50 text-blue-700" : "hover:bg-white/15 text-white"}`}
                onClick={() => setMenuOpen(true)}>
                <Search size={18} />
              </motion.button>
            </NavbarItem>

            <NavbarItem className="hidden sm:flex">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <RouterLink to="/register"
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-bold transition-all duration-200 no-underline"
                  style={{
                    border: scrolled ? "1.5px solid #BFDBFE" : "1.5px solid rgba(255,255,255,0.5)",
                    color: scrolled ? "#1D4ED8" : "#ffffff",
                    background: scrolled ? "#EFF6FF" : "rgba(255,255,255,0.12)",
                    fontFamily: "'Quicksand', sans-serif",
                  }}>
                  <UserPlus size={13} />
                  Đăng ký
                </RouterLink>
              </motion.div>
            </NavbarItem>

            <NavbarItem>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <RouterLink to="/login"
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-bold transition-all duration-200 no-underline shadow-sm"
                  style={scrolled
                    ? { background: "linear-gradient(135deg, #1D4ED8, #2563EB)", color: "#ffffff", boxShadow: "0 2px 10px rgba(29,78,216,0.3)", fontFamily: "'Quicksand', sans-serif" }
                    : { background: "#ffffff", color: "#1D4ED8", boxShadow: "0 2px 8px rgba(0,0,0,0.1)", fontFamily: "'Quicksand', sans-serif" }
                  }>
                  <LogIn size={13} />
                  Đăng nhập
                </RouterLink>
              </motion.div>
            </NavbarItem>

            <NavbarItem className="sm:hidden">
              <NavbarMenuToggle aria-label={menuOpen ? "Đóng menu" : "Mở menu"} className={iconCls} />
            </NavbarItem>
          </>
        )}

        {/* LOGGED IN */}
        {!isAuth && user && (
          <>
            <NavbarItem className="md:hidden">
              <motion.button whileTap={{ scale: 0.92 }}
                className={`w-9 h-9 flex items-center justify-center rounded-full ${scrolled ? "hover:bg-blue-50 text-blue-700" : "hover:bg-white/15 text-white"}`}
                onClick={() => setMenuOpen(true)}>
                <Search size={18} />
              </motion.button>
            </NavbarItem>

            {/* Cart */}
            <NavbarItem>
              <motion.div whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}>
                <RouterLink to="/cart"
                  className="relative w-9 h-9 flex items-center justify-center rounded-full no-underline"
                  style={{ color: iconColor }}>
                  <div className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
                    style={scrolled ? {} : { background: "rgba(255,255,255,0.12)" }}>
                    <ShoppingCart size={20} />
                  </div>
                  {!!cartCount && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-black text-white px-0.5"
                      style={{ background: "#EF4444", boxShadow: "0 0 0 2px " + (scrolled ? "#fff" : "#1D4ED8"), fontFamily: "'Quicksand', sans-serif" }}>
                      {cartCount > 99 ? "99+" : cartCount}
                    </span>
                  )}
                </RouterLink>
              </motion.div>
            </NavbarItem>

            {/* Notification Bell Dropdown */}
            <NavbarItem className="hidden sm:flex">
              <NotificationDropdown scrolled={scrolled} />
            </NavbarItem>

            {/* Profile dropdown */}
            <NavbarItem>
              <Dropdown placement="bottom-end" backdrop="blur">
                <DropdownTrigger>
                  <motion.button whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="outline-none focus:outline-none">
                    <Avatar
                      size="sm"
                      name={(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                      src={user?.avatar_url || undefined}
                      classNames={{ base: "cursor-pointer font-black text-sm bg-gradient-to-br from-blue-400 to-blue-700 text-white" }}
                      style={{
                        boxShadow: scrolled
                          ? "0 0 0 2.5px #BFDBFE, 0 2px 8px rgba(29,78,216,0.2)"
                          : "0 0 0 2.5px rgba(255,255,255,0.6), 0 2px 8px rgba(0,0,0,0.15)"
                      }}
                    />
                  </motion.button>
                </DropdownTrigger>

                <DropdownMenu
                  aria-label="Tài khoản"
                  className="w-64 p-1"
                  style={{ fontFamily: "'Quicksand', sans-serif" }}
                  itemClasses={{ base: "rounded-xl gap-2.5 data-[hover=true]:bg-blue-50" }}
                >
                  <DropdownSection showDivider>
                    <DropdownItem key="identity" isReadOnly className="cursor-default py-3 opacity-100">
                      <div className="flex items-center gap-3">
                        <Avatar size="sm"
                          name={(user?.name || "U").charAt(0).toUpperCase()}
                          src={user?.avatar_url || undefined}
                          classNames={{ base: "bg-gradient-to-br from-blue-500 to-blue-700 text-white font-black flex-shrink-0" }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="font-black text-sm text-gray-900 truncate leading-tight">{user?.name || "Tài khoản"}</p>
                          {user?.email && <p className="text-[11px] text-blue-400 truncate leading-tight mt-0.5">{user.email}</p>}
                        </div>
                      </div>
                    </DropdownItem>
                  </DropdownSection>

                  <DropdownSection showDivider>
                    {[
                      { key: "profile",  icon: User,    label: "Hồ sơ cá nhân",      desc: "Thông tin, địa chỉ, mật khẩu", path: "/profile" },
                      { key: "orders",   icon: Receipt, label: "Đơn hàng của tôi",   desc: "Theo dõi & quản lý đơn hàng",  path: "/orders" },
                      { key: "wishlist", icon: Heart,   label: "Sản phẩm yêu thích", path: "/wishlist" },
                      { key: "wallet",   icon: Wallet,  label: "Ví DFS",              path: "/wallet" },
                    ].map(({ key, icon: Icon, label, desc, path }) => (
                      <DropdownItem key={key}
                        startContent={
                          <div className="w-7 h-7 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Icon size={14} className="text-blue-600" />
                          </div>
                        }
                        description={desc}
                        onPress={() => navigate(path)}
                      >
                        <span className="font-semibold text-sm text-gray-800">{label}</span>
                      </DropdownItem>
                    ))}
                  </DropdownSection>

                  <DropdownSection showDivider>
                    {user?.role_name === "shop_owner" ? (
                      <DropdownItem key="manage-shop"
                        startContent={<div className="w-7 h-7 rounded-lg bg-emerald-50 flex items-center justify-center flex-shrink-0"><Store size={14} className="text-emerald-600" /></div>}
                        description="Quản lý sản phẩm & đơn hàng"
                        onPress={() => navigate("/shop/dashboard")}>
                        <span className="font-semibold text-sm text-gray-800">Quản lý shop</span>
                      </DropdownItem>
                    ) : (
                      <DropdownItem key="register-shop"
                        startContent={<div className="w-7 h-7 rounded-lg bg-amber-50 flex items-center justify-center flex-shrink-0"><Store size={14} className="text-amber-600" /></div>}
                        description="Mở shop và bắt đầu bán hàng"
                        onPress={() => navigate("/register-shop")}>
                        <span className="font-semibold text-sm text-gray-800">Đăng ký bán hàng</span>
                      </DropdownItem>
                    )}
                  </DropdownSection>

                  <DropdownSection>
                    <DropdownItem key="logout" color="danger"
                      startContent={<div className="w-7 h-7 rounded-lg bg-red-50 flex items-center justify-center flex-shrink-0"><LogOut size={14} className="text-red-500" /></div>}
                      onPress={onLogout}>
                      <span className="font-semibold text-sm">Đăng xuất</span>
                    </DropdownItem>
                  </DropdownSection>
                </DropdownMenu>
              </Dropdown>
            </NavbarItem>

            <NavbarItem className="sm:hidden">
              <NavbarMenuToggle aria-label={menuOpen ? "Đóng menu" : "Mở menu"} className={iconCls} />
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      {/* ════ MOBILE MENU ════ */}
      <NavbarMenu
        className="top-[64px] pt-0 pb-6 px-0 gap-0 overflow-y-auto"
        style={{
          background: "#ffffff",
          borderTop: "2px solid #DBEAFE",
          boxShadow: "0 8px 32px rgba(29,78,216,0.12)",
          maxHeight: "85dvh",
          fontFamily: "'Quicksand', sans-serif",
        }}
      >
        <div className="w-full h-1 mb-3 flex-shrink-0"
          style={{ background: "linear-gradient(90deg, #1D4ED8, #3B82F6, #60A5FA)" }} />

        {/* Mobile search */}
        <NavbarMenuItem className="px-4 mb-3">
          <div className="flex items-center gap-2 h-10 rounded-xl px-3 border-2 transition-all"
            style={{ background: "#F8FAFF", borderColor: "#BFDBFE" }}>
            <Search size={15} className="text-blue-400 flex-shrink-0" />
            <form onSubmit={submitSearch} className="flex-1 flex items-center gap-1">
              <input
                type="search"
                autoFocus
                placeholder="Tìm sản phẩm, thương hiệu…"
                value={searchQ}
                onChange={(e) => setSearchQ(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 placeholder-blue-300 font-semibold"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              />
              {searchQ && <button type="button" onClick={() => setSearchQ("")}><X size={13} className="text-gray-400" /></button>}
            </form>
          </div>
        </NavbarMenuItem>

        {user ? (
          <>
            <NavbarMenuItem className="px-4 mb-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl"
                style={{ background: "linear-gradient(135deg, #EFF6FF, #DBEAFE)", border: "1.5px solid #BFDBFE" }}>
                <Avatar size="sm"
                  name={(user?.name || "U").charAt(0).toUpperCase()}
                  src={user?.avatar_url || undefined}
                  classNames={{ base: "bg-gradient-to-br from-blue-500 to-blue-700 text-white font-black flex-shrink-0" }}
                />
                <div className="min-w-0">
                  <p className="font-black text-sm text-blue-900 truncate">{user?.name || "Tài khoản"}</p>
                  {user?.email && <p className="text-xs text-blue-400 truncate">{user.email}</p>}
                </div>
              </div>
            </NavbarMenuItem>

            <div className="px-3">
              {[
                { icon: User,    label: "Hồ sơ cá nhân",      path: "/profile" },
                { icon: Receipt, label: "Đơn hàng của tôi",   path: "/orders" },
                { icon: Heart,   label: "Sản phẩm yêu thích", path: "/wishlist" },
                { icon: Wallet,  label: "Ví DFS",              path: "/wallet" },
                { icon: Bell,    label: "Thông báo",           path: "/notifications", badge: notifyCount },
              ].map(({ icon: Icon, label, path, badge }) => (
                <NavbarMenuItem key={path}>
                  <RouterLink to={path}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-blue-50 text-gray-700 font-semibold text-[14px] transition-colors no-underline group"
                    style={{ fontFamily: "'Quicksand', sans-serif" }}>
                    <div className="w-8 h-8 rounded-xl bg-blue-50 group-hover:bg-blue-100 flex items-center justify-center flex-shrink-0 transition-colors">
                      <Icon size={15} className="text-blue-600" />
                    </div>
                    {label}
                    {!!badge && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                        {badge}
                      </span>
                    )}
                    <ChevronRight size={14} className="ml-auto text-gray-300 group-hover:text-blue-400 transition-colors" />
                  </RouterLink>
                </NavbarMenuItem>
              ))}
            </div>

            <div className="mx-4 my-2 h-px bg-blue-50" />

            <NavbarMenuItem className="px-3">
              <button onClick={onLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-500 font-semibold text-[14px] transition-colors w-full"
                style={{ fontFamily: "'Quicksand', sans-serif" }}>
                <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                  <LogOut size={15} className="text-red-500" />
                </div>
                Đăng xuất
              </button>
            </NavbarMenuItem>
          </>
        ) : (
          <div className="px-4 mt-1 flex flex-col gap-2">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest px-1 mb-1"
              style={{ fontFamily: "'Quicksand', sans-serif" }}>
              Tài khoản
            </p>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <RouterLink to="/login"
                className="flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-black text-white no-underline shadow-md"
                style={{ background: "linear-gradient(135deg, #1E40AF, #2563EB)", boxShadow: "0 4px 14px rgba(29,78,216,0.35)", fontFamily: "'Quicksand', sans-serif" }}>
                <LogIn size={15} />
                Đăng nhập
              </RouterLink>
            </motion.div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <RouterLink to="/register"
                className="flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-bold no-underline"
                style={{ border: "2px solid #BFDBFE", color: "#1D4ED8", background: "#EFF6FF", fontFamily: "'Quicksand', sans-serif" }}>
                <UserPlus size={15} />
                Tạo tài khoản
              </RouterLink>
            </motion.div>
          </div>
        )}
      </NavbarMenu>
    </Navbar>
  );
}
