from datetime import datetime, timedelta

from extensions import db


# ==========================================================
# INDIA STANDARD TIME
# ==========================================================

def india_time():
    """
    Return current time in Indian Standard Time.

    Database columns currently use timezone-naive DateTime,
    so IST is stored as a naive datetime.
    """

    return (
        datetime.utcnow()
        + timedelta(
            hours=5,
            minutes=30,
        )
    )


# ==========================================================
# ROAD
# ==========================================================

class Road(db.Model):
    __tablename__ = "roads"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    name = db.Column(
        db.String(255),
        nullable=False,
    )

    area = db.Column(
        db.String(255),
    )

    city = db.Column(
        db.String(120),
    )

    state = db.Column(
        db.String(120),
    )

    country = db.Column(
        db.String(120),
    )

    latitude = db.Column(
        db.Float,
        nullable=False,
    )

    longitude = db.Column(
        db.Float,
        nullable=False,
    )

    tomtom_id = db.Column(
        db.String(255),
    )

    created_at = db.Column(
        db.DateTime,
        default=india_time,
    )

    __table_args__ = (
        db.Index(
            "ix_roads_city_state",
            "city",
            "state",
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "area": self.area,
            "city": self.city,
            "state": self.state,
            "country": self.country,
            "latitude": self.latitude,
            "longitude": self.longitude,
            "tomtomId": self.tomtom_id,
            "createdAt": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),
        }


# ==========================================================
# CURRENT TRAFFIC DATA
# ==========================================================

class TrafficData(db.Model):
    __tablename__ = "traffic_data"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    road_id = db.Column(
        db.Integer,
        db.ForeignKey("roads.id"),
        nullable=False,
    )

    vehicle_count = db.Column(
        db.Integer,
        nullable=False,
        default=0,
    )

    average_speed = db.Column(
        db.Float,
        nullable=False,
        default=0,
    )

    free_flow_speed = db.Column(
        db.Float,
    )

    congestion_level = db.Column(
        db.String(20),
        nullable=False,
        default="low",
    )

    congestion_percent = db.Column(
        db.Float,
        default=0,
    )

    incidents_count = db.Column(
        db.Integer,
        default=0,
    )

    weather_condition = db.Column(
        db.String(60),
    )

    source = db.Column(
        db.String(20),
        default="manual",
    )

    recorded_by_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
    )

    updated_at = db.Column(
        db.DateTime,
        default=india_time,
        onupdate=india_time,
    )

    road = db.relationship(
        "Road",
    )

    def to_dict(self):
        road = self.road

        return {
            "id": self.id,
            "roadId": self.road_id,

            "roadName": (
                road.name
                if road
                else None
            ),

            "latitude": (
                road.latitude
                if road
                else None
            ),

            "longitude": (
                road.longitude
                if road
                else None
            ),

            "area": (
                road.area
                if road
                else None
            ),

            "city": (
                road.city
                if road
                else None
            ),

            "state": (
                road.state
                if road
                else None
            ),

            "country": (
                road.country
                if road
                else None
            ),

            "vehicleCount": (
                self.vehicle_count
            ),

            "averageSpeed": (
                self.average_speed
            ),

            "freeFlowSpeed": (
                self.free_flow_speed
            ),

            "congestionLevel": (
                self.congestion_level
            ),

            "congestionPercent": (
                self.congestion_percent
            ),

            "incidentsCount": (
                self.incidents_count
            ),

            "weatherCondition": (
                self.weather_condition
            ),

            "source": self.source,

            "updatedAt": (
                self.updated_at.isoformat()
                if self.updated_at
                else None
            ),
        }


# ==========================================================
# TRAFFIC HISTORY
# ==========================================================

class TrafficHistory(db.Model):
    __tablename__ = "traffic_history"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    road_id = db.Column(
        db.Integer,
        db.ForeignKey("roads.id"),
        nullable=False,
    )

    vehicle_count = db.Column(
        db.Integer,
        nullable=False,
        default=0,
    )

    average_speed = db.Column(
        db.Float,
        nullable=False,
        default=0,
    )

    congestion_level = db.Column(
        db.String(20),
        nullable=False,
    )

    congestion_percent = db.Column(
        db.Float,
        default=0,
    )

    incidents_count = db.Column(
        db.Integer,
        default=0,
    )

    weather_condition = db.Column(
        db.String(60),
    )

    recorded_at = db.Column(
        db.DateTime,
        default=india_time,
        index=True,
    )

    road = db.relationship(
        "Road",
    )

    __table_args__ = (
        db.Index(
            "ix_history_road_time",
            "road_id",
            "recorded_at",
        ),
    )

    def to_dict(self):
        road = self.road

        return {
            "id": self.id,

            "roadId": self.road_id,

            "roadName": (
                road.name
                if road
                else None
            ),

            "city": (
                road.city
                if road
                else None
            ),

            "state": (
                road.state
                if road
                else None
            ),

            "vehicleCount": (
                self.vehicle_count
            ),

            "averageSpeed": (
                self.average_speed
            ),

            "congestionLevel": (
                self.congestion_level
            ),

            "congestionPercent": (
                self.congestion_percent
            ),

            "incidentsCount": (
                self.incidents_count
            ),

            "weatherCondition": (
                self.weather_condition
            ),

            "recordedAt": (
                self.recorded_at.isoformat()
                if self.recorded_at
                else None
            ),
        }


# ==========================================================
# SAVED ROUTES FOR REPORTS
# ==========================================================

class ReportRoute(db.Model):
    __tablename__ = "report_routes"

    id = db.Column(
        db.Integer,
        primary_key=True,
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False,
        index=True,
    )

    route_number = db.Column(
        db.Integer,
        nullable=False,
        default=1,
    )

    origin_name = db.Column(
        db.String(255),
        nullable=False,
    )

    destination_name = db.Column(
        db.String(255),
        nullable=False,
    )

    distance_meters = db.Column(
        db.Float,
        default=0,
    )

    travel_time_sec = db.Column(
        db.Float,
        default=0,
    )

    traffic_delay_sec = db.Column(
        db.Float,
        default=0,
    )

    predicted_travel_time_sec = db.Column(
        db.Float,
    )

    origin_lat = db.Column(
        db.Float,
    )

    origin_lng = db.Column(
        db.Float,
    )

    destination_lat = db.Column(
        db.Float,
    )

    destination_lng = db.Column(
        db.Float,
    )

    added_at = db.Column(
        db.DateTime,
        default=india_time,
        nullable=False,
        index=True,
    )

    user = db.relationship(
        "User",
        backref=db.backref(
            "report_routes",
            lazy=True,
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,

            "routeNumber": (
                self.route_number
            ),

            "origin": (
                self.origin_name
            ),

            "destination": (
                self.destination_name
            ),

            "distanceMeters": (
                self.distance_meters
            ),

            "travelTimeSec": (
                self.travel_time_sec
            ),

            "trafficDelaySec": (
                self.traffic_delay_sec
            ),

            "predictedTravelTimeSec": (
                self.predicted_travel_time_sec
            ),

            "originLat": (
                self.origin_lat
            ),

            "originLng": (
                self.origin_lng
            ),

            "destinationLat": (
                self.destination_lat
            ),

            "destinationLng": (
                self.destination_lng
            ),

            "addedAt": (
                self.added_at.isoformat()
                if self.added_at
                else None
            ),
        }

    