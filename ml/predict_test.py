import pickle
import pandas as pd


# Load trained model
model = pickle.load(
    open("traffic_model.pkl", "rb")
)

# Load label encoder
encoder = pickle.load(
    open("label_encoder.pkl", "rb")
)


# Example traffic input
# temp, rain, snow, clouds, hour, day, month

input_data = pd.DataFrame(
    [
        {
            "temp": 290,
            "rain_1h": 0,
            "snow_1h": 0,
            "clouds_all": 40,
            "hour": 8,
            "day": 6,
            "month": 8
        }
    ]
)


# Predict
prediction = model.predict(input_data)


# Convert number back to text

congestion = encoder.inverse_transform(
    prediction
)


print("Predicted Congestion Level:", congestion[0])