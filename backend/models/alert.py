from datetime import datetime
from zoneinfo import ZoneInfo

from extensions import db


# ==========================================================
# TIMEZONE
# ==========================================================

IST = ZoneInfo("Asia/Kolkata")


def get_ist_now():
    """
    Return current date and time in Indian Standard Time.
    """
    return datetime.now(IST)


class Alert(db.Model):
    __tablename__ = "alerts"

    # ======================================================
    # PRIMARY KEY
    # ======================================================

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    # ======================================================
    # ROAD
    # ======================================================

    road_id = db.Column(
        db.Integer,
        db.ForeignKey("roads.id")
    )

    # ======================================================
    # ALERT DETAILS
    # ======================================================

    alert_type = db.Column(
        db.String(30),
        nullable=False
    )
    # traffic | congestion | accident | route_delay | emergency

    severity = db.Column(
        db.String(20),
        nullable=False,
        default="medium"
    )
    # low | medium | high | critical

    title = db.Column(
        db.String(255),
        nullable=False
    )

    message = db.Column(
        db.Text
    )

    # ======================================================
    # LOCATION
    # ======================================================

    location_name = db.Column(
        db.String(255)
    )

    latitude = db.Column(
        db.Float
    )

    longitude = db.Column(
        db.Float
    )

    # ======================================================
    # IMAGE
    # ======================================================

    image_url = db.Column(
        db.String(255),
        nullable=True
    )

    # ======================================================
    # STATUS
    # ======================================================

    status = db.Column(
        db.String(20),
        nullable=False,
        default="active"
    )
    # active | resolved

    is_read = db.Column(
        db.Boolean,
        default=False
    )

    # ======================================================
    # USER
    # ======================================================

    created_by_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id")
    )

    # ======================================================
    # TIMESTAMPS
    # ======================================================

    created_at = db.Column(
        db.DateTime,
        default=get_ist_now,
        index=True
    )

    resolved_at = db.Column(
        db.DateTime,
        nullable=True
    )

    # ======================================================
    # RELATIONSHIP
    # ======================================================

    road = db.relationship(
        "Road"
    )

    # ======================================================
    # JSON RESPONSE
    # ======================================================

    def to_dict(self):

        return {
            "id": self.id,

            "roadId": self.road_id,

            "type": self.alert_type,

            "severity": self.severity,

            "title": self.title,

            "message": self.message,

            "location": self.location_name,

            "latitude": self.latitude,

            "longitude": self.longitude,

            "imageUrl": self.image_url,

            "status": self.status,

            "isRead": self.is_read,

            "createdAt": (
                self.created_at.isoformat()
                if self.created_at
                else None
            ),

            "resolvedAt": (
                self.resolved_at.isoformat()
                if self.resolved_at
                else None
            ),
        }

    