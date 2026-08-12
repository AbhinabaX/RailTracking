import express from "express";

import {
  getAllTrains,
  searchTrains,
  getTrainByNumber,
  getLiveTrain,
  getTrainETA,
} from "../controllers/trainController.js";


const router =
  express.Router();


router.get(
  "/",
  getAllTrains
);


router.get(
  "/search",
  searchTrains
);


router.get(
  "/live/:number",
  getLiveTrain
);


router.get(
  "/eta/:number",
  getTrainETA
);


router.get(
  "/:number",
  getTrainByNumber
);


export default router;