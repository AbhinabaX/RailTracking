import os
from datetime import datetime

import joblib
import numpy as np
import pandas as pd

from dotenv import load_dotenv
from pymongo import MongoClient

from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
from sklearn.model_selection import train_test_split


# =========================================
# LOAD .ENV
# =========================================

load_dotenv()

MONGO_URI = os.getenv("MONGO_URI")

if not MONGO_URI:
    raise RuntimeError(
        "MONGO_URI not found in ml_service/.env"
    )


# =========================================
# CONFIG
# =========================================

DATABASE_NAME = "AI_JOB_PORTAL"

MODEL_DIR = "model"

MODEL_PATH = os.path.join(
    MODEL_DIR,
    "eta_model.joblib"
)


# =========================================
# LOAD DATA FROM MONGODB
# =========================================

def load_history():

    print("Connecting to MongoDB...")

    client = MongoClient(
        MONGO_URI,
        serverSelectionTimeoutMS=10000
    )

    # Test connection
    client.admin.command("ping")

    print("MongoDB connection successful.")

    db = client[DATABASE_NAME]

    collection = db["trainhistories"]

    records = list(
        collection.find({})
    )

    client.close()

    print(
        f"Found {len(records)} history records."
    )

    if not records:
        raise RuntimeError(
            "No train history found in MongoDB."
        )

    return records


# =========================================
# CREATE DATAFRAME
# =========================================

def prepare_dataframe(records):

    rows = []

    for record in records:

        rows.append(
            {
                "speedKmh":
                    record.get(
                        "speedKmh",
                        0
                    ),

                "delayMinutes":
                    record.get(
                        "delayMinutes",
                        0
                    ),

                "remainingDistanceKm":
                    record.get(
                        "remainingDistanceKm",
                        np.nan
                    ),

                "segmentProgress":
                    record.get(
                        "segmentProgress",
                        0
                    ),

                "currentSequence":
                    record.get(
                        "currentSequence",
                        0
                    ),

                "recordedAt":
                    record.get(
                        "recordedAt"
                    ),

                "trainNumber":
                    record.get(
                        "trainNumber",
                        ""
                    ),
            }
        )

    return pd.DataFrame(rows)


# =========================================
# BUILD TRAINING TARGET
# =========================================

def build_training_target(df):

    df["recordedAt"] = pd.to_datetime(
        df["recordedAt"],
        errors="coerce"
    )

    df = df.dropna(
        subset=["recordedAt"]
    )

    df = df.sort_values(
        [
            "trainNumber",
            "recordedAt"
        ]
    )

    target_values = []

    grouped = df.groupby(
        "trainNumber"
    )

    for _, group in grouped:

        timestamps = (
            group["recordedAt"]
            .values
        )

        for index in range(
            len(timestamps)
        ):

            if index + 1 < len(timestamps):

                current_time = (
                    timestamps[index]
                )

                next_time = (
                    timestamps[index + 1]
                )

                minutes = (
                    next_time -
                    current_time
                ) / np.timedelta64(
                    1,
                    "m"
                )

                target_values.append(
                    float(minutes)
                )

            else:

                target_values.append(
                    np.nan
                )

    df["targetMinutes"] = (
        target_values
    )

    df = df[
        df["targetMinutes"]
        .notna()
    ]

    return df


# =========================================
# TRAIN MODEL
# =========================================

def train():

    os.makedirs(
        MODEL_DIR,
        exist_ok=True
    )

    records = load_history()

    print(
        f"Loaded {len(records)} history records."
    )

    df = prepare_dataframe(
        records
    )

    df = build_training_target(
        df
    )

    print(
        f"Usable training rows: {len(df)}"
    )

    if len(df) < 20:

        raise RuntimeError(
            "Not enough historical records yet. "
            "Collect more train history before training."
        )

    features = [
        "speedKmh",
        "delayMinutes",
        "remainingDistanceKm",
        "segmentProgress",
        "currentSequence"
    ]

    for feature in features:

        df[feature] = pd.to_numeric(
            df[feature],
            errors="coerce"
        )

    df[features] = (
        df[features]
        .replace(
            [np.inf, -np.inf],
            np.nan
        )
        .fillna(0)
    )

    X = df[features]

    y = pd.to_numeric(
        df["targetMinutes"],
        errors="coerce"
    )

    valid_rows = y.notna()

    X = X[valid_rows]

    y = y[valid_rows]

    if len(X) < 20:

        raise RuntimeError(
            "Not enough valid training rows."
        )

    X_train, X_test, y_train, y_test = (
        train_test_split(
            X,
            y,
            test_size=0.2,
            random_state=42
        )
    )

    print(
        "Training Random Forest model..."
    )

    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=12,
        random_state=42,
        n_jobs=-1
    )

    model.fit(
        X_train,
        y_train
    )

    predictions = model.predict(
        X_test
    )

    mae = mean_absolute_error(
        y_test,
        predictions
    )

    model_bundle = {
        "model": model,
        "features": features,
        "trainedAt":
            datetime.now().isoformat(),
        "maeMinutes":
            float(mae)
    }

    joblib.dump(
        model_bundle,
        MODEL_PATH
    )

    print()
    print(
        "================================="
    )
    print(
        "MODEL TRAINING COMPLETE"
    )
    print(
        "================================="
    )
    print(
        f"Model saved to: {MODEL_PATH}"
    )
    print(
        f"Training rows: {len(X_train)}"
    )
    print(
        f"Testing rows: {len(X_test)}"
    )
    print(
        f"Validation MAE: {mae:.2f} minutes"
    )
    print(
        "================================="
    )


# =========================================
# MAIN
# =========================================

if __name__ == "__main__":
    train()