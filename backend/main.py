from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from auth import router
from traffic import router as traffic_router
from models import Base, engine

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(router)
app.include_router(traffic_router)

@app.get("/")
def home():
    return {
        "message": "TrafficVisionAI Backend Connected to PostgreSQL Successfully"
    }