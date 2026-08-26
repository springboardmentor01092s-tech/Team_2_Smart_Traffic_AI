from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.settings import UserSettings, SystemSetting
from utils.decorators import admin_required

settings_bp = Blueprint(
    "settings",
    __name__,
    url_prefix="/api/settings",
)


# ==========================================================
# GET USER SETTINGS
# ==========================================================

@settings_bp.get("/user")
@jwt_required()
def get_user_settings():

    user_id = int(get_jwt_identity())

    settings = UserSettings.query.filter_by(
        user_id=user_id
    ).first()

    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)
        db.session.commit()

    return jsonify(settings.to_dict())


# ==========================================================
# UPDATE USER SETTINGS
# ==========================================================

@settings_bp.put("/user")
@jwt_required()
def update_user_settings():

    user_id = int(get_jwt_identity())

    settings = UserSettings.query.filter_by(
        user_id=user_id
    ).first()

    if not settings:
        settings = UserSettings(user_id=user_id)
        db.session.add(settings)

    data = request.get_json(silent=True) or {}

    # General
    if "theme" in data:
        settings.theme = data["theme"]

    if "language" in data:
        settings.language = data["language"]

    # Notifications
    if "emailNotifications" in data:
        settings.email_notifications = bool(
            data["emailNotifications"]
        )

    if "smsAlerts" in data:
        settings.sms_alerts = bool(
            data["smsAlerts"]
        )

    if "pushNotifications" in data:
        settings.push_notifications = bool(
            data["pushNotifications"]
        )

    # Map
    if "mapProvider" in data:
        settings.map_provider = data["mapProvider"]

    db.session.commit()

    return jsonify(settings.to_dict())


# ==========================================================
# GET SYSTEM SETTINGS
# ==========================================================

@settings_bp.get("/system")
@jwt_required()
def get_system_settings():

    rows = SystemSetting.query.all()

    return jsonify({
        row.key: row.value
        for row in rows
    })


# ==========================================================
# UPDATE SYSTEM SETTINGS
# ==========================================================

@settings_bp.put("/system")
@admin_required
def update_system_settings():

    data = request.get_json(silent=True) or {}

    for key, value in data.items():

        setting = SystemSetting.query.filter_by(
            key=key
        ).first()

        if not setting:
            setting = SystemSetting(key=key)
            db.session.add(setting)

        setting.value = str(value)

    db.session.commit()

    rows = SystemSetting.query.all()

    return jsonify({
        row.key: row.value
        for row in rows
    })

