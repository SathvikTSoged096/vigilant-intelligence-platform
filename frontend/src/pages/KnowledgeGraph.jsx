import {
  useEffect,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  getEntityTimeline,
  getGeospatial,
  getNodes,
  getRelationships,
} from "../api/graph";

import Graph from "../components/Graph";
import MapIntelligence from "../components/MapIntelligence";
import Timeline from "../components/Timeline";


export default function KnowledgeGraph() {

  const navigate = useNavigate();


  // ============================================================
  // GRAPH STATE
  // ============================================================

  const [nodes, setNodes] = useState([]);

  const [relationships, setRelationships] =
    useState([]);

  const [points, setPoints] =
    useState([]);


  // ============================================================
  // SELECTED ENTITY
  // ============================================================

  const [selectedNode, setSelectedNode] =
    useState(null);


  // ============================================================
  // TARGET TIMELINE
  // ============================================================

  const [timelineEvents, setTimelineEvents] =
    useState([]);

  const [timelineLoading, setTimelineLoading] =
    useState(false);

  const [timelineError, setTimelineError] =
    useState("");


  // ============================================================
  // GENERAL STATE
  // ============================================================

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");


  // ============================================================
  // LOAD GRAPH
  // ============================================================

  const loadGraph = async () => {

    try {

      setError("");

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


      setPoints(
        geoResponse.data?.points || []
      );


    } catch (error) {

      console.error(
        "GRAPH LOAD ERROR:",
        error
      );


      setError(
        error.response?.data?.detail ||
        error.message ||
        "Unable to load intelligence graph."
      );


    } finally {

      setLoading(false);

    }

  };


  // ============================================================
  // LOAD TARGET TIMELINE
  // ============================================================

  const loadTargetTimeline = async (node) => {

    if (!node?.entity_key) {

      setTimelineEvents([]);

      setTimelineError("");

      return;

    }


    try {

      setTimelineLoading(true);

      setTimelineError("");


      const response =
        await getEntityTimeline(
          node.entity_key
        );


      const events =
        response.data?.events || [];


      setTimelineEvents(events);


    } catch (error) {

      console.error(
        "TARGET TIMELINE ERROR:",
        error
      );


      setTimelineEvents([]);


      setTimelineError(
        error.response?.data?.detail ||
        error.message ||
        "Unable to load target timeline."
      );


    } finally {

      setTimelineLoading(false);

    }

  };


  // ============================================================
  // SELECT ENTITY
  // ============================================================

  const handleNodeSelect = (node) => {

    setSelectedNode(node);

    loadTargetTimeline(node);

  };


  // ============================================================
  // LIVE GRAPH SYNC
  // ============================================================

  useEffect(() => {

    loadGraph();


    const interval =
      setInterval(
        loadGraph,
        3000
      );


    return () =>
      clearInterval(
        interval
      );

  }, []);


  // ============================================================
  // OPEN TARGET DOSSIER
  // ============================================================

  const openTargetDossier = () => {

    if (!selectedNode) return;


    const type =
      String(
        selectedNode.type || ""
      ).toUpperCase();


    if (type !== "PERSON") return;


    if (!selectedNode.entity_key) {

      console.error(
        "Selected PERSON has no entity_key."
      );

      return;

    }


    navigate(
      `/reports?entity=${encodeURIComponent(
        selectedNode.entity_key
      )}`
    );

  };


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="space-y-4">


      {/* ======================================================
          HEADER
      ====================================================== */}

      <div className="flex items-end justify-between">

        <div>

          <div className="eyebrow">
            GRAPH INTELLIGENCE
          </div>


          <h1 className="text-xl text-white font-mono">
            KNOWLEDGE GRAPH
          </h1>


          <div className="text-xs text-slate-500 mt-1">
            Entity relationships, network structure and
            geospatial intelligence.
          </div>

        </div>


        <div className="text-[9px] text-slate-600 font-mono">
          LIVE GRAPH SYNC
        </div>

      </div>


      {/* ======================================================
          ERROR
      ====================================================== */}

      {error && (

        <div className="border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400 font-mono">

          GRAPH ERROR:
          {" "}
          {error}

        </div>

      )}


      {/* ======================================================
          STATISTICS
      ====================================================== */}

      <div className="grid grid-cols-3 gap-3">

        <div className="panel p-3">

          <div className="text-[9px] text-slate-500 font-mono">
            ENTITIES
          </div>

          <div className="text-2xl text-blue-400 font-mono">
            {nodes.length}
          </div>

        </div>


        <div className="panel p-3">

          <div className="text-[9px] text-slate-500 font-mono">
            RELATIONSHIPS
          </div>

          <div className="text-2xl text-blue-400 font-mono">
            {relationships.length}
          </div>

        </div>


        <div className="panel p-3">

          <div className="text-[9px] text-slate-500 font-mono">
            GEO LOCATIONS
          </div>

          <div className="text-2xl text-green-400 font-mono">
            {points.length}
          </div>

        </div>

      </div>


      {/* ======================================================
          KNOWLEDGE GRAPH
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line flex items-center justify-between">

          <div className="font-mono text-xs text-slate-300">
            NETWORK GRAPH
          </div>

          <div className="font-mono text-[9px] text-slate-500">

            {nodes.length}
            {" NODES / "}
            {relationships.length}
            {" EDGES"}

          </div>

        </div>


        {loading ? (

          <div className="h-[650px] flex items-center justify-center">

            <div className="text-xs text-slate-500 font-mono">
              INITIALIZING KNOWLEDGE GRAPH...
            </div>

          </div>

        ) : nodes.length === 0 ? (

          <div className="h-[400px] flex items-center justify-center">

            <div className="text-xs text-slate-600 font-mono">
              NO GRAPH ENTITIES AVAILABLE
            </div>

          </div>

        ) : (

          <Graph
            nodes={nodes}
            relationships={relationships}
            onNodeSelect={handleNodeSelect}
          />

        )}

      </div>


      {/* ======================================================
          SELECTED ENTITY
      ====================================================== */}

      {selectedNode && (

        <div className="panel">

          <div className="p-3 border-b border-line flex items-center justify-between">

            <div className="font-mono text-xs text-slate-300">
              ENTITY ANALYSIS
            </div>


            <button
              type="button"
              onClick={() => {

                setSelectedNode(null);

                setTimelineEvents([]);

                setTimelineError("");

              }}
              className="text-[9px] text-slate-600 hover:text-slate-300 font-mono"
            >
              CLOSE
            </button>

          </div>


          <div className="p-4">


            {/* ==================================================
                ENTITY INFORMATION
            ================================================== */}

            <div className="grid grid-cols-4 gap-4">

              <div>

                <div className="text-[9px] text-slate-600 font-mono">
                  NAME
                </div>

                <div className="text-sm text-white font-mono mt-1">
                  {selectedNode.name}
                </div>

              </div>


              <div>

                <div className="text-[9px] text-slate-600 font-mono">
                  TYPE
                </div>

                <div className="text-sm text-blue-300 font-mono mt-1">
                  {selectedNode.type}
                </div>

              </div>


              <div>

                <div className="text-[9px] text-slate-600 font-mono">
                  DEGREE
                </div>

                <div className="text-sm text-white font-mono mt-1">
                  {selectedNode.degree ?? 0}
                </div>

              </div>


              <div>

                <div className="text-[9px] text-slate-600 font-mono">
                  CONFIDENCE
                </div>

                <div className="text-sm text-white font-mono mt-1">

                  {selectedNode.confidence != null
                    ? `${(
                        Number(
                          selectedNode.confidence
                        ) * 100
                      ).toFixed(0)}%`
                    : "—"}

                </div>

              </div>

            </div>


            {/* ==================================================
                ENTITY KEY
            ================================================== */}

            {selectedNode.entity_key && (

              <div className="mt-4">

                <div className="text-[9px] text-slate-600 font-mono">
                  ENTITY KEY
                </div>

                <div className="mt-1 text-[10px] text-slate-500 font-mono">
                  {selectedNode.entity_key}
                </div>

              </div>

            )}


            {/* ==================================================
                TARGET ACTION
            ================================================== */}

            {String(
              selectedNode.type || ""
            ).toUpperCase() === "PERSON" && (

              <div className="mt-5 pt-4 border-t border-line flex items-center justify-between">

                <div>

                  <div className="text-[9px] text-slate-500 font-mono">
                    TARGET INTELLIGENCE
                  </div>

                  <div className="mt-1 text-[10px] text-slate-600">
                    Generate an evidence-based dossier
                    for this PERSON entity.
                  </div>

                </div>


                <button
                  type="button"
                  onClick={
                    openTargetDossier
                  }
                  className="
                    border
                    border-blue-500/50
                    bg-blue-500/5
                    px-4
                    py-2
                    text-[10px]
                    text-blue-400
                    font-mono
                    hover:bg-blue-500/10
                    hover:border-blue-400
                    transition
                  "
                >
                  OPEN TARGET DOSSIER
                </button>

              </div>

            )}

          </div>

        </div>

      )}


      {/* ======================================================
          TARGET TIMELINE
      ====================================================== */}

      {selectedNode && (

        <div className="panel">

          <div className="p-3 border-b border-line flex items-center justify-between">

            <div className="font-mono text-xs text-slate-300">
              TARGET TIMELINE
            </div>

            <div className="font-mono text-[9px] text-slate-500">

              {String(
                selectedNode.type || ""
              ).toUpperCase()}

            </div>

          </div>


          {timelineLoading ? (

            <div className="p-5 text-xs text-slate-500 font-mono">
              LOADING TARGET TIMELINE...
            </div>

          ) : timelineError ? (

            <div className="p-5 text-xs text-red-400 font-mono">
              TIMELINE ERROR:
              {" "}
              {timelineError}
            </div>

          ) : timelineEvents.length === 0 ? (

            <div className="p-5 text-xs text-slate-600 font-mono">
              NO TEMPORAL EVENTS FOR SELECTED ENTITY
            </div>

          ) : (

            <Timeline
              events={timelineEvents}
            />

          )}

        </div>

      )}


      {/* ======================================================
          GEOINT
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line flex justify-between">

          <div className="font-mono text-xs text-slate-300">
            GEOINT
          </div>

          <div className="font-mono text-[9px] text-slate-500">
            {points.length} LOCATIONS
          </div>

        </div>


        {loading ? (

          <div className="p-6 text-xs text-slate-500 font-mono">
            LOADING GEOSPATIAL INTELLIGENCE...
          </div>

        ) : (

          <MapIntelligence
            points={points}
          />

        )}

      </div>


      {/* ======================================================
          ENTITY REGISTER
      ====================================================== */}

      <div className="panel">

        <div className="p-3 border-b border-line flex justify-between">

          <div className="font-mono text-xs text-slate-300">
            ENTITY REGISTER
          </div>

          <div className="font-mono text-[9px] text-slate-600">
            {nodes.length} ENTITIES
          </div>

        </div>


        {nodes.length === 0 ? (

          <div className="p-5 text-xs text-slate-500">
            No entities found.
          </div>

        ) : (

          nodes
            .slice(0, 100)
            .map((node) => (

              <button
                type="button"
                key={node.id}
                onClick={() =>
                  handleNodeSelect(node)
                }
                className="w-full text-left p-3 border-b border-line flex justify-between hover:bg-white/[0.02] transition"
              >

                <div>

                  <div className="text-xs text-slate-200">
                    {node.name}
                  </div>

                  <div className="text-[9px] text-slate-600 font-mono">
                    {node.type}
                  </div>

                </div>


                <div className="text-[9px] text-blue-400 font-mono">
                  DEGREE{" "}
                  {node.degree}
                </div>

              </button>

            ))

        )}

      </div>


    </div>

  );

}