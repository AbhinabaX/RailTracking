import trains from "../data/trains.js";

import {
  calculateETA,
} from "../services/etaService.js";

import saveTrainHistory from "../services/trainHistoryService.js";


/* =====================================================
   GET ALL DEMO TRAINS
   GET /api/trains
===================================================== */

export const getAllTrains = (req, res) => {
  return res.json({
    success: true,
    count: trains.length,
    trains,
  });
};


/* =====================================================
   SEARCH TRAINS
   GET /api/trains/search?q=rajdhani
===================================================== */

export const searchTrains = (req, res) => {
  const query =
    req.query.q?.trim().toLowerCase();

  if (!query) {
    return res.status(400).json({
      success: false,
      message:
        "Please provide a train number, name or route.",
    });
  }

  const results = trains.filter((train) => {
    return (
      String(train.number)
        .toLowerCase()
        .includes(query) ||

      String(train.name)
        .toLowerCase()
        .includes(query) ||

      String(train.from)
        .toLowerCase()
        .includes(query) ||

      String(train.to)
        .toLowerCase()
        .includes(query)
    );
  });

  return res.json({
    success: true,
    count: results.length,
    trains: results,
  });
};


/* =====================================================
   GET DEMO TRAIN BY NUMBER
   GET /api/trains/:number
===================================================== */

export const getTrainByNumber = (req, res) => {
  const trainNumber =
    req.params.number;

  const train = trains.find(
    (item) =>
      String(item.number) ===
      String(trainNumber)
  );

  if (!train) {
    return res.status(404).json({
      success: false,
      message: "Train not found.",
    });
  }

  return res.json({
    success: true,
    train,
  });
};


/* =====================================================
   FETCH LIVE TRAIN DATA FROM RAILRADAR
===================================================== */

const fetchLiveTrainData = async (
  trainNumber
) => {
  const apiKey =
    process.env.RAILRADAR_API_KEY?.trim();

  if (!apiKey) {
    const error = new Error(
      "RAILRADAR_API_KEY is missing from .env"
    );

    error.statusCode = 500;

    throw error;
  }

  const url =
    `https://api.railradar.in/v1/trains/${trainNumber}/live` +
    `?haltsOnly=true` +
    `&includeCoordinates=true` +
    `&geometry=true` +
    `&format=coordinates`;

  const response = await fetch(url, {
    method: "GET",

    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });

  let payload = null;

  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  /* -----------------------------------------------
     RATE LIMIT
  ------------------------------------------------ */

  if (response.status === 429) {
    const error = new Error(
      "Live train API rate limit reached. Please wait and try again later."
    );

    error.statusCode = 429;

    throw error;
  }

  /* -----------------------------------------------
     API ERROR
  ------------------------------------------------ */

  if (!response.ok) {
    const error = new Error(
      payload?.error?.message ||
        payload?.message ||
        "Unable to fetch live train data."
    );

    error.statusCode =
      response.status;

    throw error;
  }

  /*
    RailRadar may return:
    { data: {...} }

    or directly:
    {...}
  */

  return payload?.data ?? payload;
};


/* =====================================================
   GET LIVE TRAIN
   GET /api/trains/live/:number
===================================================== */

export const getLiveTrain = async (
  req,
  res
) => {
  const { number } = req.params;

  /* -----------------------------------------------
     VALIDATION
  ------------------------------------------------ */

  if (!/^\d{5}$/.test(number)) {
    return res.status(400).json({
      success: false,
      message:
        "Train number must contain exactly 5 digits.",
    });
  }

  try {
    /* -----------------------------------------------
       FETCH LIVE DATA
    ------------------------------------------------ */

    const live =
      await fetchLiveTrainData(
        number
      );

    /* -----------------------------------------------
       SAVE HISTORY
       AND CALCULATE SPEED
    ------------------------------------------------ */

    const historyResult =
      await saveTrainHistory(
        live
      );

    /* -----------------------------------------------
       SPEED
    ------------------------------------------------ */

    const currentSpeedKmh =
      historyResult?.currentSpeedKmh ??
      null;

    const speedSource =
      historyResult?.speedSource ||
      (
        currentSpeedKmh !== null
          ? "calculated"
          : "unavailable"
      );

    /* -----------------------------------------------
       GPS
    ------------------------------------------------ */

    const apiLocation =
      live?.currentLocation ||
      {};

    const latitude =
      historyResult?.latitude ??
      apiLocation?.lat ??
      apiLocation?.latitude ??
      live?.latitude ??
      null;

    const longitude =
      historyResult?.longitude ??
      apiLocation?.lng ??
      apiLocation?.longitude ??
      apiLocation?.lon ??
      live?.longitude ??
      null;

    /* -----------------------------------------------
       ENRICH CURRENT LOCATION
    ------------------------------------------------ */

    const enrichedLocation = {
      ...apiLocation,

      lat:
        apiLocation?.lat ??
        latitude,

      lng:
        apiLocation?.lng ??
        longitude,

      latitude:
        apiLocation?.latitude ??
        latitude,

      longitude:
        apiLocation?.longitude ??
        longitude,

      calculatedSpeedKmh:
        currentSpeedKmh,
    };

    /* -----------------------------------------------
       ENRICH LIVE OBJECT
    ------------------------------------------------ */

    const enrichedLive = {
      ...live,

      calculatedCurrentSpeedKmh:
        currentSpeedKmh,

      currentSpeedKmh:
        currentSpeedKmh,

      speedSource,

      latitude,

      longitude,

      currentLocation:
        enrichedLocation,
    };

    /* -----------------------------------------------
       RESPONSE
    ------------------------------------------------ */

    return res.json({
      success: true,
      data: enrichedLive,
    });

  } catch (error) {
    console.error(
      "[BACKEND] Live train error:",
      error.message
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to fetch live train data.",
    });
  }
};


/* =====================================================
   GET TRAIN ETA
   GET /api/trains/eta/:number
===================================================== */

export const getTrainETA = async (
  req,
  res
) => {
  const { number } = req.params;

  /* -----------------------------------------------
     VALIDATION
  ------------------------------------------------ */

  if (!/^\d{5}$/.test(number)) {
    return res.status(400).json({
      success: false,
      message:
        "Train number must contain exactly 5 digits.",
    });
  }

  try {
    /* -----------------------------------------------
       FETCH LIVE DATA
    ------------------------------------------------ */

    const live =
      await fetchLiveTrainData(
        number
      );

    /* -----------------------------------------------
       SAVE HISTORY
    ------------------------------------------------ */

    const historyResult =
      await saveTrainHistory(
        live
      );

    /* -----------------------------------------------
       ROUTE
    ------------------------------------------------ */

    const route =
      Array.isArray(live?.route)
        ? live.route
        : [];

    /* -----------------------------------------------
       CURRENT LOCATION
    ------------------------------------------------ */

    const currentLocation =
      live?.currentLocation ||
      {};

    /* -----------------------------------------------
       CURRENT SEQUENCE
    ------------------------------------------------ */

    const currentSequence =
      Number(
        currentLocation?.sequence ??
          live?.currentSequence ??
          0
      ) || 0;

    /* -----------------------------------------------
       SEGMENT PROGRESS
    ------------------------------------------------ */

    const segmentProgress =
      Number(
        currentLocation?.segmentProgress ??
          live?.segmentProgress ??
          0
      ) || 0;

    /* -----------------------------------------------
       DELAY
    ------------------------------------------------ */

    const delayMinutes =
      Number(
        live?.delayMinutes ??
          live?.delay ??
          0
      ) || 0;

    /* -----------------------------------------------
       CALCULATE ETA
    ------------------------------------------------ */

    const eta =
      calculateETA({
        route,
        currentLocation,
        currentSequence,
        segmentProgress,
        delayMinutes,
      });

    /* -----------------------------------------------
       SPEED
    ------------------------------------------------ */

    const historySpeed =
      historyResult?.currentSpeedKmh ??
      null;

    const apiSpeed =
      Number(
        currentLocation?.speedKmh ??
          currentLocation?.speedKmph ??
          live?.currentSpeedKmh ??
          live?.currentSpeed ??
          0
      ) || 0;

    const currentSpeedKmh =
      historySpeed !== null
        ? historySpeed
        : apiSpeed;

    /* -----------------------------------------------
       AVERAGE SPEED
    ------------------------------------------------ */

    const averageSpeed =
      Number(
        live?.avgSpeed ??
          live?.averageSpeed ??
          0
      ) || 0;

    /* -----------------------------------------------
       MAX SPEED
    ------------------------------------------------ */

    const maxSpeed =
      Number(
        live?.maxSpeed ??
          live?.maxSpeedKmh ??
          0
      ) || 0;

    /* -----------------------------------------------
       REMAINING DISTANCE
    ------------------------------------------------ */

    const apiRemainingDistance =
      Number(
        live?.remainingDistanceKm ??
          live?.distanceRemainingKm ??
          0
      ) || 0;

    const etaRemainingDistance =
      Number(
        eta?.remainingDistanceKm ??
          0
      ) || 0;

    const remainingDistanceKm =
      apiRemainingDistance > 0
        ? apiRemainingDistance
        : etaRemainingDistance;

    /* -----------------------------------------------
       CURRENT / NEXT STATION
    ------------------------------------------------ */

    const currentStation =
      currentLocation?.stationName ||
      currentLocation?.name ||
      live?.previousHalt?.stationName ||
      "Current Location";

    const nextStation =
      live?.nextHalt?.stationName ||
      live?.nextHalt?.name ||
      live?.nextStation?.name ||
      "Next Station";

    /* -----------------------------------------------
       TRAIN OBJECT
    ------------------------------------------------ */

    const trainInfo = {
      number:
        live?.trainNumber ||
        live?.number ||
        number,

      name:
        live?.trainName ||
        live?.name ||
        "Train",

      currentStation,

      nextStation,

      status:
        live?.status ||
        live?.runningStatus ||
        "Running",

      currentSpeed:
        currentSpeedKmh,

      currentSpeedKmh:
        currentSpeedKmh,

      averageSpeed,

      maxSpeed,

      currentDelay:
        Number(
          eta?.delayMinutes ??
            delayMinutes
        ) || 0,

      delayMinutes:
        Number(
          eta?.delayMinutes ??
            delayMinutes
        ) || 0,

      remainingDistanceKm,
    };

    /* -----------------------------------------------
       PREDICTION OBJECT
    ------------------------------------------------ */

    const prediction = {
      ...eta,

      currentSpeedKmh:
        currentSpeedKmh,

      currentSpeed:
        currentSpeedKmh,

      delayMinutes:
        Number(
          eta?.delayMinutes ??
            delayMinutes
        ) || 0,

      remainingDistanceKm,
    };

    /* -----------------------------------------------
       FINAL RESPONSE
    ------------------------------------------------ */

    return res.json({
      success: true,

      train: trainInfo,

      prediction,

      meta: {
        speedSource:
          historyResult?.speedSource ||
          (
            currentSpeedKmh > 0
              ? "calculated"
              : "unavailable"
          ),

        currentSequence,

        segmentProgress,
      },
    });

  } catch (error) {
    console.error(
      "[BACKEND] ETA calculation error:",
      error.message
    );

    return res.status(
      error.statusCode || 500
    ).json({
      success: false,
      message:
        error.message ||
        "Unable to calculate train ETA.",
    });
  }
};