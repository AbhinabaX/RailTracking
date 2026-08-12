import {
  useEffect,
  useState,
} from "react";


const API_URL =
  "http://localhost:5000/api/analytics";


/* =====================================================
   FORMAT LAST ACTIVE TIME
===================================================== */

const formatLastActive = (
  value
) => {

  if (!value) {
    return "--";
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
      hour:
        "2-digit",

      minute:
        "2-digit",

      second:
        "2-digit",
    }
  );
};


/* =====================================================
   FORMAT EVENT NAME
===================================================== */

const formatEventName = (
  event
) => {

  switch (event) {

    case "visit":
      return "Visited website";

    case "search":
      return "Searched train";

    case "radar_view":
      return "Opened Live Radar";

    case "eta_view":
      return "Viewed ETA";

    default:
      return "Activity";
  }
};


/* =====================================================
   ADMIN DASHBOARD
===================================================== */

function AdminDashboard() {

  const [
    analytics,
    setAnalytics,
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
     FETCH DASHBOARD
  =================================================== */

  const fetchDashboard =
    async () => {

      try {

        setError("");


        const response =
          await fetch(
            `${API_URL}/dashboard`
          );


        const data =
          await response.json();


        if (!response.ok) {

          throw new Error(
            data?.message ||
              "Unable to load analytics."
          );

        }


        setAnalytics(
          data
        );


      } catch (err) {

        console.error(
          "[ADMIN] Dashboard error:",
          err
        );


        setError(
          err.message ||
            "Unable to load analytics."
        );


      } finally {

        setLoading(false);

      }

    };


  /* ===================================================
     INITIAL LOAD + AUTO REFRESH

     Every 30 seconds
  =================================================== */

  useEffect(() => {

    fetchDashboard();


    const timer =
      window.setInterval(
        fetchDashboard,
        30000
      );


    return () =>
      window.clearInterval(
        timer
      );

  }, []);


  /* ===================================================
     LOADING
  =================================================== */

  if (loading) {

    return (
      <div className="admin-loading">

        <div>

          <div className="admin-loading-spinner">
            ⟳
          </div>

          <p>
            Loading RailTracking analytics...
          </p>

        </div>

      </div>
    );

  }


  /* ===================================================
     ERROR
  =================================================== */

  if (error) {

    return (
      <div className="admin-error">

        <div>

          <div className="admin-error-icon">
            ⚠️
          </div>

          <h2>
            Analytics unavailable
          </h2>

          <p>
            {error}
          </p>

          <button
            onClick={
              fetchDashboard
            }
          >
            Retry
          </button>

        </div>

      </div>
    );

  }


  /* ===================================================
     DATA
  =================================================== */

  const stats =
    analytics?.stats ||
    {};


  const popularTrains =
    analytics?.popularTrains ||
    [];


  const activeVisitors =
    analytics?.activeVisitors ||
    [];


  /* ===================================================
     RENDER
  =================================================== */

  return (
    <div className="admin-dashboard">


      {/* =================================================
         TOP HEADER
      ================================================= */}

      <div className="admin-header">

        <div>

          <span className="admin-eyebrow">
            ADMIN ANALYTICS
          </span>

          <h1>
            RailTracking Admin
          </h1>

          <p>
            Monitor website usage,
            activity and train searches.
          </p>

        </div>


        <div className="admin-header-actions">

          <div className="admin-live-status">

            <span></span>

            LIVE

          </div>


          <button
            className="admin-refresh-button"
            onClick={
              fetchDashboard
            }
          >
            ↻ Refresh
          </button>

        </div>

      </div>


      {/* =================================================
         STATS
      ================================================= */}

      <div className="admin-stat-grid">


        {/* TOTAL USERS */}

        <div className="admin-stat-card">

          <div className="admin-stat-top">

            <span>
              TOTAL USERS
            </span>

            <div className="admin-stat-icon">
              👥
            </div>

          </div>


          <strong>
            {stats.totalUsers ||
              0}
          </strong>


          <small>
            All-time unique visitors
          </small>

        </div>


        {/* USERS TODAY */}

        <div className="admin-stat-card">

          <div className="admin-stat-top">

            <span>
              USERS TODAY
            </span>

            <div className="admin-stat-icon">
              📅
            </div>

          </div>


          <strong>
            {stats.usersToday ||
              0}
          </strong>


          <small>
            Unique visitors today
          </small>

        </div>


        {/* ACTIVE NOW */}

        <div className="admin-stat-card admin-active-card">

          <div className="admin-stat-top">

            <span>
              ACTIVE NOW
            </span>

            <div className="admin-stat-icon active-icon">
              ●
            </div>

          </div>


          <strong>
            {stats.activeUsers ||
              0}
          </strong>


          <small>
            Active during last 5 minutes
          </small>

        </div>


        {/* SEARCHES */}

        <div className="admin-stat-card">

          <div className="admin-stat-top">

            <span>
              TOTAL SEARCHES
            </span>

            <div className="admin-stat-icon">
              🔎
            </div>

          </div>


          <strong>
            {stats.totalSearches ||
              0}
          </strong>


          <small>
            Today's train searches
          </small>

        </div>


        {/* RADAR */}

        <div className="admin-stat-card">

          <div className="admin-stat-top">

            <span>
              LIVE RADAR
            </span>

            <div className="admin-stat-icon">
              📍
            </div>

          </div>


          <strong>
            {stats.liveRadarViews ||
              0}
          </strong>


          <small>
            Today's radar views
          </small>

        </div>


        {/* ETA */}

        <div className="admin-stat-card">

          <div className="admin-stat-top">

            <span>
              ETA VIEWS
            </span>

            <div className="admin-stat-icon">
              🤖
            </div>

          </div>


          <strong>
            {stats.etaViews ||
              0}
          </strong>


          <small>
            Today's ETA views
          </small>

        </div>

      </div>


      {/* =================================================
         ACTIVE USERS
      ================================================= */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>

            <span>
              LIVE ACTIVITY
            </span>

            <h2>
              Active Users
            </h2>

            <p>
              Visitors who interacted with
              RailTracking during the last
              5 minutes.
            </p>

          </div>


          <div className="active-count-badge">

            <span></span>

            {stats.activeUsers ||
              0}

            {" "}
            active

          </div>

        </div>


        {activeVisitors.length ===
        0 ? (

          <div className="admin-empty">

            <div className="admin-empty-icon">
              👥
            </div>

            <strong>
              No active users right now
            </strong>

            <p>
              Active visitors will appear here
              when they use the website.
            </p>

          </div>

        ) : (

          <div className="active-users-list">

            {activeVisitors.map(
              (
                user,
                index
              ) => (

                <div
                  className="active-user-row"
                  key={
                    user.visitorId ||
                    index
                  }
                >

                  {/* STATUS */}

                  <div className="active-user-status">

                    <span></span>

                  </div>


                  {/* USER */}

                  <div className="active-user-info">

                    <strong>
                      Visitor #
                      {index + 1}
                    </strong>

                    <small>
                      ID:{" "}
                      {user.visitorId ||
                        "Anonymous"}
                    </small>

                  </div>


                  {/* ACTIVITY */}

                  <div className="active-user-activity">

                    <strong>
                      {formatEventName(
                        user.lastEvent
                      )}
                    </strong>


                    {user.lastTrainNumber && (
                      <small>

                        Train{" "}
                        {user.lastTrainNumber}

                      </small>
                    )}

                  </div>


                  {/* PAGE */}

                  <div className="active-user-page">

                    <span>
                      {user.lastPage ||
                        "/"}

                    </span>

                  </div>


                  {/* LAST ACTIVE */}

                  <div className="active-user-time">

                    <span>
                      {formatLastActive(
                        user.lastActive
                      )}
                    </span>

                    <small>
                      Last active
                    </small>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>


      {/* =================================================
         POPULAR TRAINS
      ================================================= */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>

            <span>
              SEARCH ANALYTICS
            </span>

            <h2>
              Popular Trains
            </h2>

            <p>
              Most searched trains today.
            </p>

          </div>

        </div>


        {popularTrains.length ===
        0 ? (

          <div className="admin-empty">

            <div className="admin-empty-icon">
              🚆
            </div>

            <strong>
              No train searches today
            </strong>

            <p>
              Train search activity will
              appear here.
            </p>

          </div>

        ) : (

          <div className="popular-train-list">

            {popularTrains.map(
              (
                train,
                index
              ) => (

                <div
                  className="popular-train-row"
                  key={
                    train.trainNumber
                  }
                >

                  {/* RANK */}

                  <div className="rank">

                    #{index + 1}

                  </div>


                  {/* TRAIN */}

                  <div className="popular-train-name">

                    <span>
                      TRAIN
                    </span>

                    <strong>
                      {train.trainNumber}
                    </strong>

                  </div>


                  {/* SEARCH COUNT */}

                  <div className="search-count">

                    <strong>
                      {train.count}
                    </strong>

                    <span>
                      searches
                    </span>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </div>


      {/* =================================================
         ACTIVITY SUMMARY
      ================================================= */}

      <div className="admin-section">

        <div className="admin-section-header">

          <div>

            <span>
              ACTIVITY SUMMARY
            </span>

            <h2>
              Today's Usage
            </h2>

          </div>

        </div>


        <div className="admin-activity-grid">

          <div className="admin-activity-card">

            <span>
              WEBSITE VISITS
            </span>

            <strong>
              {stats.usersToday ||
                0}
            </strong>

            <small>
              Unique visitors
            </small>

          </div>


          <div className="admin-activity-card">

            <span>
              SEARCHES
            </span>

            <strong>
              {stats.totalSearches ||
                0}
            </strong>

            <small>
              Train searches
            </small>

          </div>


          <div className="admin-activity-card">

            <span>
              RADAR
            </span>

            <strong>
              {stats.liveRadarViews ||
                0}
            </strong>

            <small>
              Live radar opens
            </small>

          </div>


          <div className="admin-activity-card">

            <span>
              ETA
            </span>

            <strong>
              {stats.etaViews ||
                0}
            </strong>

            <small>
              ETA views
            </small>

          </div>

        </div>

      </div>


      {/* =================================================
         FOOTER
      ================================================= */}

      <div className="admin-footer">

        <span>
          RailTracking Analytics
        </span>

        <span>
          Dashboard refreshes every
          30 seconds
        </span>

      </div>

    </div>
  );
}


export default AdminDashboard;