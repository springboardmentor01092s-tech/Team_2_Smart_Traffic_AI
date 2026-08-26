from extensions import db


class UserSettings(db.Model):
    __tablename__ = "user_settings"

    id = db.Column(db.Integer, primary_key=True)

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        unique=True,
        nullable=False,
    )

    theme = db.Column(db.String(20), default="dark", nullable=False)
    language = db.Column(db.String(20), default="en", nullable=False)

    email_notifications = db.Column(db.Boolean, default=True)
    sms_alerts = db.Column(db.Boolean, default=True)
    push_notifications = db.Column(db.Boolean, default=True)

    map_provider = db.Column(db.String(20), default="tomtom")

    def to_dict(self):
        return {
            "theme": self.theme,
            "language": self.language,
            "emailNotifications": self.email_notifications,
            "smsAlerts": self.sms_alerts,
            "pushNotifications": self.push_notifications,
            "mapProvider": self.map_provider,
        }


class SystemSetting(db.Model):
    __tablename__ = "system_settings"

    id = db.Column(db.Integer, primary_key=True)
    key = db.Column(db.String(100), unique=True, nullable=False)
    value = db.Column(db.String(255))

    