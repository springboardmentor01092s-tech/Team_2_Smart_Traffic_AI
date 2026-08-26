from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from extensions import db
from models.user import User
from models.settings import UserSettings
from utils.decorators import admin_required
from utils.validators import (
    is_valid_email,
    is_valid_password,
    require_fields,
)

users_bp = Blueprint(
    "users",
    __name__,
    url_prefix="/api/users",
)


# ==========================================================
# LIST USERS (SEARCH + FILTER + PAGINATION)
# ==========================================================

@users_bp.get("")
@jwt_required()
def list_users():

    q = request.args.get("q", "").strip()

    role = request.args.get("role", "all")

    status = request.args.get("status", "all")

    page = max(1, int(request.args.get("page", 1)))

    per_page = max(1, int(request.args.get("perPage", 8)))

    query = User.query

    # -------------------------------
    # SEARCH
    # -------------------------------

    if q:

        like = f"%{q}%"

        query = query.filter(
            db.or_(
                User.name.ilike(like),
                User.email.ilike(like),
                User.role.ilike(like),
            )
        )

    # -------------------------------
    # ROLE FILTER
    # -------------------------------

    if role != "all":

        query = query.filter(
            User.role == role
        )

    # -------------------------------
    # STATUS FILTER
    # -------------------------------

    if status != "all":

        query = query.filter(
            User.status == status
        )

    total = query.count()

    users = (
        query
        .order_by(User.created_at.desc())
        .offset((page - 1) * per_page)
        .limit(per_page)
        .all()
    )

    return jsonify({

        "items": [
            user.to_dict()
            for user in users
        ],

        "total": total,

        "page": page,

        "perPage": per_page,

        "counts": {

            "total":
                User.query.count(),

            "active":
                User.query.filter_by(
                    status="active"
                ).count(),

            "admins":
                User.query.filter(
                    User.role.in_(
                        ["admin", "super_admin"]
                    )
                ).count(),

            "operators":
                User.query.filter_by(
                    role="traffic_operator"
                ).count(),
        },
    })


# ==========================================================
# CREATE USER
# ==========================================================

@users_bp.post("")
@admin_required
def create_user():

    data = request.get_json(silent=True) or {}

    missing = require_fields(
        data,
        [
            "name",
            "email",
            "password",
            "role",
        ],
    )

    if missing:
        return jsonify({
            "error": f"Missing fields: {', '.join(missing)}"
        }), 400

    email = data["email"].strip().lower()

    if not is_valid_email(email):
        return jsonify({
            "error": "Invalid email"
        }), 400

    if not is_valid_password(data["password"]):
        return jsonify({
            "error": "Password must be at least 8 characters"
        }), 400

    if User.query.filter_by(email=email).first():
        return jsonify({
            "error": "A user with this email already exists"
        }), 409

    user = User(

        name=data["name"].strip(),

        email=email,

        role=data["role"],

        phone=data.get("phone", "").strip(),

        department=data.get("department", "").strip(),

        assigned_area=(
            data.get("assignedArea")
            or "All Locations"
        ),

        status="active",
    )

    user.set_password(data["password"])

    db.session.add(user)

    db.session.flush()

    # Default settings row
    db.session.add(
        UserSettings(
            user_id=user.id
        )
    )

    db.session.commit()

    return jsonify(user.to_dict()), 201


# ==========================================================
# UPDATE USER
# ==========================================================

@users_bp.put("/<int:user_id>")
@admin_required
def update_user(user_id):

    user = User.query.get_or_404(user_id)

    data = request.get_json(silent=True) or {}

    # -------------------------------
    # NAME
    # -------------------------------

    if "name" in data:
        user.name = data["name"].strip()

    # -------------------------------
    # EMAIL
    # -------------------------------

    if "email" in data:

        new_email = data["email"].strip().lower()

        if not is_valid_email(new_email):
            return jsonify({
                "error": "Invalid email"
            }), 400

        existing = User.query.filter(
            User.email == new_email,
            User.id != user.id,
        ).first()

        if existing:
            return jsonify({
                "error": "Email already in use"
            }), 409

        user.email = new_email

    # -------------------------------
    # PHONE
    # -------------------------------

    if "phone" in data:
        user.phone = data["phone"].strip()

    # -------------------------------
    # DEPARTMENT
    # -------------------------------

    if "department" in data:
        user.department = data["department"].strip()

    # -------------------------------
    # ASSIGNED AREA
    # -------------------------------

    if "assignedArea" in data:
        user.assigned_area = (
            data["assignedArea"].strip()
            or "All Locations"
        )

    # -------------------------------
    # ROLE
    # -------------------------------

    if "role" in data:
        user.role = data["role"]

    # -------------------------------
    # STATUS
    # -------------------------------

    if "status" in data:
        user.status = data["status"]

    # -------------------------------
    # OPTIONAL PASSWORD CHANGE
    # -------------------------------

    if data.get("password"):

        if not is_valid_password(data["password"]):
            return jsonify({
                "error": "Password must be at least 8 characters"
            }), 400

        user.set_password(data["password"])

    user.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify(user.to_dict())


# ==========================================================
# TOGGLE STATUS
# ==========================================================

@users_bp.patch("/<int:user_id>/status")
@admin_required
def toggle_status(user_id):

    user = User.query.get_or_404(user_id)

    data = request.get_json(silent=True) or {}

    new_status = data.get("status")

    if new_status not in (
        "active",
        "inactive",
    ):
        return jsonify({
            "error": "status must be active or inactive"
        }), 400

    user.status = new_status

    user.updated_at = datetime.utcnow()

    db.session.commit()

    return jsonify(user.to_dict())


# ==========================================================
# DELETE USER
# ==========================================================

@users_bp.delete("/<int:user_id>")
@admin_required
def delete_user(user_id):

    current_user = int(get_jwt_identity())

    if current_user == user_id:
        return jsonify({
            "error": "You cannot delete your own account"
        }), 400

    user = User.query.get_or_404(user_id)

    UserSettings.query.filter_by(
        user_id=user.id
    ).delete()

    db.session.delete(user)

    db.session.commit()

    return jsonify({
        "message": "User deleted successfully"
    })

