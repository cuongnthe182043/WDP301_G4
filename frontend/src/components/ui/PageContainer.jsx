import React from "react";
import { motion } from "framer-motion";

const pageVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.78, ease: [0.22, 1, 0.36, 1] },
  },
};

/**
 * PageContainer — animated page wrapper with fade+slide-up entrance.
 * @param {string} className - additional Tailwind classes
 * @param {boolean} wide - uses max-w-7xl (default) vs max-w-5xl
 */
export default function PageContainer({ children, className = "", wide = true }) {
  const maxW = wide ? "max-w-7xl" : "max-w-5xl";
  return (
    <motion.div
      initial="hidden"
      animate="show"
      variants={pageVariants}
      className={`${maxW} mx-auto px-4 sm:px-6 py-8 ${className}`}
    >
      {children}
    </motion.div>
  );
}
