import React, { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { TrendingUp, TrendingDown, Minus, RefreshCw } from 'lucide-react';

export default function LivePrices({ apiBaseUrl }) {
  const [prices, setPrices] = useState([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetch(`${apiBaseUrl}/api/waste/prices`)
      .then(res => res.json())
      .then(data => setPrices(data))
      .catch(err => console.error('Error fetching prices:', err));

    // Real-time WebSocket setup
    const socket = io(apiBaseUrl);
    socket.on('connect', () => setConnected(true));
    socket.on('price_update', (updatedPrices) => setPrices(updatedPrices));
    socket.on('disconnect', () => setConnected(false));

    return () => socket.disconnect();
  }, [apiBaseUrl]);

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Aaj Ka Bhaav (Live Rates)</h2>
          <p className="text-xs text-slate-500">Dynamic scrap & e-waste market pricing updates</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-xs font-medium text-slate-600">{connected ? 'Live Sync' : 'Offline'}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-100 text-slate-600 text-xs uppercase tracking-wider">
              <th className="p-3 rounded-l-lg">Material</th>
              <th className="p-3">Category</th>
              <th className="p-3">Rate (per Kg)</th>
              <th className="p-3 rounded-r-lg text-right">Trend</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {prices.map((item, idx) => (
              <tr key={item.id || idx} className="hover:bg-slate-50 transition">
                <td className="p-3 font-semibold text-slate-800">{item.material || item.materialId?.name}</td>
                <td className="p-3 text-slate-500 capitalize">{item.category || item.materialId?.category}</td>
                <td className="p-3 font-bold text-emerald-700">₹{item.currentRate}</td>
                <td className="p-3 text-right">
                  {item.trend === 'up' && <span className="inline-flex items-center text-emerald-600 text-xs font-bold gap-1"><TrendingUp className="w-4 h-4" /> +Up</span>}
                  {item.trend === 'down' && <span className="inline-flex items-center text-red-500 text-xs font-bold gap-1"><TrendingDown className="w-4 h-4" /> -Down</span>}
                  {item.trend === 'stable' && <span className="inline-flex items-center text-slate-400 text-xs font-bold gap-1"><Minus className="w-4 h-4" /> Stable</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
