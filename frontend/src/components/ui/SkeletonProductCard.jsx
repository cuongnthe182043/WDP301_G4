import React from "react";
import { Skeleton } from "@heroui/react";

export default function SkeletonProductCard() {
  return (
    <div className="rounded-2xl overflow-hidden border border-default-100 bg-white shadow-sm">
      {/* Image placeholder */}
      <Skeleton className="aspect-square w-full" />
      {/* Text placeholders */}
      <div className="p-3 space-y-2">
        <Skeleton className="h-3.5 w-4/5 rounded-lg" />
        <Skeleton className="h-3 w-3/5 rounded-lg" />
        <Skeleton className="h-3.5 w-2/5 rounded-lg" />
      </div>
    </div>
  );
}
