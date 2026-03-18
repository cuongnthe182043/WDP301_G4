// components/home/FeatureBadge.jsx — Trust / feature badge card
import React from "react";
import { motion } from "framer-motion";

/**
 * FeatureBadge
 *
 * Reusable trust-badge card used in the homepage feature strip.
 *
 * Props:
 *   icon        — React component (e.g. FiTruck from react-icons)
 *   title       — bold label (e.g. "Miễn phí vận chuyển")
 *   description — small sub-text (e.g. "Đơn hàng từ 299K")
 *   gradient    — Tailwind bg-gradient classes (e.g. "from-blue-50 to-blue-100")
 *   border      — Tailwind border-color class (e.g. "border-blue-200")
 *   iconBg      — Tailwind bg class for the icon circle (e.g. "bg-blue-500")
 */
export default function FeatureBadge({ icon: Icon, title, description, gradient, border, iconBg }) {
  return (
    <motion.div
      whileHover={{ y: -5, scale: 1.03 }}
      transition={{ type: "spring", stiffness: 400, damping: 24 }}
      className={`
        group relative flex flex-col items-center text-center gap-2.5 p-4 rounded-2xl
        border ${border || "border-gray-100"}
        bg-gradient-to-br ${gradient || "from-white to-gray-50"}
        shadow-sm hover:shadow-md cursor-default
        transition-shadow duration-300 overflow-hidden select-none
      `}
    >
      {/* Decorative blurred circle — top-right accent */}
      <div className="absolute -top-5 -right-5 w-16 h-16 rounded-full bg-white/40 blur-2xl pointer-events-none" />

      {/* Icon circle */}
      <div
        className={`
          relative w-12 h-12 rounded-2xl ${iconBg || "bg-blue-500"}
          flex items-center justify-center shadow-md flex-shrink-0
          transition-transform duration-300 group-hover:scale-110
        `}
      >
        {Icon && <Icon size={22} className="text-white" />}
      </div>

      {/* Text */}
      <div className="relative z-10">
        <p className="text-[12.5px] font-black text-gray-800 leading-tight">{title}</p>
        {description && (
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">{description}</p>
        )}
      </div>
    </motion.div>
  );
}
