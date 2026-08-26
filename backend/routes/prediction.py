from datetime import datetime, timezone, timedelta

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.prediction import Prediction
from models.traffic import Road
from ml.predictor import predict_congestion
from utils.validators import require_fields


prediction_bp = Blueprint(
    "prediction",
    __name__,
    url_prefix="/api/prediction"
)


# ==========================================================
# INDIA STANDARD TIME
# ==========================================================

IST = timezone(timedelta(hours=5, minutes=30))


# ==========================================================
# PREDICT CONGESTION
# ==========================================================

@prediction_bp.post("/predict")
@jwt_required()
def predict():

    data = request.get_json(silent=True) or {}

    missing = require_fields(
        data,
        ["hour", "dayOfWeek", "month"]
    )

    if missing:
        return jsonify({
            "error": f"Missing fields: {', '.join(missing)}"
        }), 400

    try:
        payload = {
            "hour": int(data["hour"]),
            "day_of_week": int(data["dayOfWeek"]),
            "month": int(data["month"]),

            "temperature": float(
                data.get("temperature", 25)
            ),

            "rain": float(
                data.get("rain", 0)
            ),

            "snow": float(
                data.get("snow", 0)
            ),

            "clouds": float(
                data.get("clouds", 0)
            ),

            "vehicle_count": int(
                data.get("vehicleCount", 500)
            ),

            # Vehicle speed in km/h
            "vehicle_speed": float(
                data.get("vehicleSpeed", 40)
            ),
        }

    except (TypeError, ValueError):
        return jsonify({
            "error": "Invalid numeric input"
        }), 400

    # ------------------------------------------------------
    # Validate date/time values
    # ------------------------------------------------------

    if not (0 <= payload["hour"] <= 23):
        return jsonify({
            "error": "hour must be 0-23"
        }), 400

    if not (0 <= payload["day_of_week"] <= 6):
        return jsonify({
            "error": "dayOfWeek must be 0-6"
        }), 400

    if not (1 <= payload["month"] <= 12):
        return jsonify({
            "error": "month must be 1-12"
        }), 400

    # ------------------------------------------------------
    # Validate vehicle speed
    # ------------------------------------------------------

    if not (0 <= payload["vehicle_speed"] <= 200):
        return jsonify({
            "error": "vehicleSpeed must be between 0 and 200 km/h"
        }), 400

    # ------------------------------------------------------
    # Run ML prediction
    # ------------------------------------------------------

    result = predict_congestion(payload)

    # ------------------------------------------------------
    # Validate road
    # ------------------------------------------------------

    road_id = data.get("roadId")

    if road_id:
        road = Road.query.get(road_id)
        road_id = road.id if road else None

    # ------------------------------------------------------
    # Save prediction history
    # ------------------------------------------------------

    record = Prediction(
        road_id=road_id,
        requested_by_id=int(get_jwt_identity()),

        hour=payload["hour"],
        day_of_week=payload["day_of_week"],
        month=payload["month"],

        temperature=payload["temperature"],
        rain=payload["rain"],
        snow=payload["snow"],
        clouds=payload["clouds"],

        vehicle_count=payload["vehicle_count"],
        vehicle_speed=payload["vehicle_speed"],

        predicted_congestion=result["level"],
        confidence=result["confidence"],
        estimated_delay_min=result["estimated_delay_min"],
    )

    db.session.add(record)
    db.session.commit()

    return jsonify(record.to_dict())


# ==========================================================
# PREDICTION HISTORY
# ==========================================================

@prediction_bp.get("/history")
@jwt_required()
def prediction_history():

    page = int(
        request.args.get("page", 1)
    )

    per_page = int(
        request.args.get("perPage", 20)
    )

    query = Prediction.query.order_by(
        Prediction.created_at.desc()
    )

    total = query.count()

    rows = query.offset(
        (page - 1) * per_page
    ).limit(per_page).all()

    return jsonify({
        "items": [
            r.to_dict()
            for r in rows
        ],
        "total": total
    })


# ==========================================================
# NEXT 24 HOURS
# ==========================================================

@prediction_bp.get("/next-24h")
@jwt_required()
def next_24h():

    """
    Convenience endpoint:
    Runs the model for each hour of today so the frontend
    can render the 24-hour congestion prediction chart.

    Uses India Standard Time (IST / UTC+5:30).
    """

    # Current date/time in India
    now = datetime.now(IST)

    hours = []

    for h in range(24):

        result = predict_congestion(
            {
                "hour": h,

                "day_of_week": now.weekday(),

                "month": now.month,

                "temperature": float(
                    request.args.get(
                        "temperature",
                        25
                    )
                ),

                "rain": float(
                    request.args.get(
                        "rain",
                        0
                    )
                ),

                "snow": float(
                    request.args.get(
                        "snow",
                        0
                    )
                ),

                "clouds": float(
                    request.args.get(
                        "clouds",
                        0
                    )
                ),

                "vehicle_count": int(
                    request.args.get(
                        "vehicleCount",
                        500
                    )
                ),

                # Vehicle speed
                "vehicle_speed": float(
                    request.args.get(
                        "vehicleSpeed",
                        40
                    )
                ),
            }
        )

        hours.append({
            "hour": h,
            **result
        })

    return jsonify({
        "items": hours
    })

