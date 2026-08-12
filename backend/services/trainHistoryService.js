import TrainHistory from "../models/TrainHistory.js";


/* =====================================================
   CONFIG
===================================================== */

const MAX_HISTORY_PER_TRAIN = 200;


/* =====================================================
   SAFE NUMBER
===================================================== */

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};


/* =====================================================
   HAVERSINE DISTANCE
   Returns KM
===================================================== */

const calculateDistanceKm = (
  lat1,
  lon1,
  lat2,
  lon2
) => {
  const a = toNumber(lat1);
  const b = toNumber(lon1);
  const c = toNumber(lat2);
  const d = toNumber(lon2);

  if (
    a === null ||
    b === null ||
    c === null ||
    d === null
  ) {
    return null;
  }

  const R = 6371;

  const toRadians = (value) =>
    (value * Math.PI) / 180;

  const dLat =
    toRadians(c - a);

  const dLon =
    toRadians(d - b);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      toRadians(a)
    ) *
      Math.cos(
        toRadians(c)
      ) *
      Math.sin(dLon / 2) ** 2;

  const y =
    2 *
    Math.atan2(
      Math.sqrt(x),
      Math.sqrt(1 - x)
    );

  return R * y;
};


/* =====================================================
   GET COORDINATES
===================================================== */

const getCoordinates = (object) => {
  if (!object) {
    return {
      lat: null,
      lng: null,
    };
  }

  const lat = toNumber(
    object?.lat ??
      object?.latitude ??
      object?.location?.lat ??
      object?.location?.latitude ??
      object?.coordinates?.lat ??
      object?.coordinates?.latitude ??
      object?.geo?.lat ??
      object?.geo?.latitude
  );

  const lng = toNumber(
    object?.lng ??
      object?.longitude ??
      object?.lon ??
      object?.location?.lng ??
      object?.location?.longitude ??
      object?.coordinates?.lng ??
      object?.coordinates?.longitude ??
      object?.geo?.lng ??
      object?.geo?.longitude
  );

  return {
    lat,
    lng,
  };
};


/* =====================================================
   NORMALIZE ROUTE
===================================================== */

const normalizeRoute = (route) => {
  if (!Array.isArray(route)) {
    return [];
  }

  return route
    .map((station, index) => {
      const {
        lat,
        lng,
      } = getCoordinates(station);

      return {
        ...station,

        sequence:
          Number(
            station?.sequence
          ) || index + 1,

        stationName:
          station?.stationName ||
          station?.name ||
          station?.station?.name ||
          `Station ${index + 1}`,

        stationCode:
          station?.stationCode ||
          station?.code ||
          station?.station?.code ||
          "",

        lat,
        lng,
      };
    })
    .sort(
      (a, b) =>
        a.sequence -
        b.sequence
    );
};


/* =====================================================
   FIND STATION BY SEQUENCE
===================================================== */

const findStationBySequence = (
  route,
  sequence
) => {
  const seq = Number(sequence);

  if (!Number.isFinite(seq)) {
    return null;
  }

  return (
    route.find(
      (station) =>
        Number(
          station.sequence
        ) === seq
    ) || null
  );
};


/* =====================================================
   FIND NEXT VALID STATION
===================================================== */

const findNextStation = (
  route,
  currentSequence
) => {
  return (
    route.find(
      (station) =>
        Number(
          station.sequence
        ) >
          Number(
            currentSequence
          ) &&
        station.lat !== null &&
        station.lng !== null
    ) || null
  );
};


/* =====================================================
   INTERPOLATE TRAIN POSITION
===================================================== */

const interpolatePosition = (
  start,
  end,
  progress
) => {
  if (
    !start ||
    !end ||
    start.lat === null ||
    start.lng === null ||
    end.lat === null ||
    end.lng === null
  ) {
    return null;
  }

  const p =
    Math.max(
      0,
      Math.min(
        1,
        Number(progress) || 0
      )
    );

  return {
    lat:
      start.lat +
      (
        end.lat -
        start.lat
      ) *
        p,

    lng:
      start.lng +
      (
        end.lng -
        start.lng
      ) *
        p,
  };
};


/* =====================================================
   GET BEST TRAIN POSITION
===================================================== */

const getTrainPosition = (live) => {
  const currentLocation =
    live?.currentLocation ||
    {};

  /* -----------------------------------------------
     1. DIRECT GPS
  ------------------------------------------------ */

  const direct =
    getCoordinates(
      currentLocation
    );

  if (
    direct.lat !== null &&
    direct.lng !== null
  ) {
    return direct;
  }


  /* -----------------------------------------------
     2. ROUTE + SEGMENT PROGRESS
  ------------------------------------------------ */

  const route =
    normalizeRoute(
      live?.route
    );

  if (route.length < 2) {
    return {
      lat: null,
      lng: null,
    };
  }

  const currentSequence =
    Number(
      currentLocation?.sequence ??
        live?.currentSequence ??
        0
    ) || 0;

  const nextSequence =
    Number(
      live?.nextHalt?.sequence ??
        live?.nextStation?.sequence ??
        live?.nextSequence ??
        0
    ) || 0;

  const progress =
    Number(
      currentLocation?.segmentProgress ??
        live?.segmentProgress ??
        0
    ) || 0;

  let start =
    findStationBySequence(
      route,
      currentSequence
    );

  let end =
    findStationBySequence(
      route,
      nextSequence
    );

  if (!end && start) {
    end =
      findNextStation(
        route,
        start.sequence
      );
  }

  if (!start) {
    const valid =
      route.filter(
        (station) =>
          station.lat !== null &&
          station.lng !== null
      );

    if (valid.length >= 2) {
      start = valid[0];
      end = valid[1];
    }
  }

  return (
    interpolatePosition(
      start,
      end,
      progress
    ) || {
      lat: null,
      lng: null,
    }
  );
};


/* =====================================================
   GET RECORDED TIME
===================================================== */

const getRecordedTime = (live) => {
  const candidates = [
    live?.lastUpdated,
    live?.updatedAt,
    live?.timestamp,
    live?.currentLocation?.lastUpdated,
    live?.currentLocation?.timestamp,
  ];

  for (
    const value of candidates
  ) {
    if (!value) {
      continue;
    }

    const date =
      new Date(value);

    if (
      !Number.isNaN(
        date.getTime()
      )
    ) {
      return date;
    }
  }

  return new Date();
};


/* =====================================================
   GET DIRECT API SPEED
===================================================== */

const getApiSpeed = (live) => {
  const currentLocation =
    live?.currentLocation ||
    {};

  const values = [
    currentLocation?.speedKmh,
    currentLocation?.speedKmph,
    currentLocation?.speed,
    live?.currentSpeedKmh,
    live?.currentSpeed,
    live?.speedKmh,
  ];

  for (
    const value of values
  ) {
    const speed =
      toNumber(value);

    if (
      speed !== null &&
      speed >= 0 &&
      speed <= 220
    ) {
      return speed;
    }
  }

  return null;
};


/* =====================================================
   CALCULATE SPEED FROM HISTORY
===================================================== */

const calculateSpeedFromHistory =
  async ({
    trainNumber,
    latitude,
    longitude,
    recordedAt,
  }) => {

    if (
      latitude === null ||
      longitude === null
    ) {
      return null;
    }

    const previousRecords =
      await TrainHistory
        .find({
          trainNumber:
            String(
              trainNumber
            ),

          latitude: {
            $ne: null,
          },

          longitude: {
            $ne: null,
          },

          recordedAt: {
            $ne: null,
          },
        })
        .sort({
          recordedAt: -1,
        })
        .limit(20)
        .lean();

    if (
      previousRecords.length === 0
    ) {
      return null;
    }

    for (
      const previous
      of previousRecords
    ) {

      const oldLat =
        toNumber(
          previous.latitude
        );

      const oldLng =
        toNumber(
          previous.longitude
        );

      const oldTime =
        new Date(
          previous.recordedAt
        );

      if (
        oldLat === null ||
        oldLng === null ||
        Number.isNaN(
          oldTime.getTime()
        )
      ) {
        continue;
      }

      const elapsedSeconds =
        (
          recordedAt.getTime() -
          oldTime.getTime()
        ) / 1000;

      if (
        elapsedSeconds < 30
      ) {
        continue;
      }

      if (
        elapsedSeconds >
        45 * 60
      ) {
        continue;
      }

      const distance =
        calculateDistanceKm(
          oldLat,
          oldLng,
          latitude,
          longitude
        );

      if (
        distance === null
      ) {
        continue;
      }

      /* Stationary */
      if (
        distance <= 0.03
      ) {
        return 0;
      }

      const hours =
        elapsedSeconds /
        3600;

      const speed =
        distance /
        hours;

      if (
        speed >= 0 &&
        speed <= 220
      ) {
        return Number(
          speed.toFixed(1)
        );
      }
    }

    return null;
  };


/* =====================================================
   ESTIMATE SPEED FROM ROUTE SCHEDULE
===================================================== */

const estimateSegmentSpeed =
  (live) => {

    const route =
      normalizeRoute(
        live?.route
      );

    if (
      route.length < 2
    ) {
      return null;
    }

    const currentLocation =
      live?.currentLocation ||
      {};

    const currentSequence =
      Number(
        currentLocation?.sequence ??
          live?.currentSequence ??
          0
      ) || 0;

    const nextSequence =
      Number(
        live?.nextHalt?.sequence ??
          live?.nextSequence ??
          0
      ) || 0;

    const start =
      findStationBySequence(
        route,
        currentSequence
      );

    const end =
      findStationBySequence(
        route,
        nextSequence
      ) ||
      (
        start
          ? findNextStation(
              route,
              start.sequence
            )
          : null
      );

    if (
      !start ||
      !end
    ) {
      return null;
    }

    if (
      start.lat === null ||
      start.lng === null ||
      end.lat === null ||
      end.lng === null
    ) {
      return null;
    }

    const distance =
      calculateDistanceKm(
        start.lat,
        start.lng,
        end.lat,
        end.lng
      );

    if (
      distance === null ||
      distance <= 0
    ) {
      return null;
    }

    const startTime =
      start?.actualDeparture ||
      start?.expectedDeparture ||
      start?.scheduledDeparture ||
      start?.departure ||
      null;

    const endTime =
      end?.actualArrival ||
      end?.expectedArrival ||
      end?.scheduledArrival ||
      end?.arrival ||
      null;

    if (
      !startTime ||
      !endTime
    ) {
      return null;
    }

    const startDate =
      new Date(
        startTime
      );

    const endDate =
      new Date(
        endTime
      );

    if (
      Number.isNaN(
        startDate.getTime()
      ) ||
      Number.isNaN(
        endDate.getTime()
      )
    ) {
      return null;
    }

    let elapsedHours =
      (
        endDate.getTime() -
        startDate.getTime()
      ) / 3600000;

    if (
      elapsedHours < 0
    ) {
      elapsedHours += 24;
    }

    if (
      elapsedHours <= 0
    ) {
      return null;
    }

    const speed =
      distance /
      elapsedHours;

    if (
      speed <= 0 ||
      speed > 220
    ) {
      return null;
    }

    return Number(
      speed.toFixed(1)
    );
  };


/* =====================================================
   KEEP ONLY LAST 200 RECORDS PER TRAIN

   This runs AFTER a new record is inserted.
===================================================== */

const cleanupOldHistory = async (
  trainNumber
) => {

  const records =
    await TrainHistory
      .find({
        trainNumber:
          String(
            trainNumber
          ),
      })
      .sort({
        recordedAt: -1,
        _id: -1,
      })
      .select({
        _id: 1,
      })
      .skip(
        MAX_HISTORY_PER_TRAIN
      )
      .lean();


  if (
    records.length === 0
  ) {
    return 0;
  }


  const ids =
    records.map(
      (record) =>
        record._id
    );


  const result =
    await TrainHistory.deleteMany({
      _id: {
        $in: ids,
      },
    });


  return (
    result.deletedCount ||
    0
  );
};


/* =====================================================
   SAVE TRAIN HISTORY
===================================================== */

const saveTrainHistory =
  async (live) => {

    try {

      const train =
        live?.data ??
        live ??
        {};


      const trainNumber =
        train?.trainNumber ||
        train?.number ||
        "";


      if (!trainNumber) {

        return {
          saved: null,
          currentSpeedKmh:
            null,
          speedSource:
            "unavailable",
          latitude:
            null,
          longitude:
            null,
        };

      }


      const currentLocation =
        train?.currentLocation ||
        {};


      /* -----------------------------------------------
         Position
      ------------------------------------------------ */

      const position =
        getTrainPosition(
          train
        );


      const latitude =
        toNumber(
          position?.lat
        );


      const longitude =
        toNumber(
          position?.lng
        );


      /* -----------------------------------------------
         Time
      ------------------------------------------------ */

      const recordedAt =
        getRecordedTime(
          train
        );


      /* -----------------------------------------------
         SPEED PRIORITY
      ------------------------------------------------ */

      let currentSpeedKmh =
        null;

      let speedSource =
        "unavailable";


      /* ===============================================
         1. API SPEED
      ================================================ */

      const apiSpeed =
        getApiSpeed(
          train
        );


      if (
        apiSpeed !== null
      ) {

        currentSpeedKmh =
          Number(
            apiSpeed.toFixed(1)
          );

        speedSource =
          "api";

      }


      /* ===============================================
         2. HISTORY SPEED
      ================================================ */

      if (
        currentSpeedKmh ===
        null
      ) {

        const historySpeed =
          await calculateSpeedFromHistory({
            trainNumber,
            latitude,
            longitude,
            recordedAt,
          });


        if (
          historySpeed !== null
        ) {

          currentSpeedKmh =
            historySpeed;

          speedSource =
            "history";

        }

      }


      /* ===============================================
         3. ROUTE/SCHEDULE ESTIMATE
      ================================================ */

      if (
        currentSpeedKmh ===
        null
      ) {

        const estimatedSpeed =
          estimateSegmentSpeed(
            train
          );


        if (
          estimatedSpeed !== null
        ) {

          currentSpeedKmh =
            estimatedSpeed;

          speedSource =
            "estimated";

        }

      }


      /* ===============================================
         OTHER DATA
      ================================================ */

      const delayMinutes =
        Number(
          train?.delayMinutes ??
            train?.delay ??
            0
        ) || 0;


      const segmentProgress =
        Number(
          currentLocation?.segmentProgress ??
            train?.segmentProgress ??
            0
        ) || 0;


      const currentSequence =
        Number(
          currentLocation?.sequence ??
            train?.currentSequence ??
            0
        ) || 0;


      const remainingDistanceKm =
        toNumber(
          train?.remainingDistanceKm ??
            train?.distanceRemainingKm ??
            train?.nextHalt?.distanceRemainingKm ??
            train?.nextStation?.distanceRemainingKm
        );


      /* ===============================================
         SAVE RECORD
      ================================================ */

      const record = {

        trainNumber:
          String(
            trainNumber
          ),

        trainName:
          train?.trainName ||
          train?.name ||
          "",

        currentStation:
          currentLocation?.stationName ||
          currentLocation?.name ||
          train?.previousHalt?.stationName ||
          "",

        nextStation:
          train?.nextHalt?.stationName ||
          train?.nextHalt?.name ||
          train?.nextStation?.name ||
          "",

        latitude,

        longitude,

        currentSpeedKmh,

        speedKmh:
          currentSpeedKmh,

        delayMinutes,

        remainingDistanceKm,

        segmentProgress,

        currentSequence,

        status:
          train?.status ||
          train?.runningStatus ||
          "unknown",

        isLive:
          train?.isLive !== false,

        recordedAt,

      };


      const saved =
        await TrainHistory.create(
          record
        );


      /* ===============================================
         CLEAN OLD RECORDS

         Keep only LAST 200
      ================================================ */

      let deletedCount =
        0;


      try {

        deletedCount =
          await cleanupOldHistory(
            trainNumber
          );

      } catch (cleanupError) {

        console.error(
          "[BACKEND] History cleanup error:",
          cleanupError.message
        );

      }


      /* ===============================================
         LOG
      ================================================ */

      console.log(
        `[BACKEND] Train history saved: ${trainNumber} | ` +
        `speed: ${
          currentSpeedKmh !== null
            ? `${currentSpeedKmh} km/h`
            : "unavailable"
        } | ` +
        `position: ${
          latitude !== null &&
          longitude !== null
            ? `${latitude.toFixed(
                5
              )}, ${longitude.toFixed(
                5
              )}`
            : "unavailable"
        } | ` +
        `source: ${speedSource} | ` +
        `deleted old: ${deletedCount}`
      );


      return {

        saved,

        currentSpeedKmh,

        speedSource,

        latitude,

        longitude,

        deletedCount,

      };


    } catch (error) {

      console.error(
        "[BACKEND] Train history save error:",
        error.message
      );


      return {

        saved: null,

        currentSpeedKmh:
          null,

        speedSource:
          "error",

        latitude:
          null,

        longitude:
          null,

        deletedCount:
          0,

      };

    }
  };


export default saveTrainHistory;