import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { userService } from "../../services/userService";
import { useAuth } from "../../context/AuthContext";
import PersonalInfoForm from "../../components/PersonalInfoForm";
import AddressManager from "../../components/AddressManager";
import BankAccountsManager from "../../components/BankAccountsManager";
import ChangePasswordForm from "../../components/ChangePasswordForm";
import { Skeleton, Avatar } from "@heroui/react";
import { User, MapPin, Wallet, Lock, ChevronRight, Shield, Star } from "lucide-react";
import PageContainer from "../../components/ui/PageContainer.jsx";

const TABS = [
  {
    id: "personal",
    label: "Thông tin cá nhân",
    icon: User,
    desc: "Họ tên, email, số điện thoại",
    gradient: "from-blue-500 to-blue-700",
    lightBg: "#EFF6FF",
    accent: "#2563EB",
  },
  {
    id: "addresses",
    label: "Địa chỉ nhận hàng",
    icon: MapPin,
    desc: "Quản lý địa chỉ giao hàng",
    gradient: "from-sky-500 to-blue-600",
    lightBg: "#F0F9FF",
    accent: "#0284C7",
  },
  {
    id: "banks",
    label: "Tài khoản ngân hàng",
    icon: Wallet,
    desc: "Thêm & quản lý phương thức",
    gradient: "from-indigo-500 to-blue-700",
    lightBg: "#EEF2FF",
    accent: "#4338CA",
  },
  {
    id: "password",
    label: "Đổi mật khẩu",
    icon: Lock,
    desc: "Bảo mật tài khoản của bạn",
    gradient: "from-blue-600 to-indigo-700",
    lightBg: "#EFF6FF",
    accent: "#1D4ED8",
  },
];

/* ── Animated background orbs ── */
function BgOrbs() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden" style={{ zIndex: 0 }}>
      <motion.div
        animate={{ x: [0, 30, 0], y: [0, -20, 0], scale: [1, 1.08, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
        className="absolute rounded-full"
        style={{
          width: 420, height: 420,
          top: -120, left: -100,
          background: "radial-gradient(circle, rgba(59,130,246,0.13) 0%, transparent 70%)",
        }}
      />
      <motion.div
        animate={{ x: [0, -25, 0], y: [0, 30, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut", delay: 4 }}
        className="absolute rounded-full"
        style={{
          width: 500, height: 500,
          top: 200, right: -150,
          background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)",
        }}
      />
      <motion.div
        animate={{ x: [0, 20, 0], y: [0, -30, 0] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
        className="absolute rounded-full"
        style={{
          width: 300, height: 300,
          bottom: 100, left: "30%",
          background: "radial-gradient(circle, rgba(14,165,233,0.08) 0%, transparent 70%)",
        }}
      />
    </div>
  );
}

/* ── Avatar ring animation ── */
function UserAvatar({ me }) {
  const initial = (me?.name || me?.email || "U").charAt(0).toUpperCase();
  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, type: "spring", stiffness: 200 }}
      className="relative flex-shrink-0"
    >
      {/* Pulsing ring */}
      <motion.div
        animate={{ scale: [1, 1.12, 1], opacity: [0.5, 0.15, 0.5] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="absolute inset-0 rounded-full"
        style={{ background: "linear-gradient(135deg, #3B82F6, #6366F1)", margin: -6, borderRadius: "50%" }}
      />
      <Avatar
        size="lg"
        name={initial}
        src={me?.avatar_url || undefined}
        classNames={{
          base: "w-16 h-16 font-black text-xl text-white relative z-10",
        }}
        style={{
          background: "linear-gradient(135deg, #1D4ED8 0%, #4F46E5 100%)",
          boxShadow: "0 0 0 3px #fff, 0 4px 20px rgba(29,78,216,0.4)",
        }}
      />
      {/* Online dot */}
      <div
        className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white z-20"
        style={{ background: "#22C55E" }}
      />
    </motion.div>
  );
}

/* ── Skeleton loader ── */
function ProfileSkeleton() {
  return (
    <div className="relative" style={{ background: "#EFF6FF", minHeight: "100vh" }}>
      <BgOrbs />
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <Skeleton className="h-8 w-60 rounded-2xl mb-8" />
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">
          <div className="space-y-3">
            <Skeleton className="h-36 rounded-3xl" />
            <Skeleton className="h-48 rounded-3xl" />
          </div>
          <Skeleton className="h-[480px] rounded-3xl" />
        </div>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const { updateUser } = useAuth();
  const [me,        setMe]        = useState(null);
  const [activeTab, setActiveTab] = useState("personal");
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");

  const activeTabData = TABS.find((t) => t.id === activeTab);

  useEffect(() => {
    (async () => {
      try { const { user } = await userService.get(); setMe(user); }
      catch (e) { setError(e.message); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return <ProfileSkeleton />;

  if (error) return (
    <div className="flex items-center justify-center min-h-[50vh]">
      <div className="text-center">
        <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center mx-auto mb-3">
          <Shield size={24} className="text-red-400" />
        </div>
        <p className="text-red-500 font-bold">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="relative" style={{ background: "#EFF6FF", minHeight: "100vh" }}>
      <BgOrbs />

      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 pb-16">

        {/* ── Page header ── */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="mb-8"
        >
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1 h-6 rounded-full" style={{ background: "linear-gradient(180deg,#2563EB,#6366F1)" }} />
            <h1 className="text-2xl font-black text-blue-900 tracking-tight">Tài khoản của tôi</h1>
          </div>
          <p className="text-blue-400 text-sm ml-3 pl-0.5">Quản lý thông tin & bảo mật tài khoản</p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">

          {/* ══════════ SIDEBAR ══════════ */}
          <div className="space-y-4">

            {/* User card */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="rounded-3xl overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #1E40AF 0%, #2563EB 60%, #3B82F6 100%)",
                boxShadow: "0 8px 32px rgba(29,78,216,0.28)",
              }}
            >
              {/* Top pattern */}
              <div
                className="absolute inset-0 opacity-10 pointer-events-none"
                style={{
                  backgroundImage: "radial-gradient(circle at 70% 20%, white 1px, transparent 1px)",
                  backgroundSize: "28px 28px",
                  borderRadius: "inherit",
                }}
              />
              <div className="relative p-5 flex flex-col items-center text-center gap-3">
                <UserAvatar me={me} />
                <div>
                  <p className="text-white font-black text-lg leading-tight">
                    {me?.name || "Người dùng"}
                  </p>
                  {me?.email && (
                    <p className="text-blue-200 text-xs mt-1 truncate max-w-[200px]">{me.email}</p>
                  )}
                </div>
                {/* Membership badge */}
                <div
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold"
                  style={{ background: "rgba(255,255,255,0.18)", border: "1px solid rgba(255,255,255,0.25)", color: "#FEF9C3" }}
                >
                  <Star size={11} className="fill-yellow-300 text-yellow-300" />
                  Thành viên Silver
                </div>
              </div>
            </motion.div>

            {/* Tab nav card */}
            <motion.div
              initial={{ opacity: 0, x: -24 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.45, delay: 0.12 }}
              className="rounded-3xl overflow-hidden"
              style={{
                background: "#ffffff",
                boxShadow: "0 4px 24px rgba(29,78,216,0.08)",
                border: "1.5px solid #DBEAFE",
              }}
            >
              <div className="p-3 space-y-1">
                {TABS.map(({ id, label, icon: Icon, desc, gradient, lightBg, accent }, idx) => {
                  const active = activeTab === id;
                  return (
                    <motion.button
                      key={id}
                      onClick={() => setActiveTab(id)}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + idx * 0.06 }}
                      whileHover={!active ? { x: 3 } : {}}
                      whileTap={{ scale: 0.98 }}
                      className="w-full flex items-center gap-3 px-3 py-3 rounded-2xl text-left transition-all duration-200 relative overflow-hidden"
                      style={active ? {
                        background: `linear-gradient(135deg, ${accent}15, ${accent}08)`,
                        border: `1.5px solid ${accent}30`,
                      } : {
                        border: "1.5px solid transparent",
                      }}
                    >
                      {/* Active left bar */}
                      {active && (
                        <motion.div
                          layoutId="active-bar"
                          className="absolute left-0 top-3 bottom-3 w-1 rounded-full"
                          style={{ background: accent }}
                          transition={{ type: "spring", stiffness: 400, damping: 30 }}
                        />
                      )}

                      {/* Icon */}
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 ${
                          active ? `bg-gradient-to-br ${gradient} shadow-md` : ""
                        }`}
                        style={!active ? { background: lightBg } : {}}
                      >
                        <Icon size={16} style={{ color: active ? "#fff" : accent }} />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p
                          className="text-sm font-bold leading-tight truncate"
                          style={{ color: active ? accent : "#374151" }}
                        >
                          {label}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{desc}</p>
                      </div>

                      <ChevronRight
                        size={14}
                        className="flex-shrink-0 transition-all duration-200"
                        style={{ color: active ? accent : "#D1D5DB", opacity: active ? 1 : 0.5 }}
                      />
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          </div>

          {/* ══════════ CONTENT PANEL ══════════ */}
          <motion.div
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="rounded-3xl overflow-hidden"
            style={{
              background: "#ffffff",
              boxShadow: "0 4px 32px rgba(29,78,216,0.10)",
              border: "1.5px solid #DBEAFE",
            }}
          >
            {/* Panel header bar */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab + "-header"}
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                transition={{ duration: 0.22 }}
                className="px-6 py-4 flex items-center gap-3"
                style={{
                  background: `linear-gradient(135deg, ${activeTabData?.accent}12, ${activeTabData?.accent}05)`,
                  borderBottom: `1.5px solid ${activeTabData?.accent}20`,
                }}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br ${activeTabData?.gradient} shadow-md`}
                >
                  {activeTabData && <activeTabData.icon size={16} className="text-white" />}
                </div>
                <div>
                  <h2
                    className="text-base font-black leading-tight"
                    style={{ color: activeTabData?.accent }}
                  >
                    {activeTabData?.label}
                  </h2>
                  <p className="text-xs text-gray-400 mt-0.5">{activeTabData?.desc}</p>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Panel body */}
            <div className="p-6 sm:p-7">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 14, scale: 0.99 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.99 }}
                  transition={{ duration: 0.28, ease: "easeOut" }}
                >
                  {activeTab === "personal"  && <PersonalInfoForm me={me} onUpdated={(u) => { setMe(u); updateUser(u); }} />}
                  {activeTab === "addresses" && <AddressManager />}
                  {activeTab === "banks"     && <BankAccountsManager />}
                  {activeTab === "password"  && <ChangePasswordForm />}
                </motion.div>
              </AnimatePresence>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}