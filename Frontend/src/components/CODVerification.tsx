import React, { useState, useEffect } from "react";
import {
  Search,
  History,
  CheckCircle,
  Printer,
  XCircle,
  FileText,
  RefreshCcw,
} from "lucide-react";
import { API_BASE_URL, getHeaders } from "../config";

interface CODVerificationProps {
  vendorId: string;
}

const CODVerification: React.FC<CODVerificationProps> = ({ vendorId }) => {
  const [orderId, setOrderId] = useState("");
  const [activities, setActivities] = useState<any[]>([]);
  const [codOrders, setCodOrders] = useState<any[]>([]);
  const [allOrders, setAllOrders] = useState<any[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [vendorConfig, setVendorConfig] = useState({
    bw_printer: "",
    color_printer: "",
  });
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error";
  } | null>(null);

  const fetchVendorConfig = async () => {
    try {
      const token = localStorage.getItem("printr_token");
      if (!token) return;
      const response = await fetch(`${API_BASE_URL}/api/vendors/settings/me`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setVendorConfig({
          bw_printer: data.bw_printer || "",
          color_printer: data.color_printer || "",
        });
      }
    } catch (err) {
      console.warn("Failed to fetch vendor printer settings in COD:", err);
    }
  };

  const fetchCODOrders = async () => {
    try {
      const token = localStorage.getItem("printr_token");
      if (!vendorId || !token) return;
      const response = await fetch(
        `${API_BASE_URL}/api/vendors/files?vendor_id=${vendorId}`,
        {
          headers: getHeaders(),
        },
      );
      if (response.ok) {
        const data = await response.json();
        const files = data.files || [];
        setAllOrders(files);
        const codOnly = files.filter((o: any) => {
          const method = (o.payment_method || "").toLowerCase();
          return (
            method === "cash on delivery" ||
            method === "cod" ||
            method === "cash"
          );
        });
        setCodOrders(codOnly);
      }
    } catch (err) {
      console.error("Failed to fetch COD orders:", err);
    }
  };

  const fetchHistory = async () => {
    const token = localStorage.getItem("printr_token");
    if (!token) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/vendors/activity-log`, {
        headers: getHeaders(),
      });
      if (response.ok) {
        const data = await response.json();
        setActivities(data);
      }
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await Promise.all([fetchHistory(), fetchCODOrders(), fetchVendorConfig()]);
    setIsRefreshing(false);
  };

  useEffect(() => {
    fetchVendorConfig();
    fetchHistory();
    fetchCODOrders();
    const interval = setInterval(() => {
      fetchHistory();
      fetchCODOrders();
    }, 30000); // 30-second polling interval
    return () => clearInterval(interval);
  }, [vendorId]);

  // Clean and find the selected order record
  const cleanId = orderId
    .replace(/^[#\s]+/, "")
    .replace(/^ORD-?/i, "")
    .trim();
  const selectedOrder =
    codOrders.find(
      (o: any) =>
        String(o.id) === cleanId ||
        String(o.id) === orderId.trim() ||
        String(o.order_id || "") === cleanId,
    ) ||
    allOrders.find(
      (o: any) =>
        String(o.id) === cleanId ||
        String(o.id) === orderId.trim() ||
        String(o.order_id || "") === cleanId,
    );

  const handleSelectOrder = (id: string | number) => {
    const targetIdStr = String(id);
    setOrderId(targetIdStr);
    setIsVerified(false);
    setMessage(null);
  };

  const handleVerify = async () => {
    if (!orderId.trim()) {
      setMessage({ text: "Please enter an Order ID", type: "error" });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const targetId = selectedOrder ? selectedOrder.id : cleanId;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/vendors/update-order-status`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            orderId: targetId,
            status: "printed",
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setIsVerified(true);
        setMessage({
          text: `Order #${targetId} verified successfully! You can now print the document.`,
          type: "success",
        });
        fetchHistory();
        fetchCODOrders();
      } else {
        setMessage({
          text: data.message || `Failed to verify order #${targetId}`,
          type: "error",
        });
      }
    } catch (err: any) {
      setMessage({ text: `Network error: ${err.message}`, type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePrint = async () => {
    if (!orderId.trim()) {
      setMessage({
        text: "Please enter or select an Order ID to print",
        type: "error",
      });
      return;
    }

    if (!selectedOrder) {
      setMessage({
        text: `Could not find document details for Order #${cleanId}. Please check the ID.`,
        type: "error",
      });
      return;
    }

    const key = selectedOrder.file_key || (selectedOrder as any).fileKey;
    const name =
      selectedOrder.file_name || (selectedOrder as any).fileName || "document";
    const isColor = selectedOrder.is_color || false;

    if (!key) {
      setMessage({
        text: "File key is missing for this order record.",
        type: "error",
      });
      return;
    }

    setIsPrinting(true);
    setMessage(null);

    try {
      // 1. Get secure download link from backend
      const response = await fetch(`${API_BASE_URL}/api/vendors/download`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({
          file_key: key,
          id: selectedOrder.id,
        }),
      }).catch((err) => {
        throw new Error(`Backend unreachable: ${err.message}`);
      });

      const data = await response.json();
      if (!response.ok || !data.downloadUrl) {
        throw new Error(
          data.message ||
            "Failed to retrieve secure download link from server.",
        );
      }

      // 2. Download binary
      const fileResp = await fetch(data.downloadUrl).catch((err) => {
        throw new Error(`Download failed: ${err.message}`);
      });

      if (!fileResp.ok) {
        throw new Error(`Storage access rejected (${fileResp.status}).`);
      }

      const arrayBuffer = await fileResp.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      // 3. Spool to Electron printer or open in viewer
      const isElectron =
        typeof window !== "undefined" && (window as any).require;

      if (isElectron) {
        const path = (window as any).require("path");
        const fs = (window as any).require("fs");
        const os = (window as any).require("os");
        const { shell, ipcRenderer } = (window as any).require("electron");

        const tempPath = path.join(os.tmpdir(), `printr_cod_${name}`);
        fs.writeFileSync(tempPath, buffer);

        const printerName = isColor
          ? vendorConfig.color_printer
          : vendorConfig.bw_printer;

        if (printerName) {
          const printResult = await ipcRenderer.invoke("print-file", {
            filePath: tempPath,
            printerName,
            isColor: isColor,
            copies:
              selectedOrder.copies && selectedOrder.copies > 1
                ? selectedOrder.copies
                : 1,
            sides: "one-sided",
            pageSize: selectedOrder.page_size || "A4",
          });

          if (!printResult.success) {
            throw new Error(
              printResult.error || "Printer spooler encountered an issue.",
            );
          }

          setMessage({
            text: `Order #${selectedOrder.id} successfully sent to printer (${printerName})!`,
            type: "success",
          });
        } else {
          shell.openPath(tempPath);
          setMessage({
            text: `Order #${selectedOrder.id} document opened for printing.`,
            type: "success",
          });
        }
      } else {
        const blob = new Blob([buffer], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setMessage({
          text: `Order #${selectedOrder.id} opened in new window.`,
          type: "success",
        });
      }

      // Mark as printed in legacy table
      await fetch(`${API_BASE_URL}/api/vendors/printed-legacy`, {
        method: "POST",
        headers: getHeaders(),
        body: JSON.stringify({ id: selectedOrder.id }),
      }).catch(() => {});

      setIsVerified(true);
      fetchHistory();
      fetchCODOrders();
    } catch (err: any) {
      console.error("Print execution failed:", err);
      setMessage({ text: `Print failed: ${err.message}`, type: "error" });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleReject = async () => {
    if (!orderId.trim()) {
      setMessage({ text: "Please enter an Order ID to reject", type: "error" });
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    const targetId = selectedOrder ? selectedOrder.id : cleanId;

    try {
      const response = await fetch(
        `${API_BASE_URL}/api/vendors/update-order-status`,
        {
          method: "POST",
          headers: getHeaders(),
          body: JSON.stringify({
            orderId: targetId,
            status: "rejected",
          }),
        },
      );

      const data = await response.json();

      if (response.ok) {
        setMessage({
          text: `Order #${targetId} marked as rejected.`,
          type: "success",
        });
        setOrderId("");
        setIsVerified(false);
        fetchHistory();
        fetchCODOrders();
      } else {
        setMessage({
          text: data.message || `Failed to reject order #${targetId}`,
          type: "error",
        });
      }
    } catch (err: any) {
      setMessage({ text: `Error: ${err.message}`, type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (dateStr: string) => {
    const dt = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - dt.getTime()) / 60000); // mins

    if (diff < 1) return "Just now";
    if (diff < 60) return `${diff}m ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)}h ago`;
    return dt.toLocaleDateString();
  };

  return (
    <div className="cod-container">
      <div className="cod-list-sidebar glass-panel">
        <div className="cod-sidebar-header">
          <h3>Pending COD Orders</h3>
          <button
            className="cod-refresh-icon-btn"
            onClick={handleRefresh}
            disabled={isRefreshing}
            title="Refresh Orders"
          >
            <RefreshCcw size={16} className={isRefreshing ? "spinning" : ""} />
          </button>
        </div>
        <div className="cod-orders-list">
          {codOrders.length === 0 ? (
            <p className="no-cod">No pending COD orders</p>
          ) : (
            codOrders.map((order) => {
              const isSelected =
                orderId === order.id.toString() || cleanId === String(order.id);
              return (
                <div
                  key={order.id}
                  className={`cod-order-item ${isSelected ? "selected" : ""}`}
                  onClick={() => handleSelectOrder(order.id)}
                >
                  <div className="cod-order-main">
                    <span className="order-id">#{order.id}</span>
                    <span className="order-cost">
                      ₹{Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                  <div className="cod-order-footer">
                    <span className="order-sender">
                      {order.sender_name || "Customer"}
                    </span>
                    <span className="order-pages">
                      {order.page_count} pages
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      <div className="cod-main glass-panel">
        <div className="cod-card">
          <div className="cod-icon-header">
            <Search size={44} className="search-pulse" />
          </div>
          <h2>Transaction Verification</h2>
          <p>
            Scan or enter the Order ID to verify payment and process the print.
          </p>

          <div className="input-group">
            <input
              type="text"
              placeholder="e.g. #7721"
              value={orderId}
              onChange={(e) => {
                setOrderId(e.target.value);
                setIsVerified(false);
                setMessage(null);
              }}
              className="cod-input"
              disabled={isProcessing || isPrinting}
            />
          </div>

          {selectedOrder && (
            <div className="order-preview-card">
              <div className="order-preview-header">
                <div className="order-preview-id">
                  <FileText size={16} />
                  <span>Order #{selectedOrder.id}</span>
                </div>
                <span
                  className={`order-status-badge ${
                    isVerified ||
                    selectedOrder.status?.toLowerCase() === "printed"
                      ? "verified"
                      : "pending"
                  }`}
                >
                  {isVerified ||
                  selectedOrder.status?.toLowerCase() === "printed"
                    ? "Verified ✓"
                    : "Pending Payment"}
                </span>
              </div>
              <div className="order-preview-body">
                <div className="order-preview-row">
                  <span className="preview-label">File:</span>
                  <span className="preview-val file-val">
                    {selectedOrder.file_name ||
                      (selectedOrder as any).fileName ||
                      "Document"}
                  </span>
                </div>
                <div className="order-preview-row">
                  <span className="preview-label">Customer:</span>
                  <span className="preview-val">
                    {selectedOrder.sender_name || "Customer"}
                  </span>
                </div>
                <div className="order-preview-row">
                  <span className="preview-label">Amount:</span>
                  <span className="preview-val cost-val">
                    ₹{Number(selectedOrder.total_amount).toFixed(2)}
                  </span>
                </div>
                <div className="order-preview-row">
                  <span className="preview-label">Print Specs:</span>
                  <span className="preview-val">
                    {selectedOrder.page_count} pages •{" "}
                    {selectedOrder.is_color ? "Color" : "B&W"}{" "}
                    {selectedOrder.copies > 1
                      ? `• ${selectedOrder.copies} copies`
                      : ""}
                  </span>
                </div>
              </div>
            </div>
          )}

          <div className="cod-actions">
            <button
              className={`action-btn verify-btn ${isVerified ? "is-verified" : ""}`}
              onClick={handleVerify}
              disabled={isProcessing || isPrinting || !orderId.trim()}
            >
              <CheckCircle size={18} />
              <span>
                {isProcessing
                  ? "Verifying..."
                  : isVerified
                    ? "Verified ✓"
                    : "Verify Order"}
              </span>
            </button>

            <button
              className="action-btn print-btn"
              onClick={handlePrint}
              disabled={isPrinting || isProcessing || !orderId.trim()}
            >
              <Printer size={18} />
              <span>{isPrinting ? "Spooling Print..." : "Print Files"}</span>
            </button>
          </div>

          <div className="cod-secondary-actions">
            <button
              className="reject-link-btn"
              onClick={handleReject}
              disabled={isProcessing || isPrinting || !orderId.trim()}
            >
              <XCircle size={14} />
              <span>Reject Order</span>
            </button>
          </div>

          {message && (
            <div
              className={`cod-feedback-toast ${message.type === "success" ? "toast-success" : "toast-error"}`}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>

      <aside className="activity-log glass-panel">
        <div className="log-header">
          <History size={18} />
          <span>Activity Log</span>
        </div>
        <div className="timeline">
          {activities.length === 0 && (
            <p
              style={{ color: "#888", textAlign: "center", marginTop: "20px" }}
            >
              No recent activity
            </p>
          )}
          {activities.map((act, i) => (
            <div key={i} className="timeline-item">
              <div
                className={`timeline-dot ${act.status === "printed" ? "verified" : act.status === "cancelled" ? "cancelled" : "rejected"}`}
              ></div>
              <div className="timeline-content">
                <div className="timeline-top">
                  <span className="log-order">#{act.id}</span>
                  <span className="log-time">{formatTime(act.created_at)}</span>
                </div>
                <div className="timeline-bottom">
                  <span
                    className={`log-type ${act.status === "printed" ? "verified" : act.status === "cancelled" ? "cancelled" : "rejected"}`}
                  >
                    {act.status === "printed"
                      ? "Verified"
                      : act.status === "cancelled"
                        ? "Cancelled"
                        : "Rejected"}
                  </span>
                  <span className="log-customer">
                    {act.customer_name || "Anonymous"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </aside>
      <style>{`
        .cod-container {
          display: flex;
          height: 100%;
          gap: 24px;
          padding: 24px;
          flex: 1;
          background: var(--primary-bg);
        }

        .cod-list-sidebar {
          width: 320px;
          padding: 24px;
          border-radius: 24px;
          display: flex;
          flex-direction: column;
          background: var(--panel-bg);
          border: 1px solid var(--panel-border);
          box-shadow: var(--shadow-sm);
        }

        .cod-sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 20px;
        }

        .cod-list-sidebar h3 {
          font-size: 18px;
          margin: 0;
          color: var(--text-primary);
          font-weight: 600;
        }

        .cod-refresh-icon-btn {
          background: rgba(28, 126, 214, 0.08);
          border: 1px solid rgba(28, 126, 214, 0.2);
          color: var(--accent-blue);
          width: 32px;
          height: 32px;
          border-radius: 8px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cod-refresh-icon-btn:hover:not(:disabled) {
          background: var(--accent-blue);
          color: #ffffff;
          transform: rotate(45deg);
        }

        .cod-refresh-icon-btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .spinning {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          100% { transform: rotate(360deg); }
        }

        .cod-orders-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
          overflow-y: auto;
        }

        .cod-order-item {
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          border-radius: 12px;
          padding: 14px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .cod-order-item:hover {
          background: rgba(28, 126, 214, 0.05);
          border-color: var(--accent-blue);
          transform: translateX(4px);
        }

        .cod-order-main {
          display: flex;
          justify-content: space-between;
          margin-bottom: 6px;
        }

        .order-id {
          font-weight: 700;
          color: var(--accent-blue);
        }

        .order-cost {
          font-weight: 700;
          color: var(--text-primary);
        }

        .cod-order-footer {
          display: flex;
          justify-content: space-between;
          font-size: 12px;
          color: var(--text-secondary);
        }

        .no-cod {
          text-align: center;
          color: var(--text-muted);
          margin-top: 20px;
          font-style: italic;
        }

        .cod-main {
          flex: 1.5;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 32px;
          padding: 40px;
          background: var(--panel-bg);
          border: 1px solid var(--panel-border);
          box-shadow: var(--shadow-sm);
        }

        .cod-card {
           width: 100%;
           max-width: 500px;
           text-align: center;
        }

        .cod-icon-header {
          margin-bottom: 24px;
          color: var(--accent-blue);
          display: flex;
          justify-content: center;
        }

        .search-pulse {
          animation: searchIconPulse 2s infinite ease-in-out;
        }

        @keyframes searchIconPulse {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
          100% { transform: scale(1); opacity: 1; }
        }

        .cod-card h2 { font-size: 26px; margin-bottom: 8px; color: var(--text-primary); font-weight: 700; }
        .cod-card p { color: var(--text-secondary); margin-bottom: 24px; font-size: 14px; }

        .input-group {
          position: relative;
          margin-bottom: 20px;
        }

        .cod-input {
          width: 100%;
          background: var(--input-bg);
          border: 1px solid var(--input-border);
          padding: 16px 20px;
          border-radius: 14px;
          color: var(--text-primary);
          font-size: 17px;
          font-family: inherit;
          outline: none;
          transition: all 0.25s ease;
          box-sizing: border-box;
        }

        .cod-input:focus {
           background: #FFFFFF;
           border-color: var(--accent-blue);
           box-shadow: 0 0 0 4px rgba(28, 126, 214, 0.15);
        }

        .cod-order-item.selected {
          background: rgba(28, 126, 214, 0.1);
          border-color: var(--accent-blue);
          box-shadow: 0 2px 8px rgba(28, 126, 214, 0.15);
        }

        /* Order Preview Card */
        .order-preview-card {
          background: #ffffff;
          border: 1px solid var(--panel-border);
          border-radius: 16px;
          padding: 18px 20px;
          margin-bottom: 24px;
          text-align: left;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.03);
          animation: slideDown 0.2s ease-out;
        }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .order-preview-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 12px;
          border-bottom: 1px solid var(--panel-border);
          margin-bottom: 12px;
        }

        .order-preview-id {
          display: flex;
          align-items: center;
          gap: 8px;
          font-weight: 700;
          color: var(--accent-blue);
          font-size: 15px;
        }

        .order-status-badge {
          font-size: 11px;
          font-weight: 600;
          padding: 4px 10px;
          border-radius: 20px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .order-status-badge.pending {
          background: rgba(245, 159, 0, 0.12);
          color: #d97706;
          border: 1px solid rgba(245, 159, 0, 0.3);
        }

        .order-status-badge.verified {
          background: rgba(12, 166, 120, 0.12);
          color: #0ca678;
          border: 1px solid rgba(12, 166, 120, 0.3);
        }

        .order-preview-body {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .order-preview-row {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .preview-label {
          color: var(--text-secondary);
        }

        .preview-val {
          color: var(--text-primary);
          font-weight: 600;
        }

        .preview-val.file-val {
          max-width: 260px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .preview-val.cost-val {
          color: var(--accent-blue);
          font-size: 14px;
        }

        /* Action Buttons */
        .cod-actions {
          display: flex;
          gap: 14px;
          margin-bottom: 16px;
        }

        .action-btn {
          flex: 1;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 14px 18px;
          border-radius: 12px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none !important;
          box-shadow: none !important;
        }

        .verify-btn {
          background: #0ca678;
          color: #ffffff;
          box-shadow: 0 4px 12px rgba(12, 166, 120, 0.25);
        }

        .verify-btn:hover:not(:disabled) {
          background: #099268;
          transform: translateY(-2px);
          box-shadow: 0 6px 16px rgba(12, 166, 120, 0.35);
        }

        .verify-btn.is-verified {
          background: rgba(12, 166, 120, 0.15);
          color: #0ca678;
          border: 1px solid rgba(12, 166, 120, 0.35);
          box-shadow: none;
        }

        .print-btn {
          background: var(--accent-blue);
          color: #ffffff;
          box-shadow: 0 4px 14px rgba(28, 126, 214, 0.3);
        }

        .print-btn:hover:not(:disabled) {
          background: var(--accent-blue-hover);
          transform: translateY(-2px);
          box-shadow: 0 6px 18px rgba(28, 126, 214, 0.4);
        }

        .cod-secondary-actions {
          display: flex;
          justify-content: center;
          margin-bottom: 16px;
        }

        .reject-link-btn {
          background: transparent;
          border: none;
          color: var(--accent-red);
          font-size: 13px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          cursor: pointer;
          padding: 6px 12px;
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .reject-link-btn:hover:not(:disabled) {
          background: rgba(224, 49, 49, 0.08);
        }

        .reject-link-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        /* Feedback Toast */
        .cod-feedback-toast {
          padding: 12px 16px;
          border-radius: 10px;
          font-size: 13px;
          font-weight: 500;
          text-align: center;
          line-height: 1.4;
          animation: fadeIn 0.2s ease-in;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .cod-feedback-toast.toast-success {
          background: rgba(12, 166, 120, 0.1);
          color: #099268;
          border: 1px solid rgba(12, 166, 120, 0.25);
        }

        .cod-feedback-toast.toast-error {
          background: rgba(224, 49, 49, 0.1);
          color: #c92a2a;
          border: 1px solid rgba(224, 49, 49, 0.25);
        }

        .activity-log {
          flex: 1;
          border-radius: 32px;
          padding: 32px;
          display: flex;
          flex-direction: column;
          background: var(--panel-bg);
          border: 1px solid var(--panel-border);
          box-shadow: var(--shadow-sm);
        }

        .log-header {
           display: flex; align-items: center; gap: 10px; margin-bottom: 24px;
           color: var(--text-primary); font-weight: 600;
        }

        .timeline { display: flex; flex-direction: column; gap: 24px; flex: 1; overflow-y: auto; }

        .timeline-item { display: flex; gap: 16px; position: relative; }
        
        .timeline-item::after {
          content: ''; position: absolute; left: 6px; top: 20px; bottom: -20px;
          width: 1px; background: var(--input-border);
        }

        .timeline-item:last-child::after { display: none; }

        .timeline-dot {
          width: 12px; height: 12px; border-radius: 50%; background: var(--text-muted); margin-top: 6px; z-index: 1;
        }
        .timeline-dot.verified { background: var(--accent-green); box-shadow: 0 0 8px rgba(12, 166, 120, 0.4); }
        .timeline-dot.rejected { background: var(--accent-red); box-shadow: 0 0 8px rgba(224, 49, 49, 0.4); }
        .timeline-dot.cancelled { background: var(--text-muted); box-shadow: 0 0 8px var(--text-muted); }

        .timeline-content { flex: 1; border-radius: 12px; padding: 12px; background: var(--input-bg); border: 1px solid var(--input-border); }

        .timeline-top { display: flex; justify-content: space-between; margin-bottom: 4px; }
        .log-order { font-weight: 600; font-size: 14px; color: var(--text-primary); }
        .log-time { color: var(--text-muted); font-size: 11px; }

        .timeline-bottom { display: flex; justify-content: space-between; }
        .log-type { font-size: 11px; font-weight: 700; text-transform: uppercase; }
        .log-type.verified { color: var(--accent-green); }
        .log-type.rejected { color: var(--accent-red); }
        .log-type.cancelled { color: var(--text-muted); }
        .log-customer { font-size: 12px; color: var(--text-secondary); }
       `}</style>
    </div>
  );
};

export default CODVerification;
