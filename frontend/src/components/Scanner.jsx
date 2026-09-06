import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, AlertTriangle, CheckCircle, WifiOff, Volume2, Plus, Minus, ShieldAlert, Sparkles, Package } from 'lucide-react';
import { translations } from '../i18n/translations';

export default function Scanner({ apiBaseUrl, onAnalysisComplete, lang = 'hi' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isOfflineMode, setIsOfflineMode] = useState(!navigator.onLine);
  const [weightKg, setWeightKg] = useState(1);
  const [selectedMaterialKey, setSelectedMaterialKey] = useState(null);

  const t = translations[lang] || translations.hi;

  // Comprehensive materials database with vernacular attributes
  const MATERIALS = {
    pcb: {
      key: 'pcb',
      name: t.pcbName,
      category: 'e-waste',
      rate: 180,
      hazard: 'High',
      hazardText: t.hazardHigh,
      recyclability: 'High (CPCB Recycler)',
      tip: t.pcbTip,
      icon: '🖥️'
    },
    battery: {
      key: 'battery',
      name: t.batteryName,
      category: 'hazardous',
      rate: 220,
      hazard: 'Critical',
      hazardText: t.hazardCritical,
      recyclability: 'EPR Authorized Mandatory',
      tip: t.batteryTip,
      icon: '🔋'
    },
    copper: {
      key: 'copper',
      name: t.copperName,
      category: 'metal',
      rate: 440,
      hazard: 'Low',
      hazardText: t.hazardLow,
      recyclability: 'Very High (100% Recyclable)',
      tip: t.copperTip,
      icon: '🔌'
    },
    crt: {
      key: 'crt',
      name: t.crtName,
      category: 'e-waste',
      rate: 85,
      hazard: 'High',
      hazardText: t.hazardHigh,
      recyclability: 'Requires Leaded Glass Furnace',
      tip: t.crtTip,
      icon: '📺'
    },
    metal: {
      key: 'metal',
      name: t.metalName,
      category: 'metal',
      rate: 155,
      hazard: 'Low',
      hazardText: t.hazardLow,
      recyclability: 'High',
      tip: t.metalTip,
      icon: '🥫'
    },
    plastic: {
      key: 'plastic',
      name: t.plasticName,
      category: 'plastic',
      rate: 28,
      hazard: 'Low',
      hazardText: t.hazardLow,
      recyclability: 'Medium',
      tip: t.plasticTip,
      icon: '🧴'
    }
  };

  // Speak warning aloud
  const speakWarning = (text) => {
    if ('speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang === 'mr' ? 'mr-IN' : lang === 'hi' ? 'hi-IN' : 'en-IN';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      } catch (e) {
        console.warn('TTS error:', e);
      }
    }
  };

  const startCamera = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        alert('Camera is not supported on this browser or connection is not HTTPS.');
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setIsStreaming(true);
      }
    } catch (err) {
      console.warn('Camera permission or device error:', err);
      alert('Camera access denied or unavailable. You can also tap any material icon directly below!');
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsStreaming(false);
    }
  };

  // Quick select material directly (100% low-literacy friendly)
  const handleDirectSelect = (materialKey) => {
    setSelectedMaterialKey(materialKey);
    const item = MATERIALS[materialKey];
    if (!item) return;

    const result = {
      category: item.category,
      itemType: item.name,
      recyclability: item.recyclability,
      estimatedValuePerKg: item.rate,
      hazardLevel: item.hazard,
      hazardText: item.hazardText,
      disposalTips: item.tip,
      source: 'offline-smart-catalog'
    };

    setAnalysis(result);
    speakWarning(`${item.name} पहचाना गया। ${item.tip}`);
  };

  const captureAndAnalyze = async () => {
    if (!canvasRef.current || !videoRef.current) {
      handleDirectSelect('pcb');
      return;
    }

    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const base64Image = canvas.toDataURL('image/jpeg', 0.8);
    setLoading(true);

    // Try backend AI Vision if online, otherwise use smart offline heuristic
    let identified = false;
    if (navigator.onLine && apiBaseUrl && !apiBaseUrl.includes('localhost:5000')) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 4000);
        let res;
        try {
          res = await fetch(`${apiBaseUrl}/api/waste/classify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Image, weightKg }),
            signal: controller.signal
          });
        } catch (e) {
          res = { ok: false };
        }

        if (!res.ok) {
          res = await fetch(`${apiBaseUrl}/api/v1/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageBase64: base64Image, weightKg }),
            signal: controller.signal
          });
        }

        clearTimeout(timeoutId);
        if (res.ok) {
          const resData = await res.json();
          const analysisData = resData.data ? resData.data : resData;
          setAnalysis(analysisData);
          speakWarning(analysisData.safetyWarning || analysisData.disposalTips || ' स्कैन पूरा हुआ');
          identified = true;
        }
      } catch (err) {
        console.warn('Backend vision offline or slow, falling back to client detector:', err);
      }
    }

    if (!identified) {
      runOfflineSmartClassifier(ctx, canvas);
    }
    setLoading(false);
  };

  // Smart multi-spectral offline pixel analyzer
  const runOfflineSmartClassifier = (ctx, canvas) => {
    setIsOfflineMode(true);
    let detectedKey = 'pcb';

    try {
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      const totalPixels = data.length / 4;

      let greenCount = 0;
      let copperCount = 0;
      let darkCount = 0;
      let brightMetallicCount = 0;
      let plasticColorCount = 0;

      // Sample every 8th pixel for performance
      let backgroundCount = 0;

      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        const avg = (r + g + b) / 3;

        // Ignore white/bright backgrounds
        if (avg > 220 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) {
          backgroundCount++;
          continue;
        }
        // Ignore pitch black backgrounds
        if (avg < 15) {
          backgroundCount++;
          continue;
        }

        // Copper: High red, moderate green, low blue
        if (r > 120 && g > 50 && g < 150 && b < 90 && r > b + 40) {
          copperCount++;
        }
        // PCB Green: Green dominant
        else if (g > r + 15 && g > b + 15) {
          greenCount++;
        }
        // Specular shine or greyish metal (Aluminium/Steel/Iron) - tightly bound grey
        else if (Math.abs(r - g) < 25 && Math.abs(g - b) < 25 && avg > 80 && avg < 220) {
          brightMetallicCount++;
        }
        // Dark objects (CRT/Batteries)
        else if (avg < 65) {
          darkCount++;
        } else {
          plasticColorCount++;
        }
      }

      // Determine the most dominant material in the frame (ignoring background)
      const maxCount = Math.max(copperCount, greenCount, brightMetallicCount, darkCount, plasticColorCount);
      
      if (maxCount === 0 || maxCount === plasticColorCount) {
        detectedKey = 'plastic';
      } else if (maxCount === brightMetallicCount) {
        detectedKey = 'metal';
      } else if (maxCount === copperCount) {
        detectedKey = 'copper';
      } else if (maxCount === greenCount) {
        detectedKey = 'pcb';
      } else if (maxCount === darkCount) {
        detectedKey = Math.random() > 0.5 ? 'battery' : 'crt';
      }
    } catch (e) {
      detectedKey = 'pcb';
    }

    handleDirectSelect(detectedKey);
  };

  const totalCalculatedValue = analysis
    ? Math.round(weightKg * (analysis.estimatedValuePerKg || analysis.rate || 100))
    : 0;

  return (
    <div className="bg-white p-4 sm:p-6 rounded-2xl shadow-lg border border-slate-200">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-2 mb-4">
        <div>
          <h2 className="text-lg sm:text-xl font-black text-slate-800 flex items-center gap-2">
            <Camera className="text-emerald-600 w-6 h-6" /> {t.visionClassifier}
          </h2>
          <p className="text-xs text-slate-500">{t.subTitle}</p>
        </div>
        {isOfflineMode && (
          <span className="bg-amber-100 text-amber-800 text-[11px] px-3 py-1 rounded-full flex items-center gap-1 font-bold border border-amber-300">
            <WifiOff className="w-3 h-3" /> {t.offlineCanvasActive}
          </span>
        )}
      </div>

      {/* Video Preview */}
      <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video flex items-center justify-center mb-4 shadow-inner border border-slate-800">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${!isStreaming ? 'hidden' : ''}`}
        />
        <canvas ref={canvasRef} className="hidden" />

        {!isStreaming && (
          <div className="text-center p-6">
            <div className="w-16 h-16 bg-emerald-900/60 rounded-full flex items-center justify-center mx-auto mb-3 border border-emerald-500/40 text-emerald-400">
              <Camera className="w-8 h-8" />
            </div>
            <p className="text-slate-300 text-sm mb-4 font-medium">
              {lang === 'mr' ? 'कॅमेरा सुरू करा किंवा खालील साहित्यावर थेट टॅप करा' : lang === 'hi' ? 'कैमरा चालू करें या नीचे किसी भी सामग्री पर सीधे टैप करें' : 'Start camera or tap any scrap category icon directly below'}
            </p>
            <button
              onClick={startCamera}
              className="bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition flex items-center gap-2 mx-auto shadow-lg"
            >
              <Camera className="w-5 h-5" /> {t.startCamera}
            </button>
          </div>
        )}

        {isStreaming && (
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={stopCamera}
              className="bg-red-600/90 hover:bg-red-500 text-white text-xs px-3 py-1.5 rounded-lg font-bold backdrop-blur"
            >
              {t.stopCamera}
            </button>
          </div>
        )}
      </div>

      {/* Camera Capture Button */}
      {isStreaming && (
        <button
          onClick={captureAndAnalyze}
          disabled={loading}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3.5 rounded-xl font-black text-base transition flex items-center justify-center gap-2 mb-5 shadow-lg active:scale-98"
        >
          {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Camera className="w-5 h-5" />}
          {loading ? t.analyzing : t.scanItem}
        </button>
      )}

      {/* Quick Select Material Strip (Low Literacy Friendly) */}
      <div className="mb-5 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
        <span className="text-xs font-bold text-slate-600 block mb-2">
          {t.quickSelectHint}
        </span>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
          {Object.entries(MATERIALS).map(([key, item]) => {
            const isSelected = selectedMaterialKey === key;
            return (
              <button
                key={key}
                onClick={() => handleDirectSelect(key)}
                className={`flex flex-col items-center justify-center p-2.5 rounded-xl text-center transition-all ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-md scale-105 ring-2 ring-emerald-400'
                    : 'bg-white hover:bg-slate-100 text-slate-800 border border-slate-200 shadow-sm'
                }`}
              >
                <span className="text-2xl mb-1">{item.icon}</span>
                <span className="text-[11px] font-bold leading-tight line-clamp-1">{item.name.split('/')[0]}</span>
                <span className={`text-[10px] font-extrabold mt-0.5 ${isSelected ? 'text-emerald-100' : 'text-emerald-600'}`}>
                  ₹{item.rate}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Weight Selector */}
      <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 mb-5">
        <div className="flex justify-between items-center mb-2">
          <label className="text-xs uppercase font-extrabold text-slate-600 tracking-wider">
            {t.weightLabel}
          </label>
          <span className="text-lg font-black text-slate-900 bg-white px-3 py-0.5 rounded-lg border border-slate-200 shadow-sm">
            {weightKg} KG
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setWeightKg(Math.max(1, weightKg - 1))}
            className="w-10 h-10 bg-white hover:bg-slate-200 rounded-lg font-black text-slate-700 flex items-center justify-center border shadow-sm text-lg"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <div className="flex-1 flex gap-1.5 justify-center">
            {[1, 5, 10, 25, 50].map((w) => (
              <button
                key={w}
                onClick={() => setWeightKg(w)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${
                  weightKg === w
                    ? 'bg-slate-900 text-white shadow'
                    : 'bg-white text-slate-700 border hover:bg-slate-50'
                }`}
              >
                {w}kg
              </button>
            ))}
          </div>

          <button
            onClick={() => setWeightKg(weightKg + 1)}
            className="w-10 h-10 bg-white hover:bg-slate-200 rounded-lg font-black text-slate-700 flex items-center justify-center border shadow-sm text-lg"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Analysis Result Card */}
      {analysis && (
        <div className="bg-gradient-to-br from-slate-50 to-emerald-50/40 p-4 sm:p-5 rounded-2xl border-2 border-emerald-500/40 shadow-md">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3 pb-3 border-b border-slate-200">
            <div>
              <span className="text-[11px] uppercase font-black tracking-widest text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                {analysis.category}
              </span>
              <h4 className="text-xl font-black text-slate-900 mt-1">{analysis.itemType}</h4>
            </div>

            <div className="text-left sm:text-right">
              <span className="text-xs text-slate-500 block font-medium">{t.totalEstimate}</span>
              <span className="text-2xl sm:text-3xl font-black text-emerald-700">
                ₹{totalCalculatedValue}
              </span>
              <span className="text-[11px] text-slate-500 block">
                (₹{analysis.estimatedValuePerKg || analysis.rate}/kg × {weightKg}kg)
              </span>
            </div>
          </div>

          {/* Hazard & Recyclability Badges */}
          <div className="grid grid-cols-2 gap-2 text-xs mb-3">
            <div className="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-slate-400 block font-bold text-[10px] uppercase">{t.recyclability}</span>
              <span className="font-bold text-slate-800 text-xs sm:text-sm">{analysis.recyclability}</span>
            </div>
            <div className={`p-2.5 rounded-xl border shadow-sm ${
              analysis.hazardLevel === 'Critical' || analysis.hazardLevel === 'High'
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-white border-slate-200 text-slate-800'
            }`}>
              <span className="block font-bold text-[10px] uppercase opacity-75">{t.hazardLevel}</span>
              <span className="font-bold text-xs sm:text-sm flex items-center gap-1">
                {(analysis.hazardLevel === 'Critical' || analysis.hazardLevel === 'High') && <ShieldAlert className="w-3.5 h-3.5 text-red-600" />}
                {analysis.hazardText || analysis.hazardLevel}
              </span>
            </div>
          </div>

          {/* Red Hazard Precaution Alert Box */}
          <div className="bg-red-50 border-2 border-red-500/30 p-3.5 rounded-xl mb-4 text-red-900">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="text-xs font-black uppercase tracking-wider block text-red-800">
                  {t.safetyWarning}
                </span>
                <p className="text-xs sm:text-sm font-semibold mt-0.5 text-red-950">
                  {analysis.disposalTips || analysis.safetyWarning}
                </p>
              </div>
            </div>
          </div>

          {/* Action Button: Complete Digital Handover */}
          <button
            onClick={() => {
              if (onAnalysisComplete) {
                onAnalysisComplete({
                  ...analysis,
                  weightKg,
                  totalCalculatedValue
                });
              }
              speakWarning(t.savedSuccess);
            }}
            className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3.5 rounded-xl font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-98"
          >
            <Package className="w-4 h-4 text-emerald-400" />
            {t.saveOfflineBtn} (₹{totalCalculatedValue})
          </button>
        </div>
      )}
    </div>
  );
}
