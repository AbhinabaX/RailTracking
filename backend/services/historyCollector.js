import saveTrainHistory from "./trainHistoryService.js";

const API_BASE =
  "https://api.railradar.in/v1/trains";

const DEFAULT_INTERVAL = 2 * 60 * 1000;


/* =========================
   WATCHED TRAINS
========================= */

const getWatchedTrains = () => {
  const raw =
    process.env.WATCHED_TRAINS ||
    "12919";

  return raw
    .split(",")
    .map((item) => item.trim())
    .filter((item) =>
      /^\d{5}$/.test(item)
    )
    .slice(0, 5);
};


/* =========================
   INTERVAL
========================= */

const getInterval = () => {
  const value = Number(
    process.env.HISTORY_INTERVAL_MS
  );

  if (
    Number.isFinite(value) &&
    value >= 60000
  ) {
    return value;
  }

  return DEFAULT_INTERVAL;
};


/* =========================
   COLLECT ONE TRAIN
========================= */

const collectTrain = async (trainNumber) => {
  const apiKey =
    process.env.RAILRADAR_API_KEY?.trim();

  if (!apiKey) {
    console.error(
      "History collector: RAILRADAR_API_KEY is missing."
    );

    return;
  }

  try {
    const url =
      `${API_BASE}/${trainNumber}/live` +
      `?haltsOnly=true` +
      `&includeCoordinates=true` +
      `&geometry=true` +
      `&format=coordinates`;

    const response = await fetch(url, {
      method: "GET",

      headers: {
        Authorization:
          `Bearer ${apiKey}`,

        Accept: "application/json",
      },
    });

    let payload = null;

    try {
      payload = await response.json();
    } catch {
      payload = null;
    }


    /* Rate limit */

    if (response.status === 429) {
      console.log(
        `History collector: rate limit reached for ${trainNumber}.`
      );

      return;
    }


    /* Other errors */

    if (!response.ok) {
      console.log(
        `History collector failed for ${trainNumber}:`,
        payload?.error?.message ||
          payload?.message ||
          response.status
      );

      return;
    }


    /* Actual live data */

    const live =
      payload?.data ??
      payload;


    /* Save to MongoDB */

    const saved =
      await saveTrainHistory(live);

    if (saved) {
      console.log(
        `History collected: ${trainNumber}`
      );
    }

  } catch (error) {
    console.error(
      `History collector error for ${trainNumber}:`,
      error.message
    );
  }
};


/* =========================
   COLLECT ALL TRAINS
========================= */

const collectAllTrains = async () => {
  const trains =
    getWatchedTrains();

  if (!trains.length) {
    console.log(
      "History collector: no trains configured."
    );

    return;
  }

  console.log(
    `Collecting history for: ${trains.join(", ")}`
  );

  for (const trainNumber of trains) {
    await collectTrain(trainNumber);

    /* Small delay between API requests */
    await new Promise((resolve) =>
      setTimeout(resolve, 3000)
    );
  }
};


/* =========================
   START COLLECTOR
========================= */

const startHistoryCollector = () => {
  const interval =
    getInterval();

  console.log(
    `History collector started. Interval: ${
      interval / 1000
    } seconds`
  );

  /* First collection */
  collectAllTrains();

  /* Repeated collection */
  const timer = setInterval(
    collectAllTrains,
    interval
  );

  return timer;
};

export default startHistoryCollector;