from flask import Flask, jsonify

from config import Config
from extensions import db, jwt, bcrypt, cors, socketio   # ← CHANGED


def create_app(config_class=Config):
    app = Flask(__name__)

    # CONFIGURATION
    app.config.from_object(config_class)

    # INITIALIZE EXTENSIONS
    db.init_app(app)
    jwt.init_app(app)
    bcrypt.init_app(app)

    # NEW
    socketio.init_app(
        app,
        cors_allowed_origins=app.config["FRONTEND_ORIGIN"]
    )

    cors.init_app(
        app,
        resources={
            r"/api/*": {
                "origins": app.config["FRONTEND_ORIGIN"],
            }
        },
    )

    # IMPORT MODELS
    from models.user import User
    from models.traffic import Road, TrafficData, TrafficHistory
    from models.alert import Alert
    from models.report import SavedRouteReport

    _ = (
        User,
        Road,
        TrafficData,
        TrafficHistory,
        Alert,
        SavedRouteReport,
    )

    # IMPORT BLUEPRINTS
    from routes.auth import auth_bp
    from routes.users import users_bp
    from routes.traffic import traffic_bp
    from routes.prediction import prediction_bp
    from routes.routes_bp import route_bp
    from routes.alerts import alerts_bp
    from routes.analytics import analytics_bp
    from routes.profile import profile_bp
    from routes.settings import settings_bp
    from routes.reports import reports_bp

    # REGISTER
    app.register_blueprint(auth_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(traffic_bp)
    app.register_blueprint(prediction_bp)
    app.register_blueprint(route_bp)
    app.register_blueprint(alerts_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(profile_bp)
    app.register_blueprint(settings_bp)
    app.register_blueprint(reports_bp)

    with app.app_context():
        db.create_all()

    @app.get("/api/health")
    def health():
        return jsonify({
            "status": "ok",
            "service": "TrafficVision AI backend",
        })

    @app.errorhandler(404)
    def not_found(error):
        return jsonify({"error": "Not found"}), 404

    @app.errorhandler(500)
    def server_error(error):
        return jsonify({"error": "Internal server error"}), 500

    return app


app = create_app()


# IMPORTANT: Run SocketIO server instead of app.run()
if __name__ == "__main__":
    socketio.run(
        app,
        debug=True,
        host="127.0.0.1",
        port=5000,
    )

    