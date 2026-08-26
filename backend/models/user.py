from datetime import datetime
from extensions import db, bcrypt


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)

    role = db.Column(db.String(30), nullable=False, default="traffic_operator")
    # roles: super_admin, admin, traffic_operator, analyst, viewer

    phone = db.Column(db.String(30))
    department = db.Column(db.String(120))
    assigned_area = db.Column(db.String(120), default="All Locations")
    avatar_url = db.Column(db.Text)

    status = db.Column(db.String(20), nullable=False, default="active")  # active/inactive
    last_active = db.Column(db.DateTime)

    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    def set_password(self, raw_password):
        self.password_hash = bcrypt.generate_password_hash(raw_password).decode("utf-8")

    def check_password(self, raw_password):
        return bcrypt.check_password_hash(self.password_hash, raw_password)

    def to_dict(self, include_sensitive=False):
        data = {
            "id": self.id,
            "name": self.name,
            "email": self.email,
            "role": self.role,
            "phone": self.phone,
            "department": self.department,
            "assignedArea": self.assigned_area,
            "avatarUrl": self.avatar_url,
            "status": self.status,
            "lastActive": self.last_active.isoformat() if self.last_active else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
        }
        return data
