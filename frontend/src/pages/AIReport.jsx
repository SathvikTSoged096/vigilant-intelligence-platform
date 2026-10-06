import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getNodes,
} from "../api/graph";

import {
  getDossierState,
  streamDossier,
} from "../api/reports";


function Section({
  title,
  children,
}) {

  return (

    <div className="panel">

      <div className="p-3 border-b border-line">

        <div className="text-[9px] text-slate-500 font-mono">
          {title}
        </div>

      </div>

      <div className="p-4">

        {children}

      </div>

    </div>

  );

}


function EntityList({
  title,
  items = [],
}) {

  return (

    <div>

      <div className="text-[9px] text-slate-600 font-mono mb-2">
        {title}
      </div>


      {items.length === 0 ? (

        <div className="text-[10px] text-slate-700 font-mono">
          NONE IDENTIFIED
        </div>

      ) : (

        <div className="space-y-1">

          {items.map(
            (item, index) => (

              <div
                key={
                  item.entity_key ||
                  item.key ||
                  item.id ||
                  `${item.name}-${index}`
                }
                className="border border-line bg-black/20 p-2"
              >

                <div className="text-xs text-slate-300 font-mono">
                  {item.name ||
                    item.target_name ||
                    "UNKNOWN"}
                </div>

                {item.type && (

                  <div className="text-[8px] text-slate-600 font-mono mt-1">
                    {item.type}
                  </div>

                )}

                {item.relationship && (

                  <div className="text-[8px] text-blue-400 font-mono mt-1">
                    {item.relationship}
                  </div>

                )}

              </div>

            )
          )}

        </div>

      )}

    </div>

  );

}


export default function AIReport() {

  const [nodes, setNodes] =
    useState([]);

  const [entityKey, setEntityKey] =
    useState("");

  const [report, setReport] =
    useState(null);

  const [status, setStatus] =
    useState("IDLE");

  const [error, setError] =
    useState("");

  const [loadingNodes, setLoadingNodes] =
    useState(true);


  // ------------------------------------------------------------
  // Load graph entities
  // ------------------------------------------------------------

  useEffect(() => {

    let mounted = true;


    const loadNodes = async () => {

      try {

        const response =
          await getNodes();

        const graphNodes =
          response.data?.nodes || [];


        if (!mounted) {
          return;
        }


        setNodes(
          graphNodes
        );


        const saved =
          getDossierState();


        if (saved?.entityKey) {

          setEntityKey(
            saved.entityKey
          );

        }

        else if (
          graphNodes.length > 0
        ) {

          setEntityKey(
            graphNodes[0]
              .entity_key || ""
          );

        }


        if (saved) {

          setStatus(
            saved.status ||
            "IDLE"
          );

          setReport(
            saved.report ||
            null
          );

          setError(
            saved.error ||
            ""
          );

        }


      } catch (error) {

        console.error(
          "ENTITY LOAD ERROR:",
          error
        );


        if (mounted) {

          setError(
            error.response?.data?.detail ||
            error.message ||
            "Unable to load entities."
          );

        }

      } finally {

        if (mounted) {

          setLoadingNodes(
            false
          );

        }

      }

    };


    loadNodes();


    return () => {

      mounted = false;

    };

  }, []);


  // ------------------------------------------------------------
  // Selected node
  // ------------------------------------------------------------

  const selectedNode =
    useMemo(() => {

      return nodes.find(
        node =>
          String(
            node.entity_key
          ) ===
          String(
            entityKey
          )
      );

    }, [
      nodes,
      entityKey,
    ]);


  // ------------------------------------------------------------
  // Generate report
  // ------------------------------------------------------------

  const generateReport = () => {

    if (!entityKey) {
      return;
    }


    setReport(null);

    setError("");

    setStatus(
      "STARTING"
    );


    streamDossier(

      entityKey,

      (event, data) => {

        console.log(
          "REPORT EVENT:",
          event,
          data
        );


        if (
          event ===
          "progress"
        ) {

          setStatus(
            `${data.phase || "PROCESSING"} ${
              data.percent ?? ""
            }%`
          );

        }


        else if (
          event ===
          "chunk"
        ) {

          setReport(
            current => ({

              ...(current || {}),

              target_name:
                current?.target_name ||
                selectedNode?.name,

              target_type:
                current?.target_type ||
                selectedNode?.type,

              summary:
                (
                  current?.summary ||
                  ""
                ) +
                (
                  data.text ||
                  ""
                ),

            })
          );

        }


        else if (
          event ===
          "complete"
        ) {

          setReport(
            data
          );

          setStatus(
            "COMPLETE"
          );

        }


        else if (
          event ===
          "error"
        ) {

          setError(
            data.message ||
            "Report generation failed."
          );

          setStatus(
            "FAILED"
          );

        }

      }

    );

  };


  const associations =
    report?.associations || {};


  const network =
    report?.network_signals || {};


  return (

    <div className="space-y-4">

      {/* HEADER */}

      <div>

        <div className="eyebrow">
          AI ANALYSIS
        </div>

        <h1 className="text-xl text-white font-mono">
          INTELLIGENCE DOSSIER
        </h1>

        <div className="text-xs text-slate-500 mt-1">
          Evidence-based AI analysis of graph entities.
        </div>

      </div>


      {/* TARGET SELECTOR */}

      <div className="panel p-4">

        <div className="text-[9px] text-slate-500 font-mono mb-2">
          TARGET ENTITY
        </div>


        <div className="flex gap-2">

          <select

            className="input-tactical flex-1"

            value={
              entityKey
            }

            onChange={event => {

              setEntityKey(
                event.target.value
              );

              setReport(
                null
              );

              setError(
                ""
              );

              setStatus(
                "IDLE"
              );

            }}

            disabled={
              loadingNodes
            }

          >

            {loadingNodes && (

              <option value="">
                LOADING ENTITIES...
              </option>

            )}


            {!loadingNodes &&
              nodes.length === 0 && (

                <option value="">
                  NO ENTITIES AVAILABLE
                </option>

              )}


            {nodes.map(node => (

              <option

                key={
                  node.entity_key ||
                  node.id
                }

                value={
                  node.entity_key
                }

              >

                {node.name}
                {" — "}
                {node.type}

              </option>

            ))}

          </select>


          <button

            className="btn-primary"

            onClick={
              generateReport
            }

            disabled={
              !entityKey ||
              status.includes(
                "PROCESSING"
              ) ||
              status.includes(
                "ASSESSMENT"
              )
            }

          >

            GENERATE DOSSIER

          </button>

        </div>


        {selectedNode && (

          <div className="mt-3 text-[9px] text-slate-500 font-mono">

            ENTITY KEY:
            {" "}
            {selectedNode.entity_key}

            {" | "}

            TYPE:
            {" "}
            {selectedNode.type}

            {" | "}

            NETWORK DEGREE:
            {" "}
            {selectedNode.degree ?? 0}

          </div>

        )}

      </div>


      {/* ERROR */}

      {error && (

        <div className="border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400 font-mono">

          REPORT ERROR:
          {" "}
          {error}

        </div>

      )}


      {/* STATUS */}

      <div className="panel p-3 flex justify-between">

        <div className="label">

          STATUS:
          {" "}
          {status}

        </div>


        {report && (

          <div className="font-mono text-[9px] text-green-500">

            EVIDENCE-BASED ANALYSIS

          </div>

        )}

      </div>


      {/* TARGET PROFILE */}

      {report && (

        <Section title="TARGET PROFILE">

          <div className="grid grid-cols-4 gap-4">

            <div>

              <div className="text-[8px] text-slate-600 font-mono">
                NAME
              </div>

              <div className="text-sm text-white font-mono mt-1">
                {report.target_name}
              </div>

            </div>


            <div>

              <div className="text-[8px] text-slate-600 font-mono">
                TYPE
              </div>

              <div className="text-sm text-blue-400 font-mono mt-1">
                {report.target_type}
              </div>

            </div>


            <div>

              <div className="text-[8px] text-slate-600 font-mono">
                NETWORK SCORE
              </div>

              <div className="text-2xl text-amber-400 font-mono mt-1">
                {report.network_score ??
                  report.threat_score ??
                  "—"}
                <span className="text-xs text-slate-600">
                  /100
                </span>
              </div>

            </div>


            <div>

              <div className="text-[8px] text-slate-600 font-mono">
                CONNECTIONS
              </div>

              <div className="text-2xl text-white font-mono mt-1">
                {network.connected_entities ??
                  report.neighbors?.length ??
                  0}
              </div>

            </div>

          </div>

        </Section>

      )}


      {/* ASSOCIATIONS */}

      {report && (

        <Section title="KNOWN ASSOCIATIONS">

          <div className="grid grid-cols-2 gap-5">

            <EntityList
              title="PEOPLE"
              items={
                associations.people
              }
            />


            <EntityList
              title="ORGANIZATIONS"
              items={
                associations.organizations
              }
            />


            <EntityList
              title="LOCATIONS"
              items={
                associations.locations
              }
            />


            <EntityList
              title="IDENTIFIERS"
              items={
                associations.identifiers
              }
            />

          </div>

        </Section>

      )}


      {/* NETWORK */}

      {report && (

        <Section title="NETWORK ANALYSIS">

          <div className="grid grid-cols-3 gap-3">

            <div className="border border-line p-3">

              <div className="text-[8px] text-slate-600 font-mono">
                DEGREE CENTRALITY
              </div>

              <div className="text-xl text-blue-400 font-mono mt-2">
                {
                  network.degree_centrality ??
                  "—"
                }
              </div>

            </div>


            <div className="border border-line p-3">

              <div className="text-[8px] text-slate-600 font-mono">
                BETWEENNESS
              </div>

              <div className="text-xl text-purple-400 font-mono mt-2">
                {
                  network.betweenness_centrality ??
                  "—"
                }
              </div>

            </div>


            <div className="border border-line p-3">

              <div className="text-[8px] text-slate-600 font-mono">
                CONNECTED ENTITIES
              </div>

              <div className="text-xl text-green-400 font-mono mt-2">
                {
                  network.connected_entities ??
                  report.neighbors?.length ??
                  0
                }
              </div>

            </div>

          </div>

        </Section>

      )}


      {/* SOURCE EVIDENCE */}

      {report && (

        <Section title="SOURCE EVIDENCE">

          {report.evidence?.length ? (

            <div className="space-y-2">

              {report.evidence.map(
                (item, index) => (

                  <div
                    key={index}
                    className="border border-line bg-black/20 p-3"
                  >

                    <div className="text-[9px] text-blue-400 font-mono mb-2">

                      EVIDENCE {String(
                        index + 1
                      ).padStart(2, "0")}

                    </div>

                    <pre className="whitespace-pre-wrap text-[10px] text-slate-400 leading-relaxed">

                      {typeof item === "string"
                        ? item
                        : JSON.stringify(
                            item,
                            null,
                            2
                          )}

                    </pre>

                  </div>

                )
              )}

            </div>

          ) : (

            <div className="text-xs text-slate-600 font-mono">
              NO EXPLICIT EVIDENCE AVAILABLE
            </div>

          )}

        </Section>

      )}


      {/* AI ASSESSMENT */}

      {report && (

        <Section title="AI ASSESSMENT">

          <pre className="whitespace-pre-wrap text-xs text-slate-300 leading-relaxed">

            {report.summary ||
              "Generating assessment..."}

          </pre>

        </Section>

      )}


      {/* PROCESSING */}

      {!report &&
        status !== "IDLE" &&
        status !== "FAILED" && (

          <div className="panel p-10 text-center">

            <div className="text-xs text-slate-500 font-mono">
              DOSSIER PROCESSING...
            </div>

            <div className="text-[9px] text-slate-700 font-mono mt-2">
              GRAPH CONTEXT → AI ASSESSMENT → DOSSIER
            </div>

          </div>

        )}


      {/* EMPTY */}

      {!report &&
        status === "IDLE" && (

          <div className="panel p-10 text-center">

            <div className="text-xs text-slate-600 font-mono">
              SELECT AN ENTITY TO GENERATE A DOSSIER
            </div>

          </div>

        )}

    </div>

  );

}