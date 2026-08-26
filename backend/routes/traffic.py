from datetime import datetime, timedelta, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db, socketio
from models.traffic import Road, TrafficData, TrafficHistory
from models.alert import Alert

from services import tomtom_service
from services.tomtom_service import (
    TomTomNotConfigured,
    TomTomAPIError,
)

from utils.validators import require_fields


traffic_bp = Blueprint(
    "traffic",
    __name__,
    url_prefix="/api/traffic",
)


# ==========================================================
# UTILITY FUNCTIONS
# ==========================================================

def _safe_float(value):
    """
    Safely convert a value to float.

    Returns None for invalid values, including NaN.
    """
    try:
        if value is None:
            return None

        value = float(value)

        if value != value:
            return None

        return value

    except (TypeError, ValueError):
        return None


def _get_or_create_road(
    name,
    lat,
    lng,
    area=None,
    city=None,
    state=None,
    country=None,
    tomtom_id=None,
):
    """
    Find an existing road close to the coordinates
    or create a new road.
    """

    road = Road.query.filter(
        db.func.abs(Road.latitude - lat) < 0.0005,
        db.func.abs(Road.longitude - lng) < 0.0005,
    ).first()

    if road:

        if area and not road.area:
            road.area = area

        if city and not road.city:
            road.city = city

        if state and not road.state:
            road.state = state

        if country and not road.country:
            road.country = country

        if tomtom_id and not road.tomtom_id:
            road.tomtom_id = tomtom_id

        return road

    road = Road(
        name=name or "Unknown location",
        latitude=lat,
        longitude=lng,
        area=area,
        city=city,
        state=state,
        country=country,
        tomtom_id=tomtom_id,
    )

    db.session.add(road)
    db.session.flush()

    return road


def _classify(pct):
    """
    Convert congestion percentage to congestion level.
    """

    pct = _safe_float(pct) or 0

    if pct < 30:
        return "low"

    if pct < 60:
        return "moderate"

    if pct < 80:
        return "high"

    return "heavy"


# ==========================================================
# TOMTOM SEARCH RESULT NORMALIZATION
# ==========================================================

def _normalize_search_result(result):
    """
    Normalize one TomTom Search API result.
    """

    if not isinstance(result, dict):
        return None

    # ------------------------------------------------------
    # POSITION
    # ------------------------------------------------------

    position = result.get("position")

    latitude = None
    longitude = None

    if isinstance(position, dict):

        latitude = _safe_float(
            position.get("lat")
        )

        longitude = _safe_float(
            position.get("lon")
        )

        if longitude is None:
            longitude = _safe_float(
                position.get("lng")
            )

    if latitude is None:
        latitude = _safe_float(
            result.get("lat")
        )

    if longitude is None:
        longitude = _safe_float(
            result.get("lon")
        )

    if longitude is None:
        longitude = _safe_float(
            result.get("lng")
        )

    # ------------------------------------------------------
    # ADDRESS
    # ------------------------------------------------------

    address = result.get("address")

    if isinstance(address, dict):

        freeform_address = (
            address.get("freeformAddress")
            or address.get("streetName")
            or ""
        )

        municipality = (
            address.get("municipality")
            or address.get("municipalitySubdivision")
            or ""
        )

        country = (
            address.get("country")
            or ""
        )

        country_subdivision = (
            address.get("countrySubdivision")
            or ""
        )

        postal_code = (
            address.get("postalCode")
            or ""
        )

    elif isinstance(address, str):

        freeform_address = address
        municipality = ""
        country = ""
        country_subdivision = ""
        postal_code = ""

    else:

        freeform_address = ""
        municipality = ""
        country = ""
        country_subdivision = ""
        postal_code = ""

    # ------------------------------------------------------
    # POI NAME
    # ------------------------------------------------------

    poi = result.get("poi")

    if isinstance(poi, dict):

        poi_name = (
            poi.get("name")
            or ""
        )

    else:

        poi_name = ""

    # ------------------------------------------------------
    # RESULT NAME
    # ------------------------------------------------------

    name = (
        poi_name
        or result.get("name")
        or freeform_address
        or municipality
        or "Unknown location"
    )

    # ------------------------------------------------------
    # COORDINATE VALIDATION
    # ------------------------------------------------------

    if latitude is None or longitude is None:
        return None

    return {
        "id": result.get("id"),

        "name": name,

        "address": freeform_address,

        "city": municipality,

        "state": country_subdivision,

        "country": country,

        "postalCode": postal_code,

        "latitude": latitude,

        "longitude": longitude,

        "lat": latitude,

        "lng": longitude,

        "lon": longitude,

        "type": result.get("type"),

        "entityType": result.get(
            "entityType"
        ),
    }


# ==========================================================
# ESTIMATE VEHICLE VOLUME FROM SPEED
# ==========================================================

def estimate_vehicle_volume(avg_speed):
    """
    Estimate vehicle volume based on average road speed.

    TomTom Flow API does not provide actual vehicle count,
    so the system estimates traffic volume using speed.
    """

    avg_speed = _safe_float(
        avg_speed
    ) or 0

    if avg_speed >= 70:
        return 180

    elif avg_speed >= 60:
        return 350

    elif avg_speed >= 50:
        return 650

    elif avg_speed >= 40:
        return 950

    elif avg_speed >= 30:
        return 1400

    elif avg_speed >= 20:
        return 1900

    else:
        return 2400


# ==========================================================
# SEARCH LOCATION
# ==========================================================

@traffic_bp.get("/search")
@jwt_required()
def search_location():

    query = request.args.get(
        "q",
        ""
    ).strip()

    if not query:

        return jsonify({
            "error": (
                "Query parameter 'q' "
                "is required"
            )
        }), 400

    try:

        raw_results = (
            tomtom_service.search_location(
                query
            )
        )

    except TomTomNotConfigured as e:

        return jsonify({
            "error": str(e),
            "code": "TOMTOM_NOT_CONFIGURED",
        }), 503

    except TomTomAPIError as e:

        return jsonify({
            "error": str(e),
        }), e.status_code

    except Exception as e:

        print(
            "TomTom search error:",
            repr(e),
        )

        return jsonify({
            "error": (
                "Could not search location."
            ),
        }), 500

    if isinstance(raw_results, dict):

        raw_results = (
            raw_results.get("results")
            or []
        )

    elif not isinstance(raw_results, list):

        raw_results = []

    normalized_results = []

    for result in raw_results:

        normalized = (
            _normalize_search_result(
                result
            )
        )

        if normalized is not None:

            normalized_results.append(
                normalized
            )

    return jsonify({
        "results": normalized_results
    })


# ==========================================================
# LIVE TRAFFIC
# ==========================================================

@traffic_bp.get("/live")
@jwt_required()
def live_traffic():

    lat = _safe_float(
        request.args.get("lat")
    )

    lng = _safe_float(
        request.args.get("lng")
    )

    if lat is None or lng is None:

        return jsonify({
            "error": (
                "Valid latitude and "
                "longitude are required."
            ),

            "received": {
                "lat": request.args.get(
                    "lat"
                ),

                "lng": request.args.get(
                    "lng"
                ),
            },
        }), 400

    name = request.args.get(
        "name",
        f"{lat},{lng}",
    )

    city = request.args.get(
        "city"
    )

    state = request.args.get(
        "state"
    )

    country = request.args.get(
        "country"
    )

    area = request.args.get(
        "area"
    )

    try:

        flow = (
            tomtom_service
            .get_live_traffic_flow(
                lat,
                lng,
            )
        )

    except TomTomNotConfigured as e:

        return jsonify({
            "error": str(e),
            "code": "TOMTOM_NOT_CONFIGURED",
        }), 503

    except TomTomAPIError as e:

        return jsonify({
            "error": str(e),
        }), e.status_code

    except Exception as e:

        print(
            "Live traffic error:",
            repr(e),
        )

        return jsonify({
            "error": (
                "Could not retrieve "
                "live traffic."
            ),
        }), 500

    if not isinstance(flow, dict):

        return jsonify({
            "error": (
                "Invalid traffic data "
                "received from TomTom."
            ),
        }), 502

    road = _get_or_create_road(
        name=name,
        lat=lat,
        lng=lng,
        area=area,
        city=city,
        state=state,
        country=country,
        tomtom_id=None,
    )

    snapshot = (
        TrafficData.query
        .filter_by(
            road_id=road.id
        )
        .first()
    )

    if not snapshot:

        snapshot = TrafficData(
            road_id=road.id
        )

        db.session.add(
            snapshot
        )

    average_speed = (
        _safe_float(
            flow.get(
                "currentSpeed"
            )
        )
        or 0
    )

    free_flow_speed = (
        _safe_float(
            flow.get(
                "freeFlowSpeed"
            )
        )
        or average_speed
    )

    congestion_percent = (
        _safe_float(
            flow.get(
                "congestionPercent"
            )
        )
        or 0
    )

    congestion_level = (
        flow.get(
            "congestionLevel"
        )
        or _classify(
            congestion_percent
        )
    )

    vehicle_volume = (
        estimate_vehicle_volume(
            average_speed
        )
    )

    snapshot.average_speed = (
        average_speed
    )

    snapshot.vehicle_count = (
        vehicle_volume
    )

    snapshot.free_flow_speed = (
        free_flow_speed
    )

    snapshot.congestion_level = (
        congestion_level
    )

    snapshot.congestion_percent = (
        congestion_percent
    )

    snapshot.incidents_count = (
        snapshot.incidents_count or 0
    )

    snapshot.source = "tomtom"

    snapshot.updated_at = (
        datetime.utcnow()
    )

    db.session.add(
        TrafficHistory(
            road_id=road.id,

            vehicle_count=(
                vehicle_volume
            ),

            average_speed=(
                average_speed
            ),

            congestion_level=(
                congestion_level
            ),

            congestion_percent=(
                congestion_percent
            ),

            incidents_count=0,
        )
    )

    _create_traffic_notification(
        road=road,
        traffic_level=congestion_level,
        average_speed=average_speed,
        congestion_percent=congestion_percent,
    )

    if congestion_level == "heavy":

        _maybe_create_congestion_alert(
            road,
            congestion_percent,
        )

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            "Live traffic database error:",
            repr(e),
        )

        return jsonify({
            "error": (
                "Could not save live "
                "traffic data."
            ),
        }), 500

    return jsonify({
        "road": road.to_dict(),
        "traffic": flow,
    })


# ==========================================================
# MAJOR INDIAN LOCATIONS FOR HEATMAP
# ==========================================================

MAJOR_TRAFFIC_LOCATIONS = [

    # ------------------------------------------------------
    # KARNATAKA
    # ------------------------------------------------------

    {
        "name": "Bengaluru",
        "city": "Bengaluru",
        "state": "Karnataka",
        "lat": 12.9716,
        "lng": 77.5946,
    },

    {
        "name": "Mysuru",
        "city": "Mysuru",
        "state": "Karnataka",
        "lat": 12.2958,
        "lng": 76.6394,
    },

    {
        "name": "Mangaluru",
        "city": "Mangaluru",
        "state": "Karnataka",
        "lat": 12.9141,
        "lng": 74.8560,
    },

    # ------------------------------------------------------
    # TAMIL NADU
    # ------------------------------------------------------

    {
        "name": "Chennai",
        "city": "Chennai",
        "state": "Tamil Nadu",
        "lat": 13.0827,
        "lng": 80.2707,
    },

    {
        "name": "Coimbatore",
        "city": "Coimbatore",
        "state": "Tamil Nadu",
        "lat": 11.0168,
        "lng": 76.9558,
    },

    {
        "name": "Madurai",
        "city": "Madurai",
        "state": "Tamil Nadu",
        "lat": 9.9252,
        "lng": 78.1198,
    },

    # ------------------------------------------------------
    # TELANGANA
    # ------------------------------------------------------

    {
        "name": "Hyderabad",
        "city": "Hyderabad",
        "state": "Telangana",
        "lat": 17.3850,
        "lng": 78.4867,
    },

    # ------------------------------------------------------
    # MAHARASHTRA
    # ------------------------------------------------------

    {
        "name": "Mumbai",
        "city": "Mumbai",
        "state": "Maharashtra",
        "lat": 19.0760,
        "lng": 72.8777,
    },

    {
        "name": "Pune",
        "city": "Pune",
        "state": "Maharashtra",
        "lat": 18.5204,
        "lng": 73.8567,
    },

    {
        "name": "Nagpur",
        "city": "Nagpur",
        "state": "Maharashtra",
        "lat": 21.1458,
        "lng": 79.0882,
    },

    # ------------------------------------------------------
    # DELHI NCR
    # ------------------------------------------------------

    {
        "name": "New Delhi",
        "city": "New Delhi",
        "state": "Delhi",
        "lat": 28.6139,
        "lng": 77.2090,
    },

    {
        "name": "Gurugram",
        "city": "Gurugram",
        "state": "Haryana",
        "lat": 28.4595,
        "lng": 77.0266,
    },

    {
        "name": "Noida",
        "city": "Noida",
        "state": "Uttar Pradesh",
        "lat": 28.5355,
        "lng": 77.3910,
    },

    # ------------------------------------------------------
    # KERALA
    # ------------------------------------------------------

    {
        "name": "Kochi",
        "city": "Kochi",
        "state": "Kerala",
        "lat": 9.9312,
        "lng": 76.2673,
    },

    {
        "name": "Thiruvananthapuram",
        "city": "Thiruvananthapuram",
        "state": "Kerala",
        "lat": 8.5241,
        "lng": 76.9366,
    },

    # ------------------------------------------------------
    # ANDHRA PRADESH
    # ------------------------------------------------------

    {
        "name": "Visakhapatnam",
        "city": "Visakhapatnam",
        "state": "Andhra Pradesh",
        "lat": 17.6868,
        "lng": 83.2185,
    },

    {
        "name": "Vijayawada",
        "city": "Vijayawada",
        "state": "Andhra Pradesh",
        "lat": 16.5062,
        "lng": 80.6480,
    },

    # ------------------------------------------------------
    # GUJARAT
    # ------------------------------------------------------

    {
        "name": "Ahmedabad",
        "city": "Ahmedabad",
        "state": "Gujarat",
        "lat": 23.0225,
        "lng": 72.5714,
    },

    {
        "name": "Surat",
        "city": "Surat",
        "state": "Gujarat",
        "lat": 21.1702,
        "lng": 72.8311,
    },

    # ------------------------------------------------------
    # RAJASTHAN
    # ------------------------------------------------------

    {
        "name": "Jaipur",
        "city": "Jaipur",
        "state": "Rajasthan",
        "lat": 26.9124,
        "lng": 75.7873,
    },

    # ------------------------------------------------------
    # WEST BENGAL
    # ------------------------------------------------------

    {
        "name": "Kolkata",
        "city": "Kolkata",
        "state": "West Bengal",
        "lat": 22.5726,
        "lng": 88.3639,
    },

    # ------------------------------------------------------
    # UTTAR PRADESH
    # ------------------------------------------------------

    {
        "name": "Lucknow",
        "city": "Lucknow",
        "state": "Uttar Pradesh",
        "lat": 26.8467,
        "lng": 80.9462,
    },

    {
        "name": "Kanpur",
        "city": "Kanpur",
        "state": "Uttar Pradesh",
        "lat": 26.4499,
        "lng": 80.3319,
    },

    # ------------------------------------------------------
    # BIHAR
    # ------------------------------------------------------

    {
        "name": "Patna",
        "city": "Patna",
        "state": "Bihar",
        "lat": 25.5941,
        "lng": 85.1376,
    },

    # ------------------------------------------------------
    # ODISHA
    # ------------------------------------------------------

    {
        "name": "Bhubaneswar",
        "city": "Bhubaneswar",
        "state": "Odisha",
        "lat": 20.2961,
        "lng": 85.8245,
    },

    # ------------------------------------------------------
    # MADHYA PRADESH
    # ------------------------------------------------------

    {
        "name": "Bhopal",
        "city": "Bhopal",
        "state": "Madhya Pradesh",
        "lat": 23.2599,
        "lng": 77.4126,
    },

    {
        "name": "Indore",
        "city": "Indore",
        "state": "Madhya Pradesh",
        "lat": 22.7196,
        "lng": 75.8577,
    },

    # ------------------------------------------------------
    # PUNJAB / CHANDIGARH
    # ------------------------------------------------------

    {
        "name": "Chandigarh",
        "city": "Chandigarh",
        "state": "Chandigarh",
        "lat": 30.7333,
        "lng": 76.7794,
    },

    # ------------------------------------------------------
    # ASSAM
    # ------------------------------------------------------

    {
        "name": "Guwahati",
        "city": "Guwahati",
        "state": "Assam",
        "lat": 26.1445,
        "lng": 91.7362,
    },

    # ------------------------------------------------------
    # JHARKHAND
    # ------------------------------------------------------

    {
        "name": "Ranchi",
        "city": "Ranchi",
        "state": "Jharkhand",
        "lat": 23.3441,
        "lng": 85.3096,
    },

    # ------------------------------------------------------
    # CHHATTISGARH
    # ------------------------------------------------------

    {
        "name": "Raipur",
        "city": "Raipur",
        "state": "Chhattisgarh",
        "lat": 21.2514,
        "lng": 81.6296,
    },
]


def _major_heatmap_intensity(
    congestion_percent,
    congestion_level,
):
    """
    Convert congestion into Leaflet heatmap intensity.
    """

    percent = _safe_float(
        congestion_percent
    )

    if percent is not None:

        return max(
            0.10,
            min(
                1.0,
                percent / 100.0,
            ),
        )

    level = str(
        congestion_level or "low"
    ).lower()

    levels = {
        "low": 0.20,
        "moderate": 0.50,
        "high": 0.75,
        "heavy": 1.00,
        "severe": 1.00,
    }

    return levels.get(
        level,
        0.20,
    )


# ==========================================================
# MAJOR TRAFFIC HEATMAP
#
# BOTH ROUTES ARE SUPPORTED:
#
# /api/traffic/major-heatmap
# /api/traffic/heatmap-major
#
# This fixes the frontend/backend route mismatch.
# ==========================================================

@traffic_bp.get("/major-heatmap")
@traffic_bp.get("/heatmap-major")
@jwt_required()
def major_heatmap():

    """
    Return live traffic heatmap data for major
    Indian locations.

    Does NOT modify existing road traffic data.
    Does NOT create TrafficData records.
    Does NOT create TrafficHistory records.
    Does NOT create alerts.

    It only reads live TomTom traffic and
    returns heatmap points.
    """

    locations = []

    for location in MAJOR_TRAFFIC_LOCATIONS:

        try:

            flow = (
                tomtom_service
                .get_live_traffic_flow(
                    location["lat"],
                    location["lng"],
                )
            )

            if not isinstance(
                flow,
                dict,
            ):
                continue

            average_speed = (
                _safe_float(
                    flow.get(
                        "currentSpeed"
                    )
                )
                or 0
            )

            free_flow_speed = (
                _safe_float(
                    flow.get(
                        "freeFlowSpeed"
                    )
                )
                or average_speed
                or 1
            )

            congestion_percent = (
                _safe_float(
                    flow.get(
                        "congestionPercent"
                    )
                )
            )

            if congestion_percent is None:

                congestion_percent = max(
                    0,
                    min(
                        100,
                        (
                            1
                            - (
                                average_speed
                                / free_flow_speed
                            )
                        )
                        * 100,
                    ),
                )

            congestion_level = (
                flow.get(
                    "congestionLevel"
                )
                or _classify(
                    congestion_percent
                )
            )

            intensity = (
                _major_heatmap_intensity(
                    congestion_percent,
                    congestion_level,
                )
            )

            locations.append({

                "id": (
                    f"major-"
                    f"{location['city']}"
                ),

                "name": (
                    location["name"]
                ),

                "city": (
                    location["city"]
                ),

                "state": (
                    location["state"]
                ),

                "country": "India",

                "lat": (
                    location["lat"]
                ),

                "lng": (
                    location["lng"]
                ),

                "latitude": (
                    location["lat"]
                ),

                "longitude": (
                    location["lng"]
                ),

                "averageSpeed": (
                    average_speed
                ),

                "freeFlowSpeed": (
                    free_flow_speed
                ),

                "congestionPercent": round(
                    congestion_percent,
                    1,
                ),

                "congestionLevel": (
                    congestion_level
                ),

                "intensity": (
                    intensity
                ),

                "source": "tomtom",
            })

        except (
            TomTomNotConfigured,
            TomTomAPIError,
        ) as e:

            print(
                f"Major heatmap error "
                f"for {location['name']}:",
                repr(e),
            )

            continue

        except Exception as e:

            print(
                f"Unexpected major heatmap "
                f"error for {location['name']}:",
                repr(e),
            )

            continue

    return jsonify({
        "items": locations,
        "count": len(locations),
        "source": "tomtom",
    })


# ==========================================================
# REAL-TIME TRAFFIC NOTIFICATION
# ==========================================================

def _create_traffic_notification(
    road,
    traffic_level,
    average_speed,
    congestion_percent,
):
    """
    Create a traffic notification and broadcast it instantly
    to every connected dashboard.
    """

    traffic_level = (
        traffic_level or "low"
    ).lower()

    titles = {
        "low": "Traffic Flowing Smoothly",
        "moderate": "Moderate Traffic",
        "high": "High Traffic Alert",
        "heavy": "Heavy Congestion Alert",
    }

    severities = {
        "low": "low",
        "moderate": "medium",
        "high": "high",
        "heavy": "critical",
    }

    messages = {
        "low": (
            f"{road.name} "
            f"is flowing smoothly."
        ),

        "moderate": (
            f"Moderate traffic detected "
            f"on {road.name}."
        ),

        "high": (
            f"High traffic detected "
            f"on {road.name}."
        ),

        "heavy": (
            f"Heavy congestion detected "
            f"on {road.name}."
        ),
    }

    if traffic_level not in titles:
        traffic_level = "low"

    two_minutes_ago = (
        datetime.now(timezone.utc)
        - timedelta(minutes=2)
    )

    existing = (
        Alert.query
        .filter(
            Alert.road_id == road.id,

            Alert.alert_type == "traffic",

            Alert.status == "active",

            Alert.created_at >= (
                two_minutes_ago
            ),
        )
        .first()
    )

    if existing:
        return

    alert = Alert(
        road_id=road.id,

        alert_type="traffic",

        severity=(
            severities[
                traffic_level
            ]
        ),

        status="active",

        title=(
            titles[
                traffic_level
            ]
        ),

        message=(
            messages[
                traffic_level
            ]
        ),

        location_name=road.name,

        latitude=road.latitude,

        longitude=road.longitude,
    )

    db.session.add(
        alert
    )

    db.session.flush()

    socketio.emit(
        "new_notification",
        {
            "id": alert.id,

            "road": road.name,

            "trafficLevel": (
                traffic_level
            ),

            "severity": (
                severities[
                    traffic_level
                ]
            ),

            "status": "active",

            "averageSpeed": (
                average_speed
            ),

            "congestionPercent": round(
                congestion_percent,
                1,
            ),

            "time": datetime.now().strftime(
                "%I:%M %p"
            ),

            "title": (
                titles[
                    traffic_level
                ]
            ),

            "message": (
                messages[
                    traffic_level
                ]
            ),
        },
    )


# ==========================================================
# CONGESTION ALERT
# ==========================================================

def _maybe_create_congestion_alert(
    road,
    congestion_percent,
):

    recent = (
        Alert.query
        .filter_by(
            road_id=road.id,
            alert_type="congestion",
            status="active",
        )
        .first()
    )

    if recent:
        return

    severity = (
        "high"
        if congestion_percent < 85
        else "critical"
    )

    db.session.add(
        Alert(
            road_id=road.id,

            alert_type="congestion",

            severity=severity,

            title=(
                f"Heavy congestion on "
                f"{road.name}"
            ),

            message=(
                f"Congestion at "
                f"{congestion_percent:.0f}% "
                f"on {road.name}."
            ),

            location_name=road.name,

            latitude=road.latitude,

            longitude=road.longitude,
        )
    )


# ==========================================================
# MANUAL TRAFFIC UPDATE
# ==========================================================

@traffic_bp.put(
    "/update/<int:road_id>"
)
@jwt_required()
def update_traffic(road_id):

    road = (
        Road.query
        .get_or_404(road_id)
    )

    data = (
        request.get_json(
            silent=True
        )
        or {}
    )

    missing = require_fields(
        data,
        [
            "vehicleCount",
            "averageSpeed",
        ],
    )

    if missing:

        return jsonify({
            "error": (
                "Missing fields: "
                + ", ".join(missing)
            )
        }), 400

    try:

        vehicle_count = int(
            data["vehicleCount"]
        )

        average_speed = float(
            data["averageSpeed"]
        )

    except (
        TypeError,
        ValueError,
    ):

        return jsonify({
            "error": (
                "vehicleCount and "
                "averageSpeed must "
                "be valid numbers."
            )
        }), 400

    free_flow = (
        _safe_float(
            data.get(
                "freeFlowSpeed"
            )
        )
        or max(
            average_speed,
            40
        )
    )

    if free_flow <= 0:

        free_flow = max(
            average_speed,
            40
        )

    congestion_percent = max(
        0,

        min(
            100,

            round(
                (
                    1
                    - (
                        average_speed
                        / free_flow
                    )
                )
                * 100,

                1,
            ),
        ),
    )

    level = (
        data.get(
            "congestionLevel"
        )
        or _classify(
            congestion_percent
        )
    )

    snapshot = (
        TrafficData.query
        .filter_by(
            road_id=road.id
        )
        .first()
    )

    if not snapshot:

        snapshot = TrafficData(
            road_id=road.id
        )

        db.session.add(
            snapshot
        )

    incidents_count = data.get(
        "incidentsCount",
        0,
    )

    try:

        incidents_count = int(
            incidents_count
        )

    except (
        TypeError,
        ValueError,
    ):

        incidents_count = 0

    snapshot.vehicle_count = (
        vehicle_count
    )

    snapshot.average_speed = (
        average_speed
    )

    snapshot.free_flow_speed = (
        free_flow
    )

    snapshot.congestion_level = (
        level
    )

    snapshot.congestion_percent = (
        congestion_percent
    )

    snapshot.incidents_count = (
        incidents_count
    )

    snapshot.weather_condition = (
        data.get(
            "weatherCondition"
        )
    )

    snapshot.source = "manual"

    identity = get_jwt_identity()

    try:

        snapshot.recorded_by_id = int(
            identity
        )

    except (
        TypeError,
        ValueError,
    ):

        snapshot.recorded_by_id = None

    snapshot.updated_at = (
        datetime.utcnow()
    )

    db.session.add(
        TrafficHistory(
            road_id=road.id,

            vehicle_count=(
                vehicle_count
            ),

            average_speed=(
                average_speed
            ),

            congestion_level=(
                level
            ),

            congestion_percent=(
                congestion_percent
            ),

            incidents_count=(
                incidents_count
            ),

            weather_condition=(
                data.get(
                    "weatherCondition"
                )
            ),
        )
    )

    _create_traffic_notification(
        road=road,
        traffic_level=level,
        average_speed=average_speed,
        congestion_percent=congestion_percent,
    )

    if level == "heavy":

        _maybe_create_congestion_alert(
            road,
            congestion_percent,
        )

    try:

        db.session.commit()

    except Exception as e:

        db.session.rollback()

        print(
            "Manual traffic update error:",
            repr(e),
        )

        return jsonify({
            "error": (
                "Could not update "
                "traffic data."
            )
        }), 500

    return jsonify(
        snapshot.to_dict()
    )


# ==========================================================
# CURRENT TRAFFIC SNAPSHOTS
# ==========================================================

@traffic_bp.get("/current")
@jwt_required()
def current_traffic():

    snapshots = (
        TrafficData.query
        .join(Road)
        .order_by(
            TrafficData.updated_at.desc()
        )
        .limit(200)
        .all()
    )

    return jsonify({
        "items": [
            snapshot.to_dict()
            for snapshot in snapshots
        ]
    })


# ==========================================================
# ALL ROADS
# ==========================================================

@traffic_bp.get("/roads")
@jwt_required()
def list_roads():

    roads = (
        Road.query
        .order_by(
            Road.name
        )
        .limit(500)
        .all()
    )

    return jsonify({
        "items": [
            road.to_dict()
            for road in roads
        ]
    })


# ==========================================================
# ROAD & CITY AUTOCOMPLETE
# ==========================================================

@traffic_bp.get("/suggestions")
@jwt_required()
def traffic_suggestions():

    q = request.args.get(
        "q",
        ""
    ).strip()

    if not q:

        return jsonify({
            "roads": [],
            "cities": [],
        })

    roads = (
        Road.query
        .filter(
            Road.name.ilike(
                f"%{q}%"
            )
        )
        .order_by(
            Road.name
        )
        .limit(8)
        .all()
    )

    cities = (
        db.session
        .query(
            Road.city
        )
        .filter(
            Road.city.isnot(None),

            Road.city.ilike(
                f"%{q}%"
            ),
        )
        .distinct()
        .limit(8)
        .all()
    )

    return jsonify({
        "roads": [
            {
                "id": road.id,

                "name": road.name,

                "city": road.city,
            }

            for road in roads
        ],

        "cities": [
            city[0]

            for city in cities

            if city[0]
        ],
    })


# ==========================================================
# TRAFFIC TREND ANALYSIS
# ==========================================================

@traffic_bp.get("/trends")
@jwt_required()
def traffic_trends():
    """
    Analyze historical traffic trends using TrafficHistory.

    Query parameters:
        road   - optional road-name filter
        city   - optional city filter
        state  - optional state filter
        from   - optional YYYY-MM-DD start date
        to     - optional YYYY-MM-DD end date (inclusive)
        period - hour or day (default: hour)
    """
    road_name = request.args.get("road", "").strip()
    city = request.args.get("city", "").strip()
    state = request.args.get("state", "").strip()
    date_from = request.args.get("from", "").strip()
    date_to = request.args.get("to", "").strip()
    period = request.args.get("period", "hour").strip().lower()

    if period not in ("hour", "day"):
        period = "hour"

    query = TrafficHistory.query.join(Road)

    if road_name:
        query = query.filter(Road.name.ilike(f"%{road_name}%"))

    if city:
        query = query.filter(Road.city.ilike(f"%{city}%"))

    if state:
        query = query.filter(Road.state == state)

    try:
        if date_from:
            start_date = datetime.strptime(date_from, "%Y-%m-%d")
            query = query.filter(TrafficHistory.recorded_at >= start_date)

        if date_to:
            end_date = datetime.strptime(date_to, "%Y-%m-%d") + timedelta(days=1)
            query = query.filter(TrafficHistory.recorded_at < end_date)
    except ValueError:
        return jsonify({
            "error": "Invalid date format. Use YYYY-MM-DD."
        }), 400

    rows = (
        query
        .order_by(TrafficHistory.recorded_at.asc())
        .limit(5000)
        .all()
    )

    grouped = {}

    for row in rows:
        recorded_at = row.recorded_at
        if not recorded_at:
            continue

        if period == "day":
            key = recorded_at.strftime("%Y-%m-%d")
            label = recorded_at.strftime("%d %b")
        else:
            key = recorded_at.strftime("%Y-%m-%d %H:00")
            label = recorded_at.strftime("%d %b %I %p")

        bucket = grouped.setdefault(key, {
            "label": label,
            "vehicleCounts": [],
            "speeds": [],
            "congestion": [],
            "incidents": 0,
        })

        bucket["vehicleCounts"].append(row.vehicle_count or 0)
        bucket["speeds"].append(float(row.average_speed or 0))
        bucket["congestion"].append(float(row.congestion_percent or 0))
        bucket["incidents"] += row.incidents_count or 0

    items = []

    for key in sorted(grouped):
        bucket = grouped[key]

        vehicle_values = bucket["vehicleCounts"]
        speed_values = bucket["speeds"]
        congestion_values = bucket["congestion"]

        items.append({
            "period": key,
            "label": bucket["label"],
            "vehicleCount": round(
                sum(vehicle_values) / len(vehicle_values), 1
            ) if vehicle_values else 0,
            "averageSpeed": round(
                sum(speed_values) / len(speed_values), 1
            ) if speed_values else 0,
            "congestionPercent": round(
                sum(congestion_values) / len(congestion_values), 1
            ) if congestion_values else 0,
            "incidents": bucket["incidents"],
        })

    if items:
        average_vehicle_count = sum(
            item["vehicleCount"] for item in items
        ) / len(items)
        average_speed = sum(
            item["averageSpeed"] for item in items
        ) / len(items)
        average_congestion = sum(
            item["congestionPercent"] for item in items
        ) / len(items)
        total_incidents = sum(
            item["incidents"] for item in items
        )
    else:
        average_vehicle_count = 0
        average_speed = 0
        average_congestion = 0
        total_incidents = 0

    trend = "stable"
    trend_change = 0

    if len(items) >= 2:
        trend_change = (
            items[-1]["congestionPercent"]
            - items[0]["congestionPercent"]
        )

        if trend_change >= 5:
            trend = "increasing"
        elif trend_change <= -5:
            trend = "decreasing"

    peak_period = None
    if items:
        peak = max(
            items,
            key=lambda item: item["congestionPercent"]
        )
        peak_period = {
            "period": peak["period"],
            "label": peak["label"],
            "congestionPercent": peak["congestionPercent"],
            "vehicleCount": peak["vehicleCount"],
            "averageSpeed": peak["averageSpeed"],
        }

    return jsonify({
        "items": items,
        "summary": {
            "averageVehicleCount": round(average_vehicle_count, 1),
            "averageSpeed": round(average_speed, 1),
            "averageCongestion": round(average_congestion, 1),
            "totalIncidents": total_incidents,
            "trend": trend,
            "trendChange": round(trend_change, 1),
            "peakPeriod": peak_period,
        },
        "filters": {
            "road": road_name or None,
            "city": city or None,
            "state": state or None,
            "from": date_from or None,
            "to": date_to or None,
            "period": period,
        },
        "count": len(items),
    })


# ==========================================================
# TRAFFIC HISTORY
# ==========================================================

@traffic_bp.get("/history")
@jwt_required()
def traffic_history():

    road_name = request.args.get(
        "road"
    )

    city = request.args.get(
        "city"
    )

    state = request.args.get(
        "state"
    )

    date_from = request.args.get(
        "from"
    )

    date_to = request.args.get(
        "to"
    )

    try:

        page = int(
            request.args.get(
                "page",
                1
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        page = 1

    try:

        per_page = int(
            request.args.get(
                "perPage",
                10
            )
        )

    except (
        TypeError,
        ValueError,
    ):

        per_page = 10

    page = max(
        page,
        1
    )

    per_page = max(
        min(
            per_page,
            100
        ),
        1
    )

    query = (
        TrafficHistory.query
        .join(Road)
    )

    if road_name:

        query = query.filter(
            Road.name.ilike(
                f"%{road_name}%"
            )
        )

    if city:

        query = query.filter(
            Road.city.ilike(
                f"%{city}%"
            )
        )

    if state:

        query = query.filter(
            Road.state == state
        )

    if date_from:

        query = query.filter(
            TrafficHistory.recorded_at
            >= date_from
        )

    if date_to:

        query = query.filter(
            TrafficHistory.recorded_at
            <= date_to
        )

    total = query.count()

    rows = (
        query
        .order_by(
            TrafficHistory.recorded_at.desc()
        )
        .offset(
            (page - 1)
            * per_page
        )
        .limit(
            per_page
        )
        .all()
    )

    return jsonify({
        "items": [
            row.to_dict()
            for row in rows
        ],

        "total": total,

        "page": page,

        "perPage": per_page,
    })


