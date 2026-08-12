const API_URL =
  "http://localhost:5000/api/analytics";


/* =====================================================
   GET OR CREATE ANONYMOUS VISITOR ID
===================================================== */

const getVisitorId = () => {

  let visitorId =
    localStorage.getItem(
      "railtracking_visitor_id"
    );


  if (!visitorId) {

    visitorId =
      crypto.randomUUID();


    localStorage.setItem(
      "railtracking_visitor_id",
      visitorId
    );

  }


  return visitorId;
};


/* =====================================================
   SEND ANALYTICS EVENT
===================================================== */

export const trackEvent =
  async ({
    eventType,
    trainNumber = null,
    page = null,
  }) => {

    try {

      const visitorId =
        getVisitorId();


      await fetch(
        `${API_URL}/event`,
        {
          method:
            "POST",

          headers: {
            "Content-Type":
              "application/json",

            "x-visitor-id":
              visitorId,
          },

          body:
            JSON.stringify({
              eventType,
              trainNumber,
              page,
            }),
        }
      );

    } catch (error) {

      /*
        Analytics should never break
        the main RailTracking website.
      */

      console.error(
        "Analytics error:",
        error.message
      );

    }
  };