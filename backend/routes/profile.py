from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.settings import UserSettings

profile_bp = Blueprint(
    "profile",
    __name__,
    url_prefix="/api/profile",
)


# ==========================================================
# GET PROFILE
# ==========================================================

@profile_bp.get("")
@jwt_required()
def get_profile():

    user = User.query.get_or_404(
        int(get_jwt_identity())
    )

    settings = UserSettings.query.filter_by(
        user_id=user.id
    ).first()

    data = user.to_dict()
    data["settings"] = (
        settings.to_dict() if settings else None
    )

    return jsonify(data)


# ==========================================================
# UPDATE PROFILE
# ==========================================================

@profile_bp.put("")
@jwt_required()
def update_profile():

    user = User.query.get_or_404(
        int(get_jwt_identity())
    )

    data = request.get_json(silent=True) or {}

    # -------------------------
    # Name
    # -------------------------
    if "name" in data:
        user.name = data["name"].strip()

    # -------------------------
    # Phone
    # -------------------------
    if "phone" in data:
        user.phone = data["phone"].strip()

    # -------------------------
    # Department
    # -------------------------
    if "department" in data:
        user.department = data["department"].strip()

    # -------------------------
    # Profile Photo
    # Base64 image string
    # -------------------------
    if "avatarUrl" in data:
        user.avatar_url = data["avatarUrl"]

    user.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify(user.to_dict())

