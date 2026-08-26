import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import socket from "../services/socket";

// ==========================================================
// ALERT TYPES
// ==========================================================

const TYPES = [
  { value: "all", label: "All Types" },
  { value: "congestion", label: "Congestion" },
  { value: "accident", label: "Accident" },
  { value: "route_delay", label: "Route Delay" },
  { value: "emergency", label: "Emergency" },
];

const SEVERITIES = [
  "all",
  "low",
  "medium",
  "high",
  "critical",
];

// ==========================================================
// ROLES ALLOWED TO MANAGE ALERTS
// ==========================================================

const ALERT_MANAGEMENT_ROLES = [
  "super_admin",
  "superadmin",
  "admin",
  "traffic_operator",
  "traffic operator",
];

// ==========================================================
// NORMALIZE ROLE
// ==========================================================

const normalizeRole = (role) => {
  if (!role) return "";

  return String(role)
    .trim()
    .toLowerCase()
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
};

// ==========================================================
// MAIN COMPONENT
// ==========================================================

export default function Alerts() {
  const { user } = useAuth();

  const [alerts, setAlerts] = useState([]);
  const [counts, setCounts] = useState({});

  const [type, setType] = useState("all");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");

  const [showCreate, setShowCreate] = useState(false);
  const [expandedAlert, setExpandedAlert] = useState(null);

  const [locationResults, setLocationResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);

  const [preview, setPreview] = useState("");

  // ==========================================================
  // FULL SCREEN IMAGE
  // ==========================================================

  const [fullScreenImage, setFullScreenImage] = useState(null);

  // ==========================================================
  // REAL-TIME PEAK CONGESTION POPUP
  // ==========================================================

  const [trafficPopup, setTrafficPopup] = useState(null);

  const [form, setForm] = useState({
    type: "congestion",
    severity: "medium",
    title: "",
    message: "",
    location: "",
    image: null,
  });

  const [error, setError] = useState("");

  // ==========================================================
  // USER ROLE
  // ==========================================================

  const userRole = normalizeRole(
    user?.role ||
      user?.userRole ||
      user?.role_name
  );

  const canManageAlerts =
    ALERT_MANAGEMENT_ROLES.includes(userRole);

  // ==========================================================
  // LOAD ALERTS
  // ==========================================================

  const load = () => {
    api
      .get("/alerts", {
        params: {
          type,
          severity,
          status,
        },
      })
      .then(({ data }) => {
        setAlerts(data.items || []);
        setCounts(data.counts || {});
      })
      .catch(() => {
        setError("Could not load alerts.");
      });
  };

  useEffect(() => {
    load();
  }, [type, severity, status]);

  // ==========================================================
  // REAL-TIME SOCKET.IO PEAK CONGESTION LISTENER
  // ==========================================================

  useEffect(() => {
    const handleNewNotification = (notification) => {
      console.log(
        "Real-time traffic notification:",
        notification
      );

      if (!notification) return;

      const trafficLevel = String(
        notification.trafficLevel || ""
      ).toLowerCase();

      const severity = String(
        notification.severity || ""
      ).toLowerCase();

      // ------------------------------------------------------
      // SHOW POPUP ONLY FOR HIGH / HEAVY / CRITICAL TRAFFIC
      // ------------------------------------------------------

      const isPeakCongestion =
        trafficLevel === "heavy" ||
        trafficLevel === "high" ||
        severity === "critical" ||
        severity === "high";

      if (!isPeakCongestion) {
        return;
      }

      // ------------------------------------------------------
      // CREATE POPUP DATA
      // ------------------------------------------------------

      const popup = {
        id:
          notification.id ||
          Date.now(),

        title:
          notification.title ||
          "Peak Traffic Congestion",

        message:
          notification.message ||
          "High traffic congestion detected.",

        road:
          notification.road ||
          notification.location ||
          "Unknown road",

        trafficLevel:
          trafficLevel || "heavy",

        severity:
          severity || "critical",

        averageSpeed:
          notification.averageSpeed ?? null,

        congestionPercent:
          notification.congestionPercent ?? null,

        time:
          notification.time ||
          new Date().toLocaleTimeString(),
      };

      setTrafficPopup(popup);

      // ------------------------------------------------------
      // AUTO HIDE AFTER 6 SECONDS
      // ------------------------------------------------------

      setTimeout(() => {
        setTrafficPopup((current) => {
          if (
            current &&
            current.id === popup.id
          ) {
            return null;
          }

          return current;
        });
      }, 6000);

      // ------------------------------------------------------
      // REFRESH ALERT LIST
      // ------------------------------------------------------

      load();
    };

    socket.on(
      "new_notification",
      handleNewNotification
    );

    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    return () => {
      socket.off(
        "new_notification",
        handleNewNotification
      );
    };
  }, [type, severity, status]);

  // ==========================================================
  // LOCATION AUTOCOMPLETE
  // ==========================================================

  const searchLocation = async (text) => {
    setForm((prev) => ({
      ...prev,
      location: text,
    }));

    if (text.trim().length < 2) {
      setLocationResults([]);
      setShowDropdown(false);
      return;
    }

    try {
      const { data } = await api.get(
        "/traffic/search",
        {
          params: {
            q: text,
          },
        }
      );

      setLocationResults(
        data.results || []
      );

      setShowDropdown(true);
    } catch (err) {
      console.log(err);
    }
  };

  // ==========================================================
  // IMAGE UPLOAD
  // ==========================================================

  const handleImage = (e) => {
    const file = e.target.files[0];

    if (!file) return;

    setForm((prev) => ({
      ...prev,
      image: file,
    }));

    setPreview(
      URL.createObjectURL(file)
    );
  };

  // ==========================================================
  // CREATE ALERT
  // ==========================================================

  const createAlert = async (e) => {
    e.preventDefault();
    setError("");

    if (!canManageAlerts) {
      setError(
        "You do not have permission to create alerts."
      );
      return;
    }

    try {
      const payload = new FormData();

      payload.append(
        "type",
        form.type
      );

      payload.append(
        "severity",
        form.severity
      );

      payload.append(
        "title",
        form.title
      );

      payload.append(
        "message",
        form.message
      );

      payload.append(
        "location",
        form.location
      );

      if (form.image) {
        payload.append(
          "image",
          form.image
        );
      }

      await api.post(
        "/alerts",
        payload,
        {
          headers: {
            "Content-Type":
              "multipart/form-data",
          },
        }
      );

      setShowCreate(false);

      setForm({
        type: "congestion",
        severity: "medium",
        title: "",
        message: "",
        location: "",
        image: null,
      });

      setPreview("");
      setLocationResults([]);
      setShowDropdown(false);

      load();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not create alert."
      );
    }
  };

  // ==========================================================
  // ALERT ACTIONS
  // ==========================================================

  const act = async (id, action) => {
    if (!canManageAlerts) {
      setError(
        "You do not have permission to manage alerts."
      );
      return;
    }

    try {
      if (action === "read") {
        await api.patch(
          `/alerts/${id}/read`
        );
      }

      if (action === "resolve") {
        await api.patch(
          `/alerts/${id}/resolve`
        );
      }

      if (action === "delete") {
        await api.delete(
          `/alerts/${id}`
        );
      }

      load();
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Could not perform alert action."
      );
    }
  };

  // ==========================================================
  // SEVERITY BADGE
  // ==========================================================

  const sevBadge = (s) =>
    s === "critical" ||
    s === "high"
      ? "heavy"
      : s === "medium"
      ? "moderate"
      : "low";

  // ==========================================================
  // CLOSE FULL SCREEN IMAGE WITH ESC
  // ==========================================================

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        setFullScreenImage(null);
      }
    };

    window.addEventListener(
      "keydown",
      handleKeyDown
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleKeyDown
      );
    };
  }, []);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Layout
      title="Alerts & Notifications"
      subtitle="Real-time traffic alerts, incidents & notifications"
    >

      {/* ======================================================
          REAL-TIME PEAK CONGESTION POPUP
      ====================================================== */}

      {trafficPopup && (
        <div
          className="
            fixed
            top-5
            right-5
            z-[10000]
            w-[380px]
            max-w-[calc(100vw-2rem)]
            bg-slate-900
            border
            border-red-500/60
            rounded-xl
            shadow-2xl
            p-4
            animate-pulse
          "
        >

          {/* POPUP HEADER */}

          <div className="flex items-start justify-between gap-3">

            <div className="flex items-center gap-3">

              <div
                className="
                  w-11
                  h-11
                  rounded-full
                  bg-red-500/20
                  border
                  border-red-500/40
                  flex
                  items-center
                  justify-center
                  text-xl
                "
              >
                🚨
              </div>

              <div>

                <p className="text-red-400 text-xs font-semibold uppercase">
                  Peak Congestion
                </p>

                <h3 className="text-white font-semibold">
                  {trafficPopup.title}
                </h3>

              </div>

            </div>

            {/* CLOSE */}

            <button
              type="button"
              onClick={() =>
                setTrafficPopup(null)
              }
              className="
                text-slate-400
                hover:text-white
                text-xl
              "
            >
              ×
            </button>

          </div>

          {/* ROAD */}

          <p className="text-slate-300 text-sm mt-3">
            📍 {trafficPopup.road}
          </p>

          {/* CONGESTION */}

          <div className="grid grid-cols-2 gap-3 mt-3">

            <div className="bg-slate-800 rounded-lg p-2">
              <p className="text-xs text-slate-400">
                Congestion
              </p>

              <p className="text-red-400 font-bold">
                {trafficPopup.congestionPercent !== null
                  ? `${trafficPopup.congestionPercent}%`
                  : "Peak"}
              </p>
            </div>

            <div className="bg-slate-800 rounded-lg p-2">
              <p className="text-xs text-slate-400">
                Average Speed
              </p>

              <p className="text-white font-bold">
                {trafficPopup.averageSpeed !== null
                  ? `${trafficPopup.averageSpeed} km/h`
                  : "N/A"}
              </p>
            </div>

          </div>

          {/* MESSAGE */}

          <p className="text-slate-300 text-sm mt-3">
            {trafficPopup.message}
          </p>

          {/* TIME */}

          <p className="text-xs text-slate-500 mt-2">
            Detected at {trafficPopup.time}
          </p>

          {/* VIEW */}

          <button
            type="button"
            onClick={() => {
              setTrafficPopup(null);
              window.scrollTo({
                top: 0,
                behavior: "smooth",
              });
            }}
            className="
              mt-3
              w-full
              py-2
              rounded-lg
              bg-red-500/20
              hover:bg-red-500/30
              text-red-300
              text-sm
              font-medium
            "
          >
            View Traffic Alert
          </button>

        </div>
      )}

      {/* ======================================================
          SUMMARY CARDS
      ====================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">

        {[
          ["Total Active", counts.total],
          ["High Severity", counts.high],
          ["Medium Severity", counts.medium],
          ["Resolved", counts.resolved],
          ["Unread", counts.unread],
        ].map(([label, value]) => (
          <div
            key={label}
            className="card"
          >

            <p className="text-xs text-slate-500">
              {label}
            </p>

            <p className="text-xl font-semibold text-slate-100">
              {value ?? 0}
            </p>

          </div>
        ))}

      </div>

      {/* ======================================================
          FILTERS
      ====================================================== */}

      <div className="flex flex-wrap gap-2 mb-4 items-center">

        <select
          className="input"
          value={type}
          onChange={(e) =>
            setType(e.target.value)
          }
        >

          {TYPES.map((t) => (
            <option
              key={t.value}
              value={t.value}
            >
              {t.label}
            </option>
          ))}

        </select>

        <select
          className="input"
          value={severity}
          onChange={(e) =>
            setSeverity(e.target.value)
          }
        >

          {SEVERITIES.map((s) => (
            <option
              key={s}
              value={s}
            >
              {s === "all"
                ? "All Severity"
                : s}
            </option>
          ))}

        </select>

        <select
          className="input"
          value={status}
          onChange={(e) =>
            setStatus(e.target.value)
          }
        >

          <option value="all">
            All Status
          </option>

          <option value="active">
            Active
          </option>

          <option value="resolved">
            Resolved
          </option>

        </select>

        {canManageAlerts && (
          <button
            className="btn-primary ml-auto"
            onClick={() =>
              setShowCreate(!showCreate)
            }
          >
            + Create Alert
          </button>
        )}

      </div>

      {/* ======================================================
          CREATE ALERT FORM
      ====================================================== */}

      {canManageAlerts && showCreate && (
        <form
          onSubmit={createAlert}
          className="card mb-6 grid md:grid-cols-2 gap-3"
        >

          <select
            className="input"
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value,
              })
            }
          >

            {TYPES.filter(
              (t) => t.value !== "all"
            ).map((t) => (
              <option
                key={t.value}
                value={t.value}
              >
                {t.label}
              </option>
            ))}

          </select>

          <select
            className="input"
            value={form.severity}
            onChange={(e) =>
              setForm({
                ...form,
                severity: e.target.value,
              })
            }
          >

            {SEVERITIES.filter(
              (s) => s !== "all"
            ).map((s) => (
              <option
                key={s}
                value={s}
              >
                {s}
              </option>
            ))}

          </select>

          <input
            className="input md:col-span-2"
            placeholder="Title"
            required
            value={form.title}
            onChange={(e) =>
              setForm({
                ...form,
                title: e.target.value,
              })
            }
          />

          {/* LOCATION */}

          <div className="relative md:col-span-2">

            <input
              className="input w-full"
              placeholder="Location"
              value={form.location}
              onChange={(e) =>
                searchLocation(
                  e.target.value
                )
              }
              onFocus={() => {
                if (
                  locationResults.length
                ) {
                  setShowDropdown(true);
                }
              }}
            />

            {showDropdown &&
              locationResults.length > 0 && (

                <div className="absolute z-50 w-full mt-1 bg-slate-800 border border-slate-700 rounded-lg max-h-52 overflow-y-auto">

                  {locationResults.map(
                    (item, index) => (

                      <div
                        key={
                          item.id ||
                          item.tomtomId ||
                          index
                        }
                        className="px-3 py-2 cursor-pointer hover:bg-slate-700 border-b border-slate-700 last:border-0"
                        onClick={() => {

                          setForm({
                            ...form,
                            location:
                              item.name,
                          });

                          setShowDropdown(
                            false
                          );

                        }}
                      >

                        <p className="text-white text-sm">
                          {item.name}
                        </p>

                        <p className="text-xs text-slate-400">

                          {[
                            item.city,
                            item.state,
                            item.country,
                          ]
                            .filter(Boolean)
                            .join(", ")}

                        </p>

                      </div>

                    )
                  )}

                </div>

              )}

          </div>

          {/* MESSAGE */}

          <textarea
            className="input md:col-span-2"
            rows={4}
            placeholder="Message"
            value={form.message}
            onChange={(e) =>
              setForm({
                ...form,
                message: e.target.value,
              })
            }
          />

          {/* IMAGE UPLOAD */}

          <div className="md:col-span-2">

            <label className="block text-sm text-slate-300 mb-2">
              Upload Image
            </label>

            <input
              type="file"
              accept="image/*"
              onChange={handleImage}
              className="input w-full"
            />

            {preview && (
              <img
                src={preview}
                alt="Preview"
                className="mt-3 w-full h-52 object-cover rounded-lg border border-slate-700"
              />
            )}

          </div>

          {error && (
            <p className="text-red-400 text-sm md:col-span-2">
              {error}
            </p>
          )}

          <button
            className="btn-primary md:col-span-2"
            type="submit"
          >
            Create Alert
          </button>

        </form>
      )}

      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && !showCreate && (
        <div className="mb-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* ======================================================
          ALERT LIST
      ====================================================== */}

      <div className="card">

        {alerts.length === 0 ? (

          <p className="text-slate-500 text-sm">
            No alerts available.
          </p>

        ) : (

          <div className="space-y-4">

            {alerts.map((a) => (

              <div
                key={a.id}
                className="border border-slate-700 rounded-xl p-4 bg-slate-900"
              >

                {/* ALERT HEADER */}

                <div className="flex flex-wrap items-center gap-2 mb-2">

                  <span
                    className={`badge badge-${sevBadge(
                      a.severity
                    )}`}
                  >
                    {a.severity}
                  </span>

                  <span className="badge badge-secondary">
                    {a.status}
                  </span>

                  {!a.isRead && (
                    <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  )}

                </div>

                {/* TITLE */}

                <h3 className="text-white text-lg font-semibold">
                  {a.title}
                </h3>

                {/* LOCATION / DATE */}

                <p className="text-xs text-slate-400 mt-1">
                  📍 {a.location} •{" "}
                  {new Date(
                    a.createdAt
                  ).toLocaleString()}
                </p>

                {/* MESSAGE */}

                <p className="text-slate-300 mt-3 line-clamp-2">
                  {a.message}
                </p>

                {/* VIEW DETAILS */}

                <button
                  className="btn-secondary text-xs mt-3"
                  onClick={() =>
                    setExpandedAlert(
                      expandedAlert === a.id
                        ? null
                        : a.id
                    )
                  }
                >
                  {expandedAlert === a.id
                    ? "Hide Details"
                    : "View Details"}
                </button>

                {/* EXPANDED DETAILS */}

                {expandedAlert === a.id && (

                  <div className="mt-4 border-t border-slate-700 pt-4 space-y-4">

                    {/* IMAGE */}

                    {a.imageUrl && (

                      <div>

                        <img
                          src={`http://127.0.0.1:5000${a.imageUrl}`}
                          alt="Alert"
                          onClick={() =>
                            setFullScreenImage(
                              `http://127.0.0.1:5000${a.imageUrl}`
                            )
                          }
                          className="w-full h-72 object-cover rounded-lg border border-slate-700 cursor-pointer hover:opacity-90 transition"
                          title="Click to view full screen"
                        />

                        <p className="text-xs text-slate-500 mt-2 text-center">
                          Click image to view full screen
                        </p>

                      </div>

                    )}

                    {/* DETAILS */}

                    <div className="grid md:grid-cols-2 gap-4">

                      <div>
                        <p className="text-xs text-slate-400">
                          Type
                        </p>

                        <p className="text-white">
                          {a.type}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Severity
                        </p>

                        <p className="text-white">
                          {a.severity}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Status
                        </p>

                        <p className="text-white">
                          {a.status}
                        </p>
                      </div>

                      <div>
                        <p className="text-xs text-slate-400">
                          Location
                        </p>

                        <p className="text-white">
                          {a.location}
                        </p>
                      </div>

                      <div className="md:col-span-2">

                        <p className="text-xs text-slate-400">
                          Message
                        </p>

                        <p className="text-white">
                          {a.message}
                        </p>

                      </div>

                    </div>

                    {/* ACTIONS */}

                    {canManageAlerts && (

                      <div className="flex justify-end gap-2">

                        {!a.isRead && (
                          <button
                            className="btn-secondary text-xs"
                            onClick={() =>
                              act(
                                a.id,
                                "read"
                              )
                            }
                          >
                            Mark Read
                          </button>
                        )}

                        {a.status === "active" && (
                          <button
                            className="btn-secondary text-xs"
                            onClick={() =>
                              act(
                                a.id,
                                "resolve"
                              )
                            }
                          >
                            Resolve
                          </button>
                        )}

                        <button
                          className="btn-secondary text-xs text-red-400"
                          onClick={() =>
                            act(
                              a.id,
                              "delete"
                            )
                          }
                        >
                          Delete
                        </button>

                      </div>

                    )}

                  </div>

                )}

              </div>

            ))}

          </div>

        )}

      </div>

      {/* ======================================================
          FULL SCREEN IMAGE
      ====================================================== */}

      {fullScreenImage && (

        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() =>
            setFullScreenImage(null)
          }
        >

          <button
            type="button"
            onClick={() =>
              setFullScreenImage(null)
            }
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white text-2xl flex items-center justify-center"
          >
            ×
          </button>

          <img
            src={fullScreenImage}
            alt="Alert Full Screen"
            onClick={(e) =>
              e.stopPropagation()
            }
            className="max-w-full max-h-[90vh] object-contain rounded-lg"
          />

        </div>

      )}

    </Layout>
  );
}

