import React, { useState } from 'react';
import { Truck, ShieldCheck, Hash, PackageCheck, MapPin } from 'lucide-react';

export default function RecyclerDashboard() {
  const [incomingBatches, setIncomingBatches] = useState([
    {
      id: 'TXN-90812',
      origin: 'Okhla Industrial Area, Sector 4',
      material: 'E-Waste (Motherboards & Transformers)',
      weightKg: 145.5,
      status: 'In Transit',
      batchHash: 'a7b8f9e01234c5678d90ef123456789a',
      hazardLevel: 'Moderate'
    },
    {
      id: 'TXN-90815',
      origin: 'Mayapuri Metal Yard, Block B',
      material: 'Copper Scrap & Shredded Wires',
      weightKg: 320.0,
      status: 'Scheduled',
      batchHash: 'f1e2d3c4b5a697887766554433221100',
      hazardLevel: 'Low'
    }
  ]);

  const verifyBatch = (id) => {
    setIncomingBatches(prev => prev.map(item => item.id === id ? { ...item, status: 'Verified & Logged' } : item));
  };

  return (
    <div className="bg-slate-900 text-white p-6 rounded-xl shadow-xl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Truck className="text-emerald-400" /> Recycler Management Portal
          </h2>
          <p className="text-slate-400 text-sm">Batch verification & custody chain tracking</p>
        </div>
        <div className="bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
          <span className="text-xs text-slate-400 block">Facility Capacity</span>
          <span className="text-emerald-400 font-bold">4,850 / 10,000 KG</span>
        </div>
      </div>

      <div className="grid gap-4">
        {incomingBatches.map(batch => (
          <div key={batch.id} className="bg-slate-800 p-4 rounded-lg border border-slate-700 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs bg-slate-700 text-emerald-300 px-2 py-0.5 rounded">{batch.id}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {batch.status}
                </span>
              </div>
              <h4 className="font-bold text-lg text-slate-100">{batch.material}</h4>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-500" /> Origin: {batch.origin}
              </p>
              <p className="text-xs text-slate-500 font-mono flex items-center gap-1">
                <Hash className="w-3 h-3" /> Hash: {batch.batchHash}
              </p>
            </div>

            <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
              <div className="text-right">
                <span className="text-xs text-slate-400 block">Batch Weight</span>
                <span className="text-xl font-extrabold text-emerald-400">{batch.weightKg} KG</span>
              </div>

              {batch.status !== 'Verified & Logged' ? (
                <button
                  onClick={() => verifyBatch(batch.id)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-1 transition"
                >
                  <ShieldCheck className="w-4 h-4" /> Verify Batch
                </button>
              ) : (
                <span className="bg-emerald-900/50 text-emerald-400 text-xs px-3 py-2 rounded border border-emerald-700/50 flex items-center gap-1">
                  <PackageCheck className="w-4 h-4" /> Logged
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
