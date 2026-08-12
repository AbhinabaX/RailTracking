import { useMemo } from "react";


function RouteTimeline({
  train = null,
  trainNumber = null,
}) {

  /* =====================================================
     NO TRAIN SELECTED
  ===================================================== */

  if (
    !train ||
    train === "not-found"
  ) {
    return (
      <section
        className="route-timeline-section"
        id="route"
      >

        <div className="route-section-header">

          <div>

            <span className="eyebrow">
              TRAIN ROUTE
            </span>

            <h2>
              Route & Station Timeline
            </h2>

            <p>
              Search a train to view its complete
              route and stoppages.
            </p>

          </div>

        </div>


        <div className="route-empty">

          <div className="route-empty-icon">
            🚆
          </div>

          <h3>
            Search a train to view its route
          </h3>

          <p>
            Enter a 5-digit train number above.
          </p>

        </div>

      </section>
    );
  }


  /* =====================================================
     RAW ROUTE
  ===================================================== */

  const rawRoute =
    Array.isArray(train?.route)
      ? train.route
      : [];


  /* =====================================================
     NORMALIZE STATIONS
  ===================================================== */

  const stations = useMemo(() => {

    return rawRoute
      .map((station, index) => {

        const sequence =
          Number(
            station?.sequence
          ) || index + 1;


        const name =
          station?.stationName ||
          station?.name ||
          station?.station?.name ||
          `Station ${index + 1}`;


        const code =
          station?.stationCode ||
          station?.code ||
          station?.station?.code ||
          station?.station_code ||
          "";


        const arrival =
          station?.actualArrival ||
          station?.expectedArrival ||
          station?.scheduledArrival ||
          station?.arrival ||
          "--";


        const departure =
          station?.actualDeparture ||
          station?.expectedDeparture ||
          station?.scheduledDeparture ||
          station?.departure ||
          "--";


        return {
          ...station,
          sequence,
          name,
          code,
          arrival,
          departure,
        };

      })
      .sort(
        (a, b) =>
          a.sequence - b.sequence
      );

  }, [rawRoute]);


  /* =====================================================
     CURRENT SEQUENCE
  ===================================================== */

  const currentSequence =
    Number(
      train?.currentSequence
    ) || 0;


  /* =====================================================
     NEXT SEQUENCE
  ===================================================== */

  const nextSequence =
    Number(
      train?.nextSequence
    ) || 0;


  /* =====================================================
     GET STATION COORDINATES
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
      station?.latitude ??
      station?.lat ??
      station?.location?.lat ??
      station?.location?.latitude ??
      station?.coordinates?.lat ??
      station?.coordinates?.latitude ??
      station?.geo?.lat ??
      station?.geo?.latitude ??
      null;


    const lng =
      station?.longitude ??
      station?.lng ??
      station?.lon ??
      station?.location?.lng ??
      station?.location?.longitude ??
      station?.coordinates?.lng ??
      station?.coordinates?.longitude ??
      station?.geo?.lng ??
      station?.geo?.longitude ??
      null;


    const numericLat =
      Number(lat);

    const numericLng =
      Number(lng);


    return {
      lat:
        Number.isFinite(
          numericLat
        )
          ? numericLat
          : null,

      lng:
        Number.isFinite(
          numericLng
        )
          ? numericLng
          : null,
    };
  };


  /* =====================================================
     HAVERSINE DISTANCE
     Distance in KM
  ===================================================== */

  const calculateDistanceKm = (
    lat1,
    lon1,
    lat2,
    lon2
  ) => {

    if (
      lat1 === null ||
      lon1 === null ||
      lat2 === null ||
      lon2 === null ||
      lat1 === undefined ||
      lon1 === undefined ||
      lat2 === undefined ||
      lon2 === undefined
    ) {
      return null;
    }


    const R = 6371;


    const toRad = (
      value
    ) =>
      (value * Math.PI) /
      180;


    const dLat =
      toRad(
        lat2 - lat1
      );


    const dLon =
      toRad(
        lon2 - lon1
      );


    const a =
      Math.sin(
        dLat / 2
      ) ** 2 +

      Math.cos(
        toRad(lat1)
      ) *

      Math.cos(
        toRad(lat2)
      ) *

      Math.sin(
        dLon / 2
      ) ** 2;


    const c =
      2 *
      Math.atan2(
        Math.sqrt(a),
        Math.sqrt(1 - a)
      );


    return R * c;
  };


  /* =====================================================
     CURRENT STATION
  ===================================================== */

  const currentStation =
    stations.find(
      (station) =>
        currentSequence > 0 &&
        station.sequence ===
          currentSequence
    ) ||

    stations.find(
      (station) =>
        String(
          station.name
        ).toLowerCase() ===
        String(
          train?.current || ""
        ).toLowerCase()
    ) ||

    null;


  /* =====================================================
     NEXT STATION
  ===================================================== */

  const nextStation =
    stations.find(
      (station) =>
        nextSequence > 0 &&
        station.sequence ===
          nextSequence
    ) ||

    stations.find(
      (station) =>
        String(
          station.name
        ).toLowerCase() ===
        String(
          train?.next || ""
        ).toLowerCase()
    ) ||

    stations.find(
      (station) =>
        currentSequence > 0 &&
        station.sequence >
          currentSequence
    ) ||

    null;


  /* =====================================================
     ORIGIN / DESTINATION
  ===================================================== */

  const origin =
    stations.length > 0
      ? stations[0]
      : null;


  const destination =
    stations.length > 0
      ? stations[
          stations.length - 1
        ]
      : null;


  /* =====================================================
     CURRENT SEGMENT START
  ===================================================== */

  let currentSegmentStart =
    currentStation;


  if (
    !currentSegmentStart &&
    currentSequence > 1
  ) {
    currentSegmentStart =
      stations[
        currentSequence - 2
      ] || null;
  }


  if (
    !currentSegmentStart
  ) {
    currentSegmentStart =
      stations[0] || null;
  }


  /* =====================================================
     CURRENT SEGMENT END
  ===================================================== */

  let currentSegmentEnd =
    nextStation;


  if (
    !currentSegmentEnd &&
    currentSequence > 0
  ) {
    currentSegmentEnd =
      stations[
        currentSequence
      ] || null;
  }


  if (
    !currentSegmentEnd
  ) {
    currentSegmentEnd =
      stations[1] || null;
  }


  /* =====================================================
     TRAIN GPS
  ===================================================== */

  const trainLatitude =
    Number(
      train?.latitude
    );


  const trainLongitude =
    Number(
      train?.longitude
    );


  const hasTrainGPS =
    Number.isFinite(
      trainLatitude
    ) &&
    Number.isFinite(
      trainLongitude
    );


  /* =====================================================
     CURRENT SEGMENT GPS
  ===================================================== */

  const currentSegmentStartCoordinates =
    getStationCoordinates(
      currentSegmentStart
    );


  const currentSegmentEndCoordinates =
    getStationCoordinates(
      currentSegmentEnd
    );


  /* =====================================================
     CALCULATE SEGMENT PROGRESS
  ===================================================== */

  let calculatedSegmentProgress =
    null;


  if (
    hasTrainGPS &&

    currentSegmentStartCoordinates.lat !==
      null &&

    currentSegmentStartCoordinates.lng !==
      null &&

    currentSegmentEndCoordinates.lat !==
      null &&

    currentSegmentEndCoordinates.lng !==
      null
  ) {

    const totalSegmentDistance =
      calculateDistanceKm(
        currentSegmentStartCoordinates.lat,
        currentSegmentStartCoordinates.lng,
        currentSegmentEndCoordinates.lat,
        currentSegmentEndCoordinates.lng
      );


    const remainingDistance =
      calculateDistanceKm(
        trainLatitude,
        trainLongitude,
        currentSegmentEndCoordinates.lat,
        currentSegmentEndCoordinates.lng
      );


    if (
      totalSegmentDistance !==
        null &&

      remainingDistance !==
        null &&

      totalSegmentDistance > 0
    ) {

      calculatedSegmentProgress =
        1 -
        (
          remainingDistance /
          totalSegmentDistance
        );


      calculatedSegmentProgress =
        Math.max(
          0,
          Math.min(
            1,
            calculatedSegmentProgress
          )
        );
    }
  }


  /* =====================================================
     FALLBACK TO API SEGMENT PROGRESS
  ===================================================== */

  const apiSegmentProgress =
    Number(
      train?.segmentProgress
    );


  const hasApiSegmentProgress =
    Number.isFinite(
      apiSegmentProgress
    ) &&
    apiSegmentProgress >= 0 &&
    apiSegmentProgress <= 1;


  /* =====================================================
     FINAL SEGMENT PROGRESS

     Priority:
     1. GPS calculation
     2. API segmentProgress
     3. null
  ===================================================== */

  const segmentProgress =
    calculatedSegmentProgress !== null
      ? calculatedSegmentProgress

      : hasApiSegmentProgress
      ? apiSegmentProgress

      : null;


  /* =====================================================
     CURRENT SEGMENT %
  ===================================================== */

  const currentSegmentPercent =
    segmentProgress !== null
      ? Math.round(
          segmentProgress * 100
        )
      : null;


  /* =====================================================
     OVERALL JOURNEY PROGRESS

     This is separate from current segment.
  ===================================================== */

  const totalSegments =
    Math.max(
      1,
      stations.length - 1
    );


  let overallJourneyProgress =
    0;


  if (
    stations.length > 1 &&
    currentSequence > 0 &&
    segmentProgress !== null
  ) {

    const completedSegments =
      Math.max(
        0,
        currentSequence - 1
      );


    overallJourneyProgress =
      (
        (
          completedSegments +
          segmentProgress
        ) /
        totalSegments
      ) * 100;

  } else if (
    stations.length > 1 &&
    currentSequence > 0
  ) {

    const completedSegments =
      Math.max(
        0,
        currentSequence - 1
      );


    overallJourneyProgress =
      (
        completedSegments /
        totalSegments
      ) * 100;
  }


  overallJourneyProgress =
    Math.max(
      0,
      Math.min(
        100,
        overallJourneyProgress
      )
    );


  /* =====================================================
     STATION STATUS
  ===================================================== */

  const getStationStatus = (
    station,
    index
  ) => {

    if (
      currentStation &&
      station.sequence ===
        currentStation.sequence
    ) {
      return "current";
    }


    if (
      nextStation &&
      station.sequence ===
        nextStation.sequence
    ) {
      return "next";
    }


    if (
      currentSequence > 0 &&
      station.sequence <
        currentSequence
    ) {
      return "completed";
    }


    if (
      index === 0
    ) {
      return "origin";
    }


    if (
      index ===
      stations.length - 1
    ) {
      return "destination";
    }


    return "upcoming";
  };


  /* =====================================================
     STATUS LABEL
  ===================================================== */

  const getStatusLabel = (
    status
  ) => {

    switch (status) {

      case "completed":
        return "Passed";

      case "current":
        return "Current Station";

      case "next":
        return "Next Station";

      case "origin":
        return "Origin";

      case "destination":
        return "Destination";

      default:
        return "Upcoming";
    }
  };


  /* =====================================================
     FORMAT TIME
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


    /*
      Already formatted
      e.g. 06:48 PM
    */

    if (
      typeof value ===
        "string" &&
      /AM|PM/i.test(
        value
      )
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
      // Ignore invalid dates
    }


    return String(value);
  };


  /* =====================================================
     DELAY
  ===================================================== */

  const delay =
    Number(
      train?.delay
    ) || 0;


  /* =====================================================
     ETA
  ===================================================== */

  const destinationETA =
    train?.arrival ||
    destination?.arrival ||
    "--";


  /* =====================================================
     RENDER
  ===================================================== */

  return (
    <section
      className="route-timeline-section"
      id="route"
    >

      {/* =================================================
         HEADER
      ================================================= */}

      <div className="route-section-header">

        <div>

          <span className="eyebrow">
            TRAIN ROUTE
          </span>

          <h2>
            Route & Station Timeline
          </h2>

          <p>
            Follow every stoppage from origin
            to destination.
          </p>

        </div>


        <div className="route-train-badge">

          <span>
            TRAIN
          </span>

          <strong>
            {train?.number ||
              trainNumber ||
              "--"}
          </strong>

          <small>
            {train?.name ||
              "Train"}
          </small>

        </div>

      </div>


      {/* =================================================
         ROUTE SUMMARY
      ================================================= */}

      <div className="route-summary">

        <div className="route-summary-item">

          <span>
            ORIGIN
          </span>

          <strong>
            {origin?.name ||
              train?.from ||
              "--"}
          </strong>

        </div>


        <div className="route-summary-arrow">
          →
        </div>


        <div className="route-summary-item">

          <span>
            CURRENT
          </span>

          <strong className="current-text">

            {currentStation?.name ||
              train?.current ||
              "--"}

          </strong>

        </div>


        <div className="route-summary-arrow">
          →
        </div>


        <div className="route-summary-item">

          <span>
            DESTINATION
          </span>

          <strong>
            {destination?.name ||
              train?.to ||
              "--"}
          </strong>

        </div>

      </div>


      {/* =================================================
         CURRENT SEGMENT
      ================================================= */}

      <div
        className="current-segment-info"
        style={{
          marginTop: "18px",
          padding:
            "16px 18px",
          border:
            "1px solid #dce4eb",
          borderRadius:
            "10px",
          background:
            "#fbfcfd",
        }}
      >

        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            alignItems:
              "flex-end",
            gap: "15px",
          }}
        >

          <div>

            <span
              style={{
                display:
                  "block",
                color:
                  "#8794a2",
                fontSize:
                  "8px",
                fontWeight:
                  700,
                letterSpacing:
                  "0.8px",
                marginBottom:
                  "5px",
              }}
            >
              CURRENT JOURNEY SEGMENT
            </span>


            <strong
              style={{
                display:
                  "block",
                color:
                  "#30445b",
                fontSize:
                  "12px",
              }}
            >

              {currentSegmentStart?.name ||
                train?.current ||
                "Current Location"}

              {" → "}

              {currentSegmentEnd?.name ||
                train?.next ||
                "Next Station"}

            </strong>

          </div>


          <strong
            style={{
              color:
                "#1769d2",
              fontSize:
                "14px",
              whiteSpace:
                "nowrap",
            }}
          >

            {currentSegmentPercent !==
              null
              ? `${currentSegmentPercent}%`
              : "Updating..."}

          </strong>

        </div>


        {/* SEGMENT TRACK */}

        <div
          style={{
            position:
              "relative",
            height:
              "7px",
            marginTop:
              "16px",
            background:
              "#e5ebf0",
            borderRadius:
              "20px",
            overflow:
              "visible",
          }}
        >

          <div
            style={{
              width:
                `${currentSegmentPercent ?? 0}%`,
              height:
                "100%",
              background:
                "#1769d2",
              borderRadius:
                "20px",
              transition:
                "width 0.8s ease",
            }}
          ></div>


          {/* TRAIN POSITION */}

          {currentSegmentPercent !==
            null && (

            <div
              style={{
                position:
                  "absolute",
                top:
                  "50%",
                left:
                  `${Math.max(
                    0,
                    Math.min(
                      100,
                      currentSegmentPercent
                    )
                  )}%`,
                transform:
                  "translate(-50%, -50%)",
                width:
                  "28px",
                height:
                  "28px",
                display:
                  "flex",
                alignItems:
                  "center",
                justifyContent:
                  "center",
                borderRadius:
                  "50%",
                background:
                  "#ffffff",
                border:
                  "2px solid #1769d2",
                boxShadow:
                  "0 2px 7px rgba(23,105,210,0.20)",
                fontSize:
                  "13px",
                transition:
                  "left 0.8s ease",
              }}
            >
              🚆
            </div>

          )}

        </div>


        <div
          style={{
            display:
              "flex",
            justifyContent:
              "space-between",
            marginTop:
              "12px",
            color:
              "#8b97a4",
            fontSize:
              "7px",
          }}
        >

          <span>
            {currentSegmentStart?.name ||
              train?.current ||
              "--"}
          </span>

          <span>
            {currentSegmentEnd?.name ||
              train?.next ||
              "--"}
          </span>

        </div>

      </div>


      {/* =================================================
         OVERALL JOURNEY PROGRESS
      ================================================= */}

      <div
        style={{
          marginTop:
            "14px",
          padding:
            "13px 16px",
          background:
            "#f5f9fd",
          border:
            "1px solid #dce6ef",
          borderRadius:
            "9px",
        }}
      >

        <div
          style={{
            display:
              "flex",
            alignItems:
              "center",
            justifyContent:
              "space-between",
            marginBottom:
              "8px",
          }}
        >

          <span
            style={{
              color:
                "#82909e",
              fontSize:
                "7px",
              fontWeight:
                700,
              letterSpacing:
                "0.7px",
            }}
          >
            OVERALL JOURNEY PROGRESS
          </span>


          <strong
            style={{
              color:
                "#1769d2",
              fontSize:
                "11px",
            }}
          >
            {Math.round(
              overallJourneyProgress
            )}
            %
          </strong>

        </div>


        <div
          style={{
            width:
              "100%",
            height:
              "5px",
            background:
              "#e1e8ef",
            borderRadius:
              "20px",
            overflow:
              "hidden",
          }}
        >

          <div
            style={{
              width:
                `${overallJourneyProgress}%`,
              height:
                "100%",
              background:
                "#1769d2",
              borderRadius:
                "20px",
              transition:
                "width 0.8s ease",
            }}
          ></div>

        </div>

      </div>


      {/* =================================================
         STATION TIMELINE
      ================================================= */}

      <div className="route-timeline">

        {stations.length === 0 ? (

          <div className="route-empty">

            <div className="route-empty-icon">
              🛤️
            </div>

            <h3>
              Route data unavailable
            </h3>

            <p>
              No stoppage information was
              returned for this train.
            </p>

          </div>

        ) : (

          stations.map(
            (
              station,
              index
            ) => {

              const status =
                getStationStatus(
                  station,
                  index
                );


              const isLast =
                index ===
                stations.length - 1;


              return (
                <div
                  className={`route-item ${status}`}
                  key={`${
                    station.code ||
                    station.name
                  }-${station.sequence}-${index}`}
                >

                  {/* =================================
                     TIMELINE MARKER
                  ================================= */}

                  <div className="route-marker-area">

                    <div className="route-marker">

                      {status ===
                        "completed" && (
                        "✓"
                      )}


                      {status ===
                        "current" && (
                        <span className="current-marker"></span>
                      )}


                      {status ===
                        "next" && (
                        "→"
                      )}


                      {status ===
                        "destination" && (
                        "◆"
                      )}

                    </div>


                    {!isLast && (
                      <div className="route-connector"></div>
                    )}

                  </div>


                  {/* =================================
                     STATION DETAILS
                  ================================= */}

                  <div className="station-details">

                    <div className="station-main">

                      <div>

                        <div className="station-name-row">

                          <h3>
                            {station.name}
                          </h3>


                          {station.code && (
                            <span className="station-code">
                              {station.code}
                            </span>
                          )}

                        </div>


                        <p className="station-note">
                          {getStatusLabel(
                            status
                          )}
                        </p>

                      </div>


                      {/* TIMES */}

                      <div className="station-times">

                        <div>

                          <span>
                            ARRIVAL
                          </span>

                          <strong>
                            {formatTime(
                              station.arrival
                            )}
                          </strong>

                        </div>


                        <div>

                          <span>
                            DEPARTURE
                          </span>

                          <strong>
                            {formatTime(
                              station.departure
                            )}
                          </strong>

                        </div>

                      </div>

                    </div>


                    {/* =================================
                       CURRENT STATION NOTICE
                    ================================= */}

                    {status ===
                      "current" && (

                      <div className="current-station-banner">

                        <div>

                          <span className="current-live-dot"></span>

                          Train is currently here


                          {nextStation && (
                            <span
                              style={{
                                marginLeft:
                                  "8px",
                                color:
                                  "#6f7d8c",
                              }}
                            >
                              →
                              {" "}
                              Next:
                              {" "}
                              {nextStation.name}
                            </span>
                          )}

                        </div>


                        <strong>
                          +{delay} min
                        </strong>

                      </div>

                    )}


                    {/* =================================
                       NEXT STATION NOTICE
                    ================================= */}

                    {status ===
                      "next" && (

                      <div
                        className="current-station-banner"
                        style={{
                          background:
                            "#fff7e8",
                        }}
                      >

                        <div>

                          <span
                            className="current-live-dot"
                            style={{
                              background:
                                "#d8901e",
                            }}
                          ></span>

                          Next Station

                        </div>


                        <strong
                          style={{
                            color:
                              "#b67510",
                          }}
                        >
                          {formatTime(
                            station.arrival
                          )}
                        </strong>

                      </div>

                    )}

                  </div>

                </div>
              );
            }
          )

        )}

      </div>


      {/* =================================================
         BOTTOM SUMMARY
      ================================================= */}

      <div className="route-bottom-summary">


        {/* OVERALL PROGRESS */}

        <div>

          <span>
            OVERALL PROGRESS
          </span>


          <div
            className="journey-progress-large"
            style={{
              width:
                "100%",
              height:
                "7px",
              marginTop:
                "8px",
              background:
                "#e5ebf0",
              borderRadius:
                "20px",
              overflow:
                "hidden",
            }}
          >

            <div
              style={{
                width:
                  `${overallJourneyProgress}%`,
                height:
                  "100%",
                background:
                  "#1769d2",
                borderRadius:
                  "20px",
                transition:
                  "width 0.8s ease",
              }}
            ></div>

          </div>


          <small>
            {Math.round(
              overallJourneyProgress
            )}
            % completed
          </small>

        </div>


        {/* STATIONS */}

        <div className="route-bottom-stat">

          <span>
            STATIONS
          </span>

          <strong>
            {stations.length}
          </strong>

        </div>


        {/* DELAY */}

        <div className="route-bottom-stat">

          <span>
            DELAY
          </span>

          <strong className="delay-text">
            +{delay} min
          </strong>

        </div>


        {/* ETA */}

        <div className="route-bottom-stat">

          <span>
            EST. ARRIVAL
          </span>

          <strong className="eta-text">
            {formatTime(
              destinationETA
            )}
          </strong>

        </div>

      </div>

    </section>
  );
}


export default RouteTimeline;