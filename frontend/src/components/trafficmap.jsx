import { useEffect } from "react";
import "../styles/trafficmap.css";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function ChangeView({ center }) {
  const map = useMap();
  useEffect(() => {
    if (center) {
      map.setView(center, 12, { animate: true, duration: 1.5 });
    }
  }, [center, map]);
  return null;
}

export default function TrafficMap({ trafficData = [], focusedLocation = null }) {
  const getColor = (level) => {
    switch (level) {
      case "Low":
        return "#10b981"; // Green
      case "Moderate":
        return "#f59e0b"; // Yellow/Amber
      case "High":
        return "#ea580c"; // Orange
      case "Critical":
        return "#ef4444"; // Red
      default:
        return "#3b82f6"; // Blue
    }
  };

  return (
    <div className="traffic-map">
      <MapContainer
        center={[21.0, 78.0]}
        zoom={5}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%", borderRadius: "12px" }}
      >
        <ChangeView center={focusedLocation} />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {trafficData.map((item) => {
          if (item.latitude === undefined || item.longitude === undefined) {
            return null;
          }

          return (
            <div key={item.id}>
              {/* Core Coordinate Marker */}
              <Marker position={[item.latitude, item.longitude]}>
                <Popup>
                  <div style={{ color: "#0f172a", fontFamily: "Inter, sans-serif", fontSize: "12px" }}>
                    <strong style={{ fontSize: "14px" }}>{item.location}</strong>
                    <br />
                    Roadway: <strong>{item.road_name}</strong>
                    <br />
                    Flow Rate: <strong>{item.vehicle_count} vehicles</strong>
                    <br />
                    Average Speed: <strong>{item.average_speed} km/h</strong>
                    <br />
                    Density Status: <strong style={{ color: getColor(item.congestion_level) }}>{item.congestion_level}</strong>
                  </div>
                </Popup>
              </Marker>

              {/* Congestion Range Overlay Ring */}
              <Circle
                center={[item.latitude, item.longitude]}
                pathOptions={{
                  color: getColor(item.congestion_level),
                  fillColor: getColor(item.congestion_level),
                  fillOpacity: 0.2,
                  weight: 1.5
                }}
                radius={25000} // Radius in meters (25 km visual range)
              />
            </div>
          );
        })}
      </MapContainer>
    </div>
  );
}
