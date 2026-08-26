from datetime import datetime
from extensions import db


class RouteSearch(db.Model):
    __tablename__ = "route_searches"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"))

    origin_name = db.Column(db.String(255))
    origin_lat = db.Column(db.Float)
    origin_lng = db.Column(db.Float)

    destination_name = db.Column(db.String(255))
    destination_lat = db.Column(db.Float)
    destination_lng = db.Column(db.Float)

    distance_km = db.Column(db.Float)
    travel_time_min = db.Column(db.Float)
    traffic_delay_min = db.Column(db.Float)
    route_summary_json = db.Column(db.JSON)  # raw alternates payload for redisplay

    is_saved = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            "id": self.id,
            "origin": {"name": self.origin_name, "lat": self.origin_lat, "lng": self.origin_lng},
            "destination": {
                "name": self.destination_name,
                "lat": self.destination_lat,
                "lng": self.destination_lng,
            },
            "distanceKm": self.distance_km,
            "travelTimeMin": self.travel_time_min,
            "trafficDelayMin": self.traffic_delay_min,
            "routes": self.route_summary_json,
            "isSaved": self.is_saved,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
