import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Download, Printer, X } from "lucide-react";

export default function ReceiptModal({ receipt, onClose }) {
  const [qrUrl, setQrUrl] = useState("");
  const printRef = useRef(null);

  useEffect(() => {
    if (!receipt?.dynamicQrCode && !receipt?.transactionId) {
      setQrUrl("");
      return;
    }
    const payload =
      typeof receipt.dynamicQrCode === "string" && receipt.dynamicQrCode
        ? receipt.dynamicQrCode
        : JSON.stringify({
            platform: "safaaiwala",
            transactionId: receipt.transactionId,
            hash: receipt.referenceHash,
          });

    QRCode.toDataURL(payload, {
      width: 240,
      margin: 1,
      color: { dark: "#085041", light: "#ffffff" },
    }).then(setQrUrl);
  }, [receipt]);

  if (!receipt) return null;

  const items = receipt.items || [];
  const recyclerName =
    receipt.recycler?.name || receipt.recycler?.location || "Authorized recycler";

  function printReceipt() {
    const node = printRef.current;
    if (!node) return;
    const popup = window.open("", "safaaiwala-receipt", "width=420,height=720");
    if (!popup) {
      window.print();
      return;
    }
    popup.document.write(`<!doctype html><html><head><title>${receipt.transactionId}</title>
      <style>
        body { font-family: sans-serif; padding: 16px; color: #1f2a24; }
        h1 { font-size: 18px; }
        table { width: 100%; border-collapse: collapse; }
        td, th { text-align: left; padding: 6px 0; border-bottom: 1px solid #ddd; }
        img { width: 160px; }
      </style></head><body>${node.innerHTML}</body></html>`);
    popup.document.close();
    popup.focus();
    popup.print();
  }

  function downloadReceipt() {
    const lines = [
      "Safaaiwala Digital Receipt",
      `Transaction: ${receipt.transactionId}`,
      `Status: ${receipt.status}`,
      `Recycler: ${recyclerName}`,
      `Collector: ${receipt.collectorId}`,
      "",
      "Items:",
      ...items.map(
        (item) =>
          `- ${item.itemType || item.materialCode}: ${item.weightKg} kg x ₹${item.ratePerKg} = ₹${item.amount}`
      ),
      "",
      `Subtotal: ₹${receipt.subtotal}`,
      `Tax / environmental charge: ₹${receipt.taxAmount}`,
      `Total: ₹${receipt.totalAmount}`,
      `Impact score: ${receipt.environmentalImpactScore}/100`,
      `Hash: ${receipt.referenceHash}`,
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${receipt.transactionId}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="modal-card">
        <div className="row between">
          <div className="h2">Digital receipt</div>
          <button type="button" className="btn btn-secondary" onClick={onClose}>
            <X size={16} />
          </button>
        </div>
        <div ref={printRef} className="receipt-body">
          <h1>Safaaiwala</h1>
          <p>Waste & e-waste handover invoice</p>
          <p>
            <strong>{receipt.transactionId}</strong>
          </p>
          <p>Recycler: {recyclerName}</p>
          <p>Collector: {receipt.collectorId}</p>
          <p>Status: {receipt.status}</p>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Kg</th>
                <th>₹</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.materialCode}-${index}`}>
                  <td>{item.itemType || item.materialCode}</td>
                  <td>{item.weightKg}</td>
                  <td>{item.amount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>Subtotal: ₹{receipt.subtotal}</p>
          <p>Tax / env. charge: ₹{receipt.taxAmount}</p>
          <p>
            <strong>Total: ₹{receipt.totalAmount}</strong>
          </p>
          <p>Environmental impact score: {receipt.environmentalImpactScore}/100</p>
          {qrUrl ? <img src={qrUrl} alt="Transaction QR code" /> : null}
          <p>Hash {String(receipt.referenceHash || "").slice(0, 24)}…</p>
        </div>
        <div className="row">
          <button type="button" className="btn btn-primary" onClick={printReceipt}>
            <Printer size={16} />
            Print
          </button>
          <button type="button" className="btn btn-secondary" onClick={downloadReceipt}>
            <Download size={16} />
            Download
          </button>
        </div>
      </div>
    </div>
  );
}
