from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.route import RouteSearch
from services import tomtom_service
from services.tomtom_service import (
    TomTomNotConfigured,
    TomTomAPIError,
)
from utils.validators import require_fields


route_bp = Blueprint(
    "route",
    __name__,
    url_prefix="/api/routes",
)


# ==========================================================
# CALCULATE ROUTES
# ==========================================================

@route_bp.post("/calculate")
@jwt_required()
def calculate_route():

    data = request.get_json(
        silent=True
    ) or {}

    missing = require_fields(
        data,
        ["origin", "destination"],
    )

    if missing:
        return jsonify({
            "error": (
                f"Missing fields: "
                f"{', '.join(missing)}"
            )
        }), 400

    origin = data["origin"]
    destination = data["destination"]

    # ------------------------------------------------------
    # Validate origin
    # ------------------------------------------------------

    if not isinstance(origin, dict):
        return jsonify({
            "error": "Origin must be an object"
        }), 400

    if (
        "lat" not in origin or
        "lng" not in origin
    ):
        return jsonify({
            "error":
                "origin requires lat and lng"
        }), 400

    # ------------------------------------------------------
    # Validate destination
    # ------------------------------------------------------

    if not isinstance(destination, dict):
        return jsonify({
            "error":
                "Destination must be an object"
        }), 400

    if (
        "lat" not in destination or
        "lng" not in destination
    ):
        return jsonify({
            "error":
                "destination requires lat and lng"
        }), 400

    # ------------------------------------------------------
    # Avoid options
    # ------------------------------------------------------

    avoid = []

    if data.get("avoidTolls"):
        avoid.append("tollRoads")

    if data.get("avoidHighways"):
        avoid.append("motorways")

    # ------------------------------------------------------
    # Maximum alternatives
    # ------------------------------------------------------

    max_alternatives = data.get(
        "maxAlternatives",
        2,
    )

    try:
        max_alternatives = int(
            max_alternatives
        )
    except (
        TypeError,
        ValueError,
    ):
        max_alternatives = 2

    max_alternatives = max(
        0,
        min(
            max_alternatives,
            2,
        ),
    )

    # ------------------------------------------------------
    # TOMTOM ROUTING
    # ------------------------------------------------------

    try:

        routes = (
            tomtom_service.calculate_route(
                origin,
                destination,
                avoid=avoid or None,
                max_alternatives=max_alternatives,
            )
        )

    except TomTomNotConfigured as e:

        return jsonify({
            "error": str(e),
            "code":
                "TOMTOM_NOT_CONFIGURED",
        }), 503

    except TomTomAPIError as e:

        return jsonify({
            "error": str(e),
        }), e.status_code

    except TypeError:
        # Backward compatibility if your
        # tomtom_service currently does not
        # accept max_alternatives.

        try:

            routes = (
                tomtom_service.calculate_route(
                    origin,
                    destination,
                    avoid=avoid or None,
                )
            )

        except TomTomNotConfigured as e:

            return jsonify({
                "error": str(e),
                "code":
                    "TOMTOM_NOT_CONFIGURED",
            }), 503

        except TomTomAPIError as e:

            return jsonify({
                "error": str(e),
            }), e.status_code

    # ------------------------------------------------------
    # NO ROUTES
    # ------------------------------------------------------

    if not routes:

        return jsonify({
            "error":
                "No route could be found between these points"
        }), 404

    # ------------------------------------------------------
    # LIMIT TO 3 ROUTES
    # ------------------------------------------------------

    routes = routes[:3]

    # ------------------------------------------------------
    # SAVE BEST ROUTE
    # ------------------------------------------------------

    best = routes[0]

    distance_meters = (
        best.get(
            "distanceMeters"
        )
    )

    travel_time_sec = (
        best.get(
            "travelTimeSec"
        )
    )

    traffic_delay_sec = (
        best.get(
            "trafficDelaySec",
            0,
        )
        or 0
    )

    record = RouteSearch(
        user_id=int(
            get_jwt_identity()
        ),

        origin_name=origin.get(
            "name",
            "Origin",
        ),

        origin_lat=origin["lat"],

        origin_lng=origin["lng"],

        destination_name=
            destination.get(
                "name",
                "Destination",
            ),

        destination_lat=
            destination["lat"],

        destination_lng=
            destination["lng"],

        distance_km=(
            round(
                distance_meters / 1000,
                1,
            )
            if distance_meters
            else None
        ),

        travel_time_min=(
            round(
                travel_time_sec / 60,
                1,
            )
            if travel_time_sec
            else None
        ),

        traffic_delay_min=round(
            traffic_delay_sec / 60,
            1,
        ),

        route_summary_json=routes,
    )

    db.session.add(record)

    db.session.commit()

    # ------------------------------------------------------
    # RETURN ROUTES DIRECTLY
    #
    # This is important for the old UI.
    # ------------------------------------------------------

    return jsonify({
        "routes": routes,
        "origin": origin,
        "destination": destination,
        "savedRoute": record.to_dict(),
    })


# ==========================================================
# ROUTE HISTORY
# ==========================================================

@route_bp.get("/history")
@jwt_required()
def route_history():

    rows = (
        RouteSearch.query
        .filter_by(
            user_id=int(
                get_jwt_identity()
            )
        )
        .order_by(
            RouteSearch.created_at.desc()
        )
        .limit(50)
        .all()
    )

    return jsonify({
        "items": [
            r.to_dict()
            for r in rows
        ]
    })


# ==========================================================
# SAVED ROUTES
# ==========================================================

@route_bp.get("/saved")
@jwt_required()
def saved_routes():

    rows = (
        RouteSearch.query
        .filter_by(
            user_id=int(
                get_jwt_identity()
            ),
            is_saved=True,
        )
        .order_by(
            RouteSearch.created_at.desc()
        )
        .all()
    )

    return jsonify({
        "items": [
            r.to_dict()
            for r in rows
        ]
    })


# ==========================================================
# SAVE / UNSAVE ROUTE
# ==========================================================

@route_bp.patch(
    "/<int:route_id>/save"
)
@jwt_required()
def toggle_save(route_id):

    route = (
        RouteSearch.query
        .get_or_404(route_id)
    )

    current_user_id = int(
        get_jwt_identity()
    )

    if (
        route.user_id !=
        current_user_id
    ):
        return jsonify({
            "error":
                "Not authorized"
        }), 403

    data = request.get_json(
        silent=True
    ) or {}

    route.is_saved = bool(
        data.get(
            "isSaved",
            True,
        )
    )

    db.session.commit()

    return jsonify(
        route.to_dict()
    )

