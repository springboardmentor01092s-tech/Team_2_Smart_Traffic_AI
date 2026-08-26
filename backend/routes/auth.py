from datetime import datetime
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token,
    create_refresh_token,
    jwt_required,
    get_jwt_identity,
    get_jwt,
)

from extensions import db
from models.user import User
from models.settings import UserSettings
from utils.validators import is_valid_email, is_valid_password, require_fields

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.post("/login")
def login():
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["email", "password"])
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    email = data["email"].strip().lower()
    password = data["password"]
    requested_role = data.get("role")  # optional role selector from login screen

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid email or password"}), 401

    if user.status != "active":
        return jsonify({"error": "This account has been deactivated"}), 403

    if requested_role and requested_role not in (user.role, "admin_view"):
        # Selecting "Admin" on the login screen while logged in as a non-admin
        # account is rejected rather than silently granting elevated access.
        if not (requested_role == "admin" and user.role in ("admin", "super_admin")):
            return jsonify({"error": "This account does not have that role"}), 403

    user.last_active = datetime.utcnow()
    db.session.commit()

    claims = {"role": user.role, "name": user.name}
    access_token = create_access_token(identity=str(user.id), additional_claims=claims)
    refresh_token = create_refresh_token(identity=str(user.id), additional_claims=claims)

    return jsonify(
        {
            "accessToken": access_token,
            "refreshToken": refresh_token,
            "user": user.to_dict(),
        }
    )


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    identity = get_jwt_identity()
    claims = get_jwt()
    access_token = create_access_token(
        identity=identity,
        additional_claims={"role": claims.get("role"), "name": claims.get("name")},
    )
    return jsonify({"accessToken": access_token})


@auth_bp.get("/me")
@jwt_required()
def me():
    user = User.query.get_or_404(int(get_jwt_identity()))
    return jsonify(user.to_dict())


@auth_bp.post("/logout")
@jwt_required()
def logout():
    # Stateless JWT: the frontend discards the token. A production deployment
    # would additionally maintain a token blocklist (e.g. in Redis) here.
    return jsonify({"message": "Logged out"})


@auth_bp.post("/change-password")
@jwt_required()
def change_password():
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["currentPassword", "newPassword"])
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400

    user = User.query.get_or_404(int(get_jwt_identity()))
    if not user.check_password(data["currentPassword"]):
        return jsonify({"error": "Current password is incorrect"}), 400
    if not is_valid_password(data["newPassword"]):
        return jsonify({"error": "New password must be at least 8 characters"}), 400

    user.set_password(data["newPassword"])
    db.session.commit()
    return jsonify({"message": "Password updated successfully"})


@auth_bp.post("/register")
def register():
    """Self-service registration, disabled by default in favor of admin-created
    accounts, but implemented for completeness / first-run setup."""
    data = request.get_json(silent=True) or {}
    missing = require_fields(data, ["name", "email", "password"])
    if missing:
        return jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
    if not is_valid_email(data["email"]):
        return jsonify({"error": "Invalid email"}), 400
    if not is_valid_password(data["password"]):
        return jsonify({"error": "Password must be at least 8 characters"}), 400
    if User.query.filter_by(email=data["email"].strip().lower()).first():
        return jsonify({"error": "An account with this email already exists"}), 409

    user = User(
        name=data["name"],
        email=data["email"].strip().lower(),
        role=data.get("role", "traffic_operator"),
    )
    user.set_password(data["password"])
    db.session.add(user)
    db.session.flush()
    db.session.add(UserSettings(user_id=user.id))
    db.session.commit()

    return jsonify(user.to_dict()), 201
