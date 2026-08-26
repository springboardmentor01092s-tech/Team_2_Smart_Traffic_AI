from datetime import datetime

from extensions import db


class SavedRouteReport(db.Model):
    """
    Stores routes explicitly selected using
    "Add to Report" from Route Analysis.

    A saved route belongs to:
    - the logged-in user
    - a specific report date

    These routes are later included in the
    TrafficVision AI PDF report.
    """

    __tablename__ = "saved_route_reports"

    # ==========================================================
    # PRIMARY KEY
    # ==========================================================

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    # ==========================================================
    # USER
    # ==========================================================

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    # ==========================================================
    # REPORT DATE
    # ==========================================================

    report_date = db.Column(
        db.Date,
        nullable=False,
        index=True,
    )

    # ==========================================================
    # ORIGIN
    # ==========================================================

    origin_name = db.Column(
        db.String(255),
        nullable=False,
    )

    origin_lat = db.Column(
        db.Float,
        nullable=True,
    )

    origin_lng = db.Column(
        db.Float,
        nullable=True,
    )

    # ==========================================================
    # DESTINATION
    # ==========================================================

    destination_name = db.Column(
        db.String(255),
        nullable=False,
    )

    destination_lat = db.Column(
        db.Float,
        nullable=True,
    )

    destination_lng = db.Column(
        db.Float,
        nullable=True,
    )

    # ==========================================================
    # ROUTE NUMBER
    # ==========================================================

    route_number = db.Column(
        db.Integer,
        nullable=False,
        default=1,
    )

    # ==========================================================
    # ROUTE METRICS
    # ==========================================================

    # Total route distance in meters
    distance_meters = db.Column(
        db.Float,
        nullable=True,
    )

    # Current travel time from routing API
    travel_time_sec = db.Column(
        db.Integer,
        nullable=True,
    )

    # Traffic delay compared with free-flow travel time
    traffic_delay_sec = db.Column(
        db.Integer,
        nullable=True,
    )

    # AI predicted travel time
    predicted_travel_time_sec = db.Column(
        db.Integer,
        nullable=True,
    )

    # ==========================================================
    # CREATED TIME
    # ==========================================================

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True,
    )

    # ==========================================================
    # SERIALIZATION
    # ==========================================================

    def to_dict(self):
        """
        Convert SavedRouteReport into JSON-safe data
        for the React frontend.
        """

        return {
            "id": self.id,

            "userId": self.user_id,

            "reportDate": (
                self.report_date.isoformat()
                if self.report_date
                else None
            ),

            # Origin
            "originName": self.origin_name,

            "originLat": self.origin_lat,

            "originLng": self.origin_lng,

            # Destination
            "destinationName": self.destination_name,

            "destinationLat": self.destination_lat,

            "destinationLng": self.destination_lng,

            # Route
            "routeNumber": self.route_number,

            # Metrics
            "distanceMeters": self.distance_meters,

            "travelTimeSec": self.travel_time_sec,

            "trafficDelaySec": self.traffic_delay_sec,

            "predictedTravelTimeSec": (
                self.predicted_travel_time_sec
            ),

            # Timestamp
            "createdAt": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
        }

    