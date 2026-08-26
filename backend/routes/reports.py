# routes/report.py

from datetime import datetime, time, timezone, timedelta
from io import BytesIO

from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

from extensions import db
from models.traffic import Road, TrafficHistory
from models.report import SavedRouteReport


# ==========================================================
# BLUEPRINT
# ==========================================================

reports_bp = Blueprint(
    "reports",
    __name__,
    url_prefix="/api/reports",
)


# ==========================================================
# INDIA STANDARD TIME
# ==========================================================

IST = timezone(
    timedelta(hours=5, minutes=30)
)


# ==========================================================
# HELPER FUNCTIONS
# ==========================================================

def get_current_user_id():
    identity = get_jwt_identity()

    try:
        return int(identity)

    except (TypeError, ValueError):
        return None


def parse_report_date(value):
    if not value:
        return None

    try:
        return datetime.strptime(
            value,
            "%Y-%m-%d",
        ).date()

    except (ValueError, TypeError):
        return None


def get_day_range(report_date):
    start_datetime = datetime.combine(
        report_date,
        time.min,
    )

    end_datetime = datetime.combine(
        report_date,
        time.max,
    )

    return start_datetime, end_datetime


def safe_number(value, default=0):
    try:
        return float(value)

    except (TypeError, ValueError):
        return default


def get_traffic_query(
    report_date,
    state=None,
    city=None,
    road_name=None,
):
    start_datetime, end_datetime = get_day_range(
        report_date
    )

    query = (
        TrafficHistory.query
        .join(Road)
        .filter(
            TrafficHistory.recorded_at >= start_datetime,
            TrafficHistory.recorded_at <= end_datetime,
        )
        .order_by(
            TrafficHistory.recorded_at.asc()
        )
    )

    if state and state.lower() != "all":
        query = query.filter(
            Road.state == state
        )

    if city and city.lower() != "all":
        query = query.filter(
            Road.city == city
        )

    if road_name:
        query = query.filter(
            Road.name.ilike(
                f"%{road_name}%"
            )
        )

    return query


# ==========================================================
# TRAFFIC SUMMARY
# ==========================================================

def calculate_traffic_summary(traffic_rows):

    total_vehicle_volume = sum(
        safe_number(row.vehicle_count)
        for row in traffic_rows
    )

    average_congestion = (
        sum(
            safe_number(row.congestion_percent)
            for row in traffic_rows
        )
        / len(traffic_rows)
        if traffic_rows
        else 0
    )

    average_speed = (
        sum(
            safe_number(row.average_speed)
            for row in traffic_rows
        )
        / len(traffic_rows)
        if traffic_rows
        else 0
    )

    total_incidents = sum(
        safe_number(row.incidents_count)
        for row in traffic_rows
    )

    total_vehicle_volume = int(
        round(total_vehicle_volume)
    )

    total_incidents = int(
        round(total_incidents)
    )

    distribution = {
        "low": 0,
        "moderate": 0,
        "high": 0,
        "severe": 0,
    }

    for row in traffic_rows:

        percentage = safe_number(
            row.congestion_percent
        )

        if percentage < 30:
            distribution["low"] += 1

        elif percentage < 60:
            distribution["moderate"] += 1

        elif percentage < 80:
            distribution["high"] += 1

        else:
            distribution["severe"] += 1

    return {
        "totalVehicleVolume": total_vehicle_volume,

        "averageCongestion": round(
            average_congestion,
            1,
        ),

        "averageSpeed": round(
            average_speed,
            1,
        ),

        "totalIncidents": total_incidents,

        "recordCount": len(
            traffic_rows
        ),

        "congestionDistribution": distribution,
    }


# ==========================================================
# AI TRAFFIC RECOMMENDATIONS
# ==========================================================

def generate_ai_recommendations(
    summary,
    traffic_rows,
):
    """
    Generate rule-based AI traffic recommendations.

    The recommendation engine analyzes:
        - average congestion
        - average speed
        - vehicle volume
        - incident count
        - congestion distribution

    It returns recommendations that can be displayed
    in the dashboard and included in the PDF report.
    """

    recommendations = []

    congestion = safe_number(
        summary.get(
            "averageCongestion",
            0,
        )
    )

    speed = safe_number(
        summary.get(
            "averageSpeed",
            0,
        )
    )

    vehicle_volume = safe_number(
        summary.get(
            "totalVehicleVolume",
            0,
        )
    )

    incidents = safe_number(
        summary.get(
            "totalIncidents",
            0,
        )
    )

    distribution = summary.get(
        "congestionDistribution",
        {},
    )

    severe_records = int(
        distribution.get(
            "severe",
            0,
        )
    )

    high_records = int(
        distribution.get(
            "high",
            0,
        )
    )

    # ------------------------------------------------------
    # NO DATA
    # ------------------------------------------------------

    if not traffic_rows:

        return [
            {
                "priority": "Low",
                "category": "Monitoring",
                "title": "Insufficient traffic history",
                "recommendation": (
                    "No traffic history was recorded for "
                    "the selected date. Continue collecting "
                    "traffic data before making operational "
                    "traffic-management decisions."
                ),
            }
        ]

    # ------------------------------------------------------
    # SEVERE CONGESTION
    # ------------------------------------------------------

    if congestion >= 80 or severe_records > 0:

        recommendations.append(
            {
                "priority": "Critical",
                "category": "Congestion Management",
                "title": "Severe congestion detected",
                "recommendation": (
                    "Traffic authorities should prioritize "
                    "the most congested road segments, "
                    "consider traffic diversion or alternate "
                    "route guidance, and increase monitoring "
                    "during peak periods."
                ),
            }
        )

    # ------------------------------------------------------
    # HIGH CONGESTION
    # ------------------------------------------------------

    elif congestion >= 60 or high_records > 0:

        recommendations.append(
            {
                "priority": "High",
                "category": "Congestion Management",
                "title": "High congestion detected",
                "recommendation": (
                    "Increase monitoring on heavily congested "
                    "roads and consider adaptive signal timing, "
                    "lane management, and alternate-route "
                    "recommendations during busy periods."
                ),
            }
        )

    # ------------------------------------------------------
    # MODERATE CONGESTION
    # ------------------------------------------------------

    elif congestion >= 30:

        recommendations.append(
            {
                "priority": "Medium",
                "category": "Traffic Monitoring",
                "title": "Moderate congestion detected",
                "recommendation": (
                    "Continue monitoring traffic conditions "
                    "and provide route guidance to distribute "
                    "traffic across available road alternatives."
                ),
            }
        )

    # ------------------------------------------------------
    # LOW CONGESTION
    # ------------------------------------------------------

    else:

        recommendations.append(
            {
                "priority": "Low",
                "category": "Traffic Monitoring",
                "title": "Traffic conditions are relatively stable",
                "recommendation": (
                    "Maintain normal traffic monitoring and "
                    "continue collecting historical data to "
                    "identify future congestion patterns."
                ),
            }
        )

    # ------------------------------------------------------
    # LOW SPEED
    # ------------------------------------------------------

    if speed > 0 and speed < 25:

        recommendations.append(
            {
                "priority": "High",
                "category": "Speed Management",
                "title": "Low average traffic speed",
                "recommendation": (
                    "Investigate slow-moving road segments "
                    "and consider traffic-control measures, "
                    "incident checks, and alternate-route "
                    "guidance to improve traffic movement."
                ),
            }
        )

    elif speed > 0 and speed < 40:

        recommendations.append(
            {
                "priority": "Medium",
                "category": "Speed Management",
                "title": "Reduced average traffic speed",
                "recommendation": (
                    "Monitor locations with reduced speeds "
                    "and compare them with congestion and "
                    "incident data to identify recurring "
                    "traffic bottlenecks."
                ),
            }
        )

    # ------------------------------------------------------
    # INCIDENTS
    # ------------------------------------------------------

    if incidents >= 10:

        recommendations.append(
            {
                "priority": "Critical",
                "category": "Incident Management",
                "title": "High number of traffic incidents",
                "recommendation": (
                    "Prioritize incident response and ensure "
                    "rapid verification and clearance of "
                    "reported incidents. Alert users about "
                    "affected routes where appropriate."
                ),
            }
        )

    elif incidents >= 5:

        recommendations.append(
            {
                "priority": "High",
                "category": "Incident Management",
                "title": "Elevated incident activity",
                "recommendation": (
                    "Increase incident monitoring and provide "
                    "timely alerts for affected road segments."
                ),
            }
        )

    elif incidents > 0:

        recommendations.append(
            {
                "priority": "Medium",
                "category": "Incident Management",
                "title": "Traffic incidents recorded",
                "recommendation": (
                    "Continue monitoring reported incidents "
                    "and assess their effect on congestion "
                    "and travel speed."
                ),
            }
        )

    # ------------------------------------------------------
    # HIGH VEHICLE VOLUME
    # ------------------------------------------------------

    if vehicle_volume >= 50000:

        recommendations.append(
            {
                "priority": "High",
                "category": "Traffic Demand",
                "title": "High vehicle volume",
                "recommendation": (
                    "Consider demand-management strategies "
                    "and promote alternate routes during "
                    "high-volume periods."
                ),
            }
        )

    elif vehicle_volume >= 25000:

        recommendations.append(
            {
                "priority": "Medium",
                "category": "Traffic Demand",
                "title": "Elevated vehicle volume",
                "recommendation": (
                    "Monitor traffic demand closely and "
                    "compare high-volume periods with "
                    "congestion trends."
                ),
            }
        )

    # ------------------------------------------------------
    # FINAL GENERAL RECOMMENDATION
    # ------------------------------------------------------

    if len(recommendations) < 2:

        recommendations.append(
            {
                "priority": "Low",
                "category": "Data Analysis",
                "title": "Continue historical monitoring",
                "recommendation": (
                    "Store traffic observations consistently "
                    "so future reports can identify recurring "
                    "congestion patterns and support better "
                    "traffic-management decisions."
                ),
            }
        )

    return recommendations


# ==========================================================
# VOLUME TREND
# ==========================================================

def build_volume_trend(traffic_rows):

    grouped = {}

    for row in traffic_rows:

        recorded_at = getattr(
            row,
            "recorded_at",
            None,
        )

        if not recorded_at:
            continue

        try:
            key = recorded_at.strftime(
                "%H:%M"
            )

        except Exception:
            continue

        grouped.setdefault(
            key,
            0,
        )

        grouped[key] += int(
            round(
                safe_number(
                    row.vehicle_count
                )
            )
        )

    return [
        {
            "date": key,
            "volume": grouped[key],
        }
        for key in sorted(
            grouped.keys()
        )
    ]


# ==========================================================
# SAVED ROUTES
# ==========================================================

def get_saved_routes(
    user_id,
    report_date,
):

    return (
        SavedRouteReport.query
        .filter(
            SavedRouteReport.user_id == user_id,
            SavedRouteReport.report_date == report_date,
        )
        .order_by(
            SavedRouteReport.created_at.asc()
        )
        .all()
    )


# ==========================================================
# GET REPORT DATA
# ==========================================================

@reports_bp.get("/data")
@jwt_required()
def get_report_data():

    user_id = get_current_user_id()

    if user_id is None:
        return jsonify({
            "error": "Invalid user identity."
        }), 401

    date_text = request.args.get(
        "date"
    )

    report_date = parse_report_date(
        date_text
    )

    if not report_date:
        return jsonify({
            "error": (
                "A valid date is required. "
                "Use YYYY-MM-DD."
            )
        }), 400

    state = request.args.get(
        "state"
    )

    city = request.args.get(
        "city"
    )

    road_name = request.args.get(
        "road"
    )

    query = get_traffic_query(
        report_date=report_date,
        state=state,
        city=city,
        road_name=road_name,
    )

    traffic_rows = query.all()

    summary = calculate_traffic_summary(
        traffic_rows
    )

    volume_trend = build_volume_trend(
        traffic_rows
    )

    ai_recommendations = (
        generate_ai_recommendations(
            summary,
            traffic_rows,
        )
    )

    saved_routes = get_saved_routes(
        user_id=user_id,
        report_date=report_date,
    )

    return jsonify({

        "date": report_date.isoformat(),

        "day": report_date.strftime(
            "%A"
        ),

        "traffic": summary,

        "totalVehicleVolume":
            summary["totalVehicleVolume"],

        "averageCongestion":
            summary["averageCongestion"],

        "averageSpeed":
            summary["averageSpeed"],

        "totalIncidents":
            summary["totalIncidents"],

        "recordCount":
            summary["recordCount"],

        "congestionDistribution":
            summary["congestionDistribution"],

        "volumeTrend":
            volume_trend,

        "aiRecommendations":
            ai_recommendations,

        "routes": [
            route.to_dict()
            for route in saved_routes
        ],
    })


# ==========================================================
# ADD ROUTE TO REPORT
# ==========================================================

@reports_bp.post("/routes")
@jwt_required()
def add_route_to_report():

    user_id = get_current_user_id()

    if user_id is None:
        return jsonify({
            "error": "Invalid user identity."
        }), 401

    data = request.get_json(
        silent=True
    ) or {}

    origin_name = data.get(
        "originName"
    )

    destination_name = data.get(
        "destinationName"
    )

    if not origin_name:
        return jsonify({
            "error": "Origin name is required."
        }), 400

    if not destination_name:
        return jsonify({
            "error": "Destination name is required."
        }), 400

    route_number = data.get(
        "routeNumber",
        1,
    )

    try:
        route_number = int(
            route_number
        )

    except (TypeError, ValueError):
        route_number = 1

    if route_number < 1:
        route_number = 1

    report_date_text = data.get(
        "reportDate"
    )

    if report_date_text:

        report_date = parse_report_date(
            report_date_text
        )

        if not report_date:
            return jsonify({
                "error": (
                    "Invalid report date. "
                    "Use YYYY-MM-DD."
                )
            }), 400

    else:

        report_date = datetime.now(
            IST
        ).date()

    existing = (
        SavedRouteReport.query
        .filter(
            SavedRouteReport.user_id == user_id,

            SavedRouteReport.report_date
            == report_date,

            SavedRouteReport.origin_name
            == origin_name,

            SavedRouteReport.destination_name
            == destination_name,

            SavedRouteReport.route_number
            == route_number,
        )
        .first()
    )

    if existing:

        return jsonify({
            "message": (
                "Route is already added "
                "to this report."
            ),

            "alreadyExists": True,

            "route": existing.to_dict(),
        }), 200

    saved_route = SavedRouteReport(

        user_id=user_id,

        report_date=report_date,

        origin_name=origin_name,

        destination_name=destination_name,

        origin_lat=data.get(
            "originLat"
        ),

        origin_lng=data.get(
            "originLng"
        ),

        destination_lat=data.get(
            "destinationLat"
        ),

        destination_lng=data.get(
            "destinationLng"
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

    try:

        db.session.add(
            saved_route
        )

        db.session.commit()

    except Exception as exc:

        db.session.rollback()

        print(
            "Add route to report error:",
            exc,
        )

        return jsonify({
            "error": (
                "Could not add route "
                "to report."
            )
        }), 500

    return jsonify({
        "message": (
            "Route added to report successfully."
        ),

        "alreadyExists": False,

        "route": saved_route.to_dict(),
    }), 201


# ==========================================================
# GET SAVED ROUTES
# ==========================================================

@reports_bp.get("/routes")
@jwt_required()
def get_saved_routes_endpoint():

    user_id = get_current_user_id()

    if user_id is None:
        return jsonify({
            "error": "Invalid user identity."
        }), 401

    date_text = request.args.get(
        "date"
    )

    query = (
        SavedRouteReport.query
        .filter(
            SavedRouteReport.user_id
            == user_id
        )
    )

    if date_text:

        report_date = parse_report_date(
            date_text
        )

        if not report_date:
            return jsonify({
                "error": (
                    "Invalid date. "
                    "Use YYYY-MM-DD."
                )
            }), 400

        query = query.filter(
            SavedRouteReport.report_date
            == report_date
        )

    routes = (
        query
        .order_by(
            SavedRouteReport.report_date.desc(),
            SavedRouteReport.created_at.asc(),
        )
        .all()
    )

    return jsonify({
        "routes": [
            route.to_dict()
            for route in routes
        ]
    })


# ==========================================================
# DELETE SAVED ROUTE
# ==========================================================

@reports_bp.delete("/routes/<int:route_id>")
@jwt_required()
def delete_saved_route(route_id):

    user_id = get_current_user_id()

    if user_id is None:
        return jsonify({
            "error": "Invalid user identity."
        }), 401

    route = (
        SavedRouteReport.query
        .filter(
            SavedRouteReport.id == route_id,

            SavedRouteReport.user_id
            == user_id,
        )
        .first()
    )

    if not route:
        return jsonify({
            "error": "Saved route not found."
        }), 404

    try:

        db.session.delete(
            route
        )

        db.session.commit()

    except Exception as exc:

        db.session.rollback()

        print(
            "Delete saved route error:",
            exc,
        )

        return jsonify({
            "error": (
                "Could not remove "
                "saved route."
            )
        }), 500

    return jsonify({
        "message": (
            "Saved route removed from report."
        )
    })


# ==========================================================
# GENERATE PDF REPORT
# ==========================================================

@reports_bp.get("/pdf")
@jwt_required()
def generate_pdf_report():

    user_id = get_current_user_id()

    if user_id is None:
        return jsonify({
            "error": "Invalid user identity."
        }), 401

    date_text = request.args.get(
        "date"
    )

    report_date = parse_report_date(
        date_text
    )

    if not report_date:
        return jsonify({
            "error": (
                "A valid report date is required. "
                "Use YYYY-MM-DD."
            )
        }), 400

    state = request.args.get(
        "state"
    )

    city = request.args.get(
        "city"
    )

    road_name = request.args.get(
        "road"
    )

    query = get_traffic_query(
        report_date=report_date,
        state=state,
        city=city,
        road_name=road_name,
    )

    traffic_rows = query.all()

    summary = calculate_traffic_summary(
        traffic_rows
    )

    total_vehicle_volume = (
        summary["totalVehicleVolume"]
    )

    average_congestion = (
        summary["averageCongestion"]
    )

    average_speed = (
        summary["averageSpeed"]
    )

    total_incidents = (
        summary["totalIncidents"]
    )

    # ======================================================
    # AI RECOMMENDATIONS
    # ======================================================

    ai_recommendations = (
        generate_ai_recommendations(
            summary,
            traffic_rows,
        )
    )

    distribution = {
        "Low":
            summary["congestionDistribution"]["low"],

        "Moderate":
            summary["congestionDistribution"]["moderate"],

        "High":
            summary["congestionDistribution"]["high"],

        "Severe":
            summary["congestionDistribution"]["severe"],
    }

    # ======================================================
    # PDF
    # ======================================================

    pdf_buffer = BytesIO()

    document = SimpleDocTemplate(
        pdf_buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title="TrafficVision AI Traffic Report",
        author="TrafficVision AI",
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=20,
        leading=24,
        spaceAfter=8,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        alignment=TA_CENTER,
        fontSize=10,
        textColor=colors.grey,
        spaceAfter=18,
    )

    heading_style = ParagraphStyle(
        "ReportHeading",
        parent=styles["Heading2"],
        fontSize=14,
        leading=18,
        spaceBefore=12,
        spaceAfter=8,
    )

    normal_style = ParagraphStyle(
        "ReportNormal",
        parent=styles["Normal"],
        fontSize=9,
        leading=13,
    )

    recommendation_style = ParagraphStyle(
        "Recommendation",
        parent=normal_style,
        fontSize=9,
        leading=13,
    )

    footer_style = ParagraphStyle(
        "Footer",
        parent=styles["Normal"],
        fontSize=8,
        textColor=colors.grey,
        alignment=TA_CENTER,
    )

    story = []

    # ======================================================
    # TITLE
    # ======================================================

    story.append(
        Paragraph(
            "TRAFFICVISION AI",
            title_style,
        )
    )

    story.append(
        Paragraph(
            "Traffic Report & Analytics",
            subtitle_style,
        )
    )

    # ======================================================
    # REPORT INFORMATION
    # ======================================================

    story.append(
        Paragraph(
            "Report Information",
            heading_style,
        )
    )

    generated_at = datetime.now(
        IST
    )

    report_info = [
        [
            "Report Date",
            report_date.strftime(
                "%d %B %Y"
            ),
        ],

        [
            "Day",
            report_date.strftime(
                "%A"
            ),
        ],

        [
            "Generated At",
            generated_at.strftime(
                "%d %B %Y, %I:%M %p"
            ),
        ],
    ]

    if state and state.lower() != "all":
        report_info.append(
            ["State", state]
        )

    if city and city.lower() != "all":
        report_info.append(
            ["City", city]
        )

    if road_name:
        report_info.append(
            ["Road / Area", road_name]
        )

    info_table = Table(
        report_info,
        colWidths=[
            45 * mm,
            125 * mm,
        ],
    )

    info_table.setStyle(
        TableStyle([
            (
                "BACKGROUND",
                (0, 0),
                (0, -1),
                colors.HexColor(
                    "#e8eefc"
                ),
            ),

            (
                "FONTNAME",
                (0, 0),
                (0, -1),
                "Helvetica-Bold",
            ),

            (
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                9,
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
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7,
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7,
            ),
        ])
    )

    story.append(
        info_table
    )

    story.append(
        Spacer(1, 10)
    )

    # ======================================================
    # DASHBOARD
    # ======================================================

    story.append(
        Paragraph(
            "1. Dashboard Information",
            heading_style,
        )
    )

    dashboard_data = [
        [
            "Metric",
            "Value",
        ],

        [
            "Total Vehicle Volume",
            f"{total_vehicle_volume:,}",
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
            str(len(traffic_rows)),
        ],
    ]

    dashboard_table = Table(
        dashboard_data,
        colWidths=[
            100 * mm,
            70 * mm,
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
                "ROWBACKGROUNDS",
                (0, 1),
                (-1, -1),
                [
                    colors.white,
                    colors.HexColor(
                        "#f8fafc"
                    ),
                ],
            ),

            (
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                9,
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7,
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7,
            ),
        ])
    )

    story.append(
        dashboard_table
    )

    # ======================================================
    # CONGESTION DISTRIBUTION
    # ======================================================

    story.append(
        Paragraph(
            "2. Congestion Distribution",
            heading_style,
        )
    )

    distribution_data = [
        [
            "Congestion Level",
            "Records",
        ],

        [
            "Low",
            distribution["Low"],
        ],

        [
            "Moderate",
            distribution["Moderate"],
        ],

        [
            "High",
            distribution["High"],
        ],

        [
            "Severe",
            distribution["Severe"],
        ],
    ]

    distribution_table = Table(
        distribution_data,
        colWidths=[
            100 * mm,
            70 * mm,
        ],
    )

    distribution_table.setStyle(
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
                "ROWBACKGROUNDS",
                (0, 1),
                (-1, -1),
                [
                    colors.white,
                    colors.HexColor(
                        "#f8fafc"
                    ),
                ],
            ),

            (
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                9,
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7,
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7,
            ),
        ])
    )

    story.append(
        distribution_table
    )

    # ======================================================
    # AI RECOMMENDATIONS
    # ======================================================

    story.append(
        Paragraph(
            "3. AI-Based Traffic Recommendations",
            heading_style,
        )
    )

    story.append(
        Paragraph(
            "The TrafficVision AI recommendation engine "
            "analyzes the selected day's traffic volume, "
            "congestion, speed, incidents, and congestion "
            "distribution to generate operational "
            "recommendations.",
            normal_style,
        )
    )

    story.append(
        Spacer(1, 6)
    )

    recommendation_data = [
        [
            "Priority",
            "Category",
            "Recommendation",
        ]
    ]

    for recommendation in ai_recommendations:

        recommendation_data.append(
            [
                recommendation["priority"],
                recommendation["category"],
                Paragraph(
                    (
                        f"<b>{recommendation['title']}</b><br/>"
                        f"{recommendation['recommendation']}"
                    ),
                    recommendation_style,
                ),
            ]
        )

    recommendation_table = Table(
        recommendation_data,
        colWidths=[
            28 * mm,
            42 * mm,
            100 * mm,
        ],
        repeatRows=1,
    )

    recommendation_table.setStyle(
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
                "VALIGN",
                (0, 0),
                (-1, -1),
                "TOP",
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
                "FONTSIZE",
                (0, 0),
                (-1, -1),
                8,
            ),

            (
                "ROWBACKGROUNDS",
                (0, 1),
                (-1, -1),
                [
                    colors.white,
                    colors.HexColor(
                        "#f8fafc"
                    ),
                ],
            ),

            (
                "TOPPADDING",
                (0, 0),
                (-1, -1),
                7,
            ),

            (
                "BOTTOMPADDING",
                (0, 0),
                (-1, -1),
                7,
            ),
        ])
    )

    story.append(
        recommendation_table
    )

    # ======================================================
    # TRAFFIC VOLUME TREND
    # ======================================================

    story.append(
        Paragraph(
            "4. Traffic Volume Trend",
            heading_style,
        )
    )

    volume_trend = build_volume_trend(
        traffic_rows
    )

    if not volume_trend:

        story.append(
            Paragraph(
                "No traffic trend data was "
                "available for this date.",
                normal_style,
            )
        )

    else:

        trend_data = [
            [
                "Time",
                "Vehicle Volume",
            ]
        ]

        for item in volume_trend:

            trend_data.append(
                [
                    item["date"],
                    f"{item['volume']:,}",
                ]
            )

        trend_data = trend_data[:49]

        trend_table = Table(
            trend_data,
            colWidths=[
                85 * mm,
                85 * mm,
            ],
            repeatRows=1,
        )

        trend_table.setStyle(
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
                    "ROWBACKGROUNDS",
                    (0, 1),
                    (-1, -1),
                    [
                        colors.white,
                        colors.HexColor(
                            "#f8fafc"
                        ),
                    ],
                ),

                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    8,
                ),

                (
                    "TOPPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),

                (
                    "BOTTOMPADDING",
                    (0, 0),
                    (-1, -1),
                    5,
                ),
            ])
        )

        story.append(
            trend_table
        )

    # ======================================================
    # SUMMARY
    # ======================================================

    story.append(
        Spacer(1, 12)
    )

    story.append(
        Paragraph(
            "5. Report Summary",
            heading_style,
        )
    )

    if not traffic_rows:

        insight_text = (
            "No traffic history records were available "
            "for the selected date and filters."
        )

    else:

        if average_congestion < 30:

            congestion_text = (
                "overall traffic conditions "
                "were relatively low."
            )

        elif average_congestion < 60:

            congestion_text = (
                "overall traffic conditions "
                "were moderate."
            )

        elif average_congestion < 80:

            congestion_text = (
                "overall traffic conditions "
                "were high."
            )

        else:

            congestion_text = (
                "overall traffic conditions "
                "were severe."
            )

        insight_text = (
            f"For {report_date.strftime('%d %B %Y')}, "
            f"the system analyzed {len(traffic_rows)} "
            f"traffic records with a total estimated "
            f"vehicle volume of {total_vehicle_volume:,}. "
            f"The average congestion was "
            f"{average_congestion:.1f}% and the average "
            f"speed was {average_speed:.1f} km/h. "
            f"There were {total_incidents} recorded "
            f"incidents; {congestion_text}"
        )

    story.append(
        Paragraph(
            insight_text,
            normal_style,
        )
    )

    story.append(
        Spacer(1, 18)
    )

    story.append(
        Paragraph(
            "TrafficVision AI — Smart Traffic Prediction "
            "and Congestion Management System",
            footer_style,
        )
    )

    # ======================================================
    # BUILD
    # ======================================================

    try:

        document.build(
            story
        )

    except Exception as exc:

        print(
            "PDF generation error:",
            exc,
        )

        return jsonify({
            "error": (
                "Could not generate PDF report."
            )
        }), 500

    pdf_buffer.seek(0)

    filename = (
        "TrafficVision_Report_"
        f"{report_date.isoformat()}.pdf"
    )

    return send_file(
        pdf_buffer,
        mimetype="application/pdf",
        as_attachment=True,
        download_name=filename,
    )

