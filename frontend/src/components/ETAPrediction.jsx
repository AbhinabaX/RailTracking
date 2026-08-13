import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";


/* =====================================================
   API
===================================================== */

const API_BASE =
  "https://railtracking-cya2.onrender.com/api/trains";


/* =====================================================
   NUMBER
===================================================== */

const num = (value) => {
  const n = Number(value);

  return Number.isFinite(n)
    ? n
    : null;
};


/* =====================================================
   DELAY FORMAT
===================================================== */

const formatDelay = (minutes) => {
  const total = Math.max(
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
   TIME FORMAT
===================================================== */

const formatTime = (value) => {
  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "--"
  ) {
    return "--";
  }

  const text =
    String(value).trim();


  /* Already like 10:42 PM */

  if (
    /AM|PM/i.test(text)
  ) {
    return text;
  }


  /* HH:mm */

  const match =
    text.match(
      /^(\d{1,2}):(\d{2})(?::\d{2})?$/
    );


  if (match) {
    let hour =
      Number(match[1]);

    const minute =
      Number(match[2]);

    const suffix =
      hour >= 12
        ? "PM"
        : "AM";

    hour =
      hour % 12 || 12;

    return `${String(hour).padStart(
      2,
      "0"
    )}:${String(minute).padStart(
      2,
      "0"
    )} ${suffix}`;
  }


  const date =
    new Date(value);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "--";
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
   GET ETA FROM ROUTE
===================================================== */

const getRouteETA = (
  route,
  delay
) => {
  if (
    !Array.isArray(route) ||
    route.length === 0
  ) {
    return null;
  }


  const last =
    route[
      route.length - 1
    ];


  const scheduled =
    last?.scheduledArrival ||
    last?.expectedArrival ||
    last?.arrival ||
    null;


  if (!scheduled) {
    return null;
  }


  const date =
    new Date(scheduled);


  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return null;
  }


  /*
    Apply current delay to scheduled
    destination arrival.
  */

  date.setMinutes(
    date.getMinutes() +
      Number(delay || 0)
  );


  return formatTime(
    date
  );
};


/* =====================================================
   CALCULATE FALLBACK ETA

   remainingDistance / usableSpeed
===================================================== */

const calculateFallbackETA = ({
  remainingDistance,
  currentSpeed,
  averageSpeed,
}) => {

  if (
    remainingDistance === null ||
    remainingDistance <= 0
  ) {
    return null;
  }


  /*
    Current speed is not reliable when
    it is 0/unavailable.

    Therefore use average speed in
    that case.
  */

  const usableSpeed =
    currentSpeed !== null &&
    currentSpeed > 5
      ? currentSpeed
      : averageSpeed !== null &&
        averageSpeed > 5
      ? averageSpeed
      : null;


  if (
    usableSpeed === null
  ) {
    return null;
  }


  const hours =
    remainingDistance /
    usableSpeed;


  const milliseconds =
    hours *
    60 *
    60 *
    1000;


  return formatTime(
    new Date(
      Date.now() +
        milliseconds
    )
  );
};


/* =====================================================
   ETA PREDICTION
===================================================== */

function ETAPrediction({
  trainNumber,
}) {

  const [
    live,
    setLive,
  ] = useState(null);


  const [
    loading,
    setLoading,
  ] = useState(true);


  const [
    error,
    setError,
  ] = useState("");


  const isFetchingRef =
    useRef(false);


  /* ===================================================
     FETCH LIVE DATA

     We use the same working endpoint as
     the main train tracking section.
  =================================================== */

  const fetchLive =
    async (showLoading = false) => {

      if (!trainNumber || isFetchingRef.current) {
        return;
      }

      isFetchingRef.current = true;

      try {

        setError("");


        if (showLoading) {
          setLoading(true);
        }


        const response =
          await fetch(
            `${API_BASE}/live/${trainNumber}`
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


        if (!response.ok) {

          throw new Error(
            payload?.message ||
              payload?.error?.message ||
              "Unable to fetch live train data."
          );

        }


        const data =
          payload?.data ??
          payload;


        if (!data) {

          throw new Error(
            "Live train data unavailable."
          );

        }


        setLive(
          data
        );


      } catch (err) {

        console.error(
          "ETA live data error:",
          err
        );


        // Keep the last successful data during background refresh failures.
        // Only show the error when there is no previous live data.
        if (!live) {
          setError(
            err.message ||
              "Unable to calculate ETA."
          );
        }


      } finally {

        if (showLoading) {
          setLoading(false);
        }

        isFetchingRef.current = false;

      }
    };


  /* ===================================================
     INITIAL FETCH
  =================================================== */

  useEffect(() => {

    if (!trainNumber) {
      return;
    }

    setError("");
    setLive(null);
    fetchLive(true);

  }, [
    trainNumber,
  ]);


  /* ===================================================
     AUTO REFRESH
  =================================================== */

  useEffect(() => {

    if (!trainNumber) {
      return;
    }


    const timer =
      window.setInterval(
        () => {

          // Background refresh: keep showing the last
          // successful data while the new request runs.
          fetchLive(false);

        },
        5000
      );


    return () =>
      window.clearInterval(
        timer
      );

  }, [
    trainNumber,
  ]);


  /* ===================================================
     LOADING
  =================================================== */

  if (loading) {

    return (
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
              AI-powered ETA Prediction
            </h2>

            <p>
              Calculating expected
              arrival time...
            </p>

          </div>


          <div className="prediction-status">

            <span></span>

            CALCULATING

          </div>

        </div>


        <div className="eta-loading-card">

          <div className="loading-line"></div>

          <div className="loading-line short"></div>

          <div className="loading-boxes">

            <div></div>
            <div></div>
            <div></div>

          </div>

        </div>

      </section>
    );
  }


  /* ===================================================
     ERROR
  =================================================== */

  if (
    error &&
    !live
  ) {

    return (
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
              ETA Prediction
            </h2>

            <p>
              {error}
            </p>

          </div>


          <button
            className="outline-button"
            onClick={
              fetchLive
            }
          >
            Retry
          </button>

        </div>

      </section>
    );
  }


  /* ===================================================
     BASIC TRAIN DATA
  =================================================== */

  const currentLocation =
    live?.currentLocation ||
    {};


  const trainNumberValue =
    live?.trainNumber ||
    trainNumber;


  const trainName =
    live?.trainName ||
    live?.name ||
    "Train";


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


  const destination =
    live?.destination?.name ||
    live?.destinationName ||
    live?.destination?.stationName ||
    (
      Array.isArray(
        live?.route
      )
        ? live.route[
            live.route.length - 1
          ]?.stationName
        : null
    ) ||
    "Destination";


  /* ===================================================
     SPEED
  =================================================== */

  const currentSpeed =
    num(
      live?.calculatedCurrentSpeedKmh ??
        live?.currentSpeedKmh ??
        currentLocation?.calculatedSpeedKmh ??
        currentLocation?.speedKmh ??
        currentLocation?.speedKmph
    );


  const averageSpeed =
    num(
      live?.avgSpeed ??
        live?.averageSpeed
    );


  const maxSpeed =
    num(
      live?.maxSpeed ??
        live?.maxSpeedKmh
    );


  /* ===================================================
     DELAY
  =================================================== */

  const delay =
    Number(
      live?.delayMinutes ??
        live?.delay ??
        0
    ) || 0;


  /* ===================================================
     DISTANCE REMAINING
  =================================================== */

  const remainingDistance =
    num(
      live?.remainingDistanceKm ??
        live?.distanceRemainingKm ??
        live?.nextHalt?.distanceRemainingKm ??
        live?.nextStation?.distanceRemainingKm
    );


  /* ===================================================
     SEGMENT PROGRESS
  =================================================== */

  const segmentProgress =
    num(
      currentLocation?.segmentProgress ??
        live?.segmentProgress
    );


  /* ===================================================
     ROUTE PROGRESS

     We calculate whole-journey progress
     from current sequence.
  =================================================== */

  const route =
    Array.isArray(
      live?.route
    )
      ? live.route
      : [];


  const currentSequence =
    Number(
      currentLocation?.sequence
    ) || 0;


  const totalStops =
    route.length;


  let routeProgress =
    null;


  if (
    totalStops > 1 &&
    currentSequence > 0
  ) {

    routeProgress =
      Math.max(
        0,
        Math.min(
          1,
          (
            (
              currentSequence -
              1
            ) +
            (
              Number(
                segmentProgress
              ) || 0
            )
          ) /
            (
              totalStops - 1
            )
        )
      );

  }


  /* ===================================================
     ETA

     Priority:
     1. API's next halt expected arrival
     2. Destination schedule + delay
     3. Distance / speed estimate
  =================================================== */

  const directETA =
    live?.destination?.expectedArrival ||
    live?.destination?.estimatedArrival ||
    live?.nextHalt?.expectedArrival ||
    live?.nextHalt?.estimatedArrival ||
    live?.nextStation?.expectedArrival ||
    live?.nextStation?.estimatedArrival ||
    null;


  const routeETA =
    directETA
      ? null
      : getRouteETA(
          route,
          delay
        );


  const fallbackETA =
    directETA ||
    routeETA
      ? null
      : calculateFallbackETA({
          remainingDistance,
          currentSpeed,
          averageSpeed,
        });


  const finalETA =
    directETA ||
    routeETA ||
    fallbackETA;


  /* ===================================================
     CONFIDENCE

     This is a data confidence indicator,
     not a claim of model accuracy.
  =================================================== */

  let confidence =
    20;


  if (finalETA) {
    confidence += 30;
  }


  if (
    currentSpeed !== null ||
    averageSpeed !== null
  ) {
    confidence += 20;
  }


  if (
    routeProgress !== null
  ) {
    confidence += 20;
  }


  if (
    delay !== null
  ) {
    confidence += 10;
  }


  confidence =
    Math.min(
      100,
      confidence
    );


  /* ===================================================
     ON-TIME INDICATOR

     Simple status indicator.
  =================================================== */

  const onTimeProbability =
    Math.round(
      Math.max(
        20,
        Math.min(
          95,
          95 -
            (
              Math.max(
                0,
                delay
              ) *
              0.6
            )
        )
      )
    );


  /* ===================================================
     SIGNALS
  =================================================== */

  const signals = [

    {
      icon: "⚡",
      title:
        "Current Speed",
      value:
        currentSpeed !== null
          ? `${Math.round(
              currentSpeed
            )} km/h`
          : "Unavailable",
      available:
        currentSpeed !== null,
    },

    {
      icon: "⏱",
      title:
        "Current Delay",
      value:
        `+${formatDelay(
          delay
        )}`,
      available:
        true,
    },

    {
      icon: "🗺️",
      title:
        "Route Progress",
      value:
        routeProgress !== null
          ? `${Math.round(
              routeProgress *
                100
            )}% completed`
          : "Unavailable",
      available:
        routeProgress !== null,
    },

    {
      icon: "📊",
      title:
        "Historical Pattern",
      value:
        "Live journey signals",
      available:
        false,
    },

  ];


  const signalCount =
    signals.filter(
      (item) =>
        item.available
    ).length;


  /* ===================================================
     ETA MESSAGE
  =================================================== */

  let etaMessage;


  if (directETA) {

    etaMessage =
      "Using live expected arrival data from the train service.";

  } else if (routeETA) {

    etaMessage =
      "Using scheduled destination arrival adjusted by the current delay.";

  } else if (fallbackETA) {

    etaMessage =
      "Using remaining distance and available speed data to estimate arrival.";

  } else {

    etaMessage =
      "More live movement data is required to calculate ETA.";

  }


  /* ===================================================
     RENDER
  =================================================== */

  return (
    <section
      className="eta-prediction-section"
      id="eta"
    >

      {/* =================================================
         HEADER
      ================================================= */}

      <div className="eta-prediction-header">

        <div>

          <span className="eyebrow">
            PREDICTIVE INTELLIGENCE
          </span>

          <h2>
            AI-powered ETA Prediction
          </h2>

          <p>
            Live ETA based on current train
            movement, route progress and delay.
          </p>

        </div>


        <div className="prediction-status">

          <span></span>

          LIVE DATA

        </div>

      </div>


      {/* =================================================
         LAYOUT
      ================================================= */}

      <div className="prediction-layout">


        {/* =================================================
           MAIN ETA CARD
        ================================================= */}

        <div className="prediction-main-card">

          <div className="prediction-top">

            <div>

              <span className="prediction-label">
                TRAIN
              </span>

              <h3>
                {trainNumberValue}
                {" "}
                {trainName}
              </h3>

              <p>
                {currentStation}
                {" "}
                →
                {" "}
                {destination}
              </p>

            </div>


            <div className="prediction-train-status">

              <span></span>

              {live?.status ||
                "Running"}

            </div>

          </div>


          {/* ETA */}

          <div className="predicted-time">

            <span>
              ESTIMATED ARRIVAL
            </span>


            <div className="big-time">

              {finalETA
                ? (() => {

                    const formatted =
                      formatTime(
                        finalETA
                      );

                    const parts =
                      formatted.split(
                        " "
                      );

                    return (
                      <>
                        {parts[0]}

                        {parts[1] && (
                          <small>
                            {parts[1]}
                          </small>
                        )}
                      </>
                    );

                  })()
                : "--"}

            </div>


            <p>
              {destination}
            </p>

          </div>


          {/* CONFIDENCE */}

          <div className="confidence-section">

            <div className="confidence-header">

              <span>
                Prediction Confidence
              </span>

              <strong>
                {confidence}%
              </strong>

            </div>


            <div className="confidence-bar">

              <div
                style={{
                  width:
                    `${confidence}%`,
                }}
              ></div>

            </div>


            <small>
              Based on available live journey data
            </small>

          </div>


          {/* STATS */}

          <div className="prediction-stats">

            <div className="prediction-stat">

              <span>
                Current Delay
              </span>

              <strong className="delay-value">
                +{formatDelay(
                  delay
                )}
              </strong>

            </div>


            <div className="prediction-stat">

              <span>
                Current Speed
              </span>

              <strong>

                {currentSpeed !==
                  null
                  ? `${Math.round(
                      currentSpeed
                    )} km/h`
                  : "--"}

              </strong>

            </div>


            <div className="prediction-stat">

              <span>
                Distance Remaining
              </span>

              <strong>

                {remainingDistance !==
                  null
                  ? `${remainingDistance.toLocaleString(
                      undefined,
                      {
                        maximumFractionDigits:
                          1,
                      }
                    )} km`
                  : "--"}

              </strong>

            </div>

          </div>

        </div>


        {/* =================================================
           SIDE
        ================================================= */}

        <div className="prediction-side">


          {/* ON TIME */}

          <div className="probability-card">

            <div className="probability-header">

              <div>

                <span>
                  ON-TIME INDICATOR
                </span>

                <strong>
                  {onTimeProbability}%
                </strong>

              </div>


              <div className="probability-icon">
                ✓
              </div>

            </div>


            <div className="probability-track">

              <div
                style={{
                  width:
                    `${onTimeProbability}%`,
                }}
              ></div>

            </div>


            <p>

              {delay <= 5
                ? "Current delay is low."
                : "Current delay may affect the expected arrival time."}

            </p>

          </div>


          {/* INPUTS */}

          <div className="factors-card">

            <div className="factors-title">

              <span>
                LIVE INPUTS
              </span>

              <strong>
                {signalCount} /{" "}
                {signals.length}
              </strong>

            </div>


            <div className="factor-list">

              {signals.map(
                (
                  item
                ) => (

                  <div
                    className="factor-item"
                    key={
                      item.title
                    }
                  >

                    <div className="factor-icon">
                      {item.icon}
                    </div>


                    <div className="factor-text">

                      <strong>
                        {item.title}
                      </strong>

                      <span>
                        {item.value}
                      </span>

                    </div>


                    <div
                      className={
                        item.available
                          ? "factor-check"
                          : "factor-unavailable"
                      }
                    >
                      {item.available
                        ? "✓"
                        : "—"}
                    </div>

                  </div>

                )
              )}

            </div>

          </div>


          {/* NOTE */}

          <div className="prediction-note">

            <span>
              ⓘ
            </span>

            <p>
              {etaMessage}
            </p>

          </div>

        </div>

      </div>


      {/* =================================================
         HOW IT WORKS
      ================================================= */}

      <div className="how-it-works">

        <span className="eyebrow">
          HOW IT WORKS
        </span>

        <h3>
          From train movement to ETA
        </h3>


        <div className="how-steps">


          <div className="how-step">

            <small>
              01
            </small>

            <strong>
              Train Data
            </strong>

            <span>
              Position, speed and delay
            </span>

          </div>


          <div className="how-arrow">
            →
          </div>


          <div className="how-step">

            <small>
              02
            </small>

            <strong>
              Route Analysis
            </strong>

            <span>
              Remaining distance and stations
            </span>

          </div>


          <div className="how-arrow">
            →
          </div>


          <div className="how-step">

            <small>
              03
            </small>

            <strong>
              Prediction
            </strong>

            <span>
              Live journey signals are combined
            </span>

          </div>


          <div className="how-arrow">
            →
          </div>


          <div className="how-step">

            <small>
              04
            </small>

            <strong>
              ETA
            </strong>

            <span>
              Estimated arrival time
            </span>

          </div>

        </div>

      </div>

    </section>
  );
}


export default ETAPrediction;