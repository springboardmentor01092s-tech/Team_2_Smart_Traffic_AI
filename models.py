from datetime import datetime
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin


db = SQLAlchemy()


# -----------------------------
# User Table
# -----------------------------
class User(db.Model, UserMixin):

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    username = db.Column(
        db.String(50),
        unique=True,
        nullable=False
    )

    email = db.Column(
        db.String(120),
        unique=True,
        nullable=False
    )

    password = db.Column(
        db.String(100),
        nullable=False
    )

    role = db.Column(
        db.String(20),
        nullable=False,
        default='Public User'
    )
    # Admin, Traffic Operator, Public User



# -----------------------------
# Current Traffic Data Table
# -----------------------------
class TrafficData(db.Model):

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    road_name = db.Column(
        db.String(100),
        nullable=False
    )

    vehicle_count = db.Column(
        db.Integer,
        nullable=False
    )

    avg_speed = db.Column(
        db.Float,
        nullable=False
    )

    congestion_level = db.Column(
        db.String(20),
        nullable=False
    )
    # Low, Moderate, Heavy


    last_updated = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )



# -----------------------------
# Traffic History Table
# -----------------------------
class TrafficHistory(db.Model):

    id = db.Column(
        db.Integer,
        primary_key=True
    )


    road_name = db.Column(
        db.String(100),
        nullable=False
    )


    vehicle_count = db.Column(
        db.Integer,
        nullable=False
    )


    avg_speed = db.Column(
        db.Float,
        nullable=False
    )


    congestion_level = db.Column(
        db.String(20),
        nullable=False
    )
    # Low, Moderate, Heavy


    recorded_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )



# -----------------------------
# Alert Table
# -----------------------------
class Alert(db.Model):

    id = db.Column(
        db.Integer,
        primary_key=True
    )


    message = db.Column(
        db.String(255),
        nullable=False
    )


    timestamp = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )


    severity = db.Column(
        db.String(20),
        nullable=False
    )
    # Info, Warning, Critical

    