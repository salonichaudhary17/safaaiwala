import React from 'react';
import { X, Printer, Download, CheckCircle2 } from 'lucide-react';

export default function ReceiptModal({ transaction, onClose }) {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200">
        <div className="flex justify-between items-center pb-4 border-b">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600 w-6 h-6" />
            <h3 className="font-bold text-lg text-slate-800">Safaaiwala Receipt</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        <div className="py-4 space-y-4">
          <div className="flex justify-between text-xs text-slate-500 font-mono">
            <span>TXN ID: {transaction._id || 'TXN-4910293'}</span>
            <span>{new Date().toLocaleDateString('en-IN')}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
            <span className="text-xs text-slate-400 uppercase font-bold block mb-2">Itemized Breakdown</span>
            {transaction.itemsList?.map((item, idx) => (
              <div key={idx} className="flex justify-between text-sm py-1 border-b border-slate-200/50 last:border-0">
                <span className="text-slate-700">{item.materialName} ({item.weightKg} kg)</span>
                <span className="font-semibold text-slate-800">₹{item.subtotal}</span>
              </div>
            ))}
          </div>

          <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex justify-between items-center">
            <div>
              <span className="text-xs text-emerald-700 font-bold block">Environmental Impact Score</span>
              <span className="text-xs text-emerald-600">Saved ~{Math.round((transaction.totalAmount || 100) * 0.4)}kg CO2e emissions</span>
            </div>
            <span className="text-xl font-black text-emerald-700">₹{transaction.totalAmount}</span>
          </div>

          {transaction.dynamicQrCode && (
            <div className="flex flex-col items-center justify-center pt-2">
              <img src={transaction.dynamicQrCode} alt="Dynamic Verification QR Code" className="w-32 h-32 border p-1 rounded-lg" />
              <span className="text-[10px] text-slate-400 mt-1">Scan to verify custody chain on-chain</span>
            </div>
          )}
        </div>

        <div className="flex gap-2 pt-4 border-t">
          <button onClick={handlePrint} className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-sm">
            <Printer className="w-4 h-4" /> Print
          </button>
          <button onClick={onClose} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 text-sm">
            <Download className="w-4 h-4" /> Done
          </button>
        </div>
      </div>
    </div>
  );
}
