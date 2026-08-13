from flask import Blueprint, request, jsonify
import os
import requests

traffic_api_bp = Blueprint("traffic_api", __name__)


@traffic_api_bp.route("/api/traffic", methods=["GET"])
def get_traffic():

    latitude = request.args.get("lat")
    longitude = request.args.get("lon")

    if not latitude or not longitude:
        return jsonify({
            "error": "Latitude and longitude are required"
        }), 400

    api_key = os.environ.get("TOMTOM_API_KEY")

    if not api_key:
        return jsonify({
            "error": "TomTom API key is not configured"
        }), 500

    url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"

    params = {
        "key": api_key,
        "point": f"{latitude},{longitude}"
    }

    response = requests.get(url, params=params)

    return jsonify(response.json())