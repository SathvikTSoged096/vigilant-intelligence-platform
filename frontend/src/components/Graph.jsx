import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
} from "@xyflow/react";

import "@xyflow/react/dist/style.css";

import { useEffect, useMemo, useState } from "react";


const TYPE_STYLES = {
  PERSON: {
    border: "border-blue-400/60",
    text: "text-blue-300",
    dot: "bg-blue-400",
  },

  ORGANIZATION: {
    border: "border-purple-400/60",
    text: "text-purple-300",
    dot: "bg-purple-400",
  },

  LOCATION: {
    border: "border-green-400/60",
    text: "text-green-300",
    dot: "bg-green-400",
  },

  VEHICLE: {
    border: "border-orange-400/60",
    text: "text-orange-300",
    dot: "bg-orange-400",
  },

  WEAPON: {
    border: "border-red-400/60",
    text: "text-red-300",
    dot: "bg-red-400",
  },

  ACCOUNT: {
    border: "border-cyan-400/60",
    text: "text-cyan-300",
    dot: "bg-cyan-400",
  },

  EVENT: {
    border: "border-yellow-400/60",
    text: "text-yellow-300",
    dot: "bg-yellow-400",
  },

  IDENTIFIER: {
    border: "border-pink-400/60",
    text: "text-pink-300",
    dot: "bg-pink-400",
  },

  ROLE: {
    border: "border-indigo-400/60",
    text: "text-indigo-300",
    dot: "bg-indigo-400",
  },

  OTHER: {
    border: "border-slate-500",
    text: "text-slate-300",
    dot: "bg-slate-400",
  },
};


function EntityNode({ data }) {

  const style =
    TYPE_STYLES[data.type] ||
    TYPE_STYLES.OTHER;

  return (
    <div
      className={`
        min-w-[150px]
        max-w-[220px]
        bg-[#080b0f]
        border
        ${style.border}
        px-3
        py-2
        shadow-lg
      `}
    >

      <Handle
        type="target"
        position={Position.Left}
        className="!w-1.5 !h-1.5 !bg-slate-500 !border-0"
      />

      <div className="flex items-center gap-2">

        <span
          className={`
            w-2
            h-2
            rounded-full
            ${style.dot}
          `}
        />

        <div
          className={`
            text-[9px]
            font-mono
            ${style.text}
          `}
        >
          {data.type}
        </div>

      </div>

      <div className="text-xs text-white font-mono mt-2 break-words">
        {data.name || "UNKNOWN"}
      </div>

      {data.degree !== undefined && (
        <div className="text-[8px] text-slate-600 font-mono mt-2">
          DEGREE {data.degree}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Right}
        className="!w-1.5 !h-1.5 !bg-slate-500 !border-0"
      />

    </div>
  );
}


const nodeTypes = {
  entity: EntityNode,
};


function buildInitialNodes(nodes) {

  if (!nodes.length) {
    return [];
  }

  const centerX = 500;
  const centerY = 350;

  const radius =
    Math.max(
      220,
      Math.min(
        500,
        nodes.length * 45
      )
    );

  return nodes.map((node, index) => {

    const angle =
      (index / nodes.length) *
      Math.PI *
      2;

    return {

      id: String(node.id),

      type: "entity",

      position: {
        x:
          centerX +
          Math.cos(angle) *
            radius,

        y:
          centerY +
          Math.sin(angle) *
            radius,
      },

      data: {
        ...node,
      },

    };

  });
}


function buildEdges(relationships) {

  return relationships
    .map((relationship, index) => {

      const source =
        relationship.source ??
        relationship.source_id ??
        relationship.source_entity;

      const target =
        relationship.target ??
        relationship.target_id ??
        relationship.target_entity;

      if (
        source === undefined ||
        target === undefined
      ) {
        return null;
      }

      return {

        id:
          `relationship-${index}-${source}-${target}`,

        source: String(source),

        target: String(target),

        type: "smoothstep",

        animated: false,

        label:
          relationship.relationship ||
          relationship.type ||
          "RELATED_TO",

        labelStyle: {
          fill: "#64748b",
          fontSize: 8,
          fontFamily: "monospace",
        },

        labelBgStyle: {
          fill: "#080b0f",
          fillOpacity: 0.9,
        },

        style: {
          stroke: "#334155",
          strokeWidth: 1,
        },

        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#475569",
        },

      };

    })
    .filter(Boolean);
}


function GraphController({ nodes }) {

  const { fitView } =
    useReactFlow();

  useEffect(() => {

    if (!nodes.length) {
      return;
    }

    const timer =
      setTimeout(() => {

        fitView({
          padding: 0.3,
          duration: 500,
        });

      }, 100);

    return () =>
      clearTimeout(timer);

  }, [nodes, fitView]);

  return null;
}


function GraphCanvas({
  nodes,
  relationships,
  onNodeSelect,
}) {

  const [filter, setFilter] =
    useState("ALL");

  const [selectedPerson, setSelectedPerson] =
    useState("");

  const [search, setSearch] =
    useState("");


  /*
   * PEOPLE
   */

  const people = useMemo(() => {

    return nodes
      .filter(
        node =>
          String(node.type).toUpperCase() ===
          "PERSON"
      )
      .sort((a, b) =>
        String(a.name).localeCompare(
          String(b.name)
        )
      );

  }, [nodes]);


  useEffect(() => {
    if (
      filter !== "FOCUS_PERSON" ||
      !selectedPerson
    ) {
      return;
    }

    const person = nodes.find(
      node =>
        String(node.id) === String(selectedPerson)
    );

    if (person && onNodeSelect) {
      onNodeSelect(person);
    }
  }, [
    filter,
    selectedPerson,
    nodes,
    onNodeSelect,
  ]);


  /*
   * FILTER GRAPH
   */

  const filteredNodes =
    useMemo(() => {

      let result = [...nodes];


      /*
       * TYPE FILTER
       */

      if (filter !== "ALL") {

        result =
          result.filter(
            node =>
              String(node.type).toUpperCase() ===
              filter
          );

      }


      /*
       * INDIVIDUAL FOCUS
       *
       * Selected person + direct neighbours
       */

      if (
        filter === "FOCUS_PERSON" &&
        selectedPerson
      ) {

        const selected =
          nodes.find(
            node =>
              String(node.id) ===
              String(selectedPerson)
          );


        if (selected) {

          const connectedIds =
            new Set([
              String(selected.id),
            ]);


          relationships.forEach(
            relationship => {

              const source =
                String(
                  relationship.source ??
                  relationship.source_id ??
                  relationship.source_entity
                );

              const target =
                String(
                  relationship.target ??
                  relationship.target_id ??
                  relationship.target_entity
                );


              if (
                source ===
                String(selected.id)
              ) {

                connectedIds.add(
                  target
                );

              }


              if (
                target ===
                String(selected.id)
              ) {

                connectedIds.add(
                  source
                );

              }

            }
          );


          result =
            nodes.filter(
              node =>
                connectedIds.has(
                  String(node.id)
                )
            );

        }

      }


      /*
       * SEARCH
       */

      if (search.trim()) {

        const query =
          search
            .trim()
            .toLowerCase();


        result =
          result.filter(
            node =>

              String(
                node.name || ""
              )
                .toLowerCase()
                .includes(query)

              ||

              String(
                node.type || ""
              )
                .toLowerCase()
                .includes(query)

          );

      }


      return result;

    }, [
      nodes,
      relationships,
      filter,
      selectedPerson,
      search,
    ]);


  /*
   * Only show relationships whose
   * source + target are visible.
   */

  const filteredNodeIds =
    useMemo(
      () =>
        new Set(
          filteredNodes.map(
            node =>
              String(node.id)
          )
        ),
      [filteredNodes]
    );


  const filteredRelationships =
    useMemo(() => {

      return relationships.filter(
        relationship => {

          const source =
            String(
              relationship.source ??
              relationship.source_id ??
              relationship.source_entity
            );

          const target =
            String(
              relationship.target ??
              relationship.target_id ??
              relationship.target_entity
            );

          return (
            filteredNodeIds.has(source) &&
            filteredNodeIds.has(target)
          );

        }
      );

    }, [
      relationships,
      filteredNodeIds,
    ]);


  const initialNodes =
    buildInitialNodes(
      filteredNodes
    );

  const initialEdges =
    buildEdges(
      filteredRelationships
    );


  const [
    flowNodes,
    setNodes,
    onNodesChange,
  ] = useNodesState(
    initialNodes
  );


  const [
    flowEdges,
    setEdges,
    onEdgesChange,
  ] = useEdgesState(
    initialEdges
  );


  useEffect(() => {

    setNodes(
      buildInitialNodes(
        filteredNodes
      )
    );

    setEdges(
      buildEdges(
        filteredRelationships
      )
    );

  }, [
    filteredNodes,
    filteredRelationships,
    setNodes,
    setEdges,
  ]);


  const handleNodeClick =
    (_, node) => {

      if (onNodeSelect) {

        onNodeSelect(
          node.data
        );

      }

    };


  const resetFilters = () => {

    setFilter("ALL");

    setSelectedPerson("");

    setSearch("");

  };


  return (

    <div
      className="relative bg-[#05070a] border border-line"
      style={{
        height: "720px",
      }}
    >

      {/* FILTER BAR */}

      <div className="absolute top-3 left-3 right-3 z-10">

        <div className="bg-[#080b0f]/95 border border-line p-3">

          <div className="flex items-center gap-3 flex-wrap">

            {/* FILTER */}

            <div>

              <div className="text-[8px] text-slate-600 font-mono mb-1">
                ENTITY FILTER
              </div>

              <select
                value={filter}
                onChange={(e) => {

                  setFilter(
                    e.target.value
                  );

                  if (
                    e.target.value !==
                    "FOCUS_PERSON"
                  ) {

                    setSelectedPerson("");

                  }

                }}
                className="
                  bg-[#05070a]
                  border
                  border-slate-700
                  text-slate-300
                  text-[10px]
                  font-mono
                  px-3
                  py-2
                  outline-none
                "
              >

                <option value="ALL">
                  ALL ENTITIES
                </option>

                <option value="PERSON">
                  INDIVIDUALS
                </option>

                <option value="ORGANIZATION">
                  ORGANIZATIONS
                </option>

                <option value="LOCATION">
                  LOCATIONS
                </option>

                <option value="FOCUS_PERSON">
                  FOCUS INDIVIDUAL
                </option>

              </select>

            </div>


            {/* PERSON SELECT */}

            {filter ===
              "FOCUS_PERSON" && (

              <div>

                <div className="text-[8px] text-slate-600 font-mono mb-1">
                  SELECT INDIVIDUAL
                </div>

                <select
                  value={
                    selectedPerson
                  }
                  onChange={(e) => {
                    const value = e.target.value;

                    setSelectedPerson(value);

                    const person = nodes.find(
                      node =>
                        String(node.id) === String(value)
                    );

                    if (person && onNodeSelect) {
                      onNodeSelect(person);
                    }
                  }}
                  className="
                    bg-[#05070a]
                    border
                    border-slate-700
                    text-slate-300
                    text-[10px]
                    font-mono
                    px-3
                    py-2
                    outline-none
                    min-w-[190px]
                  "
                >

                  <option value="">
                    SELECT PERSON
                  </option>

                  {people.map(
                    person => (

                      <option
                        key={person.id}
                        value={person.id}
                      >
                        {person.name}
                      </option>

                    )
                  )}

                </select>

              </div>

            )}


            {/* SEARCH */}

            <div>

              <div className="text-[8px] text-slate-600 font-mono mb-1">
                SEARCH
              </div>

              <input
                value={search}
                onChange={(e) =>
                  setSearch(
                    e.target.value
                  )
                }
                placeholder="Search entity..."
                className="
                  bg-[#05070a]
                  border
                  border-slate-700
                  text-slate-300
                  text-[10px]
                  font-mono
                  px-3
                  py-2
                  outline-none
                  w-[190px]
                "
              />

            </div>


            {/* RESET */}

            <button
              type="button"
              onClick={
                resetFilters
              }
              className="
                mt-4
                border
                border-slate-700
                px-3
                py-2
                text-[9px]
                text-slate-500
                hover:text-white
                hover:border-slate-500
                font-mono
              "
            >
              RESET
            </button>


            {/* CURRENT RESULT */}

            <div className="ml-auto mt-4 text-[9px] text-slate-500 font-mono">

              SHOWING{" "}
              <span className="text-blue-400">
                {filteredNodes.length}
              </span>
              {" / "}
              {nodes.length}
              {" ENTITIES"}

              {" · "}

              <span className="text-slate-400">
                {filteredRelationships.length}
              </span>
              {" LINKS"}

            </div>

          </div>

        </div>

      </div>


      {/* GRAPH */}

      <ReactFlow

        nodes={flowNodes}

        edges={flowEdges}

        onNodesChange={
          onNodesChange
        }

        onEdgesChange={
          onEdgesChange
        }

        onNodeClick={
          handleNodeClick
        }

        nodeTypes={
          nodeTypes
        }

        fitView

        minZoom={0.15}

        maxZoom={2}

        attributionPosition="bottom-right"
      >

        <Background
          gap={24}
          size={1}
          color="#17202a"
        />

        <Controls
          showInteractive={false}
        />

        <MiniMap
          nodeColor={(node) => {

            const type =
              node.data?.type;

            if (
              type === "PERSON"
            ) {
              return "#60a5fa";
            }

            if (
              type === "ORGANIZATION"
            ) {
              return "#c084fc";
            }

            if (
              type === "LOCATION"
            ) {
              return "#4ade80";
            }

            if (
              type === "VEHICLE"
            ) {
              return "#fb923c";
            }

            return "#64748b";

          }}

          maskColor="rgba(0,0,0,0.75)"
        />

        <GraphController
          nodes={flowNodes}
        />

      </ReactFlow>


      {/* GRAPH STATUS */}

      <div className="absolute bottom-3 left-3 pointer-events-none">

        <div className="bg-black/80 border border-line px-3 py-2">

          <div className="text-[8px] text-slate-600 font-mono">
            NETWORK VISUALIZATION
          </div>

          <div className="text-xs text-slate-300 font-mono mt-1">

            {filteredNodes.length}
            {" "}
            ENTITIES
            {" / "}
            {filteredRelationships.length}
            {" "}
            LINKS

          </div>

        </div>

      </div>

    </div>

  );
}


export default function Graph({
  nodes = [],
  relationships = [],
  onNodeSelect,
}) {

  return (

    <ReactFlowProvider>

      <GraphCanvas
        nodes={nodes}
        relationships={relationships}
        onNodeSelect={
          onNodeSelect
        }
      />

    </ReactFlowProvider>

  );
}