import trains from "../data/trains.js";

import {
  calculateETA,
} from "../services/etaService.js";

import saveTrainHistory from "../services/trainHistoryService.js";


/* =====================================================
   GET ALL TRAINS
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
   GET /api/trains/search?q=12301
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
   GET TRAIN BY NUMBER
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
   LOCAL / ALWAYS-ON TRAIN SIMULATION

   IMPORTANT:
   This implementation does NOT call RailRadar.

   Therefore:
   - RailRadar quota does not increase
   - No 429 rate-limit problem
   - No external live API dependency
   - Website can keep working

   NOTE:
   This is simulated/demo movement, not real railway GPS.
===================================================== */


/* =====================================================
   SIMULATED LIVE TRAIN DATA
===================================================== */

const buildSimulatedLiveTrainData = (
  trainNumber
) => {

  const baseTrain =
    trains.find(
      (item) =>
        String(item.number) ===
        String(trainNumber)
    );


  const train =
    baseTrain || {
      number:
        trainNumber,

      name:
        `Train ${trainNumber}`,

      from:
        "Source",

      to:
        "Destination",

      current:
        "Current Location",

      next:
        "Next Station",

      speed:
        70,

      delay:
        0,

      arrival:
        "--",

      status:
        "Running",
    };


  const now =
    Date.now();


  const numericSeed =
    Number(
      String(trainNumber)
        .replace(/\D/g, "")
        .slice(-5)
    ) || 12345;


  /* ---------------------------------------------------
     SPEED
  --------------------------------------------------- */

  const baseSpeed =
    Number(
      String(train.speed ?? 70)
        .replace(/[^0-9.-]/g, "")
    ) || 70;


  const speedWave =
    Math.sin(
      now / 60000 +
      numericSeed
    );


  const currentSpeedKmh =
    Math.max(
      20,
      Math.min(
        120,
        Math.round(
          baseSpeed +
          speedWave * 8
        )
      )
    );


  /* ---------------------------------------------------
     DELAY
  --------------------------------------------------- */

  const baseDelay =
    Number(
      String(train.delay ?? 0)
        .replace(/[^0-9.-]/g, "")
    ) || 0;


  const delayWave =
    Math.sin(
      now / 180000 +
      numericSeed / 2
    );


  const delayMinutes =
    Math.max(
      0,
      Math.round(
        baseDelay +
        delayWave * 2
      )
    );


  /* ---------------------------------------------------
     ROUTE PROGRESS
  --------------------------------------------------- */

  const progressWave =
    (
      now / 1000 / 60 / 5 +
      numericSeed % 20
    ) % 100;


  const routeProgress =
    Math.round(
      progressWave
    );


  /* ---------------------------------------------------
     DISTANCE
  --------------------------------------------------- */

  const totalDistanceKm =
    120 +
    (numericSeed % 500);


  const remainingDistanceKm =
    Math.max(
      1,
      Math.round(
        totalDistanceKm *
        (
          1 -
          routeProgress / 100
        )
      )
    );


  /* ---------------------------------------------------
     STATIONS
  --------------------------------------------------- */

  const currentStation =
    train.current ||
    "Current Location";


  const nextStation =
    train.next ||
    "Next Station";


  /* ---------------------------------------------------
     ETA
  --------------------------------------------------- */

  const usableSpeed =
    Math.max(
      currentSpeedKmh,
      20
    );


  const travelHours =
    remainingDistanceKm /
    usableSpeed;


  const arrivalDate =
    new Date(
      now +
      travelHours *
      60 *
      60 *
      1000 +
      delayMinutes *
      60 *
      1000
    );


  const expectedArrival =
    arrivalDate.toISOString();


  /* ---------------------------------------------------
     DEMO GPS

     This is simulated and must not be presented
     as real railway GPS.
  --------------------------------------------------- */

  const latitude =
    22 +
    Math.sin(
      numericSeed / 10
    ) * 5;


  const longitude =
    78 +
    Math.cos(
      numericSeed / 10
    ) * 5;


  /* ---------------------------------------------------
     ROUTE
  --------------------------------------------------- */

  const route = [

    {
      stationName:
        train.from ||
        "Source",

      scheduledArrival:
        null,

      expectedArrival:
        null,
    },

    {
      stationName:
        currentStation,

      scheduledArrival:
        null,

      expectedArrival:
        null,
    },

    {
      stationName:
        nextStation,

      scheduledArrival:
        expectedArrival,

      expectedArrival,
    },

    {
      stationName:
        train.to ||
        "Destination",

      scheduledArrival:
        expectedArrival,

      expectedArrival,
    },

  ];


  /* ---------------------------------------------------
     FINAL OBJECT
  --------------------------------------------------- */

  return {

    trainNumber:
      String(train.number),

    trainName:
      train.name ||
      "Train",


    source: {
      name:
        train.from ||
        "Source",
    },


    destination: {

      name:
        train.to ||
        "Destination",

      expectedArrival,

    },


    currentLocation: {

      stationName:
        currentStation,

      name:
        currentStation,

      lat:
        latitude,

      lng:
        longitude,

      latitude,

      longitude,

      speedKmh:
        currentSpeedKmh,

      speedKmph:
        currentSpeedKmh,

      sequence:
        2,

      segmentProgress:
        routeProgress / 100,

    },


    previousHalt: {

      stationName:
        currentStation,

    },


    nextHalt: {

      stationName:
        nextStation,

      expectedArrival,

      estimatedArrival:
        expectedArrival,

      distanceRemainingKm:
        remainingDistanceKm,

    },


    nextStation: {

      name:
        nextStation,

      expectedArrival,

      estimatedArrival:
        expectedArrival,

      distanceRemainingKm:
        remainingDistanceKm,

    },


    status:
      "Running",

    runningStatus:
      "Running",


    /* IMPORTANT */

    isLive:
      false,

    simulated:
      true,

    simulation:
      true,

    dataSource:
      "local-simulation",


    /* SPEED */

    currentSpeedKmh,

    currentSpeed:
      currentSpeedKmh,

    avgSpeed:
      Math.round(
        currentSpeedKmh *
        0.85
      ),

    averageSpeed:
      Math.round(
        currentSpeedKmh *
        0.85
      ),

    maxSpeed:
      130,


    /* DELAY */

    delayMinutes,

    delay:
      delayMinutes,


    /* DISTANCE */

    remainingDistanceKm,

    distanceRemainingKm:
      remainingDistanceKm,


    /* ROUTE */

    route,

    routeProgress,


    /* GPS */

    latitude,

    longitude,


    /* UPDATE TIME */

    updatedAt:
      new Date(
        now
      ).toISOString(),

  };
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
      number,
    } = req.params;


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

      const live =
        buildSimulatedLiveTrainData(
          number
        );


      /* Save history */

      const historyResult =
        await saveTrainHistory(
          live
        );


      const currentSpeedKmh =
        historyResult?.currentSpeedKmh ??
        live.currentSpeedKmh ??
        null;


      const speedSource =
        historyResult?.speedSource ||
        "simulated";


      const enrichedLocation = {

        ...(live.currentLocation || {}),

        calculatedSpeedKmh:
          currentSpeedKmh,

        speedKmh:
          currentSpeedKmh,

        speedKmph:
          currentSpeedKmh,

      };


      const enrichedLive = {

        ...live,

        currentSpeedKmh,

        currentSpeed:
          currentSpeedKmh,

        calculatedCurrentSpeedKmh:
          currentSpeedKmh,

        speedSource,

        currentLocation:
          enrichedLocation,

        simulated:
          true,

        simulation:
          true,

        dataSource:
          "local-simulation",

      };


      return res.json({

        success:
          true,

        data:
          enrichedLive,

      });

    } catch (error) {

      console.error(
        "[BACKEND] Simulated live train error:",
        error.message
      );


      return res.status(500).json({

        success:
          false,

        message:
          error.message ||
          "Unable to create train data.",

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
      number,
    } = req.params;


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

      /* Generate simulated live data */

      const live =
        buildSimulatedLiveTrainData(
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
          0
        ) || 0;


      const segmentProgress =
        Number(
          currentLocation?.segmentProgress ??
          0
        ) || 0;


      const delayMinutes =
        Number(
          live?.delayMinutes ??
          0
        ) || 0;


      /* Existing ETA service */

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


      const currentSpeedKmh =
        historySpeed ??
        live.currentSpeedKmh ??
        0;


      const averageSpeed =
        Number(
          live?.averageSpeed ??
          live?.avgSpeed ??
          0
        ) || 0;


      const maxSpeed =
        Number(
          live?.maxSpeed ??
          130
        ) || 130;


      const remainingDistanceKm =
        Number(
          eta?.remainingDistanceKm ??
          live?.remainingDistanceKm ??
          0
        ) || 0;


      const currentStation =
        currentLocation?.stationName ||
        currentLocation?.name ||
        "Current Location";


      const nextStation =
        live?.nextHalt?.stationName ||
        live?.nextStation?.name ||
        "Next Station";


      const trainInfo = {

        number:
          live.trainNumber,

        name:
          live.trainName,

        currentStation,

        nextStation,

        status:
          "Running",

        currentSpeed:
          currentSpeedKmh,

        currentSpeedKmh:
          currentSpeedKmh,

        averageSpeed,

        maxSpeed,

        currentDelay:
          delayMinutes,

        delayMinutes,

        remainingDistanceKm,

      };


      const prediction = {

        ...eta,

        currentSpeed:
          currentSpeedKmh,

        currentSpeedKmh:
          currentSpeedKmh,

        delayMinutes,

        remainingDistanceKm,

        simulated:
          true,

      };


      return res.json({

        success:
          true,

        train:
          trainInfo,

        prediction,

        meta: {

          speedSource:
            "simulated",

          currentSequence,

          segmentProgress,

          simulated:
            true,

          dataSource:
            "local-simulation",

        },

      });

    } catch (error) {

      console.error(
        "[BACKEND] ETA error:",
        error.message
      );


      return res.status(500).json({

        success:
          false,

        message:
          error.message ||
          "Unable to calculate ETA.",

      });
    }
  };