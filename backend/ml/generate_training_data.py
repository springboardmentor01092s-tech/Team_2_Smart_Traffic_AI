"""
Generates a synthetic traffic dataset for TrafficVision AI.

The dataset contains:
    - Time information
    - Weather information
    - Vehicle count
    - Vehicle speed
    - Congestion percentage
    - Congestion level

Vehicle speed is intentionally included as a traffic feature so that
the trained Random Forest model can learn the relationship between
vehicle speed and congestion.

NOTE:
This is synthetic training data, not real-world sensor data.
"""

import numpy as np
import pandas as pd


RNG = np.random.default_rng(42)

N = 20000


# ==========================================================
# CONGESTION CALCULATION
# ==========================================================

def congestion_percent(
    hour,
    day_of_week,
    rain,
    snow,
    clouds,
    vehicle_count,
    vehicle_speed,
):
    # ------------------------------------------------------
    # Rush-hour traffic pattern
    # ------------------------------------------------------

    morning_peak = np.exp(-((hour - 9) ** 2) / 6.0)

    evening_peak = np.exp(-((hour - 18.5) ** 2) / 8.0)

    base = 20 + 55 * (
        0.55 * morning_peak +
        0.75 * evening_peak
    )

    # ------------------------------------------------------
    # Weekend traffic is generally lower
    # ------------------------------------------------------

    weekend_factor = np.where(
        day_of_week >= 5,
        0.6,
        1.0
    )

    base = base * weekend_factor

    # ------------------------------------------------------
    # Weather contribution
    # ------------------------------------------------------

    weather_add = (
        rain * 18 +
        snow * 25 +
        clouds * 4
    )

    # ------------------------------------------------------
    # Vehicle count contribution
    # ------------------------------------------------------

    volume_add = (
        vehicle_count / 2000.0
    ) * 15

    # ------------------------------------------------------
    # Vehicle speed contribution
    #
    # Lower speed = higher congestion
    # Higher speed = lower congestion
    # ------------------------------------------------------

    speed_add = np.clip(
        (50 - vehicle_speed) * 1.2,
        -15,
        45
    )

    # ------------------------------------------------------
    # Random variation
    # ------------------------------------------------------

    noise = RNG.normal(
        0,
        5,
        size=len(hour)
    )

    pct = (
        base
        + weather_add
        + volume_add
        + speed_add
        + noise
    )

    return np.clip(
        pct,
        0,
        100
    )


# ==========================================================
# MAIN
# ==========================================================

def main():

    # ------------------------------------------------------
    # Time
    # ------------------------------------------------------

    hour = RNG.integers(
        0,
        24,
        N
    )

    day_of_week = RNG.integers(
        0,
        7,
        N
    )

    month = RNG.integers(
        1,
        13,
        N
    )

    # ------------------------------------------------------
    # Weather
    # ------------------------------------------------------

    temperature = RNG.normal(
        24,
        8,
        N
    ).clip(
        -5,
        45
    )

    rain = (
        RNG.choice(
            [0, 0, 0, 1],
            N
        ).astype(float)
        * RNG.uniform(
            0.1,
            1.0,
            N
        )
    )

    snow = (
        (RNG.random(N) < 0.03)
        .astype(float)
        * RNG.uniform(
            0.1,
            1.0,
            N
        )
    )

    clouds = RNG.uniform(
        0,
        1,
        N
    )

    # ------------------------------------------------------
    # Vehicle count
    # ------------------------------------------------------

    vehicle_count = RNG.integers(
        50,
        3000,
        N
    )

    # ------------------------------------------------------
    # Vehicle speed
    #
    # Speed is generated realistically:
    #
    # Higher vehicle count → generally lower speed
    #
    # But there is still variation so that the model does
    # not simply learn one fixed formula.
    # ------------------------------------------------------

    base_speed = 75 - (
        vehicle_count / 3000.0
    ) * 50

    # Rush-hour speed reduction

    rush_hour_reduction = (
        8 * np.exp(
            -((hour - 9) ** 2) / 8.0
        )
        +
        12 * np.exp(
            -((hour - 18.5) ** 2) / 10.0
        )
    )

    # Weather can reduce speed

    weather_speed_reduction = (
        rain * 10 +
        snow * 15 +
        clouds * 3
    )

    # Random variation

    speed_noise = RNG.normal(
        0,
        5,
        N
    )

    vehicle_speed = (
        base_speed
        - rush_hour_reduction
        - weather_speed_reduction
        + speed_noise
    )

    # Keep speed within a reasonable range

    vehicle_speed = np.clip(
        vehicle_speed,
        5,
        80
    )

    # ------------------------------------------------------
    # Calculate congestion
    # ------------------------------------------------------

    pct = congestion_percent(
        hour,
        day_of_week,
        rain,
        snow,
        clouds,
        vehicle_count,
        vehicle_speed,
    )

    # ------------------------------------------------------
    # Convert percentage into congestion level
    # ------------------------------------------------------

    def classify(p):

        if p < 30:
            return "low"

        elif p < 60:
            return "moderate"

        else:
            return "heavy"

    congestion_level = [
        classify(p)
        for p in pct
    ]

    # ------------------------------------------------------
    # Create dataframe
    # ------------------------------------------------------

    df = pd.DataFrame(
        {
            "hour": hour,
            "day_of_week": day_of_week,
            "month": month,
            "temperature": temperature,
            "rain": rain,
            "snow": snow,
            "clouds": clouds,
            "vehicle_count": vehicle_count,
            "vehicle_speed": vehicle_speed,
            "congestion_percent": pct,
            "congestion_level": congestion_level,
        }
    )

    # ------------------------------------------------------
    # Save dataset
    # ------------------------------------------------------

    df.to_csv(
        "training_data.csv",
        index=False
    )

    print(
        f"Wrote {len(df)} rows to training_data.csv"
    )

    print("\nColumns:")
    print(df.columns.tolist())

    print("\nCongestion distribution:")
    print(
        df["congestion_level"]
        .value_counts()
    )

    print("\nVehicle speed statistics:")
    print(
        df["vehicle_speed"].describe()
    )


# ==========================================================
# RUN
# ==========================================================

if __name__ == "__main__":
    main()

    