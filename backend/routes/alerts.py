# routes/alerts.py

from datetime import datetime
from zoneinfo import ZoneInfo
import os
from uuid import uuid4

from werkzeug.utils import secure_filename

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.alert import Alert
from models.user import User


alerts_bp = Blueprint(
    "alerts",
    __name__,
    url_prefix="/api/alerts"
)


# ==========================================================
# TIMEZONE
# ==========================================================

IST = ZoneInfo("Asia/Kolkata")


# ==========================================================
# CONSTANTS
# ==========================================================

VALID_TYPES = {
    "traffic",
    "congestion",
    "accident",
    "route_delay",
    "emergency",
}

VALID_SEVERITY = {
    "low",
    "medium",
    "high",
    "critical",
}

UPLOAD_FOLDER = "static/uploads/alerts"

ALLOWED_EXTENSIONS = {
    "png",
    "jpg",
    "jpeg",
}


# ==========================================================
# ROLE PERMISSIONS
# ==========================================================

ALERT_MANAGEMENT_ROLES = {
    "super_admin",
    "superadmin",
    "admin",
    "traffic_operator",
    "traffic operator",
}


# ==========================================================
# HELPERS
# ==========================================================

def get_ist_now():
    """
    Return the current date and time in Indian Standard Time.
    """

    return datetime.now(IST)


def allowed_file(filename):
    return (
        "." in filename
        and filename.rsplit(".", 1)[1].lower()
        in ALLOWED_EXTENSIONS
    )


def normalize_role(role):
    """
    Convert different role formats into one standard format.

    Examples:
        Admin              -> admin
        ADMIN              -> admin
        Traffic Operator   -> traffic_operator
        traffic-operator   -> traffic_operator
        super admin        -> super_admin
    """

    if not role:
        return ""

    role = str(role).strip().lower()

    role = role.replace("-", "_")
    role = role.replace(" ", "_")

    return role


def get_current_user():
    """
    Get the currently authenticated user from JWT.
    """

    identity = get_jwt_identity()

    if not identity:
        return None

    try:
        user_id = int(identity)
    except (TypeError, ValueError):
        return None

    return User.query.get(user_id)


def get_current_user_role():
    """
    Return normalized role of currently logged-in user.
    """

    user = get_current_user()

    if not user:
        return ""

    role = (
        getattr(user, "role", None)
        or getattr(user, "user_role", None)
        or getattr(user, "role_name", None)
    )

    return normalize_role(role)


def can_manage_alerts():
    """
    Only these roles can:

        - Create alert
        - Mark read
        - Resolve
        - Delete
    """

    role = get_current_user_role()

    return role in ALERT_MANAGEMENT_ROLES


def permission_denied_response():
    return jsonify({
        "error": "You do not have permission to manage alerts."
    }), 403


# ==========================================================
# GET ALERTS
# ==========================================================

@alerts_bp.get("")
@jwt_required()
def list_alerts():

    alert_type = request.args.get("type")
    severity = request.args.get("severity")
    status = request.args.get("status")
    q = request.args.get("q", "").strip()

    query = Alert.query

    # ------------------------------------------------------
    # TYPE FILTER
    # ------------------------------------------------------

    if alert_type and alert_type != "all":
        query = query.filter(
            Alert.alert_type == alert_type
        )

    # ------------------------------------------------------
    # SEVERITY FILTER
    # ------------------------------------------------------

    if severity and severity != "all":
        query = query.filter(
            Alert.severity == severity
        )

    # ------------------------------------------------------
    # STATUS FILTER
    # ------------------------------------------------------

    if status and status != "all":
        query = query.filter(
            Alert.status == status
        )

    # ------------------------------------------------------
    # SEARCH
    # ------------------------------------------------------

    if q:
        query = query.filter(
            Alert.title.ilike(f"%{q}%")
        )

    # ------------------------------------------------------
    # FETCH
    # ------------------------------------------------------

    rows = (
        query
        .order_by(Alert.created_at.desc())
        .limit(200)
        .all()
    )

    return jsonify({
        "items": [
            a.to_dict()
            for a in rows
        ],

        "counts": {
            "total": (
                Alert.query
                .filter_by(status="active")
                .count()
            ),

            "high": (
                Alert.query
                .filter_by(
                    status="active",
                    severity="high"
                )
                .count()
                +
                Alert.query
                .filter_by(
                    status="active",
                    severity="critical"
                )
                .count()
            ),

            "medium": (
                Alert.query
                .filter_by(
                    status="active",
                    severity="medium"
                )
                .count()
            ),

            "resolved": (
                Alert.query
                .filter_by(
                    status="resolved"
                )
                .count()
            ),

            "unread": (
                Alert.query
                .filter_by(
                    is_read=False
                )
                .count()
            ),
        },
    })


# ==========================================================
# CREATE ALERT
# ==========================================================

@alerts_bp.post("")
@jwt_required()
def create_alert():

    # ------------------------------------------------------
    # ROLE CHECK
    # ------------------------------------------------------

    if not can_manage_alerts():
        return permission_denied_response()

    # ------------------------------------------------------
    # FORM DATA
    # ------------------------------------------------------

    data = request.form

    alert_type = data.get("type")

    severity = data.get(
        "severity",
        "medium"
    )

    title = data.get("title")

    message = data.get("message")

    location = data.get("location")

    # ------------------------------------------------------
    # VALIDATION
    # ------------------------------------------------------

    if not alert_type or not title:
        return jsonify({
            "error": "Type and Title are required"
        }), 400

    if alert_type not in VALID_TYPES:
        return jsonify({
            "error": "Invalid alert type"
        }), 400

    if severity not in VALID_SEVERITY:
        return jsonify({
            "error": "Invalid severity"
        }), 400

    # ------------------------------------------------------
    # IMAGE
    # ------------------------------------------------------

    image = request.files.get("image")

    image_path = None

    if image and image.filename != "":

        if not allowed_file(image.filename):
            return jsonify({
                "error": "Only JPG and PNG images are allowed"
            }), 400

        upload_dir = os.path.join(
            current_app.root_path,
            UPLOAD_FOLDER
        )

        os.makedirs(
            upload_dir,
            exist_ok=True
        )

        filename = (
            f"{uuid4().hex}_"
            f"{secure_filename(image.filename)}"
        )

        save_path = os.path.join(
            upload_dir,
            filename
        )

        image.save(save_path)

        image_path = (
            f"/static/uploads/alerts/{filename}"
        )

    # ------------------------------------------------------
    # CURRENT USER
    # ------------------------------------------------------

    user = get_current_user()

    if not user:
        return jsonify({
            "error": "Authenticated user not found"
        }), 401

    # ------------------------------------------------------
    # CREATE ALERT
    # ------------------------------------------------------

    alert = Alert(
        alert_type=alert_type,

        severity=severity,

        title=title,

        message=message,

        location_name=location,

        image_url=image_path,

        created_by_id=user.id,
    )

    db.session.add(alert)

    db.session.commit()

    return jsonify(
        alert.to_dict()
    ), 201


# ==========================================================
# MARK READ
# ==========================================================

@alerts_bp.patch("/<int:alert_id>/read")
@jwt_required()
def mark_read(alert_id):

    # ------------------------------------------------------
    # ROLE CHECK
    # ------------------------------------------------------

    if not can_manage_alerts():
        return permission_denied_response()

    # ------------------------------------------------------
    # FIND ALERT
    # ------------------------------------------------------

    alert = Alert.query.get_or_404(
        alert_id
    )

    # ------------------------------------------------------
    # MARK READ
    # ------------------------------------------------------

    alert.is_read = True

    db.session.commit()

    return jsonify(
        alert.to_dict()
    )


# ==========================================================
# RESOLVE ALERT
# ==========================================================

@alerts_bp.patch("/<int:alert_id>/resolve")
@jwt_required()
def resolve_alert(alert_id):

    # ------------------------------------------------------
    # ROLE CHECK
    # ------------------------------------------------------

    if not can_manage_alerts():
        return permission_denied_response()

    # ------------------------------------------------------
    # FIND ALERT
    # ------------------------------------------------------

    alert = Alert.query.get_or_404(
        alert_id
    )

    # ------------------------------------------------------
    # RESOLVE
    # ------------------------------------------------------

    alert.status = "resolved"

    # IMPORTANT:
    # Store resolved time using Indian Standard Time.
    alert.resolved_at = get_ist_now()

    db.session.commit()

    return jsonify(
        alert.to_dict()
    )


# ==========================================================
# DELETE ALERT
# ==========================================================

@alerts_bp.delete("/<int:alert_id>")
@jwt_required()
def delete_alert(alert_id):

    # ------------------------------------------------------
    # ROLE CHECK
    # ------------------------------------------------------

    if not can_manage_alerts():
        return permission_denied_response()

    # ------------------------------------------------------
    # FIND ALERT
    # ------------------------------------------------------

    alert = Alert.query.get_or_404(
        alert_id
    )

    # ------------------------------------------------------
    # DELETE IMAGE
    # ------------------------------------------------------

    if alert.image_url:

        file_path = os.path.join(
            current_app.root_path,
            alert.image_url.lstrip("/")
        )

        if os.path.exists(file_path):
            os.remove(file_path)

    # ------------------------------------------------------
    # DELETE ALERT
    # ------------------------------------------------------

    db.session.delete(alert)

    db.session.commit()

    return jsonify({
        "message": "Alert deleted"
    })

