function AboutRailRadar() {
  return (
    <section className="about-section" id="about">

      <div className="about-header">
        <span className="eyebrow">
          ABOUT RAILRADAR
        </span>

        <h2>
          Smarter technology for
          <span> smarter journeys.</span>
        </h2>

        <p>
          RailRadar is designed to bring train tracking, route
          information and intelligent ETA prediction together in
          one simple platform.
        </p>
      </div>

      <div className="about-grid">

        {/* About Card */}
        <div className="about-main-card">

          <div className="about-icon">
            🚆
          </div>

          <h3>
            Built around your journey
          </h3>

          <p>
            Instead of checking multiple sources for train status,
            route information and expected arrival time, RailRadar
            brings the essential journey information together in one
            place.
          </p>

          <div className="about-highlights">

            <div>
              <strong>Track</strong>
              <span>
                Follow train movement and current status.
              </span>
            </div>

            <div>
              <strong>Understand</strong>
              <span>
                See stations, delays and route progress.
              </span>
            </div>

            <div>
              <strong>Predict</strong>
              <span>
                Estimate arrival time using journey signals.
              </span>
            </div>

          </div>

        </div>


        {/* Technology Card */}
        <div className="technology-card">

          <div className="technology-header">
            <span>PLATFORM</span>
            <strong>CORE SYSTEM</strong>
          </div>

          <div className="technology-list">

            <div className="technology-item">
              <div className="technology-number">
                01
              </div>

              <div>
                <strong>Train Tracking</strong>
                <p>
                  Monitor current train location and running status.
                </p>
              </div>
            </div>


            <div className="technology-item">
              <div className="technology-number">
                02
              </div>

              <div>
                <strong>Route Intelligence</strong>
                <p>
                  Understand stations, journey progress and delays.
                </p>
              </div>
            </div>


            <div className="technology-item">
              <div className="technology-number">
                03
              </div>

              <div>
                <strong>ETA Prediction</strong>
                <p>
                  Estimate when a train is likely to reach its destination.
                </p>
              </div>
            </div>


            <div className="technology-item">
              <div className="technology-number">
                04
              </div>

              <div>
                <strong>Passenger Experience</strong>
                <p>
                  Present complex train information in a simple interface.
                </p>
              </div>
            </div>

          </div>

        </div>

      </div>


      {/* Technology Stack */}
      <div className="stack-section">

        <div className="stack-header">
          <span className="eyebrow">
            TECHNOLOGY
          </span>

          <h3>
            Designed with modern web technologies
          </h3>
        </div>

        <div className="stack-grid">

          <div className="stack-card">
            <strong>React</strong>
            <span>Frontend</span>
          </div>

          <div className="stack-card">
            <strong>Node.js</strong>
            <span>Backend</span>
          </div>

          <div className="stack-card">
            <strong>MongoDB</strong>
            <span>Database</span>
          </div>

          <div className="stack-card">
            <strong>Python</strong>
            <span>ML Service</span>
          </div>

          <div className="stack-card">
            <strong>Maps</strong>
            <span>Radar</span>
          </div>

          <div className="stack-card">
            <strong>ML</strong>
            <span>ETA Model</span>
          </div>

        </div>

      </div>


      {/* Mission */}
      <div className="mission-card">

        <div>
          <span className="eyebrow">
            OUR GOAL
          </span>

          <h3>
            Make every railway journey easier to understand.
          </h3>
        </div>

        <div className="mission-text">
          <p>
            From finding a train to understanding its current position
            and estimated arrival, RailRadar focuses on giving passengers
            clear information when they need it most.
          </p>
        </div>

      </div>

    </section>
  );
}

export default AboutRailRadar;