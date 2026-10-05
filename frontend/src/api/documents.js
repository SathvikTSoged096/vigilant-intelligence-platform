import client from "./client";

export const listDocuments = () =>
  client.get("/documents/list");

export const uploadDocument = (file) => {
  const formData = new FormData();

  formData.append("file", file);

  return client.post(
    "/documents/upload",
    formData
  );
};

export const deleteDocument = (documentId) =>
  client.delete(`/documents/${documentId}`);

export const pdfUrl = (documentId) =>
  `/api/v1/documents/${documentId}/pdf`;