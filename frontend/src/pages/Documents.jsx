import { useState } from "react";

import {
  deleteDocument,
  uploadDocument,
} from "../api/documents";

import {
  useProcess,
} from "../context/ProcessContext";


const STATUS_LABELS = {
  UPLOADED: "QUEUED",
  EXTRACTING: "EXTRACTING",
  AI_ANALYSIS: "AI ANALYSIS",
  PROCESSED: "PROCESSED",
  FAILED: "FAILED",
};


const STATUS_PROGRESS = {
  UPLOADED: 10,
  EXTRACTING: 35,
  AI_ANALYSIS: 70,
  PROCESSED: 100,
  FAILED: 100,
};


function StatusIndicator({ status }) {

  const active =
    [
      "UPLOADED",
      "EXTRACTING",
      "AI_ANALYSIS",
    ].includes(status);


  const progress =
    STATUS_PROGRESS[status] ?? 0;


  const color =
    status === "PROCESSED"
      ? "text-green-400"
      : status === "FAILED"
      ? "text-red-400"
      : "text-blue-400";


  return (

    <div className="min-w-[210px]">

      <div className="flex items-center justify-between">

        <div
          className={`font-mono text-[10px] ${color} flex items-center gap-2`}
        >

          {active && (
            <span className="inline-block w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
          )}

          {status === "PROCESSED" && (
            <span className="text-green-400">
              ●
            </span>
          )}

          {status === "FAILED" && (
            <span className="text-red-400">
              ●
            </span>
          )}

          {STATUS_LABELS[status] || status}

        </div>


        {active && (
          <div className="text-[9px] text-slate-600 font-mono">
            {progress}%
          </div>
        )}

      </div>


      {active && (

        <div className="mt-2 h-1 bg-slate-900 overflow-hidden">

          <div
            className="h-full bg-blue-400 transition-all duration-700"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

      )}

    </div>

  );
}


export default function Documents() {

  const {
    documents,
    loading,
    error: processError,
    refresh,
  } = useProcess();


  const [uploading, setUploading] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState(null);

  const [error, setError] =
    useState("");


  const handleUpload = async (
    event
  ) => {

    const file =
      event.target.files?.[0];


    if (!file) {
      return;
    }


    try {

      setUploading(true);

      setError("");


      await uploadDocument(file);


      /*
       * Immediately refresh once.
       *
       * After this, ProcessContext's
       * 1-second polling takes over.
       */

      await refresh();

    } catch (err) {

      console.error(
        "DOCUMENT UPLOAD ERROR:",
        err
      );


      setError(
        err.response?.data?.detail ||
        err.message ||
        "Document upload failed."
      );

    } finally {

      setUploading(false);

      event.target.value = "";

    }

  };


  const removeDocument = async (
    id,
    filename
  ) => {

    const confirmed =
      window.confirm(
        `DELETE "${filename}"?\n\nThis will remove the document from the document register and knowledge graph.`
      );


    if (!confirmed) {
      return;
    }


    try {

      setDeletingId(id);

      setError("");


      await deleteDocument(id);


      await refresh();

    } catch (err) {

      console.error(
        "DOCUMENT DELETE ERROR:",
        err
      );


      setError(
        err.response?.data?.detail ||
        err.message ||
        "Failed to delete document."
      );

    } finally {

      setDeletingId(null);

    }

  };


  const visibleError =
    error ||
    processError;


  return (

    <div className="space-y-4">

      {/* HEADER */}

      <div className="flex items-center justify-between">

        <div>

          <div className="eyebrow">
            DOCUMENT INTAKE
          </div>

          <h1 className="text-xl text-white font-mono">
            CLASSIFIED SOURCES
          </h1>

          <p className="text-xs text-slate-500 mt-1">
            Upload and process intelligence source documents.
          </p>

        </div>


        <label
          className={`btn-primary cursor-pointer ${
            uploading
              ? "opacity-60 cursor-wait"
              : ""
          }`}
        >

          {uploading
            ? "UPLOADING..."
            : "UPLOAD PDF"}


          <input
            hidden
            type="file"
            accept="application/pdf"
            onChange={handleUpload}
            disabled={uploading}
          />

        </label>

      </div>


      {/* ERROR */}

      {visibleError && (

        <div className="border border-red-500/30 bg-red-500/5 p-3 text-xs text-red-400 font-mono">

          DOCUMENT SYSTEM ERROR:
          {" "}
          {visibleError}

        </div>

      )}


      {/* LIVE PROCESSING PANEL */}

      {documents.some(
        (document) =>
          [
            "UPLOADED",
            "EXTRACTING",
            "AI_ANALYSIS",
          ].includes(
            document.status
          )
      ) && (

        <div className="panel border-blue-500/20">

          <div className="border-b border-line p-3 flex items-center justify-between">

            <div className="font-mono text-xs text-blue-300 flex items-center gap-2">

              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />

              LIVE PROCESSING

            </div>

            <div className="text-[9px] text-slate-600 font-mono">
              AUTO REFRESH 1s
            </div>

          </div>


          <div className="p-3 space-y-3">

            {documents
              .filter(
                (document) =>
                  [
                    "UPLOADED",
                    "EXTRACTING",
                    "AI_ANALYSIS",
                  ].includes(
                    document.status
                  )
              )
              .map((document) => (

                <div
                  key={document.id}
                  className="bg-black/20 border border-line p-3"
                >

                  <div className="flex items-center justify-between">

                    <div className="text-xs text-slate-300 truncate">
                      {document.filename}
                    </div>

                    <StatusIndicator
                      status={
                        document.status
                      }
                    />

                  </div>

                </div>

              ))}

          </div>

        </div>

      )}


      {/* DOCUMENT REGISTER */}

      <div className="panel">

        <div className="flex items-center justify-between border-b border-line p-3">

          <div className="font-mono text-xs text-slate-300">
            SOURCE REGISTER
          </div>

          <div className="font-mono text-[10px] text-slate-500">
            {documents.length} DOCUMENTS
          </div>

        </div>


        {loading ? (

          <div className="p-6 text-center text-xs text-slate-500 font-mono">
            LOADING DOCUMENT REGISTER...
          </div>

        ) : documents.length === 0 ? (

          <div className="p-8 text-center">

            <div className="font-mono text-xs text-slate-500">
              NO DOCUMENTS INGESTED
            </div>

            <div className="text-[10px] text-slate-600 mt-2">
              Upload a PDF to begin document intelligence processing.
            </div>

          </div>

        ) : (

          documents.map(
            (document) => (

              <div
                key={document.id}
                className="p-3 border-b border-line flex items-center justify-between text-xs"
              >

                {/* DOCUMENT */}

                <div className="min-w-0">

                  <div className="text-slate-200 truncate">
                    {document.filename}
                  </div>

                  <div className="text-[9px] text-slate-600 font-mono mt-1">
                    DOCUMENT ID:
                    {" "}
                    {document.id}
                  </div>


                  {document.size_bytes && (

                    <div className="text-[9px] text-slate-700 font-mono mt-1">

                      SIZE:
                      {" "}
                      {(
                        document.size_bytes /
                        1024 /
                        1024
                      ).toFixed(2)}
                      {" MB"}

                    </div>

                  )}

                </div>


                {/* STATUS + DELETE */}

                <div className="flex items-center gap-4 ml-4">

                  <StatusIndicator
                    status={
                      document.status
                    }
                  />


                  <button
                    type="button"
                    onClick={() =>
                      removeDocument(
                        document.id,
                        document.filename
                      )
                    }
                    disabled={
                      deletingId ===
                      document.id
                    }
                    className="px-3 py-1 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 transition font-mono text-[10px] disabled:opacity-40 disabled:cursor-not-allowed"
                  >

                    {deletingId ===
                    document.id
                      ? "DELETING..."
                      : "DELETE"}

                  </button>

                </div>

              </div>

            )
          )

        )}

      </div>

    </div>

  );
}