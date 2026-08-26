import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import api from "../services/api";

export default function SystemSettings() {
  const { logout } = useAuth();
  const { theme, setTheme } = useTheme();

  const [settings, setSettings] = useState(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // ======================================================
  // LOAD SETTINGS
  // ======================================================

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { data } = await api.get("/settings/user");

        const savedTheme =
          data.theme ||
          localStorage.getItem("theme") ||
          "dark";

        setSettings({
          ...data,
          theme: savedTheme,
        });

        setTheme(savedTheme);
      } catch {
        setError("Could not load settings.");
      }
    };

    loadSettings();
  }, [setTheme]);

  // ======================================================
  // UPDATE FIELD
  // ======================================================

  const update = (field) => (e) => {
    const value =
      e.target.type === "checkbox"
        ? e.target.checked
        : e.target.value;

    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));

    setSaved(false);

    // Apply theme immediately
    if (field === "theme") {
      setTheme(value);
      localStorage.setItem("theme", value);
    }
  };

  // ======================================================
  // SAVE SETTINGS
  // ======================================================

  const save = async () => {
    try {
      setSaving(true);
      setError("");

      const { data } = await api.put(
        "/settings/user",
        settings
      );

      setSettings(data);

      setTheme(data.theme);
      localStorage.setItem("theme", data.theme);

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 2500);
    } catch {
      setError("Could not save settings.");
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // TOGGLE SWITCH
  // ======================================================

  const Toggle = ({ field, label }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-700 last:border-none">
      <span className="text-sm text-slate-300">
        {label}
      </span>

      <button
        type="button"
        onClick={() => {
          setSettings((prev) => ({
            ...prev,
            [field]: !prev[field],
          }));
          setSaved(false);
        }}
        className={`w-11 h-6 rounded-full relative transition-all ${
          settings[field]
            ? "bg-blue-600"
            : "bg-slate-600"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
            settings[field]
              ? "translate-x-5"
              : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );

  if (!settings) {
    return (
      <Layout title="System Settings">
        <p className="text-sm text-slate-500">
          Loading settings...
        </p>
      </Layout>
    );
  }

  return (
    <Layout
      title="System Settings"
      subtitle="Configure account, notification and application preferences"
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* ================= GENERAL ================= */}

        <div className="card">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            General
          </h3>

          <label className="block text-xs text-slate-500 mb-1">
            Theme
          </label>

          <select
            className="input w-full mb-4"
            value={settings.theme}
            onChange={update("theme")}
          >
            <option value="dark">Dark</option>
            <option value="light">Light</option>
          </select>

          <label className="block text-xs text-slate-500 mb-1">
            Language
          </label>

          <select
            className="input w-full"
            value={settings.language}
            onChange={update("language")}
          >
            <option value="en">
              English
            </option>
            <option value="hi">Hindi</option>
            <option value="kn">
              Kannada
            </option>
          </select>
        </div>

        {/* ============== NOTIFICATIONS ============== */}

        <div className="card">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Notifications
          </h3>

          <Toggle
            field="emailNotifications"
            label="Email Notifications"
          />

          <Toggle
            field="smsAlerts"
            label="SMS Alerts"
          />

          <Toggle
            field="pushNotifications"
            label="Push Notifications"
          />
        </div>

        {/* ============== MAP PREFERENCES ============== */}

        <div className="card md:col-span-2">
          <h3 className="text-lg font-semibold text-slate-100 mb-4">
            Map Preferences
          </h3>

          <label className="block text-xs text-slate-500 mb-1">
            Live Traffic Provider
          </label>

          <select
            className="input w-full md:w-72"
            value={settings.mapProvider}
            onChange={update("mapProvider")}
          >
            <option value="tomtom">
              TomTom
            </option>
          </select>
        </div>
      </div>

      {/* ================= BUTTONS ================= */}

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          className="btn-primary"
          onClick={save}
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save Changes"}
        </button>

        <button
          className="btn-secondary"
          onClick={logout}
        >
          Logout
        </button>

        {saved && (
          <span className="text-sm text-green-400">
            ✓ Settings saved successfully
          </span>
        )}
      </div>
    </Layout>
  );
}

