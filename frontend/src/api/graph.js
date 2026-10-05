import client from "./client";

export const getNodes = () =>
  client.get("/graph/nodes");

export const getRelationships = () =>
  client.get("/graph/relationships");

export const getTimeline = () =>
  client.get("/graph/timeline");

export const getGeospatial = () =>
  client.get("/graph/geospatial");