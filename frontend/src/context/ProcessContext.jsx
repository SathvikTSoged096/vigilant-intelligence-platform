import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

import { listDocuments } from "../api/documents";


const ProcessContext = createContext(null);


const ACTIVE_STATUSES = [
  "UPLOADED",
  "EXTRACTING",
  "AI_ANALYSIS",
];


function getProgress(status) {
  switch (status) {
    case "UPLOADED":
      return 10;

    case "EXTRACTING":
      return 35;

    case "AI_ANALYSIS":
      return 70;

    case "PROCESSED":
      return 100;

    case "FAILED":
      return 100;

    default:
      return 0;
  }
}


export function ProcessProvider({ children }) {

  const [documents, setDocuments] = useState([]);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState("");

  const [lastUpdated, setLastUpdated] = useState(null);


  const refresh = async () => {

    const token =
      localStorage.getItem("gotham_token");

    // Do not make API calls before authentication.
    if (!token) {
      return;
    }

    try {

      const response =
        await listDocuments();

      const nextDocuments =
        response.data || [];

      setDocuments(nextDocuments);

      setLastUpdated(
        new Date()
      );

      setError("");

    } catch (err) {

      console.error(
        "PROCESS MONITOR ERROR:",
        err
      );

      // Don't display transient polling errors
      // as a major system failure.
      if (
        err.response?.status !== 401
      ) {

        setError(
          err.response?.data?.detail ||
          err.message ||
          "Unable to monitor documents."
        );

      }

    } finally {

      setLoading(false);

    }
  };


  // ------------------------------------------------------------
  // GLOBAL REAL-TIME DOCUMENT MONITOR
  // ------------------------------------------------------------

  useEffect(() => {

    let mounted = true;

    const poll = async () => {

      if (!mounted) {
        return;
      }

      await refresh();

    };


    poll();


    const interval =
      setInterval(
        poll,
        1000
      );


    return () => {

      mounted = false;

      clearInterval(
        interval
      );

    };

  }, []);


  // ------------------------------------------------------------
  // Convert backend documents into process jobs.
  // ------------------------------------------------------------

  const jobs = useMemo(() => {

    const result = {};

    for (const document of documents) {

      result[document.id] = {

        id:
          document.id,

        filename:
          document.filename,

        status:
          document.status,

        progress:
          getProgress(
            document.status
          ),

        active:
          ACTIVE_STATUSES.includes(
            document.status
          ),

        error:
          document.error_message || "",

        created_at:
          document.created_at,

      };

    }

    return result;

  }, [documents]);


  const activeJobs = useMemo(
    () =>
      Object.values(jobs).filter(
        (job) => job.active
      ),
    [jobs]
  );


  const processedDocuments =
    useMemo(
      () =>
        documents.filter(
          (document) =>
            document.status ===
            "PROCESSED"
        ),
      [documents]
    );


  const failedDocuments =
    useMemo(
      () =>
        documents.filter(
          (document) =>
            document.status ===
            "FAILED"
        ),
      [documents]
    );


  const activeDocuments =
    useMemo(
      () =>
        documents.filter(
          (document) =>
            ACTIVE_STATUSES.includes(
              document.status
            )
        ),
      [documents]
    );


  return (

    <ProcessContext.Provider
      value={{

        documents,

        jobs,

        activeJobs,

        activeDocuments,

        processedDocuments,

        failedDocuments,

        loading,

        error,

        lastUpdated,

        refresh,

      }}
    >

      {children}

    </ProcessContext.Provider>

  );

}


export const useProcess = () =>
  useContext(ProcessContext);