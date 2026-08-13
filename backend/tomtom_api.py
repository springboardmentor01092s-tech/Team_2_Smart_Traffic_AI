import os
import requests


TOMTOM_API_KEY = os.getenv("TOMTOM_API_KEY")

def get_traffic(latitude, longitude):

    url = "https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/10/json"

    params = {
        "key": TOMTOM_API_KEY,
        "point": f"{latitude},{longitude}"
    }

    response = requests.get(url, params=params, timeout=10)

    response.raise_for_status()

    return response.json()