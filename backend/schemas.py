from pydantic import BaseModel

class UserCreate(BaseModel):
    name: str
    email: str
    password: str
    role: str

class UserLogin(BaseModel):
    email: str
    password: str

class TrafficCreate(BaseModel):
    location: str
    vehicle_count: int
    congestion_level: str