import React, { useState, useRef, useCallback } from 'react';
import {
  FileText, UploadCloud, Sparkles, CheckCircle2, AlertCircle,
  Calendar, MapPin, Hotel, Car, Zap, X, ChevronDown, ChevronUp,
  RefreshCw, ArrowRight, Clock, ShieldCheck, ListChecks, Info
} from 'lucide-react';
import { parseDmcItinerary, ParsedDmcPackage } from '../../../src/lib/pdfItineraryParser';
import { useItinerary, ItineraryItem, ServiceType } from '../ItineraryContext';
import { toast } from 'sonner';

interface PdfItineraryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PdfItineraryImportModal: React.FC<PdfItineraryImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { updateTripDetails, replaceAllItems, updateDayMeta } = useItinerary();

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedDmcPackage | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState<'plan' | 'terms'>('plan');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a valid PDF document.');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setErrorMsg(null);
    setParsedData(null);

    try {
      const result = await parseDmcItinerary(selectedFile, (status) => {
        setProgressStatus(status);
      });
      setParsedData(result);
      toast.success(
        result.source === 'ai'
          ? `AI successfully extracted ${result.daysPlan.length} days and ${result.daysPlan.reduce((acc, d) => acc + d.items.length, 0)} services!`
          : `Extracted ${result.daysPlan.length} days using smart heuristic parser!`
      );
    } catch (err: any) {
      console.error('[PdfItineraryImportModal] Error:', err);
      setErrorMsg(err.message || 'Failed to extract itinerary from PDF. Please check the file.');
      toast.error(err.message || 'Failed to process PDF.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleApplyToItinerary = () => {
    if (!parsedData) return;

    // 1. Update Trip Details
    updateTripDetails({
      title: parsedData.title,
      destination: parsedData.destination,
      days: parsedData.days,
      nights: parsedData.nights,
      included: parsedData.included,
      notIncluded: parsedData.notIncluded,
      termsAndConditions: parsedData.termsAndConditions || '',
      destinationsList: parsedData.destinationsList
    });

    // 2. Build and inject day-by-day items
    const newItems: Omit<ItineraryItem, 'sellPrice'>[] = [];

    parsedData.daysPlan.forEach(day => {
      // Update Day theme and notes
      updateDayMeta(day.day, {
        theme: day.title,
        notes: day.notes
      });

      // Map day items
      day.items.forEach((act, actIdx) => {
        const sType: ServiceType = ['hotel', 'activity', 'transport', 'flight', 'guide', 'note', 'visa'].includes(act.type)
          ? act.type
          : 'activity';

        newItems.push({
          id: `DMC-${Date.now()}-${day.day}-${actIdx}-${Math.random().toString(36).substr(2, 4)}`,
          type: sType,
          day: day.day,
          title: act.title,
          description: act.description || '',
          netCost: Number(act.cost) || 0,
          baseMarkupPercent: 15,
          extraMarkupFlat: 0,
          quantity: 1,
          time: act.time || (actIdx === 0 ? '10:00 AM' : actIdx === 1 ? '02:00 PM' : '05:30 PM'),
          duration: act.duration || '2 Hours'
        });
      });
    });

    replaceAllItems(newItems);

    toast.success('Itinerary successfully populated from DMC PDF! Proceed to Step 3 to set pricing.', {
      duration: 6000
    });

    onSuccess?.();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setParsedData(null);
    setErrorMsg(null);
    setProgressStatus('');
  };

  if (!isOpen) return null;

  const totalItemsCount = parsedData?.daysPlan.reduce((sum, d) => sum + d.items.length, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
        
        {/* ── Modal Header ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-200 bg-linear-to-r from-amber-500/10 via-white to-amber-500/5">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-amber-500 flex items-center justify-center text-white shadow-xs">
              <FileText size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-black text-stone-900">Import DMC / Supplier PDF Package</h2>
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full border border-amber-300">
                  AI Powered
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Automatically extract day-by-day tours, hotels, transfers, and terms from your supplier quotation PDF.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="size-8 rounded-lg flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* ── Modal Body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-rose-800">Extraction Error</p>
                <p className="text-xs text-rose-600 mt-0.5">{errorMsg}</p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs font-bold text-rose-700 underline hover:text-rose-900"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Dropzone & Upload State (When no parsed data) ─────────── */}
          {!parsedData && !isProcessing && (
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${
                dragActive
                  ? 'border-amber-500 bg-amber-50/50 scale-[0.99]'
                  : 'border-stone-300 hover:border-amber-400 hover:bg-stone-50/70 bg-stone-50/30'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileInputChange}
                className="hidden"
              />

              <div className="size-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-xs">
                <UploadCloud size={30} />
              </div>

              <h3 className="text-sm font-black text-stone-900">
                Click to browse or drag & drop DMC PDF Itinerary
              </h3>
              <p className="text-xs text-stone-500 mt-1 max-w-md mx-auto">
                Supports all DMC quotation formats (Kashmir, Dubai, Himachal, Bali, Kerala, Thailand, etc.).
              </p>

              <div className="flex items-center justify-center gap-4 mt-6 text-[11px] text-stone-400 font-medium">
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-500" /> Day-by-Day Extraction
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-500" /> Stays & Transfers
                </span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-500" /> Inclusions & T&C
                </span>
              </div>
            </div>
          )}

          {/* ── Processing Indicator ─────────────────────────────────── */}
          {isProcessing && (
            <div className="py-16 text-center space-y-4">
              <div className="relative size-16 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
                <div className="absolute inset-2 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Sparkles size={20} className="animate-pulse" />
                </div>
              </div>

              <div>
                <h3 className="text-sm font-black text-stone-900">Analyzing DMC Itinerary</h3>
                <p className="text-xs text-stone-500 mt-1 animate-pulse">
                  {progressStatus || 'Extracting structured travel plan from PDF...'}
                </p>
              </div>

              <div className="max-w-xs mx-auto bg-stone-100 rounded-full h-1.5 overflow-hidden">
                <div className="bg-amber-500 h-full w-2/3 animate-[pulse_1.5s_infinite]" />
              </div>
            </div>
          )}

          {/* ── Extraction Preview (When data is parsed) ──────────────── */}
          {parsedData && (
            <div className="space-y-5 animate-in fade-in duration-300">
              
              {/* Package Summary Card */}
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-md">
                        {parsedData.source === 'ai' ? `✨ AI Extracted` : `⚙️ Smart Heuristic`}
                      </span>
                      {parsedData.modelUsed && (
                        <span className="text-[10px] text-amber-700 font-bold">
                          via {parsedData.modelUsed}
                        </span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-stone-900 mt-1">
                      {parsedData.title}
                    </h3>
                  </div>

                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-500 hover:text-stone-800 bg-white px-3 py-1.5 rounded-lg border border-stone-200 shadow-2xs hover:bg-stone-50 transition-colors"
                  >
                    <RefreshCw size={13} /> Upload Different PDF
                  </button>
                </div>

                {/* Key Metadata Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-amber-200/60">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white px-2.5 py-1 rounded-md border border-stone-200 shadow-2xs">
                    <MapPin size={13} className="text-rose-500" />
                    {parsedData.destination}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white px-2.5 py-1 rounded-md border border-stone-200 shadow-2xs">
                    <Calendar size={13} className="text-amber-500" />
                    {parsedData.days} Days / {parsedData.nights} Nights
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white px-2.5 py-1 rounded-md border border-stone-200 shadow-2xs">
                    <Zap size={13} className="text-indigo-500" />
                    {totalItemsCount} Services Detected
                  </span>
                  {parsedData.destinationsList && parsedData.destinationsList.length > 0 && (
                    <span className="text-xs font-bold text-stone-500 flex items-center gap-1">
                      Route: {parsedData.destinationsList.map(d => `${d.name} (${d.nights}N)`).join(' → ')}
                    </span>
                  )}
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-stone-200">
                <button
                  onClick={() => setActiveTab('plan')}
                  className={`pb-2.5 text-xs font-black tracking-wide border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'plan'
                      ? 'border-amber-500 text-amber-700'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  <Calendar size={14} /> Day-by-Day Plan ({parsedData.daysPlan.length} Days)
                </button>
                <button
                  onClick={() => setActiveTab('terms')}
                  className={`pb-2.5 text-xs font-black tracking-wide border-b-2 transition-colors flex items-center gap-1.5 ${
                    activeTab === 'terms'
                      ? 'border-amber-500 text-amber-700'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  <ListChecks size={14} /> Inclusions ({parsedData.included.length}) & Exclusions ({parsedData.notIncluded.length})
                </button>
              </div>

              {/* Tab: Day-by-Day Plan */}
              {activeTab === 'plan' && (
                <div className="space-y-3">
                  {parsedData.daysPlan.map((day) => {
                    const isExpanded = expandedDay === day.day;
                    return (
                      <div
                        key={day.day}
                        className="border border-stone-200 rounded-xl overflow-hidden bg-white shadow-2xs"
                      >
                        {/* Day Header Accordion Toggle */}
                        <div
                          onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                          className="flex items-center justify-between p-3.5 bg-stone-50/70 hover:bg-stone-100/70 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="size-6 rounded-md bg-stone-900 text-white font-black text-[11px] flex items-center justify-center shrink-0">
                              D{day.day}
                            </span>
                            <div>
                              <h4 className="text-xs font-black text-stone-900">
                                {day.title}
                              </h4>
                              {day.overnightCity && (
                                <span className="text-[10px] text-stone-500 font-bold">
                                  Overnight: {day.overnightCity}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[11px] font-bold text-stone-500 bg-white px-2 py-0.5 rounded-md border border-stone-200">
                              {day.items.length} items
                            </span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        {/* Day Items Content */}
                        {isExpanded && (
                          <div className="p-3.5 space-y-2.5 border-t border-stone-200">
                            {day.notes && (
                              <div className="p-2.5 rounded-lg bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-800 flex items-start gap-2">
                                <Info size={13} className="shrink-0 mt-0.5 text-amber-600" />
                                <span>{day.notes}</span>
                              </div>
                            )}

                            {day.items.map((item, iIdx) => {
                              const getBadge = () => {
                                switch (item.type) {
                                  case 'hotel':
                                    return { icon: <Hotel size={12} />, bg: 'bg-indigo-50 text-indigo-700 border-indigo-200', label: 'Hotel' };
                                  case 'transport':
                                    return { icon: <Car size={12} />, bg: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Transfer' };
                                  default:
                                    return { icon: <Zap size={12} />, bg: 'bg-amber-50 text-amber-700 border-amber-200', label: 'Activity' };
                                }
                              };
                              const badge = getBadge();

                              return (
                                <div
                                  key={iIdx}
                                  className="p-3 rounded-lg border border-stone-200/80 bg-stone-50/40 flex items-start justify-between gap-3"
                                >
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.bg}`}>
                                        {badge.icon} {badge.label}
                                      </span>
                                      <h5 className="text-xs font-black text-stone-900">
                                        {item.title}
                                      </h5>
                                    </div>
                                    {item.description && (
                                      <p className="text-[11px] text-stone-600 pl-0.5 leading-relaxed">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>

                                  <div className="shrink-0 text-right space-y-0.5">
                                    {item.time && (
                                      <span className="text-[10px] font-bold text-stone-500 flex items-center justify-end gap-1">
                                        <Clock size={11} /> {item.time}
                                      </span>
                                    )}
                                    {item.duration && (
                                      <span className="text-[10px] text-stone-400 block">
                                        {item.duration}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Tab: Inclusions & Exclusions */}
              {activeTab === 'terms' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Inclusions */}
                  <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30">
                    <h4 className="text-xs font-black text-emerald-900 flex items-center gap-1.5 mb-3">
                      <ShieldCheck size={14} className="text-emerald-600" />
                      Package Inclusions ({parsedData.included.length})
                    </h4>
                    <ul className="space-y-2">
                      {parsedData.included.map((inc, i) => (
                        <li key={i} className="text-xs text-stone-700 flex items-start gap-2">
                          <CheckCircle2 size={13} className="text-emerald-500 shrink-0 mt-0.5" />
                          <span>{inc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Exclusions */}
                  <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30">
                    <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5 mb-3">
                      <AlertCircle size={14} className="text-rose-600" />
                      Package Exclusions ({parsedData.notIncluded.length})
                    </h4>
                    <ul className="space-y-2">
                      {parsedData.notIncluded.map((exc, i) => (
                        <li key={i} className="text-xs text-stone-700 flex items-start gap-2">
                          <X size={13} className="text-rose-500 shrink-0 mt-0.5" />
                          <span>{exc}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Modal Footer ───────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors"
          >
            Cancel
          </button>

          {parsedData && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-stone-500">
                Ready to inject {parsedData.daysPlan.length} days & {totalItemsCount} items
              </span>
              <button
                onClick={handleApplyToItinerary}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                Apply to Itinerary <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
