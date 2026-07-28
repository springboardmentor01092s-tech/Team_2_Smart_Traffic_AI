import {
  FaVideo,
  FaRoad,
  FaExclamationTriangle,
  FaAmbulance,
} from "react-icons/fa";

function StatsCards() {
  const cards = [
    {
      title: "Active Cameras",
      value: "1,245 / 1,280",
      color: "#3b82f6",
      icon: <FaVideo />,
    },
    {
      title: "Congested Roads",
      value: "14 / 210",
      color: "#f59e0b",
      icon: <FaRoad />,
    },
    {
      title: "Active Incidents",
      value: "8",
      color: "#ef4444",
      icon: <FaExclamationTriangle />,
    },
    {
      title: "Emergency Alerts",
      value: "2",
      color: "#10b981",
      icon: <FaAmbulance />,
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "20px",
        marginBottom: "25px",
      }}
    >
      {cards.map((card, index) => (
        <div
          key={index}
          style={{
            background: "#fff",
            padding: "20px",
            borderRadius: "12px",
            boxShadow: "0 3px 10px rgba(0,0,0,0.1)",
            borderLeft: `6px solid ${card.color}`,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <h4>{card.title}</h4>
              <h2>{card.value}</h2>
            </div>

            <div
              style={{
                fontSize: "30px",
                color: card.color,
              }}
            >
              {card.icon}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsCards;