"""
Loads the trained Random Forest model and exposes a simple predict() API
used by the /api/prediction routes.
"""

import json
import os
import joblib
import pandas as pd

MODELS_DIR = os.path.join(
    os.path.dirname(__file__),
    "..",
    "..",
    "models"
)

_model = None
_encoder = None
_features = None


def _load():
    global _model, _encoder, _features

    if _model is None:
        _model = joblib.load(
            os.path.join(
                MODELS_DIR,
                "traffic_model.pkl"
            )
        )

        _encoder = joblib.load(
            os.path.join(
                MODELS_DIR,
                "label_encoder.pkl"
            )
        )

        with open(
            os.path.join(
                MODELS_DIR,
                "feature_columns.json"
            )
        ) as f:
            _features = json.load(f)

    return _model, _encoder, _features


# Rough average delay (minutes) associated with each
# congestion class.
DELAY_BY_LEVEL = {
    "low": 3,
    "moderate": 12,
    "heavy": 28
}


def predict_congestion(payload: dict):
    """
    payload keys:
    hour, day_of_week, month,
    temperature, rain, snow, clouds,
    vehicle_count, vehicle_speed
    """

    model, encoder, features = _load()

    # Create DataFrame with the same feature names
    # used when training the Random Forest model.
    row = pd.DataFrame(
        [[payload.get(f, 0) for f in features]],
        columns=features
    )

    proba = model.predict_proba(row)[0]

    class_idx = proba.argmax()

    level = encoder.inverse_transform(
        [class_idx]
    )[0]

    confidence = float(
        proba[class_idx]
    )

    return {
        "level": level,
        "confidence": round(
            confidence,
            3
        ),
        "estimated_delay_min":
            DELAY_BY_LEVEL.get(
                level,
                10
            ),
    }

