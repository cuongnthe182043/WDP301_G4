import React, { useState, useEffect } from "react";
import { Link as RouterLink, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import dfsLogo from "../../assets/icons/DFS-NonBG.png";
import {
  Navbar, NavbarBrand, NavbarContent, NavbarItem,
  NavbarMenuToggle, NavbarMenu, NavbarMenuItem,
  Avatar,
  Dropdown, DropdownTrigger, DropdownMenu, DropdownItem,
} from "@heroui/react";
import {
  Search, ShoppingCart, Bell, User, UserPlus, LogIn,
  Receipt, LogOut, Heart, Wallet, X, ChevronRight, Store,
  Package, CreditCard, Tag, Settings, Check, Trash2, ExternalLink,
  Sun, Moon,
} from "lucide-react";
import { useNotifications } from "../../context/NotificationContext";
import { useTheme } from "../../context/ThemeContext";
import { useTranslation } from "react-i18next";

/* ── font inject ── */
if (typeof document !== "undefined" && !document.getElementById("header-font-override")) {
  const s = document.createElement("style");
  s.id = "header-font-override";
  s.textContent = `
    .dfs-header, .dfs-header * { font-family: 'Quicksand', 'Segoe UI', sans-serif !important; }
    .dfs-header .brand-name { font-family: 'Baloo 2', cursive !important; font-weight: 800; }
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

/* ── Notification meta ── */
const NOTIF_META = {
  "order.placed": { Icon: Package, color: "#2563EB", bg: "#EFF6FF" },
  "order.confirmed": { Icon: Package, color: "#7C3AED", bg: "#EDE9FE" },
  "order.shipped": { Icon: Package, color: "#0284C7", bg: "#E0F2FE" },
  "order.delivered": { Icon: Package, color: "#16A34A", bg: "#DCFCE7" },
  "order.cancelled": { Icon: Package, color: "#DC2626", bg: "#FEE2E2" },
  "payment.success": { Icon: CreditCard, color: "#16A34A", bg: "#DCFCE7" },
  "payment.failed": { Icon: CreditCard, color: "#DC2626", bg: "#FEE2E2" },
  "system.password": { Icon: Settings, color: "#D97706", bg: "#FEF3C7" },
  "system.security": { Icon: Settings, color: "#DC2626", bg: "#FEE2E2" },
  promotion: { Icon: Tag, color: "#DB2777", bg: "#FCE7F3" },
  order: { Icon: Package, color: "#2563EB", bg: "#EFF6FF" },
  payment: { Icon: CreditCard, color: "#16A34A", bg: "#DCFCE7" },
  system: { Icon: Settings, color: "#D97706", bg: "#FEF3C7" },
};
function getNotifMeta(n) {
  return NOTIF_META[n.subtype] || NOTIF_META[n.type] || NOTIF_META.system;
}

function useTimeAgo() {
  const { t } = useTranslation();
  return (date) => {
    try {
      const diff = Date.now() - new Date(date).getTime();
      const m = Math.floor(diff / 60000);
      if (m < 1) return t("notification.just_now");
      if (m < 60) return t("notification.minutes_ago", { count: m });
      const h = Math.floor(m / 60);
      if (h < 24) return t("notification.hours_ago", { count: h });
      const d = Math.floor(h / 24);
      if (d < 7) return t("notification.days_ago", { count: d });
      return new Date(date).toLocaleDateString();
    } catch { return ""; }
  };
}

/* ══════════════════════════════════════════
   INLINE ICON BUTTON — matches cart/bell style
══════════════════════════════════════════ */
function IconBtn({ children, scrolled, onClick, title, badge }) {
  const iconColor = scrolled ? "#1D4ED8" : "#ffffff";
  return (
    <motion.button
      whileHover={{ scale: 1.08 }} whileTap={{ scale: 0.94 }}
      onClick={onClick}
      title={title}
      className="relative w-9 h-9 flex items-center justify-center rounded-full outline-none focus:outline-none flex-shrink-0"
      style={{ color: iconColor }}
    >
      <div
        className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
        style={scrolled ? {} : { background: "rgba(255,255,255,0.12)" }}
      >
        {children}
      </div>
      {!!badge && (
        <span
          className="absolute -top-0.5 -right-0.5 min-w-[17px] h-[17px] rounded-full flex items-center justify-center text-[9px] font-black text-white px-0.5"
          style={{ background: "#EF4444", boxShadow: "0 0 0 2px " + (scrolled ? "#fff" : "#1D4ED8") }}
        >
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </motion.button>
  );
}

const FLAG_VI = () => (
  <img src="/FlagVN.png" alt="Tiếng Việt" width={20} height={20} style={{ borderRadius: 2, display: "block", objectFit: "cover" }} />
);

const FLAG_EN = () => (
  <img src="/FlagENG.png" alt="English" width={20} height={20} style={{ borderRadius: 2, display: "block", objectFit: "cover" }} />
);

function LanguageToggle({ scrolled }) {
  const { i18n } = useTranslation();
  const isVI = (i18n.language || "vi").startsWith("vi");
  const toggle = () => i18n.changeLanguage(isVI ? "en" : "vi");

  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      onClick={toggle}
      title={isVI ? "Switch to English" : "Đổi sang Tiếng Việt"}
      className="relative flex items-center justify-center flex-shrink-0 outline-none focus:outline-none cursor-pointer rounded-full"
      style={{
        width: 36, height: 36,
        background: scrolled ? "rgba(37,99,235,0.07)" : "rgba(255,255,255,0.12)",
        border: scrolled ? "1.5px solid #BFDBFE" : "1.5px solid rgba(255,255,255,0.25)",
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={isVI ? "vi" : "en"}
          initial={{ opacity: 0, scale: 0.6, rotate: -15 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.6, rotate: 15 }}
          transition={{ duration: 0.2 }}
          style={{ display: "flex", alignItems: "center", justifyContent: "center" }}
        >
          {isVI ? <FLAG_VI /> : <FLAG_EN />}
        </motion.span>
      </AnimatePresence>
    </motion.button>
  );
}

function ThemeToggleBtn({ scrolled, isDark, onToggle }) {
  const iconColor = scrolled ? "#1D4ED8" : "#ffffff";
  return (
    <motion.button
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.94 }}
      onClick={onToggle}
      title={isDark ? "Chế độ sáng" : "Chế độ tối"}
      className="relative w-9 h-9 flex items-center justify-center rounded-full outline-none focus:outline-none flex-shrink-0 cursor-pointer"
      style={{ color: iconColor }}
    >
      <div
        className="w-9 h-9 flex items-center justify-center rounded-full transition-colors"
        style={scrolled ? {} : { background: "rgba(255,255,255,0.12)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          {isDark ? (
            <motion.span key="sun"
              initial={{ rotate: -90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: 90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex" }}
            >
              <Sun size={18} />
            </motion.span>
          ) : (
            <motion.span key="moon"
              initial={{ rotate: 90, opacity: 0, scale: 0.6 }}
              animate={{ rotate: 0, opacity: 1, scale: 1 }}
              exit={{ rotate: -90, opacity: 0, scale: 0.6 }}
              transition={{ duration: 0.2 }}
              style={{ display: "flex" }}
            >
              <Moon size={17} />
            </motion.span>
          )}
        </AnimatePresence>
      </div>
    </motion.button>
  );
}

/* ══════════════════════════════════════════
   NOTIFICATION DROPDOWN
══════════════════════════════════════════ */
function NotificationDropdown({ scrolled, isDark }) {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const timeAgo = useTimeAgo();
  const { notifications, unreadCount, markRead, markAllRead, deleteNotif } = useNotifications();
  const preview = notifications.slice(0, 6);

  return (
    <Dropdown placement="bottom-end" backdrop="transparent">
      <DropdownTrigger>
        <span>
          <IconBtn scrolled={scrolled} badge={unreadCount}>
            <Bell size={19} />
          </IconBtn>
        </span>
      </DropdownTrigger>

      <DropdownMenu
        aria-label={t("notification.title")}
        className="p-0 overflow-hidden"
        style={{
          width: 360, maxHeight: "calc(100vh - 80px)",
          fontFamily: "'Quicksand', sans-serif",
          borderRadius: 20,
          boxShadow: isDark
            ? "0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)"
            : "0 12px 48px rgba(29,78,216,0.14), 0 0 0 1px #DBEAFE",
          background: isDark ? "#18181b" : "#fff",
        }}
      >
        <DropdownItem key="header" isReadOnly className="cursor-default px-4 py-3 opacity-100 rounded-none"
          style={{ borderBottom: isDark ? "1px solid #27272a" : "1px solid #EFF6FF", background: isDark ? "#1f1f23" : "linear-gradient(135deg,#EFF6FF,#DBEAFE)" }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell size={15} className="text-blue-600" />
              <span className="font-black text-blue-900 text-sm">{t("notification.title")}</span>
              {unreadCount > 0 && <span className="bg-red-500 text-white text-[10px] font-black rounded-full px-1.5 py-0.5 leading-none">{unreadCount}</span>}
            </div>
            {unreadCount > 0 && (
              <button onClick={(e) => { e.stopPropagation(); markAllRead(); }}
                className="flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors">
                <Check size={11} />{t("notification.mark_all_read")}
              </button>
            )}
          </div>
        </DropdownItem>

        {preview.length === 0 ? (
          <DropdownItem key="empty" isReadOnly className="cursor-default py-10 text-center opacity-100">
            <div className="flex flex-col items-center gap-2">
              <Bell size={28} className="text-blue-200" />
              <p className="text-sm text-gray-400 font-semibold">{t("notification.empty")}</p>
            </div>
          </DropdownItem>
        ) : preview.map((n) => {
          const { Icon, color, bg } = getNotifMeta(n);
          return (
            <DropdownItem key={n._id} isReadOnly className="cursor-pointer px-0 py-0 opacity-100 rounded-none">
              <div
                onClick={() => { if (!n.isRead) markRead(n._id); if (n.link) navigate(n.link); }}
                className="flex gap-3 px-4 py-3 transition-colors cursor-pointer group"
                style={{ background: n.isRead ? "transparent" : (isDark ? "#1f1f23" : "#F0F7FF") }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? "#27272a" : "#EFF6FF"}
                onMouseLeave={e => e.currentTarget.style.background = n.isRead ? "transparent" : (isDark ? "#1f1f23" : "#F0F7FF")}
              >
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: bg }}>
                  <Icon size={16} style={{ color }} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1">
                    <p className={`text-xs leading-tight ${n.isRead ? "font-semibold text-gray-700" : "font-black text-gray-900"}`}>{n.title}</p>
                    {!n.isRead && <span className="w-2 h-2 rounded-full flex-shrink-0 mt-1" style={{ background: "#2563EB" }} />}
                  </div>
                  <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-2 leading-relaxed">{n.message}</p>
                  <p className="text-[10px] text-blue-400 mt-1 font-semibold">{timeAgo(n.createdAt)}</p>
                </div>
                <button onClick={(e) => { e.stopPropagation(); deleteNotif(n._id); }}
                  className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-50 transition-all">
                  <Trash2 size={12} className="text-red-400" />
                </button>
              </div>
            </DropdownItem>
          );
        })}

        <DropdownItem key="view-all" isReadOnly className="cursor-pointer opacity-100 rounded-none px-4 py-2.5"
          style={{ borderTop: isDark ? "1px solid #27272a" : "1px solid #EFF6FF", background: isDark ? "#121215" : "#F8FBFF" }}>
          <button onClick={() => navigate("/notifications")}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-blue-600 hover:text-blue-800 transition-colors">
            <ExternalLink size={12} />{t("notification.view_all")}
          </button>
        </DropdownItem>
      </DropdownMenu>
    </Dropdown>
  );
}

/* ── Profile links ── */
const PROFILE_LINKS = [
  { key: "profile", icon: User, labelKey: "nav.profile", path: "/profile", iconBg: "#EFF6FF", iconColor: "#2563EB" },
  { key: "orders", icon: Receipt, labelKey: "nav.orders", path: "/orders", iconBg: "#F0FDF4", iconColor: "#16A34A" },
  { key: "wishlist", icon: Heart, labelKey: "nav.wishlist", path: "/wishlist", iconBg: "#FFF1F2", iconColor: "#E11D48" },
  { key: "wallet", icon: Wallet, labelKey: "nav.wallet", path: "/wallet", iconBg: "#FFFBEB", iconColor: "#D97706" },
  { key: "vouchers", icon: Tag, labelKey: "nav.vouchers", path: "/vouchers", iconBg: "#FDF4FF", iconColor: "#9333EA" },
];

const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/change-password"];

const NAV_BLUE = {
  background: "linear-gradient(135deg, #1E40AF 0%, #1D4ED8 50%, #2563EB 100%)",
  boxShadow: "0 4px 24px rgba(30,64,175,0.35)",
};
const NAV_WHITE_LIGHT = {
  background: "#ffffff",
  boxShadow: "0 2px 16px rgba(30,64,175,0.10)",
  borderBottom: "1.5px solid #EFF6FF",
};
const NAV_WHITE_DARK = {
  background: "#18181b",
  boxShadow: "0 2px 16px rgba(0,0,0,0.4)",
  borderBottom: "1.5px solid #27272a",
};

export default function Header({ cartCount = 0, notifyCount = 0, user = null, onLogout }) {
  const location = useLocation();
  const navigate = useNavigate();
  const scrolled = useScrolled();
  const isAuth = AUTH_PATHS.some(p => location.pathname.startsWith(p));
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";
  const { t } = useTranslation();

  const [searchQ, setSearchQ] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(false);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  const submitSearch = (e) => {
    e?.preventDefault();
    const kw = searchQ.trim();
    if (!kw) return;
    setMenuOpen(false);
    navigate(`/search?q=${encodeURIComponent(kw)}`);
  };

  const iconCls = scrolled ? (isDark ? "text-blue-400" : "text-blue-700") : "text-white";

  const dropdownStyle = {
    fontFamily: "'Quicksand', sans-serif",
    borderRadius: 20,
    overflow: "hidden",
    boxShadow: isDark
      ? "0 16px 48px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)"
      : "0 16px 48px rgba(29,78,216,0.12), 0 4px 16px rgba(0,0,0,0.06), 0 0 0 1.5px #DBEAFE",
    background: isDark ? "#1c1c1f" : "#ffffff",
  };

  return (
    <Navbar
      isMenuOpen={menuOpen}
      onMenuOpenChange={setMenuOpen}
      isBordered={false}
      maxWidth="full"
      style={scrolled ? (isDark ? NAV_WHITE_DARK : NAV_WHITE_LIGHT) : NAV_BLUE}
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
            className="w-9 h-9 rounded-xl overflow-hidden flex-shrink-0"
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
              <span className={`brand-name text-[17px] tracking-tight ${scrolled ? "text-blue-800" : "text-white"}`}>Daily Fit</span>
              <span className="text-[9px] font-bold uppercase tracking-[0.18em]"
                style={{ color: scrolled ? "#93C5FD" : "rgba(255,255,255,0.6)" }}>Smart Fashion</span>
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
                  ? (searchFocus ? "#EFF6FF" : "#F1F5F9")
                  : (searchFocus ? "rgba(255,255,255,0.22)" : "rgba(255,255,255,0.15)"),
                boxShadow: searchFocus
                  ? scrolled ? "0 0 0 2px #3B82F6" : "0 0 0 2px rgba(255,255,255,0.5)"
                  : "none",
                border: scrolled
                  ? `1.5px solid ${searchFocus ? "#3B82F6" : "#E2E8F0"}`
                  : `1.5px solid ${searchFocus ? "rgba(255,255,255,0.6)" : "rgba(255,255,255,0.25)"}`,
              }}
            >
              <Search size={14} style={{ color: scrolled ? (searchFocus ? "#2563EB" : "#94A3B8") : "rgba(255,255,255,0.7)", flexShrink: 0 }} />
              <input
                type="search"
                placeholder={t("nav.search_placeholder")}
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                onFocus={() => setSearchFocus(true)}
                onBlur={() => setSearchFocus(false)}
                className="flex-1 bg-transparent border-none outline-none text-sm min-w-0 font-semibold"
                style={{ color: scrolled ? "#1E293B" : "#ffffff", fontFamily: "'Quicksand', sans-serif" }}
              />
              <style>{`input[type="search"]::placeholder{color:${scrolled ? "#94A3B8" : "rgba(255,255,255,0.55)"};font-family:'Quicksand',sans-serif;}input[type="search"]::-webkit-search-cancel-button{display:none;}`}</style>
              <AnimatePresence>
                {searchQ && (
                  <motion.button type="button"
                    initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    onClick={() => setSearchQ("")}
                    className="rounded-full p-0.5 flex-shrink-0"
                    style={{ color: scrolled ? "#94A3B8" : "rgba(255,255,255,0.6)" }}>
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
      {/* ORDER: Notification → Cart → Language → Theme → User */}
      <NavbarContent justify="end" className="gap-1 flex-shrink-0">

        {/* ── GUEST ── */}
        {!isAuth && !user && (
          <>
            {/* Mobile search */}
            <NavbarItem className="md:hidden">
              <IconBtn scrolled={scrolled} onClick={() => setMenuOpen(true)}>
                <Search size={18} />
              </IconBtn>
            </NavbarItem>

            {/* Language toggle */}
            <NavbarItem className="hidden sm:flex items-center">
              <LanguageToggle scrolled={scrolled} />
            </NavbarItem>

            {/* Theme toggle */}
            <NavbarItem className="hidden sm:flex">
              <ThemeToggleBtn scrolled={scrolled} isDark={isDark} onToggle={toggleTheme} />
            </NavbarItem>

            {/* Register */}
            <NavbarItem className="hidden sm:flex">
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <RouterLink to="/register"
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-bold transition-all no-underline"
                  style={{
                    border: scrolled ? "1.5px solid #BFDBFE" : "1.5px solid rgba(255,255,255,0.5)",
                    color: scrolled ? "#1D4ED8" : "#ffffff",
                    background: scrolled ? "#EFF6FF" : "rgba(255,255,255,0.12)",
                    fontFamily: "'Quicksand', sans-serif",
                  }}>
                  <UserPlus size={13} />{t("common.register")}
                </RouterLink>
              </motion.div>
            </NavbarItem>

            {/* Login */}
            <NavbarItem>
              <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                <RouterLink to="/login"
                  className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full text-xs font-bold transition-all no-underline shadow-sm"
                  style={scrolled
                    ? { background: "linear-gradient(135deg,#1D4ED8,#2563EB)", color: "#fff", boxShadow: "0 2px 10px rgba(29,78,216,0.3)", fontFamily: "'Quicksand',sans-serif" }
                    : { background: "#fff", color: "#1D4ED8", fontFamily: "'Quicksand',sans-serif" }
                  }>
                  <LogIn size={13} />{t("common.login")}
                </RouterLink>
              </motion.div>
            </NavbarItem>

            <NavbarItem className="sm:hidden">
              <NavbarMenuToggle aria-label={menuOpen ? "Đóng" : "Mở"} className={iconCls} />
            </NavbarItem>
          </>
        )}

        {/* ── LOGGED IN ── */}
        {!isAuth && user && (
          <>
            {/* Mobile search */}
            <NavbarItem className="md:hidden">
              <IconBtn scrolled={scrolled} onClick={() => setMenuOpen(true)}>
                <Search size={18} />
              </IconBtn>
            </NavbarItem>

            {/* 1. Notifications */}
            <NavbarItem className="hidden sm:flex">
              <NotificationDropdown scrolled={scrolled} isDark={isDark} />
            </NavbarItem>

            {/* 2. Cart */}
            <NavbarItem>
              <RouterLink to="/cart" className="no-underline">
                <IconBtn scrolled={scrolled} badge={cartCount}>
                  <ShoppingCart size={20} />
                </IconBtn>
              </RouterLink>
            </NavbarItem>

            {/* 3. Language toggle */}
            <NavbarItem className="hidden sm:flex items-center">
              <LanguageToggle scrolled={scrolled} />
            </NavbarItem>

            {/* 4. Theme toggle */}
            <NavbarItem className="hidden sm:flex">
              <ThemeToggleBtn scrolled={scrolled} isDark={isDark} onToggle={toggleTheme} />
            </NavbarItem>

            {/* 5. User / Profile dropdown */}
            <NavbarItem>
              <Dropdown placement="bottom-end" backdrop="transparent">
                <DropdownTrigger>
                  <motion.button
                    whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                    className="w-9 h-9 flex items-center justify-center rounded-full outline-none focus:outline-none flex-shrink-0"
                  >
                    <Avatar
                      size="sm"
                      name={(user?.name || user?.email || "U").charAt(0).toUpperCase()}
                      src={user?.avatar_url || undefined}
                      classNames={{ base: "cursor-pointer font-black text-sm bg-gradient-to-br from-blue-400 to-blue-700 text-white w-8 h-8" }}
                      style={{
                        boxShadow: scrolled
                          ? "0 0 0 2.5px #BFDBFE, 0 2px 8px rgba(29,78,216,0.2)"
                          : "0 0 0 2.5px rgba(255,255,255,0.6), 0 2px 8px rgba(0,0,0,0.15)"
                      }}
                    />
                  </motion.button>
                </DropdownTrigger>

                <DropdownMenu
                  aria-label={t("nav.profile")}
                  className="p-0"
                  style={{ ...dropdownStyle, width: 272 }}
                  itemClasses={{ base: "rounded-xl gap-0 data-[hover=true]:bg-transparent px-0 py-0" }}
                >
                  {/* Identity card */}
                  <DropdownItem key="identity" isReadOnly className="opacity-100 cursor-default px-0 py-0 mb-1">
                    <div className="px-4 py-4 flex items-center gap-3"
                      style={{
                        background: isDark ? "linear-gradient(135deg,#1e293b,#1f2937)" : "linear-gradient(135deg,#EFF6FF,#DBEAFE)",
                        borderBottom: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #BFDBFE",
                      }}>
                      <div className="relative flex-shrink-0">
                        <Avatar size="md"
                          name={(user?.name || "U").charAt(0).toUpperCase()}
                          src={user?.avatar_url || undefined}
                          classNames={{ base: "bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-black" }}
                          style={{ boxShadow: "0 0 0 3px rgba(255,255,255,0.8), 0 4px 12px rgba(29,78,216,0.25)" }}
                        />
                        <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-black text-[15px] truncate leading-tight"
                          style={{ color: isDark ? "#f1f5f9" : "#1e3a8a" }}>
                          {user?.name || t("nav.profile")}
                        </p>
                        {user?.email && (
                          <p className="text-[11px] truncate mt-0.5 font-semibold"
                            style={{ color: isDark ? "#60a5fa" : "#3b82f6" }}>
                            {user.email}
                          </p>
                        )}
                        <span className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold"
                          style={{ background: isDark ? "rgba(59,130,246,0.2)" : "#DBEAFE", color: isDark ? "#60a5fa" : "#1d4ed8" }}>
                          ✦ Member
                        </span>
                      </div>
                    </div>
                  </DropdownItem>

                  {/* Nav links */}
                  {PROFILE_LINKS.map(({ key, icon: Icon, labelKey, path, iconBg, iconColor: ic }) => (
                    <DropdownItem key={key} className="opacity-100 px-0 py-0">
                      <div
                        className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                        onClick={() => navigate(path)}
                        onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#F8FAFF"}
                        onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                      >
                        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                          style={{ background: isDark ? "rgba(255,255,255,0.06)" : iconBg }}>
                          <Icon size={15} style={{ color: isDark ? "#94a3b8" : ic }} />
                        </div>
                        <span className="font-semibold text-[13px]" style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}>
                          {t(labelKey)}
                        </span>
                        <ChevronRight size={13} className="ml-auto" style={{ color: isDark ? "#475569" : "#CBD5E1" }} />
                      </div>
                    </DropdownItem>
                  ))}

                  {/* Shop */}
                  <DropdownItem key="shop" className="opacity-100 px-0 py-0">
                    {user?.role_name === "shop_owner" && <div
                      className="flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors"
                      onClick={() => navigate(user?.role_name === "shop_owner" ? "/shop/dashboard" : "/register-shop")}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#F0FDF4"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: isDark ? "rgba(255,255,255,0.06)" : "#F0FDF4" }}>
                        <Store size={15} style={{ color: isDark ? "#94a3b8" : "#16a34a" }} />
                      </div>
                      <span className="font-semibold text-[13px]" style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}>
                        {t("nav.manage_shop")}
                      </span>
                      <ChevronRight size={13} className="ml-auto" style={{ color: isDark ? "#475569" : "#CBD5E1" }} />
                    </div>}
                  </DropdownItem>

                  {/* Logout */}
                  <DropdownItem key="logout" className="opacity-100 px-0 py-0 mt-1">
                    <div
                      className="flex items-center gap-3 px-4 py-3 cursor-pointer transition-colors"
                      onClick={onLogout}
                      style={{ borderTop: isDark ? "1px solid rgba(255,255,255,0.07)" : "1px solid #FEE2E2" }}
                      onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.08)" : "#FFF1F2"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: isDark ? "rgba(239,68,68,0.12)" : "#FEE2E2" }}>
                        <LogOut size={15} style={{ color: "#ef4444" }} />
                      </div>
                      <span className="font-bold text-[13px] text-red-500">{t("common.logout")}</span>
                    </div>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </NavbarItem>

            <NavbarItem className="sm:hidden">
              <NavbarMenuToggle aria-label={menuOpen ? "Đóng" : "Mở"} className={iconCls} />
            </NavbarItem>
          </>
        )}
      </NavbarContent>

      {/* ════ MOBILE MENU ════ */}
      <NavbarMenu
        className="top-[64px] pt-0 pb-6 px-0 gap-0 overflow-y-auto"
        style={{
          background: isDark ? "#1e293b" : "#ffffff",
          borderTop: isDark ? "2px solid #334155" : "2px solid #DBEAFE",
          boxShadow: isDark ? "0 8px 32px rgba(0,0,0,0.3)" : "0 8px 32px rgba(29,78,216,0.12)",
          maxHeight: "85dvh",
          fontFamily: "'Quicksand', sans-serif",
        }}
      >
        <div className="w-full h-1 mb-3 flex-shrink-0"
          style={{ background: "linear-gradient(90deg,#1D4ED8,#3B82F6,#60A5FA)" }} />

        {/* Mobile search */}
        <NavbarMenuItem className="px-4 mb-3">
          <div className="flex items-center gap-2 h-10 rounded-xl px-3 border-2"
            style={{ background: "#F8FAFF", borderColor: "#BFDBFE" }}>
            <Search size={15} className="text-blue-400 flex-shrink-0" />
            <form onSubmit={submitSearch} className="flex-1 flex items-center gap-1">
              <input type="search" autoFocus
                placeholder={t("nav.search_placeholder")}
                value={searchQ} onChange={e => setSearchQ(e.target.value)}
                className="flex-1 bg-transparent border-none outline-none text-sm text-gray-800 font-semibold"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
              />
              {searchQ && <button type="button" onClick={() => setSearchQ("")}><X size={13} className="text-gray-400" /></button>}
            </form>
          </div>
        </NavbarMenuItem>

        {/* Mobile language + theme row */}
        <NavbarMenuItem className="px-4 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-xs font-bold" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Ngôn ngữ:</span>
            <LanguageToggle scrolled={true} />
            <span className="text-xs font-bold ml-2" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>Giao diện:</span>
            <ThemeToggleBtn scrolled={true} isDark={isDark} onToggle={toggleTheme} />
          </div>
        </NavbarMenuItem>

        {user ? (
          <>
            <NavbarMenuItem className="px-4 mb-2">
              <div className="flex items-center gap-3 p-3 rounded-2xl"
                style={isDark
                  ? { background: "#1f1f23", border: "1px solid #27272a" }
                  : { background: "linear-gradient(135deg,#EFF6FF,#DBEAFE)", border: "1.5px solid #BFDBFE" }}>
                <div className="relative flex-shrink-0">
                  <Avatar size="sm"
                    name={(user?.name || "U").charAt(0).toUpperCase()}
                    src={user?.avatar_url || undefined}
                    classNames={{ base: "bg-gradient-to-br from-blue-500 to-blue-700 text-white font-black" }}
                  />
                  <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-400 rounded-full border-2 border-white" />
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm truncate" style={{ color: isDark ? "#f1f5f9" : "#1e3a8a" }}>{user?.name}</p>
                  {user?.email && <p className="text-xs truncate text-blue-400">{user.email}</p>}
                </div>
              </div>
            </NavbarMenuItem>

            <div className="px-3">
              {[
                { icon: User, label: t("nav.profile"), path: "/profile", iconBg: "#EFF6FF", ic: "#2563EB" },
                { icon: Receipt, label: t("nav.orders"), path: "/orders", iconBg: "#F0FDF4", ic: "#16A34A" },
                { icon: Heart, label: t("nav.wishlist"), path: "/wishlist", iconBg: "#FFF1F2", ic: "#E11D48" },
                { icon: Wallet, label: t("nav.wallet"), path: "/wallet", iconBg: "#FFFBEB", ic: "#D97706" },
                { icon: Tag, label: t("nav.vouchers"), path: "/vouchers", iconBg: "#FDF4FF", ic: "#9333EA" },
                { icon: Bell, label: t("nav.notifications"), path: "/notifications", iconBg: "#EFF6FF", ic: "#2563EB", badge: notifyCount },
              ].map(({ icon: Icon, label, path, iconBg, ic, badge }) => (
                <NavbarMenuItem key={path}>
                  <RouterLink to={path}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-[14px] font-semibold transition-colors no-underline"
                    style={{ color: isDark ? "#e2e8f0" : "#1e293b", fontFamily: "'Quicksand', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.04)" : "#F8FAFF"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: isDark ? "rgba(255,255,255,0.06)" : iconBg }}>
                      <Icon size={15} style={{ color: isDark ? "#94a3b8" : ic }} />
                    </div>
                    {label}
                    {!!badge && (
                      <span className="ml-auto bg-red-500 text-white text-[10px] font-black rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">{badge}</span>
                    )}
                    <ChevronRight size={14} className="ml-auto" style={{ color: isDark ? "#475569" : "#CBD5E1" }} />
                  </RouterLink>
                </NavbarMenuItem>
              ))}
            </div>

            <div className="mx-4 my-2 h-px" style={{ background: isDark ? "rgba(255,255,255,0.07)" : "#FEE2E2" }} />

            <NavbarMenuItem className="px-3">
              <button onClick={onLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-500 font-semibold text-[14px] w-full"
                style={{ fontFamily: "'Quicksand', sans-serif" }}
                onMouseEnter={e => e.currentTarget.style.background = isDark ? "rgba(239,68,68,0.08)" : "#FFF1F2"}
                onMouseLeave={e => e.currentTarget.style.background = "transparent"}
              >
                <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: isDark ? "rgba(239,68,68,0.12)" : "#FEE2E2" }}>
                  <LogOut size={15} className="text-red-500" />
                </div>
                {t("common.logout")}
              </button>
            </NavbarMenuItem>
          </>
        ) : (
          <div className="px-4 mt-1 flex flex-col gap-2">
            <p className="text-xs font-bold text-blue-400 uppercase tracking-widest px-1 mb-1">
              {t("nav.profile")}
            </p>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <RouterLink to="/login"
                className="flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-black text-white no-underline"
                style={{ background: "linear-gradient(135deg,#1E40AF,#2563EB)", boxShadow: "0 4px 14px rgba(29,78,216,0.35)", fontFamily: "'Quicksand',sans-serif" }}>
                <LogIn size={15} />{t("common.login")}
              </RouterLink>
            </motion.div>
            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
              <RouterLink to="/register"
                className="flex items-center justify-center gap-2 h-11 rounded-2xl text-sm font-bold no-underline"
                style={{ border: "2px solid #BFDBFE", color: "#1D4ED8", background: "#EFF6FF", fontFamily: "'Quicksand',sans-serif" }}>
                <UserPlus size={15} />{t("common.register")}
              </RouterLink>
            </motion.div>
          </div>
        )}
      </NavbarMenu>
    </Navbar>
  );
}