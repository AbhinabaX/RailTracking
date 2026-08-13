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

/*
   Frontend can request every 5 seconds.

   But we DO NOT call RailRadar every 5 seconds.

   External API:
   → Maximum one request per train every 60 seconds.

   Frontend:
   → Can still request every 5 seconds.

   This prevents API rate limiting.
*/

const LIVE_CACHE_TTL_MS =
  60 * 1000;

const LIVE_STALE_MAX_MS =
  5 * 60 * 1000;


/*
   Stores latest successful live data.
*/

const liveTrainCache =
  new Map();


/*
   Stores currently running API requests.

   This prevents multiple components from calling
   RailRadar simultaneously for the same train.
*/

const liveTrainRequests =
  new Map();


/* =====================================================
   FETCH LIVE TRAIN DATA FROM RAILRADAR
===================================================== */

const fetchLiveTrainData = async (
  trainNumber
) => {

  const cacheKey =
    String(trainNumber);

  const now =
    Date.now();

  const cached =
    liveTrainCache.get(cacheKey);


  /* ===================================================
     1. RETURN FRESH CACHE
  =================================================== */

  if (
    cached &&
    now - cached.timestamp <
      LIVE_CACHE_TTL_MS
  ) {

    return cached.data;
  }


  /* ===================================================
     2. SHARE EXISTING REQUEST
  =================================================== */

  /*
     If another request is already fetching
     the same train, wait for that request.

     This prevents:

     ETA → API
     Radar → API
     Frontend → API

     all at the same time.
  */

  if (
    liveTrainRequests.has(cacheKey)
  ) {

    return liveTrainRequests.get(
      cacheKey
    );
  }


  /* ===================================================
     3. CREATE NEW EXTERNAL API REQUEST
  =================================================== */

  const requestPromise =
    (async () => {

      const apiKey =
        process.env.RAILRADAR_API_KEY?.trim();


      /* -----------------------------------------------
         API KEY CHECK
      ------------------------------------------------ */

      if (!apiKey) {

        const error =
          new Error(
            "RAILRADAR_API_KEY is missing from .env"
          );

        error.statusCode =
          500;

        throw error;
      }


      /* -----------------------------------------------
         RAILRADAR URL
      ------------------------------------------------ */

      const url =
        `https://api.railradar.in/v1/trains/${trainNumber}/live` +
        `?haltsOnly=true` +
        `&includeCoordinates=true` +
        `&geometry=true` +
        `&format=coordinates`;


      /* -----------------------------------------------
         API REQUEST
      ------------------------------------------------ */

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


      /* -----------------------------------------------
         READ RESPONSE
      ------------------------------------------------ */

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
         4. RATE LIMIT HANDLING
      ================================================= */

      if (
        response.status === 429
      ) {

        /*
           If old live data exists,
           continue using it.

           This prevents the website
           from breaking.
        */

        if (
          cached &&
          now - cached.timestamp <
            LIVE_STALE_MAX_MS
        ) {

          console.warn(
            `[BACKEND] RailRadar rate limited ${trainNumber}; using cached live data.`
          );

          return cached.data;
        }


        /*
           No cached data available.
        */

        const error =
          new Error(
            "Live train API rate limit reached. Please wait and try again later."
          );

        error.statusCode =
          429;

        throw error;
      }


      /* =================================================
         5. OTHER API ERRORS
      ================================================= */

      if (
        !response.ok
      ) {

        /*
           If old data exists,
           use it instead of breaking UI.
        */

        if (
          cached &&
          now - cached.timestamp <
            LIVE_STALE_MAX_MS
        ) {

          console.warn(
            `[BACKEND] RailRadar error ${response.status} for ${trainNumber}; using cached live data.`
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
         6. GET ACTUAL LIVE DATA
      ================================================= */

      /*
         RailRadar may return:

         {
           data: {...}
         }

         OR

         {
           ...
         }
      */

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
         7. SAVE SUCCESSFUL RESPONSE TO CACHE
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


      console.log(
        `[BACKEND] Live train data refreshed: ${trainNumber}`
      );


      return live;

    })();


  /* ===================================================
     8. STORE CURRENT REQUEST
  =================================================== */

  liveTrainRequests.set(
    cacheKey,
    requestPromise
  );


  /* ===================================================
     9. CLEANUP REQUEST
  =================================================== */

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


    /* -----------------------------------------------
       VALIDATION
    ------------------------------------------------ */

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

      /* ---------------------------------------------
         FETCH LIVE DATA
      --------------------------------------------- */

      const live =
        await fetchLiveTrainData(
          number
        );


      /* ---------------------------------------------
         SAVE HISTORY
      --------------------------------------------- */

      const historyResult =
        await saveTrainHistory(
          live
        );


      /* ---------------------------------------------
         SPEED
      --------------------------------------------- */

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


      /* ---------------------------------------------
         GPS
      --------------------------------------------- */

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


      /* ---------------------------------------------
         ENRICH LOCATION
      --------------------------------------------- */

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


      /* ---------------------------------------------
         ENRICH LIVE OBJECT
      --------------------------------------------- */

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


      /* ---------------------------------------------
         RESPONSE
      --------------------------------------------- */

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


      return res.status(
        error.statusCode ||
        500
      ).json({

        success:
          false,

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

export const getTrainETA =
  async (
    req,
    res
  ) => {

    const {
      number
    } = req.params;


    /* -----------------------------------------------
       VALIDATION
    ------------------------------------------------ */

    if (
      !/^\d{5}$/.test(number)
    ) {

      return res.status(400).json({

        success:
          false,

        message:
          "Train number must contain exactly 5 digits.",

      });
    }


    try {

      /* ---------------------------------------------
         FETCH LIVE DATA

         This uses the SAME cache.

         So ETA and Live Radar do not
         create separate RailRadar calls.
      --------------------------------------------- */

      const live =
        await fetchLiveTrainData(
          number
        );


      /* ---------------------------------------------
         SAVE HISTORY
      --------------------------------------------- */

      const historyResult =
        await saveTrainHistory(
          live
        );


      /* ---------------------------------------------
         ROUTE
      --------------------------------------------- */

      const route =
        Array.isArray(
          live?.route
        )
          ? live.route
          : [];


      /* ---------------------------------------------
         CURRENT LOCATION
      --------------------------------------------- */

      const currentLocation =
        live?.currentLocation ||
        {};


      /* ---------------------------------------------
         CURRENT SEQUENCE
      --------------------------------------------- */

      const currentSequence =
        Number(
          currentLocation?.sequence ??
          live?.currentSequence ??
          0
        ) || 0;


      /* ---------------------------------------------
         SEGMENT PROGRESS
      --------------------------------------------- */

      const segmentProgress =
        Number(
          currentLocation?.segmentProgress ??
          live?.segmentProgress ??
          0
        ) || 0;


      /* ---------------------------------------------
         DELAY
      --------------------------------------------- */

      const delayMinutes =
        Number(
          live?.delayMinutes ??
          live?.delay ??
          0
        ) || 0;


      /* ---------------------------------------------
         CALCULATE ETA
      --------------------------------------------- */

      const eta =
        calculateETA({

          route,

          currentLocation,

          currentSequence,

          segmentProgress,

          delayMinutes,

        });


      /* ---------------------------------------------
         SPEED
      --------------------------------------------- */

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


      /* ---------------------------------------------
         AVERAGE SPEED
      --------------------------------------------- */

      const averageSpeed =
        Number(
          live?.avgSpeed ??
          live?.averageSpeed ??
          0
        ) || 0;


      /* ---------------------------------------------
         MAX SPEED
      --------------------------------------------- */

      const maxSpeed =
        Number(
          live?.maxSpeed ??
          live?.maxSpeedKmh ??
          0
        ) || 0;


      /* ---------------------------------------------
         REMAINING DISTANCE
      --------------------------------------------- */

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


      /* ---------------------------------------------
         CURRENT STATION
      --------------------------------------------- */

      const currentStation =
        currentLocation?.stationName ||
        currentLocation?.name ||
        live?.previousHalt?.stationName ||
        "Current Location";


      /* ---------------------------------------------
         NEXT STATION
      --------------------------------------------- */

      const nextStation =
        live?.nextHalt?.stationName ||
        live?.nextHalt?.name ||
        live?.nextStation?.name ||
        "Next Station";


      /* ---------------------------------------------
         TRAIN OBJECT
      --------------------------------------------- */

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


      /* ---------------------------------------------
         PREDICTION OBJECT
      --------------------------------------------- */

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


      /* ---------------------------------------------
         FINAL RESPONSE
      --------------------------------------------- */

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


      return res.status(
        error.statusCode ||
        500
      ).json({

        success:
          false,

        message:
          error.message ||
          "Unable to calculate train ETA.",

      });
    }
  };