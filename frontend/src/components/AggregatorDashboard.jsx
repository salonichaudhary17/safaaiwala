import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useRealtimeHandover } from '../hooks/useRealtimeHandover';
import { savePendingTransaction } from '../lib/offlineStore';
import { useAudioGuidance } from '../hooks/useAudioGuidance';

export const AggregatorDashboard = ({ aggregatorId }) => {
  const { t } = useTranslation();
  const { speak } = useAudioGuidance();

  const [scannedData, setScannedData] = useState(null);
  const [otpInput, setOtpInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');

  // WebSocket hook for real-time state synchronization
  const { confirmHandoverComplete } = useRealtimeHandover(
    aggregatorId,
    (event) => {
      if (event.type === 'REQUESTED') {
        speak('नया लेन-देन प्राप्त हुआ'); // Voice alert: New transaction received
        setScannedData(event.data);
      }
    }
  );

  // Fallback simulator for QR scanner payload input
  const handleSimulatedScan = (e) => {
    try {
      const parsed = JSON.parse(e.target.value);
      setScannedData(parsed);
    } catch {
      // Invalid JSON input ignored
    }
  };

  // Complete handover verification & processing
  const handleVerifyAndPay = async () => {
    if (!scannedData) return;

    // Validate OTP matching
    if (scannedData.code && otpInput !== String(scannedData.code)) {
      setStatusMessage('गलत कोड / Invalid Code');
      speak('गलत कोड');
      return;
    }

    setIsProcessing(true);

    const transactionPayload = {
      collectorId: scannedData.collectorId,
      aggregatorId,
      materials: scannedData.materials,
      totalAmount: scannedData.totalAmount,
      paymentMethod: 'CASH',
      code: otpInput,
      timestamp: new Date().toISOString(),
    };

    if (navigator.onLine) {
      try {
        const response = await fetch('/api/handover/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(transactionPayload),
        });

        if (response.ok) {
          const resData = await response.json();
          confirmHandoverComplete(scannedData.collectorId, resData.transactionId);
          setStatusMessage('लेन-देन सफल! / Success!');
          speak('भुगतान पूरा हुआ'); // Voice alert: Payment complete
          setScannedData(null);
          setOtpInput('');
        } else {
          throw new Error('Server verification failed');
        }
      } catch {
        // Fall back to offline storage on server failure
        await savePendingTransaction(transactionPayload);
        confirmHandoverComplete(scannedData.collectorId, 'OFFLINE_TEMP_ID');
        setStatusMessage('ऑफलाइन सेव हुआ / Saved Offline');
        speak('ऑफलाइन सुरक्षित किया गया');
        setScannedData(null);
        setOtpInput('');
      }
    } else {
      // Queue transaction in IndexedDB when offline
      await savePendingTransaction(transactionPayload);
      confirmHandoverComplete(scannedData.collectorId, 'OFFLINE_TEMP_ID');
      setStatusMessage('ऑफलाइन सेव हुआ / Saved Offline');
      speak('ऑफलाइन सुरक्षित किया गया');
      setScannedData(null);
      setOtpInput('');
    }

    setIsProcessing(false);
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-4 font-sans">
      <div className="bg-emerald-800 text-white p-4 rounded-xl shadow-md flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold">{t('appName')} - व्यापारी पोर्टल</h1>
          <p className="text-xs text-emerald-200">Scrap Aggregator Dashboard</p>
        </div>
        <div className={`w-3 h-3 rounded-full ${navigator.onLine ? 'bg-green-400' : 'bg-amber-400'}`} />
      </div>

      {statusMessage && (
        <div className="p-3 bg-blue-50 text-blue-900 border border-blue-200 rounded-lg text-center font-bold">
          {statusMessage}
        </div>
      )}

      {!scannedData ? (
        <div className="border-2 border-dashed border-gray-300 rounded-2xl p-6 text-center bg-gray-50">
          <span className="text-4xl block mb-2">📷</span>
          <p className="text-sm font-semibold text-gray-700">QR कोड स्कैन करें / Scan Collector QR</p>
          
          <textarea
            className="mt-4 w-full text-xs p-2 border rounded-lg bg-white"
            rows="3"
            placeholder="Paste raw QR payload JSON here to test..."
            onChange={handleSimulatedScan}
          />
        </div>
      ) : (
        <div className="bg-white border rounded-2xl p-5 shadow-lg space-y-4">
          <h2 className="text-lg font-bold border-b pb-2 text-gray-800">
            सामग्री विवरण / Handover Details
          </h2>

          <div className="space-y-2">
            {scannedData.materials?.map((mat, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm bg-gray-50 p-2 rounded-lg">
                <span className="font-semibold">{mat.materialType}</span>
                <span>{mat.weightKg} kg × ₹{mat.ratePerKg}</span>
                <span className="font-bold text-emerald-700">₹{mat.subtotal}</span>
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-lg font-black bg-emerald-50 p-3 rounded-xl text-emerald-900">
            <span>कुल राशि / Total:</span>
            <span>₹{scannedData.totalAmount}</span>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-600 mb-1">
              सत्यापन कोड (OTP) दर्ज करें:
            </label>
            <input
              type="number"
              value={otpInput}
              onChange={(e) => setOtpInput(e.target.value)}
              placeholder="Enter 4-digit OTP"
              className="w-full text-center text-2xl font-black tracking-widest border-2 border-emerald-500 rounded-xl py-2 focus:outline-none"
            />
          </div>

          <button
            onClick={handleVerifyAndPay}
            disabled={isProcessing || !otpInput}
            className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white font-black py-3 rounded-xl shadow-md transition-all text-lg"
          >
            {isProcessing ? 'प्रक्रिया जारी है...' : 'भुगतान पुष्टि / Confirm Handover'}
          </button>
        </div>
      )}
    </div>
  );
};

export default AggregatorDashboard;