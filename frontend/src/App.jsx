import React, { useState, useEffect } from 'react';
import VoiceAssistant from './components/VoiceAssistant';
import Scanner from './components/Scanner';
import LivePrices from './components/LivePrices';
import RecyclerDashboard from './components/RecyclerDashboard';
import ReceiptModal from './components/ReceiptModal';
import { queueOfflineTransaction, syncOfflineData } from './db/offlineDb';
import { Recycle, Wifi, WifiOff } from 'lucide-react';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function App() {
  const [activeTab, setActiveTab] = useState('scanner');
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [currentReceipt, setCurrentReceipt] = useState(null);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineData(API_BASE_URL);
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleScanComplete = async (analysisResult) => {
    const mockTransaction = {
      userId: '650000000000000000000001',
      itemsList: [{
        materialName: analysisResult.itemType,
        category: analysisResult.category,
        weightKg: 1,
        ratePerKg: analysisResult.estimatedValuePerKg,
        subtotal: analysisResult.estimatedValuePerKg
      }],
      totalAmount: analysisResult.estimatedValuePerKg
    };

    if (isOnline) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/transactions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(mockTransaction)
        });
        const data = await res.json();
        setCurrentReceipt(data.transaction || mockTransaction);
      } catch (err) {
        await queueOfflineTransaction(mockTransaction);
        setCurrentReceipt(mockTransaction);
      }
    } else {
      await queueOfflineTransaction(mockTransaction);
      setCurrentReceipt({ ...mockTransaction, dynamicQrCode: 'https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=OFFLINE_TXN' });
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-800 font-sans">
      {/* Header */}
      <header className="bg-emerald-800 text-white sticky top-0 z-40 shadow-md">
        <div className="max-w-6xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500 p-2 rounded-lg text-slate-900 font-black">
              SW
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">SAFAAIWALA</h1>
              <p className="text-[10px] text-emerald-300 font-medium tracking-wide uppercase">Waste & E-Waste Management Platform</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isOnline ? 'bg-emerald-700 text-emerald-100' : 'bg-amber-600 text-white'
            }`}>
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'ONLINE' : 'OFFLINE MODE'}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 py-6">
        {/* Voice Assistant Module */}
        <VoiceAssistant onNavigate={(tab) => setActiveTab(tab)} />

        {/* Navigation Tabs */}
        <div className="flex bg-slate-200 p-1 rounded-xl mb-6 max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('scanner')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'scanner' ? 'bg-white shadow text-emerald-700' : 'text-slate-600'}`}
          >
            Scanner
          </button>
          <button
            onClick={() => setActiveTab('prices')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'prices' ? 'bg-white shadow text-emerald-700' : 'text-slate-600'}`}
          >
            Aaj Ka Bhaav
          </button>
          <button
            onClick={() => setActiveTab('recycler')}
            className={`flex-1 py-2 rounded-lg font-bold text-sm transition ${activeTab === 'recycler' ? 'bg-white shadow text-emerald-700' : 'text-slate-600'}`}
          >
            Recycler Portal
          </button>
        </div>

        {/* Tab Views */}
        {activeTab === 'scanner' && (
          <div className="max-w-xl mx-auto">
            <Scanner apiBaseUrl={API_BASE_URL} onAnalysisComplete={handleScanComplete} />
          </div>
        )}

        {activeTab === 'prices' && (
          <div className="max-w-3xl mx-auto">
            <LivePrices apiBaseUrl={API_BASE_URL} />
          </div>
        )}

        {activeTab === 'recycler' && (
          <RecyclerDashboard />
        )}
      </main>

      {/* Digital Receipt Modal */}
      {currentReceipt && (
        <ReceiptModal transaction={currentReceipt} onClose={() => setCurrentReceipt(null)} />
      )}
    </div>
  );
}
