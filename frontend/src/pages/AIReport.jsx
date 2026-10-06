import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  RefreshCw,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import { getNodes } from "../api/graph";
import {
  getDossierState,
  streamDossier,
} from "../api/reports";

function Stat({ label, value }) {
  return (
    <div className="border border-line bg-[#0E141F] p-3">

      <div className="eyebrow">
        {label}
      </div>

      <div className="mt-2 font-mono text-sm text-blue-400">
        {value ?? "—"}
      </div>

    </div>
  );
}


function Association({ item }) {
  return (
    <div className="border-b border-line py-3 last:border-b-0">

      <div className="flex items-start justify-between gap-3">

        <div>

          <div className="text-xs text-slate-300">
            {item.name || "UNKNOWN"}
          </div>

          {item.relationship && (
            <div className="mt-1 font-mono text-[9px] text-blue-400">
              {item.relationship}
            </div>
          )}

        </div>

        {item.type && (
          <div className="font-mono text-[8px] text-slate-600">
            {item.type}
          </div>
        )}

      </div>

      {item.evidence && (
        <div className="mt-2 text-[10px] leading-4 text-slate-500">
          {item.evidence}
        </div>
      )}

      {item.confidence != null && (
        <div className="mt-2 font-mono text-[8px] text-slate-600">
          CONFIDENCE:{" "}
          {(Number(item.confidence) * 100).toFixed(0)}%
        </div>
      )}

    </div>
  );
}


function AssociationPanel({
  title,
  items,
  empty,
}) {
  return (
    <section className="panel p-4">

      <div className="flex items-center justify-between">

        <div className="eyebrow">
          {title}
        </div>

        <div className="font-mono text-[9px] text-slate-600">
          {items?.length || 0}
        </div>

      </div>

      {!items || items.length === 0 ? (

        <div className="mt-4 text-[10px] text-slate-600">
          {empty}
        </div>

      ) : (

        <div className="mt-3">
          {items.map((item, index) => (
            <Association
              key={`${item.name}-${index}`}
              item={item}
            />
          ))}
        </div>

      )}

    </section>
  );
}


export default function AIReport() {

  const [searchParams] =
    useSearchParams();

  const requestedEntity =
    searchParams.get("entity");

  const [nodes, setNodes] = useState([]);

  const [entityKey, setEntityKey] =
    useState("");

  const [report, setReport] =
    useState(null);

  const [status, setStatus] =
    useState("IDLE");

  const [error, setError] =
    useState("");


  // =====================================================
  // PERSON TARGETS ONLY
  // =====================================================

  const people = useMemo(() => {

    return nodes
      .filter(
        (node) =>
          String(node.type || "")
            .toUpperCase() === "PERSON"
      )
      .sort(
        (a, b) =>
          String(a.name || "")
            .localeCompare(
              String(b.name || "")
            )
      );

  }, [nodes]);


  // =====================================================
  // SELECTED PERSON
  // =====================================================

  const selectedPerson = useMemo(() => {

    return people.find(
      (node) =>
        node.entity_key === entityKey
    );

  }, [people, entityKey]);


  // =====================================================
  // LOAD PEOPLE
  // =====================================================

  useEffect(() => {

    let mounted = true;

    async function load() {

      try {

        const response =
          await getNodes();

        if (!mounted) {
          return;
        }

        const graphNodes =
          response.data?.nodes || [];

        setNodes(graphNodes);

        /*
         * Target selection priority:
         *
         * 1. PERSON supplied by the Knowledge Graph URL
         * 2. Previously saved dossier target
         * 3. First available PERSON
         */

        const requestedPerson =
          requestedEntity
            ? graphNodes.find(
                (node) =>
                  node.entity_key ===
                    requestedEntity &&
                  String(node.type || "")
                    .toUpperCase() ===
                    "PERSON"
              )
            : null;

        const saved =
          getDossierState();

        const savedKey =
          saved?.entityKey;

        const savedPerson =
          graphNodes.find(
            (node) =>
              node.entity_key ===
                savedKey &&
              String(node.type || "")
                .toUpperCase() ===
                "PERSON"
          );

        if (requestedEntity) {

          if (requestedPerson) {

            setEntityKey(
              requestedPerson.entity_key
            );

            setError("");

          } else {

            setEntityKey("");

            setError(
              "Requested PERSON target was not found."
            );

          }

        } else if (savedPerson) {

          setEntityKey(
            savedPerson.entity_key
          );

        } else {

          const firstPerson =
            graphNodes.find(
              (node) =>
                String(node.type || "")
                  .toUpperCase() ===
                "PERSON"
            );

          if (firstPerson) {

            setEntityKey(
              firstPerson.entity_key
            );

          }

        }

      } catch (err) {

        console.error(err);

        if (mounted) {

          setError(
            "Unable to load PERSON entities."
          );

        }

      }

    }

    load();

    return () => {
      mounted = false;
    };

  }, [requestedEntity]);


  // =====================================================
  // GENERATE
  // =====================================================

  async function generate() {

    setError("");

    if (!selectedPerson) {

      setError(
        "Select a PERSON target."
      );

      return;
    }

    setStatus("GRAPH CONTEXT");

    setReport(null);

    try {

      await streamDossier(
        entityKey,
        (event, data) => {

          if (event === "progress") {

            setStatus(
              data?.phase ||
              "PROCESSING"
            );

            return;
          }


          if (event === "chunk") {

            setReport(
              (previous) => ({
                ...(previous || {}),

                target_name:
                  selectedPerson.name,

                target_type:
                  "PERSON",

                summary:
                  (
                    previous?.summary ||
                    ""
                  ) +
                  (
                    data?.text ||
                    ""
                  ),
              })
            );

            return;
          }


          if (event === "complete") {

            setReport(data);

            setStatus(
              "COMPLETE"
            );

            return;
          }


          if (event === "error") {

            setError(
              data?.message ||
              "Dossier generation failed."
            );

            setStatus(
              "FAILED"
            );

          }

        }
      );

    } catch (err) {

      console.error(err);

      setError(
        err?.message ||
        "Dossier generation failed."
      );

      setStatus(
        "FAILED"
      );

    }

  }


  // =====================================================
  // RENDER
  // =====================================================

  return (

    <div className="space-y-4">


      {/* =================================================
          HEADER
      ================================================= */}

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">

        <div>

          <div className="eyebrow">
            INTELLIGENCE / TARGET ANALYSIS
          </div>

          <h1 className="mt-1 text-xl font-semibold">
            AI Target Dossier
          </h1>

          <div className="mt-1 font-mono text-[9px] text-slate-600">
            PERSON-LEVEL NETWORK + EVIDENCE ANALYSIS
          </div>

        </div>


        <div className="font-mono text-[9px] text-slate-600">

          {people.length} PERSON TARGETS

        </div>

      </div>


      {/* =================================================
          TARGET CONTROL
      ================================================= */}

      <section className="panel p-4">

        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">

          <div className="flex-1">

            <div className="eyebrow">
              TARGET PERSON
            </div>

            <select
              className="input-tactical mt-2 w-full"
              value={entityKey}
              onChange={(event) => {

                setEntityKey(
                  event.target.value
                );

                setReport(null);

                setStatus("IDLE");

                setError("");

              }}
              disabled={
                status ===
                  "GRAPH CONTEXT" ||
                status ===
                  "AI ASSESSMENT"
              }
            >

              {people.length === 0 ? (

                <option value="">
                  NO PERSON ENTITIES
                </option>

              ) : (

                people.map(
                  (person) => (

                    <option
                      key={
                        person.entity_key
                      }
                      value={
                        person.entity_key
                      }
                    >
                      {person.name}
                    </option>

                  )
                )

              )}

            </select>

          </div>


          <button
            className="btn-secondary flex items-center justify-center gap-2"
            onClick={generate}
            disabled={
              !selectedPerson ||
              status ===
                "GRAPH CONTEXT" ||
              status ===
                "AI ASSESSMENT"
            }
          >

            {status ===
                "GRAPH CONTEXT" ||
            status ===
                "AI ASSESSMENT" ? (

              <RefreshCw
                size={13}
                className="animate-spin"
              />

            ) : (

              <FileText
                size={13}
              />

            )}

            {status ===
                "GRAPH CONTEXT" ||
            status ===
                "AI ASSESSMENT"
              ? "GENERATING..."
              : "GENERATE DOSSIER"}

          </button>

        </div>

      </section>


      {/* =================================================
          ERROR
      ================================================= */}

      {error && (

        <div className="border border-red-500/20 bg-red-500/5 p-3">

          <div className="flex gap-2 text-xs text-red-400">

            <AlertTriangle
              size={14}
            />

            {error}

          </div>

        </div>

      )}


      {/* =================================================
          SELECTED TARGET
      ================================================= */}

      {selectedPerson && (

        <section className="panel p-4">

          <div className="eyebrow">
            TARGET PROFILE
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-4">

            <Stat
              label="TARGET"
              value={
                selectedPerson.name
              }
            />

            <Stat
              label="TYPE"
              value="PERSON"
            />

            <Stat
              label="CONFIDENCE"
              value={
                selectedPerson.confidence !=
                null
                  ? `${(
                      Number(
                        selectedPerson.confidence
                      ) * 100
                    ).toFixed(0)}%`
                  : "N/A"
              }
            />

            <Stat
              label="ENTITY KEY"
              value={
                selectedPerson.entity_key
              }
            />

          </div>

        </section>

      )}


      {/* =================================================
          PROCESS
      ================================================= */}

      {status !== "IDLE" && (

        <section className="panel p-4">

          <div className="flex items-center justify-between">

            <div>

              <div className="eyebrow">
                DOSSIER PROCESS
              </div>

              <div className="mt-1 font-mono text-[10px] text-slate-400">
                {status}
              </div>

            </div>

            {status === "COMPLETE" && (

              <CheckCircle2
                size={14}
                className="text-emerald-400"
              />

            )}

          </div>

        </section>

      )}


      {/* =================================================
          DOSSIER
      ================================================= */}

      {report && (

        <>

          {/* NETWORK */}

          <section className="panel p-4">

            <div className="eyebrow">
              NETWORK PROFILE
            </div>

            <div className="mt-3 grid gap-3 md:grid-cols-4">

              <Stat
                label="CONNECTED ENTITIES"
                value={
                  report.network_signals
                    ?.connected_entities ??
                  report.neighbors?.length ??
                  0
                }
              />

              <Stat
                label="DEGREE CENTRALITY"
                value={
                  report.network_signals
                    ?.degree_centrality ??
                  0
                }
              />

              <Stat
                label="BETWEENNESS"
                value={
                  report.network_signals
                    ?.betweenness_centrality ??
                  0
                }
              />

              <Stat
                label="NETWORK SCORE"
                value={
                  report.network_score ??
                  report.threat_score ??
                  0
                }
              />

            </div>

          </section>


          {/* ASSOCIATIONS */}

          <div className="grid gap-4 lg:grid-cols-3">

            <AssociationPanel
              title="PERSON ASSOCIATIONS"
              items={
                report.associations
                  ?.people
              }
              empty="NO CONNECTED PERSON ENTITIES"
            />

            <AssociationPanel
              title="ORGANIZATION ASSOCIATIONS"
              items={
                report.associations
                  ?.organizations
              }
              empty="NO CONNECTED ORGANIZATIONS"
            />

            <AssociationPanel
              title="LOCATION ASSOCIATIONS"
              items={
                report.associations
                  ?.locations
              }
              empty="NO CONNECTED LOCATIONS"
            />

          </div>


          {/* IDENTIFIERS */}

          <section className="panel p-4">

            <div className="eyebrow">
              TARGET IDENTIFIERS
            </div>

            {!report.associations
              ?.identifiers?.length ? (

              <div className="mt-4 text-[10px] text-slate-600">
                NO IDENTIFIERS AVAILABLE
              </div>

            ) : (

              <div className="mt-3 flex flex-wrap gap-2">

                {report.associations
                  .identifiers
                  .map(
                    (identifier, index) => (

                      <div
                        key={index}
                        className="border border-line bg-[#0E141F] px-3 py-2 font-mono text-[10px] text-blue-400"
                      >
                        {typeof identifier ===
                        "string"
                          ? identifier
                          : JSON.stringify(
                              identifier
                            )}
                      </div>

                    )
                  )}

              </div>

            )}

          </section>


          {/* EVIDENCE */}

          <section className="panel p-4">

            <div className="flex items-center justify-between">

              <div className="eyebrow">
                SOURCE EVIDENCE
              </div>

              <div className="font-mono text-[9px] text-slate-600">
                {report.evidence?.length || 0} RECORDS
              </div>

            </div>


            {!report.evidence ||
            report.evidence.length === 0 ? (

              <div className="mt-4 text-[10px] text-slate-600">
                NO SOURCE EVIDENCE AVAILABLE
              </div>

            ) : (

              <div className="mt-3">

                {report.evidence.map(
                  (item, index) => (

                    <div
                      key={index}
                      className="border-b border-line py-3 last:border-b-0"
                    >

                      <div className="flex items-center justify-between">

                        <div className="font-mono text-[9px] text-blue-400">
                          {item.relationship ||
                            "RELATED"}
                        </div>

                        <div className="font-mono text-[8px] text-slate-600">
                          {item.document_id ||
                            "SOURCE UNKNOWN"}
                        </div>

                      </div>

                      <div className="mt-2 text-xs text-slate-300">
                        {item.entity ||
                          "UNKNOWN ENTITY"}
                      </div>

                      <div className="mt-1 text-[10px] leading-5 text-slate-500">
                        {item.evidence ||
                          "No evidence text available."}
                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>


          {/* AI */}

          <section className="panel p-4">

            <div className="eyebrow">
              AI ASSESSMENT
            </div>

            <div className="mt-4 border-l-2 border-blue-500/40 pl-4 whitespace-pre-wrap text-xs leading-6 text-slate-400">

              {report.summary ||
                "NO AI ASSESSMENT AVAILABLE"}

            </div>

          </section>


          {/* NOTICE */}

          <section className="border border-blue-500/10 bg-blue-500/5 p-3">

            <div className="font-mono text-[9px] text-blue-400">
              ANALYTIC NOTICE
            </div>

            <div className="mt-1 text-[10px] leading-5 text-slate-600">
              Network connectivity is an analytical signal
              and does not establish wrongdoing, intent,
              or criminal activity.
            </div>

          </section>

        </>

      )}

    </div>

  );
}