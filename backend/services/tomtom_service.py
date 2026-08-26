"""
TrafficVision AI - TomTom Service

Wrapper around the TomTom APIs used by TrafficVision AI.

APIs:
    - Search API
    - Traffic Flow API
    - Traffic Incidents API
    - Routing API

Requires:
    TOMTOM_API_KEY in .env
"""

import requests
from flask import current_app


# ==========================================================
# CUSTOM EXCEPTIONS
# ==========================================================

class TomTomNotConfigured(Exception):
    pass


class TomTomAPIError(Exception):

    def __init__(self, message, status_code=502):
        super().__init__(message)
        self.status_code = status_code


# ==========================================================
# API KEY
# ==========================================================

def _api_key():
    key = current_app.config.get("TOMTOM_API_KEY")

    if not key:
        raise TomTomNotConfigured(
            "TOMTOM_API_KEY is not configured. "
            "Add TOMTOM_API_KEY to your .env file."
        )

    return key


# ==========================================================
# BASE URL
# ==========================================================

def _base():
    return current_app.config.get(
        "TOMTOM_BASE_URL",
        "https://api.tomtom.com"
    )


# ==========================================================
# SEARCH LOCATION
# ==========================================================

def search_location(query: str, limit: int = 8):
    """
    TomTom Fuzzy Search API.

    Used for:
        - cities
        - roads
        - junctions
        - areas
        - places
        - POIs
    """

    key = _api_key()

    url = (
        f"{_base()}/search/2/search/"
        f"{requests.utils.quote(query)}.json"
    )

    params = {
        "key": key,
        "limit": limit,
        "idxSet": "PAD,POI,Str,Xstr,Geo",
    }

    try:

        response = requests.get(
            url,
            params=params,
            timeout=10
        )

    except requests.RequestException as e:

        raise TomTomAPIError(
            f"Unable to connect to TomTom Search API: {str(e)}",
            status_code=502
        )

    if response.status_code != 200:

        try:
            error_data = response.json()
        except ValueError:
            error_data = {}

        error_message = None

        if isinstance(error_data, dict):

            detailed_error = error_data.get(
                "detailedError"
            )

            if isinstance(detailed_error, dict):
                error_message = detailed_error.get(
                    "message"
                )

            if not error_message:

                error_object = error_data.get(
                    "error"
                )

                if isinstance(error_object, dict):

                    error_message = (
                        error_object.get("description")
                        or error_object.get("message")
                    )

        if not error_message:
            error_message = (
                f"TomTom Search API error: "
                f"{response.status_code}"
            )

        raise TomTomAPIError(
            error_message,
            status_code=response.status_code
        )

    try:

        data = response.json()

    except ValueError:

        raise TomTomAPIError(
            "TomTom Search API returned an invalid response.",
            status_code=502
        )

    results = []

    for item in data.get("results", []):

        position = item.get(
            "position",
            {}
        )

        address = item.get(
            "address",
            {}
        )

        poi = item.get(
            "poi",
            {}
        )

        result = {
            "name": (
                poi.get("name")
                or item.get("address", {}).get("freeformAddress")
                or item.get("type")
                or "Unknown location"
            ),

            "lat": position.get(
                "lat"
            ),

            "lng": position.get(
                "lon"
            ),

            "address": address.get(
                "freeformAddress"
            ),

            "type": item.get(
                "type"
            ),

            "entityType": item.get(
                "entityType"
            ),
        }

        if (
            result["lat"] is not None
            and result["lng"] is not None
        ):

            results.append(
                result
            )

    return results[:limit]


# ==========================================================
# CONGESTION CALCULATION
# ==========================================================

def _calculate_congestion(
    current_speed,
    free_flow_speed,
    current_travel_time=None,
    free_flow_travel_time=None
):
    """
    Calculate congestion using TomTom traffic values.

    Two signals are considered:

    1. Speed-based congestion

       (1 - currentSpeed / freeFlowSpeed) * 100

    2. Travel-time-based congestion

       ((currentTravelTime / freeFlowTravelTime) - 1) * 100

    The strongest valid signal is used.

    Classification:

        0 - 29.9   -> low
        30 - 59.9  -> moderate
        60 - 100   -> heavy
    """

    speed_congestion = None
    travel_time_congestion = None

    # ======================================================
    # SPEED BASED CONGESTION
    # ======================================================

    try:

        if (
            current_speed is not None
            and free_flow_speed is not None
            and float(free_flow_speed) > 0
        ):

            current_speed = float(
                current_speed
            )

            free_flow_speed = float(
                free_flow_speed
            )

            speed_ratio = (
                current_speed /
                free_flow_speed
            )

            speed_congestion = (
                1 - speed_ratio
            ) * 100

    except (
        TypeError,
        ValueError,
        ZeroDivisionError
    ):

        speed_congestion = None

    # ======================================================
    # TRAVEL TIME BASED CONGESTION
    # ======================================================

    try:

        if (
            current_travel_time is not None
            and free_flow_travel_time is not None
            and float(free_flow_travel_time) > 0
        ):

            current_travel_time = float(
                current_travel_time
            )

            free_flow_travel_time = float(
                free_flow_travel_time
            )

            travel_time_congestion = (
                (
                    current_travel_time /
                    free_flow_travel_time
                ) - 1
            ) * 100

    except (
        TypeError,
        ValueError,
        ZeroDivisionError
    ):

        travel_time_congestion = None

    # ======================================================
    # DEBUG
    # ======================================================

    print()
    print("==============================================")
    print("        CONGESTION CALCULATION")
    print("==============================================")
    print(
        "Speed congestion:",
        speed_congestion
    )
    print(
        "Travel time congestion:",
        travel_time_congestion
    )
    print("==============================================")
    print()

    # ======================================================
    # SELECT STRONGEST VALID SIGNAL
    # ======================================================

    valid_values = []

    if speed_congestion is not None:

        valid_values.append(
            speed_congestion
        )

    if travel_time_congestion is not None:

        valid_values.append(
            travel_time_congestion
        )

    if not valid_values:

        congestion_percent = 0

    else:

        valid_values = [
            max(0, value)
            for value in valid_values
        ]

        congestion_percent = max(
            valid_values
        )

    # ======================================================
    # LIMIT 0 - 100
    # ======================================================

    congestion_percent = max(
        0,
        min(
            100,
            round(
                congestion_percent,
                1
            )
        )
    )

    # ======================================================
    # CLASSIFICATION
    # ======================================================

    if congestion_percent < 30:

        congestion_level = "low"

    elif congestion_percent < 60:

        congestion_level = "moderate"

    else:

        congestion_level = "heavy"

    return (
        congestion_percent,
        congestion_level
    )


# ==========================================================
# LIVE TRAFFIC FLOW
# ==========================================================

def get_live_traffic_flow(
    lat: float,
    lon: float
):
    """
    Returns live traffic information
    for the road segment nearest the point.

    Returns:

        currentSpeed
        freeFlowSpeed
        currentTravelTime
        freeFlowTravelTime
        confidence
        roadClosure
        congestionPercent
        congestionLevel
    """

    key = _api_key()

    url = (
        f"{_base()}/traffic/services/4/"
        f"flowSegmentData/absolute/10/json"
    )

    params = {
        "key": key,
        "point": f"{lat},{lon}",
    }

    # ======================================================
    # TOMTOM REQUEST
    # ======================================================

    try:

        response = requests.get(
            url,
            params=params,
            timeout=10
        )

    except requests.RequestException as e:

        raise TomTomAPIError(
            f"Unable to connect to TomTom Traffic API: {str(e)}",
            status_code=502
        )

    # ======================================================
    # API ERROR
    # ======================================================

    if response.status_code != 200:

        try:
            error_data = response.json()
        except ValueError:
            error_data = {}

        error_message = None

        if isinstance(error_data, dict):

            detailed_error = error_data.get(
                "detailedError"
            )

            if isinstance(detailed_error, dict):

                error_message = detailed_error.get(
                    "message"
                )

            if not error_message:

                error_object = error_data.get(
                    "error"
                )

                if isinstance(error_object, dict):

                    error_message = (
                        error_object.get("description")
                        or error_object.get("message")
                    )

        if not error_message:

            error_message = (
                f"TomTom Traffic API error: "
                f"{response.status_code}"
            )

        raise TomTomAPIError(
            error_message,
            status_code=response.status_code
        )

    # ======================================================
    # JSON
    # ======================================================

    try:

        data = response.json()

    except ValueError:

        raise TomTomAPIError(
            "TomTom Traffic API returned an invalid response.",
            status_code=502
        )

    # ======================================================
    # FLOW DATA
    # ======================================================

    flow_data = data.get(
        "flowSegmentData",
        data
    )

    if not isinstance(
        flow_data,
        dict
    ):

        raise TomTomAPIError(
            "TomTom Traffic API returned an invalid flow response.",
            status_code=502
        )

    # ======================================================
    # RAW TOMTOM VALUES
    # ======================================================

    current_speed = flow_data.get(
        "currentSpeed"
    )

    free_flow_speed = flow_data.get(
        "freeFlowSpeed"
    )

    current_travel_time = flow_data.get(
        "currentTravelTime"
    )

    free_flow_travel_time = flow_data.get(
        "freeFlowTravelTime"
    )

    confidence = flow_data.get(
        "confidence"
    )

    road_closure = flow_data.get(
        "roadClosure"
    )

    # ======================================================
    # CALCULATE CONGESTION
    # ======================================================

    (
        congestion_percent,
        congestion_level
    ) = _calculate_congestion(
        current_speed=current_speed,
        free_flow_speed=free_flow_speed,
        current_travel_time=current_travel_time,
        free_flow_travel_time=free_flow_travel_time
    )

    # ======================================================
    # DEBUG
    # ======================================================

    print()
    print("==============================================")
    print("        FINAL TRAFFIC RESULT")
    print("==============================================")
    print(
        "Current Speed:",
        current_speed
    )
    print(
        "Free Flow Speed:",
        free_flow_speed
    )
    print(
        "Current Travel Time:",
        current_travel_time
    )
    print(
        "Free Flow Travel Time:",
        free_flow_travel_time
    )
    print(
        "Congestion Percent:",
        congestion_percent
    )
    print(
        "Congestion Level:",
        congestion_level
    )
    print("==============================================")
    print()

    # ======================================================
    # RETURN
    # ======================================================

    return {

        "currentSpeed":
            current_speed,

        "freeFlowSpeed":
            free_flow_speed,

        "currentTravelTime":
            current_travel_time,

        "freeFlowTravelTime":
            free_flow_travel_time,

        "confidence":
            confidence,

        "roadClosure":
            road_closure,

        "congestionPercent":
            congestion_percent,

        "congestionLevel":
            congestion_level,
    }


# ==========================================================
# TRAFFIC INCIDENTS
# ==========================================================

def get_incidents(
    bbox: str
):
    """
    Get TomTom traffic incidents.

    bbox format:

        minLon,minLat,maxLon,maxLat
    """

    key = _api_key()

    url = (
        f"{_base()}/traffic/services/5/"
        f"incidentDetails"
    )

    params = {
        "key": key,
        "bbox": bbox,
        "fields": (
            "{incidents{"
            "type,"
            "geometry{type,coordinates},"
            "properties{"
            "id,"
            "iconCategory,"
            "magnitudeOfDelay,"
            "events{description},"
            "startTime,"
            "endTime,"
            "from,"
            "to"
            "}"
            "}}"
        ),
        "language": "en-GB",
        "t": 0,
        "timeValidityFilter": "present",
    }

    try:

        response = requests.get(
            url,
            params=params,
            timeout=15
        )

    except requests.RequestException as e:

        raise TomTomAPIError(
            f"Unable to connect to TomTom Incidents API: {str(e)}",
            status_code=502
        )

    if response.status_code != 200:

        try:
            error_data = response.json()
        except ValueError:
            error_data = {}

        error_message = None

        if isinstance(error_data, dict):

            detailed_error = error_data.get(
                "detailedError"
            )

            if isinstance(detailed_error, dict):

                error_message = detailed_error.get(
                    "message"
                )

        if not error_message:

            error_message = (
                f"TomTom Incidents API error: "
                f"{response.status_code}"
            )

        raise TomTomAPIError(
            error_message,
            status_code=response.status_code
        )

    try:

        data = response.json()

    except ValueError:

        raise TomTomAPIError(
            "TomTom Incidents API returned an invalid response.",
            status_code=502
        )

    if not isinstance(
        data,
        dict
    ):

        raise TomTomAPIError(
            "TomTom Incidents API returned an invalid response.",
            status_code=502
        )

    return data.get(
        "incidents",
        []
    )


# ==========================================================
# AI TRAVEL TIME PREDICTION
# ==========================================================

def _calculate_ai_prediction(
    travel_time_sec,
    congestion_percent=None,
    congestion_level=None
):
    """
    Estimate future travel time using current traffic
    conditions.

    Multipliers:

        Low       -> 1.05
        Moderate  -> 1.15
        Heavy     -> 1.30

    If congestion percentage is available, it is preferred
    over the text classification.
    """

    if travel_time_sec is None:

        return None

    try:

        travel_time_sec = float(
            travel_time_sec
        )

    except (
        TypeError,
        ValueError
    ):

        return None

    if travel_time_sec <= 0:

        return None

    # ======================================================
    # DETERMINE MULTIPLIER
    # ======================================================

    if congestion_percent is not None:

        try:

            congestion_percent = float(
                congestion_percent
            )

        except (
            TypeError,
            ValueError
        ):

            congestion_percent = None

    if congestion_percent is not None:

        if congestion_percent < 30:

            multiplier = 1.05

        elif congestion_percent < 60:

            multiplier = 1.15

        else:

            multiplier = 1.30

    else:

        level = str(
            congestion_level or ""
        ).lower()

        if level == "heavy":

            multiplier = 1.30

        elif level == "moderate":

            multiplier = 1.15

        else:

            multiplier = 1.05

    return int(
        round(
            travel_time_sec * multiplier
        )
    )


# ==========================================================
# CALCULATE ROUTE
# ==========================================================

def calculate_route(
    origin,
    destination,
    avoid=None
):
    """
    Calculate traffic-aware routes using TomTom Routing API.

    Returns all routes provided by TomTom.

    Each route contains:

        - distanceMeters
        - travelTimeSec
        - trafficDelaySec
        - arrivalTime
        - points

    And AI prediction fields:

        - aiPredictedCongestion
        - aiPredictedCongestionPercent
        - aiPredictedTravelTimeSec
    """

    key = _api_key()

    # ======================================================
    # COORDINATES
    # ======================================================

    coords = (
        f"{origin['lat']},{origin['lng']}:"
        f"{destination['lat']},{destination['lng']}"
    )

    url = (
        f"{_base()}/routing/1/"
        f"calculateRoute/{coords}/json"
    )

    # ======================================================
    # ROUTING PARAMETERS
    # ======================================================

    params = [
        ("key", key),
        ("traffic", "true"),
        ("travelMode", "car"),
        ("routeType", "fastest"),
        ("maxAlternatives", "2"),
        ("computeTravelTimeFor", "all"),
    ]

    # ======================================================
    # AVOID OPTIONS
    # ======================================================

    if avoid:

        clean_avoid = list(
            dict.fromkeys(avoid)
        )

        valid_avoid_options = {
            "tollRoads",
            "motorways",
        }

        clean_avoid = [
            value
            for value in clean_avoid
            if value in valid_avoid_options
        ]

        for avoid_value in clean_avoid:

            params.append(
                (
                    "avoid",
                    avoid_value
                )
            )

    # ======================================================
    # DEBUG REQUEST
    # ======================================================

    print()
    print("==============================================")
    print("        TOMTOM ROUTING REQUEST")
    print("==============================================")
    print("Origin:", origin)
    print("Destination:", destination)
    print("Avoid:", avoid)
    print("Parameters:", params)
    print("==============================================")
    print()

    # ======================================================
    # SEND REQUEST
    # ======================================================

    try:

        response = requests.get(
            url,
            params=params,
            timeout=20
        )

    except requests.RequestException as e:

        raise TomTomAPIError(
            f"Unable to connect to TomTom Routing API: {str(e)}",
            status_code=502
        )

    # ======================================================
    # ERROR HANDLING
    # ======================================================

    if response.status_code != 200:

        try:

            error_data = response.json()

        except ValueError:

            error_data = {}

        print()
        print("==============================================")
        print("           TOMTOM ROUTING ERROR")
        print("==============================================")
        print("Status:", response.status_code)
        print("Response:", error_data)
        print("URL:", response.url)
        print("==============================================")
        print()

        error_message = None

        detailed_error = error_data.get(
            "detailedError"
        )

        if isinstance(
            detailed_error,
            dict
        ):

            error_message = detailed_error.get(
                "message"
            )

        if not error_message:

            error_object = error_data.get(
                "error"
            )

            if isinstance(
                error_object,
                dict
            ):

                error_message = (
                    error_object.get(
                        "description"
                    )
                    or error_object.get(
                        "message"
                    )
                )

        if not error_message:

            error_message = (
                f"TomTom Routing API error: "
                f"{response.status_code}"
            )

        raise TomTomAPIError(
            error_message,
            status_code=response.status_code
        )

    # ======================================================
    # PARSE JSON
    # ======================================================

    try:

        data = response.json()

    except ValueError:

        raise TomTomAPIError(
            "TomTom Routing API returned an invalid response.",
            status_code=502
        )

    # ======================================================
    # BUILD ROUTES
    # ======================================================

    routes = []

    tomtom_routes = data.get(
        "routes",
        []
    )

    for index, route in enumerate(
        tomtom_routes
    ):

        summary = route.get(
            "summary",
            {}
        )

        points = []

        # ==================================================
        # POLYLINE POINTS
        # ==================================================

        for leg in route.get(
            "legs",
            []
        ):

            for point in leg.get(
                "points",
                []
            ):

                latitude = point.get(
                    "latitude"
                )

                longitude = point.get(
                    "longitude"
                )

                if (
                    latitude is not None
                    and longitude is not None
                ):

                    points.append(
                        (
                            latitude,
                            longitude
                        )
                    )

        # ==================================================
        # BASIC ROUTE VALUES
        # ==================================================

        distance_meters = summary.get(
            "lengthInMeters"
        )

        travel_time_sec = summary.get(
            "travelTimeInSeconds"
        )

        traffic_delay_sec = (
            summary.get(
                "trafficDelayInSeconds"
            )
            or 0
        )

        arrival_time = summary.get(
            "arrivalTime"
        )

        # ==================================================
        # AI DEFAULT VALUES
        # ==================================================

        ai_predicted_congestion = None

        ai_predicted_congestion_percent = None

        ai_predicted_travel_time_sec = None

        # ==================================================
        # GET LIVE TRAFFIC
        # ==================================================

        if points:

            try:

                # Use a point slightly inside the route
                # instead of the exact origin.

                point_index = min(
                    5,
                    len(points) - 1
                )

                traffic_point = points[
                    point_index
                ]

                traffic = get_live_traffic_flow(
                    traffic_point[0],
                    traffic_point[1]
                )

                # ------------------------------------------
                # CONGESTION
                # ------------------------------------------

                ai_predicted_congestion = (
                    traffic.get(
                        "congestionLevel"
                    )
                )

                ai_predicted_congestion_percent = (
                    traffic.get(
                        "congestionPercent"
                    )
                )

                # ------------------------------------------
                # AI TRAVEL TIME
                # ------------------------------------------

                ai_predicted_travel_time_sec = (
                    _calculate_ai_prediction(
                        travel_time_sec=travel_time_sec,
                        congestion_percent=(
                            ai_predicted_congestion_percent
                        ),
                        congestion_level=(
                            ai_predicted_congestion
                        )
                    )
                )

            except (
                TomTomNotConfigured,
                TomTomAPIError,
                TypeError,
                ValueError,
                KeyError,
                IndexError
            ) as e:

                # ------------------------------------------
                # IMPORTANT
                # ------------------------------------------
                #
                # Routing should NOT fail just because
                # Traffic Flow prediction fails.
                #
                # The route itself remains usable.
                #

                print()
                print("==============================================")
                print("       AI ROUTE PREDICTION WARNING")
                print("==============================================")
                print(
                    f"Route {index + 1}:",
                    str(e)
                )
                print("==============================================")
                print()

        # ==================================================
        # FALLBACK AI PREDICTION
        # ==================================================
        #
        # If live Traffic Flow could not be obtained,
        # use the route's own traffic delay as a fallback.
        #

        if (
            ai_predicted_travel_time_sec is None
            and travel_time_sec
        ):

            try:

                if traffic_delay_sec > 0:

                    delay_ratio = (
                        float(traffic_delay_sec)
                        /
                        float(travel_time_sec)
                    )

                    fallback_percent = min(
                        100,
                        max(
                            0,
                            round(
                                delay_ratio * 100,
                                1
                            )
                        )
                    )

                    ai_predicted_congestion_percent = (
                        fallback_percent
                    )

                    if fallback_percent < 30:

                        ai_predicted_congestion = (
                            "low"
                        )

                    elif fallback_percent < 60:

                        ai_predicted_congestion = (
                            "moderate"
                        )

                    else:

                        ai_predicted_congestion = (
                            "heavy"
                        )

                else:

                    # No traffic delay means the route is
                    # currently behaving close to free flow.

                    ai_predicted_congestion_percent = 0

                    ai_predicted_congestion = (
                        "low"
                    )

                ai_predicted_travel_time_sec = (
                    _calculate_ai_prediction(
                        travel_time_sec,
                        ai_predicted_congestion_percent,
                        ai_predicted_congestion
                    )
                )

            except (
                TypeError,
                ValueError,
                ZeroDivisionError
            ):

                ai_predicted_travel_time_sec = None

        # ==================================================
        # ROUTE OBJECT
        # ==================================================

        route_data = {

            "routeNumber":
                index + 1,

            "distanceMeters":
                distance_meters,

            "travelTimeSec":
                travel_time_sec,

            "trafficDelaySec":
                traffic_delay_sec,

            "arrivalTime":
                arrival_time,

            "points":
                points,

            # ==================================================
            # AI PREDICTION
            # ==================================================

            "aiPredictedCongestion":
                ai_predicted_congestion,

            "aiPredictedCongestionPercent":
                ai_predicted_congestion_percent,

            "aiPredictedTravelTimeSec":
                ai_predicted_travel_time_sec,
        }

        routes.append(
            route_data
        )

    # ======================================================
    # FINAL DEBUG
    # ======================================================

    print()
    print("==============================================")
    print("        FINAL ROUTE RESULTS")
    print("==============================================")

    for route in routes:

        print(
            "Route:",
            route.get(
                "routeNumber"
            )
        )

        print(
            "Distance:",
            route.get(
                "distanceMeters"
            )
        )

        print(
            "Travel time:",
            route.get(
                "travelTimeSec"
            )
        )

        print(
            "Traffic delay:",
            route.get(
                "trafficDelaySec"
            )
        )

        print(
            "AI congestion:",
            route.get(
                "aiPredictedCongestion"
            )
        )

        print(
            "AI congestion %:",
            route.get(
                "aiPredictedCongestionPercent"
            )
        )

        print(
            "AI travel time:",
            route.get(
                "aiPredictedTravelTimeSec"
            )
        )

        print(
            "Points:",
            len(
                route.get(
                    "points",
                    []
                )
            )
        )

        print("----------------------------------------------")

    print("==============================================")
    print()

    return routes

