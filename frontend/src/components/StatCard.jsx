import React from "react";

export default function StatCard({ label, value, delta, icon, tone = "default" }) {
  const toneClasses = {
    default: "text-accent-light bg-accent/10",
    green: "text-green-400 bg-green-500/10",
    amber: "text-amber-400 bg-amber-500/10",
    red: "text-red-400 bg-red-500/10",
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg ${toneClasses[tone]}`}>
        {icon}
      </div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xl font-semibold text-slate-100">{value}</p>
        {delta && <p className="text-[11px] text-slate-500">{delta}</p>}
      </div>
    </div>
  );
}
