import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

export const HandoverQRGenerator = ({ transactionData, verificationCode }) => {
  const payload = JSON.stringify({
    collectorId: transactionData.collectorId,
    totalAmount: transactionData.totalAmount,
    materials: transactionData.materials,
    code: verificationCode,
    timestamp: Date.now(),
  });

  return (
    <div className="p-6 bg-white rounded-2xl shadow-lg border border-gray-100 text-center max-w-sm mx-auto">
      <h3 className="text-lg font-bold text-gray-800 mb-2">स्कैन करें / Scan QR</h3>
      <p className="text-sm text-gray-500 mb-4">दुकानदार को यह कोड दिखाएं</p>
      
      <div className="flex justify-center p-4 bg-gray-50 rounded-xl border">
        <QRCodeSVG value={payload} size={200} level="H" includeMargin />
      </div>

      <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
        <span className="text-xs text-amber-800 font-medium">OTP: </span>
        <span className="text-xl font-black text-amber-900 tracking-wider">{verificationCode}</span>
      </div>
    </div>
  );
};