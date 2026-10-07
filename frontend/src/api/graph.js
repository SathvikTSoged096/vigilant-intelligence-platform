import client from "./client";


export const getNodes = () =>
  client.get("/graph/nodes");


export const getRelationships = () =>
  client.get("/graph/relationships");


export const getTimeline = () =>
  client.get("/graph/timeline");


export const getEntityTimeline = (entityKey) =>
  client.get(
    `/graph/timeline/${encodeURIComponent(entityKey)}`
  );


export const getGeospatial = () =>
  client.get("/graph/geospatial");