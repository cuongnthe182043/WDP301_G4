import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";

/**
 * SectionTitle — consistent section header with optional "View All" link and right node.
 * @param {string} title
 * @param {string} viewAllHref - router path for "view all" link
 * @param {React.ReactNode} rightNode - extra right-side content (e.g. Countdown)
 */
export default function SectionTitle({ title, viewAllHref, rightNode }) {
  return (
    <div className="flex items-center justify-between mb-5">
      <h2 className="text-xl font-black text-default-900 tracking-tight">{title}</h2>
      <div className="flex items-center gap-3">
        {rightNode}
        {viewAllHref && (
          <Link
            to={viewAllHref}
            className="flex items-center gap-0.5 text-sm font-semibold text-primary hover:opacity-75 transition-opacity"
          >
            Xem tất cả <ChevronRight size={15} />
          </Link>
        )}
      </div>
    </div>
  );
}
