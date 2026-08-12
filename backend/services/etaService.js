/* =====================================================
   ETA SERVICE
   ML Prediction + Heuristic Fallback
===================================================== */

const EARTH_RADIUS_KM = 6371;


/* =====================================================
   ML SERVICE URL
===================================================== */

const ML_SERVICE_URL =
  process.env.ML_SERVICE_URL ||
  "http://localhost:8000";


/* =====================================================
   DISTANCE BETWEEN TWO GPS COORDINATES
===================================================== */

const getDistanceKm = (
  lat1,
  lon1,
  lat2,
  lon2
) => {

  if (
    !Number.isFinite(Number(lat1)) ||
    !Number.isFinite(Number(lon1)) ||
    !Number.isFinite(Number(lat2)) ||
    !Number.isFinite(Number(lon2))
  ) {
    return 0;
  }


  const toRad = (value) =>
    (value * Math.PI) / 180;


  const dLat =
    toRad(
      Number(lat2) -
      Number(lat1)
    );


  const dLon =
    toRad(
      Number(lon2) -
      Number(lon1)
    );


  const a =
    Math.sin(dLat / 2) ** 2 +

    Math.cos(
      toRad(Number(lat1))
    ) *

    Math.cos(
      toRad(Number(lat2))
    ) *

    Math.sin(dLon / 2) ** 2;


  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );


  return (
    EARTH_RADIUS_KM *
    c
  );
};


/* =====================================================
   CALCULATE TOTAL REMAINING DISTANCE
===================================================== */

const calculateRemainingDistance = ({
  route,
  currentLocation,
  currentSequence,
  segmentProgress,
}) => {

  if (
    !Array.isArray(route) ||
    route.length < 2
  ) {
    return 0;
  }


  const validRoute =
    route.filter(
      (station) =>
        Number.isFinite(
          Number(station?.lat)
        ) &&
        Number.isFinite(
          Number(station?.lng)
        )
    );


  if (
    validRoute.length < 2
  ) {
    return 0;
  }


  const sequence =
    Number(
      currentSequence
    ) || 1;


  let currentIndex =
    validRoute.findIndex(
      (station) =>
        Number(
          station.sequence
        ) === sequence
    );


  if (
    currentIndex < 0
  ) {

    currentIndex =
      Math.max(
        0,
        Math.min(
          validRoute.length - 2,
          sequence - 1
        )
      );
  }


  const currentLat =
    Number(
      currentLocation?.lat
    );


  const currentLng =
    Number(
      currentLocation?.lng
    );


  let distance = 0;


  /* -------------------------------------------------
     CURRENT GPS → NEXT STATION
  ------------------------------------------------- */

  if (
    Number.isFinite(
      currentLat
    ) &&
    Number.isFinite(
      currentLng
    ) &&
    validRoute[
      currentIndex + 1
    ]
  ) {

    distance +=
      getDistanceKm(
        currentLat,
        currentLng,
        validRoute[
          currentIndex + 1
        ].lat,
        validRoute[
          currentIndex + 1
        ].lng
      );

  } else {

    /* -------------------------------------------------
       FALLBACK USING SEGMENT PROGRESS
    ------------------------------------------------- */

    const progress =
      Math.max(
        0,
        Math.min(
          1,
          Number(
            segmentProgress
          ) || 0
        )
      );


    if (
      validRoute[
        currentIndex
      ] &&
      validRoute[
        currentIndex + 1
      ]
    ) {

      const segmentDistance =
        getDistanceKm(
          validRoute[
            currentIndex
          ].lat,
          validRoute[
            currentIndex
          ].lng,
          validRoute[
            currentIndex + 1
          ].lat,
          validRoute[
            currentIndex + 1
          ].lng
        );


      distance +=
        segmentDistance *
        (1 - progress);
    }
  }


  /* -------------------------------------------------
     REMAINING FULL SEGMENTS
  ------------------------------------------------- */

  for (
    let i =
      currentIndex + 1;

    i <
      validRoute.length - 1;

    i++
  ) {

    distance +=
      getDistanceKm(
        validRoute[i].lat,
        validRoute[i].lng,
        validRoute[
          i + 1
        ].lat,
        validRoute[
          i + 1
        ].lng
      );
  }


  return Number(
    distance.toFixed(1)
  );
};


/* =====================================================
   ML PREDICTION
===================================================== */

const getMLPrediction = async ({
  speedKmh,
  delayMinutes,
  remainingDistanceKm,
  segmentProgress,
  currentSequence,
}) => {

  const controller =
    new AbortController();


  /*
    ML model loading on Render can take some time,
    especially when the free service wakes from sleep.
    We therefore allow up to 60 seconds.
  */

  const timeout =
    setTimeout(
      () => {

        controller.abort();

      },
      60000
    );


  try {

    const predictionUrl =
      `${ML_SERVICE_URL}/predict`;


    console.log(
      `[ETA] Calling ML service: ${predictionUrl}`
    );


    const response =
      await fetch(
        predictionUrl,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            Accept:
              "application/json",
          },

          body:
            JSON.stringify({

              speedKmh:
                Number(
                  speedKmh
                ) || 0,

              delayMinutes:
                Number(
                  delayMinutes
                ) || 0,

              remainingDistanceKm:
                Number(
                  remainingDistanceKm
                ) || 0,

              segmentProgress:
                Number(
                  segmentProgress
                ) || 0,

              currentSequence:
                Number(
                  currentSequence
                ) || 0,

            }),

          signal:
            controller.signal,
        }
      );


    if (
      !response.ok
    ) {

      let errorBody =
        null;

      try {

        errorBody =
          await response.json();

      } catch {

        errorBody =
          null;

      }


      throw new Error(
        errorBody?.detail ||
        errorBody?.message ||
        `ML service returned HTTP ${response.status}`
      );
    }


    const data =
      await response.json();


    console.log(
      "[ETA] ML service response received."
    );


    if (
      !data?.success
    ) {

      throw new Error(
        data?.detail ||
        data?.message ||
        "ML prediction failed."
      );
    }


    const predictedMinutes =
      Number(
        data?.predictedMinutes
      );


    if (
      !Number.isFinite(
        predictedMinutes
      )
    ) {

      throw new Error(
        "ML service returned an invalid predictedMinutes value."
      );
    }


    return {

      predictedMinutes:
        Math.max(
          1,
          Math.round(
            predictedMinutes
          )
        ),

      modelMAE:
        Number.isFinite(
          Number(
            data?.modelMAE
          )
        )
          ? Number(
              data.modelMAE
            )
          : null,

      trainedAt:
        data?.trainedAt ||
        null,

    };

  } catch (error) {

    if (
      error?.name ===
      "AbortError"
    ) {

      throw new Error(
        "ML service request timed out after 60 seconds."
      );
    }


    throw error;

  } finally {

    clearTimeout(
      timeout
    );

  }
};


/* =====================================================
   HEURISTIC ETA FALLBACK
===================================================== */

const calculateHeuristicETA = ({
  remainingDistance,
  currentSpeed,
  delayMinutes,
}) => {

  const safeSpeed =
    Math.max(
      Number(
        currentSpeed
      ) || 0,
      45
    );


  /* -------------------------------------------------
     BASE TRAVEL TIME
  ------------------------------------------------- */

  const baseMinutes =
    remainingDistance > 0

      ? (
          remainingDistance /
          safeSpeed
        ) * 60

      : 0;


  /* -------------------------------------------------
     OPERATIONAL BUFFER
  ------------------------------------------------- */

  const operationalBuffer =
    Math.min(
      45,

      Math.max(
        8,

        remainingDistance *
        0.025
      )
    );


  /* -------------------------------------------------
     EFFECTIVE DELAY
  ------------------------------------------------- */

  const effectiveDelay =
    Math.max(
      0,

      Math.min(
        Number(
          delayMinutes
        ) || 0,
        120
      )
    );


  const estimatedMinutes =
    Math.max(
      1,

      Math.round(
        baseMinutes +
        operationalBuffer +
        effectiveDelay
      )
    );


  return {

    estimatedMinutes,

    baseMinutes:
      Math.round(
        baseMinutes
      ),

    operationalBufferMinutes:
      Math.round(
        operationalBuffer
      ),

    delayMinutes:
      effectiveDelay,

  };
};


/* =====================================================
   HEURISTIC CONFIDENCE
===================================================== */

const calculateConfidence = ({
  currentSpeed,
  delayMinutes,
  remainingDistance,
}) => {

  let confidence =
    85;


  if (
    currentSpeed <= 20
  ) {

    confidence -= 15;

  } else if (
    currentSpeed <= 40
  ) {

    confidence -= 8;

  }


  if (
    delayMinutes >= 30
  ) {

    confidence -= 10;

  } else if (
    delayMinutes >= 15
  ) {

    confidence -= 5;

  }


  if (
    remainingDistance > 1000
  ) {

    confidence -= 8;

  } else if (
    remainingDistance > 500
  ) {

    confidence -= 4;

  }


  return Math.max(
    55,
    Math.min(
      95,
      confidence
    )
  );
};


/* =====================================================
   FINAL ETA CALCULATION
===================================================== */

export const calculateETA =
  async ({
    route,
    currentLocation,
    currentSequence,
    segmentProgress,
    delayMinutes = 0,
  }) => {

    /* -------------------------------------------------
       CURRENT SPEED
    ------------------------------------------------- */

    const currentSpeed =
      Number(
        currentLocation?.speedKmh ??
        currentLocation?.speedKmph
      ) || 0;


    const safeCurrentSpeed =
      Math.max(
        0,
        currentSpeed
      );


    /* -------------------------------------------------
       REMAINING DISTANCE
    ------------------------------------------------- */

    const remainingDistance =
      calculateRemainingDistance({
        route,
        currentLocation,
        currentSequence,
        segmentProgress,
      });


    /* -------------------------------------------------
       TRY ML PREDICTION FIRST
    ------------------------------------------------- */

    try {

      const mlResult =
        await getMLPrediction({

          speedKmh:
            safeCurrentSpeed,

          delayMinutes:
            Number(
              delayMinutes
            ) || 0,

          remainingDistanceKm:
            remainingDistance,

          segmentProgress:
            Number(
              segmentProgress
            ) || 0,

          currentSequence:
            Number(
              currentSequence
            ) || 0,

        });


      const estimatedMinutes =
        mlResult.predictedMinutes;


      const etaDate =
        new Date(
          Date.now() +
          estimatedMinutes *
            60 *
            1000
        );


      /* -------------------------------------------------
         ML CONFIDENCE

         Derived from model MAE.
         This is NOT a calibrated probability.
      ------------------------------------------------- */

      let confidence =
        88;


      if (
        mlResult.modelMAE !== null
      ) {

        if (
          mlResult.modelMAE <= 5
        ) {

          confidence =
            95;

        } else if (
          mlResult.modelMAE <= 10
        ) {

          confidence =
            90;

        } else if (
          mlResult.modelMAE <= 20
        ) {

          confidence =
            84;

        } else {

          confidence =
            78;
        }
      }


      console.log(
        `[ETA] ML prediction successful | minutes: ${estimatedMinutes}`
      );


      return {

        remainingDistanceKm:
          remainingDistance,

        currentSpeedKmh:
          safeCurrentSpeed,

        baseTravelMinutes:
          null,

        delayMinutes:
          Number(
            delayMinutes
          ) || 0,

        operationalBufferMinutes:
          null,

        estimatedMinutes,

        confidence,

        estimatedArrivalISO:
          etaDate.toISOString(),

        predictionSource:
          "ml",

        modelMAE:
          mlResult.modelMAE,

        trainedAt:
          mlResult.trainedAt,

        mlServiceUrl:
          ML_SERVICE_URL,

      };

    } catch (mlError) {

      console.warn(
        `[ETA] ML prediction unavailable. Using heuristic fallback: ${mlError.message}`
      );

    }


    /* -------------------------------------------------
       ML FAILED → HEURISTIC FALLBACK
    ------------------------------------------------- */

    const fallback =
      calculateHeuristicETA({

        remainingDistance,

        currentSpeed:
          safeCurrentSpeed,

        delayMinutes,

      });


    const confidence =
      calculateConfidence({

        currentSpeed:
          safeCurrentSpeed,

        delayMinutes:
          Number(
            delayMinutes
          ) || 0,

        remainingDistance,

      });


    const etaDate =
      new Date(
        Date.now() +
        fallback.estimatedMinutes *
          60 *
          1000
      );


    console.log(
      `[ETA] Heuristic ETA used | minutes: ${fallback.estimatedMinutes}`
    );


    return {

      remainingDistanceKm:
        remainingDistance,

      currentSpeedKmh:
        safeCurrentSpeed,

      baseTravelMinutes:
        fallback.baseMinutes,

      delayMinutes:
        fallback.delayMinutes,

      operationalBufferMinutes:
        fallback.operationalBufferMinutes,

      estimatedMinutes:
        fallback.estimatedMinutes,

      confidence,

      estimatedArrivalISO:
        etaDate.toISOString(),

      predictionSource:
        "heuristic",

      modelMAE:
        null,

      trainedAt:
        null,

      mlServiceUrl:
        ML_SERVICE_URL,

    };
  };