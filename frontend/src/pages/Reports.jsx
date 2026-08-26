import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

  Low: "#22c55e",
  Moderate: "#f59e0b",
  High: "#f97316",
  Severe: "#ef4444",
};

// ==========================================================
// PRIORITY COLORS
// ==========================================================

const PRIORITY_STYLES = {
  Critical: {
    badge:
      "bg-red-500/15 text-red-400 border-red-500/30",
    icon: "🔴",
  },

  High: {
    badge:
      "bg-orange-500/15 text-orange-400 border-orange-500/30",
    icon: "🟠",
  },

  Medium: {
    badge:
      "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: "🟡",
  },

  Low: {
    badge:
      "bg-green-500/15 text-green-400 border-green-500/30",
    icon: "🟢",
  },
};

// ==========================================================
// DATE HELPERS
// ==========================================================

function getTodayDate() {
  const today = new Date();

  const year = today.getFullYear();

  const month = String(
    today.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    today.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatReportDate(dateValue) {
  if (!dateValue) {
    return "—";
  }

  try {
    const date = new Date(
      `${dateValue}T00:00:00`
    );

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }
    );
  } catch {
    return dateValue;
  }
}

// ==========================================================
// CONGESTION COLOR
// ==========================================================

function getCongestionColor(name) {
  return (
    COLORS[name] ||
    COLORS[name?.toLowerCase()] ||
    "#64748b"
  );
}

// ==========================================================
// REPORTS PAGE
// ==========================================================

export default function Reports() {
  // ========================================================
  // DATE
  // ========================================================

  const [reportDate, setReportDate] =
    useState(getTodayDate());

  // ========================================================
  // REPORT DATA
  // ========================================================

  const [reportData, setReportData] =
    useState(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // ========================================================
  // PDF
  // ========================================================

  const [pdfLoading, setPdfLoading] =
    useState(false);

  const [pdfError, setPdfError] =
    useState("");

  // ========================================================
  // LOAD REPORT
  // ========================================================

  const loadReport = async (
    selectedDate
  ) => {
    if (!selectedDate) {
      setError(
        "Please select a report date."
      );

      return;
    }

    setError("");
    setLoading(true);

    try {
      const { data } =
        await api.get(
          "/reports/data",
          {
            params: {
              date: selectedDate,
              state: "all",
              city: "all",
              road: "",
            },
          }
        );

      setReportData(data);
    } catch (err) {
      console.error(
        "Report data error:",
        err
      );

      setReportData(null);

      setError(
        err?.response?.data?.error ||
          err?.response?.data?.message ||
          "Could not load the traffic report."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // LOAD TODAY'S REPORT
  // ========================================================

  useEffect(() => {
    const today = getTodayDate();

    setReportDate(today);

    loadReport(today);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========================================================
  // CHANGE DATE
  // ========================================================

  const changeReportDate = async (
    value
  ) => {
    if (!value) {
      return;
    }

    setReportDate(value);

    setPdfError("");

    await loadReport(value);
  };

  // ========================================================
  // DOWNLOAD PDF
  // ========================================================

  const generatePdf = async () => {
    setPdfError("");

    if (!reportDate) {
      setPdfError(
        "Please select a report date."
      );

      return;
    }

    setPdfLoading(true);

    try {
      const response =
        await api.get(
          "/reports/pdf",
          {
            params: {
              date: reportDate,
              state: "all",
              city: "all",
              road: "",
            },

            responseType: "blob",
          }
        );

      const contentType =
        response.headers?.[
          "content-type"
        ] || "";

      if (
        contentType.includes(
          "application/json"
        )
      ) {
        const text =
          await response.data.text();

        let message =
          "Could not generate PDF report.";

        try {
          const json =
            JSON.parse(text);

          message =
            json.error ||
            json.message ||
            message;
        } catch {
          // Default message
        }

        throw new Error(message);
      }

      const blob = new Blob(
        [response.data],
        {
          type: "application/pdf",
        }
      );

      const url =
        window.URL.createObjectURL(
          blob
        );

      const link =
        document.createElement("a");

      link.href = url;

      link.download =
        `TrafficVision_Report_${reportDate}.pdf`;

      document.body.appendChild(link);

      link.click();

      link.remove();

      window.URL.revokeObjectURL(
        url
      );
    } catch (err) {
      console.error(
        "PDF generation error:",
        err
      );

      let message =
        "Could not generate PDF report.";

      if (
        err?.response?.data?.error
      ) {
        message =
          err.response.data.error;
      } else if (err?.message) {
        message = err.message;
      }

      setPdfError(message);
    } finally {
      setPdfLoading(false);
    }
  };

  // ========================================================
  // TRAFFIC
  // ========================================================

  const traffic =
    reportData?.traffic || {};

  const totalVehicleVolume =
    Number(
      traffic.totalVehicleVolume || 0
    );

  const averageCongestion =
    Number(
      traffic.averageCongestion || 0
    );

  const averageSpeed =
    Number(
      traffic.averageSpeed || 0
    );

  const totalIncidents =
    Number(
      traffic.totalIncidents || 0
    );

  const recordCount =
    Number(
      traffic.recordCount || 0
    );

  // ========================================================
  // AI RECOMMENDATIONS
  // ========================================================

  const aiRecommendations =
    Array.isArray(
      reportData?.aiRecommendations
    )
      ? reportData.aiRecommendations
      : [];

  // ========================================================
  // PIE DATA
  // ========================================================

  const distribution =
    traffic.congestionDistribution ||
    {};

  const pieData = useMemo(() => {
    return Object.entries(
      distribution
    )
      .filter(
        ([, value]) =>
          Number(value) > 0
      )
      .map(
        ([name, value]) => ({
          name:
            name.charAt(0).toUpperCase() +
            name.slice(1),

          value: Number(value),
        })
      );
  }, [distribution]);

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <Layout
      title="Reports & Analytics"
      subtitle="Generate traffic reports and AI-based traffic recommendations"
    >

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
        <div className="card mb-6">
          <div className="flex items-center gap-3">

            <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />

            <p className="text-sm text-slate-400">
              Analyzing traffic data and generating AI recommendations...
            </p>

          </div>
        </div>
      )}

      {/* ==================================================
          REPORT CONTENT
      ================================================== */}

      {reportData && (
        <>

          {/* ================================================
              REPORT HEADER
          ================================================ */}

          <div className="card mb-6">

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

              <div>

                <p className="text-xs text-slate-500">
                  TrafficVision AI Daily Report
                </p>

                <h2 className="text-lg font-semibold text-slate-100 mt-1">
                  {formatReportDate(
                    reportData.date
                  )}
                </h2>

                <p className="text-xs text-slate-500 mt-1">
                  {reportData.day ||
                    "—"}
                </p>

              </div>

              <div className="text-right">

                <p className="text-xs text-slate-500">
                  Traffic Records
                </p>

                <p className="text-lg font-semibold text-slate-200 mt-1">
                  {recordCount.toLocaleString()}
                </p>

              </div>

            </div>

          </div>

          {/* ================================================
              STAT CARDS
          ================================================ */}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">

            <StatCard
              label="Total Vehicle Volume"
              value={totalVehicleVolume.toLocaleString()}
              icon="🚗"
            />

            <StatCard
              label="Average Congestion"
              value={`${averageCongestion.toFixed(
                1
              )}%`}
              icon="🚦"
              tone="amber"
            />

            <StatCard
              label="Average Speed"
              value={`${averageSpeed.toFixed(
                1
              )} km/h`}
              icon="⏱️"
              tone="green"
            />

            <StatCard
              label="Total Incidents"
              value={totalIncidents}
              icon="⚠️"
              tone="red"
            />

          </div>

          {/* ================================================
              AI RECOMMENDATIONS
          ================================================ */}

          <div className="card mb-6">

            <div className="flex items-start justify-between gap-4 mb-5">

              <div>

                <div className="flex items-center gap-2">

                  <span className="text-xl">
                    🤖
                  </span>

                  <p className="text-base font-semibold text-slate-100">
                    AI Traffic Recommendations
                  </p>

                </div>

                <p className="text-xs text-slate-500 mt-2 leading-5">
                  TrafficVision AI analyzes congestion,
                  vehicle volume, average speed and
                  incidents to recommend appropriate
                  traffic-management actions.
                </p>

              </div>

              <div className="hidden sm:block">

                <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs text-blue-400">
                  ✨ AI Analysis
                </span>

              </div>

            </div>

            {aiRecommendations.length === 0 ? (

              <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-5 text-center">

                <p className="text-sm text-slate-400">
                  No AI recommendations are available.
                </p>

              </div>

            ) : (

              <div className="space-y-3">

                {aiRecommendations.map(
                  (
                    recommendation,
                    index
                  ) => {

                    const priority =
                      recommendation.priority ||
                      "Low";

                    const priorityStyle =
                      PRIORITY_STYLES[
                        priority
                      ] ||
                      PRIORITY_STYLES.Low;

                    return (
                      <div
                        key={`${priority}-${index}`}
                        className="rounded-xl border border-slate-800 bg-slate-900/50 p-4"
                      >

                        <div className="flex flex-col md:flex-row md:items-start gap-3">

                          {/* PRIORITY */}

                          <div className="shrink-0">

                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium ${priorityStyle.badge}`}
                            >
                              <span>
                                {
                                  priorityStyle.icon
                                }
                              </span>

                              {priority}
                            </span>

                          </div>

                          {/* CONTENT */}

                          <div className="min-w-0 flex-1">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="text-sm font-semibold text-slate-200">
                                {
                                  recommendation.title
                                }
                              </h3>

                              {recommendation.category && (
                                <span className="text-[10px] rounded bg-slate-800 px-2 py-1 text-slate-500">
                                  {
                                    recommendation.category
                                  }
                                </span>
                              )}

                            </div>

                            <p className="text-xs text-slate-400 leading-5 mt-2">
                              {
                                recommendation.recommendation
                              }
                            </p>

                          </div>

                        </div>

                      </div>
                    );
                  }
                )}

              </div>

            )}

          </div>

          {/* ================================================
              CONGESTION + SUMMARY
          ================================================ */}

          <div className="grid lg:grid-cols-3 gap-6 mb-6">

            {/* ============================================
                CONGESTION DISTRIBUTION
            ============================================ */}

            <div className="card lg:col-span-1">

              <p className="text-sm font-medium text-slate-200 mb-3">
                Congestion Distribution
              </p>

              {pieData.length === 0 ? (

                <div className="h-[220px] flex items-center justify-center">

                  <p className="text-sm text-slate-500 text-center">
                    No congestion data
                    available for this
                    date.
                  </p>

                </div>

              ) : (

                <>

                  <ResponsiveContainer
                    width="100%"
                    height={220}
                  >

                    <PieChart>

                      <Pie
                        data={pieData}
                        dataKey="value"
                        nameKey="name"
                        innerRadius={45}
                        outerRadius={75}
                        paddingAngle={2}
                      >

                        {pieData.map(
                          (
                            entry
                          ) => (

                            <Cell
                              key={
                                entry.name
                              }
                              fill={getCongestionColor(
                                entry.name
                              )}
                            />

                          )
                        )}

                      </Pie>

                      <Tooltip
                        contentStyle={{
                          background:
                            "#131c30",

                          border:
                            "1px solid #22304a",

                          borderRadius:
                            "8px",
                        }}

                        labelStyle={{
                          color:
                            "#e2e8f0",
                        }}
                      />

                    </PieChart>

                  </ResponsiveContainer>

                  <div className="grid grid-cols-2 gap-2 mt-2">

                    {pieData.map(
                      (
                        entry
                      ) => (

                        <div
                          key={
                            entry.name
                          }
                          className="flex items-center gap-2"
                        >

                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{
                              backgroundColor:
                                getCongestionColor(
                                  entry.name
                                ),
                            }}
                          />

                          <span className="text-xs text-slate-400">
                            {
                              entry.name
                            }
                          </span>

                          <span className="text-xs text-slate-200 ml-auto">
                            {
                              entry.value
                            }
                          </span>

                        </div>

                      )
                    )}

                  </div>

                </>

              )}

            </div>

            {/* ============================================
                DAILY SUMMARY
            ============================================ */}

            <div className="card lg:col-span-2">

              <p className="text-sm font-medium text-slate-200 mb-4">
                Daily Traffic Summary
              </p>

              <div className="grid sm:grid-cols-2 gap-3">

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">

                  <p className="text-xs text-slate-500">
                    Vehicle Volume
                  </p>

                  <p className="text-xl font-semibold text-slate-100 mt-1">
                    {totalVehicleVolume.toLocaleString()}
                  </p>

                  <p className="text-xs text-slate-600 mt-1">
                    Total recorded vehicle
                    count
                  </p>

                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">

                  <p className="text-xs text-slate-500">
                    Average Speed
                  </p>

                  <p className="text-xl font-semibold text-green-400 mt-1">
                    {averageSpeed.toFixed(
                      1
                    )}{" "}
                    km/h
                  </p>

                  <p className="text-xs text-slate-600 mt-1">
                    Across available
                    traffic records
                  </p>

                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">

                  <p className="text-xs text-slate-500">
                    Average Congestion
                  </p>

                  <p className="text-xl font-semibold text-amber-400 mt-1">
                    {averageCongestion.toFixed(
                      1
                    )}
                    %
                  </p>

                  <p className="text-xs text-slate-600 mt-1">
                    Average congestion
                    percentage
                  </p>

                </div>

                <div className="rounded-lg border border-slate-800 bg-slate-900/50 p-4">

                  <p className="text-xs text-slate-500">
                    Incidents
                  </p>

                  <p className="text-xl font-semibold text-red-400 mt-1">
                    {totalIncidents}
                  </p>

                  <p className="text-xs text-slate-600 mt-1">
                    Total reported
                    incidents
                  </p>

                </div>

              </div>

            </div>

          </div>

          {/* ================================================
              PDF
          ================================================ */}

          <div className="card mb-6">

            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-5">

              <div className="max-w-2xl">

                <div className="flex items-center gap-2">

                  <span className="text-xl">
                    📄
                  </span>

                  <p className="text-base font-semibold text-slate-100">
                    TrafficVision AI PDF Report
                  </p>

                </div>

                <p className="text-xs text-slate-500 mt-2 leading-5">
                  Download the complete traffic
                  report including traffic metrics,
                  congestion distribution, traffic
                  trends and AI-generated
                  recommendations.
                </p>

              </div>

              <div className="flex flex-col sm:flex-row gap-3">

                <div>

                  <label className="block text-xs text-slate-500 mb-1">
                    Download Date
                  </label>

                  <input
                    type="date"
                    className="input"
                    value={reportDate}
                    onChange={(e) =>
                      changeReportDate(
                        e.target.value
                      )
                    }
                  />

                </div>

                <button
                  type="button"
                  className="btn-primary"
                  onClick={
                    generatePdf
                  }
                  disabled={
                    pdfLoading ||
                    !reportDate
                  }
                >
                  {pdfLoading
                    ? "Generating PDF..."
                    : "⬇ Download PDF"}
                </button>

              </div>

            </div>

            {pdfError && (
              <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">

                <p className="text-sm text-red-400">
                  {pdfError}
                </p>

              </div>
            )}

            <div className="mt-4 pt-4 border-t border-slate-800">

              <p className="text-xs text-slate-500">

                Selected report:

                {" "}

                <span className="text-slate-300">
                  {formatReportDate(
                    reportDate
                  )}
                </span>

              </p>

              <p className="text-xs text-slate-600 mt-1">
                The PDF includes the AI traffic
                recommendations generated for
                the selected date.
              </p>

            </div>

          </div>

        </>
      )}

      {/* ==================================================
          NO DATA
      ================================================== */}

      {!loading &&
        !reportData && (

          <div className="card">

            <div className="text-center py-10">

              <div className="text-4xl mb-3">
                📊
              </div>

              <p className="text-sm font-medium text-slate-300">
                No report loaded
              </p>

              <p className="text-xs text-slate-500 mt-1">
                No traffic report is
                available for this date.
              </p>

            </div>

          </div>

        )}

      {/* ==================================================
          INFORMATION
      ================================================== */}

      {reportData && (

        <div className="card">

          <div className="flex items-start gap-3">

            <div className="text-lg">
              ℹ️
            </div>

            <div>

              <p className="text-sm font-medium text-slate-300">
                How TrafficVision AI reports work
              </p>

              <p className="text-xs text-slate-500 mt-1 leading-5">
                Traffic information is generated
                from the traffic history recorded
                for the selected day. The AI
                recommendation engine analyzes
                these traffic metrics and generates
                traffic-management recommendations.
              </p>

            </div>

          </div>

        </div>

      )}

    </Layout>
  );
}

