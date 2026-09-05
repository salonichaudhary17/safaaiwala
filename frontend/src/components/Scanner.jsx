import React, { useRef, useState } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle, WifiOff } from 'lucide-react';

export default function Scanner({ apiBaseUrl, onAnalysisComplete }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
      }
    } catch (err) {
      alert('Camera access denied or unavailable.');
    }
  };

  const captureAndAnalyze = async () => {
    if (!canvasRef.current || !videoRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg');
    setLoading(true);

    if (navigator.onLine) {
      try {
        const res = await fetch(`${apiBaseUrl}/api/waste/classify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageBase64: base64Image })
        });
        const data = await res.json();
        setAnalysis(data);
        if (onAnalysisComplete) onAnalysisComplete(data);
      } catch (err) {
        runOfflineFallbackAnalysis(ctx, canvas);
      }
    } else {
      runOfflineFallbackAnalysis(ctx, canvas);
    }
    setLoading(false);
  };

  // Client-side Canvas Fallback Image Pixel Analysis
  const runOfflineFallbackAnalysis = (ctx, canvas) => {
    setIsOfflineMode(true);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    let greenCount = 0;
    let metallicCount = 0;

    for (let i = 0; i < data.length; i += 16) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      // Detect Green (Printed Circuit Boards)
      if (g > r + 20 && g > b + 20) greenCount++;
      // Detect Metallic Shine (High RGB intensity with low variance)
      if (r > 150 && g > 150 && b > 150 && Math.abs(r - g) < 20) metallicCount++;
    }

    const isEwastePCB = greenCount > (data.length / 16) * 0.15;
    const isMetal = metallicCount > (data.length / 16) * 0.2;

    const fallbackResult = isEwastePCB ? {
      category: 'e-waste',
      itemType: 'Circuit Board (Offline Detected)',
      recyclability: 'High',
      estimatedValuePerKg: 160,
      hazardLevel: 'Moderate',
      disposalTips: 'Contains recoverable gold & copper. Deliver to licensed recycler.'
    } : isMetal ? {
      category: 'metal',
      itemType: 'Metallic Scrap (Offline Detected)',
      recyclability: 'High',
      estimatedValuePerKg: 120,
      hazardLevel: 'Low',
      disposalTips: 'Clean scrap iron/aluminium. Ready for direct smelting.'
    } : {
      category: 'plastic',
      itemType: 'Mixed Polymer Plastic (Offline Detected)',
      recyclability: 'Medium',
      estimatedValuePerKg: 25,
      hazardLevel: 'Low',
      disposalTips: 'Separate by resin code before recycling.'
    };

    setAnalysis(fallbackResult);
    if (onAnalysisComplete) onAnalysisComplete(fallbackResult);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-md border border-slate-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Camera className="text-emerald-600" /> Vision AI Waste Classifier
        </h2>
        {isOfflineMode && (
          <span className="bg-amber-100 text-amber-800 text-xs px-3 py-1 rounded-full flex items-center gap-1 font-medium">
            <WifiOff className="w-3 h-3" /> Offline Canvas Fallback Active
          </span>
        )}
      </div>

      <div className="relative bg-slate-900 rounded-lg overflow-hidden aspect-video flex items-center justify-center mb-4">
        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${!isStreaming && 'hidden'}`} />
        <canvas ref={canvasRef} className="hidden" />

        {!isStreaming && (
          <button onClick={startCamera} className="bg-emerald-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-emerald-700 flex items-center gap-2">
            <Camera /> Start Camera
          </button>
        )}
      </div>

      {isStreaming && (
        <button
          onClick={captureAndAnalyze}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-3 rounded-lg font-bold transition flex items-center justify-center gap-2 mb-6"
        >
          {loading ? <RefreshCw className="animate-spin" /> : <Camera />}
          {loading ? 'Analyzing Material...' : 'Scan & Identify Item'}
        </button>
      )}

      {analysis && (
        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
          <div className="flex justify-between items-start mb-2">
            <div>
              <span className="text-xs uppercase font-bold tracking-wider text-emerald-600">{analysis.category}</span>
              <h4 className="text-lg font-bold text-slate-800">{analysis.itemType}</h4>
            </div>
            <span className="text-emerald-700 font-extrabold text-lg">
              ₹{analysis.estimatedValuePerKg} / kg
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-sm my-3">
            <div className="bg-white p-2 rounded border">
              <span className="text-slate-500 block text-xs">Recyclability</span>
              <span className="font-semibold text-slate-700">{analysis.recyclability}</span>
            </div>
            <div className="bg-white p-2 rounded border">
              <span className="text-slate-500 block text-xs">Hazard Level</span>
              <span className="font-semibold text-slate-700">{analysis.hazardLevel}</span>
            </div>
          </div>

          <p className="text-xs text-slate-600 bg-emerald-50 p-2 rounded border border-emerald-100 flex items-center gap-1">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            {analysis.disposalTips}
          </p>
        </div>
      )}
    </div>
  );
}