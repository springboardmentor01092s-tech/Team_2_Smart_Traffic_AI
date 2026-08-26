"""
Seeds the database with an initial Super Admin account, a Traffic Operator
account, and a small set of demo roads/history so the dashboard isn't empty
on first run.

Usage:
    python seed.py
"""
from datetime import datetime, timedelta
import random

from app import create_app
from extensions import db
from models.user import User
from models.settings import UserSettings, SystemSetting
from models.traffic import Road, TrafficData, TrafficHistory

DEMO_ROADS = [
    ("Outer Ring Road, Marathahalli", "Marathahalli", "Bengaluru", "Karnataka", "India", 12.9569, 77.7011),
    ("MG Road", "MG Road", "Bengaluru", "Karnataka", "India", 12.9758, 77.6045),
    ("Whitefield Road", "Whitefield", "Bengaluru", "Karnataka", "India", 12.9698, 77.7500),
    ("Andheri Road", "Andheri", "Mumbai", "Maharashtra", "India", 19.1197, 72.8468),
    ("Eastern Express Highway", "Eastern Express Highway", "Mumbai", "Maharashtra", "India", 19.0896, 72.8797),
    ("Anna Salai", "Anna Salai", "Chennai", "Tamil Nadu", "India", 13.0569, 80.2496),
    ("Hi-Tech City Road", "Hi-Tech City", "Hyderabad", "Telangana", "India", 17.4483, 78.3915),
]


def run():
    app = create_app()
    with app.app_context():
        db.create_all()

        if not User.query.filter_by(email="admin@trafficvision.ai").first():
            admin = User(
                name="Admin User",
                email="admin@trafficvision.ai",
                role="super_admin",
                phone="+91 98765 43210",
                department="Traffic Control HQ",
                assigned_area="All Locations",
                status="active",
            )
            admin.set_password("Admin@12345")
            db.session.add(admin)
            db.session.flush()
            db.session.add(UserSettings(user_id=admin.id))
            print("Created admin@trafficvision.ai / Admin@12345")

        if not User.query.filter_by(email="operator@trafficvision.ai").first():
            operator = User(
                name="Priya Reddy",
                email="operator@trafficvision.ai",
                role="traffic_operator",
                phone="+91 98765 00000",
                department="Field Operations",
                assigned_area="Bengaluru City",
                status="active",
            )
            operator.set_password("Operator@12345")
            db.session.add(operator)
            db.session.flush()
            db.session.add(UserSettings(user_id=operator.id))
            print("Created operator@trafficvision.ai / Operator@12345")

        db.session.commit()

        if Road.query.count() == 0:
            now = datetime.utcnow()
            for name, area, city, state, country, lat, lng in DEMO_ROADS:
                road = Road(name=name, area=area, city=city, state=state, country=country, latitude=lat, longitude=lng)
                db.session.add(road)
                db.session.flush()

                # 10 days of hourly-ish synthetic history so charts have data immediately.
                for day in range(10):
                    for hour_step in range(0, 24, 3):
                        ts = now - timedelta(days=day, hours=hour_step)
                        speed = max(8, random.gauss(28, 10))
                        free_flow = 45
                        pct = max(0, min(100, round((1 - speed / free_flow) * 100, 1)))
                        level = "low" if pct < 30 else "moderate" if pct < 60 else "heavy"
                        db.session.add(
                            TrafficHistory(
                                road_id=road.id,
                                vehicle_count=random.randint(200, 2500),
                                average_speed=round(speed, 1),
                                congestion_level=level,
                                congestion_percent=pct,
                                incidents_count=random.choice([0, 0, 0, 1, 2]),
                                weather_condition=random.choice(["Clear", "Cloudy", "Rain", "Clear"]),
                                recorded_at=ts,
                            )
                        )

                latest = TrafficHistory.query.filter_by(road_id=road.id).order_by(TrafficHistory.recorded_at.desc()).first()
                db.session.add(
                    TrafficData(
                        road_id=road.id,
                        vehicle_count=latest.vehicle_count,
                        average_speed=latest.average_speed,
                        free_flow_speed=45,
                        congestion_level=latest.congestion_level,
                        congestion_percent=latest.congestion_percent,
                        source="manual",
                    )
                )
            print(f"Seeded {len(DEMO_ROADS)} demo roads with 10 days of history.")

        db.session.commit()
        print("Seed complete.")


if __name__ == "__main__":
    run()
