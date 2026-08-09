import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.metrics import accuracy_score
import pickle


# Load dataset
data = pd.read_csv(
    "../dataset/Metro_Interstate_Traffic_Volume.csv"
)


# Convert date_time
data["date_time"] = pd.to_datetime(data["date_time"])

data["hour"] = data["date_time"].dt.hour
data["day"] = data["date_time"].dt.day
data["month"] = data["date_time"].dt.month


# Create congestion labels

def congestion_level(volume):

    if volume < 2500:
        return "Low"

    elif volume < 5000:
        return "Moderate"

    else:
        return "Heavy"


data["congestion_level"] = data["traffic_volume"].apply(
    congestion_level
)


# Select features

X = data[
    [
        "temp",
        "rain_1h",
        "snow_1h",
        "clouds_all",
        "hour",
        "day",
        "month"
    ]
]


y = data["congestion_level"]


# Handle missing values

X = X.fillna(0)


# Encode output labels

encoder = LabelEncoder()

y = encoder.fit_transform(y)


# Split data

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
)


# Train model

model = RandomForestClassifier(
    n_estimators=100,
    random_state=42
)


model.fit(
    X_train,
    y_train
)


# Test accuracy

prediction = model.predict(X_test)

accuracy = accuracy_score(
    y_test,
    prediction
)


print("Model Accuracy:", accuracy)


# Save model

pickle.dump(
    model,
    open("traffic_model.pkl", "wb")
)


pickle.dump(
    encoder,
    open("label_encoder.pkl", "wb")
)


print("Model saved successfully!")
