import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    getGeospatial,
    getNodes,
    getRelationships,
} from "../api/graph";

import {
    useProcess,
} from "../context/ProcessContext";


function StatCard({
  label,
  value,
  detail,
}) {

  return (

    <div className="panel p-4">

      <div className="label">
        {label}
      </div>

      <div className="text-2xl text-white font-mono mt-2">
        {value}
      </div>

      {detail && (

        <div className="text-[9px] text-slate-600 font-mono mt-2">
          {detail}
        </div>

      )}

    </div>

  );
}


function StatusDot({
  active = false,
  failed = false,
}) {

  return (

    <span
      className={`inline-block w-2 h-2 rounded-full ${
        failed
          ? "bg-red-400"
          : active
          ? "bg-blue-400 animate-pulse"
          : "bg-green-400"
      }`}
    />

  );
}


function ProcessRow({
  document,
}) {

  const progress =
    document.status === "UPLOADED"
      ? 10
      : document.status === "EXTRACTING"
      ? 35
      : document.status === "AI_ANALYSIS"
      ? 70
      : 100;


  return (

    <div className="border-b border-line py-3 last:border-b-0">

      <div className="flex items-center justify-between">

        <div className="flex items-center gap-2 min-w-0">

          <StatusDot active />

          <span className="text-xs text-slate-300 truncate">
            {document.filename}
          </span>

        </div>


        <span className="text-[9px] text-blue-400 font-mono">
          {document.status}
        </span>

      </div>


      <div className="mt-2 h-1 bg-slate-900">

        <div
          className="h-full bg-blue-400 transition-all duration-700"
          style={{
            width: `${progress}%`,
          }}
        />

      </div>


      <div className="flex justify-between mt-1">

        <span className="text-[8px] text-slate-600 font-mono">
          DOCUMENT {document.id}
        </span>

        <span className="text-[8px] text-slate-600 font-mono">
          {progress}%
        </span>

      </div>

    </div>

  );
}


export default function Dashboard() {

  const {
    documents,
    activeDocuments,
    processedDocuments,
    failedDocuments,
    loading,
    lastUpdated,
  } = useProcess();


  const [
    nodes,
    setNodes,
  ] = useState([]);


  const [
    relationships,
    setRelationships,
  ] = useState([]);


  const [
    geoPoints,
    setGeoPoints,
  ] = useState([]);


  const [
    graphLoading,
    setGraphLoading,
  ] = useState(true);


  const loadGraphData = async () => {

    try {

      const [
        nodesResponse,
        relationshipsResponse,
        geoResponse,
      ] = await Promise.all([

        getNodes(),

        getRelationships(),

        getGeospatial(),

      ]);


      setNodes(
        nodesResponse.data?.nodes || []
      );

      setRelationships(
        relationshipsResponse.data?.relationships || []
      );

      setGeoPoints(
        geoResponse.data?.points || []
      );

    } catch (error) {

      console.error(
        "DASHBOARD GRAPH ERROR:",
        error
      );

    } finally {

      setGraphLoading(false);

    }

  };


  useEffect(() => {

    loadGraphData();


    const interval =
      setInterval(
        loadGraphData,
        3000
      );


    return () =>
      clearInterval(
        interval
      );

  }, []);


  const recentDocuments =
    useMemo(
      () =>
        [...documents]
          .sort(
            (a, b) =>
              new Date(
                b.created_at || 0
              ) -
              new Date(
                a.created_at || 0
              )
          )
          .slice(0, 5),
      [documents]
    );


  return (

    <div className="space-y-4">

      {/* HEADER */}

      <div className="flex items-end justify-between">

        <div>

          <div className="eyebrow">
            OPERATIONS / DASHBOARD
          </div>

          <h1 className="text-xl text-white font-mono">
            INTELLIGENCE OPERATIONS
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Live overview of document ingestion, graph intelligence and GEOINT.
          </p>

        </div>


        <div className="text-[9px] text-slate-600 font-mono">

          {lastUpdated
            ? `LAST SYNC ${lastUpdated.toLocaleTimeString()}`
            : "SYNCING..."}

        </div>

      </div>


      {/* TOP STATS */}

      <div className="grid grid-cols-4 gap-3">

        <StatCard
          label="DOCUMENTS"
          value={documents.length}
          detail="SOURCE REGISTER"
        />


        <StatCard
          label="PROCESSED"
          value={
            processedDocuments.length
          }
          detail="AI PIPELINE COMPLETE"
        />


        <StatCard
          label="ENTITIES"
          value={
            graphLoading
              ? "..."
              : nodes.length
          }
          detail="KNOWLEDGE GRAPH"
        />


        <StatCard
          label="RELATIONSHIPS"
          value={
            graphLoading
              ? "..."
              : relationships.length
          }
          detail="GRAPH LINKS"
        />

      </div>


      {/* SECONDARY STATUS */}

      <div className="grid grid-cols-3 gap-3">

        <div className="panel p-3">

          <div className="label">
            ACTIVE PROCESSES
          </div>

          <div className="flex items-center gap-2 mt-2">

            <StatusDot
              active={
                activeDocuments.length > 0
              }
            />

            <span className="text-lg text-white font-mono">
              {activeDocuments.length}
            </span>

            <span className="text-[9px] text-slate-600 font-mono">
              RUNNING
            </span>

          </div>

        </div>


        <div className="panel p-3">

          <div className="label">
            GEOREFERENCED
          </div>

          <div className="flex items-center gap-2 mt-2">

            <span className="text-lg text-white font-mono">
              {geoPoints.length}
            </span>

            <span className="text-[9px] text-slate-600 font-mono">
              LOCATIONS
            </span>

          </div>

        </div>


        <div className="panel p-3">

          <div className="label">
            SYSTEM
          </div>

          <div className="flex items-center gap-2 mt-2">

            <StatusDot />

            <span className="text-lg text-green-400 font-mono">
              ONLINE
            </span>

          </div>

        </div>

      </div>


      {/* MAIN OPERATIONS GRID */}

      <div className="grid grid-cols-2 gap-3">

        {/* ACTIVE PROCESSING */}

        <div className="panel">

          <div className="border-b border-line p-3 flex items-center justify-between">

            <div className="font-mono text-xs text-slate-300">
              ACTIVE PROCESSING
            </div>

            <div className="text-[9px] text-slate-600 font-mono">
              LIVE
            </div>

          </div>


          <div className="p-3">

            {activeDocuments.length === 0 ? (

              <div className="py-8 text-center">

                <div className="text-green-400 font-mono text-xs">
                  ● NO ACTIVE PROCESSES
                </div>

                <div className="text-[9px] text-slate-600 font-mono mt-2">
                  DOCUMENT PIPELINE IDLE
                </div>

              </div>

            ) : (

              activeDocuments.map(
                (document) => (

                  <ProcessRow
                    key={
                      document.id
                    }
                    document={
                      document
                    }
                  />

                )
              )

            )}

          </div>

        </div>


        {/* SYSTEM ACTIVITY */}

        <div className="panel">

          <div className="border-b border-line p-3">

            <div className="font-mono text-xs text-slate-300">
              SYSTEM ACTIVITY
            </div>

          </div>


          <div className="p-3 space-y-3">

            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <StatusDot />

                <span className="text-xs text-slate-400">
                  POSTGRESQL
                </span>

              </div>

              <span className="text-[9px] text-green-400 font-mono">
                ONLINE
              </span>

            </div>


            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <StatusDot />

                <span className="text-xs text-slate-400">
                  NEO4J
                </span>

              </div>

              <span className="text-[9px] text-green-400 font-mono">
                ONLINE
              </span>

            </div>


            <div className="flex items-center justify-between">

              <div className="flex items-center gap-2">

                <StatusDot />

                <span className="text-xs text-slate-400">
                  AI ANALYSIS
                </span>

              </div>

              <span className="text-[9px] text-green-400 font-mono">
                READY
              </span>

            </div>


            <div className="border-t border-line pt-3">

              <div className="text-[9px] text-slate-600 font-mono">
                PIPELINE HEALTH
              </div>

              <div className="text-sm text-white font-mono mt-1">
                {failedDocuments.length === 0
                  ? "NOMINAL"
                  : `${failedDocuments.length} FAILED`}
              </div>

            </div>

          </div>

        </div>

      </div>


      {/* GEOINT */}

      <div className="panel">

        <div className="border-b border-line p-3 flex items-center justify-between">

          <div className="font-mono text-xs text-slate-300">
            GEOINT ACTIVITY
          </div>

          <div className="text-[9px] text-slate-600 font-mono">
            {geoPoints.length} GEOREFERENCED
          </div>

        </div>


        <div className="p-4">

          {geoPoints.length === 0 ? (

            <div className="py-8 text-center">

              <div className="text-xs text-slate-500 font-mono">
                NO GEOREFERENCED LOCATIONS
              </div>

              <div className="text-[9px] text-slate-700 font-mono mt-2">
                LOCATION INTELLIGENCE WILL APPEAR HERE
              </div>

            </div>

          ) : (

            <div className="grid grid-cols-3 gap-3">

              {geoPoints
                .slice(0, 6)
                .map(
                  (point, index) => (

                    <div
                      key={`${point.entity_id}-${index}`}
                      className="border border-line p-3 bg-black/20"
                    >

                      <div className="flex items-center gap-2">

                        <span className="w-2 h-2 rounded-full bg-blue-400" />

                        <span className="text-xs text-slate-300 font-mono truncate">
                          {point.name}
                        </span>

                      </div>


                      <div className="text-[9px] text-slate-600 font-mono mt-2">

                        {point.city ||
                          point.state ||
                          point.country ||
                          point.location_name ||
                          "LOCATION"}

                      </div>


                      <div className="text-[8px] text-slate-700 font-mono mt-2">

                        {Number(
                          point.latitude
                        ).toFixed(4)}

                        {" / "}

                        {Number(
                          point.longitude
                        ).toFixed(4)}

                      </div>

                    </div>

                  )
                )}

            </div>

          )}

        </div>

      </div>


      {/* RECENT DOCUMENTS */}

      <div className="panel">

        <div className="border-b border-line p-3 flex items-center justify-between">

          <div className="font-mono text-xs text-slate-300">
            RECENT DOCUMENTS
          </div>

          <div className="text-[9px] text-slate-600 font-mono">
            {documents.length} TOTAL
          </div>

        </div>


        {recentDocuments.length === 0 ? (

          <div className="p-8 text-center text-xs text-slate-600 font-mono">
            NO DOCUMENT ACTIVITY
          </div>

        ) : (

          recentDocuments.map(
            (document) => (

              <div
                key={document.id}
                className="p-3 border-b border-line last:border-b-0 flex items-center justify-between"
              >

                <div>

                  <div className="text-xs text-slate-300">
                    {document.filename}
                  </div>

                  <div className="text-[9px] text-slate-600 font-mono mt-1">
                    DOCUMENT ID:
                    {" "}
                    {document.id}
                  </div>

                </div>


                <div
                  className={`text-[9px] font-mono ${
                    document.status ===
                    "PROCESSED"
                      ? "text-green-400"
                      : document.status ===
                        "FAILED"
                      ? "text-red-400"
                      : "text-blue-400"
                  }`}
                >

                  {document.status}

                </div>

              </div>

            )
          )

        )}

      </div>

    </div>

  );
}