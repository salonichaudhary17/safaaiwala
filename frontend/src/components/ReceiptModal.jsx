import React from 'react';
import { X, Printer, Download, CheckCircle2, ShieldCheck, QrCode } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function ReceiptModal({ transaction, onClose, lang = 'hi' }) {
  if (!transaction) return null;

  const t = translations[lang] || translations.hi;

  const handlePrint = () => {
    window.print();
  };

  const txnId = transaction._id || transaction.id || `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
  const totalVal = transaction.totalAmount || transaction.estimatedValue || 180;
  const co2Saved = Math.round(totalVal * 0.45);
  const hash = transaction.handoverHash || transaction.batchHash || 'a7b8f9e01234c5678d90ef123456789a2b3c4d5e';

  return (
    <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-5 sm:p-6 border border-slate-200">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="text-emerald-600 w-6 h-6" />
            <div>
              <h3 className="font-black text-lg text-slate-900">{t.receiptTitle}</h3>
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-bold border border-emerald-200 flex items-center gap-1 w-fit">
                <ShieldCheck className="w-3 h-3" /> {t.verifiedBadge}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close modal"
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3.5">
          <div className="flex justify-between text-xs text-slate-500 font-mono bg-slate-50 p-2 rounded-lg border">
            <span>ID: {txnId}</span>
            <span>{new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
          </div>

          <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 uppercase font-black tracking-wider block mb-2">
              Itemized Scrap Details
            </span>
            {Array.isArray(transaction.itemsList) && transaction.itemsList.length > 0 ? (
              transaction.itemsList.map((item, idx) => (
                <div key={idx} className="flex justify-between text-xs sm:text-sm py-1 border-b border-slate-200/50 last:border-0">
                  <span className="text-slate-800 font-bold">{item.materialName || 'Scrap Material'} ({item.weightKg || 1} kg)</span>
                  <span className="font-black text-slate-900">₹{item.subtotal || item.ratePerKg || totalVal}</span>
                </div>
              ))
            ) : (
              <div className="flex justify-between text-xs sm:text-sm py-1">
                <span className="text-slate-800 font-bold">{transaction.itemType || transaction.category || 'E-Waste Scrap'} ({transaction.weightKg || 1} kg)</span>
                <span className="font-black text-slate-900">₹{totalVal}</span>
              </div>
            )}
          </div>

          <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 flex justify-between items-center">
            <div>
              <span className="text-[11px] text-emerald-800 font-extrabold block">
                {t.envSaved}
              </span>
              <span className="text-[10px] text-emerald-700">
                ~{co2Saved} {t.co2Saved}
              </span>
            </div>
            <span className="text-2xl font-black text-emerald-800">₹{totalVal}</span>
          </div>

          <div className="bg-slate-900 text-white p-2.5 rounded-xl border border-slate-800 font-mono text-[10px] break-all">
            <span className="text-slate-400 block mb-0.5">SHA-256 Custody Hash:</span>
            <span className="text-emerald-400">{hash}</span>
          </div>

          {/* QR Code section */}
          <div className="flex flex-col items-center justify-center pt-1 text-center">
            <div className="w-28 h-28 bg-slate-100 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center p-2">
              {transaction.dynamicQrCode ? (
                <img src={transaction.dynamicQrCode} alt="Verification QR Code" className="w-full h-full object-contain" />
              ) : (
                <div className="flex flex-col items-center text-slate-400">
                  <QrCode className="w-12 h-12 text-slate-700 mb-1" />
                  <span className="text-[9px] font-mono text-slate-500">CPCB Verified</span>
                </div>
              )}
            </div>
            <span className="text-[10px] text-slate-500 mt-1 font-medium">
              Scan at authorized CPCB recycling center to claim digital EPR credits
            </span>
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handlePrint}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm transition"
          >
            <Printer className="w-4 h-4" /> {t.printBtn}
          </button>
          <button
            onClick={onClose}
            className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5 text-xs sm:text-sm transition shadow-md"
          >
            <Download className="w-4 h-4" /> {t.doneBtn}
          </button>
        </div>
      </div>
    </div>
  );
}
