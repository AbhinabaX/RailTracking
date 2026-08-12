import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  MapContainer,
  TileLayer,
  Polyline,
  Marker,
  Popup,
  CircleMarker,
  useMap,
} from "react-leaflet";

import L from "leaflet";

import "leaflet/dist/leaflet.css";


/* =====================================================
   API
===================================================== */

const API_BASE =
  "http://localhost:5000/api/trains";


/* =====================================================
   TRAIN ICON
   ONLY ONE TRAIN ICON WILL BE SHOWN
===================================================== */

const trainIcon =
  new L.DivIcon({
    className:
      "railradar-train-icon-wrapper",

    html: `
      <div class="railradar-train-icon">
        🚆
      </div>
    `,

    iconSize: [54, 54],

    iconAnchor: [27, 27],

    popupAnchor: [0, -27],
  });


/* =====================================================
   SAFE NUMBER
===================================================== */

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
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
    Math.floor(total / 60);

  const mins =
    total % 60;

  if (mins === 0) {
    return `${hours} hr`;
  }

  return `${hours} hr ${mins} min`;
};


/* =====================================================
   COORDINATES
===================================================== */

const getCoordinates = (item) => {
  if (!item) {
    return {
      lat: null,
      lng: null,
    };
  }

  const lat = safeNumber(
    item?.lat ??
      item?.latitude ??
      item?.location?.lat ??
      item?.location?.latitude ??
      item?.coordinates?.lat ??
      item?.coordinates?.latitude ??
      item?.geo?.lat ??
      item?.geo?.latitude
  );

  const lng = safeNumber(
    item?.lng ??
      item?.longitude ??
      item?.lon ??
      item?.location?.lng ??
      item?.location?.longitude ??
      item?.coordinates?.lng ??
      item?.coordinates?.longitude ??
      item?.geo?.lng ??
      item?.geo?.longitude
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
      } =
        getCoordinates(
          station
        );

      return {
        ...station,

        sequence:
          Number(
            station?.sequence
          ) || index + 1,

        name:
          station?.stationName ||
          station?.name ||
          station?.station?.name ||
          `Station ${index + 1}`,

        code:
          station?.stationCode ||
          station?.code ||
          "",

        lat,

        lng,
      };
    })
    .filter(
      (station) =>
        station.lat !== null &&
        station.lng !== null
    )
    .sort(
      (a, b) =>
        a.sequence -
        b.sequence
    );
};


/* =====================================================
   INTERPOLATE POSITION
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

  const p = Math.max(
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
   FOLLOW TRAIN
===================================================== */

function FollowTrain({
  position,
}) {
  const map =
    useMap();

  useEffect(() => {
    if (!position) {
      return;
    }

    map.flyTo(
      [
        position.lat,
        position.lng,
      ],
      Math.max(
        map.getZoom(),
        8
      ),
      {
        duration: 0.8,
      }
    );
  }, [
    position,
    map,
  ]);

  return null;
}


/* =====================================================
   FIT ROUTE
===================================================== */

function FitRoute({
  routePoints,
  trainPosition,
}) {
  const map =
    useMap();

  useEffect(() => {

    const points =
      routePoints
        .map(
          (point) => [
            point.lat,
            point.lng,
          ]
        );


    if (trainPosition) {
      points.push([
        trainPosition.lat,
        trainPosition.lng,
      ]);
    }


    if (points.length >= 2) {

      const bounds =
        L.latLngBounds(
          points
        );


      map.fitBounds(
        bounds,
        {
          padding:
            [35, 35],

          maxZoom:
            10,
        }
      );

    }

  }, [
    routePoints,
    trainPosition,
    map,
  ]);

  return null;
}


/* =====================================================
   LIVE RADAR
===================================================== */

function LiveRadar({
  train = null,
  trainNumber = null,
}) {

  const [
    liveTrain,
    setLiveTrain,
  ] = useState(
    train || null
  );


  const [
    loading,
    setLoading,
  ] = useState(
    !train
  );


  const [
    error,
    setError,
  ] = useState("");


  /* ===================================================
     FETCH LIVE TRAIN
  =================================================== */

  const fetchLiveTrain =
    async () => {

      const number =
        train?.number ||
        trainNumber ||
        liveTrain?.trainNumber;


      if (!number) {
        return;
      }


      try {

        setError("");


        const response =
          await fetch(
            `${API_BASE}/live/${number}`
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


        const live =
          payload?.data ??
          payload;


        setLiveTrain(
          live
        );

      } catch (err) {

        console.error(
          "Live radar error:",
          err
        );


        if (!liveTrain) {

          setError(
            err.message ||
              "Unable to load live train data."
          );

        }

      } finally {

        setLoading(
          false
        );

      }
    };


  /* ===================================================
     UPDATE FROM APP
  =================================================== */

  useEffect(() => {

    if (train) {

      setLiveTrain(
        train
      );

      setLoading(
        false
      );

      setError("");

    }

  }, [train]);


  /* ===================================================
     INITIAL FETCH
  =================================================== */

  useEffect(() => {

    if (
      !train &&
      trainNumber
    ) {

      fetchLiveTrain();

    }

  }, [trainNumber]);


  /* ===================================================
     AUTO REFRESH
  =================================================== */

  useEffect(() => {

    const number =
      train?.number ||
      trainNumber ||
      liveTrain?.trainNumber;


    if (!number) {
      return;
    }


    const timer =
      window.setInterval(
        () => {
          fetchLiveTrain();
        },
        120000
      );


    return () =>
      window.clearInterval(
        timer
      );

  }, [
    train?.number,
    trainNumber,
    liveTrain?.trainNumber,
  ]);


  /* ===================================================
     DATA
  =================================================== */

  const actualTrain =
    liveTrain ||
    train;


  /* ===================================================
     ROUTE
  =================================================== */

  const routePoints =
    useMemo(
      () =>
        normalizeRoute(
          actualTrain?.route
        ),
      [actualTrain]
    );


  /* ===================================================
     CURRENT LOCATION
  =================================================== */

  const currentLocation =
    actualTrain?.currentLocation ||
    {};


  const currentSequence =
    Number(
      currentLocation?.sequence ??
        actualTrain?.currentSequence ??
        0
    ) || 0;


  const nextSequence =
    Number(
      actualTrain?.nextHalt?.sequence ??
        actualTrain?.nextStation?.sequence ??
        actualTrain?.nextSequence ??
        0
    ) || 0;


  /* ===================================================
     SEGMENT PROGRESS
  =================================================== */

  const segmentProgress =
    Math.max(
      0,
      Math.min(
        1,
        Number(
          currentLocation?.segmentProgress ??
            actualTrain?.segmentProgress ??
            0
        ) || 0
      )
    );


  /* ===================================================
     CURRENT STATION OBJECT
  =================================================== */

  const currentStationObject =
    routePoints.find(
      (station) =>
        station.sequence ===
        currentSequence
    ) || null;


  /* ===================================================
     NEXT STATION OBJECT
  =================================================== */

  const nextStationObject =
    routePoints.find(
      (station) =>
        station.sequence ===
        nextSequence
    ) ||
    routePoints.find(
      (station) =>
        station.sequence >
        currentSequence
    ) ||
    null;


  /* ===================================================
     CURRENT / NEXT NAME
  =================================================== */

  const currentStation =
    currentStationObject?.name ||
    actualTrain?.current ||
    actualTrain?.currentStation ||
    currentLocation?.stationName ||
    currentLocation?.name ||
    "Current Location";


  const nextStation =
    nextStationObject?.name ||
    actualTrain?.next ||
    actualTrain?.nextStation ||
    actualTrain?.nextHalt?.stationName ||
    actualTrain?.nextHalt?.name ||
    "Next Station";


  /* ===================================================
     ORIGIN / DESTINATION
  =================================================== */

  const origin =
    routePoints[0] ||
    null;


  const destination =
    routePoints[
      routePoints.length - 1
    ] ||
    null;


  const originName =
    origin?.name ||
    actualTrain?.from ||
    "Origin";


  const destinationName =
    destination?.name ||
    actualTrain?.to ||
    "Destination";


  /* ===================================================
     CURRENT SEGMENT
  =================================================== */

  const segmentStart =
    currentStationObject ||
    origin ||
    null;


  const segmentEnd =
    nextStationObject ||
    destination ||
    null;


  /* ===================================================
     DIRECT GPS
  =================================================== */

  const directLat =
    safeNumber(
      actualTrain?.latitude ??
        currentLocation?.lat ??
        currentLocation?.latitude
    );


  const directLng =
    safeNumber(
      actualTrain?.longitude ??
        currentLocation?.lng ??
        currentLocation?.longitude ??
        currentLocation?.lon
    );


  /* ===================================================
     TRAIN POSITION

     Direct GPS first.
     Otherwise interpolate current→next.
  =================================================== */

  let trainPosition =
    null;


  if (
    directLat !== null &&
    directLng !== null
  ) {

    trainPosition = {
      lat:
        directLat,

      lng:
        directLng,
    };

  } else {

    trainPosition =
      interpolatePosition(
        segmentStart,
        segmentEnd,
        segmentProgress
      );

  }


  /* ===================================================
     SPEED
  =================================================== */

  const currentSpeed =
    safeNumber(
      actualTrain?.calculatedCurrentSpeedKmh ??
        actualTrain?.currentSpeedKmh ??
        currentLocation?.calculatedSpeedKmh ??
        currentLocation?.speedKmh ??
        currentLocation?.speedKmph ??
        actualTrain?.currentSpeed
    );


  const averageSpeed =
    safeNumber(
      actualTrain?.avgSpeed ??
        actualTrain?.averageSpeed
    );


  const maxSpeed =
    safeNumber(
      actualTrain?.maxSpeed ??
        actualTrain?.maxSpeedKmh
    );


  /* ===================================================
     DELAY
  =================================================== */

  const delay =
    Number(
      actualTrain?.delayMinutes ??
        actualTrain?.delay ??
        train?.delay ??
        0
    ) || 0;


  /* ===================================================
     TRAIN DATA
  =================================================== */

  const number =
    actualTrain?.trainNumber ||
    actualTrain?.number ||
    train?.number ||
    trainNumber ||
    "--";


  const trainName =
    actualTrain?.trainName ||
    actualTrain?.name ||
    train?.name ||
    "Train";


  const status =
    actualTrain?.status ||
    actualTrain?.runningStatus ||
    "Running";


  const eta =
    actualTrain?.nextHalt?.expectedArrival ||
    actualTrain?.nextHalt?.scheduledArrival ||
    actualTrain?.arrival ||
    "--";


  /* ===================================================
     GEOMETRY
  =================================================== */

  const geometryPath =
    useMemo(
      () => {

        const coordinates =
          actualTrain?.geometry
            ?.coordinates;


        if (
          !Array.isArray(
            coordinates
          )
        ) {
          return [];
        }


        return coordinates
          .filter(
            (point) =>
              Array.isArray(
                point
              ) &&
              point.length >= 2
          )
          .map(
            (point) => [
              safeNumber(
                point[1]
              ),
              safeNumber(
                point[0]
              ),
            ]
          )
          .filter(
            (point) =>
              point[0] !== null &&
              point[1] !== null
          );

      },
      [actualTrain]
    );


  /* ===================================================
     MAP CENTER
  =================================================== */

  const mapCenter =
    trainPosition
      ? [
          trainPosition.lat,
          trainPosition.lng,
        ]
      : routePoints.length > 0
      ? [
          routePoints[0].lat,
          routePoints[0].lng,
        ]
      : [
          22.5726,
          88.3639,
        ];


  /* ===================================================
     LOADING
  =================================================== */

  if (
    loading &&
    !actualTrain
  ) {

    return (
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
              Loading live train data...
            </h2>

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
    !actualTrain
  ) {

    return (
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
              Live data unavailable
            </h2>

            <p>
              {error}
            </p>

          </div>

          <button
            className="outline-button"
            onClick={
              fetchLiveTrain
            }
          >
            Try Again
          </button>

        </div>

      </section>
    );
  }


  return (
    <section
      className="live-radar-page"
      id="radar"
    >

      {/* =================================================
         HEADER
      ================================================= */}

      <div className="radar-page-header">

        <div>

          <span className="eyebrow">
            LIVE TRAIN RADAR
          </span>

          <h2>
            {number}{" "}
            {trainName}
          </h2>

          {/* ORIGIN → DESTINATION */}

          <div
            className="train-route-direction"
          >

            <strong>
              {originName}
            </strong>

            <span>
              →
            </span>

            <strong>
              {destinationName}
            </strong>

          </div>

        </div>


        <div className="radar-live-status">

          <span></span>

          LIVE TRACKING

        </div>

      </div>


      {/* =================================================
         MAP
      ================================================= */}

      <div
        className="real-radar-map"
      >

        <MapContainer
          center={
            mapCenter
          }

          zoom={
            trainPosition
              ? 9
              : 7
          }

          scrollWheelZoom={
            true
          }

          className="train-leaflet-map"
        >

          <TileLayer
            attribution='&copy; OpenStreetMap contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />


          <FitRoute
            routePoints={
              routePoints
            }

            trainPosition={
              trainPosition
            }
          />


          {trainPosition && (
            <FollowTrain
              position={
                trainPosition
              }
            />
          )}


          {/* =================================================
             MAIN ROUTE LINE
          ================================================= */}

          {geometryPath.length >
            1 ? (

            <Polyline
              positions={
                geometryPath
              }

              pathOptions={{
                color:
                  "#1769d2",

                weight:
                  5,

                opacity:
                  0.85,
              }}
            />

          ) : routePoints.length >
              1 ? (

            <Polyline
              positions={
                routePoints.map(
                  (point) => [
                    point.lat,
                    point.lng,
                  ]
                )
              }

              pathOptions={{
                color:
                  "#1769d2",

                weight:
                  5,

                opacity:
                  0.75,
              }}
            />

          ) : null}


          {/* =================================================
             STATION DOTS

             Current station does NOT get another circle.
             The train icon is the current indicator.
          ================================================= */}

          {routePoints.map(
            (
              station,
              index
            ) => {

              const isCurrent =
                currentStationObject &&
                station.sequence ===
                  currentStationObject.sequence;


              /* Don't render extra current circle */

              if (isCurrent) {
                return null;
              }


              const isNext =
                nextStationObject &&
                station.sequence ===
                  nextStationObject.sequence;


              return (
                <CircleMarker
                  key={`station-${
                    station.sequence
                  }-${
                    index
                  }`}

                  center={[
                    station.lat,
                    station.lng,
                  ]}

                  radius={
                    isNext
                      ? 7
                      : 4
                  }

                  pathOptions={{
                    color:
                      isNext
                        ? "#d8901e"
                        : "#7c91a5",

                    fillColor:
                      "#ffffff",

                    fillOpacity:
                      1,

                    weight:
                      2,
                  }}
                >

                  <Popup>

                    <strong>
                      {station.name}
                    </strong>

                    {station.code && (
                      <>
                        <br />

                        Code:{" "}
                        {station.code}
                      </>
                    )}

                    {isNext && (
                      <>
                        <br />

                        Next Station
                      </>
                    )}

                  </Popup>

                </CircleMarker>
              );
            }
          )}


          {/* =================================================
             ONLY ONE TRAIN ICON
          ================================================= */}

          {trainPosition && (

            <Marker
              position={[
                trainPosition.lat,
                trainPosition.lng,
              ]}

              icon={
                trainIcon
              }

              zIndexOffset={
                5000
              }
            >

              <Popup>

                <strong>
                  🚆{" "}
                  {number}
                </strong>

                <br />

                {trainName}

                <br />

                <b>
                  {originName}
                  {" → "}
                  {destinationName}
                </b>

                <br />

                Current:
                {" "}
                {currentStation}

                <br />

                Next:
                {" "}
                {nextStation}

                <br />

                Speed:
                {" "}
                {currentSpeed !==
                null
                  ? `${Math.round(
                      currentSpeed
                    )} km/h`
                  : "Calculating..."}

              </Popup>

            </Marker>

          )}


          {/* NO EXTRA BLUE CIRCLE */}

        </MapContainer>


        {/* =================================================
           MAP OVERLAY
        ================================================= */}

        <div
          className="map-live-overlay"
        >

          <span className="map-live-dot"></span>

          {trainPosition
            ? "TRAIN POSITION LIVE"
            : "TRAIN POSITION UNAVAILABLE"}

        </div>


        {/* =================================================
           ROUTE BAR
        ================================================= */}

        <div
          className="map-route-bar"
        >

          <span>
            {originName}
          </span>

          <div
            className="map-route-bar-line"
          ></div>

          <span>
            {destinationName}
          </span>

        </div>

      </div>


      {/* =================================================
         INFORMATION
      ================================================= */}

      <div
        className="real-radar-info-grid"
      >

        <div>

          <span>
            CURRENT LOCATION
          </span>

          <strong>
            {currentStation}
          </strong>

        </div>


        <div>

          <span>
            NEXT STATION
          </span>

          <strong>
            {nextStation}
          </strong>

        </div>


        <div>

          <span>
            CURRENT SPEED
          </span>

          <strong>

            {currentSpeed !==
              null
              ? `${Math.round(
                  currentSpeed
                )} km/h`
              : "Calculating..."}

          </strong>

        </div>


        <div>

          <span>
            DELAY
          </span>

          <strong>
            +{formatDelay(
              delay
            )}
          </strong>

        </div>

      </div>


      {/* =================================================
         ADDITIONAL STATS
      ================================================= */}

      <div
        className="radar-location-details"
      >

        <div>

          <span>
            AVG SPEED
          </span>

          <strong>

            {averageSpeed !==
              null
              ? `${Math.round(
                  averageSpeed
                )} km/h`
              : "--"}

          </strong>

        </div>


        <div>

          <span>
            MAX SPEED
          </span>

          <strong>

            {maxSpeed !==
              null
              ? `${Math.round(
                  maxSpeed
                )} km/h`
              : "--"}

          </strong>

        </div>


        <div>

          <span>
            CURRENT ROUTE
          </span>

          <strong>

            {originName}
            {" → "}
            {destinationName}

          </strong>

        </div>


        <div>

          <span>
            SEGMENT PROGRESS
          </span>

          <strong>

            {Math.round(
              segmentProgress *
                100
            )}
            %

          </strong>

        </div>

      </div>


      {/* =================================================
         ETA
      ================================================= */}

      <div
        className="real-radar-eta"
      >

        <span>
          EXPECTED NEXT ARRIVAL
        </span>

        <strong>
          {eta}
        </strong>

        <small>
          {nextStation}
        </small>

      </div>

    </section>
  );
}


export default LiveRadar;