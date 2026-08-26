import React from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

import Sidebar from "./Sidebar";
import Header from "./Header";

export default function Layout({
  title,
  subtitle,
  children,
}) {
  const { user } = useAuth();

  const { theme } = useTheme();

  const isDark = theme === "dark";

  return (
    <div
      className={`flex min-h-screen transition-colors duration-300 ${
        isDark
          ? "bg-slate-950 text-white"
          : "bg-slate-100 text-slate-900"
      }`}
    >
      <Sidebar user={user} />

      <div className="flex-1 min-w-0">
        <Header title={title} subtitle={subtitle} />

        <main
          className={`p-6 transition-colors duration-300 ${
            isDark
              ? "bg-slate-950"
              : "bg-slate-100"
          }`}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

