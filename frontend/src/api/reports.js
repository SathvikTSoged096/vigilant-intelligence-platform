const STORAGE_KEY =
  "vigilant_dossier_process";


let activeProcess = null;


function saveState(state) {

  activeProcess = state;

  try {

    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(state)
    );

  } catch (error) {

    console.warn(
      "Unable to persist dossier state:",
      error
    );

  }

}


export function getDossierState() {

  if (activeProcess) {
    return activeProcess;
  }


  try {

    const raw =
      localStorage.getItem(
        STORAGE_KEY
      );

    if (!raw) {
      return null;
    }

    return JSON.parse(raw);

  } catch {

    return null;

  }

}


export function clearDossierState() {

  activeProcess = null;

  try {

    localStorage.removeItem(
      STORAGE_KEY
    );

  } catch {}

}


export function streamDossier(
  entityKey,
  onEvent,
  signal
) {

  const token =
    localStorage.getItem(
      "gotham_token"
    );


  // ------------------------------------------------------------
  // If this entity already has an active process,
  // don't start a second request.
  // ------------------------------------------------------------

  if (
    activeProcess &&
    activeProcess.entityKey === entityKey &&
    (
      activeProcess.status === "STARTING" ||
      activeProcess.status === "PROCESSING" ||
      activeProcess.status === "AI ASSESSMENT"
    )
  ) {

    if (onEvent) {

      onEvent(
        "progress",
        {
          percent:
            activeProcess.percent || 0,

          phase:
            activeProcess.phase ||
            "PROCESSING",
        }
      );

    }

    return () => {};

  }


  const controller =
    new AbortController();


  if (signal) {

    signal.addEventListener(
      "abort",
      () => controller.abort(),
      {
        once: true,
      }
    );

  }


  saveState({

    entityKey,

    status: "STARTING",

    percent: 0,

    phase: "STARTING",

    report: null,

    error: "",

  });


  fetch(
    "/api/v1/reports/generate",
    {
      method: "POST",

      headers: {
        "Content-Type":
          "application/json",

        Authorization:
          `Bearer ${token}`,
      },

      body: JSON.stringify({
        entity_key: entityKey,
      }),

      signal: controller.signal,

    }
  )

    .then(async (response) => {

      if (!response.ok) {

        const message =
          await response.text();

        throw new Error(
          message ||
          `HTTP ${response.status}`
        );

      }


      if (!response.body) {

        throw new Error(
          "Server returned an empty stream."
        );

      }


      const reader =
        response.body.getReader();

      const decoder =
        new TextDecoder();

      let buffer = "";


      while (true) {

        const {
          value,
          done,
        } = await reader.read();


        if (done) {
          break;
        }


        buffer += decoder.decode(
          value,
          {
            stream: true,
          }
        );


        const events =
          buffer.split(
            /\r?\n\r?\n/
          );


        buffer =
          events.pop() || "";


        for (
          const raw of events
        ) {

          const eventMatch =
            raw.match(
              /^event:\s*(.+)$/m
            );


          const dataMatch =
            raw.match(
              /^data:\s*(.+)$/m
            );


          const event =
            eventMatch?.[1] ||
            "message";


          const dataText =
            dataMatch?.[1] ||
            "{}";


          try {

            const data =
              JSON.parse(
                dataText
              );


            // ------------------------------------------------
            // Persist process state.
            // ------------------------------------------------

            if (
              event === "progress"
            ) {

              saveState({

                ...(getDossierState() || {}),

                entityKey,

                status:
                  data.phase ||
                  "PROCESSING",

                percent:
                  data.percent ??
                  0,

                phase:
                  data.phase ||
                  "PROCESSING",

              });

            }


            else if (
              event === "chunk"
            ) {

              const current =
                getDossierState() ||
                {};


              saveState({

                ...current,

                entityKey,

                status:
                  "AI ASSESSMENT",

                percent:
                  data.percent ??
                  current.percent ??
                  0,

                phase:
                  "AI ASSESSMENT",

                report: {

                  ...(current.report ||
                    {}),

                  summary:
                    (
                      current.report
                        ?.summary ||
                      ""
                    ) +
                    (
                      data.text ||
                      ""
                    ),

                },

              });

            }


            else if (
              event === "complete"
            ) {

              saveState({

                entityKey,

                status:
                  "COMPLETE",

                percent:
                  100,

                phase:
                  "COMPLETE",

                report:
                  data,

                error:
                  "",

              });

            }


            else if (
              event === "error"
            ) {

              saveState({

                ...(getDossierState() ||
                  {}),

                entityKey,

                status:
                  "FAILED",

                error:
                  data.message ||
                  "Report generation failed.",

              });

            }


            if (onEvent) {

              onEvent(
                event,
                data
              );

            }

          } catch (error) {

            console.error(
              "SSE JSON ERROR:",
              error,
              raw
            );

          }

        }

      }

    })

    .catch((error) => {

      if (
        error.name !==
        "AbortError"
      ) {

        const message =
          error.message ||
          "Report generation failed.";


        saveState({

          ...(getDossierState() ||
            {}),

          entityKey,

          status:
            "FAILED",

          error:
            message,

        });


        if (onEvent) {

          onEvent(
            "error",
            {
              message,
            }
          );

        }

      }

    });


  // IMPORTANT:
  //
  // We intentionally DO NOT automatically abort
  // this request when AIReport unmounts.
  //
  // Therefore:
  //
  // AI Report
  //     ↓
  // Dashboard
  //     ↓
  // Knowledge Graph
  //
  // The backend report continues running.

  return () => {
    // Intentionally empty.
  };

}