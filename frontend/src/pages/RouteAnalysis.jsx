import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";

import Layout from "../components/Layout";
import CongestionBadge from "../components/CongestionBadge";
import api from "../services/api";

// ==========================================================
// LOCAL STORAGE KEY
// ==========================================================

const ROUTE_ANALYSIS_STORAGE_KEY =
  "trafficvision_route_analysis";

// ==========================================================
// LEAFLET DEFAULT ICON
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
// CUSTOM LOCATION MARKER
// ==========================================================

function createLocationIcon(location, type) {
  const isSource = type === "source";

  const title = isSource
    ? "SOURCE"
    : "DESTINATION";

  const accent = isSource
    ? "#22c55e"
    : "#ef4444";

  const name = String(
    location?.name || "Location"
  )
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

  const lat = Number(location?.lat);
  const lng = Number(location?.lng);

  return L.divIcon({
    className: "traffic-location-marker",

    iconSize: [190, 135],

    iconAnchor: [95, 135],

    popupAnchor: [0, -135],

    html: `
      <div
        style="
          width:190px;
          height:135px;
          display:flex;
          flex-direction:column;
          align-items:center;
          justify-content:flex-start;
          pointer-events:none;
        "
      >

        <div
          style="
            width:190px;
            box-sizing:border-box;
            background:#0f172a;
            border:1px solid #334155;
            border-radius:9px;
            padding:8px 10px;
            box-shadow:0 5px 16px rgba(0,0,0,0.40);
          "
        >

          <div
            style="
              font-size:9px;
              font-weight:700;
              letter-spacing:0.8px;
              color:${accent};
              text-align:center;
              margin-bottom:3px;
            "
          >
            ${title}
          </div>

          <div
            style="
              color:#f8fafc;
              font-size:11px;
              font-weight:600;
              text-align:center;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
              margin-bottom:5px;
            "
            title="${name}"
          >
            ${name}
          </div>

          <div
            style="
              display:flex;
              justify-content:space-between;
              gap:8px;
              color:#94a3b8;
              font-size:8.5px;
              line-height:14px;
            "
          >

            <span>
              Lat: ${
                Number.isFinite(lat)
                  ? lat.toFixed(6)
                  : "—"
              }
            </span>

            <span>
              Lon: ${
                Number.isFinite(lng)
                  ? lng.toFixed(6)
                  : "—"
              }
            </span>

          </div>

        </div>

        <div
          style="
            width:30px;
            height:30px;
            margin-top:3px;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:28px;
            line-height:30px;
          "
        >
          📍
        </div>

      </div>
    `,
  });
}

// ==========================================================
// MAP FIT
// ==========================================================

function FitRouteBounds({ routes }) {
  const map = useMap();

  useEffect(() => {
    if (!routes || routes.length === 0) {
      return;
    }

    const allPoints = [];

    routes.forEach((route) => {
      getRouteCoordinates(route).forEach(
        (point) => {
          allPoints.push(point);
        }
      );
    });

    if (allPoints.length < 2) {
      return;
    }

    const bounds = L.latLngBounds(
      allPoints.map(([lat, lng]) =>
        L.latLng(lat, lng)
      )
    );

    map.fitBounds(bounds, {
      paddingTopLeft: [40, 140],
      paddingBottomRight: [40, 60],
    });
  }, [routes, map]);

  return null;
}

// ==========================================================
// ROUTE COORDINATES
// ==========================================================

function getRouteCoordinates(route) {
  if (!route) {
    return [];
  }

  if (Array.isArray(route.coordinates)) {
    return route.coordinates
      .map((point) => {
        if (
          Array.isArray(point) &&
          point.length >= 2
        ) {
          const lat = Number(point[0]);
          const lng = Number(point[1]);

          if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
          ) {
            return [lat, lng];
          }
        }

        if (
          point &&
          typeof point === "object"
        ) {
          const lat =
            point.lat ??
            point.latitude;

          const lng =
            point.lng ??
            point.lon ??
            point.longitude;

          const numericLat = Number(lat);
          const numericLng = Number(lng);

          if (
            Number.isFinite(numericLat) &&
            Number.isFinite(numericLng)
          ) {
            return [
              numericLat,
              numericLng,
            ];
          }
        }

        return null;
      })
      .filter(Boolean);
  }

  if (
    route.geometry &&
    Array.isArray(
      route.geometry.coordinates
    )
  ) {
    return route.geometry.coordinates
      .map((point) => {
        if (
          Array.isArray(point) &&
          point.length >= 2
        ) {
          const lng = Number(point[0]);
          const lat = Number(point[1]);

          if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
          ) {
            return [lat, lng];
          }
        }

        return null;
      })
      .filter(Boolean);
  }

  if (Array.isArray(route.points)) {
    return route.points
      .map((point) => {
        if (
          Array.isArray(point) &&
          point.length >= 2
        ) {
          const lat = Number(point[0]);
          const lng = Number(point[1]);

          if (
            Number.isFinite(lat) &&
            Number.isFinite(lng)
          ) {
            return [lat, lng];
          }
        }

        if (
          point &&
          typeof point === "object"
        ) {
          const lat =
            point.latitude ??
            point.lat;

          const lng =
            point.longitude ??
            point.lng ??
            point.lon;

          const numericLat = Number(lat);
          const numericLng = Number(lng);

          if (
            Number.isFinite(numericLat) &&
            Number.isFinite(numericLng)
          ) {
            return [
              numericLat,
              numericLng,
            ];
          }
        }

        return null;
      })
      .filter(Boolean);
  }

  return [];
}

// ==========================================================
// FORMAT DURATION
// ==========================================================

function formatDuration(seconds) {
  if (
    seconds === null ||
    seconds === undefined ||
    !Number.isFinite(Number(seconds))
  ) {
    return "—";
  }

  const totalMinutes = Math.max(
    0,
    Math.round(Number(seconds) / 60)
  );

  const hours = Math.floor(
    totalMinutes / 60
  );

  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }

  return `${minutes} min`;
}

// ==========================================================
// FORMAT DISTANCE
// ==========================================================

function formatDistance(meters) {
  if (
    meters === null ||
    meters === undefined ||
    !Number.isFinite(Number(meters))
  ) {
    return "—";
  }

  const value = Number(meters);

  if (value < 1000) {
    return `${Math.round(value)} m`;
  }

  return `${(value / 1000).toFixed(1)} km`;
}

// ==========================================================
// NORMALIZE ROUTES
// ==========================================================

function normalizeRoutes(data) {
  if (Array.isArray(data)) {
    return data;
  }

  if (Array.isArray(data?.routes)) {
    return data.routes;
  }

  if (Array.isArray(data?.data)) {
    return data.data;
  }

  if (Array.isArray(data?.data?.routes)) {
    return data.data.routes;
  }

  if (Array.isArray(data?.route_summary_json)) {
    return data.route_summary_json;
  }

  return [];
}

// ==========================================================
// DISTANCE
// ==========================================================

function getDistanceMeters(route) {
  return (
    route?.distanceMeters ??
    route?.distance ??
    route?.summary?.lengthInMeters ??
    0
  );
}

// ==========================================================
// TRAVEL TIME
// ==========================================================

function getTravelTimeSeconds(route) {
  return (
    route?.travelTimeSec ??
    route?.travelTimeSeconds ??
    route?.travelTime ??
    route?.summary?.travelTimeInSeconds ??
    0
  );
}

// ==========================================================
// TRAFFIC DELAY
// ==========================================================

function getTrafficDelaySeconds(route) {
  return (
    route?.trafficDelaySec ??
    route?.trafficDelaySeconds ??
    route?.trafficDelay ??
    route?.summary?.trafficDelayInSeconds ??
    0
  );
}

// ==========================================================
// CONGESTION
// ==========================================================

function getCongestion(route) {
  const value =
    route?.congestion ??
    route?.congestionLevel ??
    route?.predictedCongestion ??
    route?.trafficLevel ??
    route?.traffic?.congestionLevel;

  if (!value) {
    const delay =
      getTrafficDelaySeconds(route);

    const travelTime =
      getTravelTimeSeconds(route);

    if (travelTime > 0) {
      const percentage =
        (delay / travelTime) * 100;

      if (percentage < 15) {
        return "Low";
      }

      if (percentage < 35) {
        return "Medium";
      }

      return "High";
    }

    return "Medium";
  }

  const normalized =
    String(value).toLowerCase();

  if (
    normalized === "low" ||
    normalized === "light"
  ) {
    return "Low";
  }

  if (
    normalized === "medium" ||
    normalized === "moderate"
  ) {
    return "Medium";
  }

  if (
    normalized === "high" ||
    normalized === "heavy"
  ) {
    return "High";
  }

  return (
    String(value)
      .charAt(0)
      .toUpperCase() +
    String(value).slice(1)
  );
}

// ==========================================================
// AI PREDICTED TRAVEL TIME
// ==========================================================

function getPredictedTravelTimeSeconds(route) {
  const existing =
    route?.predictedTravelTimeSec ??
    route?.predictedTravelTimeSeconds ??
    route?.predictedTravelTime ??
    route?.aiPredictedTravelTimeSec ??
    route?.aiPredictedTravelTime;

  if (
    existing !== null &&
    existing !== undefined &&
    Number.isFinite(Number(existing))
  ) {
    return Number(existing);
  }

  const base =
    Number(getTravelTimeSeconds(route));

  if (!base || base <= 0) {
    return null;
  }

  const congestion =
    getCongestion(route);

  if (congestion === "Low") {
    return Math.round(base * 1.05);
  }

  if (congestion === "High") {
    return Math.round(base * 1.30);
  }

  return Math.round(base * 1.15);
}

// ==========================================================
// ESTIMATED ARRIVAL
// ==========================================================

function getEstimatedArrival(route) {
  const seconds =
    getTravelTimeSeconds(route);

  if (!seconds || Number(seconds) <= 0) {
    return "—";
  }

  const arrival = new Date(
    Date.now() +
      Number(seconds) * 1000
  );

  return arrival.toLocaleTimeString(
    [],
    {
      hour: "numeric",
      minute: "2-digit",
    }
  );
}

// ==========================================================
// LOAD SAVED ROUTE ANALYSIS
// ==========================================================

function loadSavedRouteAnalysis() {
  try {
    const saved =
      localStorage.getItem(
        ROUTE_ANALYSIS_STORAGE_KEY
      );

    if (!saved) {
      return null;
    }

    const parsed =
      JSON.parse(saved);

    if (!parsed || typeof parsed !== "object") {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error(
      "Could not load saved route analysis:",
      error
    );

    return null;
  }
}

// ==========================================================
// SAVE ROUTE ANALYSIS
// ==========================================================

function saveRouteAnalysis({
  origin,
  destination,
  selectedOrigin,
  selectedDestination,
  routes,
  selectedRouteIndex,
}) {
  try {
    localStorage.setItem(
      ROUTE_ANALYSIS_STORAGE_KEY,
      JSON.stringify({
        origin,
        destination,
        selectedOrigin,
        selectedDestination,
        routes,
        selectedRouteIndex,
      })
    );
  } catch (error) {
    console.error(
      "Could not save route analysis:",
      error
    );
  }
}

// ==========================================================
// COMPONENT
// ==========================================================

export default function RouteAnalysis() {
  const [origin, setOrigin] =
    useState("");

  const [destination, setDestination] =
    useState("");

  const [
    originSuggestions,
    setOriginSuggestions,
  ] = useState([]);

  const [
    destinationSuggestions,
    setDestinationSuggestions,
  ] = useState([]);

  const [
    selectedOrigin,
    setSelectedOrigin,
  ] = useState(null);

  const [
    selectedDestination,
    setSelectedDestination,
  ] = useState(null);

  const [
    searchingOrigin,
    setSearchingOrigin,
  ] = useState(false);

  const [
    searchingDestination,
    setSearchingDestination,
  ] = useState(false);

  const [routes, setRoutes] =
    useState([]);

  const [
    selectedRouteIndex,
    setSelectedRouteIndex,
  ] = useState(0);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  // ========================================================
  // RESTORE ROUTE AFTER RETURNING TO PAGE
  // ========================================================

  useEffect(() => {
    const saved =
      loadSavedRouteAnalysis();

    if (!saved) {
      return;
    }

    if (
      typeof saved.origin === "string"
    ) {
      setOrigin(saved.origin);
    }

    if (
      typeof saved.destination === "string"
    ) {
      setDestination(
        saved.destination
      );
    }

    if (
      saved.selectedOrigin &&
      Number.isFinite(
        Number(saved.selectedOrigin.lat)
      ) &&
      Number.isFinite(
        Number(saved.selectedOrigin.lng)
      )
    ) {
      setSelectedOrigin(
        saved.selectedOrigin
      );
    }

    if (
      saved.selectedDestination &&
      Number.isFinite(
        Number(saved.selectedDestination.lat)
      ) &&
      Number.isFinite(
        Number(saved.selectedDestination.lng)
      )
    ) {
      setSelectedDestination(
        saved.selectedDestination
      );
    }

    if (
      Array.isArray(saved.routes) &&
      saved.routes.length > 0
    ) {
      setRoutes(saved.routes);
    }

    if (
      Number.isInteger(
        saved.selectedRouteIndex
      )
    ) {
      setSelectedRouteIndex(
        saved.selectedRouteIndex
      );
    }
  }, []);

  // ========================================================
  // SAVE SELECTED ROUTE WHEN USER CHANGES IT
  // ========================================================

  useEffect(() => {
    if (!routes.length) {
      return;
    }

    if (
      !selectedOrigin ||
      !selectedDestination
    ) {
      return;
    }

    saveRouteAnalysis({
      origin,
      destination,
      selectedOrigin,
      selectedDestination,
      routes,
      selectedRouteIndex,
    });
  }, [
    origin,
    destination,
    selectedOrigin,
    selectedDestination,
    routes,
    selectedRouteIndex,
  ]);

  // ========================================================
  // MAP CENTER
  // ========================================================

  const mapCenter = useMemo(() => {
    if (
      selectedOrigin?.lat != null &&
      selectedOrigin?.lng != null
    ) {
      return [
        Number(selectedOrigin.lat),
        Number(selectedOrigin.lng),
      ];
    }

    return [
      12.9716,
      77.5946,
    ];
  }, [selectedOrigin]);

  // ========================================================
  // SEARCH
  // ========================================================

  const searchLocation = async (
    value,
    type
  ) => {
    if (!value.trim()) {
      if (type === "origin") {
        setOriginSuggestions([]);
      } else {
        setDestinationSuggestions([]);
      }

      return;
    }

    if (type === "origin") {
      setSearchingOrigin(true);
    } else {
      setSearchingDestination(true);
    }

    try {
      const { data } =
        await api.get(
          "/traffic/search",
          {
            params: {
              q: value.trim(),
            },
          }
        );

      const results =
        Array.isArray(data)
          ? data
          : data?.results ||
            data?.data ||
            [];

      if (type === "origin") {
        setOriginSuggestions(
          results.slice(0, 5)
        );
      } else {
        setDestinationSuggestions(
          results.slice(0, 5)
        );
      }
    } catch (err) {
      console.error(
        "Location search error:",
        err
      );

      if (type === "origin") {
        setOriginSuggestions([]);
      } else {
        setDestinationSuggestions([]);
      }
    } finally {
      if (type === "origin") {
        setSearchingOrigin(false);
      } else {
        setSearchingDestination(false);
      }
    }
  };

  // ========================================================
  // SELECT LOCATION
  // ========================================================

  const selectLocation = (
    item,
    type
  ) => {
    if (!item) return;

    let lat =
      item?.lat ??
      item?.latitude ??
      item?.position?.lat ??
      item?.location?.lat;

    let lng =
      item?.lng ??
      item?.lon ??
      item?.longitude ??
      item?.position?.lon ??
      item?.location?.lon;

    const name =
      item?.name ||
      item?.address?.freeformAddress ||
      item?.displayName ||
      item?.label ||
      "Selected Location";

    lat = Number(lat);
    lng = Number(lng);

    if (
      !Number.isFinite(lat) ||
      !Number.isFinite(lng)
    ) {
      setError(
        "The selected location does not contain valid coordinates."
      );

      return;
    }

    const location = {
      name,
      lat,
      lng,
    };

    if (type === "origin") {
      setOrigin(name);
      setSelectedOrigin(location);
      setOriginSuggestions([]);
    } else {
      setDestination(name);
      setSelectedDestination(location);
      setDestinationSuggestions([]);
    }

    setError("");
  };

  // ========================================================
  // CALCULATE ROUTES
  // ========================================================

  const calculateRoutes = async (e) => {
    e?.preventDefault();

    setError("");

    if (!origin.trim()) {
      setError(
        "Please enter an origin."
      );
      return;
    }

    if (!destination.trim()) {
      setError(
        "Please enter a destination."
      );
      return;
    }

    if (
      !selectedOrigin ||
      !selectedDestination
    ) {
      setError(
        "Please select the origin and destination from the search suggestions."
      );

      return;
    }

    setLoading(true);

    try {
      const { data } =
        await api.post(
          "/routes/calculate",
          {
            origin: {
              name:
                selectedOrigin.name,
              lat:
                selectedOrigin.lat,
              lng:
                selectedOrigin.lng,
            },

            destination: {
              name:
                selectedDestination.name,
              lat:
                selectedDestination.lat,
              lng:
                selectedDestination.lng,
            },

            avoidTolls: false,
            avoidHighways: false,
            maxAlternatives: 2,
          }
        );

      const normalized =
        normalizeRoutes(data);

      if (normalized.length === 0) {
        setRoutes([]);

        setError(
          "No routes were found between the selected locations."
        );

        return;
      }

      const newRoutes =
        normalized.slice(0, 3);

      setRoutes(newRoutes);
      setSelectedRouteIndex(0);

      // ----------------------------------------------------
      // IMPORTANT:
      // SAVE ROUTE IMMEDIATELY
      // SO IT DOES NOT DISAPPEAR WHEN CHANGING UI/PAGE
      // ----------------------------------------------------

      saveRouteAnalysis({
        origin,
        destination,
        selectedOrigin,
        selectedDestination,
        routes: newRoutes,
        selectedRouteIndex: 0,
      });
    } catch (err) {
      console.error(
        "Route calculation error:",
        err
      );

      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Could not calculate routes.";

      setError(message);
      setRoutes([]);
    } finally {
      setLoading(false);
    }
  };

  // ========================================================
  // CURRENT LOCATION
  // ========================================================

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setError(
        "Geolocation is not supported by this browser."
      );

      return;
    }

    setError("");

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat =
          position.coords.latitude;

        const lng =
          position.coords.longitude;

        try {
          const { data } =
            await api.get(
              "/traffic/search",
              {
                params: {
                  lat,
                  lng,
                },
              }
            );

          const result =
            Array.isArray(data)
              ? data[0]
              : data?.results?.[0] ||
                data?.data?.[0];

          const name =
            result?.name ||
            result?.address
              ?.freeformAddress ||
            "Current Location";

          setOrigin(name);

          setSelectedOrigin({
            name,
            lat,
            lng,
          });

          setOriginSuggestions([]);
        } catch {
          setOrigin(
            "Current Location"
          );

          setSelectedOrigin({
            name:
              "Current Location",
            lat,
            lng,
          });
        }
      },
      () => {
        setError(
          "Unable to access your current location. Please allow location access in your browser."
        );
      }
    );
  };

  // ========================================================
  // CLEAR
  // ========================================================

  const clearAll = () => {
    setOrigin("");
    setDestination("");

    setSelectedOrigin(null);
    setSelectedDestination(null);

    setOriginSuggestions([]);
    setDestinationSuggestions([]);

    setRoutes([]);
    setSelectedRouteIndex(0);

    setError("");

    // ------------------------------------------------------
    // ONLY CLEARING THE BUTTON REMOVES SAVED ROUTE
    // ------------------------------------------------------

    localStorage.removeItem(
      ROUTE_ANALYSIS_STORAGE_KEY
    );
  };

  // ========================================================
  // ROUTE LINES
  // ========================================================

  const routeLines = useMemo(
    () =>
      routes.map((route) =>
        getRouteCoordinates(route)
      ),
    [routes]
  );

  // ========================================================
  // RENDER
  // ========================================================

  return (
    <Layout
      title="Route Analysis"
      subtitle="Compare routes using live traffic and AI predicted travel time"
    >

      {/* ==================================================
          SEARCH CARD
      ================================================== */}

      <div className="card mb-6">

        <form
          onSubmit={calculateRoutes}
        >

          <div className="grid lg:grid-cols-2 gap-4">

            {/* ORIGIN */}

            <div className="relative">

              <label className="block text-xs text-slate-400 mb-2">
                Origin
              </label>

              <div className="flex gap-2">

                <input
                  className="input flex-1"
                  placeholder="Enter origin"
                  value={origin}
                  onChange={(e) => {
                    const value =
                      e.target.value;

                    setOrigin(value);

                    setSelectedOrigin(null);

                    searchLocation(
                      value,
                      "origin"
                    );
                  }}
                />

                <button
                  type="button"
                  className="px-3 rounded-lg border border-slate-700 bg-slate-900 hover:bg-slate-800 text-sm"
                  onClick={
                    useCurrentLocation
                  }
                  title="Use current location"
                >
                  📍
                </button>

              </div>

              {searchingOrigin && (
                <p className="text-xs text-slate-500 mt-1">
                  Searching...
                </p>
              )}

              {originSuggestions.length >
                0 && (
                <div className="absolute z-[1000] left-0 right-0 mt-1 rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">

                  {originSuggestions.map(
                    (
                      item,
                      index
                    ) => (
                      <button
                        type="button"
                        key={
                          item.id ||
                          item.entityId ||
                          index
                        }
                        className="w-full text-left px-3 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-0"
                        onClick={() =>
                          selectLocation(
                            item,
                            "origin"
                          )
                        }
                      >

                        <p className="text-sm text-slate-200">
                          {item.name ||
                            item.address
                              ?.freeformAddress ||
                            "Location"}
                        </p>

                        {item.address
                          ?.freeformAddress && (
                          <p className="text-xs text-slate-500 mt-1">
                            {
                              item
                                .address
                                .freeformAddress
                            }
                          </p>
                        )}

                      </button>
                    )
                  )}

                </div>
              )}

              {selectedOrigin && (
                <p className="text-xs text-green-400 mt-2">
                  ✓ Location selected
                </p>
              )}

            </div>

            {/* DESTINATION */}

            <div className="relative">

              <label className="block text-xs text-slate-400 mb-2">
                Destination
              </label>

              <input
                className="input w-full"
                placeholder="Enter destination"
                value={destination}
                onChange={(e) => {
                  const value =
                    e.target.value;

                  setDestination(value);

                  setSelectedDestination(
                    null
                  );

                  searchLocation(
                    value,
                    "destination"
                  );
                }}
              />

              {searchingDestination && (
                <p className="text-xs text-slate-500 mt-1">
                  Searching...
                </p>
              )}

              {destinationSuggestions.length >
                0 && (
                <div className="absolute z-[1000] left-0 right-0 mt-1 rounded-lg border border-slate-700 bg-slate-900 shadow-xl overflow-hidden">

                  {destinationSuggestions.map(
                    (
                      item,
                      index
                    ) => (
                      <button
                        type="button"
                        key={
                          item.id ||
                          item.entityId ||
                          index
                        }
                        className="w-full text-left px-3 py-3 hover:bg-slate-800 border-b border-slate-800 last:border-0"
                        onClick={() =>
                          selectLocation(
                            item,
                            "destination"
                          )
                        }
                      >

                        <p className="text-sm text-slate-200">
                          {item.name ||
                            item.address
                              ?.freeformAddress ||
                            "Location"}
                        </p>

                        {item.address
                          ?.freeformAddress && (
                          <p className="text-xs text-slate-500 mt-1">
                            {
                              item
                                .address
                                .freeformAddress
                            }
                          </p>
                        )}

                      </button>
                    )
                  )}

                </div>
              )}

              {selectedDestination && (
                <p className="text-xs text-green-400 mt-2">
                  ✓ Location selected
                </p>
              )}

            </div>

          </div>

          {/* ACTIONS */}

          <div className="flex gap-3 mt-4">

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
            >
              {loading
                ? "Analyzing Routes..."
                : "Analyze Routes"}
            </button>

            <button
              type="button"
              className="px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800"
              onClick={clearAll}
            >
              Clear
            </button>

          </div>

        </form>

        {error && (
          <div className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">

            <p className="text-sm text-red-400">
              {error}
            </p>

          </div>
        )}

      </div>

      {/* ==================================================
          MAP
      ================================================== */}

      <div className="card mb-6 p-0 overflow-hidden">

        <div className="px-4 py-3 border-b border-slate-800">

          <p className="text-sm font-medium text-slate-200">
            Route Map
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Live route comparison and
            traffic-aware alternatives
          </p>

        </div>

        <div className="h-[420px] relative">

          <MapContainer
            center={mapCenter}
            zoom={8}
            scrollWheelZoom={true}
            className="h-full w-full"
          >

            <TileLayer
              attribution="&copy; OpenStreetMap contributors"
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <FitRouteBounds
              routes={routes}
            />

            {/* SOURCE */}

            {selectedOrigin && (
              <Marker
                position={[
                  Number(
                    selectedOrigin.lat
                  ),
                  Number(
                    selectedOrigin.lng
                  ),
                ]}
                icon={createLocationIcon(
                  selectedOrigin,
                  "source"
                )}
              />
            )}

            {/* DESTINATION */}

            {selectedDestination && (
              <Marker
                position={[
                  Number(
                    selectedDestination.lat
                  ),
                  Number(
                    selectedDestination.lng
                  ),
                ]}
                icon={createLocationIcon(
                  selectedDestination,
                  "destination"
                )}
              />
            )}

            {/* ROUTES */}

            {routeLines.map(
              (
                coordinates,
                index
              ) => {

                if (
                  coordinates.length < 2
                ) {
                  return null;
                }

                const isRecommended =
                  index === 0;

                const isSelected =
                  index ===
                  selectedRouteIndex;

                return (
                  <Polyline
                    key={index}
                    positions={
                      coordinates
                    }
                    pathOptions={{
                      color:
                        isRecommended
                          ? "#22c55e"
                          : "#ef4444",

                      weight:
                        isSelected
                          ? 6
                          : 5,

                      opacity:
                        isSelected
                          ? 1
                          : 0.75,
                    }}
                    eventHandlers={{
                      click: () =>
                        setSelectedRouteIndex(
                          index
                        ),
                    }}
                  />
                );
              }
            )}

          </MapContainer>

          {/* MAP LEGEND */}

          {routes.length > 0 && (
            <div className="absolute bottom-4 left-4 z-[1000] rounded-lg bg-slate-950/95 border border-slate-700 px-3 py-2 shadow-lg">

              <div className="flex items-center gap-4 text-[11px]">

                <div className="flex items-center gap-2">

                  <span className="w-7 h-[4px] rounded bg-green-500" />

                  <span className="text-slate-300">
                    Recommended
                  </span>

                </div>

                <div className="flex items-center gap-2">

                  <span className="w-7 h-[4px] rounded bg-red-500" />

                  <span className="text-slate-300">
                    Alternative
                  </span>

                </div>

              </div>

            </div>
          )}

        </div>
      </div>

      {/* ==================================================
          AVAILABLE ROUTES
      ================================================== */}

      {routes.length > 0 && (
        <div className="space-y-4 mb-6">

          <div>

            <h2 className="text-base font-semibold text-slate-100">
              Available Routes
            </h2>

            <p className="text-xs text-slate-500 mt-1">
              Compare traffic-aware
              alternatives and choose
              the route that best fits
              your journey.
            </p>

          </div>

          {routes.map(
            (
              route,
              index
            ) => {

              const distanceMeters =
                getDistanceMeters(
                  route
                );

              const travelTimeSec =
                getTravelTimeSeconds(
                  route
                );

              const trafficDelaySec =
                getTrafficDelaySeconds(
                  route
                );

              const predictedTravelTimeSec =
                getPredictedTravelTimeSeconds(
                  route
                );

              const congestion =
                getCongestion(route);

              const isSelected =
                selectedRouteIndex ===
                index;

              return (
                <div
                  key={index}
                  className={`card transition ${
                    isSelected
                      ? "ring-1 ring-blue-500/50"
                      : ""
                  }`}
                >

                  {/* ROUTE HEADER */}

                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">

                    <div>

                      <div className="flex items-center gap-2">

                        <h3 className="text-base font-semibold text-slate-100">
                          Route{" "}
                          {index + 1}
                        </h3>

                        {index === 0 && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-green-500/10 text-green-400 border border-green-500/20">
                            Recommended
                          </span>
                        )}

                        {isSelected && (
                          <span className="text-[10px] px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                            Selected
                          </span>
                        )}

                      </div>

                      <p className="text-xs text-slate-500 mt-1">
                        {selectedOrigin?.name}{" "}
                        →{" "}
                        {selectedDestination?.name}
                      </p>

                    </div>

                    <CongestionBadge
                      level={congestion}
                    />

                  </div>

                  {/* ROUTE METRICS */}

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">

                    <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-3">

                      <p className="text-[11px] text-slate-500">
                        Distance
                      </p>

                      <p className="text-sm font-semibold text-slate-200 mt-1">
                        {formatDistance(
                          distanceMeters
                        )}
                      </p>

                    </div>

                    <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-3">

                      <p className="text-[11px] text-slate-500">
                        Travel Time
                      </p>

                      <p className="text-sm font-semibold text-slate-200 mt-1">
                        {formatDuration(
                          travelTimeSec
                        )}
                      </p>

                    </div>

                    <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-3">

                      <p className="text-[11px] text-slate-500">
                        Traffic Delay
                      </p>

                      <p className="text-sm font-semibold text-amber-400 mt-1">
                        {formatDuration(
                          trafficDelaySec
                        )}
                      </p>

                    </div>

                    <div className="rounded-lg bg-slate-900/60 border border-slate-800 p-3">

                      <p className="text-[11px] text-slate-500">
                        Estimated Arrival
                      </p>

                      <p className="text-sm font-semibold text-slate-200 mt-1">
                        {getEstimatedArrival(
                          route
                        )}
                      </p>

                    </div>

                  </div>

                  {/* CONGESTION + AI */}

                  <div className="grid md:grid-cols-2 gap-3 mt-3">

                    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4">

                      <p className="text-[11px] text-slate-500">
                        Congestion
                      </p>

                      <div className="flex items-center gap-2 mt-2">

                        <span
                          className={`w-2.5 h-2.5 rounded-full ${
                            congestion ===
                            "Low"
                              ? "bg-green-500"
                              : congestion ===
                                "High"
                              ? "bg-red-500"
                              : "bg-yellow-500"
                          }`}
                        />

                        <p
                          className={`text-sm font-semibold ${
                            congestion ===
                            "Low"
                              ? "text-green-400"
                              : congestion ===
                                "High"
                              ? "text-red-400"
                              : "text-yellow-400"
                          }`}
                        >
                          {congestion}
                        </p>

                      </div>

                    </div>

                    <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">

                      <p className="text-[11px] text-blue-400">
                        AI Predicted Travel Time
                      </p>

                      <p className="text-lg font-semibold text-slate-100 mt-1">
                        {formatDuration(
                          predictedTravelTimeSec
                        )}
                      </p>

                    </div>

                  </div>

                  {/* SELECT */}

                  <div className="flex gap-2 mt-4">

                    <button
                      type="button"
                      className={
                        isSelected
                          ? "btn-primary"
                          : "px-4 py-2 rounded-lg border border-slate-700 text-sm text-slate-300 hover:bg-slate-800"
                      }
                      onClick={() =>
                        setSelectedRouteIndex(
                          index
                        )
                      }
                    >
                      {isSelected
                        ? "✓ Selected Route"
                        : "Select Route"}
                    </button>

                  </div>

                </div>
              );
            }
          )}

        </div>
      )}

      {/* ==================================================
          EMPTY STATE
      ================================================== */}

      {!loading &&
        routes.length === 0 && (
          <div className="card">

            <div className="text-center py-8">

              <div className="text-3xl mb-3">
                🗺️
              </div>

              <p className="text-sm font-medium text-slate-300">
                Route analysis
              </p>

              <p className="text-xs text-slate-500 mt-1">
                Enter an origin and
                destination to compare
                traffic-aware routes.
              </p>

            </div>

          </div>
        )}

    </Layout>
  );
}

