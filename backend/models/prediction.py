from datetime import datetime

from extensions import db


class Prediction(db.Model):
    __tablename__ = "predictions"

    id = db.Column(db.Integer, primary_key=True)

    road_id = db.Column(
        db.Integer,
        db.ForeignKey("roads.id")
    )

    requested_by_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id")
    )

    # ==========================================================
    # INPUTS
    # ==========================================================

    hour = db.Column(db.Integer)

    day_of_week = db.Column(db.Integer)

    month = db.Column(db.Integer)

    temperature = db.Column(db.Float)

    rain = db.Column(db.Float)

    snow = db.Column(db.Float)

    clouds = db.Column(db.Float)

    vehicle_count = db.Column(db.Integer)

    # Vehicle speed in km/h
    vehicle_speed = db.Column(db.Float)

    # ==========================================================
    # OUTPUT
    # ==========================================================

    predicted_congestion = db.Column(
        db.String(20)
    )  # low|moderate|heavy

    confidence = db.Column(db.Float)

    estimated_delay_min = db.Column(db.Float)

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        index=True
    )

    road = db.relationship("Road")

    # ==========================================================
    # CONVERT TO JSON
    # ==========================================================

    def to_dict(self):

        return {
            "id": self.id,

            "roadId": self.road_id,

            "roadName": (
                self.road.name
                if self.road
                else None
            ),

            "inputs": {
                "hour": self.hour,

                "dayOfWeek": self.day_of_week,

                "month": self.month,

                "temperature": self.temperature,

                "rain": self.rain,

                "snow": self.snow,

                "clouds": self.clouds,

                "vehicleCount": self.vehicle_count,

                "vehicleSpeed": self.vehicle_speed,
            },

            "predictedCongestion": self.predicted_congestion,

            "confidence": self.confidence,

            "estimatedDelayMin": self.estimated_delay_min,

            "createdAt": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
        }

    