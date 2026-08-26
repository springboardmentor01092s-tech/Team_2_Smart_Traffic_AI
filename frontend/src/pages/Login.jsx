
import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [role, setRole] = useState("traffic_operator");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const apiRole = role === "admin" ? "admin" : undefined;
      await login(email.trim(), password, apiRole);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08111f] flex items-center justify-center px-4 py-6">
      <div className="w-full max-w-5xl grid md:grid-cols-2 bg-[#0b1628] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl">

        {/* LEFT PANEL */}
        <div
          className="hidden md:flex flex-col justify-between p-8 relative bg-cover bg-center"
          style={{ backgroundImage: "url('/traffic-city.jpg')" }}
        >
          <div className="absolute inset-0 bg-[#071224]/80"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-11 h-11 rounded-xl bg-blue-600 flex items-center justify-center text-xl">
                🚦
              </div>

              <div>
                <h2 className="text-xl font-bold text-white">
                  TrafficVision AI
                </h2>
                <p className="text-xs text-slate-300">
                  Smart Traffic Management System
                </p>
              </div>
            </div>

            <h1 className="text-3xl font-bold text-white leading-tight mb-8">
              AI Powered Traffic Intelligence for Smarter Cities
            </h1>

            <div className="space-y-5">
              {[
                ["📈", "Real-time Monitoring", "Monitor traffic in real-time with live data and alerts."],
                ["🧠", "AI Prediction", "Predict congestion and optimize traffic flow using AI."],
                ["🧭", "Smart Routing", "Find the best routes and reduce travel time."],
                ["🔔", "Instant Alerts", "Get notified about incidents, accidents and roadblocks."],
              ].map(([icon, title, desc]) => (
                <div key={title} className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-lg">
                    {icon}
                  </div>

                  <div>
                    <p className="text-white font-semibold">{title}</p>
                    <p className="text-sm text-slate-300">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="relative z-10 text-xs text-slate-300">
            © 2026 TrafficVision AI. All rights reserved.
          </p>
        </div>

        {/* RIGHT PANEL */}
        <div className="bg-[#101b2d] p-8 md:p-10 flex flex-col justify-center">

          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 rounded-full bg-blue-600/20 flex items-center justify-center text-3xl">
              🔒
            </div>
          </div>

          <h2 className="text-3xl font-bold text-white text-center">
            Welcome Back!
          </h2>

          <p className="text-center text-slate-400 mt-2 mb-8">
            Sign in to continue to TrafficVision AI
          </p>

          {/* ROLE */}
          <p className="text-sm text-slate-300 mb-2 font-medium">
            Select Role
          </p>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <button
              type="button"
              onClick={() => setRole("admin")}
              className={`rounded-xl border p-3 text-left transition ${
                role === "admin"
                  ? "border-blue-500 bg-blue-600/20"
                  : "border-slate-700 bg-[#162235]"
              }`}
            >
              <p className="text-white font-semibold text-sm">Admin</p>
              <p className="text-xs text-slate-400">Full Access</p>
            </button>

            <button
              type="button"
              onClick={() => setRole("traffic_operator")}
              className={`rounded-xl border p-3 text-left transition ${
                role === "traffic_operator"
                  ? "border-blue-500 bg-blue-600/20"
                  : "border-slate-700 bg-[#162235]"
              }`}
            >
              <p className="text-white font-semibold text-sm">
                Traffic Operator
              </p>
              <p className="text-xs text-slate-400">Limited Access</p>
            </button>
          </div>

          {/* LOGIN FORM */}
          <form onSubmit={submit} className="space-y-4">

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Email Address
              </label>

              <input
                type="email"
                required
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl bg-[#162235] border border-slate-700 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-300 mb-1">
                Password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl bg-[#162235] border border-slate-700 px-4 py-3 pr-16 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-slate-400 hover:text-white"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            {/* Remember + Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="w-4 h-4 accent-blue-600 mr-2"
                />
                Remember Me
              </label>

              <Link
                to="/forgot-password"
                className="text-sm text-blue-400 hover:text-blue-300"
              >
                Forgot Password?
              </Link>
            </div>

            {error && (
              <p className="text-sm text-red-400">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 transition rounded-xl py-3 text-white font-semibold disabled:opacity-60"
            >
              {loading ? "Signing In..." : "Login Securely"}
            </button>
          </form>

          <div className="mt-8 text-center text-xs text-slate-500">
            Your data is protected with secure authentication
          </div>
        </div>
      </div>
    </div>
  );
}

