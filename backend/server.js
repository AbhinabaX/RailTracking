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
   CORS CONFIGURATION
===================================================== */

/*
  Allowed frontend origins:

  Local:
  - http://localhost:5173
  - http://localhost:4173

  Production:
  - https://rail-tracking-seven.vercel.app
  - other Vercel preview/deployment URLs
*/

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:4173",
  "https://rail-tracking-seven.vercel.app",
];


const corsOptions = {

  origin: (
    origin,
    callback
  ) => {

    /*
      Allow requests without an Origin header.
      Example: direct browser/API/server requests.
    */

    if (!origin) {
      return callback(
        null,
        true
      );
    }


    /*
      Allow exact known origins.
    */

    if (
      allowedOrigins.includes(
        origin
      )
    ) {

      return callback(
        null,
        true
      );
    }


    /*
      Allow Vercel preview/deployment domains
      belonging to this project.
    */

    if (
      /^https:\/\/rail-tracking-[a-z0-9-]+\.vercel\.app$/i.test(
        origin
      )
    ) {

      return callback(
        null,
        true
      );
    }


    /*
      Reject unknown origins.
    */

    return callback(
      new Error(
        "CORS policy: origin not allowed."
      )
    );

  },


  methods: [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
    "OPTIONS",
  ],


  allowedHeaders: [
    "Content-Type",
    "Authorization",
    "x-visitor-id",
  ],


  credentials:
    false,


  optionsSuccessStatus:
    204,

};


/* =====================================================
   APPLY CORS
===================================================== */

app.use(
  cors(
    corsOptions
  )
);


/* =====================================================
   JSON BODY PARSER
===================================================== */

app.use(
  express.json()
);


/* =====================================================
   URL ENCODED BODY
===================================================== */

app.use(
  express.urlencoded({
    extended: true,
  })
);


/* =====================================================
   DATABASE CONNECTION
===================================================== */

connectDB();


/* =====================================================
   TRAIN ROUTES
===================================================== */

app.use(
  "/api/trains",
  trainRoutes
);


/* =====================================================
   ANALYTICS ROUTES
===================================================== */

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

      success:
        true,

      message:
        "RailTracking backend is running.",

      server:
        "Render",

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
   API HEALTH CHECK
===================================================== */

app.get(
  "/api/health",
  (req, res) => {

    return res.json({

      success:
        true,

      message:
        "RailTracking API is healthy.",

    });

  }
);


/* =====================================================
   404 HANDLER
===================================================== */

app.use(
  (req, res) => {

    return res.status(
      404
    ).json({

      success:
        false,

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
      error.message
    );


    /*
      CORS error
    */

    if (
      error.message &&
      error.message.startsWith(
        "CORS policy"
      )
    ) {

      return res.status(
        403
      ).json({

        success:
          false,

        message:
          error.message,

      });

    }


    return res.status(
      error.statusCode ||
        500
    ).json({

      success:
        false,

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
      `RailTracking backend running on port ${PORT}`
    );

    console.log(
      `Train API: /api/trains`
    );

    console.log(
      `Analytics API: /api/analytics`
    );

    console.log(
      "================================================="
    );

  }
);