'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  CreditCard,
  Printer,
  Download,
  RotateCw,
  ShieldCheck,
  User,
  GraduationCap,
  Building,
  Calendar,
  Layers,
  Filter,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Eye,
  Camera,
  RefreshCw,
  Cpu
} from 'lucide-react';
import {
  getIdCardDirectoryData,
  generateIdCardQr,
  IdCardPerson
} from '@/actions/id-card-actions';

// Color themes configuration
const THEMES = {
  navy: {
    id: 'navy',
    name: 'Prestige Navy & Gold',
    bgGradient: 'from-slate-900 via-blue-950 to-indigo-950',
    primaryAccent: 'bg-amber-400 text-slate-950',
    headerBg: 'bg-gradient-to-r from-blue-900 to-indigo-900',
    badgeBg: 'bg-amber-400/20 text-amber-300 border-amber-400/30',
    chipColor: 'from-amber-200 to-yellow-400 border-amber-400',
    textColor: 'text-white',
    subTextColor: 'text-blue-200',
    barcodeColor: 'bg-slate-900 text-white'
  },
  emerald: {
    id: 'emerald',
    name: 'Academic Emerald',
    bgGradient: 'from-emerald-950 via-teal-950 to-slate-950',
    primaryAccent: 'bg-emerald-400 text-emerald-950',
    headerBg: 'bg-gradient-to-r from-emerald-900 to-teal-900',
    badgeBg: 'bg-emerald-400/20 text-emerald-300 border-emerald-400/30',
    chipColor: 'from-amber-200 to-yellow-400 border-amber-400',
    textColor: 'text-white',
    subTextColor: 'text-emerald-200',
    barcodeColor: 'bg-emerald-950 text-white'
  },
  burgundy: {
    id: 'burgundy',
    name: 'Burgundy Distinction',
    bgGradient: 'from-rose-950 via-red-950 to-slate-950',
    primaryAccent: 'bg-rose-400 text-rose-950',
    headerBg: 'bg-gradient-to-r from-rose-900 to-red-900',
    badgeBg: 'bg-rose-400/20 text-rose-300 border-rose-400/30',
    chipColor: 'from-amber-200 to-yellow-400 border-amber-400',
    textColor: 'text-white',
    subTextColor: 'text-rose-200',
    barcodeColor: 'bg-rose-950 text-white'
  },
  carbon: {
    id: 'carbon',
    name: 'Carbon Slate Cyber',
    bgGradient: 'from-zinc-950 via-neutral-900 to-stone-950',
    primaryAccent: 'bg-cyan-400 text-zinc-950',
    headerBg: 'bg-gradient-to-r from-zinc-800 to-neutral-900',
    badgeBg: 'bg-cyan-400/20 text-cyan-300 border-cyan-400/30',
    chipColor: 'from-cyan-200 to-blue-300 border-cyan-400',
    textColor: 'text-white',
    subTextColor: 'text-zinc-300',
    barcodeColor: 'bg-zinc-900 text-white'
  },
  sapphire: {
    id: 'sapphire',
    name: 'Royal Sapphire',
    bgGradient: 'from-blue-900 via-indigo-900 to-blue-950',
    primaryAccent: 'bg-sky-400 text-slate-950',
    headerBg: 'bg-gradient-to-r from-blue-800 to-sky-900',
    badgeBg: 'bg-sky-400/20 text-sky-300 border-sky-400/30',
    chipColor: 'from-amber-200 to-yellow-400 border-amber-400',
    textColor: 'text-white',
    subTextColor: 'text-sky-200',
    barcodeColor: 'bg-blue-950 text-white'
  }
};

export default function IdCardGeneratorPage() {
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState<IdCardPerson[]>([]);
  const [selectedCandidate, setSelectedCandidate] = useState<IdCardPerson | null>(null);

  // Card Settings
  const [themeKey, setThemeKey] = useState<keyof typeof THEMES>('navy');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [cardFace, setCardFace] = useState<'front' | 'back'>('front');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'STUDENT' | 'STAFF' | 'VISITOR'>('ALL');
  const [viewMode, setViewMode] = useState<'single' | 'batch'>('single');

  // QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [verifyUrl, setVerifyUrl] = useState<string>('');

  // Editable Overrides for Live Tuning
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editDept, setEditDept] = useState('');
  const [editFaculty, setEditFaculty] = useState('');
  const [editBlood, setEditBlood] = useState('O+');
  const [editPhone, setEditPhone] = useState('+234 800 000 0000');
  const [editExpiry, setEditExpiry] = useState('2028/08/31');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const cardPrintRef = useRef<HTMLDivElement | null>(null);

  // Load directory candidates
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const res = await getIdCardDirectoryData();
        if (res.success && res.candidates?.length) {
          setCandidates(res.candidates);
          applyCandidate(res.candidates[0]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // Update QR when candidate or code changes
  useEffect(() => {
    async function updateQr() {
      if (!editCode) return;
      const res = await generateIdCardQr(
        editCode,
        selectedCandidate?.type || 'STUDENT',
        editName
      );
      if (res.success && res.qrDataUrl) {
        setQrDataUrl(res.qrDataUrl);
        setVerifyUrl(res.verifyUrl || '');
      }
    }
    updateQr();
  }, [editCode, editName, selectedCandidate?.type]);

  // Apply candidate to live editor
  const applyCandidate = (cand: IdCardPerson) => {
    setSelectedCandidate(cand);
    setEditName(cand.fullName);
    setEditCode(cand.code);
    setEditTitle(cand.titleOrClass);
    setEditDept(cand.department);
    setEditFaculty(cand.facultyOrSchool);
    setEditBlood(cand.bloodGroup || 'O+');
    setEditPhone(cand.emergencyContact || '+234 800 000 0000');
    setEditExpiry(cand.expiryDate);
    setAvatarPreview(cand.avatarUrl || null);
  };

  // Handle Photo upload
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Browser Print Trigger
  const handlePrint = () => {
    window.print();
  };

  const theme = THEMES[themeKey];
  const filteredCandidates = candidates.filter(
    c => typeFilter === 'ALL' || c.type === typeFilter
  );

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-8">
      {/* Print CSS Specific Rules */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #print-area, #print-area * {
            visibility: visible;
          }
          #print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* 1. TOP HEADER BANNER */}
      <div className="no-print bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-900 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-2xl shadow-inner backdrop-blur-sm">
              <CreditCard className="w-9 h-9 text-indigo-300" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-mono rounded-full font-bold">
                  CR80 PVC STANDARD
                </span>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs rounded-full font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  CRYPTOGRAPHIC 2D QR VERIFIED
                </span>
              </div>
              <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
                Official Institutional ID Card Studio
              </h1>
              <p className="text-slate-300 text-sm mt-1">
                High-security biometric identity credentials generator for Students, Academic Faculty, Administrators &amp; Visitors.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-lg transition-transform active:scale-95 flex items-center gap-2"
            >
              <Printer className="w-4 h-4" />
              Print Official Cards
            </button>
          </div>
        </div>
      </div>

      {/* 2. CONTROLS STRIP */}
      <div className="no-print bg-white p-4 rounded-2xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        {/* Candidate Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-bold text-gray-700">Filter:</span>
          {(['ALL', 'STUDENT', 'STAFF', 'VISITOR'] as const).map(type => (
            <button
              key={type}
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                typeFilter === type
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Format & Face Controls */}
        <div className="flex items-center gap-3">
          {/* Orientation */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setOrientation('portrait')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                orientation === 'portrait' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'
              }`}
            >
              Portrait CR80
            </button>
            <button
              onClick={() => setOrientation('landscape')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                orientation === 'landscape' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'
              }`}
            >
              Landscape CR80
            </button>
          </div>

          {/* Flip Face Button */}
          <button
            onClick={() => setCardFace(cardFace === 'front' ? 'back' : 'front')}
            className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-transform active:scale-95 shadow-sm"
          >
            <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
            Showing: {cardFace.toUpperCase()} (Flip)
          </button>

          {/* Single vs Batch */}
          <div className="flex items-center bg-gray-100 p-1 rounded-xl">
            <button
              onClick={() => setViewMode('single')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'single' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'
              }`}
            >
              Live Editor
            </button>
            <button
              onClick={() => setViewMode('batch')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'batch' ? 'bg-white shadow text-indigo-700' : 'text-gray-600'
              }`}
            >
              Batch Sheet (Print)
            </button>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE */}
      {viewMode === 'single' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT: CANDIDATE DIRECTORY & LIVE FORM EDITOR (5 COLS) */}
          <div className="no-print lg:col-span-5 space-y-6">
            {/* Quick Picker */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <User className="w-4 h-4 text-indigo-600" />
                Select Database Candidate
              </h3>

              <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1">
                {filteredCandidates.map(cand => (
                  <button
                    key={cand.id}
                    onClick={() => applyCandidate(cand)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex items-center justify-between text-xs ${
                      selectedCandidate?.id === cand.id
                        ? 'border-indigo-600 bg-indigo-50/70 font-bold shadow-sm'
                        : 'border-gray-100 hover:border-gray-200 bg-white'
                    }`}
                  >
                    <div>
                      <div className="font-semibold text-gray-900">{cand.fullName}</div>
                      <div className="font-mono text-gray-500 text-[10px]">
                        {cand.code} &bull; {cand.titleOrClass}
                      </div>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      cand.type === 'STUDENT'
                        ? 'bg-blue-100 text-blue-800'
                        : cand.type === 'STAFF'
                        ? 'bg-purple-100 text-purple-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {cand.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Live Customizer Fields */}
            <div className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-4">
              <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                Visual Customization &amp; Overrides
              </h3>

              {/* Theme Palette */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Color Theme Palette
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.values(THEMES).map(t => (
                    <button
                      key={t.id}
                      onClick={() => setThemeKey(t.id as any)}
                      className={`p-2 rounded-xl text-left text-xs font-medium border flex items-center gap-2 transition-all ${
                        themeKey === t.id
                          ? 'border-indigo-600 bg-indigo-50/50 font-bold'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${t.bgGradient} border border-white shadow-sm flex-shrink-0`}></div>
                      <span className="truncate">{t.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Photo Upload */}
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Card Holder Photo
                </label>
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Holder" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="w-full text-xs text-gray-600 file:mr-2 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 cursor-pointer"
                  />
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Card Holder Full Name</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Matric / Staff Code</label>
                    <input
                      type="text"
                      value={editCode}
                      onChange={(e) => setEditCode(e.target.value)}
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Blood Group</label>
                    <input
                      type="text"
                      value={editBlood}
                      onChange={(e) => setEditBlood(e.target.value)}
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">Program / Designation</label>
                  <input
                    type="text"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Department</label>
                    <input
                      type="text"
                      value={editDept}
                      onChange={(e) => setEditDept(e.target.value)}
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-600 mb-1">Valid Until / Expiry</label>
                    <input
                      type="text"
                      value={editExpiry}
                      onChange={(e) => setEditExpiry(e.target.value)}
                      className="w-full text-xs p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT: LIVE CARD PREVIEW (7 COLS) */}
          <div className="lg:col-span-7 flex flex-col items-center justify-center p-4">
            <div className="mb-4 text-center no-print">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">
                CR80 PVC High-Definition Preview &bull; {orientation.toUpperCase()} &bull; {cardFace.toUpperCase()} FACE
              </span>
            </div>

            {/* CARD CONTAINER (ID: print-area) */}
            <div id="print-area" ref={cardPrintRef} className="flex justify-center items-center">
              {orientation === 'portrait' ? (
                /* ============================================================== */
                /* PORTRAIT CARD (CR80: 336px x 532px ~ 54mm x 85.6mm)            */
                /* ============================================================== */
                <div
                  className={`w-[340px] max-w-full h-[538px] rounded-[24px] shadow-2xl p-5 relative overflow-hidden flex flex-col justify-between border border-white/20 bg-gradient-to-b ${theme.bgGradient} ${theme.textColor} transition-all`}
                  style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                  }}
                >
                  {/* Holographic Security Overlay Ribbon */}
                  <div className="absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br from-indigo-400/20 via-pink-400/20 to-amber-300/20 rounded-full blur-xl pointer-events-none"></div>

                  {/* Micro-guilloche subtle pattern */}
                  <div
                    className="absolute inset-0 opacity-5 pointer-events-none"
                    style={{
                      backgroundImage: 'radial-gradient(circle at 50% 50%, #ffffff 1px, transparent 1px)',
                      backgroundSize: '8px 8px'
                    }}
                  ></div>

                  {cardFace === 'front' ? (
                    /* FRONT PORTRAIT */
                    <>
                      {/* Header */}
                      <div className="relative z-10 text-center border-b border-white/10 pb-3">
                        <div className="flex items-center justify-center gap-2 mb-1">
                          <div className="w-7 h-7 rounded-lg bg-white/10 flex items-center justify-center border border-white/20">
                            <GraduationCap className="w-4 h-4 text-amber-300" />
                          </div>
                          <span className="font-black text-[13px] tracking-wider uppercase text-white font-serif">
                            PROXIMA INSTITUTION
                          </span>
                        </div>
                        <p className="text-[9px] tracking-widest text-slate-300 uppercase font-semibold">
                          Excellence in Technology &amp; Leadership
                        </p>
                      </div>

                      {/* Photo & Chip Section */}
                      <div className="relative z-10 flex flex-col items-center mt-2">
                        {/* Chip & Badge Header */}
                        <div className="w-full flex items-center justify-between px-2 mb-2">
                          {/* Smart Chip Contact Simulation */}
                          <div className={`w-9 h-7 rounded-md bg-gradient-to-br ${theme.chipColor} border shadow-inner flex flex-col justify-around p-0.5 opacity-90`}>
                            <div className="w-full h-0.5 bg-amber-700/40"></div>
                            <div className="w-full h-0.5 bg-amber-700/40"></div>
                          </div>

                          {/* Holder Type Badge */}
                          <span className={`text-[10px] font-black tracking-wider uppercase px-2.5 py-0.5 rounded-full border ${theme.badgeBg}`}>
                            {selectedCandidate?.type || 'STUDENT'}
                          </span>
                        </div>

                        {/* Photo with holographic ring */}
                        <div className="w-28 h-28 rounded-2xl p-1 bg-gradient-to-br from-white/40 via-amber-300/40 to-white/10 shadow-xl relative">
                          <div className="w-full h-full rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
                            {avatarPreview ? (
                              <img src={avatarPreview} alt="Card Holder" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex flex-col items-center justify-center bg-slate-800 text-slate-400">
                                <User className="w-12 h-12" />
                              </div>
                            )}
                          </div>
                          {/* Official security seal sticker */}
                          <div className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-amber-400 border-2 border-slate-900 flex items-center justify-center shadow-md">
                            <ShieldCheck className="w-4 h-4 text-slate-950" />
                          </div>
                        </div>

                        {/* Name & Title */}
                        <div className="text-center mt-3 w-full">
                          <h2 className="text-base font-extrabold tracking-tight text-white uppercase leading-tight line-clamp-1">
                            {editName}
                          </h2>
                          <p className={`text-xs font-semibold ${theme.subTextColor} line-clamp-1 mt-0.5`}>
                            {editTitle}
                          </p>
                        </div>
                      </div>

                      {/* Credentials Grid */}
                      <div className="relative z-10 bg-black/25 backdrop-blur-md rounded-xl p-3 border border-white/10 text-[10px] space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">IDENTIFIER CODE:</span>
                          <span className="font-mono font-bold text-amber-300 text-xs tracking-wider">{editCode}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">DEPARTMENT:</span>
                          <span className="font-semibold text-white truncate max-w-[170px]">{editDept}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 font-medium">EXPIRY DATE:</span>
                          <span className="font-semibold text-emerald-300 font-mono">{editExpiry}</span>
                        </div>
                      </div>

                      {/* Bottom Footer: QR & Barcode Simulation */}
                      <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {qrDataUrl && (
                            <img src={qrDataUrl} alt="QR Code" className="w-12 h-12 rounded-lg bg-white p-0.5 shadow" />
                          )}
                          <div className="text-[8px] text-slate-400 leading-tight">
                            <span className="block font-bold text-slate-300">SECURE TOKEN</span>
                            Scan with phone to verify authentic status
                          </div>
                        </div>

                        {/* Digital Signature */}
                        <div className="text-right">
                          <div className="font-serif italic text-amber-200 text-xs">Registrar Sign</div>
                          <span className="text-[8px] text-slate-400 uppercase tracking-widest block font-medium">
                            Authorized Seal
                          </span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* BACK PORTRAIT */
                    <>
                      <div className="relative z-10">
                        {/* Magnetic Stripe simulation */}
                        <div className="w-[calc(100%+40px)] -mx-5 h-12 bg-black shadow-inner flex items-center px-4">
                          <div className="w-full h-1 bg-neutral-800"></div>
                        </div>

                        <div className="mt-4 space-y-3 text-[10px]">
                          <div className="bg-black/30 p-3 rounded-xl border border-white/10 space-y-1.5">
                            <h4 className="font-bold text-amber-300 text-[11px] uppercase tracking-wider">
                              Medical &amp; Emergency Profile
                            </h4>
                            <div className="grid grid-cols-2 gap-2 text-[10px]">
                              <div>
                                <span className="text-slate-400 block text-[9px]">Blood Group:</span>
                                <span className="font-bold text-white text-xs">{editBlood}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9px]">Emergency Line:</span>
                                <span className="font-mono text-white text-[10px]">{editPhone}</span>
                              </div>
                            </div>
                          </div>

                          <div className="text-[9px] text-slate-300 leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5">
                            <p className="font-bold text-white mb-1 uppercase tracking-wide">Terms of Credential:</p>
                            This official identity badge remains the exclusive property of Proxima Educational System. The bearer is subject to the university code of conduct. If found, please return to any campus security office or registrar headquarters.
                          </div>
                        </div>
                      </div>

                      {/* Barcode Strip */}
                      <div className="relative z-10 pt-3 border-t border-white/10 flex flex-col items-center">
                        {/* Simulated Code128 Barcode */}
                        <div className="w-full bg-white px-3 py-1.5 rounded-lg flex flex-col items-center">
                          <div className="w-full h-8 flex justify-between items-center px-1">
                            {Array.from({ length: 48 }).map((_, i) => (
                              <div
                                key={i}
                                className="bg-black h-full"
                                style={{ width: i % 3 === 0 ? '2.5px' : i % 5 === 0 ? '4px' : '1.5px' }}
                              ></div>
                            ))}
                          </div>
                          <span className="font-mono text-[9px] font-bold text-black tracking-widest mt-0.5">
                            *{editCode}*
                          </span>
                        </div>

                        <span className="text-[8px] text-slate-400 mt-2 tracking-widest uppercase">
                          Official Security Issue &bull; Verifiable at /verify/id-card
                        </span>
                      </div>
                    </>
                  )}
                </div>
              ) : (
                /* ============================================================== */
                /* LANDSCAPE CARD (CR80: 538px x 340px ~ 85.6mm x 54mm)           */
                /* ============================================================== */
                <div
                  className={`w-[538px] max-w-full overflow-x-auto h-[340px] rounded-[24px] shadow-2xl p-5 relative overflow-hidden flex flex-col justify-between border border-white/20 bg-gradient-to-br ${theme.bgGradient} ${theme.textColor} transition-all`}
                  style={{
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1) inset'
                  }}
                >
                  {/* Security watermark */}
                  <div className="absolute -top-12 -right-12 w-48 h-48 bg-gradient-to-br from-indigo-400/20 via-pink-400/20 to-amber-300/20 rounded-full blur-2xl pointer-events-none"></div>

                  {cardFace === 'front' ? (
                    /* FRONT LANDSCAPE */
                    <>
                      {/* Top Bar */}
                      <div className="relative z-10 flex items-center justify-between border-b border-white/10 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
                            <GraduationCap className="w-5 h-5 text-amber-300" />
                          </div>
                          <div>
                            <span className="font-black text-sm tracking-wider uppercase text-white font-serif block">
                              PROXIMA TERTIARY INSTITUTE
                            </span>
                            <span className="text-[9px] text-slate-300 font-semibold tracking-widest uppercase">
                              Official Identity Credential
                            </span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-black tracking-wider uppercase px-3 py-1 rounded-full border ${theme.badgeBg}`}>
                          {selectedCandidate?.type || 'STUDENT'}
                        </span>
                      </div>

                      {/* Center Body */}
                      <div className="relative z-10 grid grid-cols-12 gap-4 items-center py-2">
                        {/* Photo */}
                        <div className="col-span-4 flex justify-center">
                          <div className="w-28 h-28 rounded-2xl p-1 bg-gradient-to-br from-white/40 via-amber-300/40 to-white/10 shadow-xl relative">
                            <div className="w-full h-full rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
                              {avatarPreview ? (
                                <img src={avatarPreview} alt="Card Holder" className="w-full h-full object-cover" />
                              ) : (
                                <User className="w-12 h-12 text-slate-400" />
                              )}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-amber-400 border border-slate-900 flex items-center justify-center shadow">
                              <ShieldCheck className="w-3.5 h-3.5 text-slate-950" />
                            </div>
                          </div>
                        </div>

                        {/* Details */}
                        <div className="col-span-8 space-y-2">
                          <div>
                            <h2 className="text-lg font-black tracking-tight text-white uppercase line-clamp-1">
                              {editName}
                            </h2>
                            <p className={`text-xs font-semibold ${theme.subTextColor} line-clamp-1`}>
                              {editTitle}
                            </p>
                          </div>

                          <div className="bg-black/25 backdrop-blur-md rounded-xl p-2.5 border border-white/10 text-[10px] space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 font-medium">CODE / MATRIC:</span>
                              <span className="font-mono font-bold text-amber-300 text-xs">{editCode}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 font-medium">DEPARTMENT:</span>
                              <span className="font-semibold text-white truncate max-w-[200px]">{editDept}</span>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-slate-400 font-medium">VALIDITY:</span>
                              <span className="font-semibold text-emerald-300 font-mono">{editExpiry}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="relative z-10 pt-2 border-t border-white/10 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {qrDataUrl && (
                            <img src={qrDataUrl} alt="QR Code" className="w-10 h-10 rounded-lg bg-white p-0.5 shadow" />
                          )}
                          <span className="text-[9px] text-slate-300">
                            Scan with smartphone to verify credentials
                          </span>
                        </div>

                        <div className="text-right">
                          <span className="font-serif italic text-amber-200 text-xs block">Registrar Signature</span>
                          <span className="text-[8px] text-slate-400 uppercase tracking-widest">Authorized Executive</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    /* BACK LANDSCAPE */
                    <>
                      {/* Magnetic Stripe simulation */}
                      <div className="w-[calc(100%+40px)] -mx-5 -mt-5 h-10 bg-black shadow-inner flex items-center px-4">
                        <div className="w-full h-1 bg-neutral-800"></div>
                      </div>

                      <div className="grid grid-cols-2 gap-4 py-2 text-[10px]">
                        <div className="bg-black/30 p-3 rounded-xl border border-white/10 space-y-1">
                          <h4 className="font-bold text-amber-300 text-[11px] uppercase tracking-wider">
                            Medical &amp; Emergency
                          </h4>
                          <div>
                            <span className="text-slate-400 text-[9px] block">Blood Group:</span>
                            <span className="font-bold text-white text-xs">{editBlood}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[9px] block">Emergency Hotline:</span>
                            <span className="font-mono text-white">{editPhone}</span>
                          </div>
                        </div>

                        <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-[9px] text-slate-300 leading-relaxed">
                          <p className="font-bold text-white mb-1 uppercase">Institutional Terms:</p>
                          Property of Proxima SMS Institute. Must be surrendered upon disengagement or graduation. If found, please return to the Security Headquarters or nearest university precinct.
                        </div>
                      </div>

                      {/* Barcode */}
                      <div className="pt-2 border-t border-white/10 flex flex-col items-center">
                        <div className="w-3/4 bg-white px-3 py-1 rounded flex flex-col items-center">
                          <div className="w-full h-6 flex justify-between items-center px-1">
                            {Array.from({ length: 50 }).map((_, i) => (
                              <div
                                key={i}
                                className="bg-black h-full"
                                style={{ width: i % 3 === 0 ? '2.5px' : i % 5 === 0 ? '4px' : '1.5px' }}
                              ></div>
                            ))}
                          </div>
                          <span className="font-mono text-[8px] font-bold text-black tracking-widest">
                            *{editCode}*
                          </span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* ============================================================== */
        /* BATCH SHEET PRINT VIEW (MULTI-UP CR80 SHEET)                    */
        /* ============================================================== */
        <div id="print-area" className="bg-white p-6 rounded-3xl border border-gray-200 shadow-sm space-y-6">
          <div className="no-print flex items-center justify-between border-b pb-4">
            <div>
              <h3 className="text-lg font-bold text-gray-900">
                Multi-Card Batch Sheet (Ready for A4/CR80 Printer)
              </h3>
              <p className="text-xs text-gray-500">
                Previewing {filteredCandidates.length} credentials ready for card printer or laminated sheet cutters.
              </p>
            </div>
            <button
              onClick={handlePrint}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md"
            >
              <Printer className="w-4 h-4" />
              Print Full Sheet Now
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 justify-items-center">
            {filteredCandidates.map((cand, idx) => (
              <div
                key={cand.id}
                className={`w-[320px] max-w-full h-[500px] rounded-2xl shadow-md p-4 relative overflow-hidden flex flex-col justify-between border border-gray-300 bg-gradient-to-b ${theme.bgGradient} text-white`}
              >
                {/* Header */}
                <div className="text-center border-b border-white/10 pb-2">
                  <span className="font-black text-xs tracking-wider uppercase font-serif block">
                    PROXIMA INSTITUTION
                  </span>
                  <span className="text-[8px] tracking-widest text-slate-300 uppercase">
                    Official Identity Credential
                  </span>
                </div>

                {/* Photo & Identity */}
                <div className="flex flex-col items-center mt-2">
                  <div className="w-24 h-24 rounded-2xl p-1 bg-white/20 shadow-md">
                    <div className="w-full h-full rounded-xl overflow-hidden bg-slate-800 flex items-center justify-center">
                      <User className="w-10 h-10 text-slate-400" />
                    </div>
                  </div>

                  <h3 className="text-sm font-extrabold tracking-tight mt-2 uppercase text-center line-clamp-1">
                    {cand.fullName}
                  </h3>
                  <p className="text-[10px] text-slate-300 text-center line-clamp-1">
                    {cand.titleOrClass}
                  </p>
                </div>

                {/* Details */}
                <div className="bg-black/25 rounded-xl p-2.5 text-[9px] space-y-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">ID / CODE:</span>
                    <span className="font-mono font-bold text-amber-300">{cand.code}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">DEPT:</span>
                    <span className="font-semibold truncate max-w-[150px]">{cand.department}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">EXPIRY:</span>
                    <span className="font-mono text-emerald-300">{cand.expiryDate}</span>
                  </div>
                </div>

                {/* Footer Barcode */}
                <div className="pt-2 border-t border-white/10 flex justify-between items-center text-[8px]">
                  <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-bold uppercase">
                    {cand.type}
                  </span>
                  <span className="font-mono text-slate-400">REGISTRAR VERIFIED</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
