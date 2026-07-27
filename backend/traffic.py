from fastapi import APIRouter, HTTPException
from sqlalchemy.orm import Session

from models import Traffic, engine
from schemas import TrafficCreate

router = APIRouter(
    prefix="/traffic",
    tags=["Traffic"]
)


# GET All Traffic Data
@router.get("/")
def get_traffic():
    db = Session(bind=engine)
    data = db.query(Traffic).all()
    db.close()
    return data


# ADD Traffic Data
@router.post("/")
def add_traffic(traffic: TrafficCreate):
    db = Session(bind=engine)

    new_traffic = Traffic(
        location=traffic.location,
        vehicle_count=traffic.vehicle_count,
        congestion_level=traffic.congestion_level
    )

    db.add(new_traffic)
    db.commit()
    db.refresh(new_traffic)
    db.close()

    return {
        "message": "Traffic data added successfully!",
        "data": new_traffic
    }


# UPDATE Traffic Data
@router.put("/{traffic_id}")
def update_traffic(traffic_id: int, traffic: TrafficCreate):
    db = Session(bind=engine)

    traffic_data = db.query(Traffic).filter(Traffic.id == traffic_id).first()

    if not traffic_data:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Traffic data not found"
        )

    traffic_data.location = traffic.location
    traffic_data.vehicle_count = traffic.vehicle_count
    traffic_data.congestion_level = traffic.congestion_level

    db.commit()
    db.refresh(traffic_data)
    db.close()

    return {
        "message": "Traffic updated successfully!",
        "data": traffic_data
    }


# DELETE Traffic Data
@router.delete("/{traffic_id}")
def delete_traffic(traffic_id: int):
    db = Session(bind=engine)

    traffic_data = db.query(Traffic).filter(Traffic.id == traffic_id).first()

    if not traffic_data:
        db.close()
        raise HTTPException(
            status_code=404,
            detail="Traffic data not found"
        )

    db.delete(traffic_data)
    db.commit()
    db.close()

    return {
        "message": "Traffic data deleted successfully!"
    }