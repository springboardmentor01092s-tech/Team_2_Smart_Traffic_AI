import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [role, setRole] = useState("traffic_operator");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await api.post("/auth/register", {
        name,
        email,
        password,
        role,
      });

      setSuccess("Account created successfully! Redirecting to Login...");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || "Unable to create account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#08111f] flex items-center justify-center px-4">
      <div className="w-full max-w-md bg-[#101b2d] border border-slate-700 rounded-2xl p-8 shadow-2xl">

        {/* Icon */}
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 rounded-full bg-blue-600/20 flex items-center justify-center text-3xl">
            👤
          </div>
        </div>

        {/* Heading */}
        <h2 className="text-3xl font-bold text-white text-center">
          Create Account
        </h2>

        <p className="text-center text-slate-400 text-sm mt-2 mb-6">
          Register a new TrafficVision AI account
        </p>

        {/* Role */}
        <p className="text-sm text-slate-300 mb-2 font-medium">
          Select Role
        </p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setRole("admin")}
            className={`rounded-xl border p-3 transition ${
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
            className={`rounded-xl border p-3 transition ${
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Name */}
          <input
            type="text"
            required
            placeholder="Enter your full name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl bg-[#162235] border border-slate-700 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
          />

          {/* Email */}
          <input
            type="email"
            required
            placeholder="Enter your email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl bg-[#162235] border border-slate-700 px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
          />

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="Create new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-[#162235] border border-slate-700 px-4 py-3 pr-12 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />

            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-lg"
            >
              {showPassword ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              required
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-xl bg-[#162235] border border-slate-700 px-4 py-3 pr-12 text-white placeholder:text-slate-500 outline-none focus:border-blue-500"
            />

            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-lg"
            >
              {showConfirm ? "🙈" : "👁️"}
            </button>
          </div>

          {/* Messages */}
          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          {success && (
            <p className="text-green-400 text-sm">{success}</p>
          )}

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 rounded-xl py-3 text-white font-semibold transition disabled:opacity-60"
          >
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        {/* Back */}
        <div className="text-center mt-6">
          <Link
            to="/login"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

