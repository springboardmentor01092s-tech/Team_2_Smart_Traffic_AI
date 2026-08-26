import React, { useEffect, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
} from "react-leaflet";

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";

import api from "../services/api";


/*
 * ==========================================================
 * HEATMAP LAYER
 * ==========================================================
 */

function HeatLayer({ points }) {
  const map = useMap();
  const heatLayerRef = useRef(null);

  useEffect(() => {
    if (!map) {
      return;
    }

    /*
     * Remove previous heat layer.
     */
    if (heatLayerRef.current) {
      map.removeLayer(
        heatLayerRef.current
      );

      heatLayerRef.current = null;
    }

    /*
     * No points.
     */
    if (!points || points.length === 0) {
      return;
    }

    /*
     * Convert backend points:
     *
     * [latitude, longitude, intensity]
     */
    const heatPoints = points
      .filter(
        (point) =>
          Number.isFinite(
            Number(point.lat)
          ) &&
          Number.isFinite(
            Number(point.lng)
          )
      )
      .map((point) => [
        Number(point.lat),
        Number(point.lng),
        Math.max(
          0,
          Math.min(
            1,
            Number(point.intensity) || 0
          )
        ),
      ]);

    if (heatPoints.length === 0) {
      return;
    }

    /*
     * Create Leaflet heatmap.
     */
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

    /*
     * Cleanup.
     */
    return () => {
      if (
        heatLayerRef.current
      ) {
        map.removeLayer(
          heatLayerRef.current
        );

        heatLayerRef.current = null;
      }
    };
  }, [map, points]);

  return null;
}


/*
 * ==========================================================
 * MAP CENTER
 * ==========================================================
 */

function MapCenter({ points }) {
  const map = useMap();

  useEffect(() => {
    if (
      !points ||
      points.length === 0
    ) {
      return;
    }

    const validPoints =
      points.filter(
        (point) =>
          Number.isFinite(
            Number(point.lat)
          ) &&
          Number.isFinite(
            Number(point.lng)
          )
      );

    if (
      validPoints.length === 0
    ) {
      return;
    }

    const bounds =
      L.latLngBounds(
        validPoints.map(
          (point) => [
            Number(point.lat),
            Number(point.lng),
          ]
        )
      );

    if (bounds.isValid()) {
      map.fitBounds(
        bounds,
        {
          padding: [30, 30],
          maxZoom: 13,
        }
      );
    }
  }, [map, points]);

  return null;
}


/*
 * ==========================================================
 * TRAFFIC HEATMAP
 * ==========================================================
 */

export default function TrafficHeatmap() {
  const [points, setPoints] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  /*
   * Load real traffic heatmap
   * data from backend.
   */
  const loadHeatmap =
    async () => {
      try {
        setError("");

        const response =
          await api.get(
            "/analytics/heatmap"
          );

        const received =
          response?.data?.points;

        setPoints(
          Array.isArray(received)
            ? received
            : []
        );
      } catch (err) {
        console.error(
          "Heatmap loading error:",
          err
        );

        setError(
          err?.response?.data?.error ||
            "Could not load traffic heatmap."
        );
      } finally {
        setLoading(false);
      }
    };

  /*
   * Initial load + automatic refresh.
   */
  useEffect(() => {
    loadHeatmap();

    const interval =
      setInterval(
        loadHeatmap,
        60 * 1000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, []);

  /*
   * Default India view.
   *
   * If real traffic points are
   * available, MapCenter will
   * automatically move the map
   * to those points.
   */
  const defaultCenter = [
    20.5937,
    78.9629,
  ];

  return (
    <div className="card mt-6">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 mb-4">

        <div>
          <p className="text-sm font-medium text-slate-200">
            Traffic Congestion Heatmap
          </p>

          <p className="text-xs text-slate-500 mt-1">
            Live traffic observations
            recorded by TrafficVision AI
          </p>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-500">

          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-green-500" />
            Low
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-yellow-500" />
            Moderate
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-orange-500" />
            High
          </div>

          <div className="flex items-center gap-1">
            <span className="w-3 h-3 rounded-full bg-red-500" />
            Severe
          </div>

        </div>

      </div>


      {loading ? (

        <div className="h-[450px] flex items-center justify-center rounded-lg bg-slate-900">

          <div className="flex items-center gap-3">

            <div className="w-4 h-4 border-2 border-slate-600 border-t-blue-400 rounded-full animate-spin" />

            <p className="text-sm text-slate-500">
              Loading traffic heatmap...
            </p>

          </div>

        </div>

      ) : error ? (

        <div className="h-[450px] flex items-center justify-center rounded-lg bg-slate-900">

          <div className="text-center">

            <p className="text-sm text-red-400">
              {error}
            </p>

            <button
              type="button"
              onClick={loadHeatmap}
              className="btn-primary mt-3"
            >
              Retry
            </button>

          </div>

        </div>

      ) : (

        <div className="relative">

          <MapContainer
            center={defaultCenter}
            zoom={5}
            scrollWheelZoom={true}
            className="h-[450px] w-full rounded-lg"
          >

            <TileLayer
              attribution='&copy; OpenStreetMap contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <HeatLayer
              points={points}
            />

            <MapCenter
              points={points}
            />

          </MapContainer>


          {points.length === 0 && (

            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">

              <div className="rounded-lg bg-slate-950/90 border border-slate-700 px-5 py-4 text-center">

                <p className="text-sm text-slate-300">
                  No traffic observations available yet.
                </p>

                <p className="text-xs text-slate-500 mt-1">
                  Search a location in Live
                  Monitoring to collect traffic data.
                </p>

              </div>

            </div>

          )}

        </div>

      )}

    </div>
  );
}

