import React, { useState } from "react";
import { Link as RouterLink } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Send, MapPin, Phone, Mail, Facebook, Instagram, Youtube,
  ChevronRight, Shield, RefreshCw, Truck, CreditCard,
} from "lucide-react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (email.trim()) {
      setSubscribed(true);
      setEmail("");
    }
  };

  return (
    <footer
      style={{
        background: "linear-gradient(180deg, #1E3A8A 0%, #1E40AF 40%, #1D4ED8 100%)",
        fontFamily: "'Quicksand', 'Segoe UI', sans-serif",
      }}
    >
      {/* ── Trust strip ── */}
      <div style={{ background: "rgba(255,255,255,0.07)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { Icon: Truck,      label: "Miễn phí vận chuyển", sub: "Đơn hàng từ 299K" },
            { Icon: RefreshCw,  label: "Đổi trả 30 ngày",     sub: "Miễn phí hoàn toàn" },
            { Icon: Shield,     label: "Hàng chính hãng",      sub: "100% authentic" },
            { Icon: CreditCard, label: "Thanh toán an toàn",   sub: "Bảo mật SSL 256-bit" },
          ].map(({ Icon, label, sub }, i) => (
            <div key={i} className="flex items-center gap-3">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                <Icon size={16} className="text-blue-200" />
              </div>
              <div>
                <p className="text-white text-[13px] font-bold leading-tight">{label}</p>
                <p className="text-blue-300 text-[11px] mt-0.5" style={{ fontWeight: 500 }}>{sub}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Main grid ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">

        {/* Brand column */}
        <div className="lg:col-span-4">
          <div className="flex items-center gap-2.5 mb-4">
            <div
              className="w-10 h-10 rounded-2xl overflow-hidden flex-shrink-0"
              style={{ boxShadow: "0 0 0 2px rgba(255,255,255,0.3), 0 4px 12px rgba(0,0,0,0.2)" }}
            >
              <div className="w-full h-full bg-white flex items-center justify-center">
                <span className="text-blue-700 font-black text-sm" style={{ fontFamily: "'Baloo 2', cursive" }}>DF</span>
              </div>
            </div>
            <div>
              <p className="text-white font-black text-[18px] tracking-tight leading-tight" style={{ fontFamily: "'Baloo 2', cursive" }}>
                Daily Fit
              </p>
              <p className="text-blue-300 text-[10px] font-bold uppercase tracking-[0.15em]">Smart Fashion</p>
            </div>
          </div>

          <p className="text-blue-200 text-sm leading-relaxed mb-6 max-w-[280px]" style={{ fontWeight: 500 }}>
            Thương hiệu thời trang chính hãng — chất lượng & trải nghiệm là ưu tiên số 1 của chúng tôi.
          </p>

          {/* Newsletter */}
          <div className="mb-6">
            <p className="text-white text-[13px] font-bold mb-2.5 uppercase tracking-wider">
              Nhận ưu đãi độc quyền
            </p>
            {subscribed ? (
              <motion.div
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 text-sm font-bold text-green-300"
              >
                ✓ Đăng ký thành công! Cảm ơn bạn.
              </motion.div>
            ) : (
              <form onSubmit={handleSubscribe} className="flex gap-2 max-w-[280px]">
                <div
                  className="flex-1 flex items-center gap-1.5 h-9 rounded-full px-3"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1.5px solid rgba(255,255,255,0.25)",
                  }}
                >
                  <Mail size={13} className="text-blue-300 flex-shrink-0" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Email của bạn…"
                    className="flex-1 bg-transparent border-none outline-none text-sm text-white placeholder-blue-300 min-w-0 font-semibold"
                    style={{ fontFamily: "'Quicksand', sans-serif" }}
                    required
                  />
                </div>
                <motion.button
                  type="submit"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.94 }}
                  className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold shadow-md"
                  style={{ background: "#ffffff", color: "#1D4ED8" }}
                  aria-label="Đăng ký"
                >
                  <Send size={14} />
                </motion.button>
              </form>
            )}
          </div>

          {/* Socials */}
          <div className="flex gap-2">
            {[
              { href: "#", Icon: Facebook,  color: "#60A5FA", label: "Facebook" },
              { href: "#", Icon: Instagram, color: "#F9A8D4", label: "Instagram" },
              { href: "#", Icon: Youtube,   color: "#FCA5A5", label: "YouTube" },
            ].map(({ href, Icon, color, label }) => (
              <motion.a
                key={label}
                href={href}
                aria-label={label}
                whileHover={{ scale: 1.12, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="w-9 h-9 rounded-full flex items-center justify-center transition-all"
                style={{
                  background: "rgba(255,255,255,0.1)",
                  border: "1.5px solid rgba(255,255,255,0.2)",
                  color,
                }}
              >
                <Icon size={17} />
              </motion.a>
            ))}
          </div>
        </div>

        {/* Sản phẩm */}
        <div className="lg:col-span-2">
          <h4
            className="text-[11px] font-black uppercase tracking-[0.18em] mb-4 pb-2"
            style={{
              color: "#93C5FD",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "'Baloo 2', cursive",
              letterSpacing: "0.18em",
            }}
          >
            Sản phẩm
          </h4>
          <ul className="space-y-2.5">
            {[
              ["/collections/new",          "Hàng mới về"],
              ["/collections/best-sellers", "Bán chạy nhất"],
              ["/collections/men",          "Thời trang Nam"],
              ["/collections/women",        "Thời trang Nữ"],
              ["/collections/unisex",       "Unisex"],
              ["/sale",                     "Khuyến mãi"],
            ].map(([to, label]) => (
              <li key={to}>
                <RouterLink
                  to={to}
                  className="group flex items-center gap-1.5 text-sm font-semibold text-blue-200 hover:text-white transition-colors no-underline"
                >
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-300 -ml-1" />
                  {label}
                </RouterLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Hỗ trợ */}
        <div className="lg:col-span-2">
          <h4
            className="text-[11px] font-black uppercase tracking-[0.18em] mb-4 pb-2"
            style={{
              color: "#93C5FD",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "'Baloo 2', cursive",
              letterSpacing: "0.18em",
            }}
          >
            Hỗ trợ
          </h4>
          <ul className="space-y-2.5">
            {[
              ["/help/size-guide", "Bảng size"],
              ["/help/shipping",   "Chính sách vận chuyển"],
              ["/help/returns",    "Đổi trả & hoàn tiền"],
              ["/help/faq",        "FAQ"],
              ["/contact",         "Liên hệ"],
              ["/about",           "Về chúng tôi"],
            ].map(([to, label]) => (
              <li key={to}>
                <RouterLink
                  to={to}
                  className="group flex items-center gap-1.5 text-sm font-semibold text-blue-200 hover:text-white transition-colors no-underline"
                >
                  <ChevronRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-blue-300 -ml-1" />
                  {label}
                </RouterLink>
              </li>
            ))}
          </ul>
        </div>

        {/* Liên hệ */}
        <div className="lg:col-span-4">
          <h4
            className="text-[11px] font-black uppercase tracking-[0.18em] mb-4 pb-2"
            style={{
              color: "#93C5FD",
              borderBottom: "1px solid rgba(255,255,255,0.1)",
              fontFamily: "'Baloo 2', cursive",
              letterSpacing: "0.18em",
            }}
          >
            Liên hệ
          </h4>

          <ul className="space-y-4 mb-6">
            {[
              { Icon: MapPin, text: "Đại học FPT, Hà Nội" },
              { Icon: Phone,  text: "(028) 1234 5678" },
              { Icon: Mail,   text: "support@dailyfit.vn" },
            ].map(({ Icon, text }, i) => (
              <li key={i} className="flex items-start gap-3">
                <div
                  className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.15)" }}
                >
                  <Icon size={14} className="text-blue-300" />
                </div>
                <span className="text-sm font-semibold text-blue-100 leading-tight pt-1.5">{text}</span>
              </li>
            ))}
          </ul>

          {/* Payment badges */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-400 mb-2.5"
              style={{ fontFamily: "'Baloo 2', cursive" }}>
              Phương thức thanh toán
            </p>
            <div className="flex flex-wrap gap-2">
              {["VISA", "MasterCard", "PayPal", "COD"].map((method) => (
                <span
                  key={method}
                  className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                  style={{
                    background: "rgba(255,255,255,0.12)",
                    border: "1px solid rgba(255,255,255,0.2)",
                    color: "rgba(255,255,255,0.85)",
                    fontFamily: "'Quicksand', sans-serif",
                  }}
                >
                  {method}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Bottom bar ── */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.1)", background: "rgba(0,0,0,0.15)" }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-blue-300 text-xs font-semibold">
            © {new Date().getFullYear()} Daily Fit. All rights reserved.
          </p>
          <div className="flex items-center gap-1">
            {[
              ["/terms",   "Điều khoản"],
              ["/privacy", "Bảo mật"],
              ["/cookies", "Cookies"],
            ].map(([to, label], i, arr) => (
              <React.Fragment key={to}>
                <RouterLink
                  to={to}
                  className="text-blue-300 hover:text-white text-xs font-semibold transition-colors no-underline"
                >
                  {label}
                </RouterLink>
                {i < arr.length - 1 && (
                  <span className="text-blue-600 mx-2 text-xs">·</span>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}