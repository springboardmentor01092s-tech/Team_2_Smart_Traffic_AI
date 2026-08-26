import React, { useEffect, useRef, useState } from "react";
import Layout from "../components/Layout";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function Profile() {
  const { user, setUser } = useAuth();

  const fileInputRef = useRef(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    department: "",
    avatarUrl: "",
  });

  const [pwForm, setPwForm] = useState({
    currentPassword: "",
    newPassword: "",
  });

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        phone: user.phone || "",
        department: user.department || "",
        avatarUrl: user.avatarUrl || "",
      });
    }
  }, [user]);

  // ==========================
  // Upload Profile Photo
  // ==========================

  const handlePhoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onloadend = () => {
      setForm((prev) => ({
        ...prev,
        avatarUrl: reader.result,
      }));
    };

    reader.readAsDataURL(file);
  };

  // ==========================
  // Save All
  // ==========================

  const saveAll = async () => {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      // Save profile
      const { data } = await api.put("/profile", {
        name: form.name,
        phone: form.phone,
        department: form.department,
        avatarUrl: form.avatarUrl,
      });

      setUser(data);

      // Change password ONLY if entered
      if (
        pwForm.currentPassword.trim() !== "" &&
        pwForm.newPassword.trim() !== ""
      ) {
        await api.post("/auth/change-password", {
          currentPassword: pwForm.currentPassword,
          newPassword: pwForm.newPassword,
        });

        setPwForm({
          currentPassword: "",
          newPassword: "",
        });
      }

      setMessage("Profile updated successfully.");
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not save profile."
      );
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const avatar =
    form.avatarUrl ||
    user.avatarUrl ||
    null;

  return (
    <Layout
      title="Profile"
      subtitle="Your account summary and activity"
    >
      <div className="grid md:grid-cols-3 gap-6">
        {/* LEFT CARD */}

        <div className="card text-center md:col-span-1">
          {avatar ? (
            <img
              src={avatar}
              alt="Profile"
              className="w-24 h-24 rounded-full object-cover border-4 border-indigo-500 mx-auto mb-3"
            />
          ) : (
            <div className="w-24 h-24 rounded-full bg-accent flex items-center justify-center text-3xl font-bold mx-auto mb-3">
              {user.name?.charAt(0)}
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhoto}
          />

          <button
            className="btn-primary text-sm px-4 py-2 mb-5"
            onClick={() =>
              fileInputRef.current?.click()
            }
          >
            Upload Photo
          </button>

          <h2 className="text-2xl font-bold text-white">
            {form.name || user.name}
          </h2>

          <p className="text-slate-400 capitalize mb-6">
            {user.role.replace("_", " ")}
          </p>

          <div className="text-left space-y-3 text-sm">
            <div className="flex items-center gap-2 text-slate-300">
              📧 {user.email}
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              📞 {form.phone || "Not Added"}
            </div>

            <div className="flex items-center gap-2 text-slate-300">
              📍 {user.assignedArea || "All Locations"}
            </div>
          </div>
        </div>

        {/* RIGHT SIDE */}

        <div className="md:col-span-2 space-y-5">
          {message && (
            <div className="rounded-lg border border-green-500 bg-green-500/10 px-4 py-3 text-green-400">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500 bg-red-500/10 px-4 py-3 text-red-400">
              {error}
            </div>
          )}

          {/* UPDATE PROFILE */}

          <div className="card space-y-4">
            <h3 className="text-xl font-semibold text-white">
              Update Profile
            </h3>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Name
              </label>

              <input
                className="input w-full"
                value={form.name}
                placeholder="Enter your name"
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Phone Number
              </label>

              <input
                className="input w-full"
                value={form.phone}
                placeholder="Enter phone number"
                onChange={(e) =>
                  setForm({
                    ...form,
                    phone: e.target.value,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Department
              </label>

              <input
                className="input w-full"
                value={form.department}
                placeholder="Traffic Department"
                onChange={(e) =>
                  setForm({
                    ...form,
                    department: e.target.value,
                  })
                }
              />
            </div>
          </div>

          {/* CHANGE PASSWORD */}

          <div className="card space-y-4">
            <h3 className="text-xl font-semibold text-white">
              Change Password
            </h3>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Current Password
              </label>

              <div className="relative">
                <input
                  type={
                    showCurrent
                      ? "text"
                      : "password"
                  }
                  className="input w-full pr-12"
                  placeholder="Current Password"
                  value={pwForm.currentPassword}
                  onChange={(e) =>
                    setPwForm({
                      ...pwForm,
                      currentPassword:
                        e.target.value,
                    })
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowCurrent(
                      !showCurrent
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showCurrent
                    ? "🙈"
                    : "👁️"}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                New Password
              </label>

              <div className="relative">
                <input
                  type={
                    showNew
                      ? "text"
                      : "password"
                  }
                  className="input w-full pr-12"
                  placeholder="Minimum 8 characters"
                  value={pwForm.newPassword}
                  onChange={(e) =>
                    setPwForm({
                      ...pwForm,
                      newPassword:
                        e.target.value,
                    })
                  }
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowNew(!showNew)
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
                >
                  {showNew ? "🙈" : "👁️"}
                </button>
              </div>
            </div>

            <p className="text-xs text-slate-500">
              Leave these fields empty if you
              don't want to change your
              password.
            </p>
          </div>

          {/* SAVE ALL */}

          <div className="flex justify-end">
            <button
              onClick={saveAll}
              disabled={saving}
              className="btn-primary px-8 py-2"
            >
              {saving
                ? "Saving..."
                : "Save All"}
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

