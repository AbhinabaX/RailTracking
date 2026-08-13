import {
  useEffect,
  useState,
} from "react";

/* =====================================================
   PRODUCTION API
===================================================== */

const API_BASE =
  "https://railtracking-cya2.onrender.com/api/trains";


/* =====================================================
   NUMBER HELPER
===================================================== */

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
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

  const date = new Date(value);

  if (
    !Number.isNaN(
      date.getTime()
    )
  ) {
    return date.toLocaleTimeString(
      [],
      {
        hour: "2-digit",
        minute: "2-digit",
      }
    );
  }

  return String(value);
};


/* =====================================================
   DELAY FORMAT
===================================================== */

const formatDelay = (value) => {
  const minutes = Math.max(
    0,
    Math.round(
      Number(value) || 0
    )
  );

  if (minutes < 60) {
    return `${minutes} min`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  const remaining =
    minutes % 60;

  if (remaining === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${remaining} min`;
};


/* =====================================================
   ETA PREDICTION COMPONENT
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


  /* ===================================================
     FETCH TRAIN DATA
  =================================================== */

  const fetchLive =
    async () => {

      if (!trainNumber) {
        setLoading(false);
        return;
      }


      try {

        setError("");
        setLoading(true);


        const response =
          await fetch(
            `${API_BASE}/live/${trainNumber}`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",
              },
            }
          );


        let payload = null;


        try {

          payload =
            await response.json();

        } catch {

          payload = null;
        }


        if (!response.ok) {

          throw new Error(
            payload?.message ||
            payload?.error?.message ||
            "Unable to fetch train data."
          );
        }


        const data =
          payload?.data ??
          payload;


        if (!data) {

          throw new Error(
            "Train data unavailable."
          );
        }


        setLive(data);

      } catch (err) {

        console.error(
          "ETA live data error:",
          err
        );


        /*
           IMPORTANT:
           Do NOT clear previous live data.
        */

        setError(
          err.message ||
          "Live data temporarily unavailable."
        );

      } finally {

        setLoading(false);

      }
    };


  /* ===================================================
     INITIAL LOAD
  =================================================== */

  useEffect(() => {

    fetchLive();

  }, [trainNumber]);


  /* ===================================================
     AUTO REFRESH - 30 SECONDS
  =================================================== */

  useEffect(() => {

    if (!trainNumber) {
      return;
    }


    const timer =
      window.setInterval(
        () => {
          fetchLive();
        },
        30000
      );


    return () => {

      window.clearInterval(
        timer
      );

    };

  }, [trainNumber]);


  /* ===================================================
     LOADING
  =================================================== */

  if (
    loading &&
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
     NO DATA
  =================================================== */

  if (
    !live &&
    error
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
            onClick={fetchLive}
          >
            Retry
          </button>

        </div>

      </section>
    );
  }


  /* ===================================================
     BASIC DATA
  =================================================== */

  const currentLocation =
    live?.currentLocation ||
    {};


  const trainNumberValue =
    live?.trainNumber ||
    trainNumber ||
    "--";


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
    "Destination";


  /* ===================================================
     SPEED
  =================================================== */

  const currentSpeed =
    toNumber(
      live?.calculatedCurrentSpeedKmh ??
      live?.currentSpeedKmh ??
      live?.currentSpeed ??
      currentLocation?.speedKmh ??
      currentLocation?.speedKmph
    );


  const averageSpeed =
    toNumber(
      live?.averageSpeed ??
      live?.avgSpeed
    );


  const maxSpeed =
    toNumber(
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
     DISTANCE
  =================================================== */

  const remainingDistance =
    toNumber(
      live?.remainingDistanceKm ??
      live?.distanceRemainingKm ??
      live?.nextHalt?.distanceRemainingKm ??
      live?.nextStation?.distanceRemainingKm
    );


  /* ===================================================
     ETA
  =================================================== */

  const directETA =
    live?.destination?.expectedArrival ||
    live?.destination?.estimatedArrival ||
    live?.nextHalt?.expectedArrival ||
    live?.nextHalt?.estimatedArrival ||
    live?.nextStation?.expectedArrival ||
    live?.nextStation?.estimatedArrival ||
    null;


  let fallbackETA = null;


  if (
    !directETA &&
    remainingDistance !== null &&
    remainingDistance > 0
  ) {

    const usableSpeed =
      currentSpeed &&
      currentSpeed > 5

        ? currentSpeed

        : averageSpeed &&
          averageSpeed > 5

          ? averageSpeed

          : null;


    if (
      usableSpeed
    ) {

      const hours =
        remainingDistance /
        usableSpeed;


      fallbackETA =
        new Date(
          Date.now() +
          hours *
          60 *
          60 *
          1000 +
          delay *
          60 *
          1000
        );
    }
  }


  const finalETA =
    directETA ||
    fallbackETA;


  /* ===================================================
     ROUTE PROGRESS
  =================================================== */

  let routeProgress = null;


  const route =
    Array.isArray(
      live?.route
    )
      ? live.route
      : [];


  const sequence =
    Number(
      currentLocation?.sequence
    ) || 0;


  const segmentProgress =
    Number(
      currentLocation?.segmentProgress
    ) || 0;


  if (
    route.length > 1 &&
    sequence > 0
  ) {

    routeProgress =
      Math.max(
        0,
        Math.min(
          100,

          (
            (
              sequence - 1
            ) +
            segmentProgress
          ) /
          (
            route.length - 1
          ) *
          100
        )
      );
  }


  /* ===================================================
     CONFIDENCE
  =================================================== */

  let confidence = 30;


  if (finalETA) {
    confidence += 25;
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
    confidence += 15;
  }


  if (delay >= 0) {
    confidence += 10;
  }


  confidence =
    Math.min(
      100,
      confidence
    );


  /* ===================================================
     LIVE STATUS
  =================================================== */

  const simulated =
    live?.simulated === true ||
    live?.simulation === true;


  const statusText =
    simulated
      ? "SIMULATED DATA"
      : "LIVE DATA";


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
            Live ETA based on current
            train movement, route progress
            and delay.
          </p>

        </div>


        <div className="prediction-status">

          <span></span>

          {statusText}

        </div>

      </div>


      {/* =================================================
         LAYOUT
      ================================================= */}

      <div className="prediction-layout">


        {/* =================================================
           MAIN CARD
        ================================================= */}

        <div className="prediction-main-card">

          <div className="train-header-row">

            <div>

              <span className="small-label">
                TRAIN
              </span>


              <h3>
                {trainNumberValue}{" "}
                {trainName}
              </h3>


              <p>
                {currentStation}
                {" → "}
                {destination}
              </p>

            </div>


            <div className="train-status">

              <span></span>

              Running

            </div>

          </div>


          {/* ETA */}

          <div className="eta-main">

            <span className="small-label">
              ESTIMATED ARRIVAL
            </span>


            <div className="eta-time">

              {formatTime(
                finalETA
              )}

            </div>


            <p>
              {destination}
            </p>

          </div>


          {/* Confidence */}

          <div className="confidence-block">

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
              />

            </div>


            <small>
              Based on available journey data
            </small>

          </div>


          {/* Stats */}

          <div className="eta-stats-grid">


            <div className="eta-stat">

              <span>
                Current Delay
              </span>

              <strong>
                +{formatDelay(delay)}
              </strong>

            </div>


            <div className="eta-stat">

              <span>
                Current Speed
              </span>

              <strong>

                {currentSpeed !== null
                  ? `${Math.round(
                      currentSpeed
                    )} km/h`
                  : "--"}

              </strong>

            </div>


            <div className="eta-stat">

              <span>
                Distance Remaining
              </span>

              <strong>

                {remainingDistance !== null
                  ? `${Math.round(
                      remainingDistance
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


          {/* On-time */}

          <div className="side-card">

            <span className="small-label">
              ON-TIME INDICATOR
            </span>


            <div className="on-time-value">

              {Math.max(
                20,
                Math.min(
                  95,
                  95 -
                  delay * 0.6
                )
              ).toFixed(0)}
              %

            </div>


            <div className="progress-bar">

              <div
                style={{
                  width:
                    `${Math.max(
                      20,
                      Math.min(
                        95,
                        95 -
                        delay * 0.6
                      )
                    )}%`,
                }}
              />

            </div>


            <small>
              Current delay is{" "}
              {delay <= 5
                ? "low."
                : "being monitored."}
            </small>

          </div>


          {/* Inputs */}

          <div className="side-card">

            <div className="side-card-header">

              <span>
                LIVE INPUTS
              </span>

              <strong>
                {currentSpeed !== null
                  ? "3 / 4"
                  : "2 / 4"}
              </strong>

            </div>


            <div className="input-row">

              <span className="input-icon">
                ⚡
              </span>

              <div>

                <strong>
                  Current Speed
                </strong>

                <small>

                  {currentSpeed !== null
                    ? `${Math.round(
                        currentSpeed
                      )} km/h`
                    : "Unavailable"}

                </small>

              </div>

              <span>
                ✓
              </span>

            </div>


            <div className="input-row">

              <span className="input-icon">
                ⏱
              </span>

              <div>

                <strong>
                  Current Delay
                </strong>

                <small>
                  +{formatDelay(delay)}
                </small>

              </div>

              <span>
                ✓
              </span>

            </div>


            <div className="input-row">

              <span className="input-icon">
                🗺️
              </span>

              <div>

                <strong>
                  Route Progress
                </strong>

                <small>

                  {routeProgress !== null
                    ? `${Math.round(
                        routeProgress
                      )}% completed`
                    : "Unavailable"}

                </small>

              </div>

              <span>
                ✓
              </span>

            </div>


            <div className="input-row">

              <span className="input-icon">
                📊
              </span>

              <div>

                <strong>
                  Historical Pattern
                </strong>

                <small>
                  Journey signals
                </small>

              </div>

              <span>
                —
              </span>

            </div>

          </div>


          {/* Message */}

          <div className="eta-info-box">

            <span>
              ⓘ
            </span>

            <p>

              {simulated

                ? "Using simulated train movement data. This mode does not consume the RailRadar API quota."

                : "Using available live journey data."}

            </p>

          </div>


        </div>

      </div>


      {/* =================================================
         ERROR NOTICE
      ================================================= */}

      {error && (

        <div className="eta-info-box">

          <span>
            ⚠
          </span>

          <p>
            {error}
          </p>

        </div>

      )}

    </section>
  );
}


export default ETAPrediction;