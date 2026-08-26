import React, { useState, useRef, useEffect } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import Layout from "../components/Layout";
import CongestionBadge from "../components/CongestionBadge";
import api from "../services/api";

// ==========================================================
// FIX LEAFLET MARKER ICONS
// ==========================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",

  iconUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",

  shadowUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ==========================================================
// FORMAT SECONDS
// ==========================================================

function formatTravelTime(seconds) {
  if (seconds === null || seconds === undefined || isNaN(seconds)) {
    return "N/A";
  }

  const totalSeconds = Math.max(0, Math.round(Number(seconds)));

  const hours = Math.floor(totalSeconds / 3600);

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const secs = totalSeconds % 60;

  const parts = [];

  if (hours > 0) {
    parts.push(`${hours} hr`);
  }

  if (minutes > 0) {
    parts.push(`${minutes} min`);
  }

  if (secs > 0 || parts.length === 0) {
    parts.push(`${secs} sec`);
  }

  return parts.join(" ");
}

// ==========================================================
// INTERACTIVE MARKER
// ==========================================================

function InteractiveMarker({
  position,
  setPosition,
  fetchTraffic,
}) {
  const markerRef = useRef(null);
  const map = useMap();

  useEffect(() => {
    map.setView(
      [
        position.latitude,
        position.longitude,
      ],
      map.getZoom()
    );
  }, [
    position.latitude,
    position.longitude,
    map,
  ]);

  const updatePlace = async (lat, lng) => {
    let place = "Selected Location";

    let city = null;
    let state = null;
    let country = null;

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );

      const data = await res.json();

      place =
        data.address?.road ||
        data.address?.suburb ||
        data.address?.city ||
        data.display_name ||
        "Selected Location";

      city =
        data.address?.city ||
        data.address?.town ||
        data.address?.municipality ||
        null;

      state =
        data.address?.state ||
        null;

      country =
        data.address?.country ||
        null;
    } catch {}

    setPosition({
      latitude: lat,
      longitude: lng,
      place,
    });

    await fetchTraffic(
      lat,
      lng,
      place,
      city,
      state,
      country
    );
  };

  useMapEvents({
    click(e) {
      updatePlace(
        Number(e.latlng.lat.toFixed(6)),
        Number(e.latlng.lng.toFixed(6))
      );
    },
  });

  return (
    <Marker
      draggable
      ref={markerRef}
      position={[
        position.latitude,
        position.longitude,
      ]}
      eventHandlers={{
        drag: () => {
          const marker = markerRef.current;

          if (!marker) return;

          const p = marker.getLatLng();

          setPosition((prev) => ({
            ...prev,

            latitude:
              Number(p.lat.toFixed(6)),

            longitude:
              Number(p.lng.toFixed(6)),
          }));
        },

        dragend: async () => {
          const marker = markerRef.current;

          if (!marker) return;

          const p = marker.getLatLng();

          await updatePlace(
            Number(p.lat.toFixed(6)),
            Number(p.lng.toFixed(6))
          );
        },
      }}
    >
      <Tooltip
        permanent
        direction="top"
        offset={[0, -35]}
      >
        <div
          style={{
            minWidth: 180,
            fontSize: 12,
            lineHeight: "18px",
          }}
        >
          <div>
            <b>Latitude:</b>{" "}
            {position.latitude}
          </div>

          <div>
            <b>Longitude:</b>{" "}
            {position.longitude}
          </div>

          <div>
            <b>Place:</b>{" "}
            {position.place}
          </div>
        </div>
      </Tooltip>
    </Marker>
  );
}

// ==========================================================
// LIVE MONITORING
// ==========================================================

export default function LiveMonitoring() {
  const [query, setQuery] = useState("");

  const [results, setResults] =
    useState([]);

  const [selected, setSelected] =
    useState(null);

  const [traffic, setTraffic] =
    useState(null);

  const [position, setPosition] =
    useState({
      latitude: 20.5937,
      longitude: 78.9629,
      place: "India",
    });

  const [loading, setLoading] =
    useState(false);

  const [trafficLoading, setTrafficLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // ========================================================
  // FETCH LIVE TRAFFIC
  // ========================================================

  const fetchTraffic = async (
    lat,
    lng,
    name = "Selected Location",
    city = null,
    state = null,
    country = null
  ) => {
    setTrafficLoading(true);
    setError("");

    try {
      const { data } =
        await api.get(
          "/traffic/live",
          {
            params: {
              lat,
              lng,
              name,
              city,
              state,
              country,
            },
          }
        );

      setTraffic(
        data.traffic
      );

      setSelected({
        name,
        latitude: lat,
        longitude: lng,
        city,
        state,
        country,
      });
    } catch {
      setTraffic(null);

      setError(
        "Live traffic data is unavailable for this location."
      );
    } finally {
      setTrafficLoading(false);
    }
  };

  // ========================================================
  // SEARCH
  // ========================================================

  const search = async (e) => {
    if (e) {
      e.preventDefault();
    }

    if (!query.trim()) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const { data } =
        await api.get(
          "/traffic/search",
          {
            params: {
              q: query,
            },
          }
        );

      setResults(
        data.results || []
      );

      if (
        (data.results || [])
          .length === 0
      ) {
        setError(
          "No locations found."
        );
      }
    } catch {
      setError(
        "Search failed."
      );
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // SELECT SEARCH RESULT
  // ========================================================

  const selectResult = async (r) => {
    const lat =
      Number(r.latitude);

    const lng =
      Number(r.longitude);

    setPosition({
      latitude: lat,
      longitude: lng,
      place: r.name,
    });

    await fetchTraffic(
      lat,
      lng,
      r.name,
      r.city,
      r.state,
      r.country
    );
  };

  // ========================================================
  // UI
  // ========================================================

  return (
    <Layout
      title="Live Monitoring"
      subtitle="Search any location and view real-time traffic"
    >
      {/* ==================================================
          SEARCH BAR
      ================================================== */}

      <form
        onSubmit={search}
        className="flex gap-2 mb-4"
      >
        <input
          type="text"
          className="input flex-1"
          placeholder="Search city, road or street..."
          value={query}
          onChange={(e) =>
            setQuery(e.target.value)
          }
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              search(e);
            }
          }}
        />

        <button
          type="submit"
          className="btn-primary"
          disabled={loading}
        >
          {loading
            ? "Searching..."
            : "Search"}
        </button>
      </form>

      {/* ERROR */}

      {error && (
        <p className="text-red-400 text-sm mb-3">
          {error}
        </p>
      )}

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ==================================================
            SEARCH RESULTS
        ================================================== */}

        <div className="card lg:col-span-1 max-h-[520px] overflow-y-auto">

          <h3 className="text-slate-100 font-semibold mb-3">
            Results
          </h3>

          {results.length === 0 ? (
            <p className="text-slate-500 text-sm">
              Search to see locations.
            </p>
          ) : (
            <div className="space-y-2">

              {results.map((r) => (
                <button
                  key={
                    r.tomtomId ||
                    `${r.latitude}-${r.longitude}`
                  }
                  onClick={() =>
                    selectResult(r)
                  }
                  className={`w-full text-left p-3 rounded-lg border ${
                    selected?.name ===
                    r.name
                      ? "border-cyan-400 bg-cyan-500/10"
                      : "border-slate-700 hover:bg-slate-800"
                  }`}
                >
                  <p className="text-white">
                    {r.name}
                  </p>

                  <p className="text-xs text-slate-400">
                    {[
                      r.city,
                      r.state,
                      r.country,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                </button>
              ))}

            </div>
          )}

        </div>

        {/* ==================================================
            MAP + TRAFFIC
        ================================================== */}

        <div className="lg:col-span-2 space-y-4">

          {/* MAP */}

          <div className="card p-0 overflow-hidden h-[360px]">

            <MapContainer
              center={[
                position.latitude,
                position.longitude,
              ]}
              zoom={15}
              scrollWheelZoom
              style={{
                height: "100%",
                width: "100%",
              }}
            >

              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution="© OpenStreetMap contributors"
              />

              <InteractiveMarker
                position={position}
                setPosition={setPosition}
                fetchTraffic={fetchTraffic}
              />

            </MapContainer>

          </div>

          {/* ==================================================
              LIVE COORDINATES
          ================================================== */}

          <div className="card">

            <h3 className="text-slate-100 font-semibold mb-3">
              Live Coordinates
            </h3>

            <div className="grid md:grid-cols-3 gap-4">

              <div className="bg-slate-800 rounded-lg p-3">

                <p className="text-xs text-slate-400">
                  Latitude
                </p>

                <p className="text-green-400 font-bold">
                  {position.latitude.toFixed(6)}
                </p>

              </div>

              <div className="bg-slate-800 rounded-lg p-3">

                <p className="text-xs text-slate-400">
                  Longitude
                </p>

                <p className="text-cyan-400 font-bold">
                  {position.longitude.toFixed(6)}
                </p>

              </div>

              <div className="bg-slate-800 rounded-lg p-3">

                <p className="text-xs text-slate-400">
                  Place
                </p>

                <p className="text-white">
                  {position.place}
                </p>

              </div>

            </div>

          </div>

          {/* ==================================================
              TRAFFIC LOADING
          ================================================== */}

          {trafficLoading && (
            <div className="card">

              <p className="text-cyan-400">
                Loading live traffic...
              </p>

            </div>
          )}

          {/* ==================================================
              TRAFFIC
          ================================================== */}

          {traffic &&
            !trafficLoading && (
              <div className="card">

                {/* HEADER */}

                <div className="flex justify-between items-center mb-4">

                  <h3 className="text-white font-semibold">
                    {selected?.name ||
                      position.place}
                  </h3>

                  <CongestionBadge
                    level={
                      traffic.congestionLevel
                    }
                  />

                </div>

                {/* ==================================================
                    SPEED + CONGESTION
                ================================================== */}

                <div className="grid grid-cols-3 gap-4 mb-5">

                  <div>
                    <p className="text-xs text-slate-400">
                      Current Speed
                    </p>

                    <p className="text-white text-lg font-semibold">
                      {traffic.currentSpeed}{" "}
                      km/h
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Free Flow
                    </p>

                    <p className="text-white text-lg font-semibold">
                      {traffic.freeFlowSpeed}{" "}
                      km/h
                    </p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Congestion
                    </p>

                    <p className="text-white text-lg font-semibold">
                      {traffic.congestionPercent}%
                    </p>
                  </div>

                </div>

                {/* ==================================================
                    TRAVEL TIME
                ================================================== */}

                <div className="border-t border-slate-700 pt-4">

                  <h4 className="text-slate-200 font-semibold mb-3">
                    Travel Time
                  </h4>

                  <div className="grid md:grid-cols-2 gap-4">

                    {/* CURRENT TRAVEL TIME */}

                    <div className="bg-slate-800 rounded-lg p-4">

                      <p className="text-xs text-slate-400 mb-1">
                        Current Travel Time
                      </p>

                      <p className="text-cyan-400 text-xl font-bold">
                        {formatTravelTime(
                          traffic.currentTravelTime
                        )}
                      </p>

                    </div>

                    {/* FREE FLOW TRAVEL TIME */}

                    <div className="bg-slate-800 rounded-lg p-4">

                      <p className="text-xs text-slate-400 mb-1">
                        Free Flow Travel Time
                      </p>

                      <p className="text-green-400 text-xl font-bold">
                        {formatTravelTime(
                          traffic.freeFlowTravelTime
                        )}
                      </p>

                    </div>

                  </div>

                </div>

              </div>
            )}

        </div>

      </div>
    </Layout>
  );
}

