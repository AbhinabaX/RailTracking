import { useMemo } from "react";


/* =====================================================
   DELAY FORMATTER
===================================================== */

const formatDelay = (
  minutes
) => {

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
   TIME FORMATTER
===================================================== */

const formatTime = (
  value
) => {

  if (
    value === null ||
    value === undefined ||
    value === "" ||
    value === "--" ||
    value === "-"
  ) {
    return "--";
  }


  /* Already formatted, e.g. 10:42 PM */

  if (
    typeof value === "string" &&
    /AM|PM/i.test(value)
  ) {
    return value;
  }


  try {

    const date =
      new Date(value);


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

  } catch {
    // Ignore invalid date
  }


  return String(value);
};


/* =====================================================
   SAFE NUMBER
===================================================== */

const getNumber = (
  value
) => {

  const number =
    Number(value);


  return Number.isFinite(
    number
  )
    ? number
    : null;
};


/* =====================================================
   TRAIN DETAILS
===================================================== */

function TrainDetails({
  train,
  onClose,
}) {

  /* ===================================================
     EMPTY STATE
  =================================================== */

  if (!train) {
    return null;
  }


  /* ===================================================
     BASIC TRAIN DATA
  =================================================== */

  const number =
    train?.number ||
    "--";


  const name =
    train?.name ||
    "Train";


  const from =
    train?.from ||
    "--";


  const to =
    train?.to ||
    "--";


  const current =
    train?.current ||
    "Current Location";


  const next =
    train?.next ||
    "Next Station";


  const status =
    train?.status ||
    "Running";


  const delay =
    Number(
      train?.delay
    ) || 0;


  const arrival =
    train?.arrival ||
    "--";


  const isLive =
    train?.isLive !== false;


  /* ===================================================
     CURRENT SPEED

     Backend calculated speed gets priority.
  =================================================== */

  const currentSpeed =
    getNumber(
      train?.currentSpeed ??
        train?.calculatedCurrentSpeedKmh ??
        train?.speed
    );


  /* ===================================================
     AVERAGE SPEED
  =================================================== */

  const averageSpeed =
    getNumber(
      train?.avgSpeed ??
        train?.averageSpeed
    );


  /* ===================================================
     MAX SPEED
  =================================================== */

  const maxSpeed =
    getNumber(
      train?.maxSpeed ??
        train?.maxSpeedKmh
    );


  /* ===================================================
     SEGMENT PROGRESS
  =================================================== */

  const segmentProgress =
    getNumber(
      train?.segmentProgress
    );


  const segmentPercent =
    segmentProgress !== null &&
    segmentProgress >= 0 &&
    segmentProgress <= 1
      ? Math.round(
          segmentProgress * 100
        )
      : null;


  /* ===================================================
     SPEED SOURCE
  =================================================== */

  const speedSource =
    train?.speedSource ||
    (
      currentSpeed !== null
        ? "calculated"
        : "unavailable"
    );


  /* ===================================================
     SPEED SOURCE TEXT
  =================================================== */

  const speedSourceText =
    speedSource ===
      "calculated"
      ? "Calculated from live GPS positions"
      : speedSource ===
        "api"
      ? "Provided by live train service"
      : "Waiting for live GPS data";


  /* ===================================================
     STATUS TEXT
  =================================================== */

  const statusText =
    String(status)
      .trim()
      .toLowerCase()
      .replace(
        /\b\w/g,
        (char) =>
          char.toUpperCase()
      );


  /* ===================================================
     MEMOIZED DELAY TEXT
  =================================================== */

  const delayText =
    useMemo(
      () =>
        formatDelay(
          delay
        ),
      [delay]
    );


  return (
    <div
      className="train-details-card"
    >

      {/* =================================================
         HEADER
      ================================================= */}

      <div className="train-details-header">

        <div className="train-details-title">

          <span className="train-details-eyebrow">
            TRAIN DETAILS
          </span>


          <div className="train-details-name-row">

            <h2>
              {number}
            </h2>

            <span className="train-details-name">
              {name}
            </span>

          </div>

        </div>


        <button
          type="button"
          className="train-details-close"
          onClick={onClose}
          aria-label="Close train details"
        >
          ×
        </button>

      </div>


      {/* =================================================
         ROUTE
      ================================================= */}

      <div className="train-details-route">

        <div className="train-route-point">

          <span className="route-label">
            ORIGIN
          </span>


          <strong>
            {from}
          </strong>

        </div>


        <div className="train-route-line">

          <span className="route-line"></span>


          <span className="route-train-icon">
            🚆
          </span>

        </div>


        <div className="train-route-point destination">

          <span className="route-label">
            DESTINATION
          </span>


          <strong>
            {to}
          </strong>

        </div>

      </div>


      {/* =================================================
         LIVE STATUS
      ================================================= */}

      <div className="train-details-status-row">

        <div className="train-live-badge">

          <span
            className={
              isLive
                ? "live-indicator active"
                : "live-indicator"
            }
          ></span>


          {isLive
            ? "LIVE DATA"
            : "DATA"}

        </div>


        <div className="train-running-status">

          {statusText}

        </div>

      </div>


      {/* =================================================
         SPEED OVERVIEW
      ================================================= */}

      <div className="speed-overview-grid">


        {/* CURRENT SPEED */}

        <div className="speed-overview-card primary-speed">

          <div className="speed-card-icon">
            ⚡
          </div>


          <div>

            <span>
              CURRENT SPEED
            </span>


            <div className="speed-main-value">

              <strong>

                {currentSpeed !== null
                  ? Math.round(
                      currentSpeed
                    )
                  : "Calculating..."}

              </strong>


              {currentSpeed !==
                null && (
                <small>
                  km/h
                </small>
              )}

            </div>


            <p className="speed-card-subtext">

              {speedSourceText}

            </p>

          </div>

        </div>


        {/* AVERAGE SPEED */}

        <div className="speed-overview-card">

          <div className="speed-card-icon">
            📊
          </div>


          <div>

            <span>
              AVERAGE SPEED
            </span>


            <div className="speed-main-value">

              <strong>

                {averageSpeed !==
                  null
                  ? Math.round(
                      averageSpeed
                    )
                  : "--"}

              </strong>


              {averageSpeed !==
                null && (
                <small>
                  km/h
                </small>
              )}

            </div>


            <p className="speed-card-subtext">
              Average running speed
            </p>

          </div>

        </div>


        {/* MAX SPEED */}

        <div className="speed-overview-card">

          <div className="speed-card-icon">
            🚀
          </div>


          <div>

            <span>
              MAX SPEED
            </span>


            <div className="speed-main-value">

              <strong>

                {maxSpeed !==
                  null
                  ? Math.round(
                      maxSpeed
                    )
                  : "--"}

              </strong>


              {maxSpeed !==
                null && (
                <small>
                  km/h
                </small>
              )}

            </div>


            <p className="speed-card-subtext">
              Recorded maximum speed
            </p>

          </div>

        </div>

      </div>


      {/* =================================================
         SPEED NOTE
      ================================================= */}

      <div className="speed-note">

        <span>
          ●
        </span>


        <p>

          Current speed uses consecutive
          live GPS positions. Average and
          maximum speed come from the live
          train data.

        </p>

      </div>


      {/* =================================================
         TRAIN INFORMATION
      ================================================= */}

      <div className="train-details-stats">


        {/* CURRENT STATION */}

        <div className="train-stat-card">

          <span>
            CURRENT STATION
          </span>


          <strong>
            {current}
          </strong>


          <small>
            Current train location
          </small>

        </div>


        {/* NEXT STATION */}

        <div className="train-stat-card next">

          <span>
            NEXT STATION
          </span>


          <strong>
            {next}
          </strong>


          <small>
            Upcoming stop
          </small>

        </div>


        {/* DELAY */}

        <div className="train-stat-card">

          <span>
            DELAY
          </span>


          <strong
            className={
              delay > 0
                ? "delay-value"
                : "on-time-value"
            }
          >

            {delay > 0
              ? `+${delayText}`
              : "On time"}

          </strong>


          <small>
            Current running delay
          </small>

        </div>


        {/* ETA */}

        <div className="train-stat-card eta-card">

          <span>
            ESTIMATED ARRIVAL
          </span>


          <strong>
            {formatTime(
              arrival
            )}
          </strong>


          <small>
            Destination ETA
          </small>

        </div>

      </div>


      {/* =================================================
         CURRENT SEGMENT
      ================================================= */}

      <div className="train-segment-card">

        <div className="train-segment-header">

          <div>

            <span>
              CURRENT JOURNEY SEGMENT
            </span>


            <strong>

              {current}
              {" → "}
              {next}

            </strong>

          </div>


          <span className="segment-percent">

            {segmentPercent !==
              null
              ? `${segmentPercent}%`
              : "Updating..."}

          </span>

        </div>


        {/* TRACK */}

        <div className="train-segment-track">

          {segmentPercent !==
            null && (

            <div
              className="train-segment-progress"
              style={{
                width:
                  `${segmentPercent}%`,
              }}
            ></div>

          )}


          {segmentPercent !==
            null && (

            <div
              className="train-segment-marker"
              style={{
                left:
                  `${segmentPercent}%`,
              }}
            >
              🚆
            </div>

          )}

        </div>


        {/* FOOTER */}

        <div className="train-segment-footer">

          <span>
            {current}
          </span>


          <span>
            {next}
          </span>

        </div>

      </div>


      {/* =================================================
         ACTION BUTTONS
      ================================================= */}

      <div className="train-details-actions">


        <button
          type="button"
          className="train-action-primary"
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

          View Live Radar

          <span>
            →
          </span>

        </button>


        <button
          type="button"
          className="train-action-secondary"
          onClick={() =>
            document
              .getElementById(
                "route"
              )
              ?.scrollIntoView({
                behavior:
                  "smooth",
              })
          }
        >

          View Full Route

        </button>

      </div>

    </div>
  );
}


export default TrainDetails;