import React, {
  useEffect, useRef, useState, useCallback, useMemo,
} from "react";
import { Link } from "react-router-dom";
import {
  motion, AnimatePresence,
  useMotionValue, useTransform, useSpring,
  useInView, useScroll, useTransform as useScrollTransform,
} from "framer-motion";
import {
  Button, Card, CardBody, CardFooter,
  Input, Chip, Avatar, Skeleton,
} from "@heroui/react";
import { homeService } from "../services/homeService";

/* ══════════════════════════════════════════════════════
   KEYFRAMES — injected once into <head>
══════════════════════════════════════════════════════ */
if (typeof document !== "undefined" && !document.getElementById("lp2-kf")) {
  const s = document.createElement("style");
  s.id = "lp2-kf";
  s.textContent = `
    @keyframes lp-float {
      0%,100%{ transform:translateY(0px) rotate(var(--r,0deg)) scale(1); }
      50%     { transform:translateY(-18px) rotate(var(--r,0deg)) scale(1.02); }
    }
    @keyframes lp-floatR {
      0%,100%{ transform:translateY(0px) rotate(var(--r,0deg)); }
      50%     { transform:translateY(-12px) rotate(calc(var(--r,0deg) + 3deg)); }
    }
    @keyframes lp-shimmer {
      0%  { background-position:-200% center; }
      100%{ background-position: 200% center; }
    }
    @keyframes lp-ticker {
      0%  { transform:translateX(0); }
      100%{ transform:translateX(-50%); }
    }
    @keyframes lp-scan {
      0%  { top:-3px; opacity:.9; }
      100%{ top:105%; opacity:0; }
    }
    @keyframes lp-pulse {
      0%,100%{ box-shadow:0 0 0 0   rgba(11,116,229,.3); }
      50%    { box-shadow:0 0 0 18px rgba(11,116,229,0); }
    }
    @keyframes lp-orbit {
      from{ transform:rotate(0deg) translateX(var(--orb-r,80px)) rotate(0deg); }
      to  { transform:rotate(360deg) translateX(var(--orb-r,80px)) rotate(-360deg); }
    }
    @keyframes lp-blob {
      0%,100%{ border-radius:62% 38% 54% 46% / 55% 45% 60% 40%; }
      33%    { border-radius:44% 56% 38% 62% / 48% 68% 32% 52%; }
      66%    { border-radius:55% 45% 62% 38% / 36% 56% 44% 64%; }
    }
    @keyframes lp-glow {
      0%,100%{ opacity:.5; transform:scale(1); }
      50%    { opacity:1;  transform:scale(1.15); }
    }
    @keyframes lp-spin {
      to{ transform:rotate(360deg); }
    }
    @keyframes lp-ripple {
      0%  { transform:scale(0.8); opacity:1; }
      100%{ transform:scale(2.2); opacity:0; }
    }
    @keyframes lp-countUp {
      from{ opacity:0; transform:translateY(12px); }
      to  { opacity:1; transform:translateY(0); }
    }

    /* ─ Utility classes ─ */
    .lp-shimmer-txt {
      background:linear-gradient(90deg,#0B74E5,#7C3AED 35%,#2563EB 65%,#0B74E5);
      background-size:200% auto;
      -webkit-background-clip:text; background-clip:text;
      -webkit-text-fill-color:transparent;
      animation:lp-shimmer 4s linear infinite;
    }
    .lp-float  { animation:lp-float  5.5s ease-in-out infinite; }
    .lp-floatR { animation:lp-floatR 7s ease-in-out infinite; }
    .lp-ticker { animation:lp-ticker 32s linear infinite; }
    .lp-ticker:hover{ animation-play-state:paused; }
    .lp-scan   { position:absolute; left:0; right:0; height:3px;
                 background:linear-gradient(90deg,transparent,#0B74E5,transparent);
                 animation:lp-scan 2.6s ease-in-out infinite; pointer-events:none; }
    .lp-pulse  { animation:lp-pulse 2.2s ease-in-out infinite; }
    .lp-blob   { animation:lp-blob 8s ease-in-out infinite; }
    .lp-spin   { animation:lp-spin .9s linear infinite; }
    .lp-ripple { animation:lp-ripple 1.8s ease-out infinite; }

    @keyframes lp-cursor-ring {
      0%  { transform:scale(1);   opacity:.7; }
      100%{ transform:scale(2.4); opacity:0;  }
    }
    .lp-cursor-ring {
      animation: lp-cursor-ring .7s ease-out forwards;
    }
    .lp-glass {
      background:rgba(255,255,255,.58);
      backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px);
      border:1px solid rgba(255,255,255,.72);
    }
    .lp-glass-dark {
      background:rgba(11,116,229,.1);
      backdrop-filter:blur(16px); -webkit-backdrop-filter:blur(16px);
      border:1px solid rgba(11,116,229,.2);
    }
    .lp-mesh {
      background:
        radial-gradient(ellipse at 12% 55%, rgba(11,116,229,.08) 0%,transparent 52%),
        radial-gradient(ellipse at 88% 18%, rgba(124,58,237,.06) 0%,transparent 52%),
        radial-gradient(ellipse at 52% 85%, rgba(37,99,235,.05) 0%,transparent 52%),
        #f6fbff;
    }
    .lp-dots {
      background-image:radial-gradient(circle,rgba(11,116,229,.1) 1px,transparent 1px);
      background-size:26px 26px;
    }
    .lp-card-hover {
      transition:transform .4s cubic-bezier(.34,1.56,.64,1), box-shadow .4s ease;
    }
    .lp-card-hover:hover {
      transform:translateY(-8px) scale(1.02);
      box-shadow:0 30px 60px -15px rgba(11,116,229,.22);
    }
    .lp-img-zoom img { transition:transform .7s cubic-bezier(.22,1,.36,1); }
    .lp-img-zoom:hover img { transform:scale(1.1); }
    .lp-line-clamp2 {
      display:-webkit-box;
      -webkit-line-clamp:2;
      -webkit-box-orient:vertical;
      overflow:hidden;
    }
  `;
  document.head.appendChild(s);
}

/* ══════════════════════════════════════════════════════
   SVG ICON HELPERS
══════════════════════════════════════════════════════ */
const ico = (d, o = {}) =>
  ({ size = 16, className = "", color, style, ...rest }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size}
      viewBox="0 0 24 24"
      fill={o.fill ? (color || "currentColor") : "none"}
      stroke={o.fill ? "none" : (color || "currentColor")}
      strokeWidth={o.fill ? 0 : 1.8}
      strokeLinecap="round" strokeLinejoin="round"
      className={className} style={{ flexShrink: 0, ...style }} {...rest}>
      {d}
    </svg>
  );

const IcoBrain    = ico(<path fill="currentColor" d="M13.5 4.5c.513 0 1.012.065 1.488.186a3.75 3.75 0 0 1 6.262 2.814v.2c0 .604-.153 1.186-.422 1.7a3.751 3.751 0 0 1-.54 6.553A3.752 3.752 0 0 1 16.5 18c0 .386-.029.765-.086 1.135a3.75 3.75 0 0 1-6.426 1.74 3.752 3.752 0 0 1-4.814-4.042A3.752 3.752 0 0 1 2.75 13.5a3.751 3.751 0 0 1-.54-6.553 3.752 3.752 0 0 1 6.262-2.814c.476-.12.975-.186 1.488-.186h3.54Z"/>, { fill: true });
const IcoArrow    = ico(<path d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3"/>);
const IcoChevR    = ico(<path d="m8.25 4.5 7.5 7.5-7.5 7.5"/>);
const IcoChevL    = ico(<path d="M15.75 19.5 8.25 12l7.5-7.5"/>);
const IcoStar     = ico(<path fill="currentColor" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.006 5.404.434c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.434 2.082-5.005Z"/>, { fill: true });
const IcoHeart    = ico(<path strokeLinecap="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z"/>);
const IcoCart     = ico(<path fill="currentColor" d="M2.25 2.25a.75.75 0 0 0 0 1.5h1.386c.17 0 .318.114.362.278l2.558 9.592a3.752 3.752 0 0 0-2.806 3.63c0 .414.336.75.75.75h15.75a.75.75 0 0 0 0-1.5H5.378A2.25 2.25 0 0 1 7.5 15h11.218a.75.75 0 0 0 .674-.421 60.358 60.358 0 0 0 2.96-7.228.75.75 0 0 0-.525-.965A60.864 60.864 0 0 0 5.68 4.509l-.232-.867A1.875 1.875 0 0 0 3.636 2.25H2.25ZM3.75 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 20.25a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0Z"/>, { fill: true });
const IcoCheck    = ico(<path fill="currentColor" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 0 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z"/>, { fill: true });
const IcoShip     = ico(<path fill="currentColor" d="M3.375 4.5C2.339 4.5 1.5 5.34 1.5 6.375V13.5h12V6.375c0-1.036-.84-1.875-1.875-1.875h-8.25ZM13.5 15h-12v2.625c0 1.035.84 1.875 1.875 1.875H3.75a3 3 0 1 0 5.99-.375h3.01a3 3 0 1 0 5.99.375h.375a1.875 1.875 0 0 0 1.875-1.875v-6H15a1.5 1.5 0 0 1-1.5-1.5V15Zm5.625-4.5h-4.875V12h3.914l.961-1.5ZM6.75 19.5a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Zm10.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z"/>, { fill: true });
const IcoFire     = ico(<path fill="currentColor" d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"/>, { fill: true });
const IcoSparkle  = ico(<path fill="currentColor" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"/>, { fill: true });
const IcoUser     = ico(<path fill="currentColor" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z"/>, { fill: true });
const IcoQuote    = ico(<path fill="currentColor" d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 0 1-3.5 3.5c-1.073 0-2.099-.49-2.748-1.179Z"/>, { fill: true });
const IcoRefresh  = ico(<path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"/>);

/* ══════════════════════════════════════════════════════
   DATA — REAL BRANDS & PRODUCTS FROM SYSTEM
══════════════════════════════════════════════════════ */
const STATIC_BRANDS = [
  { _id: "brd-adcd511e", name: "Nike",          slug: "nike",      logo_url: "https://inkythuatso.com/uploads/images/2021/11/logo-nike-inkythuatso-2-01-04-15-42-44.jpg" },
  { _id: "brd-ec799272", name: "Adidas",         slug: "adidas",    logo_url: "https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg" },
  { _id: "brd-17cdcb35", name: "Uniqlo",         slug: "uniqlo",    logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/92/UNIQLO_logo.svg/1029px-UNIQLO_logo.svg.png" },
  { _id: "brd-9cf5112b", name: "Zara",           slug: "zara",      logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/fd/Zara_Logo.svg/1280px-Zara_Logo.svg.png" },
  { _id: "brd-b5d4fc21", name: "H&M",            slug: "h-m",       logo_url: "https://upload.wikimedia.org/wikipedia/commons/thumb/5/53/H%26M-Logo.svg/1200px-H%26M-Logo.svg.png" },
  { _id: "brd-010e9e76", name: "Levi's",         slug: "levi-s",    logo_url: "https://static.vecteezy.com/system/resources/previews/023/869/641/non_2x/levis-brand-clothes-logo-symbol-design-fashion-illustration-free-vector.jpg" },
  { _id: "brd-adcbe7ec", name: "Mango",          slug: "mango",     logo_url: "https://logos-world.net/wp-content/uploads/2023/01/Mango-Logo.png" },
  { _id: "brd-4a3d2f11", name: "Converse",       slug: "converse",  logo_url: "https://upload.wikimedia.org/wikipedia/commons/3/30/Converse_logo.svg" },
  { _id: "brd-puma001",  name: "Puma",           slug: "puma",      logo_url: "https://logos-world.net/wp-content/uploads/2020/04/Puma-Logo.png" },
  { _id: "brd-tnf001",   name: "The North Face", slug: "the-north-face", logo_url: "https://upload.wikimedia.org/wikipedia/commons/e/e1/The_North_Face.png" },
  { _id: "brd-ua001",    name: "Under Armour",   slug: "under-armour", logo_url: "https://logos-world.net/wp-content/uploads/2020/04/Under-Armour-Logo-2005-present.png" },
  { _id: "brd-nb001",    name: "New Balance",    slug: "new-balance",  logo_url: "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcSPGBiMbRwibmsgshiBoC6zlN2h7wvUT4KZVW-NySGAq2ROJYmL1Y4IkFGYmwB5SNEjoXw&usqp=CAU" },
  { _id: "brd-lacoste",  name: "Lacoste",        slug: "lacoste",   logo_url: "https://inkythuatso.com/uploads/images/2021/12/logo-lacoste-inkythuatso-22-13-35-14.jpg" },
  { _id: "brd-ck001",    name: "Calvin Klein",   slug: "calvin-klein", logo_url: "https://images.seeklogo.com/logo-png/31/2/calvin-klein-logo-png_seeklogo-311014.png" },
];

const STATIC_PRODUCTS = [
  {
    _id: "prd-4d911a61", slug: "quan-lot-nam-mens-organic-cotton-trunks",
    name: "Quần Lót Nam Organic Cotton",
    brand: "Nike", brand_slug: "nike",
    base_price: 299000, rating_avg: 4.8, rating_count: 1240, sold_count: 850,
    images: ["https://vcdn.acfc.com.vn/media/catalog/product/cache/1590496433db240c9566f569680d296c/3/6/3612928-04-2_qhv6vjdd3jx1zwb7.webp"],
    aiSize: "M",
  },
  {
    _id: "prd-5fe2a797", slug: "adidas-run-tee",
    name: "Áo Ngực Thể Thao On Running Lumos",
    brand: "Adidas", brand_slug: "adidas",
    base_price: 349000, rating_avg: 4.5, rating_count: 890, sold_count: 620,
    images: ["https://ash.vn/cdn/shop/files/CreateSmallPNG-1WF30260553-performance_bra_lumos-fw25-black-w-1x1-tr-PLP_800x.png?v=1759466976"],
    aiSize: "S",
  },
  {
    _id: "prd-8bb22444", slug: "ao-tank-top-chay-bo-adidas-adi365-climacool-nam-jm5711",
    name: "Áo Tank Top Adidas CLIMACOOL+ Nam",
    brand: "Uniqlo", brand_slug: "uniqlo",
    base_price: 399000, orig_price: 520000, rating_avg: 3.5, rating_count: 10000, sold_count: 2080,
    images: ["https://cdn.hstatic.net/products/200000477321/upload_99816a0b11934071a2e74d0e5e3f5938_master.jpg"],
    aiSize: "L",
  },
  {
    _id: "prd-248830b4", slug: "ao-jersey-adidas-90s-nam-jx3068",
    name: "Áo Jersey Adidas 90s Nam - JX3068",
    brand: "Adidas", brand_slug: "adidas",
    base_price: 449000, rating_avg: 3, rating_count: 1, sold_count: 2500,
    images: ["https://assets.adidas.com/images/w_766,h_766,f_auto,q_auto,fl_lossy,c_fill,g_auto/c80a44b3f32149d1b756429003181b62_9366/ao-dau-san-nha-argentina-26-phien-ban-authentic.jpg"],
    aiSize: "M",
  },
  {
    _id: "prd-3f1ecd11", slug: "h-m-casual-shirt",
    name: "H&M Casual Shirt Premium",
    brand: "H&M", brand_slug: "h-m",
    base_price: 499000, rating_avg: 4, rating_count: 4, sold_count: 1000,
    images: ["https://images.unsplash.com/photo-1602810318383-e386cc2a3ccf?w=500&q=80"],
    aiSize: "L",
  },
  {
    _id: "prd-f186b13c", slug: "levi-s-501-jeans",
    name: "Levi's 501 Original Jeans",
    brand: "Levi's", brand_slug: "levi-s",
    base_price: 549000, orig_price: 720000, rating_avg: 4.7, rating_count: 3200, sold_count: 1450,
    images: ["https://images.unsplash.com/photo-1582552938357-32b906df40cb?w=500&q=80"],
    aiSize: "29",
  },
  {
    _id: "prd-7ebec5de", slug: "mango-chino-pants",
    name: "Mango Chino Pants Slim Fit",
    brand: "Mango", brand_slug: "mango",
    base_price: 599000, rating_avg: 4.2, rating_count: 780, sold_count: 560,
    images: ["https://images.unsplash.com/photo-1473966968600-fa801b869a1a?w=500&q=80"],
    aiSize: "M",
  },
  {
    _id: "prd-zara001", slug: "zara-basic-tshirt",
    name: "Zara Basic Essential T-Shirt",
    brand: "Zara", brand_slug: "zara",
    base_price: 320000, orig_price: 420000, rating_avg: 4.4, rating_count: 2100, sold_count: 3200,
    images: ["https://images.unsplash.com/photo-1523381210434-271e8be1f52b?w=500&q=80"],
    aiSize: "S",
  },
];

const TESTIMONIALS = [
  { name: "Linh Nguyễn", role: "Fashion Blogger · Hà Nội", rating: 5, avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&q=80", text: "Tôi đã từng phải hoàn trả gần mỗi đơn hàng vì sai size. Với DFS AI, tôi chưa trả lại một sản phẩm nào trong 6 tháng qua. Thật tuyệt vời!", accent: "#0B74E5" },
  { name: "Minh Trần", role: "Fitness Coach · TP. HCM", rating: 5, avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&q=80", text: "AI gợi ý XL cho Adidas và M cho Uniqlo — cả hai đều vừa khít hoàn toàn. App này thực sự hiểu cách tính size theo từng thương hiệu!", accent: "#7C3AED" },
  { name: "Hương Phạm", role: "Product Designer · Đà Nẵng", rating: 5, avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&q=80", text: "Ship siêu nhanh, đóng gói đẹp mắt, thanh toán VNPay chỉ trong tích tắc. DFS là nền tảng thời trang tốt nhất Việt Nam!", accent: "#059669" },
];

/* ══════════════════════════════════════════════════════
   ANIMATION VARIANTS
══════════════════════════════════════════════════════ */
const vFadeUp    = (d = 0) => ({ initial: { opacity: 0, y: 44 }, whileInView: { opacity: 1, y: 0 },    viewport: { once: false, margin: "-70px" }, transition: { duration: .65, delay: d, ease: [.22, 1, .36, 1] } });
const vFadeLeft  = (d = 0) => ({ initial: { opacity: 0, x: -56 }, whileInView: { opacity: 1, x: 0 },  viewport: { once: false, margin: "-70px" }, transition: { duration: .65, delay: d, ease: [.22, 1, .36, 1] } });
const vFadeRight = (d = 0) => ({ initial: { opacity: 0, x: 56 },  whileInView: { opacity: 1, x: 0 },  viewport: { once: false, margin: "-70px" }, transition: { duration: .65, delay: d, ease: [.22, 1, .36, 1] } });
const vScale     = (d = 0) => ({ initial: { opacity: 0, scale: .84 }, whileInView: { opacity: 1, scale: 1 }, viewport: { once: false, margin: "-60px" }, transition: { duration: .6, delay: d, ease: [.34, 1.56, .64, 1] } });
const vSlideUp   = (d = 0) => ({ initial: { opacity: 0, y: 28 },  whileInView: { opacity: 1, y: 0 },   viewport: { once: false, margin: "-50px" }, transition: { duration: .5, delay: d, ease: "easeOut" } });

/* ══════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════ */
const fmt = (n) => new Intl.NumberFormat("vi-VN").format(n) + "₫";
const Stars = ({ rating, size = 12 }) => (
  <span className="flex gap-0.5 items-center">
    {[1,2,3,4,5].map(i => (
      <IcoStar key={i} size={size}
        className={i <= Math.round(rating) ? "text-amber-400" : "text-gray-200"} />
    ))}
  </span>
);

/* ── Animated counter ── */
function Counter({ end, suffix = "", duration = 1800 }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!inView) return;
    let frame;
    const start = performance.now();
    const step = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(eased * end));
      if (progress < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [inView, end, duration]);
  return <span ref={ref}>{val.toLocaleString()}{suffix}</span>;
}

/* ── 3D Tilt card with glare (ref-based — zero re-renders on mousemove) ── */
function TiltCard({ children, className = "", intensity = 8 }) {
  const x  = useMotionValue(0), y  = useMotionValue(0);
  const rX = useSpring(useTransform(y, [-.5, .5], [intensity, -intensity]), { stiffness: 300, damping: 28 });
  const rY = useSpring(useTransform(x, [-.5, .5], [-intensity, intensity]), { stiffness: 300, damping: 28 });
  const sc = useSpring(1, { stiffness: 280, damping: 26 });
  const glareRef = useRef(null);

  const handleMove = useCallback((e) => {
    const r  = e.currentTarget.getBoundingClientRect();
    const nx = (e.clientX - r.left) / r.width;
    const ny = (e.clientY - r.top)  / r.height;
    x.set(nx - .5); y.set(ny - .5); sc.set(1.03);
    if (glareRef.current) {
      glareRef.current.style.background =
        `radial-gradient(circle at ${nx * 100}% ${ny * 100}%, rgba(255,255,255,.2) 0%, transparent 58%)`;
      glareRef.current.style.opacity = "1";
    }
  }, [x, y, sc]);

  const handleLeave = useCallback(() => {
    x.set(0); y.set(0); sc.set(1);
    if (glareRef.current) glareRef.current.style.opacity = "0";
  }, [x, y, sc]);

  return (
    <motion.div className={`relative ${className}`}
      style={{ rotateX: rX, rotateY: rY, scale: sc, transformStyle: "preserve-3d", perspective: 900, willChange: "transform" }}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
    >
      {children}
      {/* Glare — mutated directly via ref, no React re-render */}
      <div ref={glareRef} style={{
        position: "absolute", inset: 0, borderRadius: "inherit",
        pointerEvents: "none", zIndex: 20, opacity: 0,
        transition: "opacity .4s ease",
      }} />
    </motion.div>
  );
}

/* ── Magnetic button wrapper ── */
function MagneticButton({ children, strength = 0.35, className = "" }) {
  const x = useMotionValue(0), y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 250, damping: 22 });
  const sy = useSpring(y, { stiffness: 250, damping: 22 });
  return (
    <motion.div className={`inline-flex ${className}`} style={{ x: sx, y: sy }}
      onMouseMove={e => {
        const r = e.currentTarget.getBoundingClientRect();
        x.set((e.clientX - r.left - r.width  / 2) * strength);
        y.set((e.clientY - r.top  - r.height / 2) * strength);
      }}
      onMouseLeave={() => { x.set(0); y.set(0); }}>
      {children}
    </motion.div>
  );
}

/* ── Glass floating badge ── */
const GBadge = ({ children, className = "", style }) => (
  <div className={`lp-glass rounded-2xl shadow-xl px-4 py-3 ${className}`} style={style}>
    {children}
  </div>
);

/* ══════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════ */
export default function LandingPage() {
  /* ── State ── */
  const [hpData, setHpData]       = useState({ brands: [], men: [], women: [], unisex: [], flashSale: null });
  const [loading, setLoading]     = useState(true);
  const [activeSz, setActiveSz]   = useState(1);
  const [timer, setTimer]         = useState({ h: "08", m: "24", s: "59" });
  const [email, setEmail]         = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [wishlist, setWishlist]   = useState(new Set());
  const [imgErrors, setImgErrors] = useState(new Set());

  /* ── Cursor spotlight (spring-smoothed) ── */
  const cursorX  = useMotionValue(-600);
  const cursorY  = useMotionValue(-600);
  const cursorSX = useSpring(cursorX, { stiffness: 650, damping: 48 });
  const cursorSY = useSpring(cursorY, { stiffness: 650, damping: 48 });

  /* ── Mouse position (0–1) for background parallax ── */
  const mouseX = useMotionValue(0.5);
  const mouseY = useMotionValue(0.5);
  /* Hero blobs */
  const blobX1 = useSpring(useTransform(mouseX, [0, 1], [-24,  24]), { stiffness: 88, damping: 28 });
  const blobY1 = useSpring(useTransform(mouseY, [0, 1], [-18,  18]), { stiffness: 88, damping: 28 });
  const blobX2 = useSpring(useTransform(mouseX, [0, 1], [ 20, -20]), { stiffness: 68, damping: 24 });
  const blobY2 = useSpring(useTransform(mouseY, [0, 1], [ 14, -14]), { stiffness: 68, damping: 24 });
  /* Decorative orb in AI section */
  const orbX   = useSpring(useTransform(mouseX, [0, 1], [-16,  16]), { stiffness: 60, damping: 22 });
  const orbY   = useSpring(useTransform(mouseY, [0, 1], [-10,  10]), { stiffness: 60, damping: 22 });

  /* ── Hero scroll-parallax ── */
  const heroRef     = useRef(null);
  const { scrollYProgress: heroSY } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const heroImgParY = useScrollTransform(heroSY, [0, 1], [0,  90]);
  const heroCopyParY= useScrollTransform(heroSY, [0, 1], [0, -45]);

  /* ── Fetch homepage data ── */
  useEffect(() => {
    homeService.fetchHomepage()
      .then(raw => {
        setHpData({
          brands:   raw?.brands || raw?.brand_list || [],
          men:      raw?.men    || [],
          women:    raw?.women  || [],
          unisex:   raw?.unisex || [],
          flashSale: raw?.flashSale || raw?.flash_sale || null,
        });
      })
      .catch(() => {/* use static fallback */})
      .finally(() => setLoading(false));
  }, []);

  /* ── Derive display data: prefer API, fall back to static ── */
  const brands = useMemo(() =>
    hpData.brands.length > 0 ? hpData.brands : STATIC_BRANDS,
    [hpData.brands]
  );

  const products = useMemo(() => {
    const api = [...hpData.men, ...hpData.women, ...hpData.unisex];
    return api.length > 0 ? api.slice(0, 8) : STATIC_PRODUCTS;
  }, [hpData]);

  /* ── Countdown ── */
  useEffect(() => {
    const end = Date.now() + (8 * 3_600_000 + 24 * 60_000 + 59_000);
    const id  = setInterval(() => {
      const d = Math.max(0, end - Date.now());
      const p = n => String(n).padStart(2, "0");
      setTimer({ h: p(Math.floor(d / 3_600_000)), m: p(Math.floor(d % 3_600_000 / 60_000)), s: p(Math.floor(d % 60_000 / 1000)) });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  /* ── Global mouse tracking + click ripple ── */
  useEffect(() => {
    const onMove = (e) => {
      cursorX.set(e.clientX);
      cursorY.set(e.clientY);
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    const onClick = (e) => {
      const ring = document.createElement("div");
      ring.className = "lp-cursor-ring";
      Object.assign(ring.style, {
        position: "fixed", left: e.clientX + "px", top: e.clientY + "px",
        width: "40px", height: "40px", borderRadius: "50%", pointerEvents: "none",
        border: "2px solid rgba(11,116,229,.55)", zIndex: "9999",
        transform: "translate(-50%,-50%)",
      });
      document.body.appendChild(ring);
      setTimeout(() => ring.remove(), 720);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("click", onClick);
    };
  }, []);

  const toggleWish = useCallback(id =>
    setWishlist(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }), []);

  const handleSubscribe = useCallback(e => {
    e.preventDefault();
    if (!email) return;
    setSubscribed(true); setEmail("");
    setTimeout(() => setSubscribed(false), 4500);
  }, [email]);

  const handleImgError = useCallback((id, fallback) => e => {
    if (imgErrors.has(id)) return;
    setImgErrors(p => new Set([...p, id]));
    e.target.src = fallback || `https://picsum.photos/seed/${id}/400/500`;
  }, [imgErrors]);

  /* ── Ticker brands (double for infinite loop) ── */
  const tickerBrands = useMemo(() => [...brands, ...brands], [brands]);

  const SIZES = ["XS", "S", "M", "L", "XL"];
  const prodFallback = id => `https://picsum.photos/seed/${id}/400/500`;

  /* ══════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════ */
  return (
    <div className="overflow-x-hidden bg-[#f6fbff]">

      {/* ── Global cursor spotlight ── */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none"
        style={{
          position: "fixed", top: 0, left: 0, zIndex: 9998,
          width: 640, height: 640, borderRadius: "50%",
          x: cursorSX, y: cursorSY,
          translateX: "-50%", translateY: "-50%",
          background: "radial-gradient(circle, rgba(11,116,229,.07) 0%, rgba(124,58,237,.03) 40%, transparent 70%)",
        }}
      />

      {/* ════ §1 HERO ══════════════════════════════════════════ */}
      <section ref={heroRef} className="relative min-h-[92vh] flex items-center lp-mesh overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 lp-dots opacity-50 pointer-events-none" />
        <motion.div className="absolute top-24 left-10 w-80 h-80 bg-blue-400/10 rounded-full blur-[120px] lp-blob pointer-events-none"
          style={{ x: blobX1, y: blobY1 }} />
        <motion.div className="absolute bottom-16 right-10 w-96 h-96 bg-violet-400/8 rounded-full blur-[140px] lp-blob pointer-events-none"
          style={{ animationDelay: "-3s", x: blobX2, y: blobY2 }} />
        {/* Orbiting ring */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] opacity-[0.04] pointer-events-none">
          <div className="w-full h-full rounded-full border-2 border-dashed border-blue-500"
            style={{ animation: "lp-spin 30s linear infinite" }} />
        </div>

        <div className="max-w-7xl mx-auto px-5 sm:px-8 py-24 grid grid-cols-1 lg:grid-cols-2 gap-14 items-center w-full z-10">

          {/* Left: Copy */}
          <motion.div className="space-y-8" style={{ y: heroCopyParY }}>
            <motion.div {...vFadeUp(0)}>
              <Chip variant="flat" color="primary" size="sm"
                startContent={<IcoSparkle size={11} />}
                className="font-black tracking-widest text-[10px] uppercase">
                AI-POWERED SIZE RECOMMENDATIONS
              </Chip>
            </motion.div>

            <motion.h1 {...vFadeUp(.07)} className="syne font-black leading-[.9] tracking-tight text-gray-900"
              style={{ fontSize: "clamp(2.8rem,7vw,5rem)" }}>
              Mặc Đúng Size,<br />
              <span className="lp-shimmer-txt">Không Lo</span><br />
              Trả Hàng.
            </motion.h1>

            <motion.p {...vFadeUp(.14)} className="text-gray-500 max-w-md leading-relaxed text-[15px] font-medium">
              DFS dùng AI XGBoost để dự đoán size hoàn hảo từ số đo cơ thể — giúp mua sắm thời trang online trở nên dễ dàng và chính xác với độ tin cậy <strong className="text-blue-600">99.2%</strong>.
            </motion.p>

            <motion.div {...vFadeUp(.2)} className="flex flex-wrap gap-3">
              <MagneticButton>
                <Button as={Link} to="/products" color="primary" variant="solid"
                  radius="full" size="lg" endContent={<IcoArrow size={15} />}
                  className="font-black shadow-xl shadow-blue-500/30 px-8 bg-gradient-to-br from-[#0B74E5] to-[#1E40AF] text-white">
                  Mua Sắm Ngay
                </Button>
              </MagneticButton>
              <MagneticButton>
                <Button as={Link} to="/profile" variant="bordered" color="primary"
                  radius="full" size="lg" startContent={<IcoBrain size={15} />}
                  className="font-bold border-2 border-blue-200 hover:border-blue-500">
                  Lấy Size AI Miễn Phí
                </Button>
              </MagneticButton>
            </motion.div>

            {/* Trust strip */}
            <motion.div {...vFadeUp(.26)} className="flex flex-wrap gap-6 pt-1">
              {[{ I: IcoCheck, t: "50K+ Khách hài lòng" }, { I: IcoShip, t: "Free Ship toàn quốc" }, { I: IcoRefresh, t: "Đổi trả dễ dàng" }].map(({ I, t }) => (
                <span key={t} className="flex items-center gap-1.5 text-sm text-gray-500 font-semibold">
                  <I size={14} className="text-blue-500" /> {t}
                </span>
              ))}
            </motion.div>
          </motion.div>

          {/* Right: 3D hero card */}
          <div className="relative flex items-center justify-center">
            <TiltCard intensity={10} className="relative w-full max-w-[380px] mx-auto">
              <div className="rounded-[2.5rem] overflow-hidden shadow-[0_32px_80px_-16px_rgba(11,116,229,.35)]">
                <div className="relative">
                  <motion.img src="https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=700&q=80"
                    onError={e => { e.target.onerror=null; e.target.src="https://picsum.photos/seed/herof/460/520"; }}
                    alt="Fashion hero" className="w-full h-[500px] object-cover object-top"
                    style={{ y: heroImgParY }} />
                  <div className="absolute inset-0 bg-gradient-to-t from-blue-900/50 via-transparent to-transparent" />

                  {/* AI badge */}
                  <GBadge className="absolute top-5 left-5 lp-float" style={{ "--r": "0deg" }}>
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center lp-pulse flex-shrink-0">
                        <IcoBrain size={14} className="text-white" />
                      </div>
                      <div>
                        <p className="text-[9px] text-gray-400 font-bold leading-none mb-0.5">AI Gợi Ý</p>
                        <p className="text-xs font-black text-blue-700 leading-none">Size M · Hoàn hảo</p>
                      </div>
                    </div>
                  </GBadge>

                  {/* Rating */}
                  <GBadge className="absolute top-5 right-5 lp-floatR" style={{ "--r": "-2deg" }}>
                    <div className="flex items-center gap-1.5">
                      <IcoStar size={14} className="text-amber-400" />
                      <span className="font-black text-gray-800">4.9</span>
                      <span className="text-[10px] text-gray-400">(2.1k)</span>
                    </div>
                  </GBadge>

                  {/* Price pill */}
                  <div className="absolute bottom-5 left-5 right-5">
                    <div className="lp-glass rounded-2xl px-5 py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider">Everyday Essential</p>
                          <p className="text-white font-black text-sm mt-0.5">Premium Cotton Tee</p>
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

              {/* Floating side cards */}
              <GBadge className="absolute -left-14 top-1/3 hidden lg:block lp-float" style={{ "--r": "2deg" }}>
                <div className="flex items-center gap-2 text-xs min-w-[100px]">
                  <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center flex-shrink-0">
                    <IcoFire size={13} className="text-red-500" />
                  </div>
                  <div><p className="font-black text-red-500 text-[11px]">Flash Sale</p><p className="text-gray-400 text-[10px]">-40% OFF</p></div>
                </div>
              </GBadge>

              <GBadge className="absolute -right-12 bottom-1/3 hidden lg:block lp-floatR" style={{ "--r": "-2deg" }}>
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <IcoShip size={12} className="text-blue-500" />
                  </div>
                  <div><p className="font-black text-gray-700 text-[11px]">Free Ship</p><p className="text-gray-400 text-[10px]">Toàn quốc</p></div>
                </div>
              </GBadge>
            </TiltCard>

            {/* Orbs behind card */}
            <div className="absolute -z-10 top-8 right-0 w-52 h-52 bg-violet-300/15 rounded-full blur-3xl" />
            <div className="absolute -z-10 bottom-8 left-0 w-60 h-60 bg-blue-300/12 rounded-full blur-3xl" />
          </div>
        </div>

        {/* Scroll cue */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-40 select-none pointer-events-none">
          <p className="text-[9px] font-black text-gray-400 tracking-[.2em] uppercase">Scroll</p>
          <div className="w-5 h-9 rounded-full border-2 border-gray-300 flex items-start justify-center pt-1.5">
            <motion.div className="w-1 h-2 bg-blue-500 rounded-full"
              animate={{ y: [0, 10, 0] }} transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }} />
          </div>
        </div>
      </section>

      {/* ════ §2 STATS ═════════════════════════════════════════ */}
      <section className="py-10 bg-white border-y border-gray-100/80">
        <div className="max-w-7xl mx-auto px-5 sm:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { end: 50000, suffix: "+", lbl: "Khách hàng hài lòng", unit: "K", raw: 50 },
              { end: 500,   suffix: "+", lbl: "Thương hiệu thời trang" },
              { end: 99,    suffix: ".2%", lbl: "Độ chính xác size AI" },
              { end: 24,    suffix: "/7", lbl: "Hỗ trợ khách hàng" },
            ].map(({ end, suffix, lbl, unit }, i) => (
              <motion.div key={lbl} {...vScale(i * .09)} className="group cursor-default">
                <p className="syne font-black text-4xl md:text-5xl text-blue-600 leading-none group-hover:scale-110 transition-transform duration-300">
                  <Counter end={end} suffix={suffix} />{unit && <span className="text-3xl">{unit}</span>}
                </p>
                <p className="text-xs text-gray-400 font-semibold mt-2">{lbl}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ §3 AI FEATURE ════════════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8 overflow-hidden" id="ai-fit">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* AI Demo Card */}
          <motion.div {...vFadeLeft(0)} className="flex justify-center lg:justify-start">
            <div className="relative w-full max-w-[360px]">
              {/* Orbiting dots */}
              <div className="absolute inset-0 -m-16 pointer-events-none">
                {[0, 120, 240].map((deg, i) => (
                  <div key={i} className="absolute top-1/2 left-1/2 w-3 h-3 -mt-1.5 -ml-1.5"
                    style={{ animation: `lp-orbit ${6 + i}s linear infinite`, animationDelay: `${-i * 2}s`, "--orb-r": `${130 + i * 20}px` }}>
                    <div className="w-full h-full rounded-full bg-blue-400/30" />
                  </div>
                ))}
              </div>

              <TiltCard intensity={6}>
                <div className="rounded-[2rem] overflow-hidden shadow-2xl shadow-blue-300/40"
                  style={{ background: "linear-gradient(150deg,#EFF6FF,#DBEAFE 60%,#E0E7FF)" }}>
                  <div className="p-7 space-y-5">

                    {/* Header */}
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-800 flex items-center justify-center shadow-lg lp-pulse">
                        <IcoBrain size={22} className="text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-gray-800 text-sm truncate">DFS AI Fit Engine</p>
                        <p className="text-[10px] text-gray-400">XGBoost ML · Độ chính xác 99.2%</p>
                      </div>
                      <Chip size="sm" color="success" variant="dot" className="font-black text-[9px]">LIVE</Chip>
                    </div>

                    {/* Measurements */}
                    <div>
                      <p className="text-[9px] font-black text-gray-400 uppercase tracking-[.15em] mb-2">Số đo của bạn</p>
                      <div className="grid grid-cols-2 gap-2">
                        {[["Chiều cao","175 cm"],["Cân nặng","70 kg"],["Vòng ngực","92 cm"],["Vòng eo","78 cm"]].map(([k, v]) => (
                          <motion.div key={k} whileHover={{ scale: 1.03 }}
                            className="bg-white/80 rounded-xl p-3 shadow-sm border border-blue-50 cursor-default">
                            <p className="text-[9px] text-gray-400 font-semibold">{k}</p>
                            <p className="font-black text-gray-800">{v}</p>
                          </motion.div>
                        ))}
                      </div>
                    </div>

                    {/* Scan progress */}
                    <div className="relative bg-white/80 rounded-xl p-4 overflow-hidden shadow-sm border border-blue-50">
                      <div className="lp-scan" />
                      <div className="flex justify-between mb-2">
                        <span className="text-xs font-semibold text-gray-500">Đang phân tích hồ sơ…</span>
                        <span className="text-xs font-black text-blue-600">98%</span>
                      </div>
                      <div className="h-2 bg-blue-100 rounded-full overflow-hidden">
                        <motion.div className="h-full rounded-full"
                          style={{ background: "linear-gradient(90deg,#0B74E5,#7C3AED)" }}
                          initial={{ width: 0 }} whileInView={{ width: "98%" }}
                          viewport={{ once: false }} transition={{ duration: 1.8, delay: .4, ease: "easeOut" }} />
                      </div>
                    </div>

                    {/* Size result */}
                    <div className="rounded-2xl p-5 text-white relative overflow-hidden"
                      style={{ background: "linear-gradient(135deg,#0B74E5,#1E40AF 60%,#4F46E5)" }}>
                      <div className="absolute top-0 right-0 w-24 h-24 bg-white/8 rounded-full -translate-y-1/2 translate-x-1/2" />
                      <div className="relative flex items-center justify-between">
                        <div>
                          <p className="text-white/60 text-[9px] font-bold uppercase tracking-wider mb-1">Size gợi ý</p>
                          <p className="syne font-black leading-none" style={{ fontSize: "3.5rem" }}>M</p>
                          <p className="text-white/50 text-[9px] mt-1">Tin cậy: 97.4%</p>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          {SIZES.map((sz, i) => (
                            <button key={sz} onClick={() => setActiveSz(i)}
                              className={`w-9 h-7 rounded-lg text-[11px] font-black border transition-all duration-200 ${
                                activeSz === i
                                  ? "bg-white text-blue-700 border-white scale-110 shadow-lg"
                                  : "border-white/25 text-white/50 hover:border-white/50 hover:text-white/80"
                              }`}>{sz}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TiltCard>

              {/* Check badge */}
              <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }} transition={{ delay: .6 }}
                className="absolute -bottom-6 -left-5 lp-float" style={{ "--r": "0deg" }}>
                <GBadge>
                  <div className="flex items-center gap-2">
                    <IcoCheck size={14} className="text-green-500" />
                    <span className="text-xs font-black text-gray-700 whitespace-nowrap">Không còn sai size!</span>
                  </div>
                </GBadge>
              </motion.div>

              <motion.div className="absolute -top-8 -right-8 w-24 h-24 bg-violet-300/20 rounded-full blur-2xl pointer-events-none lp-glow"
                style={{ x: orbX, y: orbY }} />
            </div>
          </motion.div>

          {/* Feature copy */}
          <div className="space-y-7">
            <motion.div {...vFadeRight(0)}>
              <Chip variant="flat" color="secondary" size="sm" startContent={<IcoSparkle size={11} />}
                className="font-black tracking-widest text-[10px] uppercase">LỢI THẾ DFS AI</Chip>
            </motion.div>

            <motion.h2 {...vFadeRight(.08)} className="syne font-black leading-tight"
              style={{ fontSize: "clamp(2rem,4.5vw,3rem)" }}>
              Gợi Ý Size Thông Minh,<br />
              <span className="lp-shimmer-txt">Không Còn Phỏng Đoán.</span>
            </motion.h2>

            <motion.p {...vFadeRight(.14)} className="text-gray-500 leading-relaxed text-[15px]">
              Mô hình XGBoost phân tích số đo cơ thể — chiều cao, cân nặng, vòng ngực, eo, hông — để gợi ý đúng size vừa vặn nhất trên mọi thương hiệu trong hệ thống.
            </motion.p>

            <div className="space-y-4">
              {[
                { icon: IcoUser,  title: "Tạo hồ sơ cơ thể",    desc: "Nhập số đo một lần — AI nhớ mãi cho mọi sản phẩm.",     bg: "#EFF6FF", c: "#0B74E5", d: .18 },
                { icon: IcoBrain, title: "AI phân tích tức thì", desc: "Model đối chiếu hồ sơ với size chart riêng từng hãng.", bg: "#F5F3FF", c: "#7C3AED", d: .24 },
                { icon: IcoCheck, title: "Mua sắm tự tin 100%",  desc: "Nhận gợi ý cá nhân hoá, độ chính xác đến 99.2%.",       bg: "#ECFDF5", c: "#059669", d: .30 },
              ].map(({ icon: Icon, title, desc, bg, c, d }) => (
                <motion.div key={title} {...vFadeRight(d)}
                  className="flex items-start gap-4 group cursor-default">
                  <motion.div whileHover={{ scale: 1.12, rotate: 5 }} transition={{ type: "spring", stiffness: 400 }}
                    className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 transition-colors duration-300"
                    style={{ background: bg }}>
                    <Icon size={20} style={{ color: c }} />
                  </motion.div>
                  <div>
                    <p className="font-black text-gray-800 mb-0.5">{title}</p>
                    <p className="text-sm text-gray-400">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </div>

            <motion.div {...vFadeRight(.36)}>
              <MagneticButton>
                <Button as={Link} to="/profile" color="primary" variant="solid" radius="full" size="lg"
                  startContent={<IcoBrain size={16} />} endContent={<IcoArrow size={14} />}
                  className="font-black shadow-lg shadow-blue-500/30 bg-gradient-to-r from-[#0B74E5] to-[#1E40AF] px-8">
                  Thử AI Sizing Miễn Phí
                </Button>
              </MagneticButton>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════ §4 BRANDS TICKER ═════════════════════════════════ */}
      <section className="py-14 bg-white border-y border-gray-100/80 overflow-hidden" id="brands">
        <motion.div {...vFadeUp()} className="text-center mb-8">
          <p className="text-[10px] font-black text-gray-300 uppercase tracking-[.2em]">
            Thương hiệu thời trang hàng đầu có trên DFS
          </p>
        </motion.div>

        <div className="overflow-hidden">
          <div className="flex lp-ticker" style={{ width: "max-content" }}>
            {tickerBrands.map((b, i) => {
              const name  = b.name  || b._id;
              const logo  = b.logo_url;
              const slug  = b.slug  || "#";
              return (
                <Link key={`${name}-${i}`} to={`/products?brand=${slug}`}
                  className="flex-shrink-0 mx-4 flex items-center gap-3 px-6 py-4 rounded-2xl border border-gray-100 hover:border-blue-200 hover:bg-blue-50/60 hover:shadow-md hover:-translate-y-1 transition-all duration-300 group min-w-[120px]">
                  {logo ? (
                    <img src={logo} alt={name} className="h-6 w-auto object-contain grayscale group-hover:grayscale-0 transition-all duration-300 max-w-[80px]"
                      onError={e => { e.target.style.display = "none"; }} />
                  ) : null}
                  <span className="syne font-black text-base text-gray-500 group-hover:text-blue-600 transition-colors whitespace-nowrap">{name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════ §5 COLLECTIONS BENTO ═════════════════════════════ */}
      <section className="relative py-28 px-5 sm:px-8 bg-gray-50/80 overflow-hidden" id="collections">
        {/* Parallax bg accent */}
        <motion.div className="absolute -top-20 -left-20 w-72 h-72 bg-blue-400/6 rounded-full blur-[100px] pointer-events-none"
          style={{ x: blobX1, y: blobY1 }} />
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-14 gap-4">
            <motion.div {...vFadeLeft(0)}>
              <Chip variant="flat" color="primary" size="sm" startContent={<IcoSparkle size={11} />}
                className="font-black tracking-widest text-[10px] uppercase mb-3">BỘ SƯU TẬP</Chip>
              <h2 className="syne font-black tracking-tight text-gray-900" style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}>
                Nổi Bật Mùa Này
              </h2>
              <p className="text-gray-400 font-semibold text-sm mt-1">Phong cách được tuyển chọn dành cho bạn</p>
            </motion.div>
            <motion.div {...vFadeRight(0)}>
              <Button as={Link} to="/products" variant="light" color="primary" endContent={<IcoArrow size={13} />} className="font-bold">
                Xem tất cả
              </Button>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-5 auto-rows-[280px] md:auto-rows-[300px]">

            {/* Men's — big card */}
            <motion.div {...vFadeLeft(0)} className="md:col-span-7 md:row-span-1 group relative overflow-hidden rounded-[2rem] cursor-pointer lp-img-zoom">
              <img src="https://images.unsplash.com/photo-1617137968427-85924c800a22?w=900&q=80"
                onError={e=>{e.target.onerror=null;e.target.src="https://picsum.photos/seed/mens/800/560";}}
                alt="Men's collection" className="absolute inset-0 w-full h-full object-cover object-top" />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/85 via-gray-900/20 to-transparent" />
              <motion.div className="absolute inset-0 flex flex-col justify-end p-9 text-white"
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }} transition={{ delay: .1 }}>
                <Chip size="sm" variant="flat" className="bg-white/15 border border-white/25 text-white/90 font-bold text-[9px] tracking-wider mb-3 w-max backdrop-blur-sm">
                  THỜI TRANG NAM
                </Chip>
                <h3 className="syne font-black text-4xl leading-tight mb-5">Urban<br />Street Edition</h3>
                <Button as={Link} to="/categories/thoi-trang-nam" variant="solid" radius="xl" size="sm"
                  endContent={<IcoArrow size={13} />}
                  className="w-max bg-white text-gray-900 font-black hover:bg-blue-600 hover:text-white transition-colors shadow-lg">
                  Mua Ngay
                </Button>
              </motion.div>
            </motion.div>

            {/* Women's */}
            <motion.div {...vFadeRight(0)} className="md:col-span-5 md:row-span-1 group relative overflow-hidden rounded-[2rem] cursor-pointer lp-img-zoom"
              style={{ background: "linear-gradient(145deg,#FAF5FF,#EDE9FE)" }}>
              <img src="https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=700&q=80"
                onError={e=>{e.target.onerror=null;e.target.src="https://picsum.photos/seed/womens/600/560";}}
                alt="Women's collection" className="absolute inset-0 w-full h-full object-cover opacity-65" />
              <div className="absolute inset-0 bg-gradient-to-t from-violet-900/75 via-transparent to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-between p-8">
                <div className="self-start lp-glass rounded-2xl p-2.5 w-max">
                  <IcoSparkle size={20} className="text-violet-600" />
                </div>
                <div className="text-white">
                  <p className="text-[9px] font-black text-violet-300 uppercase tracking-widest mb-1">Thời Trang Nữ</p>
                  <h3 className="syne font-black text-3xl leading-tight mb-4">Thanh Lịch<br />&amp; Cuốn Hút</h3>
                  <Button as={Link} to="/categories/thoi-trang-nu" variant="bordered" radius="full" size="sm"
                    className="border-white/35 text-white font-bold hover:bg-white hover:text-violet-700 transition-colors">
                    Khám phá →
                  </Button>
                </div>
              </div>
            </motion.div>

            {/* Unisex */}
            <motion.div {...vFadeUp(.1)} className="md:col-span-4 group relative overflow-hidden rounded-[2rem] cursor-pointer"
              style={{ background: "linear-gradient(145deg,#ECFDF5,#D1FAE5)" }}>
              <div className="absolute -top-10 -right-10 w-32 h-32 bg-emerald-300/20 rounded-full blur-2xl pointer-events-none lp-glow" />
              <div className="relative h-full flex flex-col justify-center items-center p-10 text-center gap-3">
                <motion.div whileHover={{ rotate: 360, scale: 1.1 }} transition={{ duration: .5 }}
                  className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center">
                  <IcoCheck size={28} className="text-emerald-600" />
                </motion.div>
                <h3 className="syne font-black text-2xl text-emerald-900">Unisex Basics</h3>
                <p className="text-sm text-emerald-700 max-w-[160px]">Phong cách tối giản cho mọi người</p>
                <Button as={Link} to="/categories/unisex" color="success" variant="solid" radius="full" size="sm"
                  className="font-black mt-1">Xem ngay →</Button>
              </div>
            </motion.div>

            {/* Flash Sale */}
            <motion.div {...vFadeUp(.15)} className="md:col-span-8 group relative overflow-hidden rounded-[2rem] cursor-pointer"
              style={{ background: "linear-gradient(135deg,#0B74E5 0%,#1E40AF 50%,#7C3AED 100%)" }}>
              <div className="absolute inset-0 lp-dots opacity-15 pointer-events-none" />
              <div className="absolute right-8 top-1/2 -translate-y-1/2 w-48 h-48 bg-white/8 rounded-full blur-3xl group-hover:scale-150 transition-transform duration-700 pointer-events-none" />

              {/* Ripple effect */}
              <div className="absolute top-1/2 left-1/4 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full border border-white/20 lp-ripple pointer-events-none" />

              <div className="relative flex flex-col sm:flex-row items-center justify-between gap-6 p-9 h-full">
                <div className="text-white">
                  <div className="flex items-center gap-2 mb-2.5">
                    <IcoFire size={16} className="text-amber-400" />
                    <span className="text-amber-400 font-black text-[11px] uppercase tracking-wider">Flash Sale — Giới Hạn</span>
                  </div>
                  <h3 className="syne font-black text-4xl leading-tight mb-2">Giảm Đến 40%<br />Thương Hiệu Top</h3>
                  <p className="text-white/55 text-sm mb-5">Nike · Adidas · Uniqlo · Levi's và nhiều hãng khác</p>
                  <Button as={Link} to="/products" variant="solid" radius="xl" size="sm"
                    endContent={<IcoArrow size={13} />}
                    className="bg-white text-blue-700 font-black hover:scale-105 active:scale-95 transition-transform shadow-xl">
                    Săn Deal Ngay
                  </Button>
                </div>

                {/* Countdown */}
                <div className="flex gap-3 flex-shrink-0">
                  {[{ v: timer.h, l: "GIỜ" }, { v: timer.m, l: "PHÚT" }, { v: timer.s, l: "GIÂY" }].map(({ v, l }) => (
                    <div key={l} className="bg-white/18 border border-white/20 backdrop-blur-sm rounded-2xl px-4 py-3.5 min-w-[60px] text-center">
                      <p className="syne font-black text-3xl text-white leading-none tabular-nums" key={v}>{v}</p>
                      <p className="text-[9px] text-white/45 font-bold mt-1">{l}</p>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ════ §6 TRENDING PRODUCTS ═════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8" id="trending">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-end mb-14 gap-4">
            <motion.div {...vFadeLeft(0)}>
              <Chip variant="flat" color="danger" size="sm" startContent={<IcoFire size={11} />}
                className="font-black tracking-widest text-[10px] uppercase mb-3">ĐANG HOT</Chip>
              <h2 className="syne font-black tracking-tight text-gray-900" style={{ fontSize: "clamp(2rem,4vw,2.8rem)" }}>
                Đang Thịnh Hành<br />
                <span className="lp-shimmer-txt">Tuần Này</span>
              </h2>
            </motion.div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {(loading ? Array(4).fill(null) : products.slice(0, 8)).map((p, i) => (
              <motion.div key={p?._id || i} {...vSlideUp(i * .07)}>
                {loading ? (
                  <Card className="rounded-[1.6rem] border-0">
                    <CardBody className="p-0">
                      <Skeleton className="aspect-[3/4] rounded-[1.6rem]" />
                      <div className="p-4 space-y-2">
                        <Skeleton className="h-4 w-3/4 rounded-lg" />
                        <Skeleton className="h-3 w-1/2 rounded-lg" />
                      </div>
                    </CardBody>
                  </Card>
                ) : (
                  <TiltCard>
                    <div className="rounded-[1.6rem] overflow-hidden bg-white border border-gray-100 shadow-[0_8px_30px_-12px_rgba(0,0,0,.1)] cursor-pointer transition-shadow duration-300 hover:shadow-[0_20px_50px_-15px_rgba(11,116,229,.2)]"
                      onClick={() => window.location.href = `/product/${p.slug || p._id}`}>
                      {/* Image */}
                      <div className="relative aspect-[3/4] overflow-hidden bg-gray-50 lp-img-zoom">
                        <img
                          src={p.images?.[0] || prodFallback(p._id)}
                          onError={handleImgError(p._id, prodFallback(p._id))}
                          alt={p.name}
                          className="w-full h-full object-cover"
                        />
                        {/* Overlays */}
                        {p.orig_price && (
                          <Chip size="sm" color="danger" variant="solid"
                            className="absolute top-3 left-3 font-black text-[9px] shadow-sm">
                            -{Math.round((1 - p.base_price / p.orig_price) * 100)}%
                          </Chip>
                        )}
                        <Chip size="sm" variant="flat"
                          className="absolute top-3 font-black text-[9px] bg-white/90 text-gray-700 shadow-sm"
                          style={{ right: p.orig_price ? undefined : undefined, left: p.orig_price ? "auto" : "12px", right: p.orig_price ? "12px" : "auto" }}>
                          {p.brand || "DFS"}
                        </Chip>

                        {/* Wishlist */}
                        <motion.button whileHover={{ scale: 1.2 }} whileTap={{ scale: .85 }}
                          onClick={e => { e.stopPropagation(); toggleWish(p._id); }}
                          className="absolute top-3 right-3 w-9 h-9 rounded-full lp-glass flex items-center justify-center shadow-md">
                          <IcoHeart size={14} className={wishlist.has(p._id) ? "text-red-500" : "text-gray-400 hover:text-red-400"} />
                        </motion.button>

                        {/* AI size badge */}
                        <div className="absolute bottom-3 left-3">
                          <Chip size="sm" color="primary" variant="flat"
                            startContent={<IcoBrain size={9} />}
                            className="font-black text-[9px] bg-white/90 backdrop-blur-sm border border-blue-100">
                            AI Size: {p.aiSize || "M"}
                          </Chip>
                        </div>

                        {/* Add to cart — slides up on hover */}
                        <div className="absolute bottom-0 left-0 right-0 p-3 translate-y-full group-hover:translate-y-0 transition-transform duration-400 ease-out"
                          style={{ transition: "transform .35s cubic-bezier(.22,1,.36,1)" }}>
                          <Button fullWidth color="primary" variant="solid" radius="lg" size="sm"
                            startContent={<IcoCart size={13} />}
                            className="font-black shadow-lg"
                            onClick={e => e.stopPropagation()}>
                            Thêm vào giỏ
                          </Button>
                        </div>
                      </div>

                      {/* Info */}
                      <div className="p-4 space-y-2">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="font-black text-gray-900 text-sm lp-line-clamp2 leading-tight">{p.name}</p>
                            <p className="text-[10px] text-gray-400 font-semibold mt-0.5">{p.brand || "DFS"}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            {p.orig_price && <p className="text-[10px] text-gray-300 line-through">{fmt(p.orig_price)}</p>}
                            <p className="font-black text-blue-600 text-base leading-tight">{fmt(p.base_price)}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Stars rating={p.rating_avg || 0} />
                          {p.rating_count > 0 && (
                            <span className="text-[10px] text-gray-400">({(p.rating_count || 0).toLocaleString()})</span>
                          )}
                          {p.sold_count > 0 && (
                            <span className="text-[10px] text-gray-400 ml-auto">Đã bán {(p.sold_count).toLocaleString()}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </TiltCard>
                )}
              </motion.div>
            ))}
          </div>

          <motion.div {...vFadeUp(.15)} className="flex justify-center mt-12">
            <MagneticButton strength={0.25}>
              <Button as={Link} to="/products" variant="bordered" color="primary" radius="full" size="lg"
                endContent={<IcoArrow size={15} />}
                className="font-black border-2 px-10 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all duration-300">
                Xem Tất Cả Sản Phẩm
              </Button>
            </MagneticButton>
          </motion.div>
        </div>
      </section>

      {/* ════ §7 HOW IT WORKS ══════════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8 bg-white" id="how-it-works">
        <div className="max-w-5xl mx-auto">
          <motion.div {...vFadeUp()} className="text-center mb-20">
            <Chip variant="flat" color="primary" size="sm" startContent={<IcoSparkle size={11} />}
              className="font-black tracking-widest text-[10px] uppercase mb-4">HƯỚNG DẪN</Chip>
            <h2 className="syne font-black tracking-tight text-gray-900" style={{ fontSize: "clamp(2rem,4.5vw,3rem)" }}>
              Bắt Đầu Chỉ <span className="lp-shimmer-txt">3 Bước Đơn Giản</span>
            </h2>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-14 left-1/3 right-1/3 h-px"
              style={{ background: "linear-gradient(90deg, #0B74E5, #7C3AED)", opacity: .35 }} />

            {[
              { n: 1, icon: IcoUser,  title: "Tạo Hồ Sơ Cơ Thể", desc: "Nhập chiều cao, cân nặng, số đo vòng ngực, eo, hông — chỉ một lần duy nhất.", bg: "#EFF6FF", c: "#0B74E5", d: 0   },
              { n: 2, icon: IcoBrain, title: "AI Phân Tích",       desc: "XGBoost đối chiếu hồ sơ với size chart riêng từng thương hiệu trong hệ thống.",  bg: "#F5F3FF", c: "#7C3AED", d: .1  },
              { n: 3, icon: IcoCheck, title: "Mua Sắm Tự Tin",     desc: "Nhận size cá nhân hoá với độ tin cậy 99.2%. Thanh toán VNPay, MoMo, PayPal, COD.",   bg: "#ECFDF5", c: "#059669", d: .2  },
            ].map(({ n, icon: Icon, title, desc, bg, c, d }) => (
              <motion.div key={n} {...vScale(d)} className="flex flex-col items-center text-center group cursor-default">
                <div className="relative mb-7">
                  <motion.div whileHover={{ scale: 1.1, y: -4 }} transition={{ type: "spring", stiffness: 380 }}
                    className="w-28 h-28 rounded-[2rem] flex items-center justify-center shadow-lg"
                    style={{ background: bg }}>
                    <Icon size={46} style={{ color: c }} />
                  </motion.div>

                  {/* Step number */}
                  <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full flex items-center justify-center font-black text-sm text-white shadow-lg"
                    style={{ background: c }}>
                    {n}
                  </div>

                  {/* Glow */}
                  <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                    style={{ boxShadow: `0 0 30px 8px ${c}25` }} />
                </div>

                <h3 className="syne font-black text-xl text-gray-900 mb-2.5">{title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed max-w-[210px]">{desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ §8 TESTIMONIALS ══════════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8" style={{ background: "linear-gradient(180deg,#f6fbff 0%,#EFF6FF 100%)" }}>
        <div className="max-w-7xl mx-auto">
          <motion.div {...vFadeUp()} className="text-center mb-20">
            <Chip variant="flat" color="warning" size="sm" startContent={<IcoStar size={11} />}
              className="font-black tracking-widest text-[10px] uppercase mb-4">ĐÁNH GIÁ</Chip>
            <h2 className="syne font-black tracking-tight text-gray-900" style={{ fontSize: "clamp(2rem,4.5vw,3rem)" }}>
              Được Khách Hàng<br /><span className="lp-shimmer-txt">Yêu Thích</span>
            </h2>
            <p className="text-gray-400 mt-4 font-semibold text-sm max-w-md mx-auto">
              Câu chuyện thực từ khách hàng đã tìm được size hoàn hảo với DFS
            </p>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-7">
            {TESTIMONIALS.map(({ name, role, text, rating, avatar, accent }, i) => (
              <motion.div key={name} {...vScale(i * .12)}
                className={i === 1 ? "lg:translate-y-8" : ""}>
                <motion.div whileHover={{ y: -8, boxShadow: `0 30px 60px -15px ${accent}25` }}
                  transition={{ type: "spring", stiffness: 300 }}
                  className="h-full lp-glass rounded-[2rem] p-9 shadow-sm border border-white/75 flex flex-col gap-5">

                  {/* Quote icon */}
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                    style={{ background: accent + "18" }}>
                    <IcoQuote size={18} style={{ color: accent }} />
                  </div>

                  {/* Stars */}
                  <Stars rating={rating} size={14} />

                  {/* Text */}
                  <p className="text-gray-600 leading-relaxed italic text-[15px] flex-1">"{text}"</p>

                  {/* Author */}
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-100/80">
                    <Avatar src={avatar} fallback={<IcoUser size={16} className="text-gray-400" />}
                      className="w-11 h-11 flex-shrink-0 ring-2 ring-offset-2" style={{ ringColor: accent }} />
                    <div>
                      <p className="font-black text-gray-900 text-sm">{name}</p>
                      <p className="text-xs text-gray-400">{role}</p>
                    </div>
                    <div className="ml-auto w-8 h-8 rounded-xl flex items-center justify-center"
                      style={{ background: accent + "15" }}>
                      <IcoCheck size={14} style={{ color: accent }} />
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ════ §9 NEWSLETTER CTA ════════════════════════════════ */}
      <section className="py-28 px-5 sm:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div {...vScale(0)} className="relative rounded-[2.5rem] overflow-hidden p-14 sm:p-20 text-center"
            style={{ background: "linear-gradient(135deg,#0B74E5 0%,#1E40AF 45%,#7C3AED 100%)" }}>

            {/* BG layers */}
            <div className="absolute inset-0 lp-dots opacity-10 pointer-events-none" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-violet-500/20 rounded-full translate-y-1/2 -translate-x-1/3 blur-3xl pointer-events-none" />

            {/* Floating glass badges */}
            {[
              { icon: IcoFire, text: "10% OFF", sub: "Đơn đầu tiên", side: "left", delay: 0 },
              { icon: IcoShip, text: "Free Ship", sub: "Toàn quốc",   side: "right", delay: .5 },
            ].map(({ icon: Icon, text, sub, side, delay }) => (
              <motion.div key={text}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }} transition={{ delay }}
                className={`absolute top-8 ${side === "left" ? "left-8" : "right-8"} hidden lg:block lp-float`}
                style={{ "--r": "0deg" }}>
                <GBadge>
                  <div className="flex items-center gap-2">
                    <Icon size={13} className={side === "left" ? "text-amber-500" : "text-blue-500"} />
                    <div><p className="text-xs font-black text-gray-700">{text}</p><p className="text-[9px] text-gray-400">{sub}</p></div>
                  </div>
                </GBadge>
              </motion.div>
            ))}

            {/* Content */}
            <div className="relative z-10 max-w-xl mx-auto space-y-7">
              <Chip variant="flat" className="bg-white/20 text-white font-black text-[10px] tracking-[.15em] uppercase">
                CỘNG ĐỒNG DFS
              </Chip>

              <h2 className="syne font-black text-white leading-tight tracking-tight"
                style={{ fontSize: "clamp(2rem,5vw,3.2rem)" }}>
                Size Hoàn Hảo<br />Đang Chờ Bạn!
              </h2>

              <p className="text-white/65 text-[15px]">
                Đăng ký nhận ưu đãi sớm, mã giảm giá độc quyền và{" "}
                <strong className="text-white">10% off</strong> đơn hàng đầu tiên.
              </p>

              <AnimatePresence mode="wait">
                {subscribed ? (
                  <motion.div key="ok"
                    initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="flex items-center justify-center gap-3 bg-white/20 rounded-2xl py-4 px-6 backdrop-blur-sm">
                    <IcoCheck size={20} className="text-green-300" />
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
                        input: "text-white placeholder:text-white/45 font-semibold",
                        inputWrapper: "border-white/30 bg-white/15 hover:border-white/55 data-[focused=true]:border-white backdrop-blur-sm",
                      }}
                    />
                    <Button type="submit" variant="solid" radius="full" size="lg"
                      className="bg-white text-blue-700 font-black flex-shrink-0 shadow-xl hover:bg-blue-50 hover:scale-105 active:scale-95 transition-all">
                      Đăng Ký →
                    </Button>
                  </motion.form>
                )}
              </AnimatePresence>

              <p className="text-white/30 text-[11px]">Không spam. Hủy đăng ký bất cứ lúc nào.</p>
            </div>
          </motion.div>
        </div>
      </section>

    </div>
  );
}
