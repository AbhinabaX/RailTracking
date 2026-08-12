import express from "express";

import {
  recordAnalyticsEvent,
  getAnalyticsDashboard,
} from "../controllers/analyticsController.js";


const router =
  express.Router();


/* =====================================================
   RECORD EVENT
===================================================== */

router.post(
  "/event",
  recordAnalyticsEvent
);


/* =====================================================
   ADMIN DASHBOARD DATA
===================================================== */

router.get(
  "/dashboard",
  getAnalyticsDashboard
);


export default router;