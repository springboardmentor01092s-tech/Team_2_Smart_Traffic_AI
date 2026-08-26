from functools import wraps
from flask import jsonify
from flask_jwt_extended import get_jwt, verify_jwt_in_request

ROLE_HIERARCHY = {
    "viewer": 0,
    "traffic_operator": 1,
    "analyst": 1,
    "admin": 2,
    "super_admin": 3,
}


def roles_required(*allowed_roles):
    """Restrict an endpoint to specific roles, e.g. @roles_required('admin', 'super_admin')."""

    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            claims = get_jwt()
            role = claims.get("role")
            if role not in allowed_roles:
                return jsonify({"error": "Insufficient permissions"}), 403
            return fn(*args, **kwargs)

        return wrapper

    return decorator


def admin_required(fn):
    return roles_required("admin", "super_admin")(fn)
