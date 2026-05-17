import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Lead } from '../types';
import { SEO } from '../components/ui/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { toast } from '../components/ui/Toast';
import { TravelerSelector } from '../components/ui/TravelerSelector';
import { PhoneInput } from '../components/ui/PhoneInput';
import { getLocationName, formatPrice, formatPriceCompact } from '../utils/packageUtils';
import { api } from '../src/lib/api';

export const PackageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { packages, masterLocations, addLead, updatePackage } = useData();

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

  // Offer countdown
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [offerExpired, setOfferExpired] = useState(false);

  const tour = packages.find(p => p.id === id);

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
        setOfferExpired(false);
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60),
        };
      }
      setOfferExpired(true);
      return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    };

    setTimeLeft(calculateTimeLeft());
    const timer = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
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
    if (!packages || packages.length === 0) {
      // Loading state when context is still fetching packages
      return (
        <div className="min-h-screen pt-28 pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4"></div>
          <div className="h-12 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-8"></div>
          <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800 rounded-[2rem] animate-pulse"></div>
        </div>
      );
    }

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

  // --- JSON-LD Structured Data ---
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "name": tour.title,
    "description": tour.overview || tour.description,
    "image": tour.gallery?.[0] || tour.image,
    "offers": {
      "@type": "Offer",
      "price": tour.price,
      "priceCurrency": "INR",
      "availability": (tour.remainingSeats ?? 10) > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut"
    },
    "itinerary": tour.itinerary?.map(day => ({
      "@type": "ListItem",
      "position": day.day,
      "item": {
        "@type": "TouristAttraction",
        "name": day.title,
        "description": day.desc
      }
    }))
  };

  // --- Logic ---

  // Use per-package addons if configured, fall back to sensible defaults
  const DEFAULT_ADDONS = [
    { id: 'flight', label: 'Include Flights', price: 15000 },
    { id: 'visa', label: 'Visa Assistance', price: 5000 },
    { id: 'insurance', label: 'Travel Insurance', price: 2000 },
    { id: 'photo', label: 'Pro Photography', price: 8000 }
  ];
  const addonsList = (tour.addons && tour.addons.length > 0) ? tour.addons : DEFAULT_ADDONS;

  const toggleAddon = (id: string) => {
    if (selectedAddons.includes(id)) {
      setSelectedAddons(selectedAddons.filter(a => a !== id));
    } else {
      setSelectedAddons([...selectedAddons, id]);
    }
  };

  const getGuestMultiplier = () => {
    if (tour?.pricingMode === 'group') return 1;

    const adultsMatch = guests.match(/(\d+)\s*Adults?/i);
    const childrenMatch = guests.match(/(\d+)\s*Child(ren)?/i);

    const adults = adultsMatch ? parseInt(adultsMatch[1]) : 2;
    const children = childrenMatch ? parseInt(childrenMatch[1]) : 0;
    // Infants are usually free, so they don't add to multiplier

    const totalPeople = adults + children;

    if (totalPeople === 1) return 1.2; // Single supplement
    return (adults * 1) + (children * 0.5);
  };

  const calculateTotal = () => {
    const addonsTotal = selectedAddons.reduce((acc, curr) => {
      const addon = addonsList.find(a => a.id === curr);
      return acc + (addon ? addon.price : 0);
    }, 0);
    // Apply guest multiplier so price updates with traveler count
    return Math.round(tour.price * getGuestMultiplier() + addonsTotal);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const addonNames = selectedAddons.map(id => addonsList.find(a => a.id === id)?.label).join(', ');
      const preferenceString = `Interested in ${tour.title}. Date: ${bookingData.date}. Add-ons: ${addonNames || 'None'}. Guests: ${guests}. Estimated Quote: ${formatPrice(calculateTotal())}`;

      const referenceId = `LD-${Date.now()}`;
      const newLead: Partial<Lead> = {
        name: bookingData.name,
        email: bookingData.email,
        phone: bookingData.phone,
        whatsapp: bookingData.isWhatsappSame ? bookingData.phone : bookingData.whatsapp,
        isWhatsappSame: bookingData.isWhatsappSame,
        destination: tour.title,
        startDate: bookingData.date,
        type: 'Tour',
        status: 'New',
        priority: 'High',
        potentialValue: calculateTotal(),
        addedOn: new Date().toISOString(),
        travelers: guests,
        budget: `~ ${formatPrice(calculateTotal())}`,
        source: 'Website',
        preferences: preferenceString,
        avatarColor: 'bg-green-100 text-green-600',
        packageId: tour.id // Link to package
      };

      await addLead(newLead as Lead);

      // Decrement remainingSeats in DB atomically
      if (tour.remainingSeats !== undefined && tour.remainingSeats > 0) {
        await api.decrementSeats(tour.id);
        // Local state update
        updatePackage(tour.id, { remainingSeats: tour.remainingSeats - 1 });
      }

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
    } catch (error) {
      console.error('Booking failed:', error);
      toast.error('Failed to submit booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
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
      
      {/* JSON-LD Script Injection */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

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
                  <input required min={new Date().toISOString().split('T')[0]} type="date" className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all" value={bookingData.date} onChange={e => setBookingData({ ...bookingData, date: e.target.value })} />
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 mt-2">
                  <div className="flex justify-between items-center text-sm font-bold text-slate-900 dark:text-white">
                    <span>Estimated Total</span>
                    <span className="text-lg">{formatPrice(calculateTotal())}</span>
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
                  {getLocationName(tour.location, masterLocations)}
                </div>
                <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-full">
                  <span className="material-symbols-outlined text-primary">calendar_month</span>
                  {tour.days} Days / {tour.builderData?.tripDetails?.nights ?? Math.max(0, tour.days - 1)} Nights
                </div>
                {tour.groupSize && (
                  <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-bold bg-slate-100 dark:bg-slate-800/50 px-4 py-2 rounded-full">
                    <span className="material-symbols-outlined text-primary">group</span>
                    {/^\d+$/.test(String(tour.groupSize)) ? `${tour.groupSize} Guests` : tour.groupSize}
                  </div>
                )}
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
                <div className="hidden md:grid grid-cols-2 grid-rows-2 flex-[2] gap-3" style={{ maxHeight: '520px' }}>
                  {[0, 1, 2, 3].map((gridPos) => {
                    // Use stable index-based approach to avoid URL duplicate bugs
                    const skipIdx = carouselIndex;
                    const otherIndices = tour.gallery
                      .map((_, i) => i)
                      .filter(i => i !== skipIdx);
                    const realIdx = otherIndices[gridPos];
                    const imgSrc = realIdx !== undefined ? tour.gallery[realIdx] : undefined;
                    const isLast = gridPos === 3 && tour.gallery.length > 5;

                    if (!imgSrc) return null;

                    return (
                      <div
                        key={gridPos}
                        className="relative w-full h-full rounded-[1.2rem] overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer group/thumb shadow-md"
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
                  {/* Destination */}
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col items-center text-center gap-3 border border-slate-100 dark:border-slate-800 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className="size-12 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-2xl">pin_drop</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Destination</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{getLocationName(tour.location, masterLocations) || 'Multiple Regions'}</span>
                    </div>
                  </div>

                  {/* Duration */}
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col items-center text-center gap-3 border border-slate-100 dark:border-slate-800 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className="size-12 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-2xl">schedule</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Duration</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tour.days || tour.itinerary?.length || 4} Days</span>
                    </div>
                  </div>

                  {/* Theme */}
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col items-center text-center gap-3 border border-slate-100 dark:border-slate-800 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className="size-12 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-2xl">category</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Theme</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tour.theme || 'Standard'}</span>
                    </div>
                  </div>

                  {/* Tour Type */}
                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl flex flex-col items-center text-center gap-3 border border-slate-100 dark:border-slate-800 transition-all hover:-translate-y-1 hover:shadow-lg">
                    <div className="size-12 rounded-full bg-white dark:bg-slate-700 shadow-sm flex items-center justify-center text-primary">
                      <span className="material-symbols-outlined text-2xl">group</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-1">Tour Type</span>
                      <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{tour.pricingMode === 'group' ? 'Group Trip' : 'Private Custom'}</span>
                    </div>
                  </div>
                </div>
              </section>

              {/* Itinerary */}
              <section className="animate-in slide-in-from-bottom-8 duration-700 delay-100">
                <h2 className="text-3xl font-black text-slate-900 dark:text-white mb-8 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-4xl">map</span>
                  Day-by-Day Itinerary
                </h2>
                
                <div className="space-y-4">
                  {(() => {
                    // Fallback itinerary if empty
                    const defaultItinerary = [
                      { day: 1, title: 'Arrival & Welcome', desc: 'Arrive at the destination. Our representative will meet you and arrange a smooth transfer to your premium accommodation. Evening at leisure to relax and explore the surroundings at your own pace.' },
                      { day: 2, title: 'Guided Sightseeing & Exploration', desc: 'After a delicious breakfast, embark on a comprehensive guided tour. Visit the most iconic landmarks, experience the local culture, and enjoy a curated lunch at a highly-rated local restaurant.' },
                      { day: 3, title: 'Adventure & Leisure', desc: 'A day dedicated to thrilling optional activities or peaceful relaxation. Choose to indulge in water sports, mountain trekking, or simply unwind at the resort spa. The evening concludes with a special gala dinner.' },
                      { day: 4, title: 'Local Markets & Shopping', desc: 'Explore the vibrant local markets for souvenirs, handicrafts, and authentic street food. Enjoy a cultural performance in the evening showcasing the region’s heritage.' },
                      { day: 5, title: 'Departure', desc: 'Check-out after a final hearty breakfast. Our driver will transfer you to the airport/station for your onward journey, carrying wonderful memories.' }
                    ];
                    
                    const itData = tour.itinerary && tour.itinerary.length > 0 
                      ? tour.itinerary 
                      : defaultItinerary.slice(0, tour.days || 4);

                    return itData.map((item: any, idx: number) => {
                      // We'll use a local state for accordion, but since this is inside a render block, 
                      // we can just use the HTML5 details/summary for an elegant native accordion
                      return (
                        <details key={idx} className="group bg-white dark:bg-[#151d29] rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-all hover:shadow-xl open:shadow-md overflow-hidden" open={idx === 0}>
                          <summary className="flex items-center gap-5 p-6 cursor-pointer select-none list-none outline-none [&::-webkit-details-marker]:hidden">
                            <div className="flex-shrink-0 size-14 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-700 flex flex-col items-center justify-center group-open:bg-primary group-open:border-primary transition-colors duration-300">
                              <span className="text-[10px] font-black uppercase text-slate-400 group-open:text-white/70">Day</span>
                              <span className="text-xl font-black text-slate-900 dark:text-white group-open:text-white leading-none mt-0.5">{item.day || idx + 1}</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white group-open:text-primary transition-colors">{item.title}</h3>
                            </div>
                            <div className="flex-shrink-0 size-8 rounded-full bg-slate-50 dark:bg-slate-800 flex items-center justify-center group-open:rotate-180 transition-transform duration-300">
                              <span className="material-symbols-outlined text-slate-400">expand_more</span>
                            </div>
                          </summary>
                          
                          <div className="px-6 pb-8 pt-2 pl-[92px] -mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 relative">
                              <div className="absolute top-0 left-6 w-8 h-[1px] bg-primary/20 -translate-y-px"></div>
                              <p className="text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-line text-[15px] font-medium">
                                {item.desc}
                              </p>
                              
                              {/* Optional visual flourish */}
                              <div className="mt-4 flex items-center gap-3 pt-4 border-t border-slate-200 dark:border-slate-700/50">
                                <span className="material-symbols-outlined text-primary/60 text-[18px]">verified</span>
                                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Premium Experience Included</span>
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    });
                  })()}
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
                    <p className="text-xs font-black uppercase tracking-widest text-slate-400 mb-1">Package Price</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{formatPrice(calculateTotal())}</span>
                      <span className="text-sm font-bold text-slate-500">/ total</span>
                    </div>
                    {tour.originalPrice && tour.originalPrice > tour.price && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">{formatPrice(tour.originalPrice * getGuestMultiplier())}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase tracking-wider">Save {Math.round(((tour.originalPrice - tour.price) / tour.originalPrice) * 100)}%</span>
                      </div>
                    )}

                    {/* Limited Seats Warning */}
                    {tour.remainingSeats && tour.remainingSeats < 10 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold">
                        <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                        Only {tour.remainingSeats} seats left!
                      </div>
                    )}

                    {/* Countdown Timer */}
                    {tour.offerEndTime && !offerExpired && (
                      <div className="mt-4 p-4 bg-gradient-to-r from-primary/10 to-primary/5 rounded-xl border border-primary/10">
                        <p className="text-xs font-bold text-primary uppercase tracking-wider mb-2">Special Offer Ends In</p>
                        <div className="flex gap-2 text-center">
                          {[['Days', timeLeft.days], ['Hours', timeLeft.hours], ['Mins', timeLeft.minutes], ['Secs', timeLeft.seconds]].map(([label, val]) => (
                            <div key={label as string} className="flex-1 bg-white dark:bg-slate-900 rounded-lg p-1.5 shadow-sm border border-slate-100 dark:border-slate-800">
                              <div className="text-lg font-black text-slate-900 dark:text-white leading-none">{val}</div>
                              <div className="text-[9px] font-bold text-slate-400 uppercase mt-1">{label}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {tour.offerEndTime && offerExpired && (
                      <div className="mt-4 p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-center">
                        <p className="text-xs font-bold text-slate-500">Special offer has ended</p>
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
                            <span className="text-xs font-bold text-slate-500">+{formatPriceCompact(addon.price)}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button onClick={() => setBookingModal(true)} className="w-full bg-primary hover:bg-primary-dark text-white font-black py-5 rounded-2xl shadow-xl shadow-primary/30 transition-all active:scale-95 hover:-translate-y-1 text-lg">
                      Book Now
                    </button>

                    <div className="flex gap-2">
                      {/* WhatsApp Share */}
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`Check out this tour: ${tour.title}\n${window.location.href}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 font-bold text-sm hover:bg-green-100 dark:hover:bg-green-900/30 transition-all"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        Share
                      </a>
                      
                      {/* Copy Link */}
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast.success('Link copied to clipboard!');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-700/70 transition-all"
                      >
                        <span className="material-symbols-outlined text-[20px]">link</span>
                        Copy Link
                      </button>
                    </div>

                    <p className="text-[10px] text-center text-slate-400 font-medium">No payment required today. Free cancellation options available.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Related Packages */}
        {(() => {
          const related = packages
            .filter(p =>
              p.id !== tour.id &&
              p.status !== 'Inactive' &&
              ((p.theme && tour.theme && p.theme.toLowerCase() === tour.theme.toLowerCase()) || 
               (p.location && tour.location && p.location.toLowerCase() === tour.location.toLowerCase()))
            )
            .slice(0, 3);
          if (related.length === 0) return null;
          return (
            <div className="max-w-[1440px] mx-auto px-4 md:px-8 pb-16">
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-8">You Might Also Like</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {related.map(p => (
                  <Link
                    key={p.id}
                    to={`/packages/${p.id}`}
                    className="group block bg-white dark:bg-[#151d29] rounded-2xl overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="relative h-48 overflow-hidden">
                      <OptimizedImage src={p.image} alt={p.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute top-3 right-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-2.5 py-1 rounded-full text-xs font-bold text-slate-900 dark:text-white">
                        {p.days} Days
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-bold text-slate-900 dark:text-white mb-1 group-hover:text-primary transition-colors line-clamp-2">{p.title}</h3>
                      <p className="text-xs text-slate-500 mb-3 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">location_on</span>
                        {getLocationName(p.location, masterLocations)}
                      </p>
                      <div className="flex items-center justify-between">
                        <span className="text-lg font-black text-slate-900 dark:text-white">{formatPrice(p.price)}</span>
                        <span className="text-xs font-bold text-primary flex items-center gap-1">View <span className="material-symbols-outlined text-[14px]">arrow_forward</span></span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          );
        })()}

        {/* Mobile Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-4 z-40 lg:hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] pb-safe-area-bottom">
          <div className="flex items-center justify-between max-w-lg mx-auto">
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                Package Price
                {selectedAddons.length > 0 && <span className="px-1 py-[1px] bg-primary/10 text-primary rounded-[3px] text-[8px] leading-none ml-1">+{selectedAddons.length} ADD-ONS</span>}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatPrice(calculateTotal())}</p>
                {tour.originalPrice && tour.originalPrice > tour.price && (
                  <span className="text-xs text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">{formatPriceCompact(tour.originalPrice * getGuestMultiplier())}</span>
                )}
              </div>
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