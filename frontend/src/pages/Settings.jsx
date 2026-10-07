import { useEffect, useState } from "react";

export default function Settings() {

  const [apiStatus, setApiStatus] = useState("CHECKING");

  useEffect(() => {

    const checkBackend = async () => {

      try {

        const response = await fetch("/api/v1/health");

        if (response.ok) {
          setApiStatus("ONLINE");
        } else {
          setApiStatus("DEGRADED");
        }

      } catch {

        setApiStatus("OFFLINE");

      }

    };

    checkBackend();

  }, []);


  const statusClass = (status) => {

    if (status === "ONLINE") {
      return "text-green-400";
    }

    if (status === "OFFLINE") {
      return "text-red-400";
    }

    return "text-yellow-400";

  };


  return (

    <div className="space-y-4">

      {/* ======================================================
          HEADER
      ====================================================== */}

      <div>

        <div className="eyebrow">
          SYSTEM / CONFIGURATION
        </div>

        <h1 className="text-xl text-white font-mono">
          SYSTEM SETTINGS
        </h1>

        <div className="text-xs text-slate-500 mt-1">
          Vigilant platform configuration, service status and
          operational controls.
        </div>

      </div>


      {/* ======================================================
          SYSTEM STATUS
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line flex items-center justify-between">

          <div className="font-mono text-xs text-slate-300">
            SYSTEM STATUS
          </div>

          <div className="font-mono text-[9px] text-slate-600">
            VIGILANT CORE
          </div>

        </div>


        <div className="grid grid-cols-4 gap-3 p-3">

          <div className="border border-line p-3">

            <div className="text-[9px] text-slate-600 font-mono">
              BACKEND API
            </div>

            <div
              className={`mt-2 text-xs font-mono ${statusClass(apiStatus)}`}
            >
              ● {apiStatus}
            </div>

          </div>


          <div className="border border-line p-3">

            <div className="text-[9px] text-slate-600 font-mono">
              AUTHENTICATION
            </div>

            <div className="mt-2 text-xs text-green-400 font-mono">
              ● ACTIVE
            </div>

          </div>


          <div className="border border-line p-3">

            <div className="text-[9px] text-slate-600 font-mono">
              KNOWLEDGE GRAPH
            </div>

            <div className="mt-2 text-xs text-green-400 font-mono">
              ● CONNECTED
            </div>

          </div>


          <div className="border border-line p-3">

            <div className="text-[9px] text-slate-600 font-mono">
              DATABASE
            </div>

            <div className="mt-2 text-xs text-green-400 font-mono">
              ● AVAILABLE
            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          AI CONFIGURATION
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line">

          <div className="font-mono text-xs text-slate-300">
            AI CONFIGURATION
          </div>

        </div>


        <div className="divide-y divide-line">

          <div className="p-4 flex items-center justify-between">

            <div>

              <div className="text-xs text-slate-300 font-mono">
                INTELLIGENCE ENGINE
              </div>

              <div className="text-[9px] text-slate-600 mt-1">
                Primary language model used for intelligence
                analysis and report generation.
              </div>

            </div>

            <div className="text-[10px] text-blue-400 font-mono">
              GEMINI
            </div>

          </div>


          <div className="p-4 flex items-center justify-between">

            <div>

              <div className="text-xs text-slate-300 font-mono">
                REPORT GENERATION
              </div>

              <div className="text-[9px] text-slate-600 mt-1">
                Evidence-backed target dossier generation.
              </div>

            </div>

            <div className="text-[10px] text-green-400 font-mono">
              ENABLED
            </div>

          </div>


          <div className="p-4 flex items-center justify-between">

            <div>

              <div className="text-xs text-slate-300 font-mono">
                ENTITY EXTRACTION
              </div>

              <div className="text-[9px] text-slate-600 mt-1">
                PERSON, ORGANIZATION, LOCATION and temporal
                entity extraction.
              </div>

            </div>

            <div className="text-[10px] text-green-400 font-mono">
              ENABLED
            </div>

          </div>


          <div className="p-4 flex items-center justify-between">

            <div>

              <div className="text-xs text-slate-300 font-mono">
                RELATIONSHIP EXTRACTION
              </div>

              <div className="text-[9px] text-slate-600 mt-1">
                AI-assisted relationship discovery between
                extracted entities.
              </div>

            </div>

            <div className="text-[10px] text-green-400 font-mono">
              ENABLED
            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          INTELLIGENCE PIPELINE
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line">

          <div className="font-mono text-xs text-slate-300">
            INTELLIGENCE PIPELINE
          </div>

        </div>


        <div className="grid grid-cols-5 gap-0 p-4">

          {[
            "DOCUMENT",
            "EXTRACTION",
            "RESOLUTION",
            "GRAPH",
            "ANALYSIS",
          ].map((stage, index) => (

            <div
              key={stage}
              className="relative"
            >

              <div className="border border-line p-3">

                <div className="text-[9px] text-slate-600 font-mono">
                  0{index + 1}
                </div>

                <div className="mt-2 text-[10px] text-slate-300 font-mono">
                  {stage}
                </div>

                <div className="mt-2 text-[8px] text-green-400 font-mono">
                  READY
                </div>

              </div>

              {index < 4 && (

                <div className="absolute top-1/2 right-0 translate-x-1/2 w-2 border-t border-blue-500/30" />

              )}

            </div>

          ))}

        </div>

      </div>


      {/* ======================================================
          KNOWLEDGE INFRASTRUCTURE
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line">

          <div className="font-mono text-xs text-slate-300">
            KNOWLEDGE INFRASTRUCTURE
          </div>

        </div>


        <div className="grid grid-cols-2 gap-x-8">

          <div className="p-4 border-b border-line">

            <div className="text-[9px] text-slate-600 font-mono">
              GRAPH DATABASE
            </div>

            <div className="mt-1 text-xs text-slate-300 font-mono">
              NEO4J
            </div>

            <div className="mt-1 text-[9px] text-green-400 font-mono">
              CONNECTED
            </div>

          </div>


          <div className="p-4 border-b border-line">

            <div className="text-[9px] text-slate-600 font-mono">
              RELATIONAL DATABASE
            </div>

            <div className="mt-1 text-xs text-slate-300 font-mono">
              POSTGRESQL
            </div>

            <div className="mt-1 text-[9px] text-green-400 font-mono">
              CONNECTED
            </div>

          </div>


          <div className="p-4">

            <div className="text-[9px] text-slate-600 font-mono">
              GRAPH API
            </div>

            <div className="mt-1 text-xs text-blue-400 font-mono">
              /api/v1/graph/*
            </div>

          </div>


          <div className="p-4">

            <div className="text-[9px] text-slate-600 font-mono">
              REPORT API
            </div>

            <div className="mt-1 text-xs text-blue-400 font-mono">
              /api/v1/reports/*
            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          SECURITY
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line">

          <div className="font-mono text-xs text-slate-300">
            SECURITY & ACCESS
          </div>

        </div>


        <div className="divide-y divide-line">

          <div className="p-4 flex justify-between">

            <div>

              <div className="text-xs text-slate-300 font-mono">
                AUTHENTICATION
              </div>

              <div className="text-[9px] text-slate-600 mt-1">
                Token-based authenticated API access.
              </div>

            </div>

            <div className="text-[10px] text-blue-400 font-mono">
              JWT / BEARER
            </div>

          </div>


          <div className="p-4 flex justify-between">

            <div>

              <div className="text-xs text-slate-300 font-mono">
                SESSION
              </div>

              <div className="text-[9px] text-slate-600 mt-1">
                Current browser authentication session.
              </div>

            </div>

            <div className="text-[10px] text-green-400 font-mono">
              AUTHENTICATED
            </div>

          </div>


          <div className="p-4 flex justify-between">

            <div>

              <div className="text-xs text-slate-300 font-mono">
                API ACCESS
              </div>

              <div className="text-[9px] text-slate-600 mt-1">
                Protected intelligence and graph endpoints.
              </div>

            </div>

            <div className="text-[10px] text-green-400 font-mono">
              PROTECTED
            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          SYSTEM ROUTES
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line">

          <div className="font-mono text-xs text-slate-300">
            SYSTEM ROUTES
          </div>

        </div>


        <div className="p-4 space-y-2 font-mono">

          <div className="flex justify-between">

            <span className="text-[9px] text-slate-600">
              AUTH
            </span>

            <span className="text-[9px] text-slate-400">
              /api/v1/auth/*
            </span>

          </div>


          <div className="flex justify-between">

            <span className="text-[9px] text-slate-600">
              DOCUMENTS
            </span>

            <span className="text-[9px] text-slate-400">
              /api/v1/documents/*
            </span>

          </div>


          <div className="flex justify-between">

            <span className="text-[9px] text-slate-600">
              GRAPH
            </span>

            <span className="text-[9px] text-slate-400">
              /api/v1/graph/*
            </span>

          </div>


          <div className="flex justify-between">

            <span className="text-[9px] text-slate-600">
              REPORTS
            </span>

            <span className="text-[9px] text-slate-400">
              /api/v1/reports/*
            </span>

          </div>


          <div className="flex justify-between">

            <span className="text-[9px] text-slate-600">
              USERS
            </span>

            <span className="text-[9px] text-slate-400">
              /api/v1/users/*
            </span>

          </div>

        </div>

      </div>


      {/* ======================================================
          ENVIRONMENT
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line">

          <div className="font-mono text-xs text-slate-300">
            ENVIRONMENT
          </div>

        </div>


        <div className="grid grid-cols-3 gap-3 p-3">

          <div className="border border-line p-3">

            <div className="text-[9px] text-slate-600 font-mono">
              PLATFORM
            </div>

            <div className="mt-2 text-xs text-slate-300 font-mono">
              VIGILANT
            </div>

          </div>


          <div className="border border-line p-3">

            <div className="text-[9px] text-slate-600 font-mono">
              MODE
            </div>

            <div className="mt-2 text-xs text-blue-400 font-mono">
              DEVELOPMENT
            </div>

          </div>


          <div className="border border-line p-3">

            <div className="text-[9px] text-slate-600 font-mono">
              API
            </div>

            <div className="mt-2 text-xs text-slate-300 font-mono">
              PORT 8100
            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          SYSTEM INFORMATION
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line">

          <div className="font-mono text-xs text-slate-300">
            SYSTEM INFORMATION
          </div>

        </div>


        <div className="p-4 space-y-2">

          <div className="flex justify-between">

            <span className="text-[9px] text-slate-600 font-mono">
              PLATFORM
            </span>

            <span className="text-[9px] text-slate-400 font-mono">
              VIGILANT INTELLIGENCE PLATFORM
            </span>

          </div>


          <div className="flex justify-between">

            <span className="text-[9px] text-slate-600 font-mono">
              ARCHITECTURE
            </span>

            <span className="text-[9px] text-slate-400 font-mono">
              REACT / FASTAPI / POSTGRESQL / NEO4J
            </span>

          </div>


          <div className="flex justify-between">

            <span className="text-[9px] text-slate-600 font-mono">
              INTERFACE
            </span>

            <span className="text-[9px] text-slate-400 font-mono">
              TACTICAL ANALYTICAL WORKSPACE
            </span>

          </div>

        </div>

      </div>


      {/* ======================================================
          FOOTER
      ====================================================== */}

      <div className="flex justify-between px-1 pb-4">

        <div className="text-[8px] text-slate-700 font-mono">
          VIGILANT INTELLIGENCE PLATFORM
        </div>

        <div className="text-[8px] text-slate-700 font-mono">
          SYSTEM CONFIGURATION
        </div>

      </div>

    </div>

  );

}