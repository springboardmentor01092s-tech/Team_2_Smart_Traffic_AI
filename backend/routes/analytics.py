from datetime import datetime, timedelta
from io import BytesIO

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.traffic import Road, TrafficHistory
from models.alert import Alert
from models.report import SavedRouteReport


analytics_bp = Blueprint(
    "analytics",
    __name__,
    url_prefix="/api/analytics"
)


# ==========================================================
# INDIA STANDARD TIME
# ==========================================================

def india_time():
    """
    Return current time in Indian Standard Time.

    TrafficHistory.recorded_at is stored as a timezone-naive
    datetime representing IST.
    """
    return (
        datetime.utcnow()
        + timedelta(
            hours=5,
            minutes=30,
        )
    )


# ==========================================================
# CONGESTION LEVEL NORMALIZER
# ==========================================================

def _get_congestion_category(record):
    """
    Convert a TrafficHistory record into one of:

        low
        moderate
        high
        severe

    The project stores both congestion_level and
    congestion_percent, so congestion_level is preferred.
    congestion_percent is used as a fallback.
    """

    level = (
        str(
            record.congestion_level
            or ""
        )
        .strip()
        .lower()
    )

    # ------------------------------------------------------
    # Explicit congestion level
    # ------------------------------------------------------

    if level in (
        "low",
        "normal",
    ):
        return "low"

    if level in (
        "moderate",
        "medium",
    ):
        return "moderate"

    if level in (
        "high",
    ):
        return "high"

    if level in (
        "heavy",
        "severe",
        "critical",
    ):
        return "severe"

    # ------------------------------------------------------
    # Fallback to congestion percentage
    # ------------------------------------------------------

    try:
        pct = float(
            record.congestion_percent
            or 0
        )
    except (
        TypeError,
        ValueError,
    ):
        pct = 0

    if pct < 30:
        return "low"

    if pct < 60:
        return "moderate"

    if pct < 80:
        return "high"

    return "severe"


# ==========================================================
# FILTERED TRAFFIC HISTORY
# ==========================================================

def _filtered_history_query(args):

    query = TrafficHistory.query.join(Road)

    state = args.get("state")
    city = args.get("city")
    road_name = args.get("road")

    date_from = args.get("dateFrom")
    date_to = args.get("dateTo")

    if state and state != "all":
        query = query.filter(
            Road.state == state
        )

    if city and city != "all":
        query = query.filter(
            Road.city == city
        )

    if road_name:
        query = query.filter(
            Road.name.ilike(
                f"%{road_name}%"
            )
        )

    # ------------------------------------------------------
    # Date filters use complete days
    # ------------------------------------------------------

    if date_from:
        try:
            start_date = datetime.strptime(
                date_from,
                "%Y-%m-%d"
            )

            query = query.filter(
                TrafficHistory.recorded_at
                >= start_date
            )

        except ValueError:
            pass

    if date_to:
        try:
            end_date = datetime.strptime(
                date_to,
                "%Y-%m-%d"
            ) + timedelta(days=1)

            query = query.filter(
                TrafficHistory.recorded_at
                < end_date
            )

        except ValueError:
            pass

    return query


# ==========================================================
# REPORT / ANALYTICS SUMMARY
# ==========================================================

@analytics_bp.get("/summary")
@jwt_required()
def summary():

    query = _filtered_history_query(
        request.args
    )

    rows = (
        query
        .order_by(
            TrafficHistory.recorded_at.asc()
        )
        .all()
    )

    if not rows:
        return jsonify({
            "totalVehicleVolume": 0,
            "averageCongestion": 0,
            "averageSpeed": 0,
            "totalIncidents": 0,
            "volumeTrend": [],
            "speedTrend": [],
            "congestionDistribution": {
                "low": 0,
                "moderate": 0,
                "high": 0,
                "severe": 0,
            },
            "recordCount": 0,
        })

    # ------------------------------------------------------
    # Total volume
    # ------------------------------------------------------

    total_volume = sum(
        r.vehicle_count or 0
        for r in rows
    )

    # ------------------------------------------------------
    # Average congestion
    # ------------------------------------------------------

    avg_congestion = (
        sum(
            r.congestion_percent or 0
            for r in rows
        )
        / len(rows)
    )

    # ------------------------------------------------------
    # Average speed
    # ------------------------------------------------------

    avg_speed = (
        sum(
            r.average_speed or 0
            for r in rows
        )
        / len(rows)
    )

    # ------------------------------------------------------
    # Total incidents
    # ------------------------------------------------------

    total_incidents = sum(
        r.incidents_count or 0
        for r in rows
    )

    # ------------------------------------------------------
    # Daily trends
    # ------------------------------------------------------

    by_day = {}

    for r in rows:

        day = r.recorded_at.strftime(
            "%d %b"
        )

        by_day.setdefault(
            day,
            {
                "volume": 0,
                "speeds": []
            }
        )

        by_day[day]["volume"] += (
            r.vehicle_count or 0
        )

        by_day[day]["speeds"].append(
            r.average_speed or 0
        )

    volume_trend = [
        {
            "date": d,
            "volume": v["volume"]
        }
        for d, v in by_day.items()
    ]

    speed_trend = [
        {
            "date": d,
            "avgSpeed": round(
                sum(v["speeds"])
                / len(v["speeds"]),
                1
            )
        }
        for d, v in by_day.items()
    ]

    # ------------------------------------------------------
    # Congestion distribution
    # ------------------------------------------------------

    dist = {
        "low": 0,
        "moderate": 0,
        "high": 0,
        "severe": 0,
    }

    for r in rows:

        category = _get_congestion_category(
            r
        )

        dist[category] += 1

    return jsonify({
        "totalVehicleVolume": total_volume,

        "averageCongestion": round(
            avg_congestion,
            1
        ),

        "averageSpeed": round(
            avg_speed,
            1
        ),

        "totalIncidents": total_incidents,

        "volumeTrend": volume_trend,

        "speedTrend": speed_trend,

        "congestionDistribution": dist,

        "recordCount": len(rows),
    })


# ==========================================================
# ADD ROUTE TO REPORT
# ==========================================================

@analytics_bp.post("/report/routes")
@jwt_required()
def add_route_to_report():

    user_id = get_jwt_identity()

    data = request.get_json() or {}

    origin = data.get("origin") or {}
    destination = data.get("destination") or {}

    origin_name = (
        origin.get("name")
        or data.get("originName")
    )

    destination_name = (
        destination.get("name")
        or data.get("destinationName")
    )

    if not origin_name or not destination_name:
        return jsonify({
            "error": "Origin and destination are required."
        }), 400

    report_date_text = data.get(
        "reportDate"
    )

    if report_date_text:
        try:
            report_date = datetime.strptime(
                report_date_text,
                "%Y-%m-%d"
            ).date()

        except ValueError:
            return jsonify({
                "error": (
                    "Invalid report date. "
                    "Use YYYY-MM-DD."
                )
            }), 400

    else:
        report_date = india_time().date()

    route_number = int(
        data.get(
            "routeNumber",
            1
        )
    )

    route = SavedRouteReport(
        user_id=int(user_id),

        report_date=report_date,

        origin_name=origin_name,

        destination_name=destination_name,

        origin_lat=(
            origin.get("lat")
            if origin.get("lat") is not None
            else data.get("originLat")
        ),

        origin_lng=(
            origin.get("lng")
            if origin.get("lng") is not None
            else data.get("originLng")
        ),

        destination_lat=(
            destination.get("lat")
            if destination.get("lat") is not None
            else data.get("destinationLat")
        ),

        destination_lng=(
            destination.get("lng")
            if destination.get("lng") is not None
            else data.get("destinationLng")
        ),

        route_number=route_number,

        distance_meters=data.get(
            "distanceMeters"
        ),

        travel_time_sec=data.get(
            "travelTimeSec"
        ),

        traffic_delay_sec=data.get(
            "trafficDelaySec"
        ),

        predicted_travel_time_sec=data.get(
            "predictedTravelTimeSec"
        ),
    )

    db.session.add(route)
    db.session.commit()

    return jsonify({
        "message": "Route added to report.",
        "route": route.to_dict(),
    }), 201


# ==========================================================
# GET SAVED ROUTES FOR A DATE
# ==========================================================

@analytics_bp.get("/report/routes")
@jwt_required()
def get_report_routes():

    user_id = get_jwt_identity()

    report_date_text = request.args.get(
        "reportDate"
    )

    if report_date_text:

        try:
            report_date = datetime.strptime(
                report_date_text,
                "%Y-%m-%d"
            ).date()

        except ValueError:
            return jsonify({
                "error": "Invalid report date."
            }), 400

    else:
        report_date = india_time().date()

    routes = (
        SavedRouteReport.query
        .filter(
            SavedRouteReport.user_id
            == int(user_id),

            SavedRouteReport.report_date
            == report_date,
        )
        .order_by(
            SavedRouteReport.created_at.asc()
        )
        .all()
    )

    return jsonify({
        "reportDate":
            report_date.isoformat(),

        "routes": [
            r.to_dict()
            for r in routes
        ],
    })


# ==========================================================
# DELETE SAVED ROUTE
# ==========================================================

@analytics_bp.delete(
    "/report/routes/<int:route_id>"
)
@jwt_required()
def delete_report_route(
    route_id
):

    user_id = get_jwt_identity()

    route = (
        SavedRouteReport.query
        .filter(
            SavedRouteReport.id
            == route_id,

            SavedRouteReport.user_id
            == int(user_id),
        )
        .first()
    )

    if not route:
        return jsonify({
            "error":
                "Saved route not found."
        }), 404

    db.session.delete(route)
    db.session.commit()

    return jsonify({
        "message":
            "Route removed from report."
    })


# ==========================================================
# MAIN DASHBOARD
# ==========================================================

@analytics_bp.get("/dashboard")
@jwt_required()
def dashboard_stats():

    # ------------------------------------------------------
    # TOTAL ACTIVE ROADS
    # ------------------------------------------------------

    total_roads = Road.query.count()

    # ------------------------------------------------------
    # ACTIVE ALERTS
    # ------------------------------------------------------

    active_alerts = (
        Alert.query
        .filter_by(
            status="active"
        )
        .count()
    )

    # ------------------------------------------------------
    # LAST 24 HOURS
    #
    # TrafficHistory timestamps are stored as IST.
    # Therefore the cutoff must also be calculated in IST.
    # ------------------------------------------------------

    current_ist = india_time()

    recent_cutoff = (
        current_ist
        - timedelta(hours=24)
    )

    recent = (
        TrafficHistory.query
        .filter(
            TrafficHistory.recorded_at
            >= recent_cutoff
        )
        .order_by(
            TrafficHistory.recorded_at.asc()
        )
        .all()
    )

    # ------------------------------------------------------
    # AVERAGE SPEED
    # ------------------------------------------------------

    avg_speed = (
        round(
            sum(
                r.average_speed or 0
                for r in recent
            )
            / len(recent),
            1
        )
        if recent
        else 0
    )

    # ------------------------------------------------------
    # TOTAL VOLUME
    # ------------------------------------------------------

    total_volume = sum(
        r.vehicle_count or 0
        for r in recent
    )

    # ------------------------------------------------------
    # TOTAL INCIDENTS
    # ------------------------------------------------------

    total_incidents = sum(
        r.incidents_count or 0
        for r in recent
    )

    # ------------------------------------------------------
    # HIGH CONGESTION ROADS
    #
    # Only roads with recent heavy congestion are counted.
    # ------------------------------------------------------

    recent_heavy_road_ids = set()

    for r in recent:

        level = (
            str(
                r.congestion_level
                or ""
            )
            .strip()
            .lower()
        )

        if level in (
            "heavy",
            "severe",
            "critical",
        ):
            recent_heavy_road_ids.add(
                r.road_id
            )

        else:

            try:
                pct = float(
                    r.congestion_percent
                    or 0
                )
            except (
                TypeError,
                ValueError,
            ):
                pct = 0

            if pct >= 80:
                recent_heavy_road_ids.add(
                    r.road_id
                )

    high_congestion_roads = len(
        recent_heavy_road_ids
    )

    # ------------------------------------------------------
    # CONGESTION SUMMARY — LAST 24 HOURS
    # ------------------------------------------------------

    dist = {
        "low": 0,
        "moderate": 0,
        "high": 0,
        "severe": 0,
    }

    for r in recent:

        category = _get_congestion_category(
            r
        )

        dist[category] += 1

    # ------------------------------------------------------
    # TODAY'S INCIDENTS
    #
    # Use IST because alert timestamps are also generated
    # using the project's India-time convention.
    # ------------------------------------------------------

    today_start = current_ist.replace(
        hour=0,
        minute=0,
        second=0,
        microsecond=0
    )

    todays_incidents = (
        Alert.query
        .filter(
            Alert.created_at
            >= today_start
        )
        .count()
    )

    # ------------------------------------------------------
    # RESPONSE
    # ------------------------------------------------------

    return jsonify({

        "totalActiveRoads":
            total_roads,

        "highCongestionAreas":
            high_congestion_roads,

        "averageSpeed":
            avg_speed,

        "totalVolume":
            total_volume,

        "totalIncidents":
            total_incidents,

        "todaysIncidents":
            todays_incidents,

        "activeAlerts":
            active_alerts,

        "congestionSummary":
            dist,

        "totalRecords":
            len(recent),
    })


# ==========================================================
# CONGESTION HEATMAP
# ==========================================================

@analytics_bp.get("/heatmap")
@jwt_required()
def heatmap():

    query = _filtered_history_query(
        request.args
    )

    rows = (
        query
        .order_by(
            TrafficHistory.recorded_at.desc()
        )
        .limit(2000)
        .all()
    )

    points = [
        {
            "lat": r.road.latitude,
            "lng": r.road.longitude,
            "intensity": (
                r.congestion_percent or 0
            ) / 100,
        }
        for r in rows
        if r.road
    ]

    return jsonify({
        "points": points
    })


# ==========================================================
# PDF REPORT
# ==========================================================

@analytics_bp.get("/report/pdf")
@jwt_required()
def generate_pdf_report():

    try:
        from reportlab.lib import colors
        from reportlab.lib.enums import TA_CENTER
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.styles import (
            getSampleStyleSheet,
            ParagraphStyle,
        )
        from reportlab.lib.units import mm
        from reportlab.platypus import (
            SimpleDocTemplate,
            Paragraph,
            Spacer,
            Table,
            TableStyle,
        )

    except ImportError:
        return jsonify({
            "error": (
                "ReportLab is not installed. "
                "Run: pip install reportlab"
            )
        }), 500

    user_id = get_jwt_identity()

    report_date_text = request.args.get(
        "reportDate"
    )

    if report_date_text:

        try:
            report_date = datetime.strptime(
                report_date_text,
                "%Y-%m-%d"
            ).date()

        except ValueError:
            return jsonify({
                "error": "Invalid report date."
            }), 400

    else:
        report_date = india_time().date()

    state = request.args.get(
        "state",
        ""
    )

    city = request.args.get(
        "city",
        ""
    )

    road = request.args.get(
        "road",
        ""
    )

    start_datetime = datetime.combine(
        report_date,
        datetime.min.time()
    )

    end_datetime = (
        start_datetime
        + timedelta(days=1)
    )

    query = (
        TrafficHistory.query
        .join(Road)
        .filter(
            TrafficHistory.recorded_at
            >= start_datetime,

            TrafficHistory.recorded_at
            < end_datetime,
        )
    )

    if state and state != "all":
        query = query.filter(
            Road.state == state
        )

    if city and city != "all":
        query = query.filter(
            Road.city == city
        )

    if road:
        query = query.filter(
            Road.name.ilike(
                f"%{road}%"
            )
        )

    rows = (
        query
        .order_by(
            TrafficHistory.recorded_at.asc()
        )
        .all()
    )

    # ------------------------------------------------------
    # Calculate dashboard information
    # ------------------------------------------------------

    total_volume = sum(
        r.vehicle_count or 0
        for r in rows
    )

    average_congestion = (
        sum(
            r.congestion_percent or 0
            for r in rows
        )
        / len(rows)
        if rows
        else 0
    )

    average_speed = (
        sum(
            r.average_speed or 0
            for r in rows
        )
        / len(rows)
        if rows
        else 0
    )

    total_incidents = sum(
        r.incidents_count or 0
        for r in rows
    )

    # ------------------------------------------------------
    # Congestion distribution
    # ------------------------------------------------------

    distribution = {
        "Low": 0,
        "Moderate": 0,
        "High": 0,
        "Severe": 0,
    }

    for r in rows:

        category = _get_congestion_category(
            r
        )

        if category == "low":
            distribution["Low"] += 1

        elif category == "moderate":
            distribution["Moderate"] += 1

        elif category == "high":
            distribution["High"] += 1

        else:
            distribution["Severe"] += 1

    # ------------------------------------------------------
    # Get ONLY explicitly saved routes for this date
    # ------------------------------------------------------

    saved_routes = (
        SavedRouteReport.query
        .filter(
            SavedRouteReport.user_id
            == int(user_id),

            SavedRouteReport.report_date
            == report_date,
        )
        .order_by(
            SavedRouteReport.created_at.asc()
        )
        .all()
    )

    # ------------------------------------------------------
    # PDF setup
    # ------------------------------------------------------

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=(
            "TrafficVision AI Traffic Report"
        ),
        author="TrafficVision AI",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=20,
        leading=24,
        spaceAfter=10,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        alignment=TA_CENTER,
        fontSize=10,
        textColor=colors.grey,
        spaceAfter=18,
    )

    section_style = ParagraphStyle(
        "Section",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        spaceBefore=12,
        spaceAfter=8,
    )

    normal_style = ParagraphStyle(
        "NormalReport",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
    )

    # ------------------------------------------------------
    # Build PDF
    # ------------------------------------------------------

    story = []

    story.append(
        Paragraph(
            "TRAFFICVISION AI",
            title_style
        )
    )

    story.append(
        Paragraph(
            (
                "Smart Traffic Prediction & "
                "Congestion Management System"
            ),
            subtitle_style
        )
    )

    generated_time = datetime.now().strftime(
        "%d %b %Y, %I:%M:%S %p"
    )

    report_day = report_date.strftime(
        "%A"
    )

    date_table = Table(
        [
            [
                "Report Date",
                report_date.strftime(
                    "%d %b %Y"
                ),
            ],
            [
                "Day",
                report_day,
            ],
            [
                "Generated At",
                generated_time,
            ],
        ],
        colWidths=[
            45 * mm,
            120 * mm,
        ],
    )

    date_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (0, -1),
                colors.HexColor(
                    "#e2e8f0"
                ),
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, -1),
                colors.HexColor(
                    "#0f172a"
                ),
            ),
            (
                "FONTNAME",
                (0, 0),
                (0, -1),
                "Helvetica-Bold",
            ),
            (
                "FONTNAME",
                (1, 0),
                (1, -1),
                "Helvetica",
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.HexColor(
                    "#cbd5e1"
                ),
            ),
            (
                "VALIGN",
                (0, 0),
                (-1, -1),
                "MIDDLE",
            ),
            (
                "PADDING",
                (0, 0),
                (-1, -1),
                7,
            ),
        ])
    )

    story.append(
        date_table
    )

    # ------------------------------------------------------
    # Dashboard information
    # ------------------------------------------------------

    story.append(
        Paragraph(
            "Dashboard Information",
            section_style
        )
    )

    dashboard_table = Table(
        [
            ["Metric", "Value"],

            [
                "Total Vehicle Volume",
                f"{total_volume:,}",
            ],

            [
                "Average Congestion",
                f"{average_congestion:.1f}%",
            ],

            [
                "Average Speed",
                f"{average_speed:.1f} km/h",
            ],

            [
                "Total Incidents",
                str(total_incidents),
            ],

            [
                "Traffic Records Analyzed",
                str(len(rows)),
            ],
        ],
        colWidths=[
            105 * mm,
            60 * mm,
        ],
    )

    dashboard_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor(
                    "#1e293b"
                ),
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white,
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold",
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.HexColor(
                    "#cbd5e1"
                ),
            ),
            (
                "PADDING",
                (0, 0),
                (-1, -1),
                7,
            ),
        ])
    )

    story.append(
        dashboard_table
    )

    # ------------------------------------------------------
    # Congestion distribution
    # ------------------------------------------------------

    story.append(
        Paragraph(
            "Congestion Distribution",
            section_style
        )
    )

    congestion_table = Table(
        [
            ["Level", "Records"],

            [
                "Low",
                str(distribution["Low"]),
            ],

            [
                "Moderate",
                str(distribution["Moderate"]),
            ],

            [
                "High",
                str(distribution["High"]),
            ],

            [
                "Severe",
                str(distribution["Severe"]),
            ],
        ],
        colWidths=[
            105 * mm,
            60 * mm,
        ],
    )

    congestion_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.HexColor(
                    "#334155"
                ),
            ),
            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white,
            ),
            (
                "FONTNAME",
                (0, 0),
                (-1, 0),
                "Helvetica-Bold",
            ),
            (
                "GRID",
                (0, 0),
                (-1, -1),
                0.5,
                colors.HexColor(
                    "#cbd5e1"
                ),
            ),
            (
                "PADDING",
                (0, 0),
                (-1, -1),
                7,
            ),
        ])
    )

    story.append(
        congestion_table
    )

    # ------------------------------------------------------
    # Route recommendations
    # ------------------------------------------------------

    story.append(
        Paragraph(
            "Route Recommendations",
            section_style
        )
    )

    if not saved_routes:

        story.append(
            Paragraph(
                "No routes were added to this report.",
                normal_style
            )
        )

    else:

        for index, route in enumerate(
            saved_routes,
            start=1
        ):

            distance = (
                f"{route.distance_meters / 1000:.1f} km"
                if route.distance_meters is not None
                else "N/A"
            )

            travel_time = (
                _format_pdf_duration(
                    route.travel_time_sec
                )
                if route.travel_time_sec is not None
                else "N/A"
            )

            delay = (
                _format_pdf_duration(
                    route.traffic_delay_sec
                )
                if route.traffic_delay_sec is not None
                else "0 min"
            )

            predicted = (
                _format_pdf_duration(
                    route.predicted_travel_time_sec
                )
                if route.predicted_travel_time_sec is not None
                else "N/A"
            )

            route_table = Table(
                [
                    [
                        f"Route {index}",
                        route.origin_name,
                    ],

                    [
                        "Destination",
                        route.destination_name,
                    ],

                    [
                        "Distance",
                        distance,
                    ],

                    [
                        "Current Travel Time",
                        travel_time,
                    ],

                    [
                        "Traffic Delay",
                        delay,
                    ],

                    [
                        "AI Predicted Travel Time",
                        predicted,
                    ],
                ],
                colWidths=[
                    60 * mm,
                    105 * mm,
                ],
            )

            route_table.setStyle(
                TableStyle([
                    (
                        "BACKGROUND",
                        (0, 0),
                        (0, -1),
                        colors.HexColor(
                            "#e2e8f0"
                        ),
                    ),
                    (
                        "FONTNAME",
                        (0, 0),
                        (0, -1),
                        "Helvetica-Bold",
                    ),
                    (
                        "GRID",
                        (0, 0),
                        (-1, -1),
                        0.5,
                        colors.HexColor(
                            "#cbd5e1"
                        ),
                    ),
                    (
                        "PADDING",
                        (0, 0),
                        (-1, -1),
                        7,
                    ),
                ])
            )

            story.append(
                route_table
            )

            story.append(
                Spacer(1, 8)
            )

    # ------------------------------------------------------
    # Footer
    # ------------------------------------------------------

    story.append(
        Spacer(1, 15)
    )

    story.append(
        Paragraph(
            "Generated by TrafficVision AI",
            subtitle_style
        )
    )

    document.build(
        story
    )

    buffer.seek(0)

    filename = (
        "TrafficVision_Report_"
        f"{report_date.isoformat()}.pdf"
    )

    return send_file(
        buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )


# ==========================================================
# PDF DURATION HELPER
# ==========================================================

def _format_pdf_duration(seconds):

    if seconds is None:
        return "N/A"

    total_minutes = round(
        seconds / 60
    )

    hours = (
        total_minutes // 60
    )

    minutes = (
        total_minutes % 60
    )

    if hours > 0:
        return (
            f"{hours} hr "
            f"{minutes} min"
        )

    return f"{minutes} min"

