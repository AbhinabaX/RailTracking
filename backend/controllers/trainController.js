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
   LIVE TRAIN CACHE
===================================================== */

const LIVE_CACHE_TTL_MS =
  5 * 60 * 1000;

const LIVE_STALE_MAX_MS =
  15 * 60 * 1000;

const RATE_LIMIT_COOLDOWN_MS =
  2 * 60 * 1000;

const liveTrainCache =
  new Map();

const liveTrainRequests =
  new Map();

let railRadarRateLimitedUntil =
  0;


/* =====================================================
   FETCH LIVE TRAIN DATA
===================================================== */

const fetchLiveTrainData = async (
  trainNumber
) => {
  const cacheKey =
    String(trainNumber);

  const now =
    Date.now();

  const cached =
    liveTrainCache.get(
      cacheKey
    );


  /* ===================================================
     FRESH CACHE
  =================================================== */

  if (
    cached &&
    now - cached.timestamp <
      LIVE_CACHE_TTL_MS
  ) {
    return cached.data;
  }


  /* ===================================================
     RATE LIMIT COOLDOWN
  =================================================== */

  if (
    now <
    railRadarRateLimitedUntil
  ) {

    if (
      cached &&
      now - cached.timestamp <
        LIVE_STALE_MAX_MS
    ) {

      console.warn(
        `[BACKEND] RailRadar cooldown active for ${trainNumber}; using cached data.`
      );

      return cached.data;
    }


    const retrySeconds =
      Math.ceil(
        (
          railRadarRateLimitedUntil -
          now
        ) / 1000
      );


    const error =
      new Error(
        `Live service is temporarily rate-limited. Retrying in ${retrySeconds} seconds.`
      );


    error.statusCode =
      503;

    error.retryAfter =
      retrySeconds;

    throw error;
  }


  /* ===================================================
     SHARE EXISTING REQUEST
  =================================================== */

  if (
    liveTrainRequests.has(
      cacheKey
    )
  ) {

    return liveTrainRequests.get(
      cacheKey
    );
  }


  /* ===================================================
     NEW REQUEST
  =================================================== */

  const requestPromise =
    (async () => {

      const apiKey =
        process.env.RAILRADAR_API_KEY?.trim();


      if (!apiKey) {

        const error =
          new Error(
            "RAILRADAR_API_KEY is missing from .env"
          );

        error.statusCode =
          500;

        throw error;
      }


      const url =
        `https://api.railradar.in/v1/trains/${trainNumber}/live` +
        `?haltsOnly=true` +
        `&includeCoordinates=true` +
        `&geometry=true` +
        `&format=coordinates`;


      const response =
        await fetch(
          url,
          {
            method: "GET",

            headers: {
              Authorization:
                `Bearer ${apiKey}`,

              Accept:
                "application/json",
            },
          }
        );


      let payload =
        null;


      try {

        payload =
          await response.json();

      } catch {

        payload =
          null;
      }


      /* =================================================
         RATE LIMIT
      ================================================= */

      if (
        response.status === 429
      ) {

        let retrySeconds =
          Number(
            response.headers.get(
              "retry-after"
            )
          );


        if (
          !Number.isFinite(
            retrySeconds
          ) ||
          retrySeconds <= 0
        ) {
          retrySeconds =
            120;
        }


        railRadarRateLimitedUntil =
          Date.now() +
          retrySeconds * 1000;


        console.warn(
          `[BACKEND] RailRadar rate limited. Cooldown: ${retrySeconds}s`
        );


        if (
          cached &&
          Date.now() -
            cached.timestamp <
              LIVE_STALE_MAX_MS
        ) {

          console.warn(
            `[BACKEND] Using stale cached data for ${trainNumber}.`
          );

          return cached.data;
        }


        const error =
          new Error(
            `Live service is temporarily rate-limited. Please retry in ${retrySeconds} seconds.`
          );


        error.statusCode =
          503;

        error.retryAfter =
          retrySeconds;

        throw error;
      }


      /* =================================================
         OTHER API ERROR
      ================================================= */

      if (
        !response.ok
      ) {

        if (
          cached &&
          Date.now() -
            cached.timestamp <
              LIVE_STALE_MAX_MS
        ) {

          console.warn(
            `[BACKEND] RailRadar returned ${response.status}; using stale cached data.`
          );

          return cached.data;
        }


        const error =
          new Error(
            payload?.error?.message ||
            payload?.message ||
            "Unable to fetch live train data."
          );


        error.statusCode =
          response.status;

        throw error;
      }


      /* =================================================
         LIVE DATA
      ================================================= */

      const live =
        payload?.data ??
        payload;


      if (!live) {

        const error =
          new Error(
            "Live train data unavailable."
          );

        error.statusCode =
          502;

        throw error;
      }


      /* =================================================
         SAVE CACHE
      ================================================= */

      liveTrainCache.set(
        cacheKey,
        {
          data:
            live,

          timestamp:
            Date.now(),
        }
      );


      railRadarRateLimitedUntil =
        0;


      console.log(
        `[BACKEND] Live train data refreshed: ${trainNumber}`
      );


      return live;

    })();


  liveTrainRequests.set(
    cacheKey,
    requestPromise
  );


  try {

    return await requestPromise;

  } finally {

    liveTrainRequests.delete(
      cacheKey
    );
  }
};


/* =====================================================
   GET LIVE TRAIN
   GET /api/trains/live/:number
===================================================== */

export const getLiveTrain =
  async (
    req,
    res
  ) => {

    const {
      number
    } = req.params;


    if (
      !/^\d{5}$/.test(number)
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Train number must contain exactly 5 digits.",
      });
    }


    try {

      const live =
        await fetchLiveTrainData(
          number
        );


      const historyResult =
        await saveTrainHistory(
          live
        );


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


      return res.json({

        success:
          true,

        data:
          enrichedLive,

      });

    } catch (error) {

      console.error(
        "[BACKEND] Live train error:",
        error.message
      );


      const response = {

        success:
          false,

        message:
          error.message ||
          "Unable to fetch live train data.",

      };


      if (
        error.retryAfter
      ) {

        response.retryAfter =
          error.retryAfter;
      }


      return res.status(
        error.statusCode ||
        500
      ).json(response);
    }
  };


/* =====================================================
   GET TRAIN ETA
   GET /api/trains/eta/:number
===================================================== */

export const getTrainETA =
  async (
    req,
    res
  ) => {

    const {
      number
    } = req.params;


    if (
      !/^\d{5}$/.test(number)
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Train number must contain exactly 5 digits.",
      });
    }


    try {

      const live =
        await fetchLiveTrainData(
          number
        );


      const historyResult =
        await saveTrainHistory(
          live
        );


      const route =
        Array.isArray(
          live?.route
        )
          ? live.route
          : [];


      const currentLocation =
        live?.currentLocation ||
        {};


      const currentSequence =
        Number(
          currentLocation?.sequence ??
          live?.currentSequence ??
          0
        ) || 0;


      const segmentProgress =
        Number(
          currentLocation?.segmentProgress ??
          live?.segmentProgress ??
          0
        ) || 0;


      const delayMinutes =
        Number(
          live?.delayMinutes ??
          live?.delay ??
          0
        ) || 0;


      const eta =
        calculateETA({

          route,

          currentLocation,

          currentSequence,

          segmentProgress,

          delayMinutes,

        });


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


      const averageSpeed =
        Number(
          live?.avgSpeed ??
          live?.averageSpeed ??
          0
        ) || 0;


      const maxSpeed =
        Number(
          live?.maxSpeed ??
          live?.maxSpeedKmh ??
          0
        ) || 0;


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


      return res.json({

        success:
          true,

        train:
          trainInfo,

        prediction:
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


      const response = {

        success:
          false,

        message:
          error.message ||
          "Unable to calculate train ETA.",

      };


      if (
        error.retryAfter
      ) {

        response.retryAfter =
          error.retryAfter;
      }


      return res.status(
        error.statusCode ||
        500
      ).json(response);
    }
  };