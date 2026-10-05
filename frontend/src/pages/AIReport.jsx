import { useEffect, useState } from "react";

import {
  getNodes,
} from "../api/graph";

import {
  getDossierState,
  streamDossier,
} from "../api/reports";


export default function AIReport() {

  const [nodes, setNodes] = useState([]);

  const [entityKey, setEntityKey] = useState("");

  const [report, setReport] = useState(null);

  const [status, setStatus] = useState("IDLE");

  const [error, setError] = useState("");

  const [loadingNodes, setLoadingNodes] = useState(true);


  useEffect(() => {

    let mounted = true;

    const loadNodes = async () => {

      try {

        const response = await getNodes();

        const graphNodes =
          response.data?.nodes || [];

        if (!mounted) {
          return;
        }

        setNodes(graphNodes);

        if (graphNodes.length > 0) {

          const firstKey =
            graphNodes[0].entity_key;

          setEntityKey(
            firstKey || ""
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
          setLoadingNodes(false);
        }

      }

    };


    loadNodes();


    // ------------------------------------------------------------
    // Restore an already-running/completed dossier.
    // ------------------------------------------------------------

    const saved =
      getDossierState();

    if (saved) {

      setEntityKey(
        saved.entityKey || ""
      );

      setStatus(
        saved.status || "IDLE"
      );

      setReport(
        saved.report || null
      );

      setError(
        saved.error || ""
      );

    }


    return () => {
      mounted = false;
    };

  }, []);


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


        if (event === "progress") {

          setStatus(
            `${data.phase || "PROCESSING"} ${
              data.percent ?? ""
            }%`
          );

        }


        else if (event === "chunk") {

          setReport((current) => ({

            ...(current || {}),

            target_name:
              current?.target_name ||
              selectedNode?.name,

            target_type:
              current?.target_type ||
              selectedNode?.type,

            summary:
              (current?.summary || "") +
              (data.text || ""),

          }));

        }


        else if (event === "complete") {

          setReport(data);

          setStatus(
            "COMPLETE"
          );

        }


        else if (event === "error") {

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


  const selectedNode =
    nodes.find(
      (node) =>
        String(node.entity_key) ===
        String(entityKey)
    );


  return (

    <div className="space-y-4">

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


      <div className="panel p-4">

        <div className="text-[9px] text-slate-500 font-mono mb-2">
          TARGET ENTITY
        </div>


        <div className="flex gap-2">

          <select
            className="input-tactical flex-1"
            value={entityKey}
            onChange={(event) => {

              setEntityKey(
                event.target.value
              );

              setReport(null);
              setError("");
              setStatus("IDLE");

            }}
            disabled={loadingNodes}
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


            {nodes.map((node) => (

              <option
                key={
                  node.entity_key ||
                  node.id
                }
                value={
                  node.entity_key
                }
              >
                {node.name} — {node.type}
              </option>

            ))}

          </select>


          <button
            className="btn-primary"
            onClick={generateReport}
            disabled={!entityKey}
          >
            GENERATE DOSSIER
          </button>

        </div>


        {selectedNode && (

          <div className="mt-3 text-[9px] text-slate-500 font-mono">

            ENTITY KEY: {selectedNode.entity_key}

            {" | "}

            TYPE: {selectedNode.type}

            {" | "}

            NETWORK DEGREE: {selectedNode.degree}

          </div>

        )}

      </div>


      {error && (

        <div className="border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400 font-mono">

          REPORT ERROR: {error}

        </div>

      )}


      <div className="panel p-4">

        <div className="flex justify-between">

          <div className="label">
            STATUS: {status}
          </div>


          {report && (

            <div className="font-mono text-[9px] text-slate-500">
              EVIDENCE-BASED ANALYSIS
            </div>

          )}

        </div>


        {report && (

          <>

            <div className="mt-4">

              <div className="text-[9px] text-slate-500 font-mono">
                TARGET
              </div>

              <div className="text-white text-lg font-mono">

                {report.target_name ||
                  selectedNode?.name ||
                  "UNKNOWN"}

              </div>

            </div>


            <div className="mt-4">

              <div className="text-[9px] text-slate-500 font-mono">
                NETWORK SCORE
              </div>

              <div className="text-3xl text-amber-400 font-mono">

                {report.threat_score ?? "—"}
                /100

              </div>

            </div>


            <div className="mt-5 border-t border-line pt-4">

              <div className="text-[9px] text-slate-500 font-mono mb-2">
                AI ASSESSMENT
              </div>

              <pre className="whitespace-pre-wrap text-xs text-slate-300 leading-relaxed">

                {report.summary ||
                  "Generating assessment..."}

              </pre>

            </div>

          </>

        )}


        {!report &&
          status === "IDLE" && (

            <div className="p-8 text-center text-xs text-slate-600 font-mono">

              SELECT AN ENTITY TO GENERATE A DOSSIER

            </div>

          )}


        {!report &&
          status !== "IDLE" &&
          status !== "FAILED" && (

            <div className="p-8 text-center text-xs text-slate-500 font-mono">

              DOSSIER PROCESSING...

            </div>

          )}

      </div>

    </div>

  );
}