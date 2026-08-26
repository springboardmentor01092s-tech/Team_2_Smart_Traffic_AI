import re

EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def is_valid_email(email):
    return bool(email) and bool(EMAIL_RE.match(email))


def is_valid_password(password):
    return bool(password) and len(password) >= 8


def require_fields(data, fields):
    missing = [f for f in fields if data.get(f) in (None, "")]
    return missing
