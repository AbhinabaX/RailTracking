import AnalyticsEvent from "../models/AnalyticsEvent.js";


/* =====================================================
   RECORD ANALYTICS EVENT
===================================================== */

export const recordAnalyticsEvent = async (
  req,
  res
) => {
  try {

    const {
      eventType,
      trainNumber,
      page,
    } = req.body;


    /* -----------------------------------------------
       GET ANONYMOUS VISITOR ID
    ------------------------------------------------ */

    const visitorId =
      req.headers["x-visitor-id"];


    if (!visitorId) {

      return res.status(400).json({
        success: false,
        message:
          "Visitor ID is required.",
      });

    }


    /* -----------------------------------------------
       ALLOWED EVENTS
    ------------------------------------------------ */

    const allowedEvents = [
      "visit",
      "search",
      "radar_view",
      "eta_view",
    ];


    if (
      !allowedEvents.includes(
        eventType
      )
    ) {

      return res.status(400).json({
        success: false,
        message:
          "Invalid analytics event.",
      });

    }


    /* -----------------------------------------------
       SAVE EVENT
    ------------------------------------------------ */

    const event =
      await AnalyticsEvent.create({

        visitorId:
          String(
            visitorId
          ),

        eventType,

        trainNumber:
          trainNumber
            ? String(
                trainNumber
              )
            : null,

        page:
          page || null,

        createdAt:
          new Date(),

      });


    return res.json({

      success: true,

      eventId:
        event._id,

    });

  } catch (error) {

    console.error(
      "[ANALYTICS] Event error:",
      error.message
    );


    return res.status(500).json({

      success: false,

      message:
        "Unable to save analytics event.",

    });

  }
};


/* =====================================================
   GET ADMIN DASHBOARD
===================================================== */

export const getAnalyticsDashboard =
  async (
    req,
    res
  ) => {

    try {

      /* =================================================
         CURRENT TIME
      ================================================= */

      const now =
        new Date();


      /* =================================================
         START OF TODAY
      ================================================= */

      const startOfToday =
        new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          0,
          0,
          0,
          0
        );


      /* =================================================
         ACTIVE USER WINDOW

         A visitor is considered active when
         they generated an event during the
         last 5 minutes.
      ================================================= */

      const activeSince =
        new Date(
          Date.now() -
            5 *
              60 *
              1000
        );


      /* =================================================
         1. TOTAL UNIQUE USERS
         
         All-time unique anonymous visitors.
      ================================================= */

      const totalUsersResult =
        await AnalyticsEvent.aggregate([

          {
            $group: {
              _id:
                "$visitorId",
            },
          },

          {
            $count:
              "count",
          },

        ]);


      const totalUsers =
        totalUsersResult[0]
          ?.count || 0;


      /* =================================================
         2. USERS TODAY
         
         Unique visitors who generated
         any event today.
      ================================================= */

      const usersTodayResult =
        await AnalyticsEvent.aggregate([

          {
            $match: {

              createdAt: {
                $gte:
                  startOfToday,
              },

            },
          },

          {
            $group: {

              _id:
                "$visitorId",

            },
          },

          {
            $count:
              "count",
          },

        ]);


      const usersToday =
        usersTodayResult[0]
          ?.count || 0;


      /* =================================================
         3. ACTIVE USERS COUNT

         Unique visitors active during
         the last 5 minutes.
      ================================================= */

      const activeUsersResult =
        await AnalyticsEvent.aggregate([

          {
            $match: {

              createdAt: {
                $gte:
                  activeSince,
              },

            },
          },

          {
            $group: {

              _id:
                "$visitorId",

            },
          },

          {
            $count:
              "count",
          },

        ]);


      const activeUsers =
        activeUsersResult[0]
          ?.count || 0;


      /* =================================================
         4. ACTIVE USERS LIST

         Get the latest activity of each
         currently active visitor.
      ================================================= */

      const activeVisitors =
        await AnalyticsEvent.aggregate([

          {
            $match: {

              createdAt: {
                $gte:
                  activeSince,
              },

            },
          },


          {
            $group: {

              _id:
                "$visitorId",

              lastActive: {
                $max:
                  "$createdAt",
              },

              lastEvent: {
                $last:
                  "$eventType",
              },

              lastTrainNumber: {
                $last:
                  "$trainNumber",
              },

              lastPage: {
                $last:
                  "$page",
              },

            },
          },


          {
            $sort: {

              lastActive:
                -1,

            },

          },


          {
            $limit:
              20,

          },

        ]);


      /* =================================================
         5. TOTAL SEARCHES TODAY
      ================================================= */

      const totalSearches =
        await AnalyticsEvent.countDocuments({

          eventType:
            "search",

          createdAt: {
            $gte:
              startOfToday,
          },

        });


      /* =================================================
         6. POPULAR TRAINS TODAY
      ================================================= */

      const popularTrains =
        await AnalyticsEvent.aggregate([

          {
            $match: {

              eventType:
                "search",

              trainNumber: {
                $ne:
                  null,
              },

              createdAt: {
                $gte:
                  startOfToday,
              },

            },
          },


          {
            $group: {

              _id:
                "$trainNumber",

              count: {
                $sum:
                  1,
              },

            },
          },


          {
            $sort: {

              count:
                -1,

            },
          },


          {
            $limit:
              10,

          },

        ]);


      /* =================================================
         7. LIVE RADAR VIEWS TODAY
      ================================================= */

      const liveRadarViews =
        await AnalyticsEvent.countDocuments({

          eventType:
            "radar_view",

          createdAt: {
            $gte:
              startOfToday,
          },

        });


      /* =================================================
         8. ETA VIEWS TODAY
      ================================================= */

      const etaViews =
        await AnalyticsEvent.countDocuments({

          eventType:
            "eta_view",

          createdAt: {
            $gte:
              startOfToday,
          },

        });


      /* =================================================
         9. TOTAL EVENTS TODAY
      ================================================= */

      const totalEventsToday =
        await AnalyticsEvent.countDocuments({

          createdAt: {
            $gte:
              startOfToday,
          },

        });


      /* =================================================
         10. FORMAT ACTIVE VISITORS

         Don't expose the complete visitor ID
         in the admin UI.
      ================================================= */

      const formattedActiveVisitors =
        activeVisitors.map(
          (
            visitor
          ) => ({

            visitorId:
              String(
                visitor._id
              ).slice(
                0,
                8
              ) + "...",

            lastActive:
              visitor.lastActive,

            lastEvent:
              visitor.lastEvent ||
              null,

            lastTrainNumber:
              visitor.lastTrainNumber ||
              null,

            lastPage:
              visitor.lastPage ||
              null,

          })
        );


      /* =================================================
         11. RESPONSE
      ================================================= */

      return res.json({

        success:
          true,


        date:
          startOfToday
            .toISOString()
            .split(
              "T"
            )[0],


        stats: {

          totalUsers,

          usersToday,

          activeUsers,

          totalSearches,

          liveRadarViews,

          etaViews,

          totalEventsToday,

        },


        popularTrains:

          popularTrains.map(
            (
              item
            ) => ({

              trainNumber:
                item._id,

              count:
                item.count,

            })
          ),


        activeVisitors:
          formattedActiveVisitors,

      });

    } catch (error) {

      console.error(
        "[ANALYTICS] Dashboard error:",
        error.message
      );


      return res.status(500).json({

        success:
          false,

        message:
          "Unable to load analytics dashboard.",

      });

    }

  };