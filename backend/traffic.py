from fastapi import APIRouter, HTTPException, Depends, status, Query
from sqlalchemy.orm import Session
import random
import datetime
import math

from database import get_db
from models import Traffic, User
from schemas import TrafficCreate
from security import get_current_user, RoleChecker
from ai_engine import train_model, predict_traffic

router = APIRouter(prefix="/traffic", tags=["Traffic"])


# Dynamic congestion calculation based on capacity ratios
def calculate_congestion(vehicle_count: int, capacity: int) -> str:
    if capacity <= 0:
        return "Low"
    ratio = vehicle_count / capacity
    if ratio < 0.3:
        return "Low"
    elif ratio < 0.6:
        return "Moderate"
    elif ratio < 0.85:
        return "High"
    else:
        return "Critical"


# GET All Traffic
@router.get("/")
def get_all_traffic(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Traffic).order_by(Traffic.location.asc()).all()


# ADD Traffic Point
@router.post("/")
def add_traffic_node(
    traffic: TrafficCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin", "operator"]))
):
    congestion = calculate_congestion(traffic.vehicle_count, traffic.capacity or 100)
    
    new_node = Traffic(
        location=traffic.location,
        road_name=traffic.road_name,
        latitude=traffic.latitude,
        longitude=traffic.longitude,
        vehicle_count=traffic.vehicle_count,
        capacity=traffic.capacity,
        average_speed=traffic.average_speed,
        congestion_level=congestion,
        updated_at=datetime.datetime.utcnow()
    )
    db.add(new_node)
    db.commit()
    db.refresh(new_node)
    
    # Retrain model with new coordinate ranges asynchronously/immediately
    all_nodes = db.query(Traffic).all()
    active_nodes = [
        {"latitude": n.latitude, "longitude": n.longitude, "capacity": n.capacity}
        for n in all_nodes
    ]
    train_model(active_nodes)
    
    return {"message": "Traffic segment added successfully!", "data": new_node}


# DELETE Traffic Point
@router.delete("/{node_id}")
def delete_traffic_node(
    node_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(RoleChecker(["admin"]))
):
    node = db.query(Traffic).filter(Traffic.id == node_id).first()
    if not node:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Traffic node not found."
        )
    db.delete(node)
    db.commit()
    return {"message": "Traffic segment deleted successfully!"}


# SIMULATE Live Traffic Variations
@router.post("/simulate")
def simulate_traffic_fluctuations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_nodes = db.query(Traffic).all()
    updated = []
    
    for item in all_nodes:
        # Fluctuate count by +/- 15% of capacity
        change = int(random.uniform(-0.15, 0.15) * item.capacity)
        new_count = max(0, min(item.capacity, item.vehicle_count + change))
        
        # Calculate speed inversely to vehicle density
        ratio = new_count / item.capacity if item.capacity > 0 else 0
        base_speed = 60.0
        new_speed = max(5.0, round(base_speed * (1.0 - ratio) + random.uniform(-5, 5), 1))
        
        item.vehicle_count = new_count
        item.average_speed = new_speed
        item.congestion_level = calculate_congestion(new_count, item.capacity)
        item.updated_at = datetime.datetime.utcnow()
        
        updated.append({
            "id": item.id,
            "location": item.location,
            "vehicle_count": new_count,
            "average_speed": new_speed,
            "congestion_level": item.congestion_level
        })
        
    db.commit()
    return {"message": "Traffic simulation successfully completed.", "changes": updated}


# RETRAIN MODEL ENDPOINT
@router.post("/train")
def trigger_training(db: Session = Depends(get_db), current_user: User = Depends(RoleChecker(["admin", "operator"]))):
    all_nodes = db.query(Traffic).all()
    active_nodes = [
        {"latitude": n.latitude, "longitude": n.longitude, "capacity": n.capacity}
        for n in all_nodes
    ]
    success = train_model(active_nodes)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Model retraining failed."
        )
    return {"message": "RandomForest multi-output model trained successfully."}


# GET AI FORECAST Hour Preds
@router.get("/predict")
def get_hourly_forecast(
    hour: int = Query(..., ge=0, le=23),
    day_of_week: int = Query(0, ge=0, le=6),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    all_nodes = db.query(Traffic).all()
    forecasts = []
    
    for item in all_nodes:
        pred_count, pred_speed = predict_traffic(
            latitude=item.latitude,
            longitude=item.longitude,
            capacity=item.capacity,
            hour=hour,
            day_of_week=day_of_week
        )
        congestion = calculate_congestion(pred_count, item.capacity)
        
        forecasts.append({
            "id": item.id,
            "location": item.location,
            "road_name": item.road_name,
            "latitude": item.latitude,
            "longitude": item.longitude,
            "vehicle_count": pred_count,
            "capacity": item.capacity,
            "average_speed": pred_speed,
            "congestion_level": congestion,
            "updated_at": item.updated_at
        })
        
    return forecasts


# GET TRAVEL ESTIMATES (Haversine & ETA predictions)
@router.get("/route-estimate")
def get_route_details(
    start_lat: float = Query(...),
    start_lng: float = Query(...),
    end_lat: float = Query(...),
    end_lng: float = Query(...),
    hour: int = Query(None, ge=0, le=23),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # 1. Distance calculation using Haversine formula
    R = 6371.0 # Earth's radius in km
    
    dlat = math.radians(end_lat - start_lat)
    dlng = math.radians(end_lng - start_lng)
    
    a = (math.sin(dlat / 2) ** 2 +
         math.cos(math.radians(start_lat)) * math.cos(math.radians(end_lat)) *
         math.sin(dlng / 2) ** 2)
         
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    distance_km = round(R * c, 2)
    
    # 2. Get travel speeds along the segment (average speed or forecast speed)
    avg_speed = 40.0
    congestion_level = "Low"
    
    # Find nearest segment in database to estimate traffic load
    nearest_node = None
    min_dist = float("inf")
    
    all_nodes = db.query(Traffic).all()
    for node in all_nodes:
        # Distance to node
        nd_lat = math.radians(node.latitude - start_lat)
        nd_lng = math.radians(node.longitude - start_lng)
        na = (math.sin(nd_lat / 2) ** 2 +
              math.cos(math.radians(start_lat)) * math.cos(math.radians(node.latitude)) *
              math.sin(nd_lng / 2) ** 2)
        nc = 2 * math.atan2(math.sqrt(na), math.sqrt(1 - na))
        dist_to_node = R * nc
        if dist_to_node < min_dist:
            min_dist = dist_to_node
            nearest_node = node
            
    # Compute travel speed
    if nearest_node:
        if hour is not None:
            # Predict speed using RandomForestRegressor
            _, pred_speed = predict_traffic(
                latitude=nearest_node.latitude,
                longitude=nearest_node.longitude,
                capacity=nearest_node.capacity,
                hour=hour,
                day_of_week=datetime.datetime.utcnow().weekday()
            )
            avg_speed = pred_speed
            congestion_level = calculate_congestion(int(nearest_node.capacity * 0.5), nearest_node.capacity)
        else:
            avg_speed = nearest_node.average_speed
            congestion_level = nearest_node.congestion_level
            
    # Calculate ETA in minutes (dist / speed * 60)
    duration_min = round((distance_km / avg_speed) * 60.0, 1) if avg_speed > 0 else 0.0
    
    # 3. Alternative route routing logic
    alternative_route = None
    if congestion_level in ["High", "Critical"]:
        # Suggest detour via adjacent low congestion segment or bypass road
        alternative_route = "Bypass Ring Road Detour"
        detour_speed = max(45.0, avg_speed + 15.0)
        detour_distance = round(distance_km * 1.15, 2) # Detour is slightly longer
        detour_duration = round((detour_distance / detour_speed) * 60.0, 1)
        
        alternative_route_details = {
            "name": alternative_route,
            "distance_km": detour_distance,
            "duration_minutes": detour_duration,
            "reason": "Avoid high density corridors"
        }
    else:
        alternative_route_details = None
        
    return {
        "distance_km": distance_km,
        "average_speed_kmh": round(avg_speed, 1),
        "duration_minutes": duration_min,
        "congestion_status": congestion_level,
        "alternative_route": alternative_route_details
    }