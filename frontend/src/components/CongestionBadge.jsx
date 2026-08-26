import React from "react";

export default function CongestionBadge({ level }) {
  const map = {
    low: "badge-low",
    moderate: "badge-moderate",
    heavy: "badge-heavy",
  };
  const label = { low: "Low", moderate: "Moderate", heavy: "Heavy" }[level] || level;
  return <span className={`badge ${map[level] || "badge-inactive"}`}>{label}</span>;
}
