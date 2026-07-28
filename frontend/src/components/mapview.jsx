import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";

function MapView() {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: "12px",
        padding: "15px",
        boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        marginTop: "20px",
      }}
    >
      <h2>Live Traffic Monitoring</h2>

      <MapContainer
        center={[22.5726, 88.3639]} // Kolkata
        zoom={12}
        style={{
          height: "450px",
          width: "100%",
          borderRadius: "10px",
        }}
      >
        <TileLayer
          attribution='&copy; OpenStreetMap'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={[22.5726, 88.3639]}>
          <Popup>
            TrafficVision AI <br />
            Kolkata Junction
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default MapView;