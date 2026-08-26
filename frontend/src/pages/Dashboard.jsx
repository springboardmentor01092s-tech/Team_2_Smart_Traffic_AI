import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
} from "recharts";

import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import "leaflet.heat";

import Layout from "../components/Layout";
import StatCard from "../components/StatCard";
import api from "../services/api";

// ==========================================================
// CONGESTION COLORS
// ==========================================================

const COLORS = {
  low: "#22c55e",
  moderate: "#f59e0b",
  high: "#f97316",
  severe: "#ef4444",
  heavy: "#ef4444",
};

// ==========================================================
// DEFAULT MAP CENTER - INDIA
// ==========================================================

const DEFAULT_CENTER = [20.5937, 78.9629];

// ==========================================================
// SESSION STORAGE KEYS
// ==========================================================

const STORAGE_KEYS = {
  stats: "traffic_dashboard_stats",
  current: "traffic_dashboard_current",
  majorHeatmap: "traffic_dashboard_major_heatmap",
  alerts: "traffic_dashboard_alerts",
  lastUpdated: "traffic_dashboard_last_updated",
  loaded: "traffic_dashboard_loaded",
};

// ==========================================================
// SAFE SESSION STORAGE HELPERS
// ==========================================================

function readSessionStorage(key, fallback) {
  try {
    const saved = sessionStorage.getItem(key);

    if (saved === null) {
      return fallback;
    }

    return JSON.parse(saved);
  } catch (error) {
    console.warn(
      `Could not read sessionStorage key "${key}":`,
      error
    );

    return fallback;
  }
}

function writeSessionStorage(key, value) {
  try {
    sessionStorage.setItem(
      key,
      JSON.stringify(value)
    );
  } catch (error) {
    console.warn(
      `Could not write sessionStorage key "${key}":`,
      error
    );
  }
}

// ==========================================================
// TASK 4 - CREATE PEAK ALERT IN BACKEND
// ==========================================================

async function createPeakTrafficAlert({
  location,
  time,
  congestion,
}) {
  if (
    !location ||
    location.trim() === "" ||
    location === "Selected traffic area"
  ) {
    console.log(
      "Peak alert skipped: no real location selected."
    );

    return null;
  }

  if (
    !Number.isFinite(congestion) ||
    congestion < 50
  ) {
    console.log(
      "Peak alert skipped: congestion below 50%.",
      congestion
    );

    return null;
  }

  try {
    const peakKey =
      `traffic_peak_alert_${location}_${time}_${congestion.toFixed(
        1
      )}`;

    const alreadyCreated =
      sessionStorage.getItem(peakKey);

    if (alreadyCreated) {
      console.log(
        "Peak alert already created for this peak."
      );

      return null;
    }

    const formData = new FormData();

    formData.append(
      "type",
      "congestion"
    );

    let severity = "high";

    if (congestion >= 70) {
      severity = "critical";
    } else if (congestion >= 50) {
      severity = "high";
    }

    formData.append(
      "severity",
      severity
    );

    formData.append(
      "title",
      "Traffic Peak Detected"
    );

    formData.append(
      "message",
      `Peak traffic was identified at ${time}. Expected congestion is ${congestion.toFixed(
        1
      )}%.`
    );

    formData.append(
      "location",
      location
    );

    const response =
      await api.post(
        "/alerts",
        formData
      );

    try {
      sessionStorage.setItem(
        peakKey,
        "true"
      );
    } catch (storageError) {
      console.warn(
        "Could not save peak alert key:",
        storageError
      );
    }

    console.log(
      "Peak traffic alert created:",
      response?.data
    );

    return response?.data ?? null;
  } catch (error) {
    console.error(
      "Could not create peak traffic alert:",
      error
    );

    return null;
  }
}

// ==========================================================
// HEATMAP LAYER
// ==========================================================

function HeatmapLayer({ points }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    if (heatLayerRef.current) {
      map.removeLayer(
        heatLayerRef.current
      );

      heatLayerRef.current = null;
    }

    if (
      !Array.isArray(points) ||
      points.length === 0
    ) {
      return;
    }

    const L = window.L;

    if (!L || !L.heatLayer) {
      console.warn(
        "Leaflet heat plugin is not available."
      );

      return;
    }

    const heatPoints = points
      .filter(
        (point) =>
          Number.isFinite(point.lat) &&
          Number.isFinite(point.lng) &&
          Number.isFinite(point.intensity)
      )
      .map((point) => [
        point.lat,
        point.lng,
        point.intensity,
      ]);

    if (heatPoints.length === 0) {
      return;
    }

    const heatLayer =
      L.heatLayer(
        heatPoints,
        {
          radius: 35,
          blur: 25,
          maxZoom: 15,
          max: 1,
          minOpacity: 0.35,
        }
      );

    heatLayer.addTo(map);

    heatLayerRef.current =
      heatLayer;

    return () => {
      if (heatLayerRef.current) {
        map.removeLayer(
          heatLayerRef.current
        );

        heatLayerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}

// ==========================================================
// CONGESTION HELPERS
// ==========================================================

function getCongestionLevel(item) {
  const level =
    item?.congestionLevel ??
    item?.congestion_level ??
    "";

  return String(level)
    .trim()
    .toLowerCase();
}

function getCongestionPercent(item) {
  const value = Number(
    item?.congestionPercent ??
      item?.congestion_percent ??
      0
  );

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.min(100, value)
  );
}

function getAverageSpeed(item) {
  const value = Number(
    item?.averageSpeed ??
      item?.average_speed ??
      0
  );

  return Number.isFinite(value)
    ? value
    : 0;
}

function getCongestionColor(level) {
  switch (level) {
    case "low":
      return COLORS.low;

    case "moderate":
      return COLORS.moderate;

    case "high":
      return COLORS.high;

    case "heavy":
    case "severe":
      return COLORS.severe;

    default:
      return "#64748b";
  }
}

// ==========================================================
// BUILD EXISTING ROAD HEATMAP DATA
// ==========================================================

function buildHeatmapPoints(
  trafficItems
) {
  if (!Array.isArray(trafficItems)) {
    return [];
  }

  return trafficItems
    .map((item) => {
      const lat = Number(
        item?.latitude ??
          item?.lat
      );

      const lng = Number(
        item?.longitude ??
          item?.lng ??
          item?.lon
      );

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return null;
      }

      const congestion =
        getCongestionPercent(item);

      const level =
        getCongestionLevel(item);

      let intensity =
        congestion / 100;

      if (congestion === 0) {
        if (
          level === "heavy" ||
          level === "severe"
        ) {
          intensity = 1;
        } else if (
          level === "high"
        ) {
          intensity = 0.75;
        } else if (
          level === "moderate"
        ) {
          intensity = 0.5;
        } else {
          intensity = 0.2;
        }
      }

      return {
        lat,
        lng,
        intensity,
      };
    })
    .filter(Boolean);
}

// ==========================================================
// BUILD MAJOR LOCATION HEATMAP DATA
// ==========================================================

function buildMajorHeatmapPoints(
  locations
) {
  if (!Array.isArray(locations)) {
    return [];
  }

  return locations
    .map((item) => {
      const lat = Number(
        item?.latitude ??
          item?.lat
      );

      const lng = Number(
        item?.longitude ??
          item?.lng ??
          item?.lon
      );

      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng)
      ) {
        return null;
      }

      let intensity = Number(
        item?.intensity
      );

      if (
        !Number.isFinite(intensity)
      ) {
        intensity =
          getCongestionPercent(item) /
          100;
      }

      return {
        lat,
        lng,
        intensity: Math.max(
          0.1,
          Math.min(1, intensity)
        ),
      };
    })
    .filter(Boolean);
}

// ==========================================================
// DASHBOARD
// ==========================================================

export default function Dashboard() {
  // ========================================================
  // RESTORE PREVIOUS DASHBOARD STATE
  // ========================================================

  const [stats, setStats] = useState(
    () =>
      readSessionStorage(
        STORAGE_KEYS.stats,
        null
      )
  );

  const [current, setCurrent] =
    useState(() =>
      readSessionStorage(
        STORAGE_KEYS.current,
        []
      )
    );

  const [majorHeatmap, setMajorHeatmap] =
    useState(() =>
      readSessionStorage(
        STORAGE_KEYS.majorHeatmap,
        []
      )
    );

  const [alerts, setAlerts] =
    useState(() =>
      readSessionStorage(
        STORAGE_KEYS.alerts,
        []
      )
    );

  const [error, setError] =
    useState("");

  const [loading, setLoading] =
    useState(() => {
      try {
        return !sessionStorage.getItem(
          STORAGE_KEYS.loaded
        );
      } catch {
        return true;
      }
    });

  const [refreshing, setRefreshing] =
    useState(false);

  const [lastUpdated, setLastUpdated] =
    useState(() => {
      try {
        const saved =
          sessionStorage.getItem(
            STORAGE_KEYS.lastUpdated
          );

        return saved
          ? new Date(
              JSON.parse(saved)
            )
          : null;
      } catch {
        return null;
      }
    });

  // ========================================================
  // TASK 4 - TRAFFIC TREND STATE
  // ========================================================

  const [trendData, setTrendData] =
    useState([]);

  const [trendSummary, setTrendSummary] =
    useState({
      averageVehicleCount: 0,
      averageSpeed: 0,
      averageCongestion: 0,
      totalIncidents: 0,
      trend: "stable",
      trendChange: 0,
      peakPeriod: null,
    });

  const [trendLoading, setTrendLoading] =
    useState(false);

  const [trendError, setTrendError] =
    useState("");

  const [trendPeriod, setTrendPeriod] =
    useState("hour");

  const [trendRoad, setTrendRoad] =
    useState("");

  const [trendCity, setTrendCity] =
    useState("");

  const [trendState, setTrendState] =
    useState("");

  const [trendFrom, setTrendFrom] =
    useState("");

  const [trendTo, setTrendTo] =
    useState("");

  // ========================================================
  // TASK 4 - PEAK TRAFFIC NOTIFICATION
  // ========================================================

  const [peakNotification, setPeakNotification] =
    useState(null);

  const peakNotificationTimerRef =
    useRef(null);

  const lastPeakNotificationRef =
    useRef("");

  // ========================================================
  // LOAD DASHBOARD DATA
  // ========================================================

  const loadDashboardData =
    useCallback(
      async (manual = false) => {
        if (manual) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        try {
          const results =
            await Promise.allSettled([
              api.get(
                "/analytics/dashboard"
              ),

              api.get(
                "/traffic/current"
              ),

              api.get(
                "/alerts",
                {
                  params: {
                    status: "active",
                  },
                }
              ),

              api.get(
                "/traffic/major-heatmap"
              ),
            ]);

          const statsResult =
            results[0];

          const currentResult =
            results[1];

          const alertsResult =
            results[2];

          const majorHeatmapResult =
            results[3];

          // ==================================================
          // ANALYTICS DASHBOARD
          // ==================================================

          if (
            statsResult.status ===
            "fulfilled"
          ) {
            const statsData =
              statsResult.value
                ?.data ?? null;

            setStats(statsData);

            writeSessionStorage(
              STORAGE_KEYS.stats,
              statsData
            );
          } else {
            console.error(
              "Dashboard analytics API failed:",
              statsResult.reason
            );
          }

          // ==================================================
          // CURRENT TRAFFIC
          // ==================================================

          if (
            currentResult.status ===
            "fulfilled"
          ) {
            const trafficItems =
              Array.isArray(
                currentResult.value
                  ?.data?.items
              )
                ? currentResult
                    .value.data.items
                : [];

            setCurrent(
              trafficItems
            );

            writeSessionStorage(
              STORAGE_KEYS.current,
              trafficItems
            );
          } else {
            console.error(
              "Current traffic API failed:",
              currentResult.reason
            );
          }

          // ==================================================
          // ALERTS
          // ==================================================

          if (
            alertsResult.status ===
            "fulfilled"
          ) {
            const alertItems =
              Array.isArray(
                alertsResult.value
                  ?.data?.items
              )
                ? alertsResult.value
                    .data.items
                : [];

            const limitedAlerts =
              alertItems.slice(
                0,
                5
              );

            setAlerts(
              limitedAlerts
            );

            writeSessionStorage(
              STORAGE_KEYS.alerts,
              limitedAlerts
            );
          } else {
            console.error(
              "Alerts API failed:",
              alertsResult.reason
            );
          }

          // ==================================================
          // MAJOR HEATMAP
          // ==================================================

          if (
            majorHeatmapResult.status ===
            "fulfilled"
          ) {
            const majorHeatmapItems =
              Array.isArray(
                majorHeatmapResult
                  .value
                  ?.data?.items
              )
                ? majorHeatmapResult
                    .value
                    .data.items
                : [];

            setMajorHeatmap(
              majorHeatmapItems
            );

            writeSessionStorage(
              STORAGE_KEYS.majorHeatmap,
              majorHeatmapItems
            );
          } else {
            console.warn(
              "Major heatmap API unavailable. Using existing traffic locations only.",
              majorHeatmapResult.reason
            );
          }

          // ==================================================
          // CORE API CHECK
          // ==================================================

          const coreApisFailed =
            statsResult.status ===
              "rejected" &&
            currentResult.status ===
              "rejected" &&
            alertsResult.status ===
              "rejected";

          if (coreApisFailed) {
            const hasCachedData =
              stats !== null ||
              current.length > 0 ||
              alerts.length > 0;

            if (!hasCachedData) {
              setError(
                "Could not load dashboard data."
              );
            }
          } else {
            setError("");
          }

          // ==================================================
          // UPDATE TIME
          // ==================================================

          const now =
            new Date();

          setLastUpdated(now);

          writeSessionStorage(
            STORAGE_KEYS.lastUpdated,
            now.toISOString()
          );

          // ==================================================
          // MARK DASHBOARD AS LOADED
          // ==================================================

          try {
            sessionStorage.setItem(
              STORAGE_KEYS.loaded,
              "true"
            );
          } catch (storageError) {
            console.warn(
              "Could not save dashboard loaded state:",
              storageError
            );
          }
        } catch (err) {
          console.error(
            "Unexpected dashboard loading error:",
            err
          );

          const hasCachedData =
            stats !== null ||
            current.length > 0 ||
            alerts.length > 0;

          if (!hasCachedData) {
            setError(
              "Could not load dashboard data."
            );
          }
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [
        stats,
        current,
        alerts,
      ]
    );

  // ========================================================
  // INITIAL LOAD
  // ========================================================

  useEffect(() => {
    let hasSavedDashboard =
      false;

    try {
      hasSavedDashboard =
        sessionStorage.getItem(
          STORAGE_KEYS.loaded
        ) === "true";
    } catch {
      hasSavedDashboard = false;
    }

    if (!hasSavedDashboard) {
      loadDashboardData(false);
    } else {
      setLoading(false);
    }
  }, [loadDashboardData]);

  // ========================================================
  // TASK 4 - LOAD TRAFFIC TRENDS
  // ========================================================

  const loadTrendData =
    useCallback(async () => {
      setTrendLoading(true);
      setTrendError("");

      try {
        const params = {
          period: trendPeriod,
        };

        if (trendRoad.trim()) {
          params.road =
            trendRoad.trim();
        }

        if (trendCity.trim()) {
          params.city =
            trendCity.trim();
        }

        if (trendState.trim()) {
          params.state =
            trendState.trim();
        }

        if (trendFrom) {
          params.from = trendFrom;
        }

        if (trendTo) {
          params.to = trendTo;
        }

        const response =
          await api.get(
            "/traffic/trends",
            {
              params,
            }
          );

        const data =
          response?.data ?? {};

        const items =
          Array.isArray(data.items)
            ? data.items
            : [];

        const newPeakPeriod =
          data.summary?.peakPeriod ||
          null;

        setTrendData(items);

        setTrendSummary({
          averageVehicleCount:
            Number(
              data.summary
                ?.averageVehicleCount
            ) || 0,

          averageSpeed:
            Number(
              data.summary
                ?.averageSpeed
            ) || 0,

          averageCongestion:
            Number(
              data.summary
                ?.averageCongestion
            ) || 0,

          totalIncidents:
            Number(
              data.summary
                ?.totalIncidents
            ) || 0,

          trend:
            data.summary?.trend ||
            "stable",

          trendChange:
            Number(
              data.summary
                ?.trendChange
            ) || 0,

          peakPeriod:
            newPeakPeriod,
        });

        // ==================================================
        // PEAK TRAFFIC NOTIFICATION
        // ==================================================

        if (newPeakPeriod) {
          const hasLocationFilter =
            Boolean(
              trendRoad.trim()
            ) ||
            Boolean(
              trendCity.trim()
            ) ||
            Boolean(
              trendState.trim()
            );

          if (!hasLocationFilter) {
            console.log(
              "No location selected. Peak alert will not be created."
            );

            return;
          }

          const locationParts = [
            trendRoad.trim(),
            trendCity.trim(),
            trendState.trim(),
          ].filter(Boolean);

          const locationText =
            locationParts.join(
              ", "
            );

          const peakLabel =
            newPeakPeriod.label ||
            newPeakPeriod.time ||
            newPeakPeriod.period ||
            "Peak period";

          const peakCongestion =
            Number(
              newPeakPeriod.congestionPercent
            );

          if (
            !Number.isFinite(
              peakCongestion
            ) ||
            peakCongestion < 50
          ) {
            console.log(
              "Peak congestion is below alert threshold:",
              peakCongestion
            );

            return;
          }

          const notificationKey =
            `${locationText}-${peakLabel}-${peakCongestion.toFixed(
              1
            )}`;

          if (
            lastPeakNotificationRef.current !==
            notificationKey
          ) {
            lastPeakNotificationRef.current =
              notificationKey;

            if (
              peakNotificationTimerRef.current
            ) {
              clearTimeout(
                peakNotificationTimerRef.current
              );
            }

            setPeakNotification({
              location:
                locationText,

              time:
                peakLabel,

              congestion:
                peakCongestion,
            });

            peakNotificationTimerRef.current =
              setTimeout(() => {
                setPeakNotification(
                  null
                );
              }, 10000);
          }

          const createdAlert =
            await createPeakTrafficAlert({
              location:
                locationText,

              time:
                peakLabel,

              congestion:
                peakCongestion,
            });

          if (createdAlert) {
            setAlerts(
              (previousAlerts) => {
                const existingIds =
                  new Set(
                    previousAlerts.map(
                      (alert) =>
                        alert.id
                    )
                  );

                if (
                  createdAlert.id &&
                  existingIds.has(
                    createdAlert.id
                  )
                ) {
                  return previousAlerts;
                }

                const updatedAlerts = [
                  createdAlert,
                  ...previousAlerts,
                ].slice(0, 5);

                writeSessionStorage(
                  STORAGE_KEYS.alerts,
                  updatedAlerts
                );

                return updatedAlerts;
              }
            );
          }
        }
      } catch (err) {
        console.error(
          "Traffic trend API failed:",
          err
        );

        setTrendData([]);

        setTrendSummary({
          averageVehicleCount: 0,
          averageSpeed: 0,
          averageCongestion: 0,
          totalIncidents: 0,
          trend: "stable",
          trendChange: 0,
          peakPeriod: null,
        });

        setTrendError(
          err?.response?.data?.error ||
            "Could not load traffic trend analysis."
        );
      } finally {
        setTrendLoading(false);
      }
    }, [
      trendPeriod,
      trendRoad,
      trendCity,
      trendState,
      trendFrom,
      trendTo,
    ]);

  // ========================================================
  // LOAD TRENDS WHEN DASHBOARD OPENS
  // ========================================================

  useEffect(() => {
    loadTrendData();
  }, [loadTrendData]);

  // ========================================================
  // CLEANUP PEAK NOTIFICATION TIMER
  // ========================================================

  useEffect(() => {
    return () => {
      if (
        peakNotificationTimerRef.current
      ) {
        clearTimeout(
          peakNotificationTimerRef.current
        );
      }
    };
  }, []);

  // ========================================================
  // CONGESTION DISTRIBUTION - FIXED
  // ========================================================

  const congestionDistribution =
    useMemo(() => {
      const result = {
        low: 0,
        moderate: 0,
        high: 0,
        severe: 0,
      };

      // ----------------------------------------------------
      // USE BACKEND CONGESTION SUMMARY FIRST
      // ----------------------------------------------------

      const backendSummary =
        stats?.congestionSummary;

      if (
        backendSummary &&
        typeof backendSummary === "object"
      ) {
        result.low =
          Number(
            backendSummary.low ??
              backendSummary.Low ??
              backendSummary.LOW
          ) || 0;

        result.moderate =
          Number(
            backendSummary.moderate ??
              backendSummary.Moderate ??
              backendSummary.MODERATE
          ) || 0;

        result.high =
          Number(
            backendSummary.high ??
              backendSummary.High ??
              backendSummary.HIGH
          ) || 0;

        result.severe =
          Number(
            backendSummary.severe ??
              backendSummary.Severe ??
              backendSummary.heavy ??
              backendSummary.Heavy ??
              backendSummary.HEAVY
          ) || 0;
      }

      const backendTotal =
        result.low +
        result.moderate +
        result.high +
        result.severe;

      // ----------------------------------------------------
      // FALLBACK TO CURRENT TRAFFIC
      //
      // This fixes the empty PieChart when backend
      // congestionSummary is empty or unavailable.
      // ----------------------------------------------------

      if (
        backendTotal === 0 &&
        Array.isArray(current) &&
        current.length > 0
      ) {
        current.forEach((item) => {
          const level =
            getCongestionLevel(item);

          const congestion =
            getCongestionPercent(item);

          if (
            level === "low"
          ) {
            result.low += 1;
          } else if (
            level === "moderate"
          ) {
            result.moderate += 1;
          } else if (
            level === "high"
          ) {
            result.high += 1;
          } else if (
            level === "heavy" ||
            level === "severe"
          ) {
            result.severe += 1;
          } else {
            // ----------------------------------------------
            // FALLBACK CLASSIFICATION USING CONGESTION %
            // ----------------------------------------------

            if (congestion >= 70) {
              result.severe += 1;
            } else if (
              congestion >= 50
            ) {
              result.high += 1;
            } else if (
              congestion >= 30
            ) {
              result.moderate += 1;
            } else {
              result.low += 1;
            }
          }
        });
      }

      return result;
    }, [stats, current]);

  const pieData = [
    {
      name: "low",
      value:
        congestionDistribution.low,
    },
    {
      name: "moderate",
      value:
        congestionDistribution.moderate,
    },
    {
      name: "high",
      value:
        congestionDistribution.high,
    },
    {
      name: "severe",
      value:
        congestionDistribution.severe,
    },
  ];

  // ========================================================
  // EXISTING ROAD HEATMAP
  // ========================================================

  const heatmapPoints =
    useMemo(
      () =>
        buildHeatmapPoints(
          current
        ),
      [current]
    );

  // ========================================================
  // MAJOR LOCATION HEATMAP
  // ========================================================

  const majorHeatmapPoints =
    useMemo(
      () =>
        buildMajorHeatmapPoints(
          majorHeatmap
        ),
      [majorHeatmap]
    );

  // ========================================================
  // COMBINED HEATMAP
  // ========================================================

  const allHeatmapPoints =
    useMemo(
      () => [
        ...heatmapPoints,
        ...majorHeatmapPoints,
      ],
      [
        heatmapPoints,
        majorHeatmapPoints,
      ]
    );

  // ========================================================
  // MAP CENTER
  // ========================================================

  const mapCenter =
    useMemo(() => {
      if (
        heatmapPoints.length === 0
      ) {
        return DEFAULT_CENTER;
      }

      const first =
        heatmapPoints[0];

      return [
        first.lat,
        first.lng,
      ];
    }, [heatmapPoints]);

  // ========================================================
  // EXISTING LIVE TRAFFIC TREND
  // ========================================================

  const trafficTrend =
    useMemo(() => {
      if (
        !Array.isArray(current) ||
        current.length === 0
      ) {
        return [];
      }

      const sorted = [
        ...current,
      ]
        .filter(
          (item) =>
            item?.updatedAt
        )
        .sort(
          (a, b) =>
            new Date(
              a.updatedAt
            ) -
            new Date(
              b.updatedAt
            )
        );

      return sorted
        .slice(-12)
        .map((item) => ({
          time:
            new Date(
              item.updatedAt
            ).toLocaleTimeString(
              [],
              {
                hour: "2-digit",
                minute: "2-digit",
              }
            ),

          speed:
            getAverageSpeed(item),

          congestion:
            getCongestionPercent(
              item
            ),
        }));
    }, [current]);

  // ========================================================
  // TASK 4 - TREND CHART DATA
  // ========================================================

  const historicalTrendChart =
    useMemo(() => {
      return trendData.map(
        (item) => ({
          ...item,

          vehicleCount:
            Number(
              item.vehicleCount
            ) || 0,

          averageSpeed:
            Number(
              item.averageSpeed
            ) || 0,

          congestionPercent:
            Number(
              item.congestionPercent
            ) || 0,

          incidents:
            Number(
              item.incidents
            ) || 0,
        })
      );
    }, [trendData]);

  // ========================================================
  // TASK 4 - TREND LABEL
  // ========================================================

  const trendLabel =
    String(
      trendSummary.trend ||
        "stable"
    ).toLowerCase();

  const trendBadgeClass =
    trendLabel === "increasing"
      ? "bg-red-500/10 text-red-400 border-red-500/30"
      : trendLabel ===
        "decreasing"
      ? "bg-green-500/10 text-green-400 border-green-500/30"
      : "bg-slate-500/10 text-slate-400 border-slate-500/30";

  const trendIcon =
    trendLabel === "increasing"
      ? "↑"
      : trendLabel ===
        "decreasing"
      ? "↓"
      : "→";

  // ========================================================
  // LAST UPDATED
  // ========================================================

  const lastUpdatedText =
    lastUpdated
      ? lastUpdated.toLocaleTimeString(
          [],
          {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          }
        )
      : "—";

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <Layout
      title="Dashboard"
      subtitle="Real-time overview of traffic conditions"
    >
      {/* ==================================================
          TASK 4 - PEAK TRAFFIC NOTIFICATION
      ================================================== */}

      {peakNotification && (
        <div className="fixed top-5 right-5 z-[9999] w-[360px] max-w-[calc(100vw-2rem)]">
          <div className="rounded-xl border border-red-500/40 bg-slate-950 shadow-2xl shadow-black/40 overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 py-3 border-b border-red-500/20 bg-red-500/10">
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-9 h-9 rounded-full bg-red-500/20">
                  <span className="text-lg">
                    🚨
                  </span>
                </div>

                <div>
                  <p className="text-sm font-semibold text-red-400">
                    Traffic Peak Detected
                  </p>

                  <p className="text-[11px] text-slate-500">
                    Trend analysis alert
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() =>
                  setPeakNotification(
                    null
                  )
                }
                className="text-slate-500 hover:text-slate-200 text-lg leading-none"
                aria-label="Close notification"
              >
                ×
              </button>
            </div>

            <div className="px-4 py-4 space-y-3">
              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                  Location
                </p>

                <p className="text-sm font-medium text-slate-200 mt-1">
                  📍{" "}
                  {
                    peakNotification.location
                  }
                </p>
              </div>

              <div>
                <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                  Peak Time
                </p>

                <p className="text-sm font-medium text-red-400 mt-1">
                  🕐{" "}
                  {
                    peakNotification.time
                  }
                </p>
              </div>

              {peakNotification.congestion !==
                null && (
                <div>
                  <p className="text-[11px] text-slate-500 uppercase tracking-wide">
                    Peak Congestion
                  </p>

                  <p className="text-sm font-semibold text-amber-400 mt-1">
                    {peakNotification.congestion.toFixed(
                      1
                    )}
                    %
                  </p>
                </div>
              )}

              <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-3 py-2">
                <p className="text-xs text-red-300">
                  This peak traffic event
                  has also been added to
                  the active alerts.
                </p>
              </div>
            </div>

            <div className="h-1 bg-slate-800">
              <div className="h-full bg-red-500" />
            </div>
          </div>
        </div>
      )}

      {/* ==================================================
          HEADER
      ================================================== */}

      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />

          <span className="text-xs text-slate-400">
            Live traffic monitoring
          </span>

          <span className="text-xs text-slate-600">
            •
          </span>

          <span className="text-xs text-slate-500">
            Updated {lastUpdatedText}
          </span>
        </div>

        <button
          type="button"
          onClick={() =>
            loadDashboardData(true)
          }
          disabled={refreshing}
          className="px-3 py-2 rounded-lg border border-border bg-slate-900 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
        >
          {refreshing
            ? "Refreshing..."
            : "↻ Refresh"}
        </button>
      </div>

      {/* ==================================================
          ERROR
      ================================================== */}

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
          <p className="text-sm text-red-400">
            {error}
          </p>
        </div>
      )}

      {/* ==================================================
          LOADING
      ================================================== */}

      {loading && (
        <div className="mb-6 card">
          <div className="flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />

            <p className="text-sm text-slate-400">
              Loading dashboard data...
            </p>
          </div>
        </div>
      )}

      {/* ==================================================
          STAT CARDS
      ================================================== */}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <StatCard
          label="Total Active Roads"
          value={
            stats?.totalActiveRoads ??
            "—"
          }
          icon="🛣️"
        />

        <StatCard
          label="High Congestion Areas"
          value={
            stats?.highCongestionAreas ??
            "—"
          }
          icon="⚠️"
          tone="red"
        />

        <StatCard
          label="Average Speed"
          value={
            stats
              ? `${Number(
                  stats.averageSpeed
                ) || 0} km/h`
              : "—"
          }
          icon="⏱️"
          tone="green"
        />

        <StatCard
          label="Today's Incidents"
          value={
            stats?.todaysIncidents ??
            "—"
          }
          icon="🚧"
          tone="amber"
        />

        <StatCard
          label="Active Alerts"
          value={
            stats?.activeAlerts ??
            "—"
          }
          icon="🔔"
          tone="red"
        />
      </div>

      {/* ==================================================
          LIVE TRAFFIC + CONGESTION
      ================================================== */}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* LIVE TRAFFIC */}

        <div className="lg:col-span-2 card">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-medium text-slate-200">
              Live Traffic Snapshot
            </p>

            <span className="text-xs text-slate-500">
              {current.length} locations
            </span>
          </div>

          {current.length === 0 ? (
            <p className="text-sm text-slate-500">
              No traffic data yet.
              Search a location in
              Live Monitoring or enter
              a manual traffic update.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-border">
                    <th className="py-2">
                      Road
                    </th>

                    <th>
                      Speed
                    </th>

                    <th>
                      Congestion
                    </th>

                    <th>
                      Updated
                    </th>
                  </tr>
                </thead>

                <tbody>
                  {current
                    .slice(0, 6)
                    .map(
                      (
                        c,
                        index
                      ) => {
                        const level =
                          getCongestionLevel(
                            c
                          );

                        return (
                          <tr
                            key={
                              c.id ??
                              `traffic-${index}`
                            }
                            className="border-b border-border/50"
                          >
                            <td className="py-2">
                              {c.roadName ||
                                c.name ||
                                "Unknown road"}
                            </td>

                            <td>
                              {getAverageSpeed(
                                c
                              ).toFixed(
                                1
                              )}{" "}
                              km/h
                            </td>

                            <td>
                              <span
                                className={`badge badge-${
                                  level ||
                                  "low"
                                }`}
                              >
                                {level ||
                                  "low"}
                              </span>
                            </td>

                            <td className="text-slate-500">
                              {c.updatedAt
                                ? new Date(
                                    c.updatedAt
                                  ).toLocaleTimeString()
                                : "—"}
                            </td>
                          </tr>
                        );
                      }
                    )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ==================================================
            CONGESTION SUMMARY - FIXED
        ================================================== */}

        <div className="card">
          <p className="text-sm font-medium text-slate-200 mb-3">
            Congestion Summary (24h)
          </p>

          {pieData.every(
            (item) => item.value === 0
          ) ? (
            <div className="h-[200px] flex items-center justify-center">
              <div className="text-center px-4">
                <p className="text-sm text-slate-400">
                  No congestion data
                  available
                </p>

                <p className="text-xs text-slate-600 mt-2">
                  Save traffic
                  observations to build
                  the congestion summary.
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={200}
            >
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={50}
                  outerRadius={80}
                >
                  {pieData.map(
                    (d) => (
                      <Cell
                        key={
                          d.name
                        }
                        fill={
                          COLORS[
                            d.name
                          ] ||
                          "#64748b"
                        }
                      />
                    )
                  )}
                </Pie>

                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          )}

          <div className="grid grid-cols-2 gap-2 mt-2">
            {pieData.map(
              (item) => (
                <div
                  key={
                    item.name
                  }
                  className="flex items-center gap-2"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{
                      backgroundColor:
                        COLORS[
                          item.name
                        ] ||
                        "#64748b",
                    }}
                  />

                  <span className="text-xs text-slate-400 capitalize">
                    {item.name}
                  </span>

                  <span className="text-xs text-slate-200 ml-auto">
                    {item.value}
                  </span>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* ==================================================
          TASK 4 - TRAFFIC TREND ANALYSIS
      ================================================== */}

      <div className="card mt-6">
        <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-base font-semibold text-slate-200">
              Traffic Trend Analysis
            </p>

            <p className="text-xs text-slate-500 mt-1">
              Historical traffic patterns
              calculated from stored
              traffic records
            </p>
          </div>

          <button
            type="button"
            onClick={loadTrendData}
            disabled={trendLoading}
            className="px-3 py-2 rounded-lg border border-border bg-slate-900 text-xs text-slate-300 hover:bg-slate-800 disabled:opacity-50"
          >
            {trendLoading
              ? "Analyzing..."
              : "↻ Analyze"}
          </button>
        </div>

        {/* TREND FILTERS */}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Road
            </label>

            <input
              type="text"
              value={trendRoad}
              onChange={(event) =>
                setTrendRoad(
                  event.target.value
                )
              }
              placeholder="e.g. MG Road"
              className="w-full rounded-lg border border-border bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              City
            </label>

            <input
              type="text"
              value={trendCity}
              onChange={(event) =>
                setTrendCity(
                  event.target.value
                )
              }
              placeholder="e.g. Bengaluru"
              className="w-full rounded-lg border border-border bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              State
            </label>

            <input
              type="text"
              value={trendState}
              onChange={(event) =>
                setTrendState(
                  event.target.value
                )
              }
              placeholder="e.g. Karnataka"
              className="w-full rounded-lg border border-border bg-slate-900 px-3 py-2 text-xs text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              From Date
            </label>

            <input
              type="date"
              value={trendFrom}
              onChange={(event) =>
                setTrendFrom(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-border bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              To Date
            </label>

            <input
              type="date"
              value={trendTo}
              onChange={(event) =>
                setTrendTo(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-border bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs text-slate-500 mb-1">
              Analysis Period
            </label>

            <select
              value={trendPeriod}
              onChange={(event) =>
                setTrendPeriod(
                  event.target.value
                )
              }
              className="w-full rounded-lg border border-border bg-slate-900 px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
            >
              <option value="hour">
                Hourly
              </option>

              <option value="day">
                Daily
              </option>
            </select>
          </div>
        </div>

        {/* TREND ERROR */}

        {trendError && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
            <p className="text-xs text-red-400">
              {trendError}
            </p>
          </div>
        )}

        {/* TREND SUMMARY CARDS */}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="rounded-lg border border-border bg-slate-900/50 p-3">
            <p className="text-[11px] text-slate-500">
              Avg Vehicles
            </p>

            <p className="text-lg font-semibold text-slate-200 mt-1">
              {trendSummary.averageVehicleCount.toFixed(
                1
              )}
            </p>

            <p className="text-[10px] text-slate-600 mt-1">
              per period
            </p>
          </div>

          <div className="rounded-lg border border-border bg-slate-900/50 p-3">
            <p className="text-[11px] text-slate-500">
              Avg Speed
            </p>

            <p className="text-lg font-semibold text-green-400 mt-1">
              {trendSummary.averageSpeed.toFixed(
                1
              )}
            </p>

            <p className="text-[10px] text-slate-600 mt-1">
              km/h
            </p>
          </div>

          <div className="rounded-lg border border-border bg-slate-900/50 p-3">
            <p className="text-[11px] text-slate-500">
              Avg Congestion
            </p>

            <p className="text-lg font-semibold text-amber-400 mt-1">
              {trendSummary.averageCongestion.toFixed(
                1
              )}
              %
            </p>

            <p className="text-[10px] text-slate-600 mt-1">
              historical average
            </p>
          </div>

          <div className="rounded-lg border border-border bg-slate-900/50 p-3">
            <p className="text-[11px] text-slate-500">
              Incidents
            </p>

            <p className="text-lg font-semibold text-red-400 mt-1">
              {
                trendSummary.totalIncidents
              }
            </p>

            <p className="text-[10px] text-slate-600 mt-1">
              selected period
            </p>
          </div>

          <div className="rounded-lg border border-border bg-slate-900/50 p-3">
            <p className="text-[11px] text-slate-500">
              Trend
            </p>

            <div
              className={`inline-flex items-center gap-1 mt-2 px-2 py-1 rounded-md border text-xs capitalize ${trendBadgeClass}`}
            >
              <span>
                {trendIcon}
              </span>

              <span>
                {trendLabel}
              </span>
            </div>

            <p className="text-[10px] text-slate-600 mt-2">
              {trendSummary.trendChange >=
              0
                ? "+"
                : ""}
              {trendSummary.trendChange.toFixed(
                1
              )}
              % change
            </p>
          </div>

          <div className="rounded-lg border border-border bg-slate-900/50 p-3">
            <p className="text-[11px] text-slate-500">
              Peak Period
            </p>

            <p className="text-sm font-semibold text-red-400 mt-2 truncate">
              {trendSummary
                .peakPeriod
                ?.label ||
                "—"}
            </p>

            <p className="text-[10px] text-slate-600 mt-1">
              {trendSummary
                .peakPeriod
                ? `${Number(
                    trendSummary
                      .peakPeriod
                      .congestionPercent
                  ).toFixed(1)}% congestion`
                : "No data"}
            </p>
          </div>
        </div>

        {/* HISTORICAL CHARTS */}

        {trendLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />

              <p className="text-sm text-slate-500">
                Analyzing historical
                traffic...
              </p>
            </div>
          </div>
        ) : historicalTrendChart.length ===
          0 ? (
          <div className="h-[280px] flex items-center justify-center rounded-lg bg-slate-900/30">
            <div className="text-center px-4">
              <p className="text-sm text-slate-400">
                No historical traffic
                data available.
              </p>

              <p className="text-xs text-slate-600 mt-2">
                Save traffic
                observations through
                the traffic monitoring
                workflow first.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <div className="rounded-lg border border-border bg-slate-900/30 p-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-slate-200">
                  Speed & Congestion
                  Trend
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Historical average
                  speed and congestion
                </p>
              </div>

              <ResponsiveContainer
                width="100%"
                height={280}
              >
                <LineChart
                  data={
                    historicalTrendChart
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: -10,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: "#64748b",
                      fontSize: 10,
                    }}
                    interval="preserveStartEnd"
                  />

                  <YAxis
                    tick={{
                      fill: "#64748b",
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#131c30",
                      border:
                        "1px solid #22304a",
                      borderRadius:
                        "8px",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="averageSpeed"
                    name="Average Speed (km/h)"
                    stroke="#22c55e"
                    strokeWidth={2}
                    dot={false}
                  />

                  <Line
                    type="monotone"
                    dataKey="congestionPercent"
                    name="Congestion (%)"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="rounded-lg border border-border bg-slate-900/30 p-4">
              <div className="mb-3">
                <p className="text-sm font-medium text-slate-200">
                  Traffic Volume Trend
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Average vehicle count
                  by period
                </p>
              </div>

              <ResponsiveContainer
                width="100%"
                height={280}
              >
                <BarChart
                  data={
                    historicalTrendChart
                  }
                  margin={{
                    top: 10,
                    right: 10,
                    left: -10,
                    bottom: 0,
                  }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#1e293b"
                  />

                  <XAxis
                    dataKey="label"
                    tick={{
                      fill: "#64748b",
                      fontSize: 10,
                    }}
                    interval="preserveStartEnd"
                  />

                  <YAxis
                    tick={{
                      fill: "#64748b",
                      fontSize: 10,
                    }}
                  />

                  <Tooltip
                    contentStyle={{
                      background:
                        "#131c30",
                      border:
                        "1px solid #22304a",
                      borderRadius:
                        "8px",
                    }}
                  />

                  <Bar
                    dataKey="vehicleCount"
                    name="Average Vehicle Count"
                    fill="#60a5fa"
                    radius={[
                      4,
                      4,
                      0,
                      0,
                    ]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {trendData.length > 0 && (
          <div className="mt-5 rounded-lg border border-border bg-slate-900/30 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                Analysis based on{" "}
                <span className="text-slate-300">
                  {trendData.length}
                </span>{" "}
                historical{" "}
                {trendPeriod ===
                "hour"
                  ? "hourly"
                  : "daily"}{" "}
                periods.
              </p>

              <p className="text-xs text-slate-600">
                Trend direction is based
                on the change in
                congestion between the
                first and latest periods.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ==================================================
          EXISTING TRAFFIC ANALYTICS
      ================================================== */}

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        {/* TRAFFIC TREND */}

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-slate-200">
                Live Traffic Trend
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Recent live traffic
                observations
              </p>
            </div>
          </div>

          {trafficTrend.length ===
          0 ? (
            <div className="h-[260px] flex items-center justify-center">
              <p className="text-sm text-slate-500">
                No traffic trend data
                available.
              </p>
            </div>
          ) : (
            <ResponsiveContainer
              width="100%"
              height={260}
            >
              <LineChart
                data={
                  trafficTrend
                }
                margin={{
                  top: 10,
                  right: 10,
                  left: -10,
                  bottom: 0,
                }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#1e293b"
                />

                <XAxis
                  dataKey="time"
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />

                <YAxis
                  tick={{
                    fill: "#64748b",
                    fontSize: 11,
                  }}
                />

                <Tooltip
                  contentStyle={{
                    background:
                      "#131c30",
                    border:
                      "1px solid #22304a",
                    borderRadius:
                      "8px",
                  }}
                />

                <Line
                  type="monotone"
                  dataKey="speed"
                  name="Speed (km/h)"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={false}
                />

                <Line
                  type="monotone"
                  dataKey="congestion"
                  name="Congestion (%)"
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* HEATMAP */}

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-medium text-slate-200">
                Traffic Congestion
                Heatmap
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Live congestion
                locations
              </p>
            </div>

            <span className="text-xs text-slate-500">
              {
                allHeatmapPoints.length
              }{" "}
              locations
            </span>
          </div>

          {allHeatmapPoints.length ===
          0 ? (
            <div className="h-[300px] flex items-center justify-center rounded-lg bg-slate-900/50">
              <p className="text-sm text-slate-500 text-center px-4">
                No location-based
                traffic data available
                yet.
                <br />
                Search a location in
                Live Monitoring first.
              </p>
            </div>
          ) : (
            <div className="h-[300px] rounded-lg overflow-hidden">
              <MapContainer
                center={mapCenter}
                zoom={5}
                scrollWheelZoom={true}
                className="w-full h-full"
              >
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors"
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <HeatmapLayer
                  points={
                    allHeatmapPoints
                  }
                />

                {/* EXISTING ROAD MARKERS */}

                {current
                  .filter(
                    (item) => {
                      const lat =
                        Number(
                          item?.latitude ??
                            item?.lat
                        );

                      const lng =
                        Number(
                          item?.longitude ??
                            item?.lng ??
                            item?.lon
                        );

                      return (
                        Number.isFinite(
                          lat
                        ) &&
                        Number.isFinite(
                          lng
                        )
                      );
                    }
                  )
                  .slice(0, 100)
                  .map(
                    (
                      item,
                      index
                    ) => {
                      const lat =
                        Number(
                          item?.latitude ??
                            item?.lat
                        );

                      const lng =
                        Number(
                          item?.longitude ??
                            item?.lng ??
                            item?.lon
                        );

                      const level =
                        getCongestionLevel(
                          item
                        );

                      const percent =
                        getCongestionPercent(
                          item
                        );

                      const color =
                        getCongestionColor(
                          level
                        );

                      return (
                        <CircleMarker
                          key={`traffic-${
                            item.id ??
                            index
                          }-${lat}-${lng}`}
                          center={[
                            lat,
                            lng,
                          ]}
                          radius={5}
                          pathOptions={{
                            color,
                            fillColor:
                              color,
                            fillOpacity:
                              0.85,
                            weight: 1,
                          }}
                        >
                          <Popup>
                            <div className="text-sm">
                              <strong>
                                {item.roadName ||
                                  item.name ||
                                  "Traffic Location"}
                              </strong>

                              <br />

                              Speed:{" "}
                              {getAverageSpeed(
                                item
                              ).toFixed(
                                1
                              )}{" "}
                              km/h

                              <br />

                              Congestion:{" "}
                              {percent.toFixed(
                                1
                              )}
                              %

                              <br />

                              Level:{" "}
                              <span className="capitalize">
                                {level ||
                                  "unknown"}
                              </span>

                              <br />

                              Source:{" "}
                              <span className="capitalize">
                                {item.source ||
                                  "unknown"}
                              </span>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    }
                  )}

                {/* MAJOR LOCATION MARKERS */}

                {majorHeatmap
                  .filter(
                    (item) => {
                      const lat =
                        Number(
                          item?.latitude ??
                            item?.lat
                        );

                      const lng =
                        Number(
                          item?.longitude ??
                            item?.lng ??
                            item?.lon
                        );

                      return (
                        Number.isFinite(
                          lat
                        ) &&
                        Number.isFinite(
                          lng
                        )
                      );
                    }
                  )
                  .map(
                    (
                      item,
                      index
                    ) => {
                      const lat =
                        Number(
                          item?.latitude ??
                            item?.lat
                        );

                      const lng =
                        Number(
                          item?.longitude ??
                            item?.lng ??
                            item?.lon
                        );

                      const level =
                        getCongestionLevel(
                          item
                        );

                      const percent =
                        getCongestionPercent(
                          item
                        );

                      const color =
                        getCongestionColor(
                          level
                        );

                      return (
                        <CircleMarker
                          key={`major-${
                            item.id ??
                            item.city ??
                            index
                          }-${lat}-${lng}`}
                          center={[
                            lat,
                            lng,
                          ]}
                          radius={4}
                          pathOptions={{
                            color,
                            fillColor:
                              color,
                            fillOpacity:
                              0.75,
                            weight: 1,
                          }}
                        >
                          <Popup>
                            <div className="text-sm">
                              <strong>
                                {item.name ||
                                  item.city ||
                                  "Major Location"}
                              </strong>

                              <br />

                              City:{" "}
                              {item.city ||
                                "—"}

                              <br />

                              State:{" "}
                              {item.state ||
                                "—"}

                              <br />

                              Speed:{" "}
                              {getAverageSpeed(
                                item
                              ).toFixed(
                                1
                              )}{" "}
                              km/h

                              <br />

                              Congestion:{" "}
                              {percent.toFixed(
                                1
                              )}
                              %

                              <br />

                              Level:{" "}
                              <span className="capitalize">
                                {level ||
                                  "unknown"}
                              </span>

                              <br />

                              Source:{" "}
                              <span>
                                TomTom
                              </span>
                            </div>
                          </Popup>
                        </CircleMarker>
                      );
                    }
                  )}
              </MapContainer>
            </div>
          )}
        </div>
      </div>

      {/* ==================================================
          HEATMAP LEGEND
      ================================================== */}

      <div className="card mt-6">
        <p className="text-sm font-medium text-slate-200 mb-3">
          Congestion Heatmap Legend
        </p>

        <div className="flex flex-wrap gap-5">
          {[
            ["low", "Low"],
            ["moderate", "Moderate"],
            ["high", "High"],
            ["heavy", "Heavy"],
          ].map(
            ([key, label]) => (
              <div
                key={key}
                className="flex items-center gap-2"
              >
                <span
                  className="w-3 h-3 rounded-full"
                  style={{
                    backgroundColor:
                      COLORS[key],
                  }}
                />

                <span className="text-xs text-slate-400">
                  {label}
                </span>
              </div>
            )
          )}
        </div>
      </div>

      {/* ==================================================
          RECENT ALERTS
      ================================================== */}

      <div className="card mt-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-medium text-slate-200">
            Recent Alerts
          </p>

          <span className="text-xs text-slate-500">
            Active
          </span>
        </div>

        {alerts.length === 0 ? (
          <p className="text-sm text-slate-500">
            No active alerts.
          </p>
        ) : (
          <div className="space-y-2">
            {alerts.map(
              (a, index) => {
                const severity =
                  String(
                    a.severity ||
                      "low"
                  ).toLowerCase();

                return (
                  <div
                    key={
                      a.id ??
                      `alert-${index}`
                    }
                    className="flex items-center justify-between py-2 border-b border-border/50 last:border-0"
                  >
                    <div>
                      <p className="text-sm text-slate-200">
                        {a.title ||
                          "Traffic Alert"}
                      </p>

                      <p className="text-xs text-slate-500">
                        {a.location ||
                          a.locationName ||
                          a.location_name ||
                          "Unknown location"}
                      </p>
                    </div>

                    <span
                      className={`badge badge-${
                        severity ===
                          "critical" ||
                        severity ===
                          "high"
                          ? "heavy"
                          : severity ===
                            "medium"
                          ? "moderate"
                          : "low"
                      }`}
                    >
                      {severity}
                    </span>
                  </div>
                );
              }
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}

