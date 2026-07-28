from pydantic import BaseModel
from typing import Optional

class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: str

class UserLogin(BaseModel):
    email: str
    password: str

class TrafficCreate(BaseModel):
    location: str
    road_name: str
    latitude: float
    longitude: float
    vehicle_count: int
    capacity: int
    average_speed: float