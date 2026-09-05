import React, { useState, useEffect } from 'react';
import { Truck, ShieldCheck, Hash, PackageCheck, MapPin, Building, Phone, Filter, Search, CheckCircle2, Award, Clock, QrCode, X } from 'lucide-react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { translations } from '../i18n/translations';

export default function RecyclerDashboard({ lang = 'hi' }) {
  const t = translations[lang] || translations.hi;

  const [activeSubTab, setActiveSubTab] = useState('batches');
  const [cityFilter, setCityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [scannedHash, setScannedHash] = useState(null);

  // 1. Comprehensive Incoming Batches (Delhi, Mumbai, Bengaluru, Pune, Chennai, etc.)
  const [incomingBatches, setIncomingBatches] = useState([
    {
      id: 'TXN-90812',
      origin: 'Okhla Industrial Area, Phase 2, Delhi',
      city: 'delhi',
      material: 'E-Waste (Printed Circuit Boards & Transformers)',
      weightKg: 145.5,
      collector: 'Kabadiwala Ram Prasad (CW-481)',
      status: 'In Transit',
      batchHash: 'a7b8f9e01234c5678d90ef123456789a2b3c4d5e',
      hazardLevel: 'Moderate',
      eta: '25 mins'
    },
    {
      id: 'TXN-90815',
      origin: 'Mayapuri Scrap Yard, Block B, Delhi',
      city: 'delhi',
      material: 'Copper Scrap & Shredded Armature Wires',
      weightKg: 320.0,
      collector: 'Kishan Lal Scrap Network (CW-109)',
      status: 'Scheduled',
      batchHash: 'f1e2d3c4b5a69788776655443322110099887766',
      hazardLevel: 'Low',
      eta: 'Tomorrow, 10:00 AM'
    },
    {
      id: 'TXN-90822',
      origin: 'Dharavi 13th Compound, Mumbai',
      city: 'mumbai',
      material: 'Lithium-ion Battery Packs (Laptop & EV Cells)',
      weightKg: 85.0,
      collector: 'Mohammad Rafiq (CW-312)',
      status: 'In Transit',
      batchHash: 'c4d5e6f7a8b90123456789abcdef0123456789ab',
      hazardLevel: 'Critical',
      eta: '1 hour'
    },
    {
      id: 'TXN-90830',
      origin: 'Peenya Industrial Area, Bengaluru',
      city: 'bengaluru',
      material: 'Mixed Telecom Server PCBs & Gold Pins',
      weightKg: 210.0,
      collector: 'Venkatesh Babu (CW-621)',
      status: 'Received',
      batchHash: 'd5e6f7a8b9c0123456789abcdef0123456789abc',
      hazardLevel: 'Moderate',
      eta: 'At Gate 2'
    },
    {
      id: 'TXN-90835',
      origin: 'Bhosari MIDC, Pune',
      city: 'pune',
      material: 'Heavy Copper Busbars & Induction Windings',
      weightKg: 450.0,
      collector: 'Anand Shinde (CW-204)',
      status: 'Scheduled',
      batchHash: 'e6f7a8b9c0d123456789abcdef0123456789abcd',
      hazardLevel: 'Low',
      eta: 'Today, 4:30 PM'
    },
    {
      id: 'TXN-90841',
      origin: 'Ambattur Industrial Estate, Chennai',
      city: 'chennai',
      material: 'CRT Glass Bulbs & Deflection Yokes',
      weightKg: 580.0,
      collector: 'Murugan Scrap Depot (CW-552)',
      status: 'Verified & Logged',
      batchHash: '7a8b9c0d1e23456789abcdef0123456789abcdef',
      hazardLevel: 'High',
      eta: 'Completed'
    },
    {
      id: 'TXN-90848',
      origin: 'Vatva GIDC, Ahmedabad',
      city: 'ahmedabad',
      material: 'Rigid HDPE & Polycarbonate Scrap',
      weightKg: 720.0,
      collector: 'Patel Scrap Agency (CW-773)',
      status: 'In Transit',
      batchHash: '8b9c0d1e2f3456789abcdef0123456789abcdef0',
      hazardLevel: 'Low',
      eta: '40 mins'
    },
    {
      id: 'TXN-90855',
      origin: 'Howrah Scrap Yard, Kolkata',
      city: 'kolkata',
      material: 'Telecom Motherboards & Mixed E-Scrap',
      weightKg: 340.0,
      collector: 'Subhash Das (CW-891)',
      status: 'Scheduled',
      batchHash: '9c0d1e2f3a456789abcdef0123456789abcdef01',
      hazardLevel: 'Moderate',
      eta: 'Tomorrow, 2:00 PM'
    }
  ]);

  // 2. Comprehensive CPCB EPR Authorized Facilities Directory
  const EPR_RECYCLERS = [
    {
      id: 'r1',
      name: 'Delhi Green Recyclers Pvt Ltd',
      city: 'Delhi',
      location: 'Mayapuri Phase II, New Delhi',
      authId: 'CPCB/EPR/0142/DL',
      capacity: '12,000 MT/Yr',
      materials: ['PCB', 'Copper Cables', 'Electric Motors', 'Batteries'],
      contact: '+91 98110 24810',
      status: 'Certified Active'
    },
    {
      id: 'r2',
      name: 'Wazirpur E-Waste Refining Facility',
      city: 'Delhi',
      location: 'Wazirpur Industrial Area, Delhi',
      authId: 'CPCB/EPR/0217/DL',
      capacity: '8,500 MT/Yr',
      materials: ['CRT Monitors', 'LCD Screens', 'PCB Scrap', 'Plastics'],
      contact: '+91 98102 33422',
      status: 'Certified Active'
    },
    {
      id: 'r3',
      name: 'Dharavi Circular Metals Cooperative',
      city: 'Mumbai',
      location: '13th Compound, Dharavi, Mumbai',
      authId: 'CPCB/EPR/0451/MH',
      capacity: '15,000 MT/Yr',
      materials: ['Copper', 'Aluminium', 'Batteries', 'Circuit Boards'],
      contact: '+91 98201 44551',
      status: 'Certified Active'
    },
    {
      id: 'r4',
      name: 'Bhosari Eco-Refinery & Metal Recovery',
      city: 'Pune',
      location: 'Bhosari MIDC, Pune',
      authId: 'CPCB/EPR/0489/MH',
      capacity: '6,000 MT/Yr',
      materials: ['Copper Scrap', 'Motors', 'Lithium Cells'],
      contact: '+91 98500 12890',
      status: 'Certified Active'
    },
    {
      id: 'r5',
      name: 'Peenya Electronics Recyclers',
      city: 'Bengaluru',
      location: 'Peenya Industrial Area 4th Phase, Bengaluru',
      authId: 'CPCB/EPR/0512/KA',
      capacity: '10,500 MT/Yr',
      materials: ['PCB', 'Li-ion Battery', 'Copper', 'Servers'],
      contact: '+91 98450 67512',
      status: 'Certified Active'
    },
    {
      id: 'r6',
      name: 'Ambattur Scrap & E-Waste Recovery Hub',
      city: 'Chennai',
      location: 'Ambattur Industrial Estate, Chennai',
      authId: 'CPCB/EPR/0628/TN',
      capacity: '9,000 MT/Yr',
      materials: ['Cables', 'Motors', 'CRT Leaded Glass', 'Plastics'],
      contact: '+91 98410 88628',
      status: 'Certified Active'
    },
    {
      id: 'r7',
      name: 'Vatva Clean Earth Smelters',
      city: 'Ahmedabad',
      location: 'Vatva GIDC Phase 3, Ahmedabad',
      authId: 'CPCB/EPR/0719/GJ',
      capacity: '14,000 MT/Yr',
      materials: ['Plastics', 'Lead Battery', 'Transformers'],
      contact: '+91 98250 33719',
      status: 'Certified Active'
    },
    {
      id: 'r8',
      name: 'Howrah Metal & E-Scrap Hub',
      city: 'Kolkata',
      location: 'Baltikuri Scrap Zone, Howrah, Kolkata',
      authId: 'CPCB/EPR/0804/WB',
      capacity: '7,200 MT/Yr',
      materials: ['Copper', 'Brass', 'Circuit Boards', 'Wiring'],
      contact: '+91 98300 44804',
      status: 'Certified Active'
    }
  ];

  const verifyBatch = (id) => {
    setIncomingBatches(prev =>
      prev.map(item =>
        item.id === id
          ? {
              ...item,
              status: 'Verified & Logged',
              verifiedAt: new Date().toLocaleTimeString('en-IN')
            }
          : item
      )
    );
  };

  useEffect(() => {
    if (!showQrScanner) return;
    const scanner = new Html5QrcodeScanner('reader', { fps: 10, qrbox: { width: 250, height: 250 } }, false);
    
    scanner.render((text) => {
      if (text.startsWith('SAFAAIWALA_')) {
        scanner.clear();
        setShowQrScanner(false);
        const actualHash = text.replace('SAFAAIWALA_', '');
        
        // Find if we have this hash in our batches, or just add a new record
        const existingBatch = incomingBatches.find(b => b.batchHash === actualHash);
        if (existingBatch) {
          verifyBatch(existingBatch.id);
          setScannedHash(`Verified Existing Batch: ${existingBatch.id}`);
        } else {
          // It's a new offline scan from a collector!
          const newId = `TXN-${Math.floor(100000 + Math.random() * 900000)}`;
          const newBatch = {
            id: newId,
            origin: 'Local Collector Walk-in',
            city: 'local',
            material: 'Scanned via QR Handover',
            weightKg: 'Dynamic',
            collector: 'Offline QR Scan',
            status: 'Verified & Logged',
            batchHash: actualHash,
            hazardLevel: 'Unknown',
            eta: 'Completed',
            verifiedAt: new Date().toLocaleTimeString('en-IN')
          };
          setIncomingBatches(prev => [newBatch, ...prev]);
          setScannedHash(`Successfully logged new offline receipt: ${actualHash.substring(0, 16)}...`);
        }
        setTimeout(() => setScannedHash(null), 5000);
      }
    }, (err) => {
      // ignore
    });

    return () => {
      scanner.clear().catch(() => {});
    };
  }, [showQrScanner, incomingBatches]);

  const filteredBatches = incomingBatches.filter(b => {
    const matchCity = cityFilter === 'all' || b.city === cityFilter;
    const matchStatus = statusFilter === 'all' || b.status === statusFilter;
    const matchSearch = !searchQuery || b.material.toLowerCase().includes(searchQuery.toLowerCase()) || b.origin.toLowerCase().includes(searchQuery.toLowerCase()) || b.id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCity && matchStatus && matchSearch;
  });

  const totalIncomingWeight = incomingBatches.reduce((acc, curr) => acc + curr.weightKg, 0);

  return (
    <div className="bg-slate-900 text-white p-4 sm:p-6 rounded-2xl shadow-2xl border border-slate-800">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2">
            <div className="bg-emerald-500/20 p-2 rounded-xl text-emerald-400 border border-emerald-500/30">
              <Truck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                {t.recyclerPortalTitle}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">{t.recyclerPortalSubtitle}</p>
            </div>
          </div>
        </div>

        {/* Live Facility Metric Card */}
        <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80 flex items-center gap-4 w-full md:w-auto">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              {t.facilityCapacity}
            </span>
            <span className="text-lg font-black text-emerald-400">
              {Math.round(totalIncomingWeight).toLocaleString()} / 10,000 KG
            </span>
          </div>
          <div className="h-8 w-px bg-slate-700" />
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
              EPR Traceability
            </span>
            <span className="text-lg font-black text-white flex items-center gap-1">
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> 100%
            </span>
          </div>
        </div>
      </div>

      {/* Sub-tab Navigation & Actions */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5 justify-between items-start sm:items-center">
        <div className="flex bg-slate-800 p-1 rounded-xl w-full sm:max-w-md">
          <button
            onClick={() => setActiveSubTab('batches')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
              activeSubTab === 'batches' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.allStatus} ({incomingBatches.length})
          </button>
          <button
            onClick={() => setActiveSubTab('directory')}
            className={`flex-1 py-2 rounded-lg font-bold text-xs sm:text-sm transition ${
              activeSubTab === 'directory' ? 'bg-emerald-600 text-white shadow' : 'text-slate-400 hover:text-white'
            }`}
          >
            CPCB Directory ({EPR_RECYCLERS.length})
          </button>
        </div>

        <button
          onClick={() => setShowQrScanner(true)}
          className="w-full sm:w-auto bg-emerald-500 hover:bg-emerald-400 text-slate-900 px-4 py-2.5 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition active:scale-95"
        >
          <QrCode className="w-5 h-5" />
          Scan Handover Receipt
        </button>
      </div>

      {/* Success Notification */}
      {scannedHash && (
        <div className="bg-emerald-500/20 border border-emerald-500/50 text-emerald-400 p-3 rounded-xl mb-4 text-sm font-bold flex items-center justify-center gap-2">
          <CheckCircle2 className="w-5 h-5" />
          {scannedHash}
        </div>
      )}

      {/* QR Scanner Modal */}
      {showQrScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-sm">
          <div className="bg-white text-slate-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="bg-emerald-600 text-white p-4 flex justify-between items-center">
              <h3 className="font-black text-lg">Scan Receipt QR</h3>
              <button onClick={() => setShowQrScanner(false)} className="p-1 hover:bg-emerald-500 rounded-lg">
                <X className="w-6 h-6" />
              </button>
            </div>
            <div className="p-4 bg-slate-100">
              <div id="reader" className="w-full rounded-xl overflow-hidden shadow-inner"></div>
              <p className="text-center text-xs text-slate-500 mt-4 font-medium">
                Point your camera at the Kabadiwala's Digital Handover Receipt to instantly verify the batch.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filter Strip for Batches */}
      {activeSubTab === 'batches' && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder={t.searchFilter}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl pl-9 pr-3 py-2.5 outline-none focus:border-emerald-500"
            />
          </div>

          <select
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500 font-medium"
          >
            <option value="all">All City Hubs (National)</option>
            <option value="delhi">Delhi NCR</option>
            <option value="mumbai">Mumbai</option>
            <option value="bengaluru">Bengaluru</option>
            <option value="pune">Pune</option>
            <option value="chennai">Chennai</option>
            <option value="ahmedabad">Ahmedabad</option>
            <option value="kolkata">Kolkata</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 outline-none focus:border-emerald-500 font-medium"
          >
            <option value="all">All Statuses</option>
            <option value="In Transit">In Transit</option>
            <option value="Scheduled">Scheduled</option>
            <option value="Received">Received at Gate</option>
            <option value="Verified & Logged">Verified & Logged</option>
          </select>
        </div>
      )}

      {/* VIEW A: Incoming Batches with Verification */}
      {activeSubTab === 'batches' && (
        <div className="grid gap-3.5">
          {filteredBatches.map(batch => (
            <div
              key={batch.id}
              className="bg-slate-800/90 p-4 sm:p-5 rounded-xl border border-slate-700/80 hover:border-slate-600 transition flex flex-col md:flex-row justify-between items-start md:items-center gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-xs bg-slate-900 text-emerald-400 px-2.5 py-0.5 rounded-md border border-slate-700 font-bold">
                    {batch.id}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      batch.status === 'Verified & Logged'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                        : batch.status === 'In Transit'
                        ? 'bg-blue-950 text-blue-300 border-blue-700 animate-pulse'
                        : batch.status === 'Received'
                        ? 'bg-purple-950 text-purple-300 border-purple-700'
                        : 'bg-amber-950 text-amber-300 border-amber-700'
                    }`}
                  >
                    {batch.status}
                  </span>
                  <span className="text-[11px] text-slate-400 flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3" /> {batch.eta}
                  </span>
                </div>

                <h4 className="font-bold text-base sm:text-lg text-slate-100">{batch.material}</h4>

                <div className="text-xs text-slate-400 flex flex-wrap gap-x-4 gap-y-1">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    {t.origin} {batch.origin}
                  </span>
                  <span className="text-slate-300 font-medium">
                    Collector: {batch.collector}
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1 bg-slate-900/60 px-2.5 py-1 rounded-lg border border-slate-800 break-all">
                  <Hash className="w-3 h-3 text-emerald-500 shrink-0" />
                  <span className="text-slate-400">{t.auditHash}</span>
                  <span className="text-emerald-400 font-semibold">{batch.batchHash}</span>
                </p>
              </div>

              {/* Weight & Action Button */}
              <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-slate-700/60 pt-3 md:pt-0">
                <div className="text-left md:text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    {t.batchWeight}
                  </span>
                  <span className="text-xl sm:text-2xl font-black text-emerald-400">
                    {batch.weightKg} KG
                  </span>
                </div>

                {batch.status !== 'Verified & Logged' ? (
                  <button
                    onClick={() => verifyBatch(batch.id)}
                    className="bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-1.5 transition shadow-lg"
                  >
                    <ShieldCheck className="w-4 h-4" /> {t.verifyBatchBtn}
                  </button>
                ) : (
                  <div className="bg-emerald-950/80 text-emerald-400 text-xs px-3.5 py-2 rounded-xl border border-emerald-700/60 flex items-center gap-1.5 font-bold">
                    <PackageCheck className="w-4 h-4 text-emerald-400" />
                    <span>{t.batchVerified}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {filteredBatches.length === 0 && (
            <div className="text-center py-10 bg-slate-800/40 rounded-xl border border-slate-800 text-slate-400 text-sm">
              No matching scrap batches found.
            </div>
          )}
        </div>
      )}

      {/* VIEW B: CPCB EPR Authorized Facilities Directory */}
      {activeSubTab === 'directory' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {EPR_RECYCLERS.map(r => (
            <div key={r.id} className="bg-slate-800 p-4 rounded-xl border border-slate-700 hover:border-slate-600 transition space-y-3">
              <div className="flex justify-between items-start gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-emerald-400" />
                    <h4 className="font-bold text-base text-white">{r.name}</h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{r.location}</p>
                </div>
                <span className="bg-emerald-950 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded border border-emerald-800">
                  {r.status}
                </span>
              </div>

              <div className="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-xs space-y-1 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">{t.eprAuth}</span>
                  <span className="text-emerald-400 font-bold">{r.authId}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Processing Capacity:</span>
                  <span className="text-white font-bold">{r.capacity}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {r.materials.map((m, idx) => (
                  <span key={idx} className="bg-slate-700 text-slate-200 text-[10px] px-2 py-0.5 rounded font-medium">
                    {m}
                  </span>
                ))}
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-700/60">
                <a
                  href={`tel:${r.contact}`}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-bold"
                >
                  <Phone className="w-3.5 h-3.5" /> {r.contact}
                </a>
                <span className="text-[11px] text-slate-400 font-medium">
                  Hub: {r.city}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
