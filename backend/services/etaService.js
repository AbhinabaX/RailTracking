const EARTH_RADIUS_KM = 6371;

/* =========================================
   Distance between two GPS coordinates
========================================= */

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

  const dLat = toRad(
    Number(lat2) - Number(lat1)
  );

  const dLon = toRad(
    Number(lon2) - Number(lon1)
  );

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(Number(lat1))) *
      Math.cos(toRad(Number(lat2))) *
      Math.sin(dLon / 2) ** 2;

  const c =
    2 *
    Math.atan2(
      Math.sqrt(a),
      Math.sqrt(1 - a)
    );

  return EARTH_RADIUS_KM * c;
};


/* =========================================
   Calculate total remaining distance
========================================= */

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

  const validRoute = route.filter(
    (station) =>
      Number.isFinite(Number(station?.lat)) &&
      Number.isFinite(Number(station?.lng))
  );

  if (validRoute.length < 2) {
    return 0;
  }

  const sequence =
    Number(currentSequence) || 1;

  let currentIndex =
    validRoute.findIndex(
      (station) =>
        Number(station.sequence) === sequence
    );

  if (currentIndex < 0) {
    currentIndex = Math.max(
      0,
      Math.min(
        validRoute.length - 2,
        sequence - 1
      )
    );
  }

  const currentLat =
    Number(currentLocation?.lat);

  const currentLng =
    Number(currentLocation?.lng);

  let distance = 0;

  /*
    Distance from current GPS position
    to next station.
  */

  if (
    Number.isFinite(currentLat) &&
    Number.isFinite(currentLng) &&
    validRoute[currentIndex + 1]
  ) {
    distance += getDistanceKm(
      currentLat,
      currentLng,
      validRoute[currentIndex + 1].lat,
      validRoute[currentIndex + 1].lng
    );
  } else {
    /*
      Fallback using segment progress.
    */

    const progress =
      Math.max(
        0,
        Math.min(
          1,
          Number(segmentProgress) || 0
        )
      );

    if (
      validRoute[currentIndex] &&
      validRoute[currentIndex + 1]
    ) {
      const segmentDistance =
        getDistanceKm(
          validRoute[currentIndex].lat,
          validRoute[currentIndex].lng,
          validRoute[currentIndex + 1].lat,
          validRoute[currentIndex + 1].lng
        );

      distance +=
        segmentDistance *
        (1 - progress);
    }
  }

  /*
    Remaining full segments.
  */

  for (
    let i = currentIndex + 1;
    i < validRoute.length - 1;
    i++
  ) {
    distance += getDistanceKm(
      validRoute[i].lat,
      validRoute[i].lng,
      validRoute[i + 1].lat,
      validRoute[i + 1].lng
    );
  }

  return Number(distance.toFixed(1));
};


/* =========================================
   ETA calculation
========================================= */

export const calculateETA = ({
  route,
  currentLocation,
  currentSequence,
  segmentProgress,
  delayMinutes = 0,
}) => {
  const currentSpeed =
    Number(
      currentLocation?.speedKmh ??
        currentLocation?.speedKmph
    ) || 0;

  const safeSpeed =
    Math.max(currentSpeed, 45);

  const remainingDistance =
    calculateRemainingDistance({
      route,
      currentLocation,
      currentSequence,
      segmentProgress,
    });

  /*
    Base travel time.
  */

  const baseMinutes =
    remainingDistance > 0
      ? (remainingDistance / safeSpeed) * 60
      : 0;

  /*
    Add a small operational buffer.
    This prevents optimistic ETA.
  */

  const operationalBuffer =
    Math.min(
      45,
      Math.max(
        8,
        remainingDistance * 0.025
      )
    );

  /*
    Existing delay is included,
    but capped so one old delay doesn't
    completely dominate the estimate.
  */

  const effectiveDelay =
    Math.max(
      0,
      Math.min(
        Number(delayMinutes) || 0,
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


  /*
    Confidence estimate.

    This is a heuristic confidence score,
    not a trained ML probability.
  */

  let confidence = 85;

  if (currentSpeed <= 20) {
    confidence -= 15;
  } else if (currentSpeed <= 40) {
    confidence -= 8;
  }

  if (effectiveDelay >= 30) {
    confidence -= 10;
  } else if (effectiveDelay >= 15) {
    confidence -= 5;
  }

  if (remainingDistance > 1000) {
    confidence -= 8;
  } else if (remainingDistance > 500) {
    confidence -= 4;
  }

  confidence = Math.max(
    55,
    Math.min(95, confidence)
  );


  const etaDate =
    new Date(
      Date.now() +
        estimatedMinutes * 60 * 1000
    );


  return {
    remainingDistanceKm:
      remainingDistance,

    currentSpeedKmh:
      currentSpeed,

    baseTravelMinutes:
      Math.round(baseMinutes),

    delayMinutes:
      effectiveDelay,

    operationalBufferMinutes:
      Math.round(operationalBuffer),

    estimatedMinutes,

    confidence,

    estimatedArrivalISO:
      etaDate.toISOString(),
  };
};