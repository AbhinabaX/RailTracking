import os

import joblib
import numpy as np

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


MODEL_PATH = "model/eta_model.joblib"


app = FastAPI(
    title="RailRadar ML Service",
    version="1.0.0"
)


class ETARequest(BaseModel):
    speedKmh: float = 0
    delayMinutes: float = 0
    remainingDistanceKm: float = 0
    segmentProgress: float = 0
    currentSequence: float = 0


def load_model():
    if not os.path.exists(MODEL_PATH):
        return None

    return joblib.load(
        MODEL_PATH
    )


@app.get("/")
def root():
    return {
        "success": True,
        "message":
            "RailRadar ML Service is running."
    }


@app.post("/predict")
def predict_eta(
    request: ETARequest
):
    bundle = load_model()

    if bundle is None:
        raise HTTPException(
            status_code=503,
            detail=
                "ML model is not trained yet."
        )

    model = bundle["model"]

    features = np.array(
        [[
            request.speedKmh,
            request.delayMinutes,
            request.remainingDistanceKm,
            request.segmentProgress,
            request.currentSequence,
        ]]
    )

    prediction = model.predict(
        features
    )[0]

    prediction = max(
        1,
        float(prediction)
    )

    return {
        "success": True,
        "predictedMinutes":
            round(prediction, 2),

        "modelMAE":
            bundle.get(
                "maeMinutes"
            ),

        "trainedAt":
            bundle.get(
                "trainedAt"
            ),
    }