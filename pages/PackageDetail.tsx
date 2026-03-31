import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Lead } from '../types';
import { SEO } from '../components/ui/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { toast } from '../components/ui/Toast';
import { TravelerSelector } from '../components/ui/TravelerSelector';
import { PhoneInput } from '../components/ui/PhoneInput';

export const PackageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { packages, addLead } = useData();

  const [guests, setGuests] = useState('2 Adults');
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    isWhatsappSame: true,
    whatsapp: '',
    date: ''
  });

  // Customization State
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);

  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [carouselAnimating, setCarouselAnimating] = useState(false);

  // Urgency State
  const [viewers, setViewers] = useState(12);
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });

  const tour = packages.find(p => p.id === id);
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // Simulate viewer count fluctuation
    const interval = setInterval(() => {
      setViewers(prev => {
        const change = Math.random() > 0.5 ? 1 : -1;
        return Math.max(5, Math.min(30, prev + change));
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-advance carousel
  useEffect(() => {
    if (!tour || tour.gallery.length <= 1) return;
    const autoPlay = setInterval(() => {
      goCarousel('right');
    }, 4500);
    return () => clearInterval(autoPlay);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, carouselIndex]);

  const goCarousel = (dir: 'left' | 'right') => {
    if (carouselAnimating || !tour) return;
    setCarouselAnimating(true);
    setTimeout(() => {
      setCarouselIndex(prev =>
        dir === 'right'
          ? (prev + 1) % tour.gallery.length
          : (prev - 1 + tour.gallery.length) % tour.gallery.length
      );
      setCarouselAnimating(false);
    }, 350);
  };

  const goCarouselTo = (idx: number) => {
    if (carouselAnimating || !tour || idx === carouselIndex) return;
    setCarouselAnimating(true);
    setTimeout(() => {
      setCarouselIndex(idx);
      setCarouselAnimating(false);
    }, 350);
  };

  useEffect(() => {
    if (!tour?.offerEndTime) return;

    const calculateTimeLeft = () => {
      const difference = +new Date(tour.offerEndTime!) - +new Date();
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft()); // Initial call
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(timer);
  }, [tour]);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [id]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isLightboxOpen) return;
      if (e.key === 'Escape') setIsLightboxOpen(false);
      if (e.key === 'ArrowRight') setCurrentImageIndex(prev => (prev + 1) % (tour?.gallery.length || 1));
      if (e.key === 'ArrowLeft') setCurrentImageIndex(prev => (prev - 1 + (tour?.gallery.length || 1)) % (tour?.gallery.length || 1));
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, tour]);

  if (!tour) {
    return (
      <>
        <SEO title="Package Not Found" description="The requested tour package could not be found." />
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-slate-50 dark:bg-[#0B1116] text-center">
          <div className="size-24 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-6">
            <span className="material-symbols-outlined text-5xl text-slate-400">wrong_location</span>
          </div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">Package Not Found</h1>
          <p className="text-slate-500 mb-8 max-w-md">The itinerary you are looking for might have been removed or updated.</p>
          <Link to="/packages" className="px-8 py-3 bg-primary text-white font-bold rounded-xl shadow-lg hover:bg-primary-dark transition-all">Browse All Packages</Link>
        </div>
      </>
    );
  }

  // --- Logic ---

  const addonsList = [
    { id: 'flight', label: 'Include Flights', price: 15000 },
    { id: 'visa', label: 'Visa Assistance', price: 5000 },
    { id: 'insurance', label: 'Travel Insurance', price: 2000 },
    { id: 'photo', label: 'Pro Photography', price: 8000 }
  ];

  const toggleAddon = (id: string) => {
    if (selectedAddons.includes(id)) {
      setSelectedAddons(selectedAddons.filter(a => a !== id));
    } else {
      setSelectedAddons([...selectedAddons, id]);
    }
  };

  const getGuestMultiplier = () => {
    const adultsMatch = guests.match(/(\d+)\s*Adults?/i);
    const childrenMatch = guests.match(/(\d+)\s*Child(ren)?/i);

    const adults = adultsMatch ? parseInt(adultsMatch[1]) : 2;
    const children = childrenMatch ? parseInt(childrenMatch[1]) : 0;

    const totalPeople = adults + children;

    if (totalPeople === 1) return 1.2; // Single supplement
    return (adults * 1) + (children * 0.5);
  };

  const calculateTotal = () => {
    const baseTotal = tour.price * getGuestMultiplier();
    const addonsTotal = selectedAddons.reduce((acc, curr) => {
      const addon = addonsList.find(a => a.id === curr);
      return acc + (addon ? addon.price : 0);
    }, 0);
    return Math.round(baseTotal + addonsTotal);
  };

  const confirmBooking = (e: React.FormEvent) => {
    e.preventDefault();

    const addonNames = selectedAddons.map(id => addonsList.find(a => a.id === id)?.label).join(', ');
    const preferenceString = `Interested in ${tour.title}. Date: ${bookingData.date}. Add-ons: ${addonNames || 'None'}. Guests: ${guests}. Estimated Quote: ₹${calculateTotal().toLocaleString()}`;

    const referenceId = `LD-${Date.now()}`;
    const newLead: Lead = {
      id: referenceId,
      name: bookingData.name,
      email: bookingData.email,
      phone: bookingData.phone,
      whatsapp: bookingData.isWhatsappSame ? bookingData.phone : bookingData.whatsapp,
      isWhatsappSame: bookingData.isWhatsappSame,
      destination: tour.title,
      startDate: bookingData.date,
      type: 'Tour Package',
      status: 'New',
      priority: 'High',
      potentialValue: calculateTotal(),
      addedOn: new Date().toISOString(),
      travelers: guests,
      budget: `~ ₹${calculateTotal()}`,
      source: 'Website',
      preferences: preferenceString,
      avatarColor: 'bg-green-100 text-green-600',
      logs: [
        { id: `log-${Date.now()}`, type: 'System', content: `Inquiry submitted for ${tour.title} with options: ${addonNames}`, timestamp: new Date().toISOString() }
      ]
    };

    addLead(newLead);
    setBookingModal(false);

    // Navigate to confirmation page with booking details
    navigate('/booking-confirmation', {
      state: {
        referenceId,
        customerName: bookingData.name,
        packageTitle: tour.title,
        date: bookingData.date,
        guests,
        email: bookingData.email,
        phone: bookingData.phone,
        estimatedTotal: calculateTotal()
      }
    });
  };

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setIsLightboxOpen(true);
  };

  return (
    <>
      <SEO
        title={tour.title}
        description={tour.overview || tour.description}
        image={tour.image}
      />

      <div className="bg-white dark:bg-[#0B1116] min-h-screen pb-40 md:pb-20 relative pt-24 md:pt-28">

        {/* Lightbox Modal */}
        {isLightboxOpen && (
          <div className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-300 touch-none" onClick={() => setIsLightboxOpen(false)}>
            <button onClick={() => setIsLightboxOpen(false)} className="absolute top-4 right-4 md:top-8 md:right-8 p-3 text-white/70 hover:text-white transition-colors bg-white/10 hover:bg-white/20 rounded-full z-50">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev - 1 + tour.gallery.length) % tour.gallery.length); }}
              className="absolute left-4 md:left-8 p-3 md:p-5 text-white/70 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full z-40 backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-3xl">arrow_back</span>
            </button>

            <OptimizedImage
              src={tour.gallery[currentImageIndex]}
              alt={`Gallery ${currentImageIndex + 1}`}
              className="max-h-[85vh] max-w-[95vw] md:max-w-[85vw] rounded-lg shadow-2xl select-none animate-in zoom-in-95 duration-300"
              onClick={(e) => e.stopPropagation()}
            />

            <button
              onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(prev => (prev + 1) % tour.gallery.length); }}
              className="absolute right-4 md:right-8 p-3 md:p-5 text-white/70 hover:text-white transition-colors bg-white/5 hover:bg-white/10 rounded-full z-40 backdrop-blur-sm"
            >
              <span className="material-symbols-outlined text-3xl">arrow_forward</span>
            </button>

            <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 z-40 px-4 py-2 bg-black/20 backdrop-blur-md rounded-full">
              {tour.gallery.map((_, idx) => (
                <button
                  key={idx}
                  onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(idx); }}
                  className={`size-2 rounded-full transition-all duration-300 ${idx === currentImageIndex ? 'bg-white w-6' : 'bg-white/40 hover:bg-white/70'}`}
                />
              ))}
            </div>
          </div>
        )}

        {/* Booking Modal */}
        {bookingModal && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#1A2633] w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 ring-1 ring-white/10">
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Secure Your Spot</h3>
                <button onClick={() => setBookingModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={confirmBooking} className="space-y-5">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Full Name</label>
                  <input required type="text" className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="John Doe" value={bookingData.name} onChange={e => setBookingData({ ...bookingData, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Email</label>
                  <input required type="email" className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all" placeholder="john@example.com" value={bookingData.email} onChange={e => setBookingData({ ...bookingData, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Mobile Number</label>
                  <PhoneInput
                    value={bookingData.phone}
                    onChange={(value) => setBookingData({ ...bookingData, phone: value })}
                    placeholder="98765 43210"
                    required
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 pl-1">
                    <input
                      type="checkbox"
                      id="isWhatsappSamePackage"
                      checked={bookingData.isWhatsappSame}
                      onChange={e => setBookingData({ ...bookingData, isWhatsappSame: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label htmlFor="isWhatsappSamePackage" className="text-xs font-bold uppercase text-slate-500 cursor-pointer select-none">
                      Same as WhatsApp Number
                    </label>
                  </div>

                  {!bookingData.isWhatsappSame && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                      <label className="block text-xs font-bold uppercase text-slate-500 pl-1">WhatsApp Number</label>
                      <PhoneInput
                        value={bookingData.whatsapp}
                        onChange={(value) => setBookingData({ ...bookingData, whatsapp: value })}
                        placeholder="98765 43210"
                        required={!bookingData.isWhatsappSame}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Travel Date</label>
                  <input required type="date" min={today} className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all" value={bookingData.date} onChange={e => setBookingData({ ...bookingData, date: e.target.value })} />
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 mt-2">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                    <span>Estimated Total</span>
                    <span className="text-lg">₹{calculateTotal().toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium opacity-80">Based on {guests} and {selectedAddons.length} add-ons.</p>
                  <p className="text-[10px] text-green-600 dark:text-green-400 mt-2 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    All taxes & GST included • No hidden charges
                  </p>
                </div>

                {/* Cancellation Policy */}
                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl mt-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-2">
                    <span className="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0">info</span>
                    <span><strong>Free cancellation</strong> up to 7 days before travel. 50% refund for 3-7 days. Non-refundable within 3 days.</span>
                  </p>
                </div>

                <button type="submit" className="w-full bg-primary text-white py-4 rounded-xl font-bold shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 mt-4">Send Request</button>
              </form>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-[1440px] mx-auto px-4 md:px-8">

          {/* Header Block */}
          <div className="flex flex-col xl:flex-row gap-8 mb-10">
            <div className="flex-1">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400 mb-4">
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                <span className="material-symbols-outlined text-[12px] opacity-50">arrow_forward_ios</span>
                <Link to="/packages" className="hover:text-primary transition-colors">Packages</Link>
                <span className="material-symbols-outlined text-[12px] opacity-50">arrow_forward_ios</span>
                <span className="text-slate-900 dark:text-white">{tour.title}</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-slate-900 dark:text-white mb-6 tracking-tight leading-[1.1]">{tour.title}</h1>
              <div className="flex flex-wrap items-center gap-4 md:gap-8">
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-full">
                  <span className="material-symbols-outlined text-primary">location_on</span>
                  {tour.location}
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-full">
                  <span className="material-symbols-outlined text-primary">calendar_month</span>
                  {tour.days} Days / {tour.days - 1} Nights
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-full">
                  <span className="material-symbols-outlined text-primary">calendar_month</span>
                  {tour.days} Days / {tour.days - 1} Nights
                </div>

                {/* High Demand Badge */}
                {viewers > 8 && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 rounded-full text-xs font-bold border border-orange-200 dark:border-orange-900/50 animate-in zoom-in-50 duration-300">
                    <span className="material-symbols-outlined text-[14px]">trending_up</span>
                    High Demand
                  </div>
                )}
              </div>

              {/* Urgency Badge (Viewers) */}
              <div className="flex items-center gap-2 mt-6 text-red-500 dark:text-red-400 font-bold text-sm animate-pulse">
                <span className="material-symbols-outlined text-lg">visibility</span>
                {viewers} people are viewing this package right now
              </div>
            </div>
          </div>

          {/* === PREMIUM IMAGE GALLERY === */}
          <div className="mb-16">
            {tour.gallery.length === 0 ? (
              /* Empty state */
              <div className="w-full rounded-[2rem] bg-slate-100 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 dark:border-slate-700" style={{ height: '480px' }}>
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">image_not_supported</span>
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No photos available yet</p>
              </div>
            ) : tour.gallery.length === 1 ? (
              /* Single image — full hero */
              <div
                className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl shadow-slate-300/40 dark:shadow-black/50 cursor-pointer group"
                style={{ height: '520px' }}
                onClick={() => openLightbox(0)}
              >
                <OptimizedImage src={tour.gallery[0]} alt={tour.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
                <div className="absolute bottom-5 right-5 px-4 py-2 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <span className="material-symbols-outlined text-[14px]">open_in_full</span> View Full Screen
                </div>
              </div>
            ) : (
              /* Multi-image: Hero + Grid layout */
              <div className="flex flex-col md:flex-row gap-2 md:gap-3" style={{ height: 'auto', minHeight: '460px' }}>

                {/* Main hero image — left, 60% width */}
                <div
                  className="relative flex-[3] rounded-[1.5rem] md:rounded-[2rem] overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-900 cursor-pointer group"
                  style={{ minHeight: '300px', maxHeight: '520px' }}
                  onClick={() => openLightbox(carouselIndex)}
                >
                  <div
                    className="absolute inset-0 transition-opacity duration-350"
                    style={{ opacity: carouselAnimating ? 0 : 1, transition: 'opacity 0.4s ease' }}
                  >
                    <OptimizedImage
                      src={tour.gallery[carouselIndex]}
                      alt={`${tour.title} — ${carouselIndex + 1}`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
                    />
                  </div>

                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-black/5 to-transparent pointer-events-none" />

                  {/* Image counter pill */}
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/45 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
                    <span className="material-symbols-outlined text-[14px]">photo_library</span>
                    {carouselIndex + 1} / {tour.gallery.length}
                  </div>

                  {/* Expand button */}
                  <div className="absolute top-4 right-4 px-3 py-1.5 bg-black/45 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-lg opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0">
                    <span className="material-symbols-outlined text-[14px]">open_in_full</span>
                    View Full
                  </div>

                  {/* Prev / Next arrows */}
                  <button
                    onClick={(e) => { e.stopPropagation(); goCarousel('left'); }}
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/15 hover:bg-white/35 backdrop-blur-md rounded-full text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
                    aria-label="Previous"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_back_ios_new</span>
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); goCarousel('right'); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center bg-white/15 hover:bg-white/35 backdrop-blur-md rounded-full text-white border border-white/20 opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110 active:scale-95 shadow-lg"
                    aria-label="Next"
                  >
                    <span className="material-symbols-outlined text-lg">arrow_forward_ios</span>
                  </button>

                  {/* Dot indicators */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full">
                    {tour.gallery.slice(0, 8).map((_, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => { e.stopPropagation(); goCarouselTo(idx); }}
                        className={`rounded-full transition-all duration-300 ${
                          idx === carouselIndex ? 'bg-white w-5 h-1.5' : 'bg-white/45 hover:bg-white/75 w-1.5 h-1.5'
                        }`}
                        aria-label={`Go to image ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Right: 2×2 thumbnail grid — 40% width, desktop only */}
                <div className="hidden md:flex flex-[2] flex-col gap-3">
                  {[0, 1, 2, 3].map((gridPos) => {
                    // Show the 4 images that are NOT the current main image
                    const skipIdx = carouselIndex;
                    const otherImages = tour.gallery.filter((_, i) => i !== skipIdx);
                    const imgSrc = otherImages[gridPos];
                    const realIdx = imgSrc ? tour.gallery.indexOf(imgSrc) : -1;
                    const isLast = gridPos === 3 && tour.gallery.length > 5;

                    if (!imgSrc) return null;

                    return (
                      <div
                        key={gridPos}
                        className="relative flex-1 rounded-[1.2rem] overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer group/thumb shadow-md"
                        style={{ minHeight: '100px' }}
                        onClick={() => isLast ? openLightbox(realIdx) : goCarouselTo(realIdx)}
                      >
                        <OptimizedImage
                          src={imgSrc}
                          alt={`Gallery ${gridPos + 1}`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover/thumb:scale-[1.06]"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover/thumb:bg-black/25 transition-all duration-300 rounded-[1.2rem]" />

                        {/* "See All Photos" overlay on last cell */}
                        {isLast && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/55 backdrop-blur-[2px] rounded-[1.2rem]">
                            <span className="material-symbols-outlined text-white text-3xl mb-1">photo_library</span>
                            <span className="text-white font-black text-sm">+{tour.gallery.length - 5} Photos</span>
                            <span className="text-white/70 text-[10px] font-semibold mt-0.5">See All</span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Thumbnail strip — only on mobile, when more than 1 image */}
            {tour.gallery.length > 1 && (
              <div className="mt-3 flex md:hidden gap-2.5 overflow-x-auto pb-1 scroll-smooth" style={{ scrollbarWidth: 'none' }}>
                {tour.gallery.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => goCarouselTo(idx)}
                    className={`flex-shrink-0 relative rounded-xl overflow-hidden transition-all duration-300 ${
                      idx === carouselIndex
                        ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-[#0B1116] opacity-100 scale-105 shadow-lg'
                        : 'opacity-55 hover:opacity-90'
                    }`}
                    style={{ width: '72px', height: '52px' }}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <OptimizedImage src={img} alt={`Thumb ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 lg:gap-20">

            {/* Left Column: Details */}
            <div className="space-y-16">

              {/* Overview */}
              <section className="animate-in slide-in-from-bottom-8 duration-700">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-6">Experience</h2>
                <p className="text-lg text-slate-600 dark:text-slate-300 leading-relaxed font-medium">
                  {tour.overview}
                </p>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-10">
                  {tour.highlights.map((item: any, idx: number) => (
                    <div key={idx} className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col items-center text-center gap-3 border border-slate-100 dark:border-slate-800 transition-all hover:-translate-y-1 hover:shadow-lg">
                      <div className="size-12 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary">
                        <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                      </div>
                      <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200">{item.label}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Itinerary */}
              <section className="animate-in slide-in-from-bottom-8 duration-700 delay-100">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-10">Itinerary</h2>
                <div className="relative">
                  {/* Dashed Line */}
                  <div className="absolute left-[19px] top-6 bottom-6 w-0.5 border-l-2 border-dashed border-slate-300 dark:border-slate-700"></div>

                  {tour.itinerary.map((item: any, idx: number) => (
                    <div key={idx} className="relative pl-16 pb-12 last:pb-0 group">
                      {/* Marker */}
                      <div className={`absolute left-0 top-0 size-10 rounded-full flex items-center justify-center font-black text-sm border-4 border-white dark:border-[#0B1116] z-10 transition-colors ${idx === 0 ? 'bg-primary text-white shadow-lg shadow-primary/30' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 group-hover:bg-primary group-hover:text-white'}`}>
                        {item.day}
                      </div>

                      <div className="p-6 rounded-3xl bg-white dark:bg-[#151d29] border border-slate-100 dark:border-slate-800 shadow-sm transition-all group-hover:shadow-xl group-hover:-translate-y-1">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">{item.title}</h3>
                        <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Included / Excluded */}
              <section className="grid md:grid-cols-2 gap-8 animate-in slide-in-from-bottom-8 duration-700 delay-200">
                <div className="bg-green-50/50 dark:bg-green-900/5 p-8 rounded-3xl border border-green-100 dark:border-green-900/20">
                  <h3 className="text-lg font-black text-green-800 dark:text-green-400 mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined bg-green-200 dark:bg-green-900/40 p-1.5 rounded-lg">check</span>
                    Included
                  </h3>
                  <ul className="space-y-4">
                    {(tour.included || ['Premium accommodation', 'Daily breakfast & dinner', 'Private transfers', 'Entry tickets', 'Expert guide']).map((inc, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm font-semibold">
                        <div className="size-1.5 rounded-full bg-green-500 mt-2 shrink-0"></div> {inc}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50/50 dark:bg-red-900/5 p-8 rounded-3xl border border-red-100 dark:border-red-900/20">
                  <h3 className="text-lg font-black text-red-800 dark:text-red-400 mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined bg-red-200 dark:bg-red-900/40 p-1.5 rounded-lg">close</span>
                    Not Included
                  </h3>
                  <ul className="space-y-4">
                    {(tour.notIncluded || ['Airfare (International)', 'Personal expenses', 'Camera fees', 'Optional activities', 'Insurance']).map((exc, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-300 text-sm font-semibold">
                        <div className="size-1.5 rounded-full bg-red-400 mt-2 shrink-0"></div> {exc}
                      </li>
                    ))}
                  </ul>
                </div>
              </section>
            </div>

            {/* Right Column: Sticky Booking Widget */}
            <div className="hidden lg:block">
              <div className="sticky top-32 space-y-6 animate-in fade-in slide-in-from-right-8 duration-700">
                <div className="bg-white dark:bg-[#151d29] rounded-[2.5rem] shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-800 overflow-hidden ring-1 ring-slate-900/5">
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Starting From</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">₹{calculateTotal().toLocaleString()}</span>
                      <span className="text-sm font-bold text-slate-500">/ person</span>
                    </div>

                    {/* Limited Seats Warning */}
                    {tour.remainingSeats && tour.remainingSeats < 10 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold">
                        <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                        Only {tour.remainingSeats} seats left!
                      </div>
                    )}

                    {/* Countdown Timer */}
                    {tour.offerEndTime && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/10">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Special Offer Ends In</p>
                        <div className="flex gap-2 text-center">
                          {['Days', 'Hours', 'Mins', 'Secs'].map((label, i) => {
                            let val = 0;
                            if (label === 'Days') val = timeLeft.days;
                            if (label === 'Hours') val = timeLeft.hours;
                            if (label === 'Mins') val = timeLeft.minutes;
                            if (label === 'Secs') val = timeLeft.seconds;

                            return (
                              <div key={label} className="flex-1 bg-white dark:bg-slate-900 rounded-lg p-1.5 shadow-sm border border-slate-100 dark:border-slate-800">
                                <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{val}</div>
                                <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{label}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Selectors */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Travelers</label>
                      <div className="relative">
                        <TravelerSelector
                          value={guests}
                          onChange={(val) => setGuests(val)}
                        />
                      </div>
                    </div>

                    {/* Add-ons */}
                    <div>
                      <label className="block text-xs font-black uppercase tracking-widest text-slate-400 mb-3 ml-1">Upgrades</label>
                      <div className="space-y-3">
                        {addonsList.map(addon => (
                          <div
                            key={addon.id}
                            onClick={() => toggleAddon(addon.id)}
                            className={`flex items-center justify-between p-3 rounded-2xl border cursor-pointer transition-all duration-200 ${selectedAddons.includes(addon.id) ? 'bg-primary/5 border-primary shadow-inner' : 'bg-transparent border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`size-5 rounded-md border flex items-center justify-center transition-colors ${selectedAddons.includes(addon.id) ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                {selectedAddons.includes(addon.id) && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                              </div>
                              <span className={`text-sm font-bold ${selectedAddons.includes(addon.id) ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{addon.label}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-500">+₹{(addon.price / 1000).toFixed(0)}k</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => setBookingModal(true)} className="w-full bg-primary hover:bg-primary-dark text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 hover:-translate-y-1 text-lg">
                      Book Now
                    </button>

                    <p className="text-[10px] text-center text-slate-400 font-medium">No payment required today. Free cancellation options available.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-4 z-40 lg:hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] pb-safe-area-bottom">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Price</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">₹{calculateTotal().toLocaleString()}</p>
            </div>
            <button
              onClick={() => setBookingModal(true)}
              className="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all"
            >
              Book Now
            </button>
          </div>
        </div>
      </div >
    </>
  );
};