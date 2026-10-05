import {
    CircleMarker,
    MapContainer,
    Popup,
    TileLayer,
    useMap,
} from "react-leaflet";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";


function MapViewport({ points }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }

    const validPoints = points.filter(
      (p) =>
        Number.isFinite(Number(p.latitude)) &&
        Number.isFinite(Number(p.longitude))
    );

    if (!validPoints.length) {
      return;
    }

    const bounds = validPoints.map((p) => [
      Number(p.latitude),
      Number(p.longitude),
    ]);

    map.fitBounds(bounds, {
      padding: [40, 40],
      maxZoom: 12,
    });
  }, [points, map]);

  return null;
}


export default function MapIntelligence({ points = [] }) {

  const validPoints = points
    .map((point) => ({
      ...point,
      latitude: Number(point.latitude),
      longitude: Number(point.longitude),
    }))
    .filter(
      (point) =>
        Number.isFinite(point.latitude) &&
        Number.isFinite(point.longitude)
    );

  return (
    <div className="border border-line bg-obsidian h-[420px]">

      <MapContainer
        center={[20, 0]}
        zoom={2}
        scrollWheelZoom={true}
        style={{
          height: "100%",
          width: "100%",
        }}
      >

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapViewport points={validPoints} />

        {validPoints.map((point, index) => (
          <CircleMarker
            key={`${point.entity_id}-${index}`}
            center={[
              point.latitude,
              point.longitude,
            ]}
            radius={8}
          >
            <Popup>
              <div className="font-mono text-xs">
                <div>
                  <strong>{point.name}</strong>
                </div>

                {point.location_name && (
                  <div>
                    {point.location_name}
                  </div>
                )}

                {point.address && (
                  <div>
                    {point.address}
                  </div>
                )}

                <div>
                  {point.latitude}, {point.longitude}
                </div>
              </div>
            </Popup>
          </CircleMarker>
        ))}

      </MapContainer>

      {validPoints.length === 0 && (
        <div className="absolute pointer-events-none">
          <div className="p-3 text-xs text-slate-500 font-mono">
            NO GEOREFERENCED LOCATIONS
          </div>
        </div>
      )}

    </div>
  );
}