import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  FileText, UploadCloud, Sparkles, CheckCircle2, AlertCircle,
  Calendar, MapPin, Hotel, Car, Zap, X, ChevronDown, ChevronUp,
  RefreshCw, ArrowRight, Clock, ShieldCheck, ListChecks, Info,
  Trash2, Edit3, MessageSquare, DollarSign, Layers, Cpu, Copy,
  Check, FileUp, Sparkle
} from 'lucide-react';
import { parseDmcItinerary, ParsedDmcPackage, DMC_AI_MODELS, DmcAiModelOption } from '../../../src/lib/pdfItineraryParser';
import { useItinerary, ItineraryItem, ServiceType } from '../ItineraryContext';
import { toast } from 'sonner';

interface PdfItineraryImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const SAMPLE_WHATSAPP_QUOTE = `*KASHMIR DELIGHT 5N / 6D PACKAGE*
Guest: 2 Adults (Twin Sharing)

*DAY-BY-DAY ITINERARY:*
Day 1: Srinagar Airport Pick-up & Shikara Cruise on Dal Lake. Overnight stay at Srinagar.
Day 2: Srinagar to Gulmarg Excursion (54 km). Enjoy Gulmarg Gondola Cable Car Ride & snow activities. Return to Srinagar for dinner.
Day 3: Srinagar to Pahalgam Valley via Saffron fields & Awantipora ruins. Visit Betaab Valley & Aru Valley. Overnight at Pahalgam.
Day 4: Pahalgam scenic drive back to Srinagar. Check-in to Premium Heritage Houseboat on Nigeen Lake.
Day 5: Full Day Sonmarg (Meadow of Gold) Day Trip. Visit Thajiwas Glacier. Evening shopping in Lal Chowk.
Day 6: Morning breakfast & airport drop at Srinagar Airport.

*HOTELS (MAP Plan - Breakfast & Dinner):*
• Srinagar (3N): Hotel Heevan / Grand Mumtaz (Deluxe Room)
• Pahalgam (1N): Pine N Peak / Hotel Heevan (Deluxe Room)
• Srinagar (1N): Wangnoo Heritage Houseboat (Deluxe Room)

*TRANSPORT & VEHICLE:*
• 1x Dedicated Private Innova Crysta for all transfers and sightseeing.

*NET SUPPLIER QUOTE:*
• Rate: INR 22,500/- Per Person (Total INR 45,000 for 2 Adults)
• Inclusions: 5N stay, MAPAI meal plan, Innova vehicle, 1-hr Shikara ride, toll, parking, driver allowance.
• Exclusions: Airfare, Gondola tickets, pony rides, Pahalgam local cab.`;

export const PdfItineraryImportModal: React.FC<PdfItineraryImportModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { updateTripDetails, replaceAllItems, updateDayMeta, items: currentItems, tripDetails } = useItinerary();

  // Input Mode: PDF file or Raw Text (WhatsApp / Email)
  const [inputMode, setInputMode] = useState<'pdf' | 'text'>('pdf');
  const [rawText, setRawText] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>('auto');
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);

  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const [parsedData, setParsedData] = useState<ParsedDmcPackage | null>(null);
  const [expandedDay, setExpandedDay] = useState<number | null>(1);
  const [activeTab, setActiveTab] = useState<'plan' | 'terms'>('plan');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Application Options
  const [applyMode, setApplyMode] = useState<'replace' | 'append'>('replace');
  const [distributeSupplierCost, setDistributeSupplierCost] = useState<boolean>(true);

  // Inline Editing State
  const [isEditingTitle, setIsEditingTitle] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const modelDropdownRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  // Click outside and Escape key to close custom model dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modelDropdownRef.current && !modelDropdownRef.current.contains(e.target as Node)) {
        setIsModelDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsModelDropdownOpen(false);
      }
    };
    if (isModelDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModelDropdownOpen]);

  const activeModelObj = DMC_AI_MODELS.find(m => m.id === selectedModel) || DMC_AI_MODELS[0];

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const executeExtraction = async (input: File | string) => {
    setIsProcessing(true);
    setErrorMsg(null);
    setParsedData(null);

    try {
      const result = await parseDmcItinerary(input, (status) => {
        setProgressStatus(status);
      }, selectedModel);

      setParsedData(result);
      toast.success(
        result.source === 'ai'
          ? `AI successfully extracted ${result.daysPlan.length} days and ${result.daysPlan.reduce((acc, d) => acc + d.items.length, 0)} services!`
          : `Extracted ${result.daysPlan.length} days using smart heuristic parser!`
      );
    } catch (err: any) {
      console.error('[PdfItineraryImportModal] Error:', err);
      setErrorMsg(err.message || 'Failed to extract itinerary. Please check the document or text.');
      toast.error(err.message || 'Failed to process itinerary.');
    } finally {
      setIsProcessing(false);
    }
  };

  const processFile = async (selectedFile: File) => {
    if (!selectedFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Please upload a valid PDF document.');
      return;
    }
    setFile(selectedFile);
    await executeExtraction(selectedFile);
  };

  const handleTextSubmit = async () => {
    if (!rawText.trim() || rawText.trim().length < 30) {
      toast.error('Please paste a substantial supplier itinerary or WhatsApp quotation message.');
      return;
    }
    await executeExtraction(rawText);
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

  const handleLoadSample = () => {
    setRawText(SAMPLE_WHATSAPP_QUOTE);
    toast.info('Sample Kashmir quotation loaded! Click "Analyze Text with AI" to test.');
  };

  // Inline Item Removal
  const handleDeleteItem = (dayNum: number, itemIdx: number) => {
    if (!parsedData) return;
    setParsedData(prev => {
      if (!prev) return null;
      const updatedDays = prev.daysPlan.map(d => {
        if (d.day === dayNum) {
          const updatedItems = [...d.items];
          updatedItems.splice(itemIdx, 1);
          return { ...d, items: updatedItems };
        }
        return d;
      });
      return { ...prev, daysPlan: updatedDays };
    });
    toast.info('Item removed from preview');
  };

  // Apply Extracted Data to Itinerary Builder
  const handleApplyToItinerary = () => {
    if (!parsedData) return;

    const isAppend = applyMode === 'append' && currentItems.length > 0;
    const baseDayOffset = isAppend ? (tripDetails?.days || 0) : 0;
    const baseNightsOffset = isAppend ? (tripDetails?.nights || 0) : 0;

    // 1. Update Trip Details
    updateTripDetails({
      title: isAppend ? (tripDetails?.title || parsedData.title) : parsedData.title,
      destination: isAppend ? (tripDetails?.destination || parsedData.destination) : parsedData.destination,
      days: isAppend ? baseDayOffset + parsedData.days : parsedData.days,
      nights: isAppend ? baseNightsOffset + parsedData.nights : parsedData.nights,
      included: isAppend ? Array.from(new Set([...(tripDetails?.included || []), ...parsedData.included])) : parsedData.included,
      notIncluded: isAppend ? Array.from(new Set([...(tripDetails?.notIncluded || []), ...parsedData.notIncluded])) : parsedData.notIncluded,
      termsAndConditions: parsedData.termsAndConditions || tripDetails?.termsAndConditions || '',
      destinationsList: parsedData.destinationsList
    });

    // 2. Build and inject day-by-day items
    const newItems: Omit<ItineraryItem, 'sellPrice'>[] = [];
    const totalDaysCount = parsedData.daysPlan.length;

    // Supplier pricing distribution helper
    const costPerPerson = parsedData.pricing?.costPerPerson || 0;
    const totalPackageCost = parsedData.pricing?.totalPackageCost || 0;
    const targetNetBase = costPerPerson > 0 ? costPerPerson : (totalPackageCost > 0 ? Math.round(totalPackageCost / 2) : 0);

    parsedData.daysPlan.forEach((day, dIdx) => {
      const targetDayNum = baseDayOffset + day.day;

      // Update Day theme and notes
      updateDayMeta(targetDayNum, {
        theme: day.title,
        notes: day.notes
      });

      // Map day items
      day.items.forEach((act, actIdx) => {
        const sType: ServiceType = ['hotel', 'activity', 'transport', 'flight', 'guide', 'note', 'visa'].includes(act.type)
          ? act.type
          : 'activity';

        // Calculate assigned net cost
        let itemNetCost = Number(act.cost) || 0;
        if (itemNetCost === 0 && distributeSupplierCost && targetNetBase > 0) {
          if (sType === 'hotel') {
            itemNetCost = Math.round((targetNetBase * 0.50) / Math.max(1, totalDaysCount));
          } else if (sType === 'transport' && dIdx === 0) {
            itemNetCost = Math.round(targetNetBase * 0.30);
          }
        }

        newItems.push({
          id: `DMC-${Date.now()}-${targetDayNum}-${actIdx}-${Math.random().toString(36).substr(2, 4)}`,
          type: sType,
          day: targetDayNum,
          title: act.title,
          description: act.description || '',
          netCost: itemNetCost,
          baseMarkupPercent: 15,
          extraMarkupFlat: 0,
          quantity: 1,
          time: act.time || (actIdx === 0 ? '10:00 AM' : actIdx === 1 ? '02:00 PM' : '05:30 PM'),
          duration: act.duration || '2 Hours'
        });
      });
    });

    if (isAppend) {
      replaceAllItems([...currentItems, ...newItems]);
      toast.success(`Appended ${parsedData.daysPlan.length} days to existing itinerary!`, { duration: 5000 });
    } else {
      replaceAllItems(newItems);
      toast.success(`Itinerary successfully created from supplier proposal! (${newItems.length} services loaded)`, { duration: 6000 });
    }

    onSuccess?.();
    onClose();
  };

  const handleReset = () => {
    setFile(null);
    setRawText('');
    setParsedData(null);
    setErrorMsg(null);
    setProgressStatus('');
  };

  if (!isOpen) return null;

  const totalItemsCount = parsedData?.daysPlan.reduce((sum, d) => sum + d.items.length, 0) || 0;

  // ── Render Modal Content ──────────────────────────────────────────────────
  const modalContent = (
    // FIX 1: z-[99999] mounted to document.body via createPortal guarantees unobstructed rendering above header (z-[110])
    // FIX 2: pt-14 pb-8 sm:py-10 ensures the modal is centered with safe breathing room from top navbar
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-3 sm:p-6 pt-16 pb-8 sm:pt-16 sm:pb-10 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
      
      {/* Backdrop Click Dismiss */}
      <div 
        className="fixed inset-0 -z-10" 
        onClick={() => {
          if (!isProcessing) onClose();
        }} 
      />

      {/* Modal Dialog Card */}
      <div className="relative w-full max-w-4xl max-h-[88vh] bg-white rounded-3xl shadow-2xl border border-stone-200/90 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 my-auto">
        
        {/* Top Gradient Accent Bar */}
        <div className="h-1.5 w-full bg-linear-to-r from-amber-500 via-amber-400 to-amber-600 shrink-0" />

        {/* ── Modal Header ───────────────────────────────────────────── */}
        <div className="px-6 py-4 border-b border-stone-200/80 bg-stone-50/60 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center border border-amber-500/20 shadow-xs shrink-0">
              <FileUp size={22} className="stroke-[2.2]" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base font-black text-stone-900 tracking-tight">
                  Import Supplier / DMC Proposal
                </h2>
                <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider bg-linear-to-r from-amber-500 to-amber-600 text-white px-2 py-0.5 rounded-full shadow-2xs">
                  <Sparkles size={10} /> AI Powered
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Automatically extract days, hotels, transfers, net pricing & terms from PDF or WhatsApp quotes.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
            {/* ── CRM Custom Model Dropdown (Fix 2: High-End UI/UX replacing raw <select>) ── */}
            {!parsedData && !isProcessing && (
              <div className="relative" ref={modelDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
                  className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-stone-200/90 shadow-2xs hover:border-amber-400 hover:shadow-xs transition-all text-xs font-bold text-stone-700 cursor-pointer"
                >
                  <span className="text-sm shrink-0">{activeModelObj.icon}</span>
                  <span className="truncate max-w-[150px] sm:max-w-[200px] text-stone-900 font-extrabold">
                    {activeModelObj.name}
                  </span>
                  <span className={`text-[9px] px-1.5 py-0.2 rounded border font-semibold hidden md:inline-block ${activeModelObj.badgeColor}`}>
                    {activeModelObj.tag}
                  </span>
                  <ChevronDown size={13} className={`text-stone-400 transition-transform duration-200 shrink-0 ${isModelDropdownOpen ? 'rotate-180 text-amber-600' : ''}`} />
                </button>

                {/* Popover Card */}
                {isModelDropdownOpen && (
                  <div className="absolute right-0 top-full mt-2 w-[340px] sm:w-[420px] max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-2xl border border-stone-200/90 p-2 z-[100000] animate-in fade-in-0 zoom-in-95 duration-150">
                    <div className="px-3 py-2 border-b border-stone-100 flex items-center justify-between">
                      <span className="text-[10px] font-black uppercase tracking-wider text-stone-400">
                        Select AI Engine
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                        Enterprise Verified
                      </span>
                    </div>

                    <div className="mt-1 space-y-1 max-h-[300px] overflow-y-auto p-1">
                      {DMC_AI_MODELS.map((model) => {
                        const isSelected = selectedModel === model.id;
                        return (
                          <div
                            key={model.id}
                            onClick={() => {
                              setSelectedModel(model.id);
                              setIsModelDropdownOpen(false);
                            }}
                            className={`p-2.5 rounded-xl cursor-pointer transition-all flex items-start gap-3 border ${
                              isSelected
                                ? 'bg-amber-50/90 border-amber-300 shadow-2xs'
                                : 'border-transparent hover:bg-stone-50 hover:border-stone-200'
                            }`}
                          >
                            <div className="size-9 rounded-xl bg-white border border-stone-200 flex items-center justify-center text-lg shrink-0 shadow-2xs">
                              {model.icon}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-xs font-black text-stone-900 truncate">
                                  {model.name}
                                </span>
                                <span className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border shrink-0 ${model.badgeColor}`}>
                                  {model.tag}
                                </span>
                              </div>
                              <p className="text-[11px] text-stone-500 mt-0.5 leading-tight line-clamp-2">
                                {model.description}
                              </p>
                            </div>
                            {isSelected && (
                              <Check size={16} className="text-amber-600 shrink-0 mt-1" />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button
              onClick={onClose}
              className="size-9 rounded-xl flex items-center justify-center text-stone-400 hover:text-stone-700 hover:bg-stone-200/60 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* ── Modal Body ─────────────────────────────────────────────── */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Error Banner */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-start gap-3">
              <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-rose-800">Extraction Error</p>
                <p className="text-xs text-rose-600 mt-0.5">{errorMsg}</p>
              </div>
              <button
                onClick={handleReset}
                className="text-xs font-bold text-rose-700 underline hover:text-rose-900 cursor-pointer"
              >
                Try Again
              </button>
            </div>
          )}

          {/* ── Mode Selection & Upload State (When no parsed data) ────── */}
          {!parsedData && !isProcessing && (
            <div className="space-y-5">
              
              {/* Segmented Tab Controller */}
              <div className="flex justify-center">
                <div className="inline-flex p-1 bg-stone-100 rounded-2xl border border-stone-200/80 shadow-inner">
                  <button
                    type="button"
                    onClick={() => setInputMode('pdf')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      inputMode === 'pdf'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <UploadCloud size={15} className={inputMode === 'pdf' ? 'text-amber-500' : ''} />
                    Upload DMC PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => setInputMode('text')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      inputMode === 'text'
                        ? 'bg-white text-stone-900 shadow-sm'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    <MessageSquare size={15} className={inputMode === 'text' ? 'text-amber-500' : ''} />
                    Paste WhatsApp / Email Text
                  </button>
                </div>
              </div>

              {/* Mode 1: PDF File Dropzone */}
              {inputMode === 'pdf' && (
                <div
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 sm:p-12 text-center cursor-pointer transition-all relative overflow-hidden ${
                    dragActive
                      ? 'border-amber-500 bg-amber-50/60 scale-[0.99] shadow-inner'
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

                  {/* Soft Background Radial Light */}
                  <div className="absolute inset-0 bg-radial from-amber-500/5 via-transparent to-transparent pointer-events-none" />

                  <div className="size-16 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4 shadow-sm border border-amber-200">
                    <UploadCloud size={30} />
                  </div>

                  <h3 className="text-base font-black text-stone-900 tracking-tight">
                    Drop your DMC quotation PDF here, or <span className="text-amber-600 underline">browse</span>
                  </h3>
                  <p className="text-xs text-stone-500 mt-1.5 max-w-md mx-auto leading-relaxed">
                    Supports all supplier formats (Kashmir, Dubai, Himachal, Bali, Kerala, Thailand, Vietnam, Maldives, Europe).
                  </p>

                  <div className="flex flex-wrap items-center justify-center gap-2.5 mt-6">
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-stone-700 px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                      <CheckCircle2 size={13} className="text-emerald-500" /> Day-by-Day Route
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-stone-700 px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                      <CheckCircle2 size={13} className="text-emerald-500" /> Hotels & Meal Plans
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-stone-700 px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                      <CheckCircle2 size={13} className="text-emerald-500" /> Vehicle & Net Rates
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-white text-stone-700 px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                      <CheckCircle2 size={13} className="text-emerald-500" /> Scanned / Brochure OCR
                    </span>
                  </div>
                </div>
              )}

              {/* Mode 2: Paste Raw Text / WhatsApp */}
              {inputMode === 'text' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-stone-700 flex items-center gap-1.5">
                      <MessageSquare size={14} className="text-amber-500" />
                      Paste DMC WhatsApp Quote or Itinerary Email
                    </span>
                    <button
                      type="button"
                      onClick={handleLoadSample}
                      className="text-xs font-bold text-amber-700 hover:text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={12} /> Load Sample Kashmir Quote
                    </button>
                  </div>

                  <div className="relative">
                    <textarea
                      value={rawText}
                      onChange={(e) => setRawText(e.target.value)}
                      placeholder="Paste your DMC WhatsApp quote or supplier proposal email here...&#10;&#10;Example:&#10;Kashmir 5N/6D Package&#10;D1: Srinagar Arrival & Shikara Ride, O/N Srinagar&#10;D2: Srinagar to Gulmarg Sightseeing & Gondola&#10;Hotel: Hotel Heevan / Pine N Peak (MAPAI)&#10;Vehicle: Innova Crysta&#10;Total Rate: ₹38,500 for 2 Adults"
                      rows={9}
                      className="w-full rounded-2xl border border-stone-300 p-4 text-xs text-stone-800 placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-500 focus:border-amber-500 leading-relaxed font-mono bg-stone-50/30"
                    />
                    {rawText && (
                      <span className="absolute bottom-3 right-3 text-[10px] font-bold text-stone-500 bg-white/90 border border-stone-200 px-2 py-0.5 rounded-md shadow-2xs">
                        {rawText.length} characters
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px] text-stone-500">
                      AI will analyze the unstructured message, separate days, extract hotels and vehicle, and structure pricing.
                    </p>
                    <button
                      type="button"
                      onClick={handleTextSubmit}
                      disabled={!rawText.trim()}
                      className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
                    >
                      <Sparkles size={14} /> Analyze Text with AI
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── Processing Indicator ─────────────────────────────────── */}
          {isProcessing && (
            <div className="py-20 text-center space-y-4">
              <div className="relative size-18 mx-auto">
                <div className="absolute inset-0 rounded-full border-4 border-amber-200 border-t-amber-600 animate-spin" />
                <div className="absolute inset-2.5 rounded-full bg-amber-50 flex items-center justify-center text-amber-600">
                  <Sparkles size={24} className="animate-pulse" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-base font-black text-stone-900">Analyzing Supplier Itinerary</h3>
                <p className="text-xs text-stone-500 max-w-sm mx-auto animate-pulse">
                  {progressStatus || 'Extracting structured travel plan, pricing & hotels...'}
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
              <div className="p-5 rounded-2xl bg-linear-to-b from-amber-50/80 to-amber-50/30 border border-amber-200/90 shadow-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex-1 min-w-[280px]">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider bg-amber-200/80 text-amber-900 px-2.5 py-0.5 rounded-md">
                        {parsedData.source === 'ai' ? `✨ AI Extracted` : `⚙️ Smart Heuristic`}
                      </span>
                      {parsedData.modelUsed && (
                        <span className="text-[10px] text-amber-800 font-bold">
                          via {parsedData.modelUsed}
                        </span>
                      )}
                    </div>

                    {/* Editable Title */}
                    <div className="mt-1.5 flex items-center gap-2">
                      {isEditingTitle ? (
                        <input
                          type="text"
                          value={parsedData.title}
                          onChange={(e) => setParsedData({ ...parsedData, title: e.target.value })}
                          onBlur={() => setIsEditingTitle(false)}
                          onKeyDown={(e) => e.key === 'Enter' && setIsEditingTitle(false)}
                          autoFocus
                          className="text-base font-black text-stone-900 bg-white border border-amber-300 rounded-lg px-2.5 py-1 w-full focus:outline-hidden"
                        />
                      ) : (
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingTitle(true)}>
                          <h3 className="text-base font-black text-stone-900 hover:text-amber-800 transition-colors">
                            {parsedData.title}
                          </h3>
                          <Edit3 size={14} className="text-stone-400 group-hover:text-amber-600 opacity-60 group-hover:opacity-100" />
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={handleReset}
                    className="flex items-center gap-1.5 text-xs font-bold text-stone-600 hover:text-stone-900 bg-white px-3.5 py-2 rounded-xl border border-stone-200 shadow-2xs hover:bg-stone-50 transition-colors shrink-0 cursor-pointer"
                  >
                    <RefreshCw size={13} /> Upload / Paste Another
                  </button>
                </div>

                {/* Key Metadata Badges */}
                <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3.5 border-t border-amber-200/70">
                  <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                    <MapPin size={13} className="text-rose-500" />
                    {parsedData.destination}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                    <Calendar size={13} className="text-amber-500" />
                    {parsedData.days} Days / {parsedData.nights} Nights
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-bold text-stone-700 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                    <Zap size={13} className="text-indigo-500" />
                    {totalItemsCount} Services Detected
                  </span>
                  {parsedData.destinationsList && parsedData.destinationsList.length > 0 && (
                    <span className="text-xs font-bold text-stone-600 flex items-center gap-1 bg-white px-3 py-1.5 rounded-xl border border-stone-200 shadow-2xs">
                      Route: {parsedData.destinationsList.map(d => `${d.name} (${d.nights}N)`).join(' → ')}
                    </span>
                  )}
                </div>

                {/* Extracted Pricing Banner (If supplier quoted rates) */}
                {parsedData.pricing && (parsedData.pricing.costPerPerson || parsedData.pricing.totalPackageCost) && (
                  <div className="mt-3.5 p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl flex flex-wrap items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="size-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-xs">
                        <DollarSign size={16} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-emerald-800 tracking-wider">
                          Supplier Net Quoted Pricing
                        </span>
                        <div className="flex items-center gap-2 text-xs font-black text-emerald-950">
                          {parsedData.pricing.costPerPerson ? (
                            <span>{parsedData.pricing.currency || 'INR'} {parsedData.pricing.costPerPerson.toLocaleString()} / Person</span>
                          ) : null}
                          {parsedData.pricing.totalPackageCost ? (
                            <span className="text-stone-500 font-normal">
                              (Total Package: {parsedData.pricing.currency || 'INR'} {parsedData.pricing.totalPackageCost.toLocaleString()})
                            </span>
                          ) : null}
                          {parsedData.pricing.pricingBasis && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md font-bold">
                              {parsedData.pricing.pricingBasis}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs font-bold text-emerald-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={distributeSupplierCost}
                        onChange={(e) => setDistributeSupplierCost(e.target.checked)}
                        className="rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 size-4 cursor-pointer"
                      />
                      Auto-assign supplier net rates to services
                    </label>
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-2 border-b border-stone-200">
                <button
                  onClick={() => setActiveTab('plan')}
                  className={`pb-2.5 text-xs font-black tracking-wide border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
                    activeTab === 'plan'
                      ? 'border-amber-500 text-amber-700'
                      : 'border-transparent text-stone-400 hover:text-stone-700'
                  }`}
                >
                  <Calendar size={14} /> Day-by-Day Plan ({parsedData.daysPlan.length} Days)
                </button>
                <button
                  onClick={() => setActiveTab('terms')}
                  className={`pb-2.5 text-xs font-black tracking-wide border-b-2 transition-colors flex items-center gap-1.5 cursor-pointer ${
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
                        className="border border-stone-200 rounded-2xl overflow-hidden bg-white shadow-2xs"
                      >
                        {/* Day Header Accordion Toggle */}
                        <div
                          onClick={() => setExpandedDay(isExpanded ? null : day.day)}
                          className="flex items-center justify-between p-3.5 bg-stone-50/70 hover:bg-stone-100/70 cursor-pointer transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span className="size-6 rounded-lg bg-stone-900 text-white font-black text-[11px] flex items-center justify-center shrink-0">
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
                            <span className="text-[11px] font-bold text-stone-500 bg-white px-2 py-0.5 rounded-lg border border-stone-200">
                              {day.items.length} items
                            </span>
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </div>
                        </div>

                        {/* Day Items Content */}
                        {isExpanded && (
                          <div className="p-3.5 space-y-2.5 border-t border-stone-200">
                            {day.notes && (
                              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/60 text-[11px] text-amber-800 flex items-start gap-2">
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
                                  className="p-3 rounded-xl border border-stone-200/80 bg-stone-50/40 flex items-start justify-between gap-3 group hover:border-stone-300 transition-colors"
                                >
                                  <div className="space-y-1.5 flex-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border flex items-center gap-1 ${badge.bg}`}>
                                        {badge.icon} {badge.label}
                                      </span>
                                      <h5 className="text-xs font-black text-stone-900">
                                        {item.title}
                                      </h5>
                                      {/* Hotel Details Pill */}
                                      {item.hotelDetails?.mealPlan && (
                                        <span className="text-[10px] bg-indigo-100 text-indigo-800 px-1.5 py-0.2 rounded font-bold">
                                          Meal: {item.hotelDetails.mealPlan}
                                        </span>
                                      )}
                                      {item.hotelDetails?.roomType && (
                                        <span className="text-[10px] bg-stone-200 text-stone-700 px-1.5 py-0.2 rounded font-medium">
                                          {item.hotelDetails.roomType}
                                        </span>
                                      )}
                                      {/* Vehicle Details Pill */}
                                      {item.transportDetails?.vehicleType && (
                                        <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-bold">
                                          {item.transportDetails.vehicleType}
                                        </span>
                                      )}
                                    </div>
                                    {item.description && (
                                      <p className="text-[11px] text-stone-600 pl-0.5 leading-relaxed">
                                        {item.description}
                                      </p>
                                    )}
                                  </div>

                                  <div className="shrink-0 text-right space-y-1 flex flex-col items-end">
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
                                    {/* Inline Delete Button */}
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteItem(day.day, iIdx)}
                                      title="Remove this service"
                                      className="opacity-0 group-hover:opacity-100 text-stone-400 hover:text-rose-600 transition-all p-1 cursor-pointer"
                                    >
                                      <Trash2 size={13} />
                                    </button>
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
                  <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30">
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
                  <div className="p-4 rounded-2xl border border-rose-200 bg-rose-50/30">
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
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-200 bg-stone-50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-stone-600 hover:text-stone-900 rounded-xl hover:bg-stone-200/60 transition-colors cursor-pointer"
          >
            Cancel
          </button>

          {parsedData && (
            <div className="flex items-center gap-3">
              {/* Application Mode Toggle if items already exist */}
              {currentItems.length > 0 && (
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-stone-200 shadow-2xs text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setApplyMode('replace')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      applyMode === 'replace'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Replace All
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplyMode('append')}
                    className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                      applyMode === 'append'
                        ? 'bg-amber-500 text-white shadow-2xs'
                        : 'text-stone-500 hover:text-stone-800'
                    }`}
                  >
                    Append to Draft
                  </button>
                </div>
              )}

              <button
                onClick={handleApplyToItinerary}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-black text-xs shadow-md shadow-amber-500/20 transition-all hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
              >
                Apply to Itinerary ({parsedData.daysPlan.length} Days) <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );

  // Mount directly into document.body to escape all parent stacking contexts
  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
};
