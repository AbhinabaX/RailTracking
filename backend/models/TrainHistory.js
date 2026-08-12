import mongoose from "mongoose";


const trainHistorySchema =
  new mongoose.Schema(
    {

      trainNumber: {
        type: String,
        required: true,
        index: true,
      },


      trainName: {
        type: String,
        default: "",
      },


      currentStation: {
        type: String,
        default: "",
      },


      nextStation: {
        type: String,
        default: "",
      },


      latitude: {
        type: Number,
        default: null,
      },


      longitude: {
        type: Number,
        default: null,
      },


      currentSpeedKmh: {
        type: Number,
        default: null,
      },


      speedKmh: {
        type: Number,
        default: null,
      },


      avgSpeedKmh: {
        type: Number,
        default: null,
      },


      maxSpeedKmh: {
        type: Number,
        default: null,
      },


      delayMinutes: {
        type: Number,
        default: 0,
      },


      remainingDistanceKm: {
        type: Number,
        default: null,
      },


      segmentProgress: {
        type: Number,
        default: 0,
      },


      currentSequence: {
        type: Number,
        default: 0,
      },


      status: {
        type: String,
        default: "unknown",
      },


      isLive: {
        type: Boolean,
        default: true,
      },


      recordedAt: {
        type: Date,
        default: Date.now,
        index: true,
      },

    },

    {
      timestamps: true,
    }
  );


/* =====================================================
   INDEX FOR FAST HISTORY LOOKUP
===================================================== */

trainHistorySchema.index({
  trainNumber: 1,
  recordedAt: -1,
});


const TrainHistory =
  mongoose.model(
    "TrainHistory",
    trainHistorySchema
  );


export default TrainHistory;