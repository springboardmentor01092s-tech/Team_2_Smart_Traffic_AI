from sqlalchemy import Column, Integer, String, Float, DateTime
from database import Base, engine
import datetime

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    role = Column(String(30), nullable=False, default="commuter")

class Traffic(Base):
    __tablename__ = "traffic"

    id = Column(Integer, primary_key=True, index=True)
    location = Column(String(100), nullable=False)
    road_name = Column(String(100), nullable=False)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    vehicle_count = Column(Integer, default=0)
    capacity = Column(Integer, default=100)
    average_speed = Column(Float, default=40.0)
    congestion_level = Column(String(50), default="Low")
    updated_at = Column(DateTime, default=datetime.datetime.utcnow)