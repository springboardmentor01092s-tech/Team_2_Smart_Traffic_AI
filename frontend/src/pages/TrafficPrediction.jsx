import React, { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import Layout from "../components/Layout";
import CongestionBadge from "../components/CongestionBadge";
import api from "../services/api";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function TrafficPrediction() {
  const now = new Date();

  const [form, setForm] = useState({
    hour: now.getHours(),
    dayOfWeek: now.getDay(),
    month: now.getMonth() + 1,
    temperature: 25,
    rain: 0,
    snow: 0,
    clouds: 0.2,
    vehicleCount: 800,
    vehicleSpeed: 40,
  });

  const [result, setResult] = useState(null);
  const [forecast24, setForecast24] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (field) => (e) => {
    const value = e.target.value;

    setForm((f) => ({
      ...f,
      [field]: value === "" ? "" : Number(value),
    }));

    // Clear old validation error when user starts correcting input
    if (error) {
      setError("");
    }
  };

  const predict = async (e) => {
    e.preventDefault();

    setError("");

    // ======================================================
    // INPUT VALIDATION
    // ======================================================

    // Vehicle Count must be greater than 0
    if (
      form.vehicleCount === "" ||
      form.vehicleCount === null ||
      Number(form.vehicleCount) <= 0
    ) {
      setError(
        "Invalid input. Vehicle Count must be greater than 0."
      );
      return;
    }

    // Vehicle Speed must be greater than 0
    if (
      form.vehicleSpeed === "" ||
      form.vehicleSpeed === null ||
      Number(form.vehicleSpeed) <= 0
    ) {
      setError(
        "Invalid input. Vehicle Speed must be greater than 0."
      );
      return;
    }

    // Hour validation
    if (
      form.hour === "" ||
      Number(form.hour) < 0 ||
      Number(form.hour) > 23
    ) {
      setError(
        "Invalid input. Hour must be between 0 and 23."
      );
      return;
    }

    // Month validation
    if (
      form.month === "" ||
      Number(form.month) < 1 ||
      Number(form.month) > 12
    ) {
      setError(
        "Invalid input. Month must be between 1 and 12."
      );
      return;
    }

    // Rain validation
    if (
      form.rain === "" ||
      Number(form.rain) < 0 ||
      Number(form.rain) > 1
    ) {
      setError(
        "Invalid input. Rain intensity must be between 0 and 1."
      );
      return;
    }

    // Snow validation
    if (
      form.snow === "" ||
      Number(form.snow) < 0 ||
      Number(form.snow) > 1
    ) {
      setError(
        "Invalid input. Snow intensity must be between 0 and 1."
      );
      return;
    }

    // Cloud validation
    if (
      form.clouds === "" ||
      Number(form.clouds) < 0 ||
      Number(form.clouds) > 1
    ) {
      setError(
        "Invalid input. Cloud cover must be between 0 and 1."
      );
      return;
    }

    // Vehicle speed validation
    if (Number(form.vehicleSpeed) > 200) {
      setError(
        "Invalid input. Vehicle Speed cannot exceed 200 km/h."
      );
      return;
    }

    setLoading(true);

    try {
      // ======================================================
      // MAIN PREDICTION
      // ======================================================

      const { data } = await api.post(
        "/prediction/predict",
        form
      );

      setResult(data);

      // ======================================================
      // 24-HOUR FORECAST
      // ======================================================

      const { data: chartData } = await api.get(
        "/prediction/next-24h",
        {
          params: {
            temperature: form.temperature,
            rain: form.rain,
            snow: form.snow,
            clouds: form.clouds,
            vehicleCount: form.vehicleCount,
            vehicleSpeed: form.vehicleSpeed,
          },
        }
      );

      setForecast24(
        chartData.items.map((h) => ({
          hour: `${h.hour}:00`,
          confidence: h.confidence,
          level: h.level,
        }))
      );
    } catch (err) {
      setError(
        err.response?.data?.error ||
          "Prediction failed."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout
      title="Traffic Prediction"
      subtitle="AI-powered forecasting using the trained Random Forest model"
    >
      <div className="grid lg:grid-cols-3 gap-6">

        {/* =====================================================
            INPUT FORM
        ====================================================== */}

        <form
          onSubmit={predict}
          className="card lg:col-span-1 space-y-3"
        >
          <p className="text-sm font-medium text-slate-200 mb-1">
            Prediction Inputs
          </p>

          {/* Hour */}

          <label className="block text-xs text-slate-500">
            Hour (0–23)
          </label>

          <input
            type="number"
            min="0"
            max="23"
            className="input w-full"
            value={form.hour}
            onChange={update("hour")}
            required
          />

          {/* Day */}

          <label className="block text-xs text-slate-500">
            Day of Week
          </label>

          <select
            className="input w-full"
            value={form.dayOfWeek}
            onChange={update("dayOfWeek")}
          >
            {DAYS.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>

          {/* Month */}

          <label className="block text-xs text-slate-500">
            Month (1–12)
          </label>

          <input
            type="number"
            min="1"
            max="12"
            className="input w-full"
            value={form.month}
            onChange={update("month")}
            required
          />

          {/* Temperature */}

          <label className="block text-xs text-slate-500">
            Temperature (°C)
          </label>

          <input
            type="number"
            step="0.1"
            className="input w-full"
            value={form.temperature}
            onChange={update("temperature")}
          />

          {/* Rain */}

          <label className="block text-xs text-slate-500">
            Rain (0–1 intensity)
          </label>

          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            className="input w-full"
            value={form.rain}
            onChange={update("rain")}
          />

          {/* Snow */}

          <label className="block text-xs text-slate-500">
            Snow (0–1 intensity)
          </label>

          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            className="input w-full"
            value={form.snow}
            onChange={update("snow")}
          />

          {/* Cloud */}

          <label className="block text-xs text-slate-500">
            Cloud Cover (0–1)
          </label>

          <input
            type="number"
            step="0.05"
            min="0"
            max="1"
            className="input w-full"
            value={form.clouds}
            onChange={update("clouds")}
          />

          {/* Vehicle Count */}

          <label className="block text-xs text-slate-500">
            Vehicle Count
          </label>

          <input
            type="number"
            min="1"
            className="input w-full"
            value={form.vehicleCount}
            onChange={update("vehicleCount")}
            required
          />

          {/* Vehicle Speed */}

          <label className="block text-xs text-slate-500">
            Vehicle Speed (km/h)
          </label>

          <input
            type="number"
            min="1"
            max="200"
            step="0.1"
            className="input w-full"
            value={form.vehicleSpeed}
            onChange={update("vehicleSpeed")}
            required
          />

          {/* Error */}

          {error && (
            <p className="text-xs text-red-400">
              {error}
            </p>
          )}

          {/* Predict Button */}

          <button
            type="submit"
            className="btn-primary w-full justify-center"
            disabled={loading}
          >
            {loading
              ? "Predicting..."
              : "Predict Congestion"}
          </button>
        </form>

        {/* =====================================================
            RESULTS
        ====================================================== */}

        <div className="lg:col-span-2 space-y-6">

          {/* ===================================================
              PREDICTION RESULT
          ==================================================== */}

          <div className="card">

            <p className="text-sm font-medium text-slate-200 mb-3">
              Prediction Result
            </p>

            {!result ? (
              <p className="text-sm text-slate-500">
                Fill in the inputs and click Predict Congestion.
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-4">

                <div>
                  <p className="text-xs text-slate-500">
                    Predicted Congestion
                  </p>

                  <div className="mt-1">
                    <CongestionBadge
                      level={result.predictedCongestion}
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Model Confidence
                  </p>

                  <p className="text-slate-100 text-lg">
                    {Math.round(
                      result.confidence * 100
                    )}
                    %
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500">
                    Estimated Delay
                  </p>

                  <p className="text-slate-100 text-lg">
                    {result.estimatedDelayMin} min
                  </p>
                </div>

              </div>
            )}

          </div>

          {/* ===================================================
              24-HOUR FORECAST
          ==================================================== */}

          <div className="card">

            <p className="text-sm font-medium text-slate-200 mb-3">
              24-Hour Confidence Forecast
            </p>

            {forecast24.length === 0 ? (
              <p className="text-sm text-slate-500">
                Run a prediction to see the full-day forecast.
              </p>
            ) : (
              <ResponsiveContainer
                width="100%"
                height={240}
              >
                <LineChart data={forecast24}>

                  <CartesianGrid
                    stroke="#22304a"
                    strokeDasharray="3 3"
                  />

                  <XAxis
                    dataKey="hour"
                    stroke="#64748b"
                    fontSize={11}
                    interval={2}
                  />

                  <YAxis
                    stroke="#64748b"
                    fontSize={11}
                    domain={[0, 1]}
                  />

                  <Tooltip
                    contentStyle={{
                      background: "#131c30",
                      border: "1px solid #22304a",
                    }}
                  />

                  <Line
                    type="monotone"
                    dataKey="confidence"
                    stroke="#5b8bff"
                    strokeWidth={2}
                    dot={false}
                  />

                </LineChart>
              </ResponsiveContainer>
            )}

          </div>

        </div>
      </div>
    </Layout>
  );
}

