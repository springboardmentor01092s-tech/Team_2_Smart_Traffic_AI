from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from database import engine, Base, SessionLocal
from auth import router as auth_router
from traffic import router as traffic_router
from models import Traffic
from ai_engine import train_model

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(title="TrafficVision AI Backend Engine")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth_router)
app.include_router(traffic_router)


@app.get("/")
def home():
    return {
        "status": "Healthy",
        "message": "TrafficVisionAI Engine is live and listening."
    }

# ---------------- HEALTHCHECK ---------------- #
@app.get("/health")
def health():
    return {
        "status": "Healthy",
        "database": "Connected"
    }

# ---------------- SEARCH ENDPOINT ---------------- #
@app.get("/search")
def search_traffic(q: str = Query(...)):
    db: Session = SessionLocal()
    try:
        results = (
            db.query(Traffic)
            .filter(Traffic.location.ilike(f"%{q}%"))
            .all()
        )
        return [
            {
                "id": item.id,
                "location": item.location,
                "road_name": item.road_name,
                "latitude": item.latitude,
                "longitude": item.longitude,
                "vehicle_count": item.vehicle_count,
                "capacity": item.capacity,
                "average_speed": item.average_speed,
                "congestion_level": item.congestion_level
            }
            for item in results
        ]
    finally:
        db.close()


# Auto train ML model on server startup based on database rows
@app.on_event("startup")
def startup_event():
    db: Session = SessionLocal()
    try:
        all_nodes = db.query(Traffic).all()
        active_nodes = [
            {"latitude": n.latitude, "longitude": n.longitude, "capacity": n.capacity}
            for n in all_nodes
        ]
        train_model(active_nodes)
    finally:
        db.close()