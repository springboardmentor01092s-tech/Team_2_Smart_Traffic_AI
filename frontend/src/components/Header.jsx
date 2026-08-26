import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import socket from "../services/socket";

export default function Header({ title, subtitle }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [menuOpen, setMenuOpen] = useState(false);

  // ==========================================================
  // NOTIFICATIONS
  // ==========================================================

  const [notifications, setNotifications] = useState([]);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // ==========================================================
  // LOAD EXISTING UNREAD ALERTS
  // ==========================================================

  useEffect(() => {
    const token = localStorage.getItem("access_token");

    if (!token) {
      return;
    }

    fetch("http://127.0.0.1:5000/api/alerts?status=active", {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to load alerts");
        }

        return response.json();
      })
      .then((data) => {
        const items = data.items || [];

        const unread = items.filter(
          (item) => !item.isRead
        );

        setNotifications(unread.slice(0, 10));

        setUnreadCount(
          data.counts?.unread ?? unread.length
        );
      })
      .catch((error) => {
        console.error(
          "Could not load notifications:",
          error
        );
      });
  }, []);

  // ==========================================================
  // SOCKET.IO REAL-TIME NOTIFICATION
  // ==========================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    const handleNewNotification = (notification) => {
      console.log(
        "New traffic notification:",
        notification
      );

      setNotifications((previous) => [
        notification,
        ...previous,
      ].slice(0, 10));

      setUnreadCount((previous) => previous + 1);

      // Automatically open notification panel
      setNotificationOpen(true);
    };

    socket.on(
      "new_notification",
      handleNewNotification
    );

    return () => {
      socket.off(
        "new_notification",
        handleNewNotification
      );
    };
  }, [user]);

  // ==========================================================
  // MARK NOTIFICATION AS READ
  // ==========================================================

  const markNotificationRead = async (notification) => {
    const token = localStorage.getItem("access_token");

    if (!token || !notification?.id) {
      return;
    }

    try {
      await fetch(
        `http://127.0.0.1:5000/api/alerts/${notification.id}/read`,
        {
          method: "PATCH",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
    } catch (error) {
      console.error(
        "Could not mark notification as read:",
        error
      );
    }

    setNotifications((previous) =>
      previous.filter(
        (item) => item.id !== notification.id
      )
    );

    setUnreadCount((previous) =>
      Math.max(previous - 1, 0)
    );
  };

  // ==========================================================
  // NOTIFICATION CLICK
  // ==========================================================

  const handleNotificationClick = async (
    notification
  ) => {
    await markNotificationRead(notification);

    setNotificationOpen(false);

    navigate("/alerts");
  };

  // ==========================================================
  // VIEW ALL ALERTS
  // ==========================================================

  const viewAllAlerts = () => {
    setNotificationOpen(false);

    navigate("/alerts");
  };

  // ==========================================================
  // SEVERITY ICON
  // ==========================================================

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case "low":
        return "🟢";

      case "medium":
        return "🟡";

      case "high":
        return "🟠";

      case "critical":
        return "🔴";

      default:
        return "🔔";
    }
  };

  // ==========================================================
  // SEVERITY TEXT
  // ==========================================================

  const getSeverityText = (severity) => {
    switch (severity) {
      case "low":
        return "Low Traffic";

      case "medium":
        return "Moderate Traffic";

      case "high":
        return "High Traffic";

      case "critical":
        return "Heavy Congestion";

      default:
        return "Traffic Alert";
    }
  };

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <header
      className="
        sticky
        top-0
        z-[9999]
        bg-bg-panel/90
        backdrop-blur
        border-b
        border-border
        px-6
        py-4
        flex
        items-center
        justify-between
      "
    >

      {/* ====================================================
          LEFT
      ==================================================== */}

      <div>
        <h1 className="text-lg font-semibold text-slate-100">
          {title}
        </h1>

        {subtitle && (
          <p className="text-xs text-slate-500">
            {subtitle}
          </p>
        )}
      </div>

      {/* ====================================================
          RIGHT
      ==================================================== */}

      <div className="flex items-center gap-4">

        {/* ==================================================
            NOTIFICATION AREA
        ================================================== */}

        <div className="relative z-[9999]">

          {/* ==================================================
              NOTIFICATION BELL
          ================================================== */}

          <button
            className="
              relative
              w-9
              h-9
              rounded-lg
              bg-bg-hover
              flex
              items-center
              justify-center
              hover:bg-slate-700
              transition
            "
            onClick={() =>
              setNotificationOpen(
                !notificationOpen
              )
            }
            title="Notifications"
          >

            <span className="text-lg">
              🔔
            </span>

            {/* UNREAD BADGE */}

            {unreadCount > 0 && (
              <span
                className="
                  absolute
                  -top-1
                  -right-1
                  min-w-[18px]
                  h-[18px]
                  px-1
                  rounded-full
                  bg-red-500
                  text-white
                  text-[10px]
                  font-bold
                  flex
                  items-center
                  justify-center
                  border-2
                  border-bg-panel
                  z-[10000]
                "
              >
                {unreadCount > 99
                  ? "99+"
                  : unreadCount}
              </span>
            )}

          </button>

          {/* ==================================================
              NOTIFICATION PANEL
          ================================================== */}

          {notificationOpen && (
            <div
              className="
                absolute
                right-0
                mt-3
                w-96
                max-w-[90vw]
                bg-bg-card
                border
                border-border
                rounded-xl
                shadow-2xl
                overflow-hidden
                z-[10000]
              "
            >

              {/* ==================================================
                  PANEL HEADER
              ================================================== */}

              <div
                className="
                  px-4
                  py-3
                  border-b
                  border-border
                  flex
                  items-center
                  justify-between
                "
              >

                <div>
                  <h3 className="text-sm font-semibold text-slate-100">
                    Notifications
                  </h3>

                  <p className="text-[11px] text-slate-500">
                    Real-time traffic updates
                  </p>
                </div>

                {unreadCount > 0 && (
                  <span className="text-[11px] text-red-400 font-medium">
                    {unreadCount} unread
                  </span>
                )}

              </div>

              {/* ==================================================
                  NOTIFICATION LIST
              ================================================== */}

              <div className="max-h-96 overflow-y-auto">

                {notifications.length === 0 ? (

                  /* EMPTY STATE */

                  <div className="px-4 py-8 text-center">

                    <div className="text-3xl mb-2">
                      🔔
                    </div>

                    <p className="text-sm text-slate-400">
                      No new notifications
                    </p>

                    <p className="text-xs text-slate-600 mt-1">
                      You're all caught up.
                    </p>

                  </div>

                ) : (

                  notifications.map(
                    (notification) => (

                      <button
                        key={notification.id}
                        onClick={() =>
                          handleNotificationClick(
                            notification
                          )
                        }
                        className="
                          w-full
                          text-left
                          px-4
                          py-3
                          border-b
                          border-border
                          hover:bg-bg-hover
                          transition
                        "
                      >

                        <div className="flex gap-3">

                          {/* ICON */}

                          <div className="text-lg pt-0.5">
                            {getSeverityIcon(
                              notification.severity
                            )}
                          </div>

                          {/* CONTENT */}

                          <div className="flex-1 min-w-0">

                            {/* TITLE + TIME */}

                            <div className="flex items-center justify-between gap-2">

                              <p className="text-sm font-medium text-slate-100 truncate">
                                {notification.title ||
                                  getSeverityText(
                                    notification.severity
                                  )}
                              </p>

                              <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                {notification.time ||
                                  ""}
                              </span>

                            </div>

                            {/* MESSAGE */}

                            <p className="text-xs text-slate-400 mt-1">
                              {notification.message ||
                                `Traffic update for ${
                                  notification.road ||
                                  notification.location ||
                                  "road"
                                }.`}
                            </p>

                            {/* ROAD */}

                            {notification.road && (
                              <p className="text-[11px] text-slate-500 mt-1">
                                Road:{" "}
                                {notification.road}
                              </p>
                            )}

                            {/* SPEED */}

                            {notification.averageSpeed !==
                              undefined && (
                              <p className="text-[11px] text-slate-500">
                                Speed:{" "}
                                {
                                  notification.averageSpeed
                                }{" "}
                                km/h
                              </p>
                            )}

                            {/* CONGESTION */}

                            {notification.congestionPercent !==
                              undefined && (
                              <p className="text-[11px] text-slate-500">
                                Congestion:{" "}
                                {
                                  notification.congestionPercent
                                }
                                %
                              </p>
                            )}

                          </div>

                        </div>

                      </button>

                    )

                  )

                )}

              </div>

              {/* ==================================================
                  PANEL FOOTER
              ================================================== */}

              <div className="border-t border-border">

                <button
                  onClick={viewAllAlerts}
                  className="
                    w-full
                    px-4
                    py-3
                    text-xs
                    text-accent
                    hover:bg-bg-hover
                    transition
                  "
                >
                  View All Alerts →
                </button>

              </div>

            </div>
          )}

        </div>

        {/* ==================================================
            PROFILE
        ================================================== */}

        <div className="relative z-[9999]">

          <button
            className="flex items-center gap-2"
            onClick={() =>
              setMenuOpen(!menuOpen)
            }
          >

            {/* PROFILE IMAGE */}

            {user?.avatarUrl ? (

              <img
                src={user.avatarUrl}
                alt="Profile"
                className="
                  w-9
                  h-9
                  rounded-full
                  object-cover
                  border
                  border-slate-600
                "
              />

            ) : (

              <div
                className="
                  w-9
                  h-9
                  rounded-full
                  bg-accent
                  flex
                  items-center
                  justify-center
                  text-sm
                  font-semibold
                  text-white
                "
              >
                {user?.name?.charAt(0) || "U"}
              </div>

            )}

            {/* USER INFORMATION */}

            <div className="text-left hidden sm:block">

              <p className="text-sm font-medium leading-tight text-slate-100">
                {user?.name}
              </p>

              <p className="text-[11px] text-slate-500 capitalize leading-tight">
                {user?.role?.replace("_", " ")}
              </p>

            </div>

          </button>

          {/* ==================================================
              PROFILE MENU
          ================================================== */}

          {menuOpen && (

            <div
              className="
                absolute
                right-0
                mt-2
                w-44
                bg-bg-card
                border
                border-border
                rounded-lg
                shadow-xl
                py-1
                z-[10000]
              "
            >

              {/* PROFILE */}

              <button
                className="
                  w-full
                  text-left
                  px-3
                  py-2
                  text-sm
                  hover:bg-bg-hover
                "
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/profile");
                }}
              >
                👤 Profile
              </button>

              {/* SETTINGS */}

              <button
                className="
                  w-full
                  text-left
                  px-3
                  py-2
                  text-sm
                  hover:bg-bg-hover
                "
                onClick={() => {
                  setMenuOpen(false);
                  navigate("/system-settings");
                }}
              >
                ⚙️ Settings
              </button>

              {/* LOGOUT */}

              <button
                className="
                  w-full
                  text-left
                  px-3
                  py-2
                  text-sm
                  text-red-400
                  hover:bg-bg-hover
                "
                onClick={async () => {
                  setMenuOpen(false);

                  await logout();

                  navigate("/login");
                }}
              >
                🚪 Logout
              </button>

            </div>

          )}

        </div>

      </div>

    </header>
  );
}

