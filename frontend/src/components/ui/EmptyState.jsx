import React from "react";
import { motion } from "framer-motion";
import { Button } from "@heroui/react";

/**
 * EmptyState — animated empty state with floating icon.
 * @param {React.ComponentType} icon - Lucide icon component
 * @param {string} title
 * @param {string} description
 * @param {string} actionLabel - CTA button text
 * @param {function} onAction - CTA callback
 */
export default function EmptyState({ icon: Icon, title, description, actionLabel, onAction }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      className="flex flex-col items-center justify-center py-24 text-center px-4"
    >
      {Icon && (
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeInOut" }}
          className="mb-6"
        >
          <div className="w-24 h-24 rounded-3xl bg-default-100 flex items-center justify-center mx-auto">
            <Icon size={44} className="text-default-300" strokeWidth={1.5} />
          </div>
        </motion.div>
      )}
      <h3 className="text-lg font-bold text-default-700 mb-2">{title}</h3>
      {description && (
        <p className="text-sm text-default-400 max-w-sm leading-relaxed mb-6">{description}</p>
      )}
      {actionLabel && onAction && (
        <Button
          color="primary"
          radius="full"
          onPress={onAction}
          className="px-8 font-semibold shadow-md"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
