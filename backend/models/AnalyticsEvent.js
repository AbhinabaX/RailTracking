import mongoose from "mongoose";

const analyticsEventSchema = new mongoose.Schema(
  {
    visitorId: {
      type: String,
      required: true,
      index: true,
    },

    eventType: {
      type: String,
      required: true,
      enum: [
        "visit",
        "search",
        "radar_view",
        "eta_view",
      ],
      index: true,
    },

    trainNumber: {
      type: String,
      default: null,
      index: true,
    },

    page: {
      type: String,
      default: null,
    },

    createdAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

analyticsEventSchema.index({
  visitorId: 1,
  createdAt: -1,
});

analyticsEventSchema.index({
  eventType: 1,
  createdAt: -1,
});

analyticsEventSchema.index({
  trainNumber: 1,
  createdAt: -1,
});

const AnalyticsEvent = mongoose.model(
  "AnalyticsEvent",
  analyticsEventSchema
);

export default AnalyticsEvent;