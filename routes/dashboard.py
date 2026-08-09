from flask import (
    Blueprint,
    render_template,
    redirect,
    url_for,
    flash,
    request,
    send_file
)

from flask_login import login_required, current_user

from models import (
    db,
    User,
    TrafficData,
    TrafficHistory,
    Alert,
    PredictionHistory
)

from datetime import datetime
from io import BytesIO
import json
import pickle
import os

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle
)


dashboard_bp = Blueprint("dashboard", __name__)


# ==========================================================
# SEED SAMPLE DATA
# ==========================================================

def seed_data():

    if TrafficData.query.first():
        return

    roads = [

        TrafficData(
            road_name="Broadway St",
            vehicle_count=120,
            avg_speed=35.5,
            congestion_level="Moderate"
        ),

        TrafficData(
            road_name="Main Avenue",
            vehicle_count=45,
            avg_speed=55,
            congestion_level="Low"
        ),

        TrafficData(
            road_name="Expressway 101",
            vehicle_count=350,
            avg_speed=15,
            congestion_level="Heavy"
        ),

        TrafficData(
            road_name="Silicon Blvd",
            vehicle_count=80,
            avg_speed=42,
            congestion_level="Moderate"
        ),

        TrafficData(
            road_name="Sunset Road",
            vehicle_count=30,
            avg_speed=60,
            congestion_level="Low"
        )

    ]

    db.session.add_all(roads)

    alerts = [

        Alert(
            message="Accident reported on Expressway 101",
            severity="Critical"
        ),

        Alert(
            message="Heavy rain slowing down traffic on Broadway St",
            severity="Warning"
        ),

        Alert(
            message="Road construction starting on Sunset Road",
            severity="Info"
        )

    ]

    db.session.add_all(alerts)

    db.session.commit()


# ==========================================================
# DASHBOARD
# ==========================================================

@dashboard_bp.route("/")
@login_required
def index():

    seed_data()

    traffic_data = TrafficData.query.all()

    alerts = Alert.query.order_by(
        Alert.timestamp.desc()
    ).limit(5).all()

    stats = {

        "total_roads": TrafficData.query.count(),

        "heavy": TrafficData.query.filter_by(
            congestion_level="Heavy"
        ).count(),

        "moderate": TrafficData.query.filter_by(
            congestion_level="Moderate"
        ).count(),

        "low": TrafficData.query.filter_by(
            congestion_level="Low"
        ).count(),

        "active_alerts": Alert.query.count()

    }

    return render_template(

        "dashboard.html",

        traffic_data=traffic_data,

        alerts=alerts,

        stats=stats,

        prediction=None,

        last_refresh=datetime.now().strftime(
            "%d-%m-%Y %H:%M:%S"
        )

    )


# ==========================================================
# MANAGE USERS
# ==========================================================

@dashboard_bp.route("/manage-users")
@login_required
def manage_users():

    if current_user.role != "Admin":

        flash(
            "Access denied. Admins only.",
            "danger"
        )

        return redirect(
            url_for("dashboard.index")
        )

    users = User.query.all()

    return render_template(
        "manage_users.html",
        users=users
    )


# ==========================================================
# UPDATE TRAFFIC
# ==========================================================

@dashboard_bp.route(
    "/update-traffic",
    methods=["POST"]
)
@login_required
def update_traffic():

    if current_user.role not in [
        "Admin",
        "Traffic Operator"
    ]:

        flash(
            "Access denied.",
            "danger"
        )

        return redirect(
            url_for("dashboard.index")
        )

    road_id = request.form.get("road_id")

    vehicle_count_value = request.form.get(
        "vehicle_count"
    )

    avg_speed_value = request.form.get(
        "avg_speed"
    )

    if not vehicle_count_value or not avg_speed_value:

        flash(
            "Please enter Vehicle Count and Average Speed.",
            "danger"
        )

        return redirect(
            url_for("dashboard.index")
        )

    try:

        vehicle_count = int(
            vehicle_count_value
        )

        avg_speed = float(
            avg_speed_value
        )

    except ValueError:

        flash(
            "Please enter valid numeric values.",
            "danger"
        )

        return redirect(
            url_for("dashboard.index")
        )

    road = TrafficData.query.get(
        road_id
    )

    if road:

        road.vehicle_count = vehicle_count

        road.avg_speed = avg_speed

        road.last_updated = datetime.utcnow()

        # ------------------------------------------
        # Calculate congestion level
        # ------------------------------------------

        if vehicle_count > 250 and avg_speed < 20:

            road.congestion_level = "Heavy"

        elif vehicle_count > 100 and avg_speed < 40:

            road.congestion_level = "Moderate"

        else:

            road.congestion_level = "Low"

        # ------------------------------------------
        # Save traffic history
        # ------------------------------------------

        history = TrafficHistory(

            road_name=road.road_name,

            vehicle_count=vehicle_count,

            avg_speed=avg_speed,

            congestion_level=road.congestion_level

        )

        db.session.add(
            history
        )

        # ------------------------------------------
        # Heavy congestion alert
        # ------------------------------------------

        if road.congestion_level == "Heavy":

            existing_alert = Alert.query.filter_by(

                message=
                f"Heavy congestion detected on {road.road_name}"

            ).first()

            if not existing_alert:

                alert = Alert(

                    message=
                    f"Heavy congestion detected on {road.road_name}",

                    severity="Critical"

                )

                db.session.add(
                    alert
                )

        db.session.commit()

        flash(

            f"Traffic updated successfully for "
            f"{road.road_name}",

            "success"

        )

    else:

        flash(
            "Road not found.",
            "danger"
        )

    return redirect(
        url_for("dashboard.index")
    )


# ==========================================================
# TRAFFIC HISTORY / REPORT PAGE
# ==========================================================

@dashboard_bp.route("/traffic-history")
@login_required
def traffic_history():

    history = TrafficHistory.query.order_by(
        TrafficHistory.recorded_at.desc()
    ).all()

    # ------------------------------------------
    # Chart data
    # ------------------------------------------

    labels = []

    congestion_values = []

    for record in reversed(history):

        labels.append(
            record.recorded_at.strftime(
                "%H:%M:%S"
            )
        )

        if record.congestion_level == "Low":

            congestion_values.append(1)

        elif record.congestion_level == "Moderate":

            congestion_values.append(2)

        else:

            congestion_values.append(3)

    # ------------------------------------------
    # Congestion counts
    # ------------------------------------------

    heavy_count = TrafficHistory.query.filter_by(
        congestion_level="Heavy"
    ).count()

    moderate_count = TrafficHistory.query.filter_by(
        congestion_level="Moderate"
    ).count()

    low_count = TrafficHistory.query.filter_by(
        congestion_level="Low"
    ).count()

    # ------------------------------------------
    # Report statistics
    # ------------------------------------------

    report_stats = {

        "total_records": len(history),

        "heavy": heavy_count,

        "moderate": moderate_count,

        "low": low_count

    }

    return render_template(

        "history.html",

        history=history,

        labels=json.dumps(
            labels
        ),

        congestion_values=json.dumps(
            congestion_values
        ),

        report_stats=report_stats

    )


# ==========================================================
# DOWNLOAD TRAFFIC PDF REPORT
# ==========================================================

@dashboard_bp.route("/download-report")
@login_required
def download_report():

    history = TrafficHistory.query.order_by(
        TrafficHistory.recorded_at.desc()
    ).all()

    # ------------------------------------------
    # Calculate congestion counts
    # ------------------------------------------

    heavy_count = TrafficHistory.query.filter_by(
        congestion_level="Heavy"
    ).count()

    moderate_count = TrafficHistory.query.filter_by(
        congestion_level="Moderate"
    ).count()

    low_count = TrafficHistory.query.filter_by(
        congestion_level="Low"
    ).count()

    total_records = len(history)

    # ------------------------------------------
    # Create PDF in memory
    # ------------------------------------------

    buffer = BytesIO()

    document = SimpleDocTemplate(

        buffer,

        pagesize=A4,

        rightMargin=30,

        leftMargin=30,

        topMargin=30,

        bottomMargin=30

    )

    styles = getSampleStyleSheet()

    elements = []

    # ==================================================
    # REPORT TITLE
    # ==================================================

    elements.append(

        Paragraph(
            "TrafficVision AI",
            styles["Title"]
        )

    )

    elements.append(

        Paragraph(
            "Traffic Prediction Report",
            styles["Heading1"]
        )

    )

    elements.append(
        Spacer(1, 10)
    )

    elements.append(

        Paragraph(

            "Generated on: "
            + datetime.now().strftime(
                "%d-%m-%Y %H:%M:%S"
            ),

            styles["Normal"]

        )

    )

    elements.append(
        Spacer(1, 20)
    )


    # ==================================================
    # TRAFFIC SUMMARY
    # ==================================================

    elements.append(

        Paragraph(
            "Traffic Summary",
            styles["Heading2"]
        )

    )

    summary_data = [

        [
            "Metric",
            "Count"
        ],

        [
            "Total Traffic Records",
            str(total_records)
        ],

        [
            "Heavy Congestion",
            str(heavy_count)
        ],

        [
            "Moderate Congestion",
            str(moderate_count)
        ],

        [
            "Low Congestion",
            str(low_count)
        ]

    ]

    summary_table = Table(

        summary_data,

        colWidths=[
            300,
            150
        ]

    )

    summary_table.setStyle(

        TableStyle([

            (
                "BACKGROUND",
                (0, 0),
                (-1, 0),
                colors.darkblue
            ),

            (
                "TEXTCOLOR",
                (0, 0),
                (-1, 0),
                colors.white
            ),

            (
                "GRID",
                (0, 0),
                (-1, -1),
                1,
                colors.grey
            ),

            (
                "ALIGN",
                (1, 1),
                (1, -1),
                "CENTER"
            ),

            (
                "PADDING",
                (0, 0),
                (-1, -1),
                6
            )

        ])

    )

    elements.append(
        summary_table
    )

    elements.append(
        Spacer(1, 20)
    )


    # ==================================================
    # TRAFFIC HISTORY
    # ==================================================

    elements.append(

        Paragraph(
            "Previous Traffic Records",
            styles["Heading2"]
        )

    )

    history_data = [

        [
            "Road",
            "Vehicles",
            "Speed",
            "Congestion",
            "Recorded Time"
        ]

    ]

    for record in history:

        history_data.append([

            record.road_name,

            str(
                record.vehicle_count
            ),

            f"{record.avg_speed} km/h",

            record.congestion_level,

            record.recorded_at.strftime(
                "%d-%m-%Y %H:%M"
            )

        ])

    if len(history_data) > 1:

        history_table = Table(

            history_data,

            repeatRows=1

        )

        history_table.setStyle(

            TableStyle([

                (
                    "BACKGROUND",
                    (0, 0),
                    (-1, 0),
                    colors.darkblue
                ),

                (
                    "TEXTCOLOR",
                    (0, 0),
                    (-1, 0),
                    colors.white
                ),

                (
                    "GRID",
                    (0, 0),
                    (-1, -1),
                    0.5,
                    colors.grey
                ),

                (
                    "FONTSIZE",
                    (0, 0),
                    (-1, -1),
                    8
                ),

                (
                    "PADDING",
                    (0, 0),
                    (-1, -1),
                    5
                )

            ])

        )

        elements.append(
            history_table
        )

    else:

        elements.append(

            Paragraph(

                "No traffic history available.",

                styles["Normal"]

            )

        )


    # ==================================================
    # BUILD PDF
    # ==================================================

    document.build(
        elements
    )

    buffer.seek(0)

    return send_file(

        buffer,

        as_attachment=True,

        download_name=
        "TrafficVision_AI_Traffic_Report.pdf",

        mimetype=
        "application/pdf"

    )


# ==========================================================
# AI CONGESTION PREDICTION
# ==========================================================

@dashboard_bp.route(
    "/predict-congestion",
    methods=["POST"]
)
@login_required
def predict_congestion():

    try:

        # ------------------------------------------
        # Get input values
        # ------------------------------------------

        temp = float(
            request.form.get("temp")
        )

        rain_1h = float(
            request.form.get("rain_1h")
        )

        clouds_all = float(
            request.form.get("clouds_all")
        )

        hour = int(
            request.form.get("hour")
        )

        # ------------------------------------------
        # Fixed / calculated values
        # ------------------------------------------

        snow_1h = 0

        day = datetime.now().day

        month = datetime.now().month

        # ------------------------------------------
        # Model paths
        # ------------------------------------------

        model_path = os.path.join(
            "models",
            "traffic_model.pkl"
        )

        encoder_path = os.path.join(
            "models",
            "label_encoder.pkl"
        )

        # ------------------------------------------
        # Load Random Forest model
        # ------------------------------------------

        with open(
            model_path,
            "rb"
        ) as f:

            model = pickle.load(f)

        # ------------------------------------------
        # Load label encoder
        # ------------------------------------------

        with open(
            encoder_path,
            "rb"
        ) as f:

            encoder = pickle.load(f)

        # ------------------------------------------
        # Prepare features
        # ------------------------------------------

        features = [[

            temp,

            rain_1h,

            snow_1h,

            clouds_all,

            hour,

            day,

            month

        ]]

        # ------------------------------------------
        # Make prediction
        # ------------------------------------------

        prediction_number = model.predict(
            features
        )[0]

        prediction = encoder.inverse_transform(
            [prediction_number]
        )[0]

        # ------------------------------------------
        # Save AI prediction internally
        # ------------------------------------------
        # This keeps your AI prediction workflow
        # working.
        #
        # It is NOT displayed on the Task 4
        # Traffic Prediction Report page.

        prediction_history = PredictionHistory(

            temperature=temp,

            rain=rain_1h,

            clouds=clouds_all,

            hour=hour,

            predicted_congestion=prediction

        )

        db.session.add(
            prediction_history
        )

        db.session.commit()

        # ------------------------------------------
        # Reload dashboard
        # ------------------------------------------

        traffic_data = TrafficData.query.all()

        alerts = Alert.query.order_by(
            Alert.timestamp.desc()
        ).limit(5).all()

        stats = {

            "total_roads":
                TrafficData.query.count(),

            "heavy":
                TrafficData.query.filter_by(
                    congestion_level="Heavy"
                ).count(),

            "moderate":
                TrafficData.query.filter_by(
                    congestion_level="Moderate"
                ).count(),

            "low":
                TrafficData.query.filter_by(
                    congestion_level="Low"
                ).count(),

            "active_alerts":
                Alert.query.count()

        }

        return render_template(

            "dashboard.html",

            traffic_data=traffic_data,

            alerts=alerts,

            stats=stats,

            prediction=prediction,

            last_refresh=datetime.now().strftime(
                "%d-%m-%Y %H:%M:%S"
            )

        )

    except Exception as e:

        flash(

            f"AI Prediction Error: {str(e)}",

            "danger"

        )

        return redirect(
            url_for("dashboard.index")
        )

        
