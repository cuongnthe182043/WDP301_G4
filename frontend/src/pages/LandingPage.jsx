import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from "react";
import { Link } from "react-router-dom";
import {
  motion, useMotionValue, useTransform, useSpring, AnimatePresence,
} from "framer-motion";
import {
  Button, Card, CardBody, CardFooter,
  Input, Chip, Avatar, Image,
} from "@heroui/react";

/* ─── Inject keyframes once ─── */
if (typeof document !== "undefined" && !document.getElementById("lp-kf")) {
  const s = document.createElement("style");
  s.id = "lp-kf";
  s.textContent = `
    @keyframes lpFloat {
      0%,100% { transform: translateY(0px) rotate(var(--lp-rot,0deg)); }
      50%      { transform: translateY(-16px) rotate(var(--lp-rot,0deg)); }
    }
    @keyframes lpShimmer {
      0%   { background-position: -200% center; }
      100% { background-position:  200% center; }
    }
    @keyframes lpTicker {
      0%   { transform: translateX(0); }
      100% { transform: translateX(-50%); }
    }
    @keyframes lpScan {
      0%   { top: -4px; opacity: 1; }
      100% { top: 110%;  opacity: 0; }
    }
    @keyframes lpPulse {
      0%,100% { box-shadow: 0 0 0 0   rgba(11,116,229,.28); }
      50%      { box-shadow: 0 0 0 16px rgba(11,116,229,0);  }
    }
    .lp-shimmer {
      background: linear-gradient(90deg, #0B74E5 0%, #7C3AED 40%, #0B74E5 80%);
      background-size: 200% auto;
      -webkit-background-clip: text; background-clip: text;
      -webkit-text-fill-color: transparent;
      animation: lpShimmer 4s linear infinite;
    }
    .lp-float      { animation: lpFloat 5s ease-in-out infinite; }
    .lp-float-slow { animation: lpFloat 7.5s ease-in-out infinite; }
    .lp-ticker     { animation: lpTicker 30s linear infinite; }
    .lp-ticker:hover { animation-play-state: paused; }
    .lp-scan { position: absolute; left:0; right:0; height:3px;
      background: linear-gradient(90deg,transparent,#0B74E5,transparent);
      animation: lpScan 2.4s ease-in-out infinite; }
    .lp-pulse { animation: lpPulse 2s ease-in-out infinite; }
    .lp-glass {
      background: rgba(255,255,255,.55);
      backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
      border: 1px solid rgba(255,255,255,.7);
    }
    .lp-mesh {
      background:
        radial-gradient(ellipse at 15% 50%, rgba(11,116,229,.07) 0%, transparent 55%),
        radial-gradient(ellipse at 85% 20%, rgba(124,58,237,.05) 0%, transparent 55%),
        radial-gradient(ellipse at 55% 80%, rgba(11,116,229,.04) 0%, transparent 55%),
        #f6fbff;
    }
    .lp-dots {
      background-image: radial-gradient(circle, rgba(11,116,229,.09) 1px, transparent 1px);
      background-size: 28px 28px;
    }
  `;
  document.head.appendChild(s);
}

/* ─── SVG icon helpers ─── */
const ico = (d, opts = {}) =>
  ({ size = 16, className = "", color, style, ...rest }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24"
      fill={opts.fill ? (color || "currentColor") : "none"}
      stroke={opts.fill ? "none" : (color || "currentColor")}
      strokeWidth={opts.fill ? 0 : 1.8}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...style }} {...rest}>
      {d}
    </svg>
  );

const IcoArrow       = ico(<path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/>);
const IcoChevR       = ico(<path d="m8.25 4.5 7.5 7.5-7.5 7.5"/>);
const IcoChevL       = ico(<path d="M15.75 19.5 8.25 12l7.5-7.5"/>);
const IcoStar        = ico(<path fill="currentColor" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"/>, {fill:true});
const IcoHeart       = ico(<path strokeLinecap="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/>);
const IcoCart        = ico(<path fill="currentColor" d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM3.75 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"/>, {fill:true});
const IcoBrain       = ico(<path fill="currentColor" d="M13.5 4.5c.513 0 1.012.065 1.488.186a3.75 3.75 0 0 1 6.262 2.814v.2c0 .604-.153 1.186-.422 1.7a3.751 3.751 0 0 1-.54 6.553A3.752 3.752 0 0 1 16.5 18c0 .386-.029.765-.086 1.135a3.75 3.75 0 0 1-6.426 1.74 3.752 3.752 0 0 1-4.814-4.042A3.752 3.752 0 0 1 2.75 13.5a3.751 3.751 0 0 1-.54-6.553 3.752 3.752 0 0 1 6.262-2.814c.476-.12.975-.186 1.488-.186h3.54Z"/>, {fill:true});
const IcoMeasure     = ico(<path fill="currentColor" d="M8.25 6.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM5.25 6.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM11.25 6.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM14.25 6.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5ZM17.25 6.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z"/>, {fill:true});
const IcoCheck       = ico(<path fill="currentColor" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"/>, {fill:true});
const IcoShip        = ico(<path fill="currentColor" d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875H3.75a3 3 0 1 0 5.99-.375h3.01a3 3 0 1 0 5.99.375h.375a1.875 1.875 0 0 0 1.875-1.875v-6H15a1.5 1.5 0 0 1-1.5-1.5V15Zm5.625-4.5h-4.875V12h3.914l.961-1.5ZM6.75 19.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm10.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/>, {fill:true});
const IcoFire        = ico(<path fill="currentColor" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"/>, {fill:true});
const IcoSparkle     = ico(<path fill="currentColor" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z"/>, {fill:true});
const IcoUser        = ico(<path fill="currentColor" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"/>, {fill:true});
const IcoQuote       = ico(<path fill="currentColor" d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Z"/>, {fill:true});

/* ─── Static Data ─── */
const PRODUCTS = [
  { id: 1, name: "Air Max Ultra", brand: "Nike", sub: "Limited Edition", price: 799000, orig: 1200000, rating: 4.5, cnt: 384, aiSize: "42", img: "https://images.unsplash.com/photo-1549298916-b41d501d3772?w=500&q=80", fallback: "https://picsum.photos/seed/shoe1/400/500" },
  { id: 2, name: "Oversized Fleece", brand: "Uniqlo", sub: "Bestseller", price: 490000, rating: 5, cnt: 1204, aiSize: "M", img: "https://images.unsplash.com/photo-1556821840-3a63f8550d6b?w=500&q=80", fallback: "https://picsum.photos/seed/hoodie/400/500" },
  { id: 3, name: "Tech Fleece Suit", brand: "Adidas", sub: "Sport Line", price: 1050000, orig: 1500000, rating: 4, cnt: 762, aiSize: "L", img: "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?w=500&q=80", fallback: "https://picsum.photos/seed/adidas/400/500" },
  { id: 4, name: "Classic Denim 501", brand: "Levi's", sub: "Signature", price: 880000, rating: 4.5, cnt: 2089, aiSize: "S", img: "https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=500&q=80", fallback: "https://picsum.photos/seed/denim/400/500" },
];

const TESTIMONIALS = [
  {
    name: "Linh Nguyễn", role: "Fashion Blogger · Hà Nội", rating: 5,
    text: "Tôi đã từng phải hoàn trả gần mỗi đơn hàng vì sai size. Với DFS AI, tôi chưa trả lại một sản phẩm nào trong 6 tháng qua. Thật tuyệt vời!",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80",
    color: "from-blue-50 to-blue-100", accent: "#0B74E5",
  },
  {
    name: "Minh Trần", role: "Fitness Coach · TP. HCM", rating: 5,
    text: "AI gợi ý XL cho Adidas và M cho Uniqlo — hoàn toàn khác nhau, cả hai đều vừa khít. Ứng dụng này thực sự hiểu cách tính size theo từng hãng!",
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80",
    color: "from-violet-50 to-violet-100", accent: "#7C3AED",
  },
  {
    name: "Hương Phạm", role: "Product Designer · Đà Nẵng", rating: 5,
    text: "Ship siêu nhanh, đóng gói đẹp, thanh toán VNPay chỉ trong tích tắc. DFS chắc chắn là nền tảng thời trang tốt nhất Việt Nam!",
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80",
    color: "from-emerald-50 to-emerald-100", accent: "#059669",
  },
];

const BRANDS = [
  "Nike", "Adidas", "Uniqlo", "Levi's", "Zara",
  "H&M", "Puma", "Champion", "New Balance", "Under Armour",
];

const STEPS = [
  { n: 1, icon: IcoUser,     title: "Tạo hồ sơ cơ thể",    desc: "Nhập chiều cao, cân nặng, số đo vòng ngực, eo, hông — chỉ một lần duy nhất.", bg: "#EFF6FF", iconBg: "#0B74E5" },
  { n: 2, icon: IcoBrain,    title: "AI phân tích sản phẩm", desc: "Mô hình XGBoost đối chiếu hồ sơ của bạn với size chart riêng của từng thương hiệu.", bg: "#F5F3FF", iconBg: "#7C3AED" },
  { n: 3, icon: IcoCheck,    title: "Mua sắm tự tin",        desc: "Nhận gợi ý size cá nhân hoá với độ chính xác lên đến 99.2%. Không còn lo sai size!", bg: "#ECFDF5", iconBg: "#059669" },
];

/* ─── Animation variants ─── */
const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 36 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] },
});
const fadeLeft  = (delay = 0) => ({ ...fadeUp(delay), initial: { opacity: 0, x: -48 }, whileInView: { opacity: 1, x: 0 } });
const fadeRight = (delay = 0) => ({ ...fadeUp(delay), initial: { opacity: 0, x: 48  }, whileInView: { opacity: 1, x: 0 } });
const scaleIn   = (delay = 0) => ({
  initial: { opacity: 0, scale: 0.88 },
  whileInView: { opacity: 1, scale: 1 },
  viewport: { once: true, margin: "-60px" },
  transition: { duration: 0.55, delay, ease: [0.34, 1.56, 0.64, 1] },
});

/* ─── Helpers ─── */
const fmt  = (n) => n.toLocaleString("vi-VN") + "₫";
const Stars = ({ rating }) => (
  <span className="flex gap-0.5">
    {[1,2,3,4,5].map(i => (
      <IcoStar key={i} size={12} className={i <= Math.round(rating) ? "text-amber-400" : "text-gray-200"} />
    ))}
  </span>
);

/* ─── Sub-component: Tag Pill ─── */
const Tag = ({ children, icon: Icon, color = "primary" }) => (
  <Chip
    variant="flat"
    color={color}
    size="sm"
    startContent={Icon ? <Icon size={11} /> : null}
    className="font-bold tracking-widest text-[10px] uppercase px-2"
  >
    {children}
  </Chip>
);

/* ─── Sub-component: Glass floating badge ─── */
const FloatBadge = ({ children, className = "", style }) => (
  <div className={`lp-glass rounded-2xl shadow-xl px-4 py-3 ${className}`} style={style}>
    {children}
  </div>
);

/* ─── Sub-component: Section heading ─── */
const SectionHead = ({ tag, tagIcon, title, sub, center }) => (
  <motion.div {...fadeUp()} className={center ? "text-center" : ""}>
    {tag && (
      <div className={`mb-4 ${center ? "flex justify-center" : ""}`}>
        <Tag icon={tagIcon}>{tag}</Tag>
      </div>
    )}
    <h2 className={`syne font-black tracking-tight text-gray-900 ${center ? "mx-auto" : ""}`}
      style={{ fontSize: "clamp(1.9rem,4.5vw,3rem)", lineHeight: 1.1 }}>
      {title}
    </h2>
    {sub && <p className="text-gray-400 mt-2.5 font-semibold text-sm">{sub}</p>}
  </motion.div>
);

/* ─── Sub-component: 3D Tilt wrapper ─── */
function TiltCard({ children, className = "" }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rX = useSpring(useTransform(y, [-0.5, 0.5], [8, -8]), { stiffness: 280, damping: 28 });
  const rY = useSpring(useTransform(x, [-0.5, 0.5], [-8, 8]),  { stiffness: 280, damping: 28 });
  const s  = useSpring(1, { stiffness: 300, damping: 30 });

  return (
    <motion.div
      className={className}
      style={{ rotateX: rX, rotateY: rY, scale: s, transformStyle: "preserve-3d", transformPerspective: 900 }}
      onMouseMove={(e) => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left) / r.width  - 0.5);
        y.set((e.clientY - r.top)  / r.height - 0.5);
        s.set(1.03);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); s.set(1); }}
    >
      {children}
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════ */
export default function LandingPage() {
  const [activeSz, setActiveSz]     = useState(1);   // index of active size (S=0, M=1, L=2)
  const [timer, setTimer]           = useState({ h: "08", m: "24", s: "59" });
  const [email, setEmail]           = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [wishlist, setWishlist]     = useState(new Set());

  /* countdown */
  useEffect(() => {
    const end = Date.now() + (8 * 3600 + 24 * 60 + 59) * 1000;
    const id  = setInterval(() => {
      const d = Math.max(0, end - Date.now());
      const pad = n => String(n).padStart(2, "0");
      setTimer({ h: pad(Math.floor(d / 3600000)), m: pad(Math.floor((d % 3600000) / 60000)), s: pad(Math.floor((d % 60000) / 1000)) });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const toggleWish = useCallback((id) => {
    setWishlist(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }, []);

  const handleSubscribe = useCallback((e) => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true);
    setEmail("");
    setTimeout(() => setSubscribed(false), 4000);
  }, [email]);

  const SIZES = ["S", "M", "L"];

  /* ─── render ─── */
  return (
    <div className="overflow-x-hidden bg-[#f6fbff]">

      {/* ═══ 1 · HERO ═══════════════════════════════════════════ */}
      <section className="relative min-h-[92vh] flex items-center lp-mesh overflow-hidden">
        <div className="absolute inset-0 lp-dots pointer-events-none opacity-60" />
        {/* blobs */}
        <div className="absolute top-20 left-6 w-72 h-72 bg-blue-400/10 rounded-full blur-[110px] pointer-events-none" />
        <div className="absolute bottom-20 right-6 w-80 h-80 bg-violet-400/8 rounded-full blur-[130px] pointer-events-none" />

        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center w-full z-10">

          {/* ── Left copy ── */}
          <div className="space-y-7">
            <motion.div {...fadeUp(0)}>
              <Tag icon={IcoSparkle}>AI-POWERED SIZE RECOMMENDATIONS</Tag>
            </motion.div>

            <motion.h1 {...fadeUp(0.08)}
              className="syne font-black leading-[0.92] tracking-tight text-gray-900"
              style={{ fontSize: "clamp(2.8rem,7.5vw,5.2rem)" }}>
              Mặc Đúng Size,<br />
              <span className="lp-shimmer">Tự Tin</span><br />
              Mỗi Ngày.
            </motion.h1>

            <motion.p {...fadeUp(0.14)} className="text-gray-500 max-w-md leading-relaxed text-[15px]">
              DFS dùng AI để dự đoán size hoàn hảo từ số đo cơ thể của bạn — giúp mua sắm thời trang online trở nên dễ dàng và không lo trả hàng.
            </motion.p>

            <motion.div {...fadeUp(0.2)} className="flex flex-wrap gap-3">
              <Button
                as={Link} to="/products"
                color="primary" variant="solid" radius="full" size="lg"
                endContent={<IcoArrow size={15} />}
                className="font-black shadow-xl shadow-blue-500/30 px-7 bg-gradient-to-r from-[#0B74E5] to-[#1E40AF]"
              >
                Mua Sắm Ngay
              </Button>
              <Button
                as={Link} to="/profile"
                variant="bordered" color="primary" radius="full" size="lg"
                startContent={<IcoBrain size={15} />}
                className="font-bold border-2"
              >
                Lấy Size AI
              </Button>
            </motion.div>

            {/* Trust row */}
            <motion.div {...fadeUp(0.26)} className="flex flex-wrap gap-5 pt-1">
              {[
                { icon: IcoCheck, text: "50K+ Khách hài lòng" },
                { icon: IcoShip,  text: "Free Ship toàn quốc" },
                { icon: IcoCart,  text: "Đổi trả dễ dàng" },
              ].map(({ icon: Icon, text }) => (
                <span key={text} className="flex items-center gap-1.5 text-sm text-gray-500 font-semibold">
                  <Icon size={14} className="text-blue-500" /> {text}
                </span>
              ))}
            </motion.div>
          </div>

          {/* ── Right 3D visual ── */}
          <div className="relative flex items-center justify-center">
            <TiltCard className="relative w-full max-w-sm mx-auto">
              {/* Main hero card */}
              <div className="rounded-[2.2rem] overflow-hidden shadow-[0_30px_80px_-20px_rgba(11,116,229,0.32)]">
                <div className="relative">
                  <img
                    src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600&q=80"
                    onError={e => { e.target.onerror = null; e.target.src = "https://picsum.photos/seed/fashion-hero/480/540"; }}
                    alt="Fashion model"
                    className="w-full h-[480px] object-cover object-top"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/45 via-transparent to-transparent" />

                  {/* AI badge */}
                  <div className="absolute top-5 left-5 lp-glass rounded-2xl px-3.5 py-2.5 lp-float shadow-xl" style={{"--lp-rot":"0deg"}}>
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center lp-pulse">
                        <IcoBrain size={13} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[10px] text-gray-400 font-bold leading-none">AI Gợi ý</p>
                        <p className="text-xs font-black text-blue-700 leading-tight">Size M — Hoàn hảo</p>
                      </div>
                    </div>
                  </div>

                  {/* Rating badge */}
                  <div className="absolute top-5 right-5 lp-glass rounded-xl px-3 py-2 lp-float-slow shadow-xl">
                    <div className="flex items-center gap-1">
                      <IcoStar size={13} className="text-amber-400" />
                      <span className="font-black text-sm text-gray-800">4.9</span>
                      <span className="text-[10px] text-gray-400">(2.1k)</span>
                    </div>
                  </div>

                  {/* Price footer inside image */}
                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="lp-glass rounded-2xl px-5 py-3.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-white/60 text-[10px] font-semibold">Everyday Essential</p>
                          <p className="text-white font-black text-base">Premium Cotton Tee</p>
                        </div>
                        <div className="text-right">
                          <p className="text-white/50 text-[10px] line-through">499,000₫</p>
                          <p className="text-white font-black text-lg">299,000₫</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Side floating cards */}
              <FloatBadge className="absolute -left-14 top-1/3 lp-float hidden lg:block" style={{"--lp-rot":"2deg"}}>
                <div className="flex items-center gap-2 text-xs">
                  <IcoFire size={14} className="text-red-500" />
                  <div>
                    <p className="font-black text-red-500">Flash Sale</p>
                    <p className="text-gray-400">-40% OFF</p>
                  </div>
                </div>
              </FloatBadge>

              <FloatBadge className="absolute -right-12 bottom-1/3 lp-float-slow hidden lg:block" style={{"--lp-rot":"-2deg"}}>
                <div className="flex items-center gap-2 text-xs">
                  <IcoShip size={13} className="text-blue-500" />
                  <div>
                    <p className="font-black text-gray-700">Free Ship</p>
                    <p className="text-gray-400">Toàn quốc</p>
                  </div>
                </div>
              </FloatBadge>
            </TiltCard>

            {/* bg orbs */}
            <div className="absolute -z-10 top-10 right-0 w-44 h-44 bg-violet-300/15 rounded-full blur-3xl" />
            <div className="absolute -z-10 bottom-10 left-0 w-52 h-52 bg-blue-300/12 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
          <p className="text-[10px] font-bold text-gray-400 tracking-widest uppercase">Scroll</p>
          <div className="w-5 h-9 rounded-full border-2 border-gray-300 flex items-start justify-center pt-1.5">
            <motion.div
              className="w-1 h-2 bg-blue-500 rounded-full"
              animate={{ y: [0, 8, 0] }}
              transition={{ repeat: Infinity, duration: 1.4, ease: "easeInOut" }}
            />
          </div>
        </div>
      </section>

      {/* ═══ 2 · STATS BAR ══════════════════════════════════════ */}
      <section className="py-10 bg-white border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { val: "50K+", lbl: "Khách hàng hài lòng" },
              { val: "500+", lbl: "Thương hiệu thời trang" },
              { val: "99.2%", lbl: "Độ chính xác size AI" },
              { val: "24/7", lbl: "Hỗ trợ khách hàng" },
            ].map(({ val, lbl }, i) => (
              <motion.div key={lbl} {...scaleIn(i * 0.08)}>
                <p className="syne font-black text-4xl text-blue-600 leading-none">{val}</p>
                <p className="text-xs text-gray-400 font-semibold mt-1.5">{lbl}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 3 · AI FEATURE ══════════════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8 overflow-hidden" id="ai-fit">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: demo card */}
          <motion.div {...fadeLeft(0)} className="flex justify-center">
            <div className="relative w-full max-w-sm">
              <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-200/60"
                style={{ background: "linear-gradient(145deg,#EFF6FF,#DBEAFE)" }}>
                <div className="p-8 space-y-5">

                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center shadow-lg">
                      <IcoBrain size={20} className="text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-black text-gray-800 text-sm">DFS AI Fit Engine</p>
                      <p className="text-[10px] text-gray-400">Powered by XGBoost ML</p>
                    </div>
                    <Chip size="sm" color="success" variant="flat" className="font-bold text-[10px]">LIVE</Chip>
                  </div>

                  {/* Measurements grid */}
                  <div>
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2.5">Số đo của bạn</p>
                    <div className="grid grid-cols-2 gap-2.5">
                      {[
                        { k: "Chiều cao", v: "175 cm" },
                        { k: "Cân nặng",  v: "70 kg" },
                        { k: "Vòng ngực", v: "92 cm" },
                        { k: "Vòng eo",   v: "78 cm" },
                      ].map(({ k, v }) => (
                        <div key={k} className="bg-white rounded-xl p-3 shadow-sm">
                          <p className="text-[9px] text-gray-400 font-semibold">{k}</p>
                          <p className="font-black text-gray-800 text-sm">{v}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Scanning bar */}
                  <div className="relative bg-white rounded-xl p-4 overflow-hidden shadow-sm">
                    <div className="lp-scan" />
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-semibold text-gray-600">Đang phân tích hồ sơ…</span>
                      <span className="text-xs font-black text-blue-600">98%</span>
                    </div>
                    <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-500" style={{ width: "98%" }} />
                    </div>
                  </div>

                  {/* Result */}
                  <div className="rounded-2xl p-5 text-white bg-gradient-to-r from-[#0B74E5] to-[#1E40AF]">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-white/60 text-[10px] font-semibold mb-1">Size gợi ý</p>
                        <p className="syne font-black text-5xl leading-none">M</p>
                        <p className="text-white/50 text-[10px] mt-1">Độ tin cậy: 97.4%</p>
                      </div>
                      <div className="flex gap-2">
                        {SIZES.map((sz, i) => (
                          <button key={sz}
                            onClick={() => setActiveSz(i)}
                            className={`w-9 h-9 rounded-xl text-sm font-black border-2 transition-all duration-200 ${
                              activeSz === i
                                ? "bg-white text-blue-600 border-white scale-110"
                                : "border-white/30 text-white/50 hover:border-white/60"
                            }`}>
                            {sz}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating check badge */}
              <div className="absolute -bottom-5 -left-5 lp-glass rounded-2xl px-4 py-2.5 shadow-xl lp-float">
                <div className="flex items-center gap-2">
                  <IcoCheck size={14} className="text-green-500" />
                  <span className="text-xs font-black text-gray-700">Không còn sai size!</span>
                </div>
              </div>

              <div className="absolute -top-6 -right-6 w-20 h-20 bg-violet-300/20 rounded-full blur-2xl" />
            </div>
          </motion.div>

          {/* Right: feature copy */}
          <div className="space-y-7">
            <motion.div {...fadeRight(0)}>
              <Tag icon={IcoSparkle}>LỢI THẾ DFS AI</Tag>
            </motion.div>
            <motion.h2 {...fadeRight(0.08)} className="syne font-black leading-tight tracking-tight"
              style={{ fontSize: "clamp(2rem,4.5vw,3rem)" }}>
              Gợi Ý Size Thông Minh,<br />
              <span className="lp-shimmer">Không Còn Phỏng Đoán.</span>
            </motion.h2>
            <motion.p {...fadeRight(0.14)} className="text-gray-500 leading-relaxed text-[15px]">
              Mô hình XGBoost của chúng tôi phân tích số đo cơ thể — chiều cao, cân nặng, vòng ngực, eo, hông và nhiều chỉ số khác — để gợi ý đúng size vừa vặn nhất trên mọi thương hiệu.
            </motion.p>

            {/* Steps */}
            <div className="space-y-4">
              {STEPS.map(({ n, icon: Icon, title, desc, bg, iconBg }, i) => (
                <motion.div key={n} {...fadeRight(0.18 + i * 0.08)}
                  className="flex items-start gap-4 group cursor-default">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                    style={{ background: bg }}>
                    <Icon size={20} style={{ color: iconBg }} />
                  </div>
                  <div>
                    <p className="font-black text-gray-800 mb-0.5">{title}</p>
                    <p className="text-sm text-gray-400">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div {...fadeRight(0.38)}>
              <Button
                as={Link} to="/profile"
                color="primary" variant="solid" radius="full" size="lg"
                startContent={<IcoBrain size={15} />}
                endContent={<IcoArrow size={14} />}
                className="font-black shadow-lg shadow-blue-500/30 bg-gradient-to-r from-[#0B74E5] to-[#1E40AF] px-7"
              >
                Thử AI Sizing Miễn Phí
              </Button>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ 4 · COLLECTIONS BENTO ══════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8 bg-gray-50" id="collections">
        <div className="max-w-7xl mx-auto">
          <div className="mb-14">
            <SectionHead tag="BỘ SƯU TẬP" tagIcon={IcoSparkle}
              title="Nổi Bật Mùa Này"
              sub="Phong cách được tuyển chọn dành cho bạn" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 min-h-[540px]">

            {/* Main card — Men's */}
            <motion.div {...fadeLeft(0)} className="md:col-span-7 group relative overflow-hidden rounded-[2rem] bg-gray-200 cursor-pointer min-h-[320px]">
              <img
                src="https://images.unsplash.com/photo-1617137968427-85924c800a22?w=800&q=80"
                onError={e => { e.target.onerror = null; e.target.src = "https://picsum.photos/seed/men-fashion/700/540"; }}
                alt="Men's collection"
                className="absolute inset-0 w-full h-full object-cover object-top group-hover:scale-110 transition-transform duration-700"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/20 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-9 text-white">
                <Tag>Thời Trang Nam</Tag>
                <h3 className="syne font-black text-4xl mt-3 mb-5 leading-tight">Urban<br />Street Edition</h3>
                <Button
                  as={Link} to="/products"
                  variant="solid" radius="xl" size="sm"
                  endContent={<IcoArrow size={13} />}
                  className="w-max bg-white text-gray-900 font-black hover:bg-blue-600 hover:text-white transition-colors"
                >
                  Mua Ngay
                </Button>
              </div>
            </motion.div>

            {/* Women's */}
            <motion.div {...fadeRight(0)} className="md:col-span-5 group relative overflow-hidden rounded-[2rem] cursor-pointer min-h-[260px]"
              style={{ background: "linear-gradient(145deg,#FAF5FF,#EDE9FE)" }}>
              <img
                src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&q=80"
                onError={e => { e.target.onerror = null; e.target.src = "https://picsum.photos/seed/women-fashion/500/540"; }}
                alt="Women's collection"
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-900/70 via-transparent to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-between p-8">
                <div className="self-start lp-glass rounded-2xl p-2.5">
                  <IcoSparkle size={20} className="text-violet-600" />
                </div>
                <div className="text-white">
                  <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest">Thời Trang Nữ</p>
                  <h3 className="syne font-black text-3xl mt-1 mb-4 leading-tight">Thanh Lịch &amp;<br />Cuốn Hút</h3>
                  <Button as={Link} to="/products" variant="bordered" radius="full" size="sm"
                    className="border-white/40 text-white font-bold hover:bg-white hover:text-violet-700 transition-colors">
                    Khám phá →
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Unisex */}
            <motion.div {...fadeUp(0.1)} className="md:col-span-4 group relative overflow-hidden rounded-[2rem] cursor-pointer min-h-[220px]"
              style={{ background: "linear-gradient(145deg,#ECFDF5,#D1FAE5)" }}>
              <div className="relative h-full flex flex-col justify-center items-center p-10 text-center gap-3">
                <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <IcoCheck size={28} className="text-emerald-600" />
                </div>
                <h3 className="syne font-black text-2xl text-emerald-900">Unisex Basics</h3>
                <p className="text-sm text-emerald-700 max-w-[160px]">Phong cách tối giản cho mọi người</p>
                <Button as={Link} to="/products" color="success" variant="solid" radius="full" size="sm" className="font-black mt-1">
                  Xem ngay →
                </Button>
              </div>
            </motion.div>

            {/* Flash Sale */}
            <motion.div {...fadeUp(0.15)} className="md:col-span-8 group relative overflow-hidden rounded-[2rem] cursor-pointer min-h-[220px]"
              style={{ background: "linear-gradient(135deg, #0B74E5 0%, #1E40AF 55%, #7C3AED 100%)" }}>
              <div className="absolute inset-0 lp-dots opacity-15 pointer-events-none" />
              <div className="absolute right-8 top-1/2 -translate-y-1/2 w-40 h-40 bg-white/10 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

              <div className="relative flex flex-col md:flex-row items-center justify-between p-9 h-full gap-6">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-2">
                    <IcoFire size={16} className="text-amber-400" />
                    <span className="text-amber-400 font-black text-xs uppercase tracking-wider">Flash Sale — Giới Hạn Thời Gian</span>
                  </div>
                  <h3 className="syne font-black text-4xl mb-2 leading-tight">Giảm Đến 40%<br />Thương Hiệu Top</h3>
                  <p className="text-white/60 text-sm mb-5">Nike · Adidas · Uniqlo · Levi's và nhiều hơn nữa</p>
                  <Button as={Link} to="/products" variant="solid" radius="xl" size="sm"
                    endContent={<IcoArrow size={13} />}
                    className="bg-white text-blue-700 font-black hover:scale-105 transition-transform">
                    Săn Deal Ngay
                  </Button>
                </div>

                {/* Countdown */}
                <div className="flex gap-3 flex-shrink-0">
                  {[{ v: timer.h, l: "GIỜ" }, { v: timer.m, l: "PHÚT" }, { v: timer.s, l: "GIÂY" }].map(({ v, l }) => (
                    <div key={l} className="bg-white/20 rounded-2xl p-4 min-w-[60px] text-center">
                      <p className="syne font-black text-3xl text-white leading-none">{v}</p>
                      <p className="text-[9px] text-white/50 font-bold mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ═══ 5 · TRENDING PRODUCTS ══════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8" id="trending">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-14 gap-4">
            <SectionHead tag="ĐANG HOT" tagIcon={IcoFire}
              title={<>Đang Thịnh Hành<br /><span className="lp-shimmer">Tuần Này</span></>}
              sub="Những sản phẩm được mọi người yêu thích nhất" />
            <div className="flex gap-2 flex-shrink-0">
              <Button isIconOnly variant="bordered" radius="lg" className="border-gray-200 hover:border-blue-500 hover:text-blue-600">
                <IcoChevL size={17} />
              </Button>
              <Button isIconOnly variant="bordered" radius="lg" className="border-gray-200 hover:border-blue-500 hover:text-blue-600">
                <IcoChevR size={17} />
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-7">
            {PRODUCTS.map((p, i) => (
              <motion.div key={p.id} {...scaleIn(i * 0.07)}>
                <TiltCard>
                  <Card
                    isPressable isHoverable
                    className="rounded-[1.6rem] overflow-hidden border-0 shadow-[0_10px_30px_-15px_rgba(0,0,0,0.12)] hover:shadow-[0_25px_50px_-15px_rgba(11,116,229,0.22)] transition-shadow duration-400"
                  >
                    <CardBody className="p-0 relative overflow-hidden">
                      <div className="relative aspect-[3/4] overflow-hidden">
                        <img
                          src={p.img}
                          onError={e => { e.target.onerror = null; e.target.src = p.fallback; }}
                          alt={p.name}
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                        />
                        {/* Wishlist */}
                        <motion.button
                          whileHover={{ scale: 1.15 }} whileTap={{ scale: 0.88 }}
                          onClick={() => toggleWish(p.id)}
                          className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full lp-glass flex items-center justify-center transition-colors"
                        >
                          <IcoHeart size={14} className={wishlist.has(p.id) ? "text-red-500" : "text-gray-400"} />
                        </motion.button>

                        {/* Brand badge */}
                        <div className="absolute top-3.5 left-3.5 flex gap-1.5">
                          <Chip size="sm" variant="flat" className="bg-white/90 text-gray-700 font-black text-[10px]">
                            {p.brand}
                          </Chip>
                          {p.orig && (
                            <Chip size="sm" color="danger" variant="solid" className="font-black text-[10px]">
                              -{Math.round((1 - p.price / p.orig) * 100)}%
                            </Chip>
                          )}
                        </div>

                        {/* AI size */}
                        <div className="absolute bottom-3.5 left-3.5">
                          <Chip size="sm" color="primary" variant="flat" className="font-black text-[10px]">
                            AI Size: {p.aiSize}
                          </Chip>
                        </div>

                        {/* Add to cart hover overlay */}
                        <motion.div
                          initial={{ y: "100%" }} whileHover={{ y: 0 }}
                          className="absolute bottom-0 left-0 right-0 p-3"
                        >
                          <Button
                            fullWidth color="primary" variant="solid" radius="lg" size="sm"
                            startContent={<IcoCart size={13} />}
                            className="font-black shadow-lg"
                          >
                            Thêm vào giỏ
                          </Button>
                        </motion.div>
                      </div>
                    </CardBody>

                    <CardFooter className="flex flex-col items-start gap-1.5 px-4 pb-4 pt-3">
                      <div className="flex justify-between w-full items-start">
                        <div>
                          <p className="font-black text-gray-900 text-sm leading-tight">{p.name}</p>
                          <p className="text-[11px] text-gray-400 font-semibold">{p.sub}</p>
                        </div>
                        <div className="text-right">
                          {p.orig && <p className="text-[10px] text-gray-300 line-through">{fmt(p.orig)}</p>}
                          <p className="font-black text-blue-600 text-base leading-tight">{fmt(p.price)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Stars rating={p.rating} />
                        <span className="text-[10px] text-gray-400">({p.cnt.toLocaleString()})</span>
                      </div>
                    </CardFooter>
                  </Card>
                </TiltCard>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp(0.2)} className="flex justify-center mt-12">
            <Button
              as={Link} to="/products"
              variant="bordered" color="primary" radius="full" size="lg"
              endContent={<IcoArrow size={15} />}
              className="font-black border-2 px-10 hover:bg-blue-600 hover:text-white transition-colors"
            >
              Xem Tất Cả Sản Phẩm
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══ 6 · BRAND TICKER ═══════════════════════════════════ */}
      <section className="py-14 bg-white border-y border-gray-100 overflow-hidden" id="brands">
        <motion.div {...fadeUp()} className="text-center mb-8">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[0.2em]">
            Thương hiệu thời trang hàng đầu có trên DFS
          </p>
        </motion.div>
        <div className="overflow-hidden">
          <div className="flex lp-ticker">
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <div key={`${b}-${i}`}
                className="flex-shrink-0 mx-5 px-7 py-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50 transition-colors cursor-pointer">
                <span className="syne font-black text-xl text-gray-500 hover:text-blue-600 transition-colors whitespace-nowrap">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 7 · TESTIMONIALS ═══════════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8" style={{ background: "linear-gradient(180deg,#f6fbff 0%,#EFF6FF 100%)" }}>
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <SectionHead tag="ĐÁNH GIÁ" tagIcon={IcoStar} center
              title={<>Được Khách Hàng<br /><span className="lp-shimmer">Yêu Thích</span></>}
              sub="Câu chuyện thực từ khách hàng đã tìm được size hoàn hảo với DFS" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
            {TESTIMONIALS.map(({ name, role, text, rating, avatar, color, accent }, i) => (
              <motion.div key={name} {...scaleIn(i * 0.1)}
                className={`lg:${i === 1 ? "translate-y-8" : ""}`}>
                <Card className="rounded-[2rem] shadow-sm hover:shadow-xl transition-shadow duration-500 border-0 overflow-visible"
                  style={{ background: "rgba(255,255,255,0.6)", backdropFilter: "blur(18px)", WebkitBackdropFilter: "blur(18px)", border: "1px solid rgba(255,255,255,0.75)" }}>
                  <CardBody className="p-9 space-y-6">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: color.replace("from-","").replace(" to-","") , opacity: 0.9, backgroundColor: accent + "18" }}>
                      <IcoQuote size={18} style={{ color: accent }} />
                    </div>
                    <Stars rating={rating} />
                    <p className="text-gray-600 leading-relaxed italic text-[15px]">"{text}"</p>
                    <div className="flex items-center gap-3 pt-2">
                      <Avatar
                        src={avatar}
                        fallback={<IcoUser size={18} className="text-gray-400" />}
                        className="w-11 h-11 flex-shrink-0"
                      />
                      <div>
                        <p className="font-black text-gray-900 text-sm">{name}</p>
                        <p className="text-xs text-gray-400">{role}</p>
                      </div>
                    </div>
                  </CardBody>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 8 · HOW IT WORKS ══════════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <SectionHead tag="HƯỚNG DẪN" tagIcon={IcoSparkle} center
              title={<>Bắt Đầu Mua Sắm<br /><span className="lp-shimmer">Chỉ 3 Bước</span></>} />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
            {/* Connector (desktop) */}
            <div className="hidden md:block absolute top-14 left-1/3 right-1/3 h-0.5 bg-gradient-to-r from-blue-400 to-violet-400 opacity-40" />

            {STEPS.map(({ n, icon: Icon, title, desc, iconBg }, i) => (
              <motion.div key={n} {...scaleIn(i * 0.1)} className="flex flex-col items-center text-center">
                <div className="relative mb-6">
                  <motion.div
                    whileHover={{ scale: 1.08, rotate: [0, -4, 4, 0] }}
                    transition={{ duration: 0.4 }}
                    className="w-28 h-28 rounded-[2rem] flex items-center justify-center cursor-default"
                    style={{ background: iconBg + "15" }}
                  >
                    <Icon size={44} style={{ color: iconBg }} />
                  </motion.div>
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shadow-lg"
                    style={{ background: iconBg }}>
                    {n}
                  </div>
                </div>
                <h3 className="syne font-black text-xl text-gray-900 mb-2">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-[200px]">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══ 9 · NEWSLETTER CTA ══════════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div {...scaleIn(0)} className="relative rounded-[2.5rem] overflow-hidden p-14 sm:p-20 text-center"
            style={{ background: "linear-gradient(135deg,#0B74E5 0%,#1E40AF 45%,#7C3AED 100%)" }}>
            <div className="absolute inset-0 lp-dots opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-80 h-80 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-violet-500/20 rounded-full translate-y-1/2 -translate-x-1/2 blur-3xl pointer-events-none" />

            {/* Floating badges */}
            <FloatBadge className="absolute top-8 left-8 lp-float hidden lg:flex items-center gap-2">
              <IcoFire size={13} className="text-amber-500" />
              <span className="text-xs font-black text-gray-700">10% OFF</span>
            </FloatBadge>
            <FloatBadge className="absolute top-8 right-8 lp-float-slow hidden lg:flex items-center gap-2">
              <IcoShip size={13} className="text-blue-500" />
              <span className="text-xs font-black text-gray-700">Free Ship</span>
            </FloatBadge>

            <div className="relative z-10 max-w-xl mx-auto space-y-7">
              <div className="flex justify-center">
                <Chip variant="flat" className="bg-white/20 text-white font-black text-[10px] tracking-widest uppercase px-3">
                  CỘNG ĐỒNG DFS
                </Chip>
              </div>

              <h2 className="syne font-black text-white leading-tight tracking-tight"
                style={{ fontSize: "clamp(2rem,5vw,3.2rem)" }}>
                Size Hoàn Hảo<br />Đang Chờ Bạn!
              </h2>

              <p className="text-white/65 text-[15px]">
                Đăng ký để nhận ưu đãi sớm, mã giảm giá độc quyền và <strong className="text-white">10% off</strong> đơn đầu tiên.
              </p>

              <AnimatePresence mode="wait">
                {subscribed ? (
                  <motion.div key="success"
                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-3 bg-white/20 rounded-2xl py-4 px-6">
                    <IcoCheck size={18} className="text-green-300" />
                    <span className="text-white font-black">Đăng ký thành công! Kiểm tra email của bạn.</span>
                  </motion.div>
                ) : (
                  <motion.form key="form" onSubmit={handleSubscribe}
                    className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
                    <Input
                      type="email" value={email} onValueChange={setEmail}
                      placeholder="Nhập địa chỉ email của bạn…"
                      variant="bordered" radius="full" size="lg"
                      classNames={{
                        input: "text-white placeholder:text-white/50 font-semibold",
                        inputWrapper: "border-white/30 bg-white/15 hover:border-white/60 data-[focused=true]:border-white",
                      }}
                    />
                    <Button type="submit" variant="solid" radius="full" size="lg"
                      className="bg-white text-blue-700 font-black shrink-0 hover:bg-blue-50 shadow-xl hover:scale-105 transition-transform">
                      Đăng Ký →
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              <p className="text-white/35 text-xs">Không spam. Hủy đăng ký bất cứ lúc nào.</p>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
