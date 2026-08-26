import React, { useEffect, useState } from "react";
import Layout from "../components/Layout";
import CongestionBadge from "../components/CongestionBadge";
import api from "../services/api";

export default function TrafficHistory() {
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const perPage = 10;

  const [road, setRoad] = useState("");
  const [city, setCity] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [roadSuggestions, setRoadSuggestions] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);

  const [showRoad, setShowRoad] = useState(false);
  const [showCity, setShowCity] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ---------------- LOAD HISTORY ----------------

  const load = async (currentPage = page) => {
    setLoading(true);
    setError("");

    try {
      const { data } = await api.get("/traffic/history", {
        params: {
          road,
          city,
          from: dateFrom,
          to: dateTo,
          page: currentPage,
          perPage,
        },
      });

      setItems(data.items || []);
      setTotal(data.total || 0);
    } catch {
      setError("Could not load traffic history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, []);

  useEffect(() => {
    load(page);
  }, [page]);

  // ---------------- AUTOCOMPLETE ----------------

  const fetchSuggestions = async (text, type) => {
    if (!text.trim()) {
      setRoadSuggestions([]);
      setCitySuggestions([]);
      return;
    }

    try {
      const { data } = await api.get("/traffic/suggestions", {
        params: { q: text },
      });

      if (type === "road") {
        setRoadSuggestions(data.roads || []);
        setShowRoad(true);
      } else {
        setCitySuggestions(data.cities || []);
        setShowCity(true);
      }
    } catch {}
  };

  // ---------------- APPLY FILTER ----------------

  const applyFilters = (e) => {
    e.preventDefault();

    if (page !== 1) setPage(1);

    load(1);
  };

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <Layout
      title="Traffic History"
      subtitle="Historical traffic data, trends & congestion analysis"
    >
      <form
        onSubmit={applyFilters}
        className="card mb-6 grid md:grid-cols-5 gap-3 items-end"
      >
        {/* ROAD */}

        <div className="relative">
          <label className="block text-xs text-slate-500 mb-1">
            Road / Area
          </label>

          <input
            className="input w-full"
            placeholder="Search road..."
            value={road}
            onChange={(e) => {
              setRoad(e.target.value);
              fetchSuggestions(e.target.value, "road");
            }}
            onFocus={() => roadSuggestions.length && setShowRoad(true)}
          />

          {showRoad && roadSuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {roadSuggestions.map((r) => (
                <div
                  key={r.id}
                  onClick={() => {
                    setRoad(r.name);
                    setCity(r.city || "");
                    setShowRoad(false);
                  }}
                  className="px-3 py-2 hover:bg-slate-800 cursor-pointer"
                >
                  <p className="text-white text-sm">{r.name}</p>
                  {r.city && (
                    <p className="text-xs text-slate-400">{r.city}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* CITY */}

        <div className="relative">
          <label className="block text-xs text-slate-500 mb-1">
            City
          </label>

          <input
            className="input w-full"
            placeholder="City"
            value={city}
            onChange={(e) => {
              setCity(e.target.value);
              fetchSuggestions(e.target.value, "city");
            }}
            onFocus={() => citySuggestions.length && setShowCity(true)}
          />

          {showCity && citySuggestions.length > 0 && (
            <div className="absolute z-50 w-full mt-1 bg-slate-900 border border-slate-700 rounded-lg shadow-lg max-h-52 overflow-y-auto">
              {citySuggestions.map((c, i) => (
                <div
                  key={i}
                  onClick={() => {
                    setCity(c);
                    setShowCity(false);
                  }}
                  className="px-3 py-2 hover:bg-slate-800 cursor-pointer text-white text-sm"
                >
                  {c}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FROM */}

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            From
          </label>

          <input
            type="date"
            className="input w-full"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>

        {/* TO */}

        <div>
          <label className="block text-xs text-slate-500 mb-1">
            To
          </label>

          <input
            type="date"
            className="input w-full"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <button className="btn-primary w-full">
          Apply Filters
        </button>
      </form>

      {error && (
        <p className="text-red-400 text-sm mb-4">{error}</p>
      )}

      {/* TABLE */}

      <div className="card overflow-x-auto">
        <table className="w-full text-sm min-w-[750px]">
          <thead>
            <tr className="text-left text-slate-500 border-b border-border">
              <th className="py-3">Date & Time</th>
              <th>Road / Area</th>
              <th>City</th>
              <th>Avg Speed</th>
              <th>Congestion</th>
              <th>Volume</th>
              <th>Incidents</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-slate-400"
                >
                  Loading...
                </td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  className="text-center py-8 text-slate-500"
                >
                  No historical records match these filters.
                </td>
              </tr>
            ) : (
              items.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-border/50 hover:bg-slate-800/30"
                >
                  <td className="py-3">
                    {new Date(r.recordedAt).toLocaleString()}
                  </td>

                  <td>{r.roadName}</td>

                  <td>{r.city || "-"}</td>

                  <td>{r.averageSpeed} km/h</td>

                  <td>
                    <CongestionBadge
                      level={r.congestionLevel}
                    />
                  </td>

                  <td>{r.vehicleCount}</td>

                  <td>{r.incidentsCount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* PAGINATION */}

        <div className="flex justify-between items-center mt-4 text-sm text-slate-500">
          <p>
            Showing {items.length} of {total} records
          </p>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="btn-secondary text-xs px-3 py-1"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Prev
            </button>

            <span>
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              className="btn-secondary text-xs px-3 py-1"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </Layout>
  );
}

