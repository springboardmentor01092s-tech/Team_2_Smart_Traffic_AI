from flask import Blueprint, request, jsonify
import pickle
import pandas as pd


prediction_bp = Blueprint(
    "prediction",
    __name__
)


# Load AI model
model = pickle.load(
    open("models/traffic_model.pkl", "rb")
)

encoder = pickle.load(
    open("models/label_encoder.pkl", "rb")
)


@prediction_bp.route("/predict", methods=["POST"])
def predict():

    data = request.json

    input_data = pd.DataFrame(
        [
            {
                "temp": data["temp"],
                "rain_1h": data["rain_1h"],
                "snow_1h": data["snow_1h"],
                "clouds_all": data["clouds_all"],
                "hour": data["hour"],
                "day": data["day"],
                "month": data["month"]
            }
        ]
    )


    prediction = model.predict(input_data)


    congestion = encoder.inverse_transform(
        prediction
    )


    return jsonify(
        {
            "predicted_congestion": congestion[0]
        }
    )
