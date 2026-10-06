import { useEffect, useMemo, useState } from "react";

import { getNodes } from "../api/graph";
import {
  getDossierState,
  streamDossier,
} from "../api/reports";


function Section({ title, children }) {
  return (
    <section className="border border-slate-800 bg-slate-950/60 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-800 bg-slate-900/60">
        <h2 className="text-xs font-semibold tracking-[0.18em] text-slate-300">
          {title}
        </h2>
      </div>

      <div className="p-4">
        {children}
      </div>
    </section>
  );
}


function EntityList({ items, emptyText = "No entities available." }) {
  if (!items || items.length === 0) {
    return (
      <div className="text-xs text-slate-500">
        {emptyText}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div
          key={`${item.entity_key || item.name || "entity"}-${index}`}
          className="border border-slate-800 rounded-md px-3 py-2 bg-slate-950"
        >
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm text-slate-200">
              {item.name || "Unknown"}
            </div>

            {item.type && (
              <span className="text-[10px] uppercase tracking-wider text-slate-500">
                {item.type}
              </span>
            )}
          </div>

          {item.relationship && (
            <div className="text-xs text-cyan-400 mt-1">
              {item.relationship}
            </div>
          )}

          {item.evidence && (
            <div className="text-xs text-slate-500 mt-1">
              {item.evidence}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}


export default function AIReport() {
  const [nodes, setNodes] = useState([]);
  const [entityKey, setEntityKey] = useState("");

  const [report, setReport] = useState(null);
  const [status, setStatus] = useState("IDLE");
  const [error, setError] = useState("");

  /*
   * IMPORTANT:
   * Only PERSON entities are allowed to become dossier targets.
   */
  const personNodes = useMemo(() => {
    return nodes
      .filter(
        (node) =>
          String(node.type || "").toUpperCase() === "PERSON"
      )
      .sort((a, b) =>
        String(a.name || "").localeCompare(
          String(b.name || "")
        )
      );
  }, [nodes]);


  const selectedNode = useMemo(() => {
    return personNodes.find(
      (node) => node.entity_key === entityKey
    );
  }, [personNodes, entityKey]);


  /*
   * Load graph nodes.
   */
  useEffect(() => {
    let mounted = true;

    async function loadNodes() {
      try {
        const response = await getNodes();

        if (!mounted) return;

        const loadedNodes = response.data?.nodes || [];

        setNodes(loadedNodes);

        /*
         * Restore saved dossier only if it belongs to a PERSON.
         */
        const saved = getDossierState();

        const savedEntityKey = saved?.entityKey;

        const savedPerson = loadedNodes.find(
          (node) =>
            node.entity_key === savedEntityKey &&
            String(node.type || "").toUpperCase() === "PERSON"
        );

        if (savedPerson) {
          setEntityKey(savedPerson.entity_key);
        } else {
          /*
           * Default to first PERSON.
           */
          const firstPerson = loadedNodes.find(
            (node) =>
              String(node.type || "").toUpperCase() === "PERSON"
          );

          if (firstPerson) {
            setEntityKey(firstPerson.entity_key);
          }
        }

      } catch (err) {
        console.error(err);

        if (mounted) {
          setError("Unable to load PERSON entities.");
        }
      }
    }

    loadNodes();

    return () => {
      mounted = false;
    };
  }, []);


  async function generateReport() {
    setError("");

    /*
     * Safety check:
     * Never generate a dossier for a non-PERSON entity.
     */
    if (!selectedNode) {
      setError("Please select a PERSON entity.");
      return;
    }

    if (
      String(selectedNode.type || "").toUpperCase() !== "PERSON"
    ) {
      setError("AI dossiers are currently available only for PERSON entities.");
      return;
    }

    setStatus("PROCESSING");

    setReport({
      target_name: selectedNode.name,
      target_type: "PERSON",
      summary: "",
      network_signals: {},
      associations: {},
      evidence: [],
    });

    try {
      await streamDossier(
        entityKey,
        (event, data) => {

          if (event === "progress") {
            setStatus(
              data?.phase
                ? data.phase
                : "PROCESSING"
            );

            return;
          }


          if (event === "chunk") {
            setReport((previous) => ({
              ...(previous || {}),
              summary:
                (previous?.summary || "") +
                (data?.text || ""),
            }));

            return;
          }


          if (event === "complete") {
            setReport(data);
            setStatus("COMPLETE");
            return;
          }


          if (event === "error") {
            setError(
              data?.message ||
              "Unable to generate dossier."
            );

            setStatus("ERROR");
          }
        }
      );

    } catch (err) {
      console.error(err);

      setError(
        err?.message ||
        "Unable to generate dossier."
      );

      setStatus("ERROR");
    }
  }


  return (
    <div className="min-h-full bg-slate-950 text-slate-200 p-6">

      {/* HEADER */}
      <div className="mb-6">

        <div className="flex items-center justify-between">

          <div>
            <div className="text-xs tracking-[0.25em] text-cyan-500 mb-1">
              VIGILANT / AI INTELLIGENCE
            </div>

            <h1 className="text-2xl font-semibold text-white">
              AI Target Dossier
            </h1>

            <p className="text-sm text-slate-500 mt-1">
              Evidence-based analytical assessment for PERSON entities.
            </p>
          </div>

        </div>

      </div>


      {/* TARGET SELECTION */}
      <Section title="TARGET PERSON">

        <div className="flex flex-col lg:flex-row gap-4">

          <div className="flex-1">

            <label className="block text-[10px] tracking-[0.2em] text-slate-500 mb-2">
              PERSON ENTITY
            </label>

            <select
              value={entityKey}
              onChange={(e) => {
                setEntityKey(e.target.value);
                setReport(null);
                setStatus("IDLE");
                setError("");
              }}
              className="
                w-full
                bg-slate-900
                border border-slate-700
                rounded-md
                px-3
                py-3
                text-sm
                text-slate-200
                outline-none
                focus:border-cyan-500
              "
            >

              {personNodes.length === 0 ? (
                <option value="">
                  No PERSON entities found
                </option>
              ) : (
                personNodes.map((node) => (
                  <option
                    key={node.entity_key}
                    value={node.entity_key}
                  >
                    {node.name} — PERSON
                  </option>
                ))
              )}

            </select>

          </div>


          <div className="flex items-end">

            <button
              onClick={generateReport}
              disabled={
                !selectedNode ||
                status === "PROCESSING" ||
                status === "GRAPH CONTEXT" ||
                status === "AI ASSESSMENT"
              }
              className="
                px-6
                py-3
                rounded-md
                bg-cyan-600
                hover:bg-cyan-500
                disabled:bg-slate-800
                disabled:text-slate-600
                text-white
                text-sm
                font-semibold
                transition
              "
            >
              {status === "PROCESSING" ||
              status === "GRAPH CONTEXT" ||
              status === "AI ASSESSMENT"
                ? "GENERATING..."
                : "GENERATE DOSSIER"}
            </button>

          </div>

        </div>


        {/* PERSON COUNT */}
        <div className="mt-3 text-xs text-slate-500">
          {personNodes.length} PERSON{" "}
          {personNodes.length === 1 ? "entity" : "entities"} available
        </div>

      </Section>


      {/* ERROR */}
      {error && (
        <div className="mt-4 border border-red-900 bg-red-950/30 rounded-md p-4">
          <div className="text-xs tracking-wider text-red-400">
            ERROR
          </div>

          <div className="text-sm text-red-300 mt-1">
            {error}
          </div>
        </div>
      )}


      {/* EMPTY STATE */}
      {!report && personNodes.length === 0 && !error && (
        <div className="mt-6 border border-slate-800 rounded-lg p-8 text-center">

          <div className="text-sm text-slate-400">
            No PERSON entities are currently available.
          </div>

          <div className="text-xs text-slate-600 mt-2">
            Upload and process documents containing person entities
            before generating a dossier.
          </div>

        </div>
      )}


      {/* SELECTED PERSON */}
      {selectedNode && !report && (
        <div className="mt-6">

          <Section title="SELECTED PERSON">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div>
                <div className="text-[10px] tracking-wider text-slate-500">
                  NAME
                </div>

                <div className="text-lg text-white mt-1">
                  {selectedNode.name}
                </div>
              </div>


              <div>
                <div className="text-[10px] tracking-wider text-slate-500">
                  TYPE
                </div>

                <div className="text-sm text-cyan-400 mt-1">
                  PERSON
                </div>
              </div>


              <div>
                <div className="text-[10px] tracking-wider text-slate-500">
                  ENTITY KEY
                </div>

                <div className="text-xs text-slate-400 mt-1 break-all">
                  {selectedNode.entity_key}
                </div>
              </div>

            </div>

          </Section>

        </div>
      )}


      {/* REPORT */}
      {report && (

        <div className="mt-6 space-y-6">

          {/* TARGET PROFILE */}
          <Section title="TARGET PROFILE">

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

              <div>
                <div className="text-[10px] tracking-wider text-slate-500">
                  TARGET
                </div>

                <div className="text-lg text-white mt-1">
                  {report.target_name}
                </div>
              </div>


              <div>
                <div className="text-[10px] tracking-wider text-slate-500">
                  TYPE
                </div>

                <div className="text-sm text-cyan-400 mt-1">
                  PERSON
                </div>
              </div>


              <div>
                <div className="text-[10px] tracking-wider text-slate-500">
                  NETWORK SCORE
                </div>

                <div className="text-lg text-white mt-1">
                  {report.network_score ??
                    report.threat_score ??
                    0}
                </div>
              </div>


              <div>
                <div className="text-[10px] tracking-wider text-slate-500">
                  STATUS
                </div>

                <div className="text-sm text-emerald-400 mt-1">
                  {status}
                </div>
              </div>

            </div>

          </Section>


          {/* NETWORK ANALYSIS */}
          <Section title="NETWORK ANALYSIS">

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              <div className="border border-slate-800 rounded-md p-4">
                <div className="text-[10px] tracking-wider text-slate-500">
                  DEGREE CENTRALITY
                </div>

                <div className="text-2xl text-white mt-2">
                  {report.network_signals
                    ?.degree_centrality ?? 0}
                </div>
              </div>


              <div className="border border-slate-800 rounded-md p-4">
                <div className="text-[10px] tracking-wider text-slate-500">
                  BETWEENNESS CENTRALITY
                </div>

                <div className="text-2xl text-white mt-2">
                  {report.network_signals
                    ?.betweenness_centrality ?? 0}
                </div>
              </div>


              <div className="border border-slate-800 rounded-md p-4">
                <div className="text-[10px] tracking-wider text-slate-500">
                  CONNECTED ENTITIES
                </div>

                <div className="text-2xl text-white mt-2">
                  {report.network_signals
                    ?.connected_entities ??
                    report.neighbors?.length ??
                    0}
                </div>
              </div>

            </div>

          </Section>


          {/* PEOPLE */}
          <Section title="PERSON ASSOCIATIONS">

            <EntityList
              items={report.associations?.people}
              emptyText="No connected PERSON entities."
            />

          </Section>


          {/* ORGANIZATIONS */}
          <Section title="ORGANIZATION ASSOCIATIONS">

            <EntityList
              items={report.associations?.organizations}
              emptyText="No connected organizations."
            />

          </Section>


          {/* LOCATIONS */}
          <Section title="LOCATION ASSOCIATIONS">

            <EntityList
              items={report.associations?.locations}
              emptyText="No connected locations."
            />

          </Section>


          {/* IDENTIFIERS */}
          <Section title="IDENTIFIERS">

            <EntityList
              items={report.associations?.identifiers}
              emptyText="No identifiers available."
            />

          </Section>


          {/* EVIDENCE */}
          <Section title="SOURCE EVIDENCE">

            <EntityList
              items={report.evidence}
              emptyText="No evidence records available."
            />

          </Section>


          {/* AI ASSESSMENT */}
          <Section title="AI ASSESSMENT">

            <div className="whitespace-pre-wrap text-sm leading-7 text-slate-300">
              {report.summary ||
                "No AI assessment was generated."}
            </div>

          </Section>


          {/* LIMITATION NOTICE */}
          <div className="border border-amber-900/60 bg-amber-950/20 rounded-lg p-4">

            <div className="text-xs tracking-wider text-amber-500">
              ANALYTIC NOTICE
            </div>

            <div className="text-xs text-amber-300/80 mt-2 leading-6">
              Network connectivity and centrality are analytical
              signals only. They do not by themselves establish
              wrongdoing, intent, or criminal activity.
            </div>

          </div>

        </div>

      )}

    </div>
  );
}