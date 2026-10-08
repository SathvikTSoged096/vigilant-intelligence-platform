import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";

import {
  useEffect,
  useMemo,
  useState,
} from "react";


// ============================================================
// MAP VIEWPORT
// ============================================================

function MapViewport({ points }) {

  const map = useMap();

  useEffect(() => {

    if (!points.length) {
      return;
    }

    const validPoints = points.filter(
      (point) =>
        Number.isFinite(Number(point.latitude)) &&
        Number.isFinite(Number(point.longitude))
    );

    if (!validPoints.length) {
      return;
    }

    const bounds = validPoints.map((point) => [
      Number(point.latitude),
      Number(point.longitude),
    ]);

    map.fitBounds(
      bounds,
      {
        padding: [50, 50],
        maxZoom: 12,
      }
    );

  }, [points, map]);

  return null;
}


// ============================================================
// MAP INTELLIGENCE
// ============================================================

export default function MapIntelligence({
  points = [],
  onLocationSelect,
}) {

  // ============================================================
  // SELECTED LOCATION
  // ============================================================

  const [selectedPoint, setSelectedPoint] =
    useState(null);


  // ============================================================
  // NORMALIZE GEO DATA
  // ============================================================

  const validPoints = useMemo(() => {

    return points
      .map((point) => ({

        ...point,

        latitude:
          Number(point.latitude),

        longitude:
          Number(point.longitude),

      }))
      .filter(
        (point) =>
          Number.isFinite(
            point.latitude
          ) &&
          Number.isFinite(
            point.longitude
          )
      );

  }, [points]);


  // ============================================================
  // LOCATION STATISTICS
  // ============================================================

  const locationCount =
    validPoints.length;


  const uniqueLocations =
    new Set(
      validPoints
        .map(
          (point) =>
            point.location_name ||
            point.address ||
            point.display_name ||
            `${point.latitude},${point.longitude}`
        )
        .filter(Boolean)
    ).size;


  const entityCount =
    new Set(
      validPoints
        .map(
          (point) =>
            point.entity_id ||
            point.entity_key ||
            point.name
        )
        .filter(Boolean)
    ).size;


  // ============================================================
  // MARKER SELECTION
  // ============================================================

  const handlePointSelect = (point) => {

    setSelectedPoint(point);

  };


  // ============================================================
  // CLOSE LOCATION
  // ============================================================

  const closeSelectedPoint = () => {

    setSelectedPoint(null);

  };


  // ============================================================
  // EMPTY STATE
  // ============================================================

  if (validPoints.length === 0) {

    return (

      <div className="border border-line bg-obsidian">

        <div className="h-[420px] flex items-center justify-center">

          <div className="text-center">

            <div className="text-[9px] text-slate-600 font-mono">
              GEOINT
            </div>

            <div className="mt-2 text-xs text-slate-500 font-mono">
              NO GEOREFERENCED LOCATIONS
            </div>

            <div className="mt-2 text-[9px] text-slate-700 font-mono">
              LOCATION INTELLIGENCE WILL APPEAR HERE
            </div>

          </div>

        </div>

      </div>

    );

  }


  // ============================================================
  // RENDER
  // ============================================================

  return (

    <div className="border border-line bg-obsidian">


      {/* ======================================================
          GEOINT HEADER
      ====================================================== */}

      <div className="border-b border-line p-3 flex items-center justify-between">

        <div>

          <div className="font-mono text-xs text-slate-300">
            GEOINT MAP
          </div>

          <div className="text-[9px] text-slate-600 font-mono mt-1">
            GEOSPATIAL INTELLIGENCE / LOCATION ANALYSIS
          </div>

        </div>


        <div className="flex items-center gap-4">

          <div className="text-right">

            <div className="text-[8px] text-slate-600 font-mono">
              LOCATIONS
            </div>

            <div className="text-[10px] text-blue-400 font-mono">
              {locationCount}
            </div>

          </div>


          <div className="text-right">

            <div className="text-[8px] text-slate-600 font-mono">
              ENTITIES
            </div>

            <div className="text-[10px] text-blue-400 font-mono">
              {entityCount}
            </div>

          </div>


          <div className="text-right">

            <div className="text-[8px] text-slate-600 font-mono">
              GEO LINKS
            </div>

            <div className="text-[10px] text-green-400 font-mono">
              {uniqueLocations}
            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          MAP
      ====================================================== */}

      <div className="relative h-[420px]">

        <MapContainer
          center={[20, 0]}
          zoom={2}
          scrollWheelZoom={true}
          style={{
            height: "100%",
            width: "100%",
            background: "#080b10",
          }}
        >

          <TileLayer
            attribution="&copy; OpenStreetMap contributors"
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />


          <MapViewport
            points={validPoints}
          />


          {/* ==================================================
              LOCATION MARKERS
          ================================================== */}

          {validPoints.map(
            (point, index) => {

              const isSelected =
                selectedPoint &&
                (
                  (
                    selectedPoint.entity_id &&
                    point.entity_id &&
                    String(
                      selectedPoint.entity_id
                    ) ===
                    String(
                      point.entity_id
                    )
                  )
                  ||
                  (
                    selectedPoint.entity_key &&
                    point.entity_key &&
                    String(
                      selectedPoint.entity_key
                    ) ===
                    String(
                      point.entity_key
                    )
                  )
                  ||
                  (
                    selectedPoint.latitude ===
                      point.latitude &&
                    selectedPoint.longitude ===
                      point.longitude
                  )
                );


              return (

                <CircleMarker

                  key={
                    `${point.entity_id || point.entity_key || "location"}-${index}`
                  }

                  center={[
                    point.latitude,
                    point.longitude,
                  ]}

                  radius={
                    isSelected
                      ? 11
                      : 7
                  }

                  pathOptions={{

                    color:
                      isSelected
                        ? "#60a5fa"
                        : "#38bdf8",

                    fillColor:
                      isSelected
                        ? "#60a5fa"
                        : "#0ea5e9",

                    fillOpacity:
                      isSelected
                        ? 0.75
                        : 0.45,

                    weight:
                      isSelected
                        ? 2
                        : 1,

                  }}

                  eventHandlers={{

                    click: () =>
                      handlePointSelect(
                        point
                      ),

                  }}

                >

                  <Popup>

                    <div
                      style={{
                        minWidth: "190px",
                        fontFamily:
                          "monospace",
                        fontSize: "11px",
                        lineHeight: "1.5",
                      }}
                    >

                      <div
                        style={{
                          fontWeight: "bold",
                          marginBottom: "5px",
                        }}
                      >
                        {point.name ||
                          "UNKNOWN ENTITY"}
                      </div>


                      {point.location_name && (

                        <div>
                          LOCATION:{" "}
                          {point.location_name}
                        </div>

                      )}


                      {point.address && (

                        <div>
                          ADDRESS:{" "}
                          {point.address}
                        </div>

                      )}


                      {point.city && (

                        <div>
                          CITY:{" "}
                          {point.city}
                        </div>

                      )}


                      {point.state && (

                        <div>
                          STATE:{" "}
                          {point.state}
                        </div>

                      )}


                      {point.country && (

                        <div>
                          COUNTRY:{" "}
                          {point.country}
                        </div>

                      )}


                      {point.type && (

                        <div>
                          TYPE: {point.type}
                        </div>

                      )}


                      <div>
                        LAT:{" "}
                        {point.latitude}
                      </div>

                      <div>
                        LON:{" "}
                        {point.longitude}
                      </div>


                      {point.entity_key && (

                        <div
                          style={{
                            marginTop: "5px",
                            fontSize: "9px",
                            wordBreak:
                              "break-all",
                          }}
                        >
                          {point.entity_key}
                        </div>

                      )}

                    </div>

                  </Popup>

                </CircleMarker>

              );

            }
          )}

        </MapContainer>


        {/* ====================================================
            MAP STATUS
        ==================================================== */}

        <div className="absolute top-3 right-3 z-[1000] pointer-events-none">

          <div className="border border-line bg-obsidian/90 px-3 py-2">

            <div className="text-[8px] text-slate-600 font-mono">
              GEOINT STATUS
            </div>

            <div className="mt-1 flex items-center gap-2">

              <span className="h-1.5 w-1.5 rounded-full bg-green-400" />

              <span className="text-[9px] text-green-400 font-mono">
                ACTIVE
              </span>

            </div>

          </div>

        </div>


        {/* ====================================================
            MAP LEGEND
        ==================================================== */}

        <div className="absolute bottom-3 left-3 z-[1000] pointer-events-none">

          <div className="border border-line bg-obsidian/90 px-3 py-2">

            <div className="text-[8px] text-slate-600 font-mono mb-2">
              LEGEND
            </div>

            <div className="flex items-center gap-2">

              <span className="h-2 w-2 rounded-full bg-sky-400" />

              <span className="text-[8px] text-slate-400 font-mono">
                GEOREFERENCED ENTITY
              </span>

            </div>

          </div>

        </div>

      </div>


      {/* ======================================================
          SELECTED LOCATION
      ====================================================== */}

      {selectedPoint && (

        <div className="border-t border-line">


          {/* ==================================================
              HEADER
          ================================================== */}

          <div className="p-3 border-b border-line flex items-center justify-between">

            <div className="font-mono text-xs text-slate-300">
              LOCATION INTELLIGENCE
            </div>

            <button
              type="button"
              onClick={
                closeSelectedPoint
              }
              className="text-[9px] text-slate-600 hover:text-slate-300 font-mono"
            >
              CLOSE
            </button>

          </div>


          {/* ==================================================
              LOCATION INFORMATION
          ================================================== */}

          <div className="p-4 grid grid-cols-4 gap-4">


            {/* ENTITY */}

            <div>

              <div className="text-[8px] text-slate-600 font-mono">
                ENTITY
              </div>

              <div className="mt-1 text-xs text-white font-mono">
                {selectedPoint.name ||
                  "UNKNOWN"}
              </div>

            </div>


            {/* LOCATION */}

            <div>

              <div className="text-[8px] text-slate-600 font-mono">
                LOCATION
              </div>

              <div className="mt-1 text-xs text-slate-300 font-mono">
                {selectedPoint.location_name ||
                  selectedPoint.display_name ||
                  selectedPoint.address ||
                  selectedPoint.name ||
                  "UNKNOWN"}
              </div>

            </div>


            {/* TYPE */}

            <div>

              <div className="text-[8px] text-slate-600 font-mono">
                TYPE
              </div>

              <div className="mt-1 text-xs text-blue-400 font-mono">
                {selectedPoint.type ||
                  "LOCATION"}
              </div>

            </div>


            {/* COORDINATES */}

            <div>

              <div className="text-[8px] text-slate-600 font-mono">
                COORDINATES
              </div>

              <div className="mt-1 text-[10px] text-slate-300 font-mono">
                {selectedPoint.latitude}
                {" / "}
                {selectedPoint.longitude}
              </div>

            </div>

          </div>


          {/* ==================================================
              ADDRESS / REGION
          ================================================== */}

          {(
            selectedPoint.address ||
            selectedPoint.city ||
            selectedPoint.state ||
            selectedPoint.country
          ) && (

            <div className="px-4 pb-4">

              <div className="text-[8px] text-slate-600 font-mono">
                REGION
              </div>

              <div className="mt-1 text-[9px] text-slate-500 font-mono">

                {[
                  selectedPoint.address,
                  selectedPoint.city,
                  selectedPoint.state,
                  selectedPoint.country,
                ]
                  .filter(Boolean)
                  .join(" / ")}

              </div>

            </div>

          )}


          {/* ==================================================
              ENTITY KEY
          ================================================== */}

          {selectedPoint.entity_key && (

            <div className="px-4 pb-4">

              <div className="text-[8px] text-slate-600 font-mono">
                ENTITY KEY
              </div>

              <div className="mt-1 text-[9px] text-slate-500 font-mono break-all">
                {selectedPoint.entity_key}
              </div>

            </div>

          )}


          {/* ==================================================
              SOURCE
          ================================================== */}

          {(
            selectedPoint.document_id ||
            selectedPoint.source
          ) && (

            <div className="px-4 pb-4">

              <div className="text-[8px] text-slate-600 font-mono">
                SOURCE
              </div>

              <div className="mt-1 text-[9px] text-slate-500 font-mono break-all">

                {selectedPoint.document_id ||
                  selectedPoint.source}

              </div>

            </div>

          )}


          {/* ==================================================
              ENTITY LINK
          ================================================== */}

          {onLocationSelect && (

            <div className="px-4 pb-4 pt-2 border-t border-line flex items-center justify-between">

              <div>

                <div className="text-[8px] text-slate-600 font-mono">
                  ENTITY LINK
                </div>

                <div className="mt-1 text-[9px] text-slate-500 font-mono">
                  Resolve this GEOINT location against the intelligence graph.
                </div>

              </div>


              <button
                type="button"
                onClick={() =>
                  onLocationSelect(
                    selectedPoint
                  )
                }
                className="
                  border
                  border-blue-500/50
                  bg-blue-500/5
                  px-4
                  py-2
                  text-[9px]
                  text-blue-400
                  font-mono
                  hover:bg-blue-500/10
                  hover:border-blue-400
                  transition
                "
              >
                VIEW ASSOCIATED ENTITY
              </button>

            </div>

          )}

        </div>

      )}

    </div>

  );

}