import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import connectDB from "./config/connectDB.js";

import trainRoutes from "./routes/trainRoutes.js";
import analyticsRoutes from "./routes/analyticsRoutes.js";


/* =====================================================
   LOAD ENVIRONMENT VARIABLES
===================================================== */

dotenv.config();


/* =====================================================
   CREATE EXPRESS APP
===================================================== */

const app =
  express();


/* =====================================================
   MIDDLEWARE
===================================================== */

/*
  Allow frontend to call backend API.
*/

app.use(
  cors()
);


/*
  Parse JSON request body.
*/

app.use(
  express.json()
);


/* =====================================================
   DATABASE CONNECTION
===================================================== */

connectDB();


/* =====================================================
   TRAIN ROUTES
===================================================== */

/*
  Examples:

  GET /api/trains
  GET /api/trains/search?q=12301
  GET /api/trains/live/12301
  GET /api/trains/eta/12301
  GET /api/trains/12301
*/

app.use(
  "/api/trains",
  trainRoutes
);


/* =====================================================
   ANALYTICS ROUTES
===================================================== */

/*
  POST /api/analytics/event

  GET /api/analytics/dashboard
*/

app.use(
  "/api/analytics",
  analyticsRoutes
);


/* =====================================================
   HEALTH CHECK
===================================================== */

app.get(
  "/",
  (req, res) => {

    return res.json({

      success: true,

      message:
        "RailTracking backend is running.",

      api: {
        trains:
          "/api/trains",

        analytics:
          "/api/analytics",
      },

    });

  }
);


/* =====================================================
   404 HANDLER
===================================================== */

app.use(
  (req, res) => {

    return res.status(404).json({

      success: false,

      message:
        "API route not found.",

      path:
        req.originalUrl,

    });

  }
);


/* =====================================================
   GLOBAL ERROR HANDLER
===================================================== */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "[BACKEND ERROR]",
      error
    );


    return res.status(
      error.statusCode || 500
    ).json({

      success: false,

      message:
        error.message ||
        "Internal server error.",

    });

  }
);


/* =====================================================
   SERVER PORT
===================================================== */

const PORT =
  Number(
    process.env.PORT
  ) || 5000;


/* =====================================================
   START SERVER
===================================================== */

app.listen(
  PORT,
  () => {

    console.log(
      "================================================="
    );

    console.log(
      `RailTracking backend running on http://localhost:${PORT}`
    );

    console.log(
      `Train API: http://localhost:${PORT}/api/trains`
    );

    console.log(
      `Analytics API: http://localhost:${PORT}/api/analytics`
    );

    console.log(
      "================================================="
    );

  }
);