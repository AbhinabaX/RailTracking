import {
  useEffect,
  useState,
} from "react";

import "./App.css";


/* =====================================================
   COMPONENTS
===================================================== */

import TrainDetails from "./components/TrainDetails";
import LiveRadar from "./components/LiveRadar";
import RouteTimeline from "./components/RouteTimeline";
import ETAPrediction from "./components/ETAPrediction";
import AboutRailRadar from "./components/AboutRailRadar";
import AdminDashboard from "./components/AdminDashboard";


/* =====================================================
   ANALYTICS
===================================================== */

import {
  trackEvent,
} from "./services/analytics";


/* =====================================================
   PRODUCTION BACKEND URL
===================================================== */

/*
  Local development:
    if VITE_API_URL is not set,
    localhost backend will be used.

  Vercel:
    Set VITE_API_URL in Vercel Environment Variables.

  Example:
    https://railtracking-api.onrender.com/api/trains
*/

const API_URL =
  import.meta.env.VITE_API_URL ||
  "http://localhost:5000/api/trains";


/* =====================================================
   SAFE NUMBER
===================================================== */

const getNumber = (value) => {
  const number =
    Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};


/* =====================================================
   DELAY FORMATTER
===================================================== */

const formatDelay = (minutes) => {
  const total =
    Math.max(
      0,
      Math.round(
        Number(minutes) || 0
      )
    );

  if (total < 60) {
    return `${total} min`;
  }

  const hours =
    Math.floor(
      total / 60
    );

  const mins =
    total % 60;

  if (mins === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${mins} min`;
};


/* =====================================================
   FORMAT ETA
===================================================== */

const formatEtaTime = (value) => {
  if (!value) {
    return "--";
  }

  if (
    typeof value === "string" &&
    /AM|PM/i.test(value)
  ) {
    return value;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return String(value);
  }

  return date.toLocaleTimeString(
    [],
    {
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};


/* =====================================================
   PARSE ETA
===================================================== */

const parseEtaValue = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return null;
  }

  if (
    value instanceof Date
  ) {
    return value;
  }

  if (
    typeof value === "number"
  ) {
    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const text =
    String(value).trim();

  if (!text) {
    return null;
  }

  const timeMatch =
    text.match(
      /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?$/i
    );

  if (timeMatch) {
    let hours =
      Number(
        timeMatch[1]
      );

    const minutes =
      Number(
        timeMatch[2]
      );

    const seconds =
      Number(
        timeMatch[3] || 0
      );

    const meridiem =
      timeMatch[4]?.toUpperCase();

    if (
      meridiem === "PM" &&
      hours < 12
    ) {
      hours += 12;
    }

    if (
      meridiem === "AM" &&
      hours === 12
    ) {
      hours = 0;
    }

    const now =
      new Date();

    const date =
      new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hours,
        minutes,
        seconds
      );

    if (
      date.getTime() <
      Date.now() -
        30 *
          60 *
          1000
    ) {
      date.setDate(
        date.getDate() + 1
      );
    }

    return date;
  }

  const date =
    new Date(text);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }

  return date;
};


/* =====================================================
   FALLBACK ETA
===================================================== */

const calculateFallbackETA = (live) => {
  const remainingDistance =
    getNumber(
      live?.remainingDistanceKm ??
        live?.distanceRemainingKm ??
        live?.nextHalt?.distanceRemainingKm ??
        live?.nextStation?.distanceRemainingKm ??
        live?.prediction?.remainingDistanceKm
    );

  const currentSpeed =
    getNumber(
      live?.calculatedCurrentSpeedKmh ??
        live?.currentSpeedKmh ??
        live?.currentLocation?.speedKmh ??
        live?.currentLocation?.speedKmph ??
        live?.currentSpeed
    );

  const averageSpeed =
    getNumber(
      live?.avgSpeed ??
        live?.averageSpeed
    );

  const usableSpeed =
    currentSpeed !== null &&
    currentSpeed > 5
      ? currentSpeed
      : averageSpeed !== null &&
        averageSpeed > 5
      ? averageSpeed
      : null;

  if (
    remainingDistance === null ||
    remainingDistance <= 0 ||
    usableSpeed === null
  ) {
    return "--";
  }

  const hours =
    remainingDistance /
    usableSpeed;

  const milliseconds =
    hours *
    60 *
    60 *
    1000;

  const etaDate =
    new Date(
      Date.now() +
        milliseconds
    );

  return formatEtaTime(
    etaDate
  );
};


/* =====================================================
   BEST ETA
===================================================== */

const getBestETA = (live) => {
  const values = [
    live?.nextHalt?.expectedArrival,
    live?.nextHalt?.expectedArrivalTime,
    live?.nextHalt?.estimatedArrival,
    live?.nextHalt?.estimatedArrivalTime,
    live?.nextHalt?.eta,

    live?.nextStation?.expectedArrival,
    live?.nextStation?.expectedArrivalTime,
    live?.nextStation?.estimatedArrival,
    live?.nextStation?.estimatedArrivalTime,
    live?.nextStation?.eta,

    live?.expectedArrival,
    live?.expectedArrivalTime,
    live?.estimatedArrival,
    live?.estimatedArrivalTime,
    live?.eta,

    live?.prediction?.estimatedArrival,
    live?.prediction?.estimatedArrivalTime,
    live?.prediction?.destinationETA,
    live?.prediction?.destinationEta,
    live?.prediction?.eta,
  ];

  for (
    const value of values
  ) {
    if (
      value === null ||
      value === undefined ||
      String(value).trim() === ""
    ) {
      continue;
    }

    const parsed =
      parseEtaValue(value);

    if (parsed) {
      return formatEtaTime(
        parsed
      );
    }

    if (
      typeof value === "string"
    ) {
      return value;
    }
  }

  return calculateFallbackETA(
    live
  );
};


/* =====================================================
   STATION COORDINATES
===================================================== */

const getStationCoordinates = (
  station
) => {
  if (!station) {
    return {
      lat: null,
      lng: null,
    };
  }

  const lat =
    station?.lat ??
    station?.latitude ??
    station?.location?.lat ??
    station?.location?.latitude ??
    station?.coordinates?.lat ??
    station?.coordinates?.latitude ??
    station?.geo?.lat ??
    station?.geo?.latitude ??
    null;

  const lng =
    station?.lng ??
    station?.longitude ??
    station?.lon ??
    station?.location?.lng ??
    station?.location?.longitude ??
    station?.coordinates?.lng ??
    station?.coordinates?.longitude ??
    station?.geo?.lng ??
    station?.geo?.longitude ??
    null;

  return {
    lat:
      getNumber(lat),

    lng:
      getNumber(lng),
  };
};


/* =====================================================
   DISTANCE
===================================================== */

const calculateDistanceKm = (
  lat1,
  lng1,
  lat2,
  lng2
) => {
  const a =
    getNumber(lat1);

  const b =
    getNumber(lng1);

  const c =
    getNumber(lat2);

  const d =
    getNumber(lng2);

  if (
    a === null ||
    b === null ||
    c === null ||
    d === null
  ) {
    return null;
  }

  const R =
    6371;

  const toRadians =
    (value) =>
      (value * Math.PI) /
      180;

  const dLat =
    toRadians(c - a);

  const dLng =
    toRadians(d - b);

  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(
      toRadians(a)
    ) *
      Math.cos(
        toRadians(c)
      ) *
      Math.sin(dLng / 2) ** 2;

  const y =
    2 *
    Math.atan2(
      Math.sqrt(x),
      Math.sqrt(1 - x)
    );

  return R * y;
};


/* =====================================================
   NORMALIZE ROUTE
===================================================== */

const normalizeRoute = (
  rawRoute
) => {
  if (
    !Array.isArray(
      rawRoute
    )
  ) {
    return [];
  }

  return rawRoute
    .map(
      (
        station,
        index
      ) => ({
        ...station,

        sequence:
          Number(
            station?.sequence
          ) ||
          index + 1,

        name:
          station?.stationName ||
          station?.name ||
          station?.station?.name ||
          `Station ${
            index + 1
          }`,

        code:
          station?.stationCode ||
          station?.code ||
          station?.station?.code ||
          "",

        arrival:
          station?.actualArrival ||
          station?.expectedArrival ||
          station?.scheduledArrival ||
          station?.arrival ||
          "--",

        departure:
          station?.actualDeparture ||
          station?.expectedDeparture ||
          station?.scheduledDeparture ||
          station?.departure ||
          "--",
      })
    )
    .sort(
      (a, b) =>
        a.sequence -
        b.sequence
    );
};


/* =====================================================
   FIND NEAREST STATION
===================================================== */

const findNearestStation = (
  route,
  latitude,
  longitude
) => {
  const trainLat =
    getNumber(
      latitude
    );

  const trainLng =
    getNumber(
      longitude
    );

  if (
    trainLat === null ||
    trainLng === null ||
    !Array.isArray(route)
  ) {
    return null;
  }

  let nearest =
    null;

  let nearestDistance =
    Infinity;

  for (
    const station
    of route
  ) {
    const {
      lat,
      lng,
    } =
      getStationCoordinates(
        station
      );

    if (
      lat === null ||
      lng === null
    ) {
      continue;
    }

    const distance =
      calculateDistanceKm(
        trainLat,
        trainLng,
        lat,
        lng
      );

    if (
      distance !== null &&
      distance <
        nearestDistance
    ) {
      nearest =
        station;

      nearestDistance =
        distance;
    }
  }

  return nearest;
};


/* =====================================================
   NORMALIZE LIVE TRAIN
===================================================== */

const normalizeLiveTrain = (
  live,
  fallbackNumber
) => {
  const route =
    normalizeRoute(
      live?.route
    );

  const currentLocation =
    live?.currentLocation ||
    live?.location ||
    {};

  const latitude =
    getNumber(
      currentLocation?.lat ??
        currentLocation?.latitude ??
        live?.latitude
    );

  const longitude =
    getNumber(
      currentLocation?.lng ??
        currentLocation?.longitude ??
        currentLocation?.lon ??
        live?.longitude
    );

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

  const nearestStation =
    findNearestStation(
      route,
      latitude,
      longitude
    );

  const sequenceStation =
    route.find(
      (station) =>
        station.sequence ===
        currentSequence
    ) ||
    null;

  const currentStation =
    nearestStation?.name ||
    sequenceStation?.name ||
    currentLocation?.stationName ||
    currentLocation?.name ||
    live?.previousHalt?.stationName ||
    "Current Location";

  const nextStation =
    live?.nextHalt?.stationName ||
    live?.nextHalt?.name ||
    live?.nextStation?.name ||
    route.find(
      (station) =>
        station.sequence ===
        nextSequence
    )?.name ||
    route.find(
      (station) =>
        station.sequence >
        currentSequence
    )?.name ||
    "Next Station";

  const firstRoute =
    route[0] ||
    null;

  const lastRoute =
    route[
      route.length - 1
    ] ||
    null;

  const from =
    live?.source?.name ||
    live?.sourceName ||
    live?.origin?.name ||
    live?.originName ||
    firstRoute?.name ||
    "Source";

  const to =
    live?.destination?.name ||
    live?.destinationName ||
    lastRoute?.name ||
    "Destination";

  const currentSpeed =
    getNumber(
      live?.calculatedCurrentSpeedKmh ??
        live?.currentSpeedKmh ??
        currentLocation?.calculatedSpeedKmh ??
        currentLocation?.speedKmh ??
        currentLocation?.speedKmph ??
        live?.currentSpeed
    );

  const avgSpeed =
    getNumber(
      live?.avgSpeed ??
        live?.averageSpeed ??
        live?.train?.avgSpeed
    );

  const maxSpeed =
    getNumber(
      live?.maxSpeed ??
        live?.maxSpeedKmh ??
        live?.train?.maxSpeed
    );

  const delay =
    Number(
      live?.delayMinutes ??
        live?.delay ??
        live?.currentDelay ??
        0
    ) || 0;

  const arrival =
    getBestETA(
      live
    );

  const rawSegmentProgress =
    getNumber(
      currentLocation?.segmentProgress ??
        live?.segmentProgress
    );

  const segmentProgress =
    rawSegmentProgress !== null &&
    rawSegmentProgress >= 0 &&
    rawSegmentProgress <= 1
      ? rawSegmentProgress
      : null;

  const remainingDistanceKm =
    getNumber(
      live?.remainingDistanceKm ??
        live?.distanceRemainingKm ??
        live?.nextHalt?.distanceRemainingKm ??
        live?.nextStation?.distanceRemainingKm
    );

  const status =
    live?.status ||
    live?.runningStatus ||
    live?.currentStatus ||
    "Running";

  return {
    number:
      live?.trainNumber ||
      live?.number ||
      fallbackNumber,

    name:
      live?.trainName ||
      live?.name ||
      live?.train?.name ||
      "Train",

    from,

    to,

    current:
      currentStation,

    next:
      nextStation,

    currentSpeed,

    speed:
      currentSpeed,

    avgSpeed,

    maxSpeed,

    delay,

    delayText:
      `+${formatDelay(
        delay
      )}`,

    arrival,

    remainingDistanceKm,

    status,

    route,

    latitude,

    longitude,

    segmentProgress,

    currentSequence,

    nextSequence,

    isLive:
      live?.isLive !== false,

    speedSource:
      live?.speedSource ||
      (
        currentSpeed !== null
          ? "calculated"
          : "unavailable"
      ),
  };
};


/* =====================================================
   APP
===================================================== */

function App() {

  /* ===================================================
     ADMIN
  =================================================== */

  if (
    window.location.pathname ===
    "/admin"
  ) {
    return (
      <AdminDashboard />
    );
  }


  /* ===================================================
     STATE
  =================================================== */

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedTrain,
    setSelectedTrain,
  ] = useState(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState("");


  /* ===================================================
     ACTIVE TRAIN
  =================================================== */

  const activeTrainNumber =
    selectedTrain &&
    selectedTrain !==
      "not-found"
      ? selectedTrain.number
      : null;


  /* ===================================================
     VISIT ANALYTICS
  =================================================== */

  useEffect(() => {

    trackEvent({
      eventType:
        "visit",

      page:
        window.location.pathname,
    });

  }, []);


  /* ===================================================
     FETCH ETA
  =================================================== */

  const fetchTrainETA =
    async (
      trainNumber
    ) => {

      try {

        const response =
          await fetch(
            `${API_URL}/eta/${trainNumber}`
          );

        let data =
          null;

        try {

          data =
            await response.json();

        } catch {

          data =
            null;

        }

        if (
          !response.ok ||
          !data?.success
        ) {
          return null;
        }

        const prediction =
          data?.prediction ||
          {};

        const train =
          data?.train ||
          {};

        return {
          arrival:
            prediction?.estimatedArrival ||
            prediction?.estimatedArrivalTime ||
            prediction?.destinationETA ||
            prediction?.eta ||
            prediction?.arrivalTime ||
            train?.estimatedArrival ||
            train?.arrival ||
            "--",

          currentSpeed:
            getNumber(
              prediction?.currentSpeedKmh ??
                train?.currentSpeedKmh ??
                train?.currentSpeed
            ),

          delay:
            Number(
              prediction?.delayMinutes ??
                train?.currentDelay ??
                train?.delayMinutes ??
                0
            ) || 0,
        };

      } catch (error) {

        console.error(
          "ETA fetch error:",
          error
        );

        return null;
      }
    };


  /* ===================================================
     FETCH LIVE TRAIN
  =================================================== */

  const fetchLiveTrain =
    async (
      trainNumber,
      showLoading = true
    ) => {

      if (showLoading) {
        setLoading(true);
      }

      try {

        const response =
          await fetch(
            `${API_URL}/live/${trainNumber}`
          );

        let data =
          null;

        try {

          data =
            await response.json();

        } catch {

          data =
            null;

        }

        if (!response.ok) {

          throw new Error(
            data?.message ||
              data?.error?.message ||
              "Unable to fetch live train data."
          );
        }

        if (
          !data?.success ||
          !data?.data
        ) {

          throw new Error(
            "Live train data was not returned."
          );
        }

        const normalized =
          normalizeLiveTrain(
            data.data,
            trainNumber
          );

        const etaData =
          await fetchTrainETA(
            trainNumber
          );

        const finalTrain = {
          ...normalized,

          arrival:
            etaData?.arrival ||
            normalized.arrival ||
            "--",

          currentSpeed:
            etaData?.currentSpeed ??
            normalized.currentSpeed,

          delay:
            etaData?.delay ??
            normalized.delay,
        };

        setSelectedTrain(
          finalTrain
        );

        setError("");

        return finalTrain;

      } catch (err) {

        console.error(
          "Live train fetch error:",
          err
        );

        if (showLoading) {

          setSelectedTrain(
            null
          );

          setError(
            err.message ||
              "Unable to connect to train service."
          );
        }

        return null;

      } finally {

        if (showLoading) {
          setLoading(false);
        }
      }
    };


  /* ===================================================
     SEARCH TRAIN
  =================================================== */

  const searchTrain =
    async (
      query
    ) => {

      const cleanQuery =
        query.trim();

      if (!cleanQuery) {

        setSelectedTrain(
          null
        );

        setError("");

        return;
      }


      /* -----------------------------------------------
         ANALYTICS
      ------------------------------------------------ */

      trackEvent({
        eventType:
          "search",

        trainNumber:
          cleanQuery,

        page:
          "/",
      });


      /* -----------------------------------------------
         FIVE DIGIT TRAIN
      ------------------------------------------------ */

      if (
        /^\d{5}$/.test(
          cleanQuery
        )
      ) {

        const result =
          await fetchLiveTrain(
            cleanQuery,
            true
          );

        if (!result) {

          setSelectedTrain(
            "not-found"
          );

          return;
        }

        setTimeout(
          () => {

            document
              .getElementById(
                "search-result"
              )
              ?.scrollIntoView({
                behavior:
                  "smooth",

                block:
                  "start",
              });

          },
          100
        );

        return;
      }


      /* -----------------------------------------------
         NAME / ROUTE SEARCH
      ------------------------------------------------ */

      try {

        setLoading(true);

        setError("");

        setSelectedTrain(
          null
        );

        const response =
          await fetch(
            `${API_URL}/search?q=${encodeURIComponent(
              cleanQuery
            )}`
          );

        const data =
          await response.json();

        if (!response.ok) {

          throw new Error(
            data?.message ||
              "Search failed."
          );
        }

        if (
          !data?.success ||
          !data?.trains?.length
        ) {

          setSelectedTrain(
            "not-found"
          );

          return;
        }

        const train =
          data.trains[0];

        setSelectedTrain({

          ...train,

          number:
            train?.number ||
            cleanQuery,

          current:
            train?.current ||
            train?.currentStation ||
            "Current Location",

          next:
            train?.next ||
            train?.nextStation ||
            "Next Station",

          delay:
            Number(
              train?.delay ??
                train?.delayMinutes ??
                0
            ) || 0,

          currentSpeed:
            getNumber(
              train?.currentSpeed ??
                train?.speed
            ),

          speed:
            getNumber(
              train?.speed
            ),

          avgSpeed:
            getNumber(
              train?.avgSpeed
            ),

          maxSpeed:
            getNumber(
              train?.maxSpeed
            ),

          arrival:
            train?.arrival ||
            "--",
        });

        setTimeout(
          () => {

            document
              .getElementById(
                "search-result"
              )
              ?.scrollIntoView({
                behavior:
                  "smooth",

                block:
                  "start",
              });

          },
          100
        );

      } catch (err) {

        console.error(
          "Search error:",
          err
        );

        setSelectedTrain(
          null
        );

        setError(
          err.message ||
            "Unable to connect to train service."
        );

      } finally {

        setLoading(false);

      }
    };


  /* ===================================================
     AUTO REFRESH
===================================================== */

  useEffect(() => {

    if (
      !activeTrainNumber
    ) {
      return;
    }

    const refreshId =
      window.setInterval(
        () => {

          fetchLiveTrain(
            activeTrainNumber,
            false
          );

        },
        120000
      );

    return () =>
      window.clearInterval(
        refreshId
      );

  }, [
    activeTrainNumber,
  ]);


  /* ===================================================
     RADAR ANALYTICS
===================================================== */

  useEffect(() => {

    if (
      !activeTrainNumber
    ) {
      return;
    }

    trackEvent({

      eventType:
        "radar_view",

      trainNumber:
        activeTrainNumber,

      page:
        "/radar",

    });

  }, [
    activeTrainNumber,
  ]);


  /* ===================================================
     ETA ANALYTICS
===================================================== */

  useEffect(() => {

    if (
      !activeTrainNumber
    ) {
      return;
    }

    trackEvent({

      eventType:
        "eta_view",

      trainNumber:
        activeTrainNumber,

      page:
        "/eta",

    });

  }, [
    activeTrainNumber,
  ]);


  /* ===================================================
     HANDLERS
===================================================== */

  const handleSearch =
    async () => {

      await searchTrain(
        search
      );

    };


  const handlePopularSearch =
    async (
      trainNumber
    ) => {

      setSearch(
        trainNumber
      );

      await searchTrain(
        trainNumber
      );

    };


  const closeTrainDetails =
    () => {

      setSelectedTrain(
        null
      );

    };


  /* ===================================================
     RENDER
===================================================== */

  return (
    <div className="app">

      {/* =================================================
         NAVBAR
      ================================================= */}

      <header className="navbar">

        <a
          href="#home"
          className="brand"
        >

          <div className="brand-icon">
            🚆
          </div>

          <div>

            <h2>
              RailTracking
            </h2>

            <span>
              SMART RAILWAY PLATFORM
            </span>

          </div>

        </a>


        <nav className="nav-links">

          <a href="#home">
            Home
          </a>

          <a href="#status">
            Train Status
          </a>

          <a href="#radar">
            Live Radar
          </a>

          <a href="#route">
            Route
          </a>

          <a href="#eta">
            AI ETA
          </a>

          <a href="#about">
            About
          </a>

        </nav>


        <button
          className="nav-button"

          onClick={() =>
            document
              .getElementById(
                "home"
              )
              ?.scrollIntoView({
                behavior:
                  "smooth",
              })
          }
        >
          Get Started
        </button>

      </header>


      <main>

        {/* =================================================
           HERO
        ================================================= */}

        <section
          className="hero"
          id="home"
        >

          <div className="hero-left">

            <div className="hero-tag">

              <span className="live-dot"></span>

              SMART TRAIN INTELLIGENCE

            </div>


            <h1>

              Know where your

              <span>
                {" "}train is.
              </span>

              <br />

              Know when you'll arrive.

            </h1>


            <p className="hero-description">

              RailTracking combines live train
              tracking, route intelligence
              and predictive ETA technology
              to help you travel smarter.

            </p>


            <div className="search-card">

              <div className="search-input-wrapper">

                <span className="search-icon">
                  ⌕
                </span>

                <input
                  type="text"

                  value={
                    search
                  }

                  onChange={(
                    event
                  ) =>
                    setSearch(
                      event.target.value
                    )
                  }

                  onKeyDown={(
                    event
                  ) => {

                    if (
                      event.key ===
                      "Enter"
                    ) {
                      handleSearch();
                    }

                  }}

                  placeholder="Search train number, name or route..."
                />

              </div>


              <button
                className="search-button"

                onClick={
                  handleSearch
                }

                disabled={
                  loading
                }
              >

                {loading
                  ? "Searching..."
                  : "Search Train"}

                {!loading && (
                  <span>
                    →
                  </span>
                )}

              </button>

            </div>


            <div className="search-note">
              Enter any 5-digit train number
            </div>


            <div className="popular-searches">

              <span>
                Quick search:
              </span>


              <button
                onClick={() =>
                  handlePopularSearch(
                    "12301"
                  )
                }
              >
                12301
              </button>


              <button
                onClick={() =>
                  handlePopularSearch(
                    "12841"
                  )
                }
              >
                12841
              </button>


              <button
                onClick={() =>
                  handlePopularSearch(
                    "12019"
                  )
                }
              >
                12019
              </button>

            </div>


            <div className="hero-stats">

              <div>

                <strong>
                  5,000+
                </strong>

                <span>
                  Trains
                </span>

              </div>


              <div>

                <strong>
                  20,000+
                </strong>

                <span>
                  Stations
                </span>

              </div>


              <div>

                <strong>
                  Live
                </strong>

                <span>
                  Tracking
                </span>

              </div>

            </div>

          </div>


          {/* =================================================
             HERO RADAR
          ================================================= */}

          <div className="hero-right">

            <div className="radar-card">

              <div className="radar-header">

                <div>

                  <span>
                    LIVE RADAR
                  </span>

                  <h3>

                    {selectedTrain &&
                    selectedTrain !==
                      "not-found"

                      ? selectedTrain.name

                      : "Train Movement"}

                  </h3>

                </div>


                <div className="online-status">

                  <span></span>

                  {selectedTrain &&
                  selectedTrain !==
                    "not-found"

                    ? "LIVE"

                    : "READY"}

                </div>

              </div>


              <div className="radar-map">

                <div className="radar-grid"></div>

                <div className="route-path"></div>


                {selectedTrain &&
                selectedTrain !==
                  "not-found" ? (

                  <>

                    <div className="map-station station-a">

                      <div></div>

                      <span>
                        {selectedTrain.from}
                      </span>

                    </div>


                    <div className="map-station station-c active">

                      <div></div>

                      <span>
                        {selectedTrain.current}
                      </span>

                    </div>


                    <div className="map-station station-d">

                      <div></div>

                      <span>
                        {selectedTrain.next}
                      </span>

                    </div>


                    <div className="radar-train">
                      🚆
                    </div>

                  </>

                ) : (

                  <div
                    style={{
                      position:
                        "absolute",

                      inset:
                        0,

                      display:
                        "grid",

                      placeItems:
                        "center",

                      color:
                        "#8793a0",

                      fontSize:
                        "12px",
                    }}
                  >
                    Search a train
                  </div>

                )}

              </div>


              <div className="radar-footer">

                <div>

                  <span>
                    Train
                  </span>

                  <strong>
                    {activeTrainNumber ||
                      "--"}
                  </strong>

                </div>


                <div>

                  <span>
                    Current Speed
                  </span>

                  <strong>

                    {selectedTrain?.currentSpeed !==
                      null &&
                    selectedTrain?.currentSpeed !==
                      undefined

                      ? `${Math.round(
                          selectedTrain.currentSpeed
                        )} km/h`

                      : "Calculating..."}

                  </strong>

                </div>


                <div>

                  <span>
                    Status
                  </span>

                  <strong className="running-text">

                    {selectedTrain &&
                    selectedTrain !==
                      "not-found"

                      ? selectedTrain.status

                      : "Ready"}

                  </strong>

                </div>

              </div>

            </div>

          </div>

        </section>


        {/* =================================================
           SEARCH RESULT
        ================================================= */}

        <section
          className="search-result-section"
          id="search-result"
        >

          {error && (

            <div className="result-card not-found">

              <div className="result-icon">
                ⚠️
              </div>

              <h2>
                Server connection problem
              </h2>

              <p>
                {error}
              </p>

            </div>

          )}


          {!error &&
            selectedTrain ===
              "not-found" && (

            <div className="result-card not-found">

              <div className="result-icon">
                🔍
              </div>

              <h2>
                Train not found
              </h2>

              <p>
                Try another 5-digit
                train number.
              </p>

            </div>

          )}


          {!error &&
            selectedTrain &&
            selectedTrain !==
              "not-found" && (

            <>

              <div className="result-card">

                <div className="result-top">

                  <div>

                    <span>
                      SEARCH RESULT
                    </span>

                    <h2>
                      {selectedTrain.number}
                      {" "}
                      {selectedTrain.name}
                    </h2>

                  </div>


                  <div className="live-pill">

                    <span></span>

                    {selectedTrain.status}

                  </div>

                </div>


                <div className="result-route">

                  <div>

                    <small>
                      FROM
                    </small>

                    <strong>
                      {selectedTrain.from}
                    </strong>

                  </div>


                  <div className="route-arrow">
                    →
                  </div>


                  <div>

                    <small>
                      TO
                    </small>

                    <strong>
                      {selectedTrain.to}
                    </strong>

                  </div>

                </div>


                <div className="result-info-grid">

                  <div>

                    <small>
                      Current Station
                    </small>

                    <strong>
                      {selectedTrain.current}
                    </strong>

                  </div>


                  <div>

                    <small>
                      Next Station
                    </small>

                    <strong>
                      {selectedTrain.next}
                    </strong>

                  </div>


                  <div>

                    <small>
                      Current Speed
                    </small>

                    <strong>

                      {selectedTrain.currentSpeed !==
                        null

                        ? `${Math.round(
                            selectedTrain.currentSpeed
                          )} km/h`

                        : "Calculating..."}

                    </strong>

                  </div>


                  <div>

                    <small>
                      Average Speed
                    </small>

                    <strong>

                      {selectedTrain.avgSpeed !==
                        null

                        ? `${Math.round(
                            selectedTrain.avgSpeed
                          )} km/h`

                        : "--"}

                    </strong>

                  </div>


                  <div>

                    <small>
                      Max Speed
                    </small>

                    <strong>

                      {selectedTrain.maxSpeed !==
                        null

                        ? `${Math.round(
                            selectedTrain.maxSpeed
                          )} km/h`

                        : "--"}

                    </strong>

                  </div>


                  <div>

                    <small>
                      Delay
                    </small>

                    <strong className="delay">

                      +
                      {formatDelay(
                        selectedTrain.delay
                      )}

                    </strong>

                  </div>


                  <div>

                    <small>
                      Estimated Arrival
                    </small>

                    <strong className="eta">

                      {selectedTrain.arrival}

                    </strong>

                  </div>

                </div>

              </div>


              <TrainDetails
                train={{
                  ...selectedTrain,

                  delayText:
                    `+${formatDelay(
                      selectedTrain.delay
                    )}`,
                }}

                onClose={
                  closeTrainDetails
                }
              />

            </>

          )}

        </section>


        {/* =================================================
           TRAIN STATUS
        ================================================= */}

        <section
          className="status-section"
          id="status"
        >

          <div className="section-header">

            <div>

              <span className="eyebrow">
                CURRENT JOURNEY
              </span>

              <h2>
                Train running status
              </h2>

            </div>


            <button
              className="outline-button"

              onClick={() =>
                document
                  .getElementById(
                    "radar"
                  )
                  ?.scrollIntoView({
                    behavior:
                      "smooth",
                  })
              }
            >
              View Live Radar →
            </button>

          </div>


          {selectedTrain &&
          selectedTrain !==
            "not-found" ? (

            <div className="status-card">

              <div className="train-main">

                <div className="train-number">

                  <span>
                    TRAIN NUMBER
                  </span>

                  <strong>
                    {selectedTrain.number}
                  </strong>

                </div>


                <div className="train-name">

                  <h3>
                    {selectedTrain.name}
                  </h3>

                  <div className="route-name">

                    {selectedTrain.from}

                    <span>
                      →
                    </span>

                    {selectedTrain.to}

                  </div>

                </div>


                <div className="live-pill">

                  <span></span>

                  {selectedTrain.status}

                </div>

              </div>


              <div className="journey-line">

                <div className="journey-stop completed">

                  <span className="point"></span>

                  <div>

                    <strong>
                      {selectedTrain.from}
                    </strong>

                    <small>
                      Origin
                    </small>

                  </div>

                </div>


                <div className="journey-progress">

                  <div
                    className="progress-fill"

                    style={{
                      width:
                        selectedTrain.segmentProgress !==
                        null

                          ? `${
                              Math.max(
                                10,
                                Math.min(
                                  90,
                                  selectedTrain.segmentProgress *
                                    100
                                )
                              )
                            }%`

                          : "0%",
                    }}
                  ></div>


                  {selectedTrain.segmentProgress !==
                    null && (

                    <span
                      className="train-position"

                      style={{
                        left:
                          `${
                            Math.max(
                              5,
                              Math.min(
                                95,
                                selectedTrain.segmentProgress *
                                  100
                              )
                            )
                          }%`,
                      }}
                    >
                      🚆
                    </span>

                  )}

                </div>


                <div className="journey-stop current">

                  <span className="point"></span>

                  <div>

                    <strong>
                      {selectedTrain.current}
                    </strong>

                    <small>
                      Current Location
                    </small>

                  </div>

                </div>


                <div className="journey-progress empty">

                  <div></div>

                </div>


                <div className="journey-stop upcoming">

                  <span className="point"></span>

                  <div>

                    <strong>
                      {selectedTrain.to}
                    </strong>

                    <small>
                      Destination
                    </small>

                  </div>

                </div>

              </div>


              <div className="status-extra-grid">

                <div className="status-extra-item">

                  <span>
                    CURRENT SPEED
                  </span>

                  <strong>

                    {selectedTrain.currentSpeed !==
                      null

                      ? `${Math.round(
                          selectedTrain.currentSpeed
                        )} km/h`

                      : "Calculating..."}

                  </strong>

                </div>


                <div className="status-extra-item">

                  <span>
                    AVG SPEED
                  </span>

                  <strong>

                    {selectedTrain.avgSpeed !==
                      null

                      ? `${Math.round(
                          selectedTrain.avgSpeed
                        )} km/h`

                      : "--"}

                  </strong>

                </div>


                <div className="status-extra-item">

                  <span>
                    MAX SPEED
                  </span>

                  <strong>

                    {selectedTrain.maxSpeed !==
                      null

                      ? `${Math.round(
                          selectedTrain.maxSpeed
                        )} km/h`

                      : "--"}

                  </strong>

                </div>


                <div className="status-extra-item">

                  <span>
                    DELAY
                  </span>

                  <strong>

                    +
                    {formatDelay(
                      selectedTrain.delay
                    )}

                  </strong>

                </div>


                <div className="status-extra-item">

                  <span>
                    ETA
                  </span>

                  <strong>
                    {selectedTrain.arrival}
                  </strong>

                </div>

              </div>

            </div>

          ) : (

            <div className="status-empty">

              <div className="status-empty-icon">
                🚆
              </div>

              <h3>
                Search a train to view
                its running status
              </h3>

              <p>
                Enter any 5-digit train
                number above.
              </p>

            </div>

          )}

        </section>


        {/* =================================================
           LIVE RADAR
        ================================================= */}

        {activeTrainNumber ? (

          <LiveRadar
            train={
              selectedTrain &&
              selectedTrain !==
                "not-found"
                ? selectedTrain
                : null
            }
          />

        ) : (

          <section
            className="live-radar-page"
            id="radar"
          >

            <div className="radar-page-header">

              <div>

                <span className="eyebrow">
                  LIVE TRAIN RADAR
                </span>

                <h2>
                  Search a train to start
                  live tracking
                </h2>

                <p>
                  The live map will appear
                  after you search for a train.
                </p>

              </div>

            </div>

          </section>

        )}


        {/* =================================================
           ROUTE
        ================================================= */}

        <RouteTimeline
          train={
            selectedTrain &&
            selectedTrain !==
              "not-found"
              ? selectedTrain
              : null
          }

          trainNumber={
            activeTrainNumber
          }
        />


        {/* =================================================
           AI ETA
        ================================================= */}

        {activeTrainNumber ? (

          <ETAPrediction
            key={
              activeTrainNumber
            }

            trainNumber={
              activeTrainNumber
            }
          />

        ) : (

          <section
            className="eta-prediction-section"
            id="eta"
          >

            <div className="eta-prediction-header">

              <div>

                <span className="eyebrow">
                  PREDICTIVE INTELLIGENCE
                </span>

                <h2>
                  Search a train for
                  live ETA
                </h2>

                <p>
                  AI ETA prediction will
                  appear after you search
                  for a train.
                </p>

              </div>

            </div>

          </section>

        )}


        {/* =================================================
           ABOUT
        ================================================= */}

        <AboutRailRadar />


        {/* =================================================
           FEATURES
        ================================================= */}

        <section
          className="features-section"
          id="features"
        >

          <div className="section-header centered">

            <span className="eyebrow">
              WHY RAILTRACKING
            </span>

            <h2>
              Built for smarter journeys
            </h2>

            <p>
              Everything you need to understand
              your train journey in one place.
            </p>

          </div>


          <div className="feature-grid">

            <div className="feature-card">

              <div className="feature-number">
                01
              </div>

              <div className="feature-icon">
                📍
              </div>

              <h3>
                Live Tracking
              </h3>

              <p>
                See your train's current
                location and running status.
              </p>

            </div>


            <div className="feature-card">

              <div className="feature-number">
                02
              </div>

              <div className="feature-icon">
                🗺️
              </div>

              <h3>
                Route Intelligence
              </h3>

              <p>
                Explore stations and journey
                milestones.
              </p>

            </div>


            <div className="feature-card">

              <div className="feature-number">
                03
              </div>

              <div className="feature-icon">
                🤖
              </div>

              <h3>
                AI ETA Prediction
              </h3>

              <p>
                Estimate arrival times using
                live journey signals.
              </p>

            </div>


            <div className="feature-card">

              <div className="feature-number">
                04
              </div>

              <div className="feature-icon">
                🔔
              </div>

              <h3>
                Travel Alerts
              </h3>

              <p>
                Get important updates about
                delays and journey changes.
              </p>

            </div>

          </div>

        </section>


        {/* =================================================
           CTA
        ================================================= */}

        <section className="cta-section">

          <div>

            <span className="eyebrow">
              START TRACKING
            </span>

            <h2>

              Your journey,

              <br />

              <span>
                one radar away.
              </span>

            </h2>

          </div>


          <button
            className="primary-button"

            onClick={() =>
              document
                .getElementById(
                  "home"
                )
                ?.scrollIntoView({
                  behavior:
                    "smooth",
                })
            }
          >
            Search a Train →
          </button>

        </section>

      </main>


      {/* =================================================
         FOOTER
      ================================================= */}

      <footer>

        <div className="footer-top">

          <a
            href="#home"
            className="brand"
          >

            <div className="brand-icon">
              🚆
            </div>

            <div>

              <h2>
                RailTracking
              </h2>

              <span>
                SMART RAILWAY PLATFORM
              </span>

            </div>

          </a>


          <p>
            Smarter train tracking.
            Better journey planning.
          </p>

        </div>


        <div className="footer-bottom">

          <span>
            © 2026 RailTracking AI
          </span>

          <span>
            Built for smarter railway journeys.
          </span>

        </div>

      </footer>

    </div>
  );
}


export default App;