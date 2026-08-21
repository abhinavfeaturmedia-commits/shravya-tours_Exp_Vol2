import React, { useState, useEffect } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import {
  Phone,
  MessageCircle,
  Mail,
  Globe,
  MapPin,
  Download,
  Share2,
  Check,
  Copy,
  QrCode,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Compass,
  ArrowRight,
  Printer,
  UserPlus,
  Send,
  Award,
  Plane,
  HeartHandshake
} from 'lucide-react';
import {
  getProfile,
  downloadVCard,
  getWhatsAppLink,
  getQrCodeImageUrl,
  generateVCardString,
  ContactProfile
} from '../utils/vcard';

export const DigitalCard: React.FC = () => {
  const location = useLocation();
  const params = useParams<{ name?: string }>();

  // Determine profile based on URL route or param
  const profileKey = params.name || location.pathname || '';
  const profile: ContactProfile = getProfile(profileKey);

  const [activeTab, setActiveTab] = useState<'card' | 'qr' | 'mockup'>('card');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isSaved, setIsSaved] = useState(false);
  const [qrType, setQrType] = useState<'web' | 'vcard'>('web');
  const [cardFlip, setCardFlip] = useState(false);

  // Dynamic Current URL for the digital card
  const [cardUrl, setCardUrl] = useState(`https://www.shrawello.com/#/${profile.slug}`);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const origin = window.location.origin;
      setCardUrl(`${origin}/#/${profile.slug}`);
    }
  }, [profile.slug]);

  const qrPayload = qrType === 'web' ? cardUrl : generateVCardString(profile);
  const qrImageUrl = getQrCodeImageUrl(qrPayload, 600);

  const handleCopy = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => setCopiedField(null), 2500);
  };

  const handleSaveContact = () => {
    const success = downloadVCard(profile);
    if (success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3500);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${profile.name} - ${profile.title}`,
          text: `Connect with ${profile.name} (${profile.title} at ${profile.company}) for luxury holidays & corporate travel.`,
          url: cardUrl
        });
      } catch (err) {
        handleCopy(cardUrl, 'link');
      }
    } else {
      handleCopy(cardUrl, 'link');
    }
  };

  const handleDownloadQr = async () => {
    try {
      const response = await fetch(qrImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${profile.firstName}_${profile.lastName}_Shrawello_QR_${qrType}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      window.open(qrImageUrl, '_blank');
    }
  };

  const quickInquiries = [
    { label: '🌴 Custom Holiday', msg: `Hi ${profile.firstName}, I want to plan a custom vacation / holiday package with Shrawello.` },
    { label: '🏢 Corporate / MICE', msg: `Hi ${profile.firstName}, I would like to inquire about corporate travel & group booking services.` },
    { label: '💍 Honeymoon Special', msg: `Hi ${profile.firstName}, I want to explore romantic honeymoon packages.` },
    { label: '✈️ Flights & Hotels', msg: `Hi ${profile.firstName}, I need assistance with flight tickets, luxury stays and visa support.` }
  ];

  return (
    <div className="min-h-screen bg-[#070D09] text-slate-100 flex flex-col items-center justify-start py-4 px-3 sm:py-8 sm:px-6 lg:px-8 relative overflow-x-hidden font-sans selection:bg-amber-500 selection:text-white">
      {/* Background Ambience & Golden Glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 -left-32 w-[550px] h-[550px] bg-amber-600/15 rounded-full blur-[140px]" />
        <div className="absolute -bottom-32 -right-32 w-[650px] h-[650px] bg-emerald-700/15 rounded-full blur-[160px]" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[900px] h-[600px] bg-gradient-radial from-amber-500/8 to-transparent rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:28px_28px]" />
      </div>

      {/* Main Responsive Wrapper */}
      <div className="relative z-10 w-full max-w-6xl mx-auto flex flex-col items-center">
        
        {/* Top Header Pill for Navigation (Visible on mobile & desktop) */}
        <div className="w-full max-w-md lg:max-w-2xl flex items-center justify-center p-1.5 mb-6 bg-slate-900/90 backdrop-blur-2xl border border-amber-500/20 rounded-2xl shadow-2xl shadow-black/60">
          <button
            onClick={() => setActiveTab('card')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
              activeTab === 'card'
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            Digital Card
          </button>
          <button
            onClick={() => setActiveTab('qr')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
              activeTab === 'qr'
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <QrCode className="w-4 h-4" />
            QR Studio
          </button>
          <button
            onClick={() => setActiveTab('mockup')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
              activeTab === 'mockup'
                ? 'bg-gradient-to-r from-amber-600 via-amber-500 to-amber-600 text-white shadow-lg shadow-amber-600/30'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Printer className="w-4 h-4" />
            Card Mockup
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            TAB 1: DIGITAL VISITING CARD (Main Profile View)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'card' && (
          <div className="w-full flex flex-col lg:flex-row items-center lg:items-start justify-center gap-8 animate-fade-in pb-20 lg:pb-8">
            
            {/* ── LEFT: The Executive Digital Card ── */}
            <div className="w-full max-w-md rounded-[2.5rem] bg-gradient-to-b from-[#111c15] via-[#0d1611] to-[#080e0a] backdrop-blur-2xl border border-amber-500/30 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] overflow-hidden transition-all">
              
              {/* 1. Header Banner (Clean luxury look without overlapping clutter) */}
              <div className="relative h-32 sm:h-36 bg-gradient-to-br from-[#A85E1E] via-[#C9732A] to-[#1B4332] p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
                {/* Decorative background geometry */}
                <div className="absolute -right-12 -top-12 w-48 h-48 bg-amber-300/20 rounded-full blur-3xl" />
                <div className="absolute -left-12 -bottom-12 w-48 h-48 bg-emerald-400/20 rounded-full blur-3xl" />
                <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff0a_1px,transparent_1px),linear-gradient(to_bottom,#ffffff0a_1px,transparent_1px)] bg-[size:16px_16px]" />

                {/* Top Bar inside Banner */}
                <div className="relative z-10 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-black/40 backdrop-blur-md rounded-full border border-amber-400/30 text-[11px] font-bold tracking-wide text-amber-200 shadow-md">
                    <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Official Executive Card</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest text-emerald-200/90 bg-black/30 backdrop-blur-md px-2.5 py-1 rounded-full border border-emerald-500/20">
                      Shrawello Hub
                    </span>
                    <button
                      onClick={handleShare}
                      className="p-2 bg-black/40 hover:bg-black/70 backdrop-blur-md rounded-full border border-white/20 text-white transition-all active:scale-90 shadow-md"
                      title="Share Digital Card"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Lower banner intentionally kept clear of text */}
                <div className="relative z-0 h-4" />
              </div>

              {/* 2. Profile Avatar & Brand Header */}
              <div className="relative px-6 pb-6">
                <div className="flex justify-between items-end -mt-12 mb-4">
                  {/* Executive Monogram Avatar */}
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-amber-400 via-amber-600 to-emerald-700 p-[3px] shadow-2xl shadow-amber-500/20">
                      <div className="w-full h-full rounded-[13px] bg-[#0c140f] flex flex-col items-center justify-center text-white relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/20 via-transparent to-emerald-500/20" />
                        <span className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-amber-100 to-amber-400 drop-shadow-md">
                          {profile.initials}
                        </span>
                        <span className="text-[8px] uppercase tracking-widest font-black text-amber-400/90 mt-0.5">
                          SHRAWELLO
                        </span>
                      </div>
                    </div>
                    {/* Glowing Verified Badge */}
                    <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 border-[3px] border-[#0c140f] flex items-center justify-center text-white shadow-lg shadow-emerald-500/40" title="Verified Founder">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  </div>

                  {/* Shrawello Official Brand Logo in Sleek Glass Pill */}
                  <div className="flex flex-col items-end gap-1">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-slate-900/90 border border-slate-800 backdrop-blur-md shadow-lg">
                      <img 
                        src="/logo.png" 
                        alt="Shrawello Logo" 
                        className="h-8 w-auto object-contain drop-shadow" 
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>
                    <span className="text-[9px] uppercase tracking-widest font-black text-slate-400 px-1">
                      Travel Hub
                    </span>
                  </div>
                </div>

                {/* 3. Name, Title & Bio */}
                <div className="mb-5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-2xl font-black text-white tracking-tight">{profile.name}</h1>
                    <span className="px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-amber-600/20 border border-amber-500/40 text-amber-400 text-[10px] font-black uppercase tracking-wider">
                      {profile.title}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-300 mt-1 flex items-center gap-1.5">
                    <span className="text-amber-400 font-bold">{profile.company}</span>
                    <span className="w-1 h-1 rounded-full bg-slate-500" />
                    <span className="text-emerald-400 text-xs font-medium">Pune, India</span>
                  </p>
                  <p className="text-xs text-slate-300/90 mt-2.5 leading-relaxed bg-slate-900/60 p-3 rounded-2xl border border-slate-800/80">
                    {profile.note}
                  </p>
                </div>

                {/* 4. PRIMARY HERO CTA: SAVE TO PHONE CONTACTS */}
                <button
                  onClick={handleSaveContact}
                  className={`w-full relative overflow-hidden group py-4 px-5 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all duration-300 shadow-2xl active:scale-[0.98] ${
                    isSaved
                      ? 'bg-emerald-600 text-white shadow-emerald-600/50'
                      : 'bg-gradient-to-r from-amber-500 via-amber-600 to-amber-500 hover:from-amber-400 hover:to-amber-500 text-white shadow-[0_10px_30px_-5px_rgba(201,115,42,0.6)]'
                  }`}
                >
                  <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                  {isSaved ? (
                    <>
                      <Check className="w-5 h-5 stroke-[3] animate-scale-in" />
                      <span className="tracking-wide">Contact Saved to Phone!</span>
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      <span className="tracking-wide">Save Contact to Phone</span>
                      <Download className="w-4 h-4 ml-auto opacity-80" />
                    </>
                  )}
                </button>

                {/* 5. Four Quick Action Communication Tiles */}
                <div className="grid grid-cols-4 gap-2.5 mt-4">
                  {/* Call */}
                  <a
                    href={`tel:${profile.phone}`}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 text-slate-200 hover:text-white transition-all group active:scale-95 shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-amber-500/10 group-hover:bg-amber-500 flex items-center justify-center text-amber-400 group-hover:text-white transition-colors mb-1 shadow-sm">
                      <Phone className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold">Call</span>
                  </a>

                  {/* WhatsApp */}
                  <a
                    href={getWhatsAppLink(profile.whatsapp, undefined, profile.name)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/50 text-slate-200 hover:text-white transition-all group active:scale-95 shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500 flex items-center justify-center text-emerald-400 group-hover:text-white transition-colors mb-1 shadow-sm">
                      <MessageCircle className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold">WhatsApp</span>
                  </a>

                  {/* Email */}
                  <a
                    href={`mailto:${profile.email}`}
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-blue-500/50 text-slate-200 hover:text-white transition-all group active:scale-95 shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 group-hover:bg-blue-500 flex items-center justify-center text-blue-400 group-hover:text-white transition-colors mb-1 shadow-sm">
                      <Mail className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold">Email</span>
                  </a>

                  {/* Website */}
                  <a
                    href={profile.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/80 hover:bg-slate-800 border border-slate-800 hover:border-purple-500/50 text-slate-200 hover:text-white transition-all group active:scale-95 shadow-md"
                  >
                    <div className="w-11 h-11 rounded-xl bg-purple-500/10 group-hover:bg-purple-500 flex items-center justify-center text-purple-400 group-hover:text-white transition-colors mb-1 shadow-sm">
                      <Globe className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-bold">Website</span>
                  </a>
                </div>

                {/* 6. WhatsApp Quick-Inquiry Chips */}
                <div className="mt-5">
                  <div className="flex items-center justify-between mb-2.5 px-1">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 flex items-center gap-1.5">
                      <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                      Quick WhatsApp Inquiries
                    </span>
                    <span className="text-[10px] text-emerald-400 font-semibold">1-Tap Message</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {quickInquiries.map((chip, idx) => (
                      <a
                        key={idx}
                        href={getWhatsAppLink(profile.whatsapp, chip.msg, profile.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800 border border-slate-800 hover:border-emerald-500/40 text-xs font-semibold text-slate-200 hover:text-emerald-300 flex items-center justify-between transition-all group shadow-sm"
                      >
                        <span className="truncate">{chip.label}</span>
                        <Send className="w-3 h-3 text-slate-500 group-hover:text-emerald-400 shrink-0 ml-1 transition-colors" />
                      </a>
                    ))}
                  </div>
                </div>

                {/* 7. Detailed Contact Channels with Copy Buttons */}
                <div className="flex flex-col gap-2.5 mt-5">
                  <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 px-1">
                    Direct Credentials
                  </div>

                  {/* Phone Item */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400">
                        <Phone className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Mobile & WhatsApp</p>
                        <a href={`tel:${profile.phone}`} className="text-sm font-bold text-slate-100 hover:text-amber-400 truncate block">
                          {profile.phone}
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(profile.phone.replace(/[^0-9]/g, ''), 'phone')}
                      className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-100 transition-colors"
                      title="Copy Phone Number"
                    >
                      {copiedField === 'phone' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Email Item */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400">
                        <Mail className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Official Email</p>
                        <a href={`mailto:${profile.email}`} className="text-xs sm:text-sm font-bold text-slate-100 hover:text-blue-400 truncate block">
                          {profile.email}
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(profile.email, 'email')}
                      className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-100 transition-colors"
                      title="Copy Email Address"
                    >
                      {copiedField === 'email' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>

                  {/* Office Address */}
                  <div className="flex items-start justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 mt-0.5">
                        <MapPin className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Headquarters & Desk</p>
                        <p className="text-xs text-slate-200 font-medium leading-relaxed mt-0.5">
                          {profile.address}, {profile.city}, {profile.state} - {profile.pincode}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => handleCopy(`${profile.address}, ${profile.city}, ${profile.state} - ${profile.pincode}`, 'address')}
                      className="p-2.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-slate-100 transition-colors mt-0.5"
                      title="Copy Address"
                    >
                      {copiedField === 'address' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* 8. Trust Metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-5">
                  {profile.stats.map((st, i) => (
                    <div key={i} className="p-2.5 rounded-2xl bg-slate-900/80 border border-slate-800 text-center">
                      <p className="text-sm font-black text-amber-400">{st.value}</p>
                      <p className="text-[10px] text-slate-400 font-semibold">{st.label}</p>
                    </div>
                  ))}
                </div>

                {/* 9. Services & Specializations */}
                <div className="mt-5 p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80">
                  <div className="flex items-center gap-2 mb-3">
                    <Compass className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">
                      Signature Services
                    </span>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {profile.services.map((service, index) => (
                      <div key={index} className="flex items-center gap-2.5 text-xs text-slate-300 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 shadow-sm" />
                        <span>{service}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 10. Explore Shrawello Packages CTA */}
                <div className="mt-5">
                  <Link
                    to="/packages"
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 hover:from-slate-800 hover:to-slate-700 border border-amber-500/30 text-white font-bold text-xs flex items-center justify-between transition-all group shadow-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
                        <Plane className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <p className="text-xs font-bold text-white">Explore Holiday Packages</p>
                        <p className="text-[10px] text-slate-400 font-normal">View trending domestic & international tours</p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                  </Link>
                </div>

              </div>

              {/* Bottom Card Footer */}
              <div className="bg-[#050a07] px-6 py-3.5 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                <span>© {new Date().getFullYear()} Shrawello Travel Hub</span>
                <Link to="/" className="text-amber-400 hover:underline flex items-center gap-1 font-bold">
                  shrawello.com <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </div>

            {/* ── RIGHT (Desktop Companion Panel: QR Studio + Share Tools) ── */}
            <div className="w-full max-w-md flex flex-col gap-5">
              
              {/* Quick Scan QR Box */}
              <div className="p-6 rounded-[2rem] bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-amber-500/20 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center">
                <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
                  <QrCode className="w-3.5 h-3.5" />
                  Instant Scan QR
                </div>
                <h3 className="text-lg font-bold text-white">Scan with any Phone Camera</h3>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Scan this QR code to instantly open {profile.firstName}'s Digital Card or save contact details.
                </p>

                {/* QR Display */}
                <div className="relative p-4 bg-white rounded-2xl shadow-xl border-2 border-amber-400/40 my-4 group">
                  <img
                    src={qrImageUrl}
                    alt={`${profile.name} QR Code`}
                    className="w-48 h-48 object-contain rounded-lg"
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div className="w-10 h-10 bg-[#070D09] rounded-xl border-2 border-amber-400 flex items-center justify-center shadow-2xl">
                      <span className="text-amber-400 font-black text-[11px] tracking-tight">{profile.initials}</span>
                    </div>
                  </div>
                </div>

                {/* Download Actions */}
                <div className="grid grid-cols-2 gap-2.5 w-full">
                  <button
                    onClick={handleDownloadQr}
                    className="py-3 px-3 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 active:scale-95 transition-all"
                  >
                    <Download className="w-4 h-4" />
                    Download PNG
                  </button>
                  <button
                    onClick={() => handleCopy(cardUrl, 'link')}
                    className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                  >
                    {copiedField === 'link' ? (
                      <>
                        <Check className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied Link</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Founder Verified Highlights */}
              <div className="p-6 rounded-[2rem] bg-slate-900/80 border border-slate-800 backdrop-blur-xl">
                <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider mb-3">
                  <Award className="w-4 h-4" />
                  Direct Founder Desk
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Connect directly with {profile.firstName} for VIP concierge, customized international travel itineraries, and enterprise corporate retreat packages.
                </p>
                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                    <HeartHandshake className="w-4 h-4" /> 100% Satisfaction Assured
                  </span>
                  <span className="text-amber-400 font-bold">Shrawello Hub</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 2: QR CODE STUDIO (High-Res QR & Print Generator)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'qr' && (
          <div className="w-full max-w-xl flex flex-col items-center animate-fade-in pb-20">
            <div className="w-full p-6 sm:p-8 rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-2xl border border-amber-500/30 shadow-2xl shadow-black/80 flex flex-col items-center text-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider mb-3">
                <QrCode className="w-3.5 h-3.5" />
                High-Resolution QR Studio
              </div>

              <h2 className="text-2xl font-bold text-white">{profile.name}'s Official QR Code</h2>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Scan with any smartphone camera to view {profile.firstName}'s digital card or save contact directly.
              </p>

              {/* QR Mode Switcher */}
              <div className="grid grid-cols-2 gap-2 w-full max-w-xs p-1.5 bg-slate-950 rounded-2xl border border-slate-800 my-6">
                <button
                  onClick={() => setQrType('web')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    qrType === 'web'
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  🌐 Smart Web Profile
                </button>
                <button
                  onClick={() => setQrType('vcard')}
                  className={`py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
                    qrType === 'vcard'
                      ? 'bg-amber-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  📇 Direct Offline vCard
                </button>
              </div>

              {/* QR Code Presentation Frame */}
              <div className="relative p-6 bg-white rounded-3xl shadow-2xl shadow-amber-500/10 border-4 border-amber-500/40 my-2 group">
                <img
                  src={qrImageUrl}
                  alt={`${profile.name} QR Code`}
                  className="w-64 h-64 object-contain rounded-xl"
                />
                
                {/* Centered Shrawello Monogram Badge Overlay */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-12 h-12 bg-[#070D09] rounded-2xl border-2 border-amber-400 flex items-center justify-center shadow-2xl">
                    <span className="text-amber-400 font-black text-xs tracking-tight">{profile.initials}</span>
                  </div>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-4 font-medium max-w-sm">
                {qrType === 'web'
                  ? '✨ Recommended: Scans to this full interactive card with WhatsApp, Call & Packages.'
                  : '⚡ Scans directly into phone address book without requiring internet access.'}
              </p>

              {/* Action Buttons for QR */}
              <div className="grid grid-cols-2 gap-3 w-full mt-6">
                <button
                  onClick={handleDownloadQr}
                  className="py-3.5 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 active:scale-95 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Download High-Res PNG
                </button>
                <button
                  onClick={() => handleCopy(qrImageUrl, 'qrUrl')}
                  className="py-3.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 font-bold text-xs flex items-center justify-center gap-2 active:scale-95 transition-all"
                >
                  {copiedField === 'qrUrl' ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span className="text-emerald-400">Copied Image Link</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy QR Link</span>
                    </>
                  )}
                </button>
              </div>

              {/* Instructions Callout */}
              <div className="w-full mt-6 p-4 rounded-2xl bg-slate-950/80 border border-slate-800 text-left text-xs text-slate-300">
                <p className="font-bold text-amber-400 mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> Recommended Usage:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-400">
                  <li>Print on physical business cards, brochures, or trade-show booths.</li>
                  <li>Set as your phone's lock screen wallpaper for instant contact sharing.</li>
                  <li>Add to your email signatures and WhatsApp Business catalog.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            TAB 3: PHYSICAL CARD MOCKUP (Front & Back Preview)
        ───────────────────────────────────────────────────────────── */}
        {activeTab === 'mockup' && (
          <div className="w-full max-w-xl flex flex-col items-center animate-fade-in pb-20">
            <div className="w-full p-6 sm:p-8 rounded-[2.5rem] bg-gradient-to-b from-slate-900/95 to-slate-950/95 backdrop-blur-2xl border border-amber-500/30 shadow-2xl shadow-black/80 flex flex-col items-center">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">
                <Printer className="w-3.5 h-3.5" />
                Physical Visiting Card Preview
              </div>

              <p className="text-xs text-slate-400 text-center mb-6 max-w-sm">
                Luxury matte black finish with metallic gold foil accents & smart QR back.
              </p>

              {/* Toggle Front / Back View */}
              <div className="flex items-center justify-center gap-2 mb-5">
                <button
                  onClick={() => setCardFlip(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    !cardFlip ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Front Side
                </button>
                <button
                  onClick={() => setCardFlip(true)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    cardFlip ? 'bg-amber-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  Back Side (with QR)
                </button>
              </div>

              {/* Physical Card Visual Mockup */}
              <div className="w-full aspect-[1.75/1] rounded-3xl bg-gradient-to-br from-neutral-900 via-[#0a0f0c] to-neutral-950 p-6 sm:p-8 shadow-2xl border-2 border-amber-500/40 relative overflow-hidden flex flex-col justify-between transition-all duration-500">
                {/* Gold foil edge gradient */}
                <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-400 to-transparent" />
                <div className="absolute inset-0 bg-[radial-gradient(#ffffff05_1px,transparent_1px)] [background-size:16px_16px]" />

                {!cardFlip ? (
                  /* FRONT OF VISITING CARD */
                  <div className="relative z-10 h-full flex flex-col justify-between">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-xs sm:text-sm tracking-[0.25em] font-black uppercase text-amber-400 drop-shadow">
                          SHRAWELLO
                        </span>
                        <p className="text-[9px] tracking-widest text-slate-400 uppercase font-semibold">
                          TRAVEL HUB
                        </p>
                      </div>
                      <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 text-xs font-black">
                        {profile.initials}
                      </div>
                    </div>

                    <div className="my-auto">
                      <h3 className="text-xl sm:text-2xl font-bold text-white tracking-wide">{profile.name}</h3>
                      <p className="text-xs font-bold text-amber-400/90 tracking-wide uppercase">
                        {profile.title}
                      </p>
                    </div>

                    <div className="text-[10px] text-slate-300 space-y-0.5 border-t border-neutral-800/80 pt-2.5 flex justify-between items-end">
                      <div>
                        <p className="font-bold text-slate-100">{profile.phone}</p>
                        <p className="text-slate-400 font-medium">{profile.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-amber-400 font-bold">www.shrawello.com</p>
                        <p className="text-slate-400 font-medium">Pune, Maharashtra</p>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* BACK OF VISITING CARD */
                  <div className="relative z-10 h-full flex items-center justify-between gap-6">
                    <div className="flex flex-col justify-center max-w-[55%]">
                      <span className="text-[10px] tracking-widest font-black uppercase text-amber-400">
                        SCAN TO CONNECT
                      </span>
                      <p className="text-[9px] sm:text-xs text-slate-400 mt-1.5 leading-relaxed">
                        Scan with your phone camera to save {profile.firstName}'s contact, chat on WhatsApp, or book custom tour packages.
                      </p>
                      <div className="mt-3 text-[9px] text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Official Shrawello Smart Card
                      </div>
                    </div>

                    <div className="p-2.5 bg-white rounded-2xl shadow-xl border border-amber-400/40 shrink-0">
                      <img
                        src={getQrCodeImageUrl(cardUrl, 220)}
                        alt="QR Mockup"
                        className="w-24 h-24 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Print Info */}
              <p className="text-xs text-slate-400 mt-5 text-center">
                Standard Business Card Size: 3.5" × 2" (88.9mm × 50.8mm). Recommended paper: 350+ GSM Velvet Matte with Spot UV / Gold Foil.
              </p>
            </div>
          </div>
        )}

      </div>

      {/* ─────────────────────────────────────────────────────────────
          STICKY BOTTOM MOBILE QUICK ACTION BAR (Visible on mobile screens)
      ───────────────────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 p-3 bg-[#070D09]/90 backdrop-blur-xl border-t border-slate-800/80 flex items-center justify-center gap-2.5 shadow-2xl">
        <button
          onClick={handleSaveContact}
          className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-600/30 active:scale-95 transition-all"
        >
          {isSaved ? <Check className="w-4 h-4 stroke-[3]" /> : <UserPlus className="w-4 h-4" />}
          <span>{isSaved ? 'Saved!' : 'Save Contact'}</span>
        </button>

        <a
          href={getWhatsAppLink(profile.whatsapp, undefined, profile.name)}
          target="_blank"
          rel="noopener noreferrer"
          className="py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
        >
          <MessageCircle className="w-4 h-4" />
          <span>WhatsApp</span>
        </a>

        <a
          href={`tel:${profile.phone}`}
          className="p-3 rounded-xl bg-slate-800 text-slate-200 hover:text-white border border-slate-700 active:scale-95 transition-all"
          title={`Call ${profile.firstName}`}
        >
          <Phone className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

export default DigitalCard;
