import React, { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useTransform, useSpring } from "framer-motion";
import { Skeleton } from "@heroui/react";

/* ─── Inline SVG Icons (HeroUI / Heroicons style, no extra package needed) ─── */
const ico = (d, opts = {}) => ({ size = 16, style, className, color, ...rest }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24"
    fill={opts.fill ? (color || "currentColor") : "none"}
    stroke={opts.fill ? "none" : (color || "currentColor")}
    strokeWidth={opts.fill ? 0 : 1.8} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0, ...style }} className={className}>
    {d}
  </svg>
);

const FiChevronLeft  = ico(<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5"/>);
const FiChevronRight = ico(<path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5"/>);
const FiArrowRight   = ico(<path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/>);
const FiTrendingUp   = ico(<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941"/>);
const FiZap          = ico(<path fill="currentColor" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z"/>, {fill:true});
const FiStar         = ico(<path fill="currentColor" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"/>, {fill:true});
const FiShield       = ico(<path fill="currentColor" d="M12 1.5a.75.75 0 0 1 .75.75V4.5a.75.75 0 0 1-1.5 0V2.25A.75.75 0 0 1 12 1.5ZM5.636 4.136a.75.75 0 0 1 1.06 0l1.592 1.591a.75.75 0 0 1-1.061 1.06l-1.591-1.59a.75.75 0 0 1 0-1.061Zm12.728 0a.75.75 0 0 1 0 1.06l-1.591 1.592a.75.75 0 0 1-1.06-1.061l1.59-1.591a.75.75 0 0 1 1.061 0Zm-6.816 4.496a.75.75 0 0 1 .82.311l5.228 7.917a.75.75 0 0 1-.777 1.148l-2.097-.43 1.045 3.9a.75.75 0 0 1-1.45.388l-1.044-3.899-1.601 1.42a.75.75 0 0 1-1.247-.606l.569-9.47a.75.75 0 0 1 .554-.678ZM3 10.5a.75.75 0 0 1 .75-.75H6a.75.75 0 0 1 0 1.5H3.75A.75.75 0 0 1 3 10.5Zm14.25 0a.75.75 0 0 1 .75-.75h2.25a.75.75 0 0 1 0 1.5H18a.75.75 0 0 1-.75-.75Zm-8.962 3.712a.75.75 0 0 1 0 1.061l-1.591 1.591a.75.75 0 1 1-1.061-1.06l1.591-1.592a.75.75 0 0 1 1.061 0Z"/>, {fill:true});
const FiRefreshCw    = ico(<path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>);
const FiTruck        = ico(<path fill="currentColor" d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875H3.75a3 3 0 1 0 5.99-.375h3.01a3 3 0 1 0 5.99.375h.375a1.875 1.875 0 0 0 1.875-1.875v-6H15a1.5 1.5 0 0 1-1.5-1.5V15Zm5.625-4.5h-4.875V12h3.914l.961-1.5ZM6.75 19.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm10.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/>, {fill:true});
const FiCreditCard   = ico(<path fill="currentColor" d="M4.5 3.75a3 3 0 0 0-3 3v.75h21v-.75a3 3 0 0 0-3-3h-15ZM22.5 9.75h-21v7.5a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3v-7.5Zm-18 3.75a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5H9a.75.75 0 0 0 0-1.5H5.25Z"/>, {fill:true});
const FiAward        = ico(<path fill="currentColor" d="M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z"/>, {fill:true});
const FiUsers        = ico(<path fill="currentColor" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z"/>, {fill:true});
const FiHeart        = ico(<path fill="currentColor" d="m11.645 20.91-.007-.003-.022-.012a15.247 15.247 0 0 1-.383-.218 25.18 25.18 0 0 1-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0 1 12 5.052 5.5 5.5 0 0 1 16.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 0 1-4.244 3.17 15.247 15.247 0 0 1-.383.219l-.022.012-.007.004-.003.001a.752.752 0 0 1-.704 0l-.003-.001Z"/>, {fill:true});
const FiEye          = ico(<><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"/><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"/></>);
const FiLock         = ico(<path fill="currentColor" d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"/>, {fill:true});
const FiCheckCircle  = ico(<path fill="currentColor" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"/>, {fill:true});
const FiTag          = ico(<path fill="currentColor" d="M5.25 7.5A2.25 2.25 0 0 1 7.5 5.25h1.086a2.25 2.25 0 0 1 1.591.659l6.585 6.585a2.25 2.25 0 0 1 0 3.182l-1.672 1.672a2.25 2.25 0 0 1-3.182 0L5.32 10.759A2.25 2.25 0 0 1 4.661 9.17V8.086A2.25 2.25 0 0 1 5.25 7.5Z"/>, {fill:true});
const FiPackage      = ico(<path fill="currentColor" d="M3.375 3C2.339 3 1.5 3.84 1.5 4.875v.75c0 1.036.84 1.875 1.875 1.875h17.25c1.035 0 1.875-.84 1.875-1.875v-.75C22.5 3.839 21.66 3 20.625 3H3.375ZM3 9.375C3 8.339 3.84 7.5 4.875 7.5h9.75c1.036 0 1.875.84 1.875 1.875V17.25a3 3 0 0 1-3 3H6.375a3 3 0 0 1-3-3V9.375Zm13.5 0a.75.75 0 0 1 .75.75v7.125a.75.75 0 0 1-.75.75H18a.75.75 0 0 1-.75-.75V10.5a.75.75 0 0 1 .75-.75h-1.5Z"/>, {fill:true});

import { homeService } from "../../services/homeService";
import { userService } from "../../services/userService";
import ProductCard from "../../components/home/ProductCard.jsx";
import FeatureBadge from "../../components/home/FeatureBadge.jsx";
import "../../assets/styles/Homepage.css";

const TOKEN_KEY = "DFS_TOKEN";

/* ─── Inject global CSS ─── */
if (typeof document !== "undefined" && !document.getElementById("hp-keyframes-v2")) {
  const s = document.createElement("style");
  s.id = "hp-keyframes-v2";
  s.textContent = `
    @import url('https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&family=Baloo+2:wght@400;500;600;700;800&display=swap');

    *, body { font-family: 'Quicksand', 'Segoe UI', sans-serif !important; }
    .syne { font-family: 'Baloo 2', cursive !important; letter-spacing: 0em; }

    @keyframes floatY {
      0%,100% { transform: translateY(0px) rotate(var(--rot,0deg)); }
      50%      { transform: translateY(-14px) rotate(var(--rot,0deg)); }
    }
    @keyframes floatYSlow {
      0%,100% { transform: translateY(0px); }
      50%      { transform: translateY(-8px); }
    }
    @keyframes spin3d {
      0%   { transform: rotateY(0deg) rotateX(8deg); }
      100% { transform: rotateY(360deg) rotateX(8deg); }
    }
    @keyframes pulseGlow {
      0%,100% { box-shadow: 0 0 20px 4px rgba(99,179,237,0.3); }
      50%      { box-shadow: 0 0 40px 12px rgba(99,179,237,0.6); }
    }
    @keyframes shimmerPass {
      0%   { transform: translateX(-100%) skewX(-15deg); }
      100% { transform: translateX(300%) skewX(-15deg); }
    }
    @keyframes particleFly {
      0%   { transform: translate(0,0) scale(1); opacity:1; }
      100% { transform: translate(var(--px,20px), var(--py,-60px)) scale(0); opacity:0; }
    }
    @keyframes orbitRing {
      from { transform: rotate(0deg) translateX(70px) rotate(0deg); }
      to   { transform: rotate(360deg) translateX(70px) rotate(-360deg); }
    }
    @keyframes orbit2 {
      from { transform: rotate(180deg) translateX(100px) rotate(-180deg); }
      to   { transform: rotate(540deg) translateX(100px) rotate(-540deg); }
    }
    @keyframes bgPulse {
      0%,100% { opacity:0.6; transform:scale(1); }
      50%      { opacity:1; transform:scale(1.05); }
    }
    @keyframes scanLine {
      0%   { top: -5%; }
      100% { top: 105%; }
    }
    @keyframes blobMorph {
      0%,100% { border-radius: 60% 40% 55% 45% / 55% 45% 60% 40%; }
      25%     { border-radius: 40% 60% 45% 55% / 45% 55% 40% 60%; }
      50%     { border-radius: 55% 45% 60% 40% / 60% 40% 55% 45%; }
      75%     { border-radius: 45% 55% 40% 60% / 40% 60% 45% 55%; }
    }
    @keyframes countUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
    @keyframes holo {
      0%   { background-position: 0% 50%; }
      50%  { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    @keyframes glitch {
      0%,100% { clip-path: inset(0 0 100% 0); transform:skew(0deg); }
      10%     { clip-path: inset(20% 0 60% 0); transform:skew(-2deg); }
      20%     { clip-path: inset(60% 0 20% 0); transform:skew(2deg); }
      30%     { clip-path: inset(0 0 100% 0); transform:skew(0deg); }
    }
    @keyframes cardTilt {
      0%,100% { transform: perspective(600px) rotateX(0deg) rotateY(0deg); }
      25%      { transform: perspective(600px) rotateX(4deg) rotateY(-4deg); }
      75%      { transform: perspective(600px) rotateX(-4deg) rotateY(4deg); }
    }
    @keyframes ribbonSlide {
      0%   { transform: translateX(-100%); }
      100% { transform: translateX(100vw); }
    }
    @keyframes zoomPulse {
      0%,100% { transform: scale(1); }
      50%      { transform: scale(1.03); }
    }
    @keyframes fadeSlideUp {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes neonFlicker {
      0%,19%,21%,23%,25%,54%,56%,100% { text-shadow: 0 0 10px #60a5fa, 0 0 20px #60a5fa, 0 0 40px #3b82f6; }
      20%,24%,55% { text-shadow: none; }
    }
    @keyframes rotate360 { to { transform: rotate(360deg); } }
    @keyframes liquidBlob {
      0%,100% { border-radius:62% 38% 46% 54% / 60% 44% 56% 40%; transform:scale(1); }
      33%     { border-radius:44% 56% 64% 36% / 48% 68% 32% 52%; transform:scale(1.04); }
      66%     { border-radius:54% 46% 38% 62% / 36% 56% 44% 64%; transform:scale(0.97); }
    }

    .hp-banner-btn {
      position:relative; overflow:hidden;
      background: linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(219,234,254,0.9) 100%);
      color:#1e3a8a; font-weight:800; font-size:14px;
      padding:12px 28px; border-radius:50px; display:inline-flex; align-items:center; gap:8px;
      box-shadow: 0 8px 32px rgba(30,58,138,0.3), inset 0 1px 0 rgba(255,255,255,0.8);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .hp-banner-btn::before {
      content:''; position:absolute; inset:0;
      background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.6) 50%, transparent 100%);
      animation: shimmerPass 2.5s ease infinite;
    }
    .hp-banner-btn:hover { transform:translateY(-2px) scale(1.02); box-shadow:0 14px 40px rgba(30,58,138,0.4), inset 0 1px 0 rgba(255,255,255,0.8); }

    .product-float-card {
      animation: cardTilt 6s ease-in-out infinite;
      transform-style: preserve-3d;
    }
    .product-float-card:nth-child(2) { animation-delay: -2s; }

    .badge-pill {
      background: linear-gradient(135deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.06) 100%);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255,255,255,0.3);
    }

    .feature-card {
      background: white;
      border: 1px solid rgba(219,234,254,0.8);
      transition: all 0.25s cubic-bezier(0.22,1,0.36,1);
    }
    .feature-card:hover {
      transform: translateY(-4px) scale(1.02);
      box-shadow: 0 16px 40px rgba(30,58,138,0.12);
      border-color: rgba(96,165,250,0.4);
    }

    .carousel-viewport { overflow-x: auto; scrollbar-width: none; -ms-overflow-style: none; }
    .carousel-viewport::-webkit-scrollbar { display: none; }
    .carousel-track { display: flex; }

    .section-card {
      background: white;
      border: 1px solid rgba(219,234,254,0.7);
      box-shadow: 0 2px 16px rgba(30,58,138,0.04);
      transition: box-shadow 0.2s;
    }

    .glow-icon {
      box-shadow: 0 4px 16px rgba(29,78,216,0.35);
    }

    .ticker-wrap {
      overflow: hidden;
      white-space: nowrap;
    }
    .ticker-track {
      display: inline-flex;
      animation: ribbonSlide 20s linear infinite;
    }
  `;
  document.head.appendChild(s);
}

/* ─── Data Normalizers ─── */
function normalizeHomepage(raw) {
  return {
    banners: {
      homepage_top: raw?.banners?.homepage_top || [],
      homepage_mid: raw?.banners?.homepage_mid || [],
      homepage_bottom: raw?.banners?.homepage_bottom || [],
    },
    brands: raw?.brands || raw?.brand_list || [],
    categories: raw?.categories || [],
    men: raw?.men || [],
    women: raw?.women || [],
    unisex: raw?.unisex || [],
    flashSale: raw?.flashSale || raw?.flash_sale || null,
  };
}
function normalizeFlashItem(it) {
  if (it.product) return it;
  return {
    ...it,
    product: {
      _id: it.product_id || it._id,
      name: it.name || it.title || "Sản phẩm",
      images: it.images || (it.image ? [it.image] : []),
      base_price: it.original_price || it.base_price || it.price || 0,
    },
    flash_price: it.flash_price || it.sale_price || it.price || 0,
  };
}

/* ─── Carousel Hook ─── */
function useCarousel({ itemWidth, gap, perClick = 2 }) {
  const viewportRef = useRef(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);
  const update = () => {
    const el = viewportRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 0);
    setCanNext(el.scrollLeft < el.scrollWidth - el.clientWidth - 2);
  };
  useEffect(() => {
    update();
    const el = viewportRef.current;
    if (!el) return;
    const ro = new ResizeObserver(update);
    el.addEventListener("scroll", update);
    ro.observe(el);
    return () => { el.removeEventListener("scroll", update); ro.disconnect(); };
  }, []);
  const scrollByStep = (dir) => viewportRef.current?.scrollBy({ left: dir * perClick * (itemWidth + gap), behavior: "smooth" });
  return { viewportRef, canPrev, canNext, scrollPrev: () => scrollByStep(-1), scrollNext: () => scrollByStep(1) };
}

/* ─── Countdown ─── */
function Countdown({ endTime, label = "Kết thúc sau" }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const left = Math.max(0, new Date(endTime).getTime() - now);
  const hh = String(Math.floor(left / 3600000)).padStart(2, "0");
  const mm = String(Math.floor((left % 3600000) / 60000)).padStart(2, "0");
  const ss = String(Math.floor((left % 60000) / 1000)).padStart(2, "0");
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] font-semibold text-white/60 whitespace-nowrap">{label}</span>
      <div className="flex items-center gap-1">
        {[hh, mm, ss].map((v, i) => (
          <React.Fragment key={i}>
            <span className="font-mono font-black text-sm px-2 py-1 rounded-lg tabular-nums text-white"
              style={{ background:"rgba(255,255,255,0.12)", border:"1px solid rgba(255,255,255,0.2)", animation:"countUp 0.3s ease" }}>
              {v}
            </span>
            {i < 2 && <span className="text-white/40 font-black text-xs">:</span>}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

/* ─── Nav Buttons ─── */
function NavBtn({ onClick, disabled, direction, light = false }) {
  return (
    <motion.button whileHover={!disabled ? { scale: 1.1 } : {}} whileTap={!disabled ? { scale: 0.9 } : {}}
      onClick={onClick} disabled={disabled}
      className={`w-8 h-8 flex items-center justify-center rounded-full transition-all duration-150 disabled:opacity-20 disabled:cursor-not-allowed
        ${light ? "bg-white/15 border border-white/25 text-white hover:bg-white/30"
               : "bg-white border border-blue-100 text-blue-400 hover:border-blue-400 hover:text-blue-600 shadow-sm hover:shadow-md"}`}>
      {direction === "prev" ? <FiChevronLeft size={14} /> : <FiChevronRight size={14} />}
    </motion.button>
  );
}

function ViewAll({ to, light = false }) {
  return (
    <Link to={to} className={`inline-flex items-center gap-1.5 text-xs font-bold px-4 py-1.5 rounded-full transition-all duration-150
      ${light ? "border border-white/30 text-white/80 hover:bg-white/15"
             : "border border-blue-200 text-blue-500 bg-blue-50/80 hover:bg-blue-100 hover:border-blue-300"}`}>
      Xem tất cả <FiArrowRight size={11} />
    </Link>
  );
}

/* ══════════════════════════════════════════════════════════
   ✦ ULTRA BANNER — Immersive 3D product showcase
══════════════════════════════════════════════════════════ */

const BANNER_SLIDES = [
  {
    id: 0,
    bg: "linear-gradient(135deg, #020818 0%, #0a1628 30%, #0d2257 60%, #1a3a8f 100%)",
    accent: "#60a5fa",
    accentLight: "#bfdbfe",
    tag: "✦ NEW SEASON 2025",
    titleLine1: "Xuân Hè",
    titleLine2: "2025",
    sub: "Phong cách tươi mới — Trẻ trung & Hiện đại",
    cta: "Khám phá ngay",
    orb1: "rgba(59,130,246,0.4)",
    orb2: "rgba(96,165,250,0.2)",
    orb3: "rgba(147,197,253,0.15)",
    products: [
      { img: "https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=300&q=80", label: "Áo Oversized", price: "299.000đ", badge: "NEW", color: "#3b82f6", delay: 0 },
      { img: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&q=80", label: "Sneaker Air", price: "890.000đ", badge: "HOT", color: "#60a5fa", delay: 0.15 },
      { img: "https://images.unsplash.com/photo-1551028719-00167b16eac5?w=300&q=80", label: "Bomber Jacket", price: "450.000đ", badge: "SALE", color: "#93c5fd", delay: 0.3 },
    ],
  },
  {
    id: 1,
    bg: "linear-gradient(135deg, #030a0e 0%, #061520 30%, #0c3347 60%, #0e5a8a 100%)",
    accent: "#38bdf8",
    accentLight: "#e0f2fe",
    tag: "⚡ FLASH DEAL",
    titleLine1: "Giảm đến",
    titleLine2: "70%",
    sub: "Ưu đãi siêu hot — Số lượng cực hạn",
    cta: "Mua ngay thôi",
    orb1: "rgba(14,165,233,0.4)",
    orb2: "rgba(56,189,248,0.25)",
    orb3: "rgba(125,211,252,0.15)",
    products: [
      { img: "https://images.unsplash.com/photo-1491553895911-0055eca6402d?w=300&q=80", label: "Running Pro", price: "750.000đ", badge: "-30%", color: "#0ea5e9", delay: 0 },
      { img: "https://images.unsplash.com/photo-1529374255404-311a2a4f1fd9?w=300&q=80", label: "Áo Polo", price: "380.000đ", badge: "-50%", color: "#38bdf8", delay: 0.12 },
      { img: "https://images.unsplash.com/photo-1542272604-787c3835535d?w=300&q=80", label: "Skinny Jeans", price: "560.000đ", badge: "-40%", color: "#7dd3fc", delay: 0.25 },
    ],
  },
  {
    id: 2,
    bg: "linear-gradient(135deg, #08020e 0%, #150a2a 30%, #2a1060 60%, #3730a3 100%)",
    accent: "#a78bfa",
    accentLight: "#ede9fe",
    tag: "★ BESTSELLER",
    titleLine1: "Hàng Chính",
    titleLine2: "Hãng 100%",
    sub: "Cam kết xác thực — Bảo hành toàn diện",
    cta: "Xem bộ sưu tập",
    orb1: "rgba(139,92,246,0.4)",
    orb2: "rgba(167,139,250,0.25)",
    orb3: "rgba(196,181,253,0.15)",
    products: [
      { img: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=300&q=80", label: "Classic Tee", price: "199.000đ", badge: "TOP 1", color: "#8b5cf6", delay: 0 },
      { img: "https://images.unsplash.com/photo-1560769629-975ec94e6a86?w=300&q=80", label: "Urban Shoe", price: "620.000đ", badge: "★4.9", color: "#a78bfa", delay: 0.15 },
      { img: "https://images.unsplash.com/photo-1576566588028-4147f3842f27?w=300&q=80", label: "Slim Fit", price: "420.000đ", badge: "SALE", color: "#c4b5fd", delay: 0.28 },
    ],
  },
];

/* Floating 3D product card with holographic shine */
function ProductFloatCard({ product, position, slideActive }) {
  const positions = [
    { right: "28%", top: "8%",  rotate: "-6deg",  scale: 0.92, zIndex: 12 },
    { right: "12%", top: "38%", rotate: "5deg",   scale: 1.0,  zIndex: 14 },
    { right: "30%", top: "62%", rotate: "-3deg",  scale: 0.88, zIndex: 11 },
  ];
  const pos = positions[position] || positions[0];

  return (
    <motion.div
      initial={{ opacity: 0, x: 40, scale: 0.7 }}
      animate={slideActive ? { opacity: 1, x: 0, scale: pos.scale } : { opacity: 0, x: 40, scale: 0.7 }}
      transition={{ delay: product.delay + 0.2, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: "absolute", right: pos.right, top: pos.top, zIndex: pos.zIndex, pointerEvents: "none" }}
    >
      {/* Float animation wrapper */}
      <div style={{
        animation: `floatY ${3.5 + position * 0.7}s ease-in-out ${position * 0.4}s infinite`,
        "--rot": pos.rotate,
        willChange: "transform",
        transform: `rotate(${pos.rotate})`,
      }}>
        {/* 3D Card */}
        <div className="product-float-card" style={{
          width: 120, borderRadius: 18, overflow: "hidden",
          background: "rgba(255,255,255,0.95)",
          boxShadow: `0 20px 60px rgba(0,0,0,0.4), 0 8px 20px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.9), 0 0 0 1px rgba(255,255,255,0.1)`,
        }}>
          {/* Image with holo overlay */}
          <div style={{ position: "relative", height: 90, overflow: "hidden" }}>
            <img src={product.img} alt={product.label} style={{ width: "100%", height: "100%", objectFit: "cover", animation: "zoomPulse 4s ease-in-out infinite" }} loading="eager" />
            {/* Holographic shimmer */}
            <div style={{
              position: "absolute", inset: 0,
              background: `linear-gradient(135deg, transparent 30%, rgba(${product.color === "#60a5fa" ? "96,165,250" : "14,165,233"},0.25) 50%, transparent 70%)`,
              animation: "shimmerPass 3s ease-in-out infinite",
            }} />
            {/* Badge */}
            <div style={{
              position: "absolute", top: 8, right: 8,
              background: product.color, color: "white",
              fontSize: 9, fontWeight: 900, padding: "3px 7px", borderRadius: 8,
              boxShadow: `0 4px 12px ${product.color}80`,
              letterSpacing: "0.05em",
            }}>
              {product.badge}
            </div>
          </div>
          {/* Info */}
          <div style={{ padding: "8px 10px 10px" }}>
            <p style={{ fontSize: 10, fontWeight: 600, color: "#374151", marginBottom: 3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{product.label}</p>
            <p style={{ fontSize: 12, fontWeight: 900, color: product.color }}>{product.price}</p>
          </div>
          {/* Bottom shimmer bar */}
          <div style={{ height: 3, background: `linear-gradient(90deg, ${product.color}40, ${product.color}, ${product.color}40)`, animation: "holo 2s linear infinite", backgroundSize: "200% 100%" }} />
        </div>
        {/* Card shadow */}
        <div style={{ height: 12, background: "rgba(0,0,0,0.25)", filter: "blur(10px)", borderRadius: "50%", margin: "0 10px", marginTop: -2 }} />
      </div>
    </motion.div>
  );
}

/* Animated particle emitter */
function Particles({ color }) {
  const particles = Array.from({ length: 12 }, (_, i) => ({
    id: i,
    x: `${Math.random() * 60 + 20}%`,
    y: `${Math.random() * 80 + 10}%`,
    size: Math.random() * 4 + 2,
    px: (Math.random() - 0.5) * 80,
    py: -(Math.random() * 80 + 30),
    delay: Math.random() * 4,
    dur: Math.random() * 3 + 2,
  }));
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 3, pointerEvents: "none" }}>
      {particles.map(p => (
        <div key={p.id} style={{
          position: "absolute", left: p.x, top: p.y,
          width: p.size, height: p.size, borderRadius: "50%",
          background: color, opacity: 0.6,
          "--px": `${p.px}px`, "--py": `${p.py}px`,
          animation: `particleFly ${p.dur}s ease-out ${p.delay}s infinite`,
          willChange: "transform, opacity",
        }} />
      ))}
    </div>
  );
}

/* Orbital rings decoration */
function OrbitalRings({ color }) {
  return (
    <div style={{ position: "absolute", left: "42%", top: "50%", transform: "translateY(-50%)", zIndex: 2, pointerEvents: "none" }}>
      {/* Ring 1 */}
      <div style={{
        position: "absolute", width: 160, height: 160, borderRadius: "50%",
        border: `1px solid ${color}30`, top: -80, left: -80,
        animation: "rotate360 15s linear infinite",
      }}>
        <div style={{
          position: "absolute", width: 8, height: 8, borderRadius: "50%",
          background: color, top: -4, left: "50%", marginLeft: -4,
          boxShadow: `0 0 12px ${color}`,
          animation: "pulseGlow 2s ease-in-out infinite",
        }} />
      </div>
      {/* Ring 2 */}
      <div style={{
        position: "absolute", width: 240, height: 100, borderRadius: "50%",
        border: `1px solid ${color}20`, top: -50, left: -120,
        animation: "rotate360 22s linear infinite reverse",
      }}>
        <div style={{
          position: "absolute", width: 6, height: 6, borderRadius: "50%",
          background: `${color}80`, top: -3, left: "50%", marginLeft: -3,
        }} />
      </div>
    </div>
  );
}

/* Glowing background orbs */
function GlowOrbs({ slide }) {
  return (
    <div style={{ position: "absolute", inset: 0, zIndex: 1, overflow: "hidden", pointerEvents: "none" }}>
      <div style={{
        position: "absolute", width: 400, height: 400, borderRadius: "50%",
        background: slide.orb1, filter: "blur(80px)", top: "-100px", right: "20%",
        animation: "liquidBlob 10s ease-in-out infinite, bgPulse 8s ease-in-out infinite",
        willChange: "transform",
      }} />
      <div style={{
        position: "absolute", width: 300, height: 300, borderRadius: "50%",
        background: slide.orb2, filter: "blur(60px)", bottom: "-60px", right: "40%",
        animation: "liquidBlob 13s ease-in-out 2s infinite, bgPulse 10s ease-in-out 1s infinite",
        willChange: "transform",
      }} />
      <div style={{
        position: "absolute", width: 200, height: 200, borderRadius: "50%",
        background: slide.orb3, filter: "blur(40px)", top: "30%", left: "35%",
        animation: "liquidBlob 9s ease-in-out 4s infinite",
      }} />
      {/* Grid lines */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.04,
        backgroundImage: `linear-gradient(${slide.accent} 1px, transparent 1px), linear-gradient(90deg, ${slide.accent} 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />
      {/* Scan line effect */}
      <div style={{
        position: "absolute", left: 0, right: 0, height: "2px",
        background: `linear-gradient(90deg, transparent, ${slide.accent}40, transparent)`,
        animation: "scanLine 6s linear infinite",
      }} />
    </div>
  );
}

/* Slide content */
const slideVariants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

function BannerCarousel({ banners }) {
  const apiList = [banners.homepage_top, banners.homepage_mid, banners.homepage_bottom].flat().filter(Boolean);
  const useApi = apiList.length > 0;
  const [activeIdx, setActiveIdx] = useState(0);
  const total = useApi ? apiList.length : BANNER_SLIDES.length;

  useEffect(() => {
    if (total <= 1) return;
    const t = setInterval(() => setActiveIdx(i => (i + 1) % total), 6000);
    return () => clearInterval(t);
  }, [total]);

  const go = useCallback((d) => setActiveIdx(i => (i + d + total) % total), [total]);

  return (
    <section style={{ marginBottom: 24 }}>
      {/* Main banner */}
      <div style={{
        position: "relative", width: "100%", borderRadius: 24, overflow: "hidden",
        paddingTop: "38%",
        boxShadow: "0 8px 40px rgba(30,58,138,0.25), 0 2px 8px rgba(30,58,138,0.15)",
      }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <AnimatePresence mode="wait">
            {useApi ? (
              (() => {
                const b = apiList[activeIdx];
                const src = b.image_url || b.image || b.url;
                return (
                  <motion.div key={activeIdx} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.5, ease: "easeInOut" }} style={{ position: "absolute", inset: 0 }}>
                    {src && <img src={src} alt={b.title || "Banner"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(30,58,138,0.7) 0%,rgba(30,58,138,0.1) 60%,transparent)" }} />
                    {b.title && <div style={{ position: "absolute", bottom: 40, left: 48 }}>
                      <h3 className="syne" style={{ color: "white", fontSize: 32, fontWeight: 900, marginBottom: 6 }}>{b.title}</h3>
                      {b.subtitle && <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14 }}>{b.subtitle}</p>}
                    </div>}
                  </motion.div>
                );
              })()
            ) : (
              (() => {
                const slide = BANNER_SLIDES[activeIdx];
                return (
                  <motion.div key={activeIdx} variants={slideVariants} initial="enter" animate="center" exit="exit"
                    transition={{ duration: 0.5, ease: "easeInOut" }}
                    style={{ position: "absolute", inset: 0, background: slide.bg }}>

                    {/* Background effects */}
                    <GlowOrbs slide={slide} />
                    <Particles color={slide.accent} />
                    <OrbitalRings color={slide.accent} />

                    {/* Left content */}
                    <div style={{ position: "absolute", inset: 0, zIndex: 10, display: "flex", flexDirection: "column", justifyContent: "center", padding: "0 5% 0 6%", maxWidth: "50%" }}>
                      {/* Tag badge */}
                      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05, duration: 0.4, ease: "easeOut" }}>
                        <span className="badge-pill syne" style={{
                          display: "inline-flex", alignItems: "center",
                          fontSize: 10, fontWeight: 800, letterSpacing: "0.15em",
                          color: slide.accentLight, padding: "5px 14px", borderRadius: 50,
                          marginBottom: 20,
                        }}>
                          {slide.tag}
                        </span>
                      </motion.div>

                      {/* Title */}
                      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}>
                        <h2 className="syne" style={{
                          color: "white", lineHeight: 1.05, marginBottom: 16,
                          fontSize: "clamp(28px, 3.5vw, 52px)", fontWeight: 900,
                          textShadow: `0 0 60px ${slide.accent}40`,
                        }}>
                          {slide.titleLine1}<br />
                          <span style={{ color: slide.accent, filter: `drop-shadow(0 0 20px ${slide.accent}80)` }}>
                            {slide.titleLine2}
                          </span>
                        </h2>
                      </motion.div>

                      {/* Subtitle */}
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.22, duration: 0.4 }}
                        style={{ color: "rgba(255,255,255,0.5)", fontSize: 13, marginBottom: 28, lineHeight: 1.6 }}>
                        {slide.sub}
                      </motion.p>

                      {/* Stats row */}
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.28, duration: 0.4 }}
                        style={{ display: "flex", gap: 20, marginBottom: 28 }}>
                        {[["10K+", "Sản phẩm"], ["50K+", "Khách hàng"], ["4.9★", "Đánh giá"]].map(([v, l]) => (
                          <div key={l}>
                            <div className="syne" style={{ color: slide.accent, fontSize: 18, fontWeight: 900, lineHeight: 1 }}>{v}</div>
                            <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginTop: 3 }}>{l}</div>
                          </div>
                        ))}
                      </motion.div>

                      {/* CTA */}
                      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34, duration: 0.38 }}>
                        <Link to="/products" className="hp-banner-btn">
                          {slide.cta} <FiArrowRight size={14} />
                        </Link>
                      </motion.div>
                    </div>

                    {/* Right product showcase */}
                    <div style={{ position: "absolute", inset: 0, zIndex: 8 }}>
                      {slide.products.map((p, i) => (
                        <ProductFloatCard key={i} product={p} position={i} slideActive={true} />
                      ))}
                    </div>

                    {/* Bottom gradient */}
                    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, zIndex: 20,
                      background: "linear-gradient(to top, rgba(2,8,24,0.4), transparent)" }} />
                  </motion.div>
                );
              })()
            )}
          </AnimatePresence>

          {/* Slide index pills */}
          <div style={{ position: "absolute", left: "5%", bottom: 18, zIndex: 30, display: "flex", gap: 8, alignItems: "center" }}>
            {Array.from({ length: total }).map((_, i) => {
              const slide = BANNER_SLIDES[i % BANNER_SLIDES.length];
              return (
                <button key={i} onClick={() => setActiveIdx(i)} style={{
                  width: i === activeIdx ? 28 : 6, height: 6, borderRadius: 50,
                  background: i === activeIdx ? (slide?.accent || "white") : "rgba(255,255,255,0.25)",
                  border: "none", cursor: "pointer", transition: "all 0.3s ease",
                  boxShadow: i === activeIdx ? `0 0 10px ${slide?.accent || "white"}80` : "none",
                }} />
              );
            })}
          </div>

          {/* Nav arrows */}
          {total > 1 && (
            <>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => go(-1)}
                style={{
                  position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", zIndex: 30,
                  width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
                  color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "background 0.2s",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              >
                <FiChevronLeft size={18} />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
                onClick={() => go(1)}
                style={{
                  position: "absolute", right: 16, top: "50%", transform: "translateY(-50%)", zIndex: 30,
                  width: 42, height: 42, borderRadius: "50%", border: "1px solid rgba(255,255,255,0.2)",
                  background: "rgba(255,255,255,0.08)", backdropFilter: "blur(12px)",
                  color: "white", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                }}
                onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.2)"}
                onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
              >
                <FiChevronRight size={18} />
              </motion.button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════
   ✦ FEATURE BADGES — Glass cards
══════════════════════════════════ */
const FEATURE_BADGES = [
  { icon: FiTruck,       title: "Freeship toàn quốc", description: "Đơn từ 299K",       color: "#2563eb", bg: "linear-gradient(135deg,#eff6ff,#dbeafe)" },
  { icon: FiRefreshCw,   title: "Đổi trả 30 ngày",   description: "Hoàn trả dễ dàng",  color: "#059669", bg: "linear-gradient(135deg,#ecfdf5,#d1fae5)" },
  { icon: FiShield,      title: "Chính hãng 100%",    description: "Cam kết xác thực",  color: "#4f46e5", bg: "linear-gradient(135deg,#eef2ff,#e0e7ff)" },
  { icon: FiCreditCard,  title: "Thanh toán an toàn", description: "Mã hóa đầu cuối",   color: "#0284c7", bg: "linear-gradient(135deg,#f0f9ff,#e0f2fe)" },
  { icon: FiLock,        title: "Bảo mật SSL",         description: "Kết nối mã hóa",    color: "#0369a1", bg: "linear-gradient(135deg,#f0f9ff,#bae6fd)" },
  { icon: FiCheckCircle, title: "Bảo hành chính hãng",description: "Đầy đủ chứng từ",  color: "#3730a3", bg: "linear-gradient(135deg,#eef2ff,#c7d2fe)" },
];

function FeatureBadges() {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(160px,1fr))", gap: 12, marginBottom: 24 }}>
      {FEATURE_BADGES.map((b, i) => {
        const Icon = b.icon;
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06, duration: 0.4, ease: "easeOut" }}
            className="feature-card"
            style={{ borderRadius: 16, padding: "14px 16px", cursor: "default" }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12, background: b.bg,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Icon size={16} style={{ color: b.color }} />
              </div>
              <div>
                <p style={{ fontSize: 12, fontWeight: 700, color: "#1e293b", lineHeight: 1.3 }}>{b.title}</p>
                <p style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{b.description}</p>
              </div>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ══════════════════════════════════
   ✦ BRAND PANEL
══════════════════════════════════ */
function BrandCard({ br }) {
  return (
    <Link to="/products" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, textDecoration: "none" }}>
      <motion.div whileHover={{ scale: 1.06, y: -3 }} whileTap={{ scale: 0.97 }}
        style={{
          width: 88, height: 64, borderRadius: 14, background: "white",
          border: "1.5px solid rgba(219,234,254,0.9)",
          display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
          boxShadow: "0 2px 12px rgba(30,58,138,0.06)",
          transition: "border-color 0.15s, box-shadow 0.15s",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(96,165,250,0.5)"; e.currentTarget.style.boxShadow = "0 6px 20px rgba(30,58,138,0.15)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(219,234,254,0.9)"; e.currentTarget.style.boxShadow = "0 2px 12px rgba(30,58,138,0.06)"; }}
      >
        {br.logo_url || br.image_url
          ? <img src={br.logo_url || br.image_url} alt={br.name} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "contain", padding: 10 }} />
          : <span className="syne" style={{ fontSize: 22, fontWeight: 900, color: "#bfdbfe" }}>{br.name?.[0] || "?"}</span>
        }
      </motion.div>
      <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textAlign: "center", maxWidth: 88, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {br.name}
      </span>
    </Link>
  );
}

function BrandsPanel({ brands }) {
  const { viewportRef, canPrev, canNext, scrollPrev, scrollNext } = useCarousel({ itemWidth: 100, gap: 14 });
  return (
    <section style={{ marginBottom: 20 }} className="section-card" style={{ marginBottom: 20, borderRadius: 20, overflow: "hidden" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderBottom: "1px solid rgba(219,234,254,0.6)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="glow-icon" style={{ width: 30, height: 30, borderRadius: 10, background: "linear-gradient(135deg,#2563eb,#1d4ed8)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <FiAward size={14} style={{ color: "white" }} />
          </div>
          <h2 className="syne" style={{ fontSize: 15, fontWeight: 900, color: "#1e293b", letterSpacing: "-0.02em" }}>Thương hiệu nổi bật</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <ViewAll to="/products" />
          <NavBtn onClick={scrollPrev} disabled={!canPrev} direction="prev" />
          <NavBtn onClick={scrollNext} disabled={!canNext} direction="next" />
        </div>
      </div>
      <div style={{ padding: "16px 20px" }}>
        <div className="carousel">
          <div className="carousel-viewport" ref={viewportRef}>
            <div className="carousel-track" style={{ gap: 14 }}>
              {brands.map((br, i) => (
                <div key={br._id || br.slug || i} style={{ width: 100, minWidth: 100 }}>
                  <BrandCard br={br} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════
   ✦ FLASH SALE — Red hot theme
══════════════════════════════════ */
function FlashSaleSection({ flashSale }) {
  const { viewportRef, canPrev, canNext, scrollPrev, scrollNext } = useCarousel({ itemWidth: 200, gap: 12 });
  const isUpcoming = flashSale._upcoming;
  return (
    <section style={{ marginBottom: 20 }}>
      <div style={{
        borderRadius: 20, overflow: "hidden",
        background: "linear-gradient(135deg, #ef4444 0%, #dc2626 40%, #e11d48 75%, #f43f5e 100%)",
        border: "1px solid rgba(255,180,180,0.25)",
        boxShadow: "0 8px 32px rgba(239,68,68,0.4), inset 0 1px 0 rgba(255,255,255,0.15)",
      }}>
        {/* Top accent line */}
        <div style={{ height: 3, background: "linear-gradient(90deg, #fff, rgba(255,255,255,0.4), #fff, rgba(255,255,255,0.4))", backgroundSize: "200% 100%", animation: "holo 3s linear infinite" }} />

        {/* Header */}
        <div style={{ padding: "14px 20px 14px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            {/* Zap icon */}
            <div style={{
              width: 42, height: 42, borderRadius: 13, display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg, rgba(255,255,255,0.25), rgba(255,255,255,0.12))",
              border: "1px solid rgba(255,255,255,0.4)",
              animation: "pulseGlow 2s ease-in-out infinite",
            }}>
              <FiZap size={20} style={{ color: "#fff700" }} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
                <h2 className="syne" style={{ fontSize: 16, fontWeight: 800, color: "white", letterSpacing: "0.01em" }}>
                  {isUpcoming ? "Flash Sale sắp diễn ra" : "Flash Sale"}
                </h2>
                {/* Blinking LIVE badge */}
                <span style={{
                  background: "rgba(255,255,255,0.22)",
                  color: "white",
                  fontSize: 9, fontWeight: 900, padding: "2px 8px", borderRadius: 20,
                  letterSpacing: "0.1em", border: "1px solid rgba(255,255,255,0.35)",
                  animation: "pulseGlow 1.5s ease-in-out infinite",
                }}>
                  LIVE
                </span>
              </div>
              <p style={{ color: "rgba(255,255,255,0.75)", fontSize: 11 }}>Giá sốc — Số lượng cực hạn</p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Countdown label={isUpcoming ? "Bắt đầu sau" : "Kết thúc sau"} endTime={isUpcoming ? flashSale.start_time : flashSale.end_time} />
            <div style={{ display: "flex", gap: 6 }}>
              <NavBtn onClick={scrollPrev} disabled={!canPrev} direction="prev" light />
              <NavBtn onClick={scrollNext} disabled={!canNext} direction="next" light />
            </div>
          </div>
        </div>

        {/* Products area */}
        <div style={{
          margin: "0 12px 12px", borderRadius: 14, padding: "12px",
          background: "rgba(0,0,0,0.1)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}>
          <div className="carousel">
            <div className="carousel-viewport" ref={viewportRef}>
              <div className="carousel-track" style={{ gap: 12 }}>
                {flashSale.items.map((it, i) => (
                  <div key={`flash-${it._id || it.product_id || it.id || ""}-${i}`} style={{ width: 200, minWidth: 200 }}>
                    <ProductCard item={normalizeFlashItem(it)} type="flash" index={i} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ══════════════════════════════════
   ✦ SECTION HEADER with gradient accent
══════════════════════════════════ */
function SectionHeader({ title, Icon, accentColor, viewAllHref, count }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderBottom: "1px solid rgba(219,234,254,0.5)" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div className="glow-icon" style={{
          width: 30, height: 30, borderRadius: 10, background: accentColor,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          {Icon && <Icon size={14} style={{ color: "white" }} />}
        </div>
        <h2 className="syne" style={{ fontSize: 15, fontWeight: 900, color: "#1e293b", letterSpacing: "-0.02em" }}>{title}</h2>
        {count != null && (
          <span style={{ fontSize: 11, color: "#3b82f6", background: "#eff6ff", padding: "2px 8px", borderRadius: 20, fontWeight: 700, border: "1px solid #bfdbfe" }}>
            {count}
          </span>
        )}
      </div>
      {viewAllHref && <ViewAll to={viewAllHref} />}
    </div>
  );
}

/* ──  Section Carousel ─── */
function SectionCarousel({ title, Icon, accentColor = "#1d4ed8", viewAllHref, items = [], renderItem, itemWidth = 200, gap = 12 }) {
  const { viewportRef, canPrev, canNext, scrollPrev, scrollNext } = useCarousel({ itemWidth, gap });
  if (!items.length) return null;
  return (
    <section style={{ marginBottom: 20, background: "white", borderRadius: 20, border: "1px solid rgba(219,234,254,0.7)", overflow: "hidden", boxShadow: "0 2px 16px rgba(30,58,138,0.04)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 20px 16px", borderBottom: "1px solid rgba(219,234,254,0.5)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div className="glow-icon" style={{ width: 30, height: 30, borderRadius: 10, background: accentColor, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {Icon && <Icon size={14} style={{ color: "white" }} />}
          </div>
          <h2 className="syne" style={{ fontSize: 15, fontWeight: 900, color: "#1e293b", letterSpacing: "-0.02em" }}>{title}</h2>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {viewAllHref && <ViewAll to={viewAllHref} />}
          <NavBtn onClick={scrollPrev} disabled={!canPrev} direction="prev" />
          <NavBtn onClick={scrollNext} disabled={!canNext} direction="next" />
        </div>
      </div>
      <div style={{ padding: "12px 16px 16px" }}>
        <div className="carousel">
          <div className="carousel-viewport" ref={viewportRef}>
            <div className="carousel-track" style={{ gap }}>
              {items.map((it, i) => (
                <div key={it._id || it.id || it.slug || i} style={{ width: itemWidth, minWidth: itemWidth }}>
                  {renderItem(it, i)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ── Product Grid Section ─── */
function ProductGridSection({ title, Icon, accentColor = "#1d4ed8", viewAllHref, items = [], max = 12 }) {
  const visible = items.slice(0, max);
  if (!visible.length) return null;
  return (
    <section style={{ marginBottom: 20, background: "white", borderRadius: 20, border: "1px solid rgba(219,234,254,0.7)", overflow: "hidden", boxShadow: "0 2px 16px rgba(30,58,138,0.04)" }}>
      <SectionHeader title={title} Icon={Icon} accentColor={accentColor} viewAllHref={viewAllHref} count={visible.length} />
      <div style={{ padding: 16 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 16 }}>
          {visible.map((p, i) => <ProductCard key={p._id || p.id || i} item={{ product: p }} index={i} />)}
        </div>
      </div>
    </section>
  );
}

/* ─── Skeleton ─── */
function HomePageSkeleton() {
  return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 24px 80px" }}>
      <Skeleton style={{ height: 12, borderRadius: 12, marginBottom: 8 }} />
      <Skeleton style={{ paddingTop: "38%", borderRadius: 24, marginBottom: 24 }} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 12, marginBottom: 24 }}>
        {Array.from({ length: 6 }, (_, i) => <Skeleton key={i} style={{ height: 70, borderRadius: 16 }} />)}
      </div>
      {Array.from({ length: 3 }, (_, s) => (
        <div key={s} style={{ background: "white", borderRadius: 20, border: "1px solid #e0ecff", padding: 20, marginBottom: 20 }}>
          <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
            <Skeleton style={{ width: 30, height: 30, borderRadius: 10 }} />
            <Skeleton style={{ height: 16, width: 160, borderRadius: 8 }} />
          </div>
          <div style={{ display: "flex", gap: 12, overflow: "hidden" }}>
            {Array.from({ length: 5 }, (_, i) => (
              <div key={i} style={{ flexShrink: 0, width: 200 }}>
                <Skeleton style={{ height: 180, borderRadius: 14, marginBottom: 8 }} />
                <Skeleton style={{ height: 12, width: "80%", borderRadius: 6, marginBottom: 6 }} />
                <Skeleton style={{ height: 12, width: "40%", borderRadius: 6 }} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ════════════════════ PAGE ════════════════════ */
export default function HomePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [recentlyViewed, setRecentlyViewed] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const payload = await homeService.fetchHomepage();
        setData(normalizeHomepage(payload));
      } catch (e) {
        setError(e?.message || "Không tải được trang chủ");
      } finally {
        setLoading(false);
      }
    })();
    if (localStorage.getItem(TOKEN_KEY)) {
      userService.getRecentlyViewed().then(setRecentlyViewed).catch(() => {});
    }
  }, []);

  if (loading) return <HomePageSkeleton />;

  if (error) return (
    <div style={{ maxWidth: 1280, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
      <div style={{ display: "inline-flex", flexDirection: "column", alignItems: "center", gap: 16, background: "white", borderRadius: 24, padding: 48, boxShadow: "0 4px 24px rgba(30,58,138,0.08)", border: "1px solid rgba(219,234,254,0.8)" }}>
        <div style={{ width: 52, height: 52, borderRadius: 16, background: "linear-gradient(135deg,#eff6ff,#dbeafe)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <FiRefreshCw size={22} style={{ color: "#3b82f6" }} />
        </div>
        <p style={{ color: "#374151", fontWeight: 700, fontSize: 15 }}>{error}</p>
        <button onClick={() => window.location.reload()} style={{
          padding: "10px 28px", background: "linear-gradient(135deg,#2563eb,#1d4ed8)", color: "white",
          fontWeight: 800, borderRadius: 14, border: "none", cursor: "pointer", fontSize: 14,
        }}>
          Thử lại
        </button>
      </div>
    </div>
  );

  if (!data) return null;
  const { banners, brands, men, women, flashSale, unisex } = data;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.35, ease: "easeOut" }}
      style={{ maxWidth: 1280, margin: "0 auto", padding: "20px 20px 80px" }}>
      <style>{`body { background: #EFF6FF !important; }`}</style>

      <BannerCarousel banners={banners} />
      <FeatureBadges />

      {!!brands.length && <BrandsPanel brands={brands} />}
      {!!flashSale?.items?.length && <FlashSaleSection flashSale={flashSale} />}

      {!!men.length && (
        <SectionCarousel title="Thời trang Nam" Icon={FiUsers} accentColor="linear-gradient(135deg,#2563eb,#1d4ed8)"
          viewAllHref="/categories/men" items={men}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />} itemWidth={200} gap={12} />
      )}
      {!!women.length && (
        <SectionCarousel title="Thời trang Nữ" Icon={FiHeart} accentColor="linear-gradient(135deg,#0ea5e9,#0284c7)"
          viewAllHref="/categories/women" items={women}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />} itemWidth={200} gap={12} />
      )}
      {!!unisex?.length && (
        <SectionCarousel title="Unisex" Icon={FiStar} accentColor="linear-gradient(135deg,#6366f1,#4f46e5)"
          viewAllHref="/categories/unisex" items={unisex}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />} itemWidth={200} gap={12} />
      )}
      {!!men.length && (
        <SectionCarousel title="Xu hướng nổi bật" Icon={FiTrendingUp} accentColor="linear-gradient(135deg,#0891b2,#0e7490)"
          viewAllHref="/products?sort=popular" items={[...men, ...women].slice(0, 12)}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />} itemWidth={200} gap={12} />
      )}
      {!!(men.length || women.length) && (
        <ProductGridSection title="Sản phẩm nổi bật" Icon={FiPackage} accentColor="linear-gradient(135deg,#2563eb,#1d4ed8)"
          viewAllHref="/products" items={[...men, ...women, ...(unisex || [])].slice(0, 12)} max={12} />
      )}
      {recentlyViewed.length > 0 && (
        <SectionCarousel title="Đã xem gần đây" Icon={FiEye} accentColor="linear-gradient(135deg,#3b82f6,#2563eb)"
          viewAllHref="/products" items={recentlyViewed}
          renderItem={(p, i) => <ProductCard item={{ product: p }} index={i} />} itemWidth={200} gap={12} />
      )}
    </motion.div>
  );
}