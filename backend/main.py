from fastapi import FastAPI
from auth import router
from traffic import router as traffic_router
from models import Base, engine

app = FastAPI()

Base.metadata.create_all(bind=engine)

app.include_router(router)
app.include_router(traffic_router)


@app.get("/")
def home():
    return {
        "message": "TrafficVisionAI Backend Connected to PostgreSQL Successfully!"
    }