from flask import Blueprint, render_template, redirect, url_for, flash, request
from flask_login import login_required, current_user
from models import db, User, TrafficData, TrafficHistory, Alert
from datetime import datetime
import json


dashboard_bp = Blueprint('dashboard', __name__)


# -----------------------------
# Seed Sample Data
# -----------------------------
def seed_data():

    if TrafficData.query.first() is None:

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
                avg_speed=55.0,
                congestion_level="Low"
            ),

            TrafficData(
                road_name="Expressway 101",
                vehicle_count=350,
                avg_speed=15.2,
                congestion_level="Heavy"
            ),

            TrafficData(
                road_name="Silicon Blvd",
                vehicle_count=80,
                avg_speed=42.0,
                congestion_level="Moderate"
            ),

            TrafficData(
                road_name="Sunset Road",
                vehicle_count=30,
                avg_speed=60.5,
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
                message="Road construction starting on Sunset Road next week",
                severity="Info"
            )

        ]


        db.session.add_all(alerts)

        db.session.commit()



# -----------------------------
# Dashboard
# -----------------------------
@dashboard_bp.route('/')
@login_required
def index():

    seed_data()


    traffic_data = TrafficData.query.all()


    alerts = Alert.query.order_by(
        Alert.timestamp.desc()
    ).limit(5).all()



    stats = {

        "total_roads": len(traffic_data),

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

        last_refresh=datetime.now().strftime(
            "%d-%m-%Y %H:%M:%S"
        )

    )



# -----------------------------
# Manage Users
# -----------------------------
@dashboard_bp.route('/manage-users')
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



# -----------------------------
# Update Traffic
# -----------------------------
@dashboard_bp.route('/update-traffic', methods=['POST'])
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



    # Empty input checking

    if not vehicle_count_value or not avg_speed_value:

        flash(
            "Please enter Vehicle Count and Average Speed.",
            "danger"
        )

        return redirect(
            url_for("dashboard.index")
        )



    try:

        vehicle_count = int(vehicle_count_value)

        avg_speed = float(avg_speed_value)


    except ValueError:

        flash(
            "Please enter valid numeric values.",
            "danger"
        )

        return redirect(
            url_for("dashboard.index")
        )



    road = TrafficData.query.get(road_id)



    if road:


        # Update current traffic

        road.vehicle_count = vehicle_count

        road.avg_speed = avg_speed

        road.last_updated = datetime.utcnow()



        # -----------------------------
        # Congestion Tracking
        # -----------------------------

        if vehicle_count > 250 and avg_speed < 20:

            road.congestion_level = "Heavy"


        elif vehicle_count > 100 and avg_speed < 40:

            road.congestion_level = "Moderate"


        else:

            road.congestion_level = "Low"



        # -----------------------------
        # Save Traffic History
        # -----------------------------

        history = TrafficHistory(

            road_name=road.road_name,

            vehicle_count=vehicle_count,

            avg_speed=avg_speed,

            congestion_level=road.congestion_level

        )


        db.session.add(history)



        # -----------------------------
        # Automatic Alert Generation
        # -----------------------------

        if road.congestion_level == "Heavy":


            existing_alert = Alert.query.filter_by(

                message=f"Heavy congestion detected on {road.road_name}"

            ).first()



            if not existing_alert:


                alert = Alert(

                    message=f"Heavy congestion detected on {road.road_name}",

                    severity="Critical"

                )


                db.session.add(alert)



        db.session.commit()



        flash(

            f"Traffic updated successfully for {road.road_name}",

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

# -----------------------------
# Traffic History
# -----------------------------
@dashboard_bp.route('/traffic-history')
@login_required
def traffic_history():

    history = TrafficHistory.query.order_by(
        TrafficHistory.recorded_at.asc()
    ).all()


    labels = []

    congestion_values = []



    for record in history:


        labels.append(
            record.recorded_at.strftime("%H:%M:%S")
        )



        if record.congestion_level == "Low":

            congestion_values.append(1)



        elif record.congestion_level == "Moderate":

            congestion_values.append(2)



        else:

            congestion_values.append(3)




    return render_template(

        "history.html",

        history=history,

        labels=json.dumps(labels),

        congestion_values=json.dumps(congestion_values)

    )




