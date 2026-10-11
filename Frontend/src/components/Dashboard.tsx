import React, { useState, useEffect, useRef } from "react";
import {
  Printer,
  Eye,
  X,
  RefreshCcw,
  Loader2,
  CheckCircle,
} from "lucide-react";
import logo from "../assets/Printr_app_icon.png";

import { API_BASE_URL, getHeaders } from "../config";

interface PrintJob {
  id: number;
  file_key?: string;

  file_name?: string;
  sender_name?: string;
  page_count?: number;
  is_color?: boolean;
  status: string;
  copies?: number;
  isPrefFetched?: boolean;
  page_size?: string;
}

interface DashboardProps {
  vendorId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ vendorId }) => {
  const [queueData, setQueueData] = useState<PrintJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [processingIds, setProcessingIds] = useState<Set<number>>(new Set());
  const activeQueue = queueData;

  const [total, setTotal] = useState(0);
  const [cursorHistory, setCursorHistory] = useState<(string | null)[]>([null]);
  const [pageIndex, setPageIndex] = useState(0);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const limit = 20;

  // Refs to always access latest state inside intervals/closures
  const queueDataRef = useRef<PrintJob[]>([]);
  const jobPrefsRef = useRef<Record<string, any>>({});

  // Track downloaded temp files for cleanup after 1 hour
  const tempFilesRef = useRef<{ path: string; createdAt: number }[]>([]);

  const fetchQueue = async () => {
    const token = localStorage.getItem("printr_token");
    if (!token) {
      console.warn(
        "[Dashboard] No auth token available, skipping queue fetch.",
      );
      setConnectionError("Not authenticated. Please log in.");
      setIsOnline(false);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased to 30s for Render wakes

    try {
      const currentCursor = cursorHistory[pageIndex];
      const cursorParam = currentCursor
        ? `&cursor=${encodeURIComponent(currentCursor)}`
        : "";
      const resp = await fetch(
        `${API_BASE_URL}/api/vendors/files?vendor_id=${vendorId}&limit=${limit}${cursorParam}`,
        {
          headers: getHeaders(),
          signal: controller.signal,
        },
      );

      clearTimeout(timeoutId);

      if (!resp.ok) {
        if (resp.status === 401) {
          setConnectionError("Session expired. Please log in again.");
          setIsOnline(false);
          return;
        }
        if (resp.status === 403) {
          console.warn("Authorization failed or CORS block detected.");
          setConnectionError("Access denied. Please check your credentials.");
          setIsOnline(false);
          return;
        }
        if (resp.status === 500) {
          console.error(
            "[Dashboard] Server returned 500 — possible auth or backend issue.",
          );
          setConnectionError(
            "Server error (500). If this persists, try logging out and back in.",
          );
          setIsOnline(false);
          return;
        }
        throw new Error(`Server responded with ${resp.status}`);
      }

      const data = await resp.json();
      if (data.files) {
        // Hydrate new data with existing local state (copies, fetched status)
        // Use refs to avoid stale closure from setInterval
        const currentQueueMap = new Map(
          queueDataRef.current.map((item) => [item.id, item]),
        );
        const currentJobPrefs = jobPrefsRef.current;

        const hydratedFiles = data.files.map((newJob: any) => {
          const existing = currentQueueMap.get(newJob.id);
          const key = newJob.file_key || newJob.file_name;

          let copies = 1;

          if (existing) {
            copies = existing.copies || 1;
          }

          // Check jobPrefs cache for the latest R2-fetched preferences
          if (key && currentJobPrefs[key]) {
            copies = parseInt(currentJobPrefs[key].copies) || copies;
          }

          return {
            ...newJob,
            copies: copies,
            isPrefFetched: existing ? existing.isPrefFetched || false : false,
          };
        });

        setQueueData(hydratedFiles);
        setTotal(data.total || data.files.length);
        setNextCursor(data.nextCursor);
        setConnectionError(null);
        setIsOnline(true);
      }
    } catch (error: any) {
      if (error.name === "AbortError") {
        const msg =
          "Connection timed out. The server might be waking up or is unreachable.";
        console.error(msg);
        setConnectionError(msg);
      } else {
        console.error("Error fetching queue:", error);
        setConnectionError(`Failed to load queue: ${error.message}`);
      }
      setIsOnline(false);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const [prices, setPrices] = useState({ bw: 5, color: 10 });

  const [vendorConfig, setVendorConfig] = useState({
    bw_printer: "",
    color_printer: "",
  });
  const [jobPrefs, setJobPrefs] = useState<Record<string, any>>({});
  const [isPrefLoading, setIsPrefLoading] = useState<Record<string, boolean>>(
    {},
  );

  // Keep refs in sync with latest state
  useEffect(() => {
    queueDataRef.current = queueData;
  }, [queueData]);
  useEffect(() => {
    jobPrefsRef.current = jobPrefs;
  }, [jobPrefs]);

  const fetchVendorPrices = async () => {
    const token = localStorage.getItem("printr_token");
    if (!token) {
      console.warn(
        "[Dashboard] No auth token available, skipping vendor config fetch.",
      );
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/settings/me`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        console.info("[Sync] Fetched Vendor Config:", data);
        setPrices({
          bw: parseFloat(data.bw_price) || 5,
          color: parseFloat(data.color_price) || 10,
        });
        setVendorConfig({
          bw_printer: data.bw_printer || "",
          color_printer: data.color_printer || "",
        });
        setIsOnline(true);
      }
    } catch (err) {
      console.error("Failed to fetch config:", err);
      setIsOnline(false);
    }
  };

  const pollInterval = 30000;

  useEffect(() => {
    fetchVendorPrices();
    fetchQueue();
  }, [vendorId]);

  useEffect(() => {
    const interval = setInterval(fetchQueue, pollInterval);
    return () => clearInterval(interval);
  }, [vendorId, pageIndex, pollInterval]);

  // Temp file cleanup: delete printr_* files older than 1 hour every 10 minutes
  useEffect(() => {
    const fs = (window as any).require?.("fs");
    const path = (window as any).require?.("path");
    const os = (window as any).require?.("os");
    if (!fs || !path || !os) return;

    const ONE_HOUR_MS = 60 * 60 * 1000;
    const tempDir = os.tmpdir();

    // On startup, scan for leftover printr_* files from previous sessions
    try {
      const existingFiles = fs
        .readdirSync(tempDir)
        .filter((f: string) => f.startsWith("printr_"));
      for (const fileName of existingFiles) {
        const filePath = path.join(tempDir, fileName);
        try {
          const stats = fs.statSync(filePath);
          tempFilesRef.current.push({
            path: filePath,
            createdAt: stats.mtimeMs,
          });
        } catch {
          /* file may have been removed */
        }
      }
      if (existingFiles.length > 0) {
        console.log(
          `[Cleanup] Found ${existingFiles.length} existing printr_* temp files to track.`,
        );
      }
    } catch {
      /* temp dir read failed, non-critical */
    }

    const cleanupInterval = setInterval(
      () => {
        const now = Date.now();
        const remaining: { path: string; createdAt: number }[] = [];

        for (const entry of tempFilesRef.current) {
          if (now - entry.createdAt > ONE_HOUR_MS) {
            try {
              if (fs.existsSync(entry.path)) {
                fs.unlinkSync(entry.path);
                console.log(`[Cleanup] Deleted temp file: ${entry.path}`);
              }
            } catch (e: any) {
              // File may be locked by a viewer; keep it for next cycle
              console.warn(
                `[Cleanup] Could not delete ${entry.path}: ${e.message}`,
              );
              remaining.push(entry);
            }
          } else {
            remaining.push(entry);
          }
        }

        tempFilesRef.current = remaining;
      },
      10 * 60 * 1000,
    ); // Run every 10 minutes

    return () => clearInterval(cleanupInterval);
  }, []); // Run once on mount



  const handleRefresh = () => {
    setRefreshing(true);
    fetchVendorPrices(); // Ensure settings are fresh
    fetchQueue();
  };

  // Background preference loader: Fetch JSON from R2 for pending jobs
  useEffect(() => {
    let cancelled = false;

    const fetchMissingPrefs = async () => {
      const currentQueue = queueDataRef.current;
      // FIX: Use case-insensitive comparison — backend stores 'pending' (lowercase)
      const pendingJobs = currentQueue.filter(
        (job) => !job.isPrefFetched && job.status?.toLowerCase() === "pending",
      );

      if (pendingJobs.length === 0) {
        console.log("[R2Sync] No unfetched pending jobs to check.");
        return;
      }

      console.log(
        `[R2Sync] Checking ${pendingJobs.length} jobs for preferences...`,
      );

      for (const job of pendingJobs) {
        if (cancelled) return;

        const key = job.file_key || job.file_name;
        if (!key) continue;

        const pathParts = key.split("/");
        if (pathParts.length < 2) continue;

        const vId = pathParts[0];
        const fullFileName = pathParts[1];

        // Pattern 1: Direct replacement (admin127.pdf -> admin127.json)
        let possiblePrefKeys = [
          `${vId}/${fullFileName.replace(".pdf", ".json")}`,
          `${vId}/job_preferences_${fullFileName.replace(".pdf", ".json")}`,
        ];

        // Pattern 2: Extracting order ID (e.g. admin127.pdf -> 127)
        const orderIdFromFile = fullFileName.match(/\d+/)?.[0];
        if (orderIdFromFile) {
          possiblePrefKeys.push(
            `${vId}/job_preferences_${orderIdFromFile}.json`,
          );
        }

        // Pattern 3: Username and ID split
        if (job.sender_name) {
          const sender = (job.sender_name || "admin")
            .toLowerCase()
            .split(" ")[0];
          possiblePrefKeys.push(
            `${vId}/job_preferences_${sender}_${job.id}.json`,
          );
        }

        console.log(
          `[R2Sync] Job #${job.id} (${fullFileName}) — trying keys:`,
          possiblePrefKeys,
        );

        let found = false;
        for (const prefKey of possiblePrefKeys) {
          if (cancelled) return;
          try {
            // Step 1: Get signed download URL from backend
            const prefResp = await fetch(
              `${API_BASE_URL}/api/vendors/download`,
              {
                method: "POST",
                headers: getHeaders(),
                body: JSON.stringify({ file_key: prefKey }),
              },
            );

            if (!prefResp.ok) {
              console.log(
                `[R2Sync] No match for key: ${prefKey} (${prefResp.status})`,
              );
              continue;
            }

            const data = await prefResp.json();
            if (!data.downloadUrl) {
              console.log(
                `[R2Sync] No downloadUrl in response for: ${prefKey}`,
              );
              continue;
            }

            // Step 2: Fetch the actual JSON content from R2 via signed URL
            console.log(
              `[R2Sync] Got signed URL for ${prefKey}, downloading content...`,
            );
            const actualFileResp = await fetch(data.downloadUrl);
            if (!actualFileResp.ok) {
              console.warn(
                `[R2Sync] Failed to download content from signed URL for: ${prefKey}`,
              );
              continue;
            }

            const prefs = await actualFileResp.json();
            const loadedCopies = parseInt(prefs.copies) || 1;

            console.log(
              `[R2Sync] ✅ SUCCESS for job #${job.id}: copies=${loadedCopies}, colorMode=${prefs.colorMode}`,
              prefs,
            );

            setJobPrefs((prev) => ({ ...prev, [key]: prefs }));
            setQueueData((prev) =>
              prev.map((item) =>
                item.id === job.id
                  ? { ...item, copies: loadedCopies, isPrefFetched: true }
                  : item,
              ),
            );
            found = true;
            break;
          } catch (e) {
            console.error(`[R2Sync] Error fetching ${prefKey}:`, e);
          }
        }

        if (!found) {
          // Mark as fetched even on failure to avoid retrying endlessly
          console.log(
            `[R2Sync] ❌ No preference JSON found for job #${job.id}`,
          );
          setQueueData((prev) =>
            prev.map((item) =>
              item.id === job.id ? { ...item, isPrefFetched: true } : item,
            ),
          );
        }
      }
    };

    // Small delay to let the queue render first, then fetch prefs
    const timer = setTimeout(fetchMissingPrefs, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activeQueue.length]); // Only re-run when the number of items changes, not on every state update

  const handleViewOrPrint = async (job: PrintJob, isPrint: boolean) => {
    const key =
      job.file_key ||
      (job as any).fileKey ||
      job.file_name ||
      (job as any).fileName;
    const name = job.file_name || (job as any).fileName || "document";
    const isColor = job.is_color || false;

    if (!key) {
      alert(
        "Operation aborted: Identifer (file_key) is missing for this record.",
      );
      return;
    }

    if (processingIds.has(job.id)) return;
    setProcessingIds((prev) => new Set(prev).add(job.id));

    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/download`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          file_key: key,
          id: job.id,
        }),
      }).catch((err) => {
        throw new Error(`Backend unreachable: ${err.message}`);
      });

      const data = await response.json();
      if (!response.ok || !data.downloadUrl) {
        throw new Error(
          data.message || "Failed to get secure link from backend.",
        );
      }

      console.info(
        "[Dashboard] Obtained secure download link:",
        data.downloadUrl,
      );

      // Download the actual file from Cloudflare
      const fileResp = await fetch(data.downloadUrl).catch((err) => {
        throw new Error(
          `Cloudflare download failed: ${err.message}. This might be a CORS or network issue.`,
        );
      });

      if (!fileResp.ok) {
        throw new Error(
          `Cloudflare R2 Access Denied (${fileResp.status}). Your secure link was rejected by the storage server.`,
        );
      }

      const arrayBuffer = await fileResp.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      const path = (window as any).require("path");
      const fs = (window as any).require("fs");
      const os = (window as any).require("os");
      const { shell, ipcRenderer } = (window as any).require("electron");

      const tempPath = path.join(os.tmpdir(), `printr_${name}`);
      fs.writeFileSync(tempPath, buffer);

      // Track this file for automatic cleanup after 1 hour
      tempFilesRef.current.push({ path: tempPath, createdAt: Date.now() });

      if (!isPrint) {
        shell.openPath(tempPath);
      } else {
        // 4. Fetch JSON Preferences for final print command
        // We use the manual override (job.copies) if it's > 1, otherwise default to 1
        let printOptions = {
          copies: job.copies && job.copies > 1 ? job.copies : 1,
          sides: "one-sided" as
            | "one-sided"
            | "two-sided-long-edge"
            | "two-sided-short-edge",
          isColor: isColor,
          pageSize: job.page_size || "A4",
        };

        const pathParts = key.split("/");
        if (pathParts.length >= 2) {
          const vId = pathParts[0];
          const fullFileName = pathParts[1];

          let possiblePrefKeys = [
            `${vId}/${fullFileName.replace(".pdf", ".json")}`, // Direct match (admin116.json)
            `${vId}/job_preferences_${fullFileName.replace(".pdf", ".json")}`,
          ];

          const orderIdFromFile = fullFileName.match(/\d+/)?.[0];
          if (orderIdFromFile) {
            possiblePrefKeys.push(
              `${vId}/job_preferences_${orderIdFromFile}.json`,
            );
          }

          if (job.sender_name) {
            const sender = (job.sender_name || "unknown")
              .toLowerCase()
              .split(" ")[0];
            possiblePrefKeys.push(
              `${vId}/job_preferences_${sender}_${job.id}.json`,
            );
          }

          console.log(
            `[Printer] Checking JSON for final print options. Current UI count: ${printOptions.copies}`,
          );

          for (const prefKey of possiblePrefKeys) {
            try {
              const prefResp = await fetch(
                `${API_BASE_URL}/api/vendors/download?key=${encodeURIComponent(prefKey)}`,
                {
                  headers: getHeaders(),
                },
              );

              if (prefResp.ok) {
                const data = await prefResp.json();
                if (data.downloadUrl) {
                  const actualFileResp = await fetch(data.downloadUrl);
                  if (actualFileResp.ok) {
                    const prefs = await actualFileResp.json();
                    console.log(
                      `[Printer] Final prefs loaded from ${prefKey}:`,
                      prefs,
                    );

                    const loadedCopies = parseInt(prefs.copies) || 1;

                    // If the UI is still at default (1) or was just reset, use the JSON value
                    // Otherwise, respect what the vendor sees in the quantity bar
                    if (printOptions.copies === 1 && loadedCopies > 1) {
                      printOptions.copies = loadedCopies;
                    }

                    if (prefs.doubleSided === "YES")
                      printOptions.sides = "two-sided-long-edge";
                    if (prefs.colorMode === "Colored")
                      printOptions.isColor = true;
                    else if (prefs.colorMode === "Black & White")
                      printOptions.isColor = false;
                    if (prefs.pageSize) printOptions.pageSize = prefs.pageSize;
                    break;
                  }
                }
              }
            } catch (e) {
              console.warn(`Could not load preference from ${prefKey}:`, e);
            }
          }
        }

        const printerName = printOptions.isColor
          ? vendorConfig.color_printer
          : vendorConfig.bw_printer;

        if (!printerName) {
          console.warn(
            `[Printer] No ${printOptions.isColor ? "Color" : "B&W"} printer configured. Falling back to system dialog.`,
          );
          shell.openPath(tempPath);
          return;
        }

        // --- ADDED ALERT FOR VERIFICATION ---
        alert(
          `PRINTING: ${name}\nCopies: ${printOptions.copies}\nPrinter: ${printerName}\nSize: ${printOptions.pageSize}`,
        );

        console.log(
          `[Printer] Issuing print-file IPC with copies: ${printOptions.copies}, isColor: ${printOptions.isColor}, pageSize: ${printOptions.pageSize}`,
        );
        const printResult = await ipcRenderer.invoke("print-file", {
          filePath: tempPath,
          printerName,
          isColor: printOptions.isColor,
          copies: printOptions.copies,
          sides: printOptions.sides,
          pageSize: printOptions.pageSize,
        });

        if (!printResult.success) {
          throw new Error(
            printResult.error || "Failed to issue print command.",
          );
        }

        // Mark as printed in DB
        await fetch(`${API_BASE_URL}/api/vendors/printed-legacy`, {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            id: job.id,
          }),
        }).catch((err) => {
          console.error("Failed to mark as printed:", err);
          // Don't throw here to avoid alerting if the print itself succeeded
        });
        setQueueData((prev) =>
          prev.map((item) =>
            item.id === job.id ? { ...item, status: "Printed" } : item,
          ),
        );
      }
    } catch (error: any) {
      console.error("Operation failed:", error);
      alert(
        `Operation failed for Row ${job.id} (Key: ${key})\nError: ${error.message}`,
      );
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  const handleCancel = async (job: PrintJob) => {
    const name = job.file_name || (job as any).fileName || "document";

    if (!confirm(`Cancel order for "${name}" from ${job.sender_name}?`)) return;

    if (processingIds.has(job.id)) return;
    setProcessingIds((prev) => new Set(prev).add(job.id));

    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/delete`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          id: job.id,
        }),
      });

      if (response.ok) {
        setQueueData((prev) => prev.filter((item) => item.id !== job.id));
        // alert('Order removed from database.');
      } else {
        const data = await response.json();
        alert(`Cancel Error: ${data.message || "Failed to cancel"}`);
      }
    } catch (error: any) {
      console.error("Delete failed:", error);
      alert(`Network Error: ${error.message}`);
    } finally {
      setProcessingIds((prev) => {
        const next = new Set(prev);
        next.delete(job.id);
        return next;
      });
    }
  };

  return (
    <div className="dashboard-wrapper">
      <header className="system-header">
        <div className="header-brand">
          <img src={logo} alt="Printr" className="header-logo-tiny" />
          <p>Printr | Cloud Print Enterprise v2.0</p>
        </div>
      </header>

      <main className="dashboard-content">
        <div className="content-intro">
          <div className="title-area">
            <h1>System Dashboard</h1>
            <p>
              Welcome back! Here's what's happening with your print queue today.
            </p>
          </div>
          <button
            className="refresh-btn-premium"
            onClick={handleRefresh}
            style={refreshing ? { pointerEvents: "none", opacity: 0.7 } : {}}
          >
            <RefreshCcw size={18} className={refreshing ? "spinning" : ""} />
            <span>{refreshing ? "Refreshing..." : "Refresh List"}</span>
          </button>
        </div>

        <section className="stats-grid">
          <div className="stat-card glass-glow blue">
            <div className="stat-card-inner">
              <div className="stat-card-header">
                <div className="stat-icon-box">
                  <Printer size={20} />
                </div>
                <span>PENDING JOBS</span>
              </div>
              <div className="stat-card-value">{activeQueue.length}</div>
              <div className="stat-card-footer">Jobs ready for processing</div>
            </div>
          </div>

          <div className={`stat-card glass-glow ${isOnline ? "green" : "red"}`}>
            <div className="stat-card-inner">
              <div className="stat-card-header">
                <div className="stat-icon-box">
                  {isOnline ? <CheckCircle size={20} /> : <X size={20} />}
                </div>
                <span>SYSTEM STATUS</span>
              </div>
              <div className="stat-card-value">
                {isOnline ? "Online" : "Offline"}
              </div>
              <div className="stat-card-footer">
                {isOnline
                  ? "System connection is active"
                  : "Backend is unreachable"}
              </div>
            </div>
          </div>

          <div className="stat-card glass-glow grey">
            <div className="stat-card-inner">
              <div className="stat-card-header">
                <div className="stat-icon-box">
                  <RefreshCcw size={20} />
                </div>
                <span>LATEST SYNC</span>
              </div>
              <div className="stat-card-value">Live</div>
              <div className="stat-card-footer">Syncing in real-time</div>
            </div>
          </div>
        </section>

        <section className="queue-main-area">
          <div className="queue-card-container">
            <div className="queue-header">
              <div className="queue-title">
                <h3>Active Print Queue</h3>
                <span className="queue-count">{activeQueue.length} Items</span>
              </div>
            </div>

            {loading ? (
              <div className="loader-box-premium">
                <Loader2 className="spinning" size={40} />
                <p>Establishing secure connection...</p>
              </div>
            ) : connectionError ? (
              <div className="empty-box-premium error-box">
                <div className="empty-icon-wrap" style={{ color: "#EF4444" }}>
                  <X size={48} />
                </div>
                <h3>Connection Error</h3>
                <p>{connectionError}</p>
                <button
                  onClick={fetchQueue}
                  className="refresh-btn-premium"
                  style={{ margin: "20px auto", background: "#EF4444" }}
                >
                  <RefreshCcw size={16} />
                  <span>Try Again</span>
                </button>
              </div>
            ) : activeQueue.length === 0 ? (
              <div className="empty-box-premium">
                <div className="empty-icon-wrap">
                  <Printer size={48} />
                </div>
                <h3>All Caught Up!</h3>
                <p>
                  Your print queue is currently empty. New orders will appear
                  here automatically.
                </p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="queue-table-premium">
                  <thead>
                    <tr>
                      <th>ORDER ID</th>
                      <th>FILE NAME</th>
                      <th>SENDER INFO</th>
                      <th>PAGES</th>
                      <th>PREFERENCES</th>
                      <th>EST. COST</th>
                      <th>PAYMENT</th>
                      <th>STATUS</th>
                      <th className="text-right">ACTIONS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeQueue.map((row) => (
                      <tr key={row.id} className="queue-row">
                        <td className="id-cell">
                          <span className="order-id-badge">#{row.id}</span>
                        </td>
                        <td className="file-cell">
                          <div className="file-name-info">
                            <span className="file-primary">
                              {row.file_name ||
                                (row as any).fileName ||
                                (row as any).file ||
                                `${row.sender_name || (row as any).senderName || (row as any).customer || "Unknown"} (p)`}
                            </span>
                            {row.file_key ||
                            (row as any).fileKey ||
                            row.file_name ||
                            (row as any).fileName ? (
                              <span className="file-key">
                                {(
                                  row.file_key ||
                                  (row as any).fileKey ||
                                  row.file_name ||
                                  (row as any).fileName
                                ).substring(0, 10)}
                                ...
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="sender-cell">
                          <span className="sender-name">
                            {row.sender_name ||
                              (row as any).senderName ||
                              (row as any).customer}
                          </span>
                        </td>
                        <td className="pages-cell">
                          <span className="page-count-badge">
                            {row.page_count ||
                              (row as any).pageCount ||
                              (row as any).pages}
                          </span>
                        </td>
                        <td className="preferences-cell">
                          {(() => {
                            const key =
                              row.file_key ||
                              (row as any).fileKey ||
                              row.file_name ||
                              (row as any).fileName;
                            const prefs = jobPrefs[key];
                            if (isPrefLoading[key])
                              return (
                                <span className="pref-loading">Loading...</span>
                              );
                            if (!prefs)
                              return (
                                <span
                                  className={`status-pill ${row.is_color ? "color" : "bw"}`}
                                >
                                  {row.is_color ? "Color" : "B&W"}
                                </span>
                              );

                            return (
                              <div className="pref-details-box">
                                <div className="pref-mode">
                                  <span
                                    className={`status-pill ${prefs.colorMode === "Colored" || row.is_color ? "color" : "bw"}`}
                                  >
                                    {prefs.colorMode === "Colored" ||
                                    row.is_color
                                      ? "Color"
                                      : "B&W"}
                                  </span>
                                  {parseInt(prefs.copies) > 1 && (
                                    <span className="copies-badge">
                                      x{prefs.copies}
                                    </span>
                                  )}
                                </div>
                                <div className="pref-meta">
                                  <span>{prefs.layout || "Port."}</span>
                                  <span>•</span>
                                  <span>
                                    {prefs.doubleSided === "YES"
                                      ? "2-Sided"
                                      : "1-Sided"}
                                  </span>
                                  {prefs.pageSelection === "Custom" && (
                                    <span className="range-info">
                                      [{prefs.customRange}]
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                        <td className="cost-cell">
                          <span className="cost-value">
                            ₹
                            {Number(
                              (row as any).total_amount ||
                                (row as any).amount ||
                                0,
                            ).toFixed(2)}
                          </span>
                        </td>
                        <td className="payment-cell">
                          <div className="payment-info">
                            <span
                              className={`payment-method ${((row as any).payment_method || "").toLowerCase() === "cash on delivery" || ((row as any).payment_method || "").toLowerCase() === "cod" ? "cod" : "online"}`}
                            >
                              {(
                                (row as any).payment_method || ""
                              ).toLowerCase() === "cash on delivery" ||
                              (
                                (row as any).payment_method || ""
                              ).toLowerCase() === "cod"
                                ? "COD"
                                : "Online"}
                            </span>
                            <span
                              className={`payment-status ${(row as any).payment_status}`}
                            >
                              {(row as any).payment_status}
                            </span>
                          </div>
                        </td>
                        <td>
                          <span
                            className={`status-pill ${(row.status || "pending").toLowerCase()}`}
                          >
                            {row.status || "pending"}
                          </span>
                        </td>
                        <td className="actions-cell-premium">
                          <div className="action-button-group">
                            <div className="copies-control">
                              <span className="copies-label">Qty:</span>
                              <input
                                type="number"
                                min="1"
                                max="99"
                                value={(() => {
                                  const key =
                                    row.file_key ||
                                    (row as any).fileKey ||
                                    row.file_name ||
                                    (row as any).fileName;
                                  const prefCopies = jobPrefs[key]?.copies;
                                  // Prioritize local UI change, then JSON preference, then default
                                  return (row as any).copies || prefCopies || 1;
                                })()}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 1;
                                  setQueueData((prev) =>
                                    prev.map((item) =>
                                      item.id === row.id
                                        ? { ...item, copies: val }
                                        : item,
                                    ),
                                  );
                                }}
                                className="copies-override-input"
                              />
                            </div>
                            <button
                              className="icon-action-btn print"
                              title="Print & Mark Done"
                              onClick={() => handleViewOrPrint(row, true)}
                              disabled={processingIds.has(row.id)}
                            >
                              <Printer size={16} />
                            </button>
                            <button
                              className="icon-action-btn view"
                              title="Quick View"
                              onClick={() => handleViewOrPrint(row, false)}
                              disabled={processingIds.has(row.id)}
                            >
                              <Eye size={16} />
                            </button>
                            <button
                              className="icon-action-btn cancel"
                              title="Cancel Order"
                              onClick={() => handleCancel(row)}
                              disabled={processingIds.has(row.id)}
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls */}
            {total > limit && (
              <div className="pagination-bar">
                <button
                  className="page-btn"
                  disabled={pageIndex === 0}
                  onClick={() => setPageIndex((p) => p - 1)}
                >
                  Previous
                </button>
                <span className="page-info">
                  Page {pageIndex + 1} ({total} total jobs)
                </span>
                <button
                  className="page-btn"
                  disabled={!nextCursor || (pageIndex + 1) * limit >= total}
                  onClick={() => {
                    if (!cursorHistory[pageIndex + 1] && nextCursor) {
                      setCursorHistory((prev) => [...prev, nextCursor]);
                    }
                    setPageIndex((p) => p + 1);
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      <style>{`
        .dashboard-wrapper {
          flex: 1;
          display: flex;
          flex-direction: column;
          background: #FAFBFC;
          height: 100vh;
          overflow: hidden;
          font-family: 'Inter', sans-serif;
        }

        .system-header {
          background: #0B132B;
          color: rgba(255, 255, 255, 0.75);
          padding: 8px 24px;
          font-size: 11px;
          display: flex;
          justify-content: center;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 1.5px;
          border-bottom: 1px solid rgba(28, 126, 214, 0.2);
        }

        .header-brand { display: flex; align-items: center; gap: 10px; }
        .header-logo-tiny { height: 22px; width: 22px; border-radius: 6px; object-fit: contain; }

        .dashboard-content {
          flex: 1;
          padding: 20px 32px;
          overflow-y: auto;
          max-width: 100%;
          margin: 0 auto;
          width: 100%;
        }

        .content-intro {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
          margin-bottom: 24px;
        }

        .title-area h1 {
          font-family: 'Outfit', sans-serif;
          font-size: 30px;
          font-weight: 800;
          color: #111;
          margin: 0 0 4px 0;
          letter-spacing: -1px;
        }

        .title-area p {
          color: #666;
          margin: 0;
          font-size: 14px;
          font-weight: 500;
        }

        .refresh-btn-premium {
          background: linear-gradient(135deg, #1C7ED6, #1864AB);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 4px 14px rgba(28, 126, 214, 0.25);
        }

        .refresh-btn-premium:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(28, 126, 214, 0.35);
          background: linear-gradient(135deg, #1971C2, #155799);
        }

        .refresh-btn-premium:active { transform: translateY(0); }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 20px;
          margin-bottom: 28px;
        }

        .stat-card {
          border-radius: 20px;
          padding: 20px;
          border: 1px solid rgba(0,0,0,0.05);
          background: white;
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        .stat-card:hover {
          transform: translateY(-5px);
          box-shadow: 0 20px 40px rgba(0,0,0,0.06);
          border-color: rgba(0,0,0,0.1);
        }

        .stat-card-header {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-bottom: 12px;
          color: #999;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1px;
        }

        .stat-icon-box {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #F8F9FA;
          color: #111;
          transition: 0.3s;
        }

        .stat-card.blue .stat-icon-box { background: #EBF2FF; color: #3B82F6; }
        .stat-card.green .stat-icon-box { background: #E6FFFA; color: #10B981; }
        .stat-card.red .stat-icon-box { background: #FFEBEB; color: #EF4444; }
        .stat-card.gold .stat-icon-box { background: #FFF9E6; color: #F59E0B; }
        .gold-icon { color: #F59E0B; }

        .stat-card-value {
          font-family: 'Outfit';
          font-size: 32px;
          font-weight: 800;
          color: #111;
          line-height: 1;
          margin-bottom: 6px;
        }

        .stat-card-footer {
          color: #888;
          font-size: 13px;
          font-weight: 500;
        }

        .queue-card-container {
          background: white;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.05);
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          overflow: hidden;
        }

        .queue-header {
          padding: 16px 24px;
          border-bottom: 1px solid rgba(0,0,0,0.05);
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .queue-title h3 {
          font-family: 'Outfit';
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #111;
        }

        .queue-count {
          font-size: 12px;
          color: #888;
          font-weight: 600;
          display: block;
          margin-top: 2px;
        }

        .table-responsive { width: 100%; overflow-x: hidden; }

        .queue-table-premium {
          width: 100%;
          border-collapse: collapse;
          table-layout: auto;
        }

        .queue-table-premium th {
          text-align: left;
          padding: 12px 14px;
          font-size: 11px;
          font-weight: 800;
          color: #888;
          letter-spacing: 1.5px;
          background: #F8FAFC;
        }

        .queue-row {
          transition: 0.2s;
          border-bottom: 1px solid rgba(0,0,0,0.03);
        }

        .queue-row:hover { background: #F9FBFF; }
        .queue-row:last-child { border-bottom: none; }

        .queue-row td { padding: 12px 14px; vertical-align: middle; }
        
        .pagination-bar {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 20px;
          margin-top: 15px;
          padding: 12px;
          border-top: 1px solid rgba(0,0,0,0.05);
        }

        .page-btn {
          padding: 8px 16px;
          border-radius: 8px;
          border: 1px solid var(--accent-blue);
          background: transparent;
          color: var(--accent-blue);
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 13px;
        }

        .page-btn:hover:not(:disabled) {
          background: var(--accent-blue);
          color: white;
        }

        .page-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
          border-color: #ccc;
          color: #888;
        }

        .page-info {
          font-size: 13px;
          color: #666;
          font-weight: 500;
        }

        .icon-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          filter: grayscale(1);
        }

        .order-id-badge {
          background: #EFF6FF;
          color: #1D4ED8;
          border: 1px solid #BFDBFE;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 800;
          font-size: 12px;
          font-family: 'Outfit';
        }

        .file-name-info { display: flex; flex-direction: column; gap: 2px; }
        .file-primary { 
          font-weight: 700; 
          color: #111; 
          font-size: 13.5px; 
          max-width: 180px; 
          overflow: hidden; 
          text-overflow: ellipsis; 
          white-space: nowrap; 
          display: block; 
        }
        .file-key { font-size: 11px; color: #AAA; font-weight: 500; font-family: monospace; }

        .sender-name { font-weight: 600; color: #444; font-size: 13.5px; }

        .page-count-badge {
          background: #F0F2F5;
          color: #111;
          padding: 4px 8px;
          border-radius: 6px;
          font-weight: 700;
          font-size: 12px;
        }

        .cost-value { font-weight: 800; color: #111; font-size: 14px; font-family: 'Outfit'; }

        .status-pill {
          padding: 4px 10px;
          border-radius: 50px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 1px;
        }

        .status-pill.pending { background: #FFF4E6; color: #D9480F; }
        .status-pill.printed { background: #EBFBEE; color: #2B8A3E; }
        .status-pill.cancelled { background: #FFF5F5; color: #E03131; }
        .status-pill.failed { background: #FFF5F5; color: #E03131; }
        .status-pill.color { background: #F3E8FF; color: #7E22CE; }
        .status-pill.bw { background: #F1F5F9; color: #475569; }

        .payment-info {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .payment-method {
          font-size: 11px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
          display: inline-block;
          width: fit-content;
        }

        .payment-method.online { background: #E0F2FE; color: #0369A1; }
        .payment-method.cod { background: #FEF3C7; color: #92400E; }

        .payment-status {
          font-size: 10px;
          font-weight: 700;
          color: #64748B;
          text-transform: capitalize;
        }

        .payment-status.completed { color: #10B981; }
        .payment-status.pending { color: #F59E0B; }

        .actions-cell-premium { text-align: right; min-width: 120px; }
        .action-button-group {
          display: flex;
          gap: 6px;
          justify-content: flex-end;
          align-items: center;
          white-space: nowrap;
        }

        .copies-control {
          display: flex;
          align-items: center;
          gap: 4px;
          background: #F1F5F9;
          padding: 2px 6px;
          border-radius: 8px;
          border: 1px solid rgba(0,0,0,0.03);
        }

        .copies-label {
          font-size: 10px;
          font-weight: 700;
          color: #64748B;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .copies-override-input {
          width: 26px;
          padding: 2px 4px;
          border-radius: 6px;
          border: 1px solid rgba(0,0,0,0.1);
          background: white;
          font-family: 'Outfit';
          font-weight: 700;
          font-size: 12.5px;
          color: #111;
          text-align: center;
          outline: none;
          transition: border-color 0.2s;
        }

        .copies-override-input:focus {
          border-color: #1C7ED6;
          box-shadow: 0 0 0 2px rgba(28, 126, 214, 0.15);
        }

        /* Hide arrows/spinners in number input */
        .copies-override-input::-webkit-inner-spin-button, 
        .copies-override-input::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }

        .icon-action-btn {
          width: 30px;
          height: 30px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(0,0,0,0.08);
          background: white;
          cursor: pointer;
          transition: all 0.2s ease;
          color: #475569;
        }

        .icon-action-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          color: #111;
          border-color: #111;
        }

        .icon-action-btn.print:hover:not(:disabled) { background: #1C7ED6; color: white; border-color: #1C7ED6; box-shadow: 0 4px 12px rgba(28, 126, 214, 0.3); }
        .icon-action-btn.view:hover:not(:disabled) { background: #F8FAFC; color: #1E293B; border-color: #CBD5E1; }
        .icon-action-btn.cancel:hover:not(:disabled) { background: #FFF1F2; color: #E11D48; border-color: #FDA4AF; }

        .loader-box-premium, .empty-box-premium {
          padding: 100px 40px;
          text-align: center;
          color: #666;
        }

        .empty-icon-wrap {
          width: 90px;
          height: 90px;
          background: #F8F9FA;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 24px;
          color: #DDD;
        }

        .empty-box-premium h3 { font-family: 'Outfit'; font-size: 24px; color: #111; margin-bottom: 8px; }
        .empty-box-premium p { max-width: 400px; margin: 0 auto; line-height: 1.6; }

        .spinning { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

        .text-right { text-align: right; }
        .pref-loading { font-size: 11px; color: #888; font-style: italic; }
        .pref-details-box { display: flex; flex-direction: column; gap: 4px; }
        .pref-mode { display: flex; align-items: center; gap: 8px; }
        .copies-badge { 
          background: #1C7ED6; color: white; padding: 2px 6px; border-radius: 4px; 
          font-size: 10px; font-weight: 800; transform: translateY(-1px);
        }
        .pref-meta { display: flex; align-items: center; gap: 5px; font-size: 10px; color: #666; font-weight: 500; }
        .range-info { color: #1a73e8; font-weight: 700; }
      `}</style>
    </div>
  );
};

export default Dashboard;
