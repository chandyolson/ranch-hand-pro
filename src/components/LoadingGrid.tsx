import React from "react";
import { Skeleton } from "@/components/ui/skeleton";

interface LoadingGridProps {
  count?: number;
  columns?: 1 | 2;
  height?: number;
}

/**
 * Skeleton placeholder grid shown while a list screen is loading.
 */
const LoadingGrid: React.FC<LoadingGridProps> = ({
  count = 6,
  columns = 2,
  height = 72,
}) => (
  <div className={`grid gap-2 ${columns === 2 ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1"}`}>
    {Array.from({ length: count }).map((_, i) => (
      <Skeleton
        key={i}
        className="rounded-xl"
        style={{ height, backgroundColor: "rgba(14,38,70,0.15)" }}
      />
    ))}
  </div>
);

export default LoadingGrid;
