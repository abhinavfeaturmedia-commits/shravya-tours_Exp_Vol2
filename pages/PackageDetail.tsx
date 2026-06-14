import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { Lead, Package } from '../types';
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
  const { packages, masterLocations, addLead, trendingDestinations } = useData();

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
  const [selectedOccupancy, setSelectedOccupancy] = useState('double');

  // Lightbox State
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [lightboxTouchStart, setLightboxTouchStart] = useState<number | null>(null);
  const [lightboxTouchEnd, setLightboxTouchEnd] = useState<number | null>(null);

  // Carousel/Mobile Scroll State
  const [carouselIndex, setCarouselIndex] = useState(0);
  const mobileScrollRef = useRef<HTMLDivElement>(null);

  // Reviews Carousel State
  const [reviewIndex, setReviewIndex] = useState(0);
  const [selectedReviewTag, setSelectedReviewTag] = useState('All');

  // Active Tab State
  const [activeTab, setActiveTab] = useState('overview');

  // Offer countdown
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [offerExpired, setOfferExpired] = useState(false);

  const rawTour = packages.find(p => p.id === id);

  // Lazy-load full package record so builderData is available
  const [fullPackageData, setFullPackageData] = useState<Package | null>(null);
  useEffect(() => {
    if (!id) return;
    api.getPackageById(id).then(full => {
      if (full) setFullPackageData(full);
    }).catch(console.warn);
  }, [id]);

  // Merge full package's builderData into the tour object
  const tour = useMemo(() => {
    return rawTour
      ? { ...rawTour, builderData: fullPackageData?.builderData ?? rawTour.builderData }
      : null;
  }, [rawTour, fullPackageData?.builderData]);

  // Find if this package is linked to a trending destination
  const linkedDest = useMemo(() => {
    if (!tour || !trendingDestinations) return null;
    return trendingDestinations.find(d => d.packageIds?.includes(tour.id));
  }, [tour, trendingDestinations]);

  // Preload adjacent images in background
  useEffect(() => {
    if (tour && tour.gallery && tour.gallery.length > 1) {
      const preload = (url: string) => {
        if (!url) return;
        const img = new window.Image();
        img.src = url;
      };
      const nextIndex = (carouselIndex + 1) % tour.gallery.length;
      const prevIndex = (carouselIndex - 1 + tour.gallery.length) % tour.gallery.length;
      preload(tour.gallery[nextIndex]);
      preload(tour.gallery[prevIndex]);
    }
  }, [carouselIndex, tour]);

  // Preload adjacent lightbox images
  useEffect(() => {
    if (isLightboxOpen && tour && tour.gallery && tour.gallery.length > 1) {
      const preload = (url: string) => {
        if (!url) return;
        const img = new window.Image();
        img.src = url;
      };
      const nextIndex = (currentImageIndex + 1) % tour.gallery.length;
      const prevIndex = (currentImageIndex - 1 + tour.gallery.length) % tour.gallery.length;
      preload(tour.gallery[nextIndex]);
      preload(tour.gallery[prevIndex]);
    }
  }, [currentImageIndex, isLightboxOpen, tour]);

  // Auto-advance mobile carousel
  useEffect(() => {
    if (!tour || tour.gallery.length <= 1) return;
    const autoPlay = setInterval(() => {
      goCarousel('right');
    }, 4500);
    return () => clearInterval(autoPlay);
  }, [tour, carouselIndex]);

  const goCarousel = (dir: 'left' | 'right') => {
    if (!tour || tour.gallery.length <= 1) return;
    const nextIdx = dir === 'right'
      ? (carouselIndex + 1) % tour.gallery.length
      : (carouselIndex - 1 + tour.gallery.length) % tour.gallery.length;
    
    setCarouselIndex(nextIdx);
    if (mobileScrollRef.current) {
      const container = mobileScrollRef.current;
      container.scrollTo({
        left: nextIdx * container.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  const goCarouselTo = (idx: number) => {
    if (!tour || idx === carouselIndex) return;
    setCarouselIndex(idx);
    if (mobileScrollRef.current) {
      const container = mobileScrollRef.current;
      container.scrollTo({
        left: idx * container.clientWidth,
        behavior: 'smooth'
      });
    }
  };

  const handleMobileScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const index = Math.round(container.scrollLeft / container.clientWidth);
    if (index !== carouselIndex && index >= 0 && index < (tour?.gallery.length || 0)) {
      setCarouselIndex(index);
    }
  };

  const handleLightboxTouchStart = (e: React.TouchEvent) => {
    setLightboxTouchStart(e.targetTouches[0].clientX);
  };

  const handleLightboxTouchMove = (e: React.TouchEvent) => {
    setLightboxTouchEnd(e.targetTouches[0].clientX);
  };

  const handleLightboxTouchEnd = () => {
    if (lightboxTouchStart === null || lightboxTouchEnd === null) return;
    const distance = lightboxTouchStart - lightboxTouchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && tour) {
      setCurrentImageIndex(prev => (prev + 1) % tour.gallery.length);
    } else if (isRightSwipe && tour) {
      setCurrentImageIndex(prev => (prev - 1 + tour.gallery.length) % tour.gallery.length);
    }
    setLightboxTouchStart(null);
    setLightboxTouchEnd(null);
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
      if (isLightboxOpen) {
        if (e.key === 'Escape') setIsLightboxOpen(false);
        if (e.key === 'ArrowRight') setCurrentImageIndex(prev => (prev + 1) % (tour?.gallery.length || 1));
        if (e.key === 'ArrowLeft') setCurrentImageIndex(prev => (prev - 1 + (tour?.gallery.length || 1)) % (tour?.gallery.length || 1));
      } else if (bookingModal) {
        if (e.key === 'Escape') setBookingModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLightboxOpen, bookingModal, tour]);

  // Pricing & Add-ons Configuration
  const DEFAULT_ADDONS = [
    { id: 'flight', label: 'Include Flights', price: 15000 },
    { id: 'visa', label: 'Visa Assistance', price: 5000 },
    { id: 'insurance', label: 'Travel Insurance', price: 2000 },
    { id: 'photo', label: 'Pro Photography', price: 8000 }
  ];
  const addonsList = (tour?.addons && tour.addons.length > 0) ? tour.addons : DEFAULT_ADDONS;

  const occupancyOptions = useMemo(() => {
    if (tour?.builderData?.occupancyRates && tour.builderData.occupancyRates.length > 0) {
      return tour.builderData.occupancyRates;
    }
    const basePrice = tour?.price ?? 18180;
    return [
      { id: 'double', label: 'Double Sharing Room', hotel: 'Standard Hotel Standard Room', price: basePrice },
      { id: 'triple', label: 'Triple Sharing Room', hotel: 'Standard Hotel Triple Room', price: Math.round(basePrice * 0.92) },
      { id: 'single', label: 'Single Occupancy Room', hotel: 'Standard Hotel Single Room', price: Math.round(basePrice * 1.3) }
    ];
  }, [tour]);

  const activeOccupancy = useMemo(() => {
    return occupancyOptions.find(o => o.id === selectedOccupancy) || occupancyOptions[0];
  }, [occupancyOptions, selectedOccupancy]);

  const ageLimitsList = useMemo(() => {
    if (tour?.builderData?.ageLimits && tour.builderData.ageLimits.length > 0) {
      return tour.builderData.ageLimits;
    }
    const basePrice = tour?.price ?? 18180;
    return [
      { type: 'Infant', age: '0-2 Years', priceText: 'No Limits' },
      { type: 'Child w/o Bed', age: '2-5 Years', priceText: formatPrice(Math.round(basePrice * 0.96)) },
      { type: 'Child with Bed', age: '5-12 Years', priceText: formatPrice(basePrice) },
      { type: 'Adult Sharing', age: '12-60 Years', priceText: formatPrice(basePrice) },
      { type: 'Senior Citizen', age: '60+ Years', priceText: formatPrice(basePrice) }
    ];
  }, [tour]);

  const cancellationPolicy = useMemo(() => {
    if (tour?.builderData?.cancellationPolicy) {
      return tour.builderData.cancellationPolicy;
    }
    return {
      headers: ['Upto 30 days', '29-15 days', '14-8 days', '7-0 days'],
      rows: {
        cancellationCharge: ['Free Cancellation', '50% of Trip', '75% of Trip', '100% of Trip'],
        refundAmount: ['100% of Trip Amount', '50% of Trip Amount', '25% of Trip Amount', 'No Refund'],
        remainingAmount: ['No Payment Required', 'Adjusted in Payment', 'Adjusted in Payment', 'Mandatory Payment']
      },
      guidelines: 'Booking amount is non-refundable if cancelled within 15 days.\nAll cancellation requests must be sent in writing via email or WhatsApp.\nRefunds will be processed to the original bank account within 7 working days.\nFlight ticket cancellations are subject to respective airline cancellation charges.'
    };
  }, [tour]);

  const paymentPolicy = useMemo(() => {
    if (tour?.builderData?.paymentPolicy) {
      return tour.builderData.paymentPolicy;
    }
    return {
      headers: ['Upto 30 days', '29-15 days', '14-8 days', '7-0 days'],
      rows: {
        bookingAmount: ['10% Payment', 'Part Payment', 'Part Payment', 'Full Payment'],
        restPayment: ['Optional', 'Optional', 'Optional', 'Mandatory'],
        status: ['Confirmed', 'Confirmed', 'Confirmed', 'Confirmed']
      }
    };
  }, [tour]);

  const faqs = useMemo(() => {
    if (tour?.builderData?.faqs && tour.builderData.faqs.length > 0) {
      return tour.builderData.faqs;
    }
    return [
      { q: 'What is the best time to visit Leh Ladakh?', a: 'The best time to visit Leh Ladakh is from mid-May to September when the roads are open and weather is pleasant.' },
      { q: 'Which is the best tourist vehicle for Ladakh?', a: 'For Ladakh\'s terrain, 4x4 SUVs like Scorpio, Innova, or Tempo Travellers for larger groups are best suited.' },
      { q: 'How to prevent altitude sickness (AMS)?', a: 'Acclimatize in Leh for the first 24-48 hours. Hydrate well, avoid strenuous physical activity, and carry Diamox if prescribed.' },
      { q: 'Is oxygen cylinder required for Ladakh?', a: 'While it is not mandatory to carry one at all times, hotels in Leh have oxygen cylinders available. We also carry basic oxygen support in our private vehicles for high-altitude passes.' }
    ];
  }, [tour]);

  const reviews = useMemo(() => {
    if (tour?.builderData?.reviews && tour.builderData.reviews.length > 0) {
      return tour.builderData.reviews;
    }
    return [
      { name: 'Pawan Sharda', rating: 5, text: 'Wonderful Leh Ladakh trip organized by Shrawello. Everything was perfect, from stays to drivers. The acclimatization day was a savior!', date: '2026-06-10' },
      { name: 'Aditya Verma', rating: 5, text: 'Very professional service. The itinerary was well spaced out to prevent altitude sickness, and the camps at Pangong were excellent.', date: '2026-06-08' },
      { name: 'Mitali Singh', rating: 5, text: 'Had a great time. The Pangong Lake camp stay was a lifetime experience. The vehicle was clean and driver was very professional.', date: '2026-06-01' }
    ];
  }, [tour]);

  // Review Filter Tags & Testimonial Carousel
  const filteredReviews = useMemo(() => {
    if (selectedReviewTag === 'All') return reviews;
    const tagLower = selectedReviewTag.toLowerCase();
    return reviews.filter(r => {
      const txt = r.text.toLowerCase();
      if (tagLower === 'driver') return txt.includes('driver') || txt.includes('vehicle');
      if (tagLower === 'stays') return txt.includes('stay') || txt.includes('hotel') || txt.includes('camp');
      if (tagLower === 'acclimatization') return txt.includes('acclimatiz') || txt.includes('sick') || txt.includes('altitude');
      return true;
    });
  }, [reviews, selectedReviewTag]);

  const activeReview = useMemo(() => {
    if (filteredReviews.length === 0) return null;
    const idx = reviewIndex % filteredReviews.length;
    return filteredReviews[idx >= 0 ? idx : 0];
  }, [filteredReviews, reviewIndex]);

  const nextReview = () => {
    if (filteredReviews.length <= 1) return;
    setReviewIndex(prev => (prev + 1) % filteredReviews.length);
  };
  const prevReview = () => {
    if (filteredReviews.length <= 1) return;
    setReviewIndex(prev => (prev - 1 + filteredReviews.length) % filteredReviews.length);
  };

  // Check if B2B Partner session exists
  const isB2BPartner = useMemo(() => {
    return !!(localStorage.getItem('shrawello_partner_jwt') || localStorage.getItem('shravya_jwt')?.includes('partner'));
  }, []);

  // Determine if high-altitude location
  const isHighAltitude = useMemo(() => {
    if (!tour) return false;
    const name = getLocationName(tour.location, masterLocations).toLowerCase();
    return name.includes('ladakh') || name.includes('leh') || tour.title.toLowerCase().includes('ladakh') || tour.title.toLowerCase().includes('leh');
  }, [tour, masterLocations]);

  // Tab configurations
  const TABS = useMemo(() => [
    { id: 'overview', label: 'Overview' },
    { id: 'itinerary', label: 'Itinerary' },
    { id: 'inclusions', label: 'Inclusions & Exclusions' },
    { id: 'cancellation', label: 'Cancellation Policy' },
    { id: 'payment', label: 'Payment Policy' },
    { id: 'faqs', label: 'FAQs' }
  ], []);

  // Intersection Observer for scroll highlighting
  useEffect(() => {
    if (!tour) return;
    const observerOptions = {
      root: null,
      rootMargin: '-150px 0px -60% 0px',
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveTab(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    TABS.forEach(tab => {
      const el = document.getElementById(tab.id);
      if (el) observer.observe(el);
    });

    return () => {
      TABS.forEach(tab => {
        const el = document.getElementById(tab.id);
        if (el) observer.unobserve(el);
      });
    };
  }, [tour, TABS]);

  if (!tour) {
    if (!packages || packages.length === 0) {
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
  const stripHtml = (html: string) => {
    return html ? html.replace(/<[^>]*>/g, '') : '';
  };

  const makeAbsoluteUrl = (path: string) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    return `${window.location.origin}${path}`;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "TouristTrip",
    "name": tour.title,
    "description": stripHtml(tour.overview || tour.description || ''),
    "image": makeAbsoluteUrl(tour.gallery?.[0] || tour.image || ''),
    "offers": {
      "@type": "Offer",
      "price": activeOccupancy.price,
      "priceCurrency": "INR",
      "availability": (tour.remainingSeats ?? 10) > 0 ? "https://schema.org/InStock" : "https://schema.org/SoldOut"
    },
    "itinerary": tour.itinerary?.map(day => ({
      "@type": "ListItem",
      "position": day.day,
      "item": {
        "@type": "TouristAttraction",
        "name": day.title,
        "description": stripHtml(day.desc || '')
      }
    }))
  };

  const toggleAddon = (id: string) => {
    if (selectedAddons.includes(id)) {
      setSelectedAddons(selectedAddons.filter(a => a !== id));
    } else {
      setSelectedAddons([...selectedAddons, id]);
    }
  };

  const parseGuestCounts = () => {
    const adultsMatch = guests.match(/(\d+)\s*Adults?/i);
    const childrenMatch = guests.match(/(\d+)\s*Child(ren)?/i);
    const infantMatch = guests.match(/(\d+)\s*Infants?/i);

    const adults = adultsMatch ? parseInt(adultsMatch[1]) : 2;
    const children = childrenMatch ? parseInt(childrenMatch[1]) : 0;
    const infants = infantMatch ? parseInt(infantMatch[1]) : 0;

    return { adults, children, infants };
  };

  const getPaxHeadcount = () => {
    const { adults, children } = parseGuestCounts();
    return adults + children;
  };

  const getAddonsTotal = () => {
    return selectedAddons.reduce((acc, curr) => {
      const addon = addonsList.find(a => a.id === curr);
      if (!addon) return acc;
      const isPerPerson = ['flight', 'visa', 'insurance'].includes(addon.id);
      const count = isPerPerson ? getPaxHeadcount() : 1;
      return acc + (addon.price * count);
    }, 0);
  };

  const calculateTotal = () => {
    const { adults, children } = parseGuestCounts();
    const adultCost = adults * activeOccupancy.price;
    const childCost = children * Math.round(activeOccupancy.price * 0.85);
    return Math.round(adultCost + childCost + getAddonsTotal());
  };

  const calculateOriginalTotal = () => {
    if (!tour.originalPrice) return 0;
    const { adults, children } = parseGuestCounts();
    const originalRate = tour.originalPrice;
    const adultCost = adults * originalRate;
    const childCost = children * Math.round(originalRate * 0.85);
    return Math.round(adultCost + childCost + getAddonsTotal());
  };

  const headcount = getPaxHeadcount();
  const perPersonPrice = Math.round(calculateTotal() / (headcount > 0 ? headcount : 1));
  const perPersonOriginalPrice = Math.round(calculateOriginalTotal() / (headcount > 0 ? headcount : 1));

  const [isSubmitting, setIsSubmitting] = useState(false);

  const confirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    try {
      const addonNames = selectedAddons.map(id => addonsList.find(a => a.id === id)?.label).join(', ');
      const occupancyLabel = activeOccupancy.label;
      const preferenceString = `Interested in ${tour.title}. Occupancy: ${occupancyLabel}. Date: ${bookingData.date}. Add-ons: ${addonNames || 'None'}. Guests: ${guests}. Estimated Quote: ${formatPrice(calculateTotal())}`;

      const { adults, children, infants } = parseGuestCounts();
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
        paxAdult: adults,
        paxChild: children,
        paxInfant: infants,
        budget: `~ ${formatPrice(calculateTotal())}`,
        source: 'Website',
        preferences: preferenceString,
        avatarColor: 'bg-green-100 text-green-600',
        packageId: tour.id
      };

      await addLead(newLead as Lead);
      setBookingModal(false);

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

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      const offset = 140;
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = el.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveTab(sectionId);
    }
  };

  return (
    <>
      <SEO
        title={tour.title}
        description={tour.overview || tour.description}
        image={tour.image}
      />
      
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <div className="bg-slate-50 dark:bg-[#0B1116] min-h-screen pb-40 md:pb-20 relative pt-24 md:pt-28">

        {/* Lightbox Modal */}
        {isLightboxOpen && (
          <div 
            className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex items-center justify-center animate-in fade-in duration-300 touch-none" 
            onClick={() => setIsLightboxOpen(false)}
            onTouchStart={handleLightboxTouchStart}
            onTouchMove={handleLightboxTouchMove}
            onTouchEnd={handleLightboxTouchEnd}
          >
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
          <div 
            onClick={() => setBookingModal(false)}
            className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#151d29] w-full max-w-md rounded-3xl shadow-2xl p-8 animate-in zoom-in-95 ring-1 ring-white/10 cursor-default"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Secure Your Spot</h3>
                <button onClick={() => setBookingModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors" aria-label="Close Booking Modal"><span className="material-symbols-outlined">close</span></button>
              </div>
              <form onSubmit={confirmBooking} className="space-y-5">
                <div className="space-y-1">
                  <label htmlFor="booking-name" className="block text-xs font-bold uppercase text-slate-500 pl-1">Full Name</label>
                  <input required id="booking-name" type="text" className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white" placeholder="John Doe" value={bookingData.name} onChange={e => setBookingData({ ...bookingData, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="booking-email" className="block text-xs font-bold uppercase text-slate-500 pl-1">Email</label>
                  <input required id="booking-email" type="email" className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white" placeholder="john@example.com" value={bookingData.email} onChange={e => setBookingData({ ...bookingData, email: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="booking-phone" className="block text-xs font-bold uppercase text-slate-500 pl-1">Mobile Number</label>
                  <PhoneInput
                    id="booking-phone"
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
                      className="w-4 h-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    />
                    <label htmlFor="isWhatsappSamePackage" className="text-xs font-bold uppercase text-slate-500 cursor-pointer select-none">
                      WhatsApp number is same as Mobile Number
                    </label>
                  </div>

                  {!bookingData.isWhatsappSame && (
                    <div className="space-y-1 animate-in fade-in slide-in-from-top-1">
                      <label htmlFor="booking-whatsapp" className="block text-xs font-bold uppercase text-slate-500 pl-1">WhatsApp Number</label>
                      <PhoneInput
                        id="booking-whatsapp"
                        value={bookingData.whatsapp}
                        onChange={(value) => setBookingData({ ...bookingData, whatsapp: value })}
                        placeholder="98765 43210"
                        required={!bookingData.isWhatsappSame}
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1">
                  <label htmlFor="booking-date" className="block text-xs font-bold uppercase text-slate-500 pl-1">Travel Date</label>
                  <input required id="booking-date" min={new Date().toISOString().split('T')[0]} max={tour.validity_date || (tour as any).validityDate ? new Date(tour.validity_date || (tour as any).validityDate).toISOString().split('T')[0] : undefined} type="date" className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white" value={bookingData.date} onChange={e => setBookingData({ ...bookingData, date: e.target.value })} />
                </div>
                <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 mt-2 space-y-2">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>Price Per Person</span>
                    <span>{formatPrice(perPersonPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-slate-900 dark:text-white border-t border-slate-200/50 dark:border-slate-700/50 pt-2">
                    <span>Estimated Total ({activeOccupancy.label})</span>
                    <span className="text-lg">{formatPrice(calculateTotal())}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 font-medium opacity-80">Based on {guests} and {selectedAddons.length} add-ons.</p>
                  <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    All taxes & GST included • No hidden charges
                  </p>
                </div>

                <div className="p-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl mt-3">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-2">
                    <span className="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0">info</span>
                    <span><strong>Free cancellation</strong> up to 30 days before travel. Partial refunds apply afterwards.</span>
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
          <div className="flex flex-col xl:flex-row gap-8 mb-8">
            <div className="flex-1">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-500 dark:text-slate-400 mb-4 flex-wrap">
                <Link to="/" className="hover:text-primary transition-colors">Home</Link>
                <span className="material-symbols-outlined text-[12px] opacity-50">arrow_forward_ios</span>
                <Link to="/packages" className="hover:text-primary transition-colors">Packages</Link>
                {linkedDest && (
                  <>
                    <span className="material-symbols-outlined text-[12px] opacity-50">arrow_forward_ios</span>
                    <Link to={`/packages?destinationId=${linkedDest.id}`} className="hover:text-primary transition-colors flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">explore</span> {linkedDest.name}
                    </Link>
                  </>
                )}
                <span className="material-symbols-outlined text-[12px] opacity-50">arrow_forward_ios</span>
                <span className="text-slate-900 dark:text-white truncate max-w-[250px] md:max-w-none">{tour.title}</span>
              </div>
            </div>
          </div>

          {/* === PREMIUM IMAGE GALLERY COLLAGE === */}
          <div className="mb-6">
            {tour.gallery.length === 0 ? (
              <div className="w-full rounded-[2rem] bg-slate-100 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 dark:border-slate-700" style={{ height: '480px' }}>
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">image_not_supported</span>
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No photos available yet</p>
              </div>
            ) : tour.gallery.length === 1 ? (
              <div
                className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl cursor-pointer group"
                style={{ height: '480px' }}
                onClick={() => openLightbox(0)}
              >
                <OptimizedImage src={tour.gallery[0]} alt={tour.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              </div>
            ) : (
              <div>
                {/* Mobile horizontal snap scroll view */}
                <div className="block md:hidden relative w-full rounded-[1.5rem] overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-900 group">
                  <div 
                    ref={mobileScrollRef}
                    onScroll={handleMobileScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none h-[300px]"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                  >
                    {tour.gallery.map((img, idx) => (
                      <div 
                        key={idx} 
                        className="w-full h-full shrink-0 snap-center cursor-pointer"
                        onClick={() => openLightbox(idx)}
                      >
                        <OptimizedImage 
                          src={img} 
                          alt={`${tour.title} — ${idx + 1}`} 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                    ))}
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/45 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
                    <span className="material-symbols-outlined text-[14px]">photo_library</span>
                    {carouselIndex + 1} / {tour.gallery.length}
                  </div>
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 px-3 py-1.5 bg-black/30 backdrop-blur-md rounded-full">
                    {tour.gallery.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => goCarouselTo(idx)}
                        className={`rounded-full transition-all duration-300 h-1.5 ${
                          idx === carouselIndex ? 'bg-white w-5' : 'bg-white/45 w-1.5'
                        }`}
                        aria-label={`Go to slide ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>

                {/* Desktop Premium Collage Layout */}
                <div className="hidden md:block relative w-full h-[480px]">
                  {tour.gallery.length === 4 ? (
                    <div className="grid grid-cols-4 grid-rows-2 gap-3 h-full w-full rounded-[2rem] overflow-hidden shadow-lg bg-white dark:bg-slate-900">
                      {/* Left: Large landscape */}
                      <div
                        onClick={() => openLightbox(0)}
                        className="relative col-span-2 row-span-2 cursor-pointer overflow-hidden group"
                      >
                        <OptimizedImage
                          src={tour.gallery[0]}
                          alt={`${tour.title} — 1`}
                          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03] select-none"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent pointer-events-none" />
                      </div>
                      
                      {/* Top Middle */}
                      <div
                        onClick={() => openLightbox(1)}
                        className="relative col-span-1 row-span-1 cursor-pointer overflow-hidden group"
                      >
                        <OptimizedImage
                          src={tour.gallery[1]}
                          alt={`${tour.title} — 2`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
                        />
                      </div>
                      
                      {/* Top Right */}
                      <div
                        onClick={() => openLightbox(2)}
                        className="relative col-span-1 row-span-1 cursor-pointer overflow-hidden group"
                      >
                        <OptimizedImage
                          src={tour.gallery[2]}
                          alt={`${tour.title} — 3`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
                        />
                      </div>
                      
                      {/* Bottom Right */}
                      <div
                        onClick={() => openLightbox(3)}
                        className="relative col-span-2 row-span-1 cursor-pointer overflow-hidden group"
                      >
                        <OptimizedImage
                          src={tour.gallery[3]}
                          alt={`${tour.title} — 4`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 select-none"
                        />
                      </div>
                    </div>
                  ) : (
                    /* Fallback Collage Grid for other counts */
                    <div className="flex gap-3 w-full h-full rounded-[2rem] overflow-hidden">
                      <div
                        onClick={() => openLightbox(0)}
                        className="relative flex-[3] h-full overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer group shadow-lg"
                      >
                        <OptimizedImage src={tour.gallery[0]} alt={`${tour.title} — 1`} className="w-full h-full object-cover transition-transform duration-750 group-hover:scale-[1.03]" />
                      </div>
                      {tour.gallery.length > 1 && (
                        <div className="flex-[2] grid grid-cols-2 grid-rows-2 gap-3 h-full">
                          {tour.gallery.slice(1, 5).map((img, idx) => {
                            const realIdx = idx + 1;
                            const isLast = realIdx === 4 && tour.gallery.length > 5;
                            return (
                              <div
                                key={realIdx}
                                onClick={() => openLightbox(realIdx)}
                                className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900 cursor-pointer group shadow-md"
                              >
                                <OptimizedImage src={img} alt={`${tour.title} — ${realIdx + 1}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                                {isLast && (
                                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-[2px]">
                                    <span className="material-symbols-outlined text-white text-3xl mb-1">photo_library</span>
                                    <span className="text-white font-black text-sm">+{tour.gallery.length - 5} Photos</span>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => openLightbox(0)}
                    className="absolute bottom-5 right-5 z-20 px-4 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition-all font-bold text-xs flex items-center gap-2 shadow-lg active:scale-95"
                  >
                    <span className="material-symbols-outlined text-[18px]">photo_library</span>
                    Show all {tour.gallery.length} photos
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Social Proof Recommendation Banner */}
          <div className="bg-[#f0f4ff] dark:bg-[#14223d] border border-[#d6e4ff] dark:border-[#1e345e] rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 mb-8 shadow-sm">
            <div className="flex items-center gap-4">
              <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 dark:bg-primary/20">
                <span className="material-symbols-outlined text-2xl font-bold">verified_user</span>
              </div>
              <div>
                <p className="text-slate-800 dark:text-slate-200 text-sm font-semibold leading-relaxed">
                  {tour.id === 'leh-ladakh-tourist-special' ? (
                    <span>Yesterday, a Jammu/Kashmir Protocol Officer booked this tour package through a partner in Delhi.</span>
                  ) : (
                    <span>Recently, {getPaxHeadcount() + 8} travelers successfully booked this tour package through our partner networks.</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 px-4 py-2 rounded-full shadow-sm border border-slate-100 dark:border-slate-800">
              <span className="text-amber-500 font-bold text-sm flex items-center gap-0.5">
                <span className="material-symbols-outlined text-sm">star</span> 4.8
              </span>
              <span className="text-slate-400 dark:text-slate-600 text-xs">|</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Top Rated</span>
            </div>
          </div>

          {/* Title & Reviews Row */}
          <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none mb-3">
                {tour.title}
              </h1>
              <div className="flex items-center gap-2">
                <div className="flex text-amber-400">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-lg fill-current">star</span>
                  ))}
                </div>
                <span className="text-sm font-bold text-slate-700 dark:text-slate-300">4.8</span>
                <span className="text-xs text-slate-400 dark:text-slate-500">(120 Reviews)</span>
              </div>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard!');
              }}
              className="px-5 py-2.5 bg-white dark:bg-[#151d29] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-2 w-fit transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">share</span> Share
            </button>
          </div>

          {/* Core Info Badges Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="p-4 bg-white dark:bg-[#151d29] rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
              <div className="size-11 rounded-xl bg-primary/5 dark:bg-primary/20 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-2xl">schedule</span></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duration</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{tour.days} Days / {Math.max(1, tour.days - 1)} Nights</span>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-[#151d29] rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
              <div className="size-11 rounded-xl bg-primary/5 dark:bg-primary/20 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-2xl">category</span></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">Packages</span>
              </div>
            </div>
            <div className="p-4 bg-white dark:bg-[#151d29] rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex items-center gap-4">
              <div className="size-11 rounded-xl bg-primary/5 dark:bg-primary/20 flex items-center justify-center text-primary"><span className="material-symbols-outlined text-2xl">pin_drop</span></div>
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Location</span>
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">{getLocationName(tour.location, masterLocations)}</span>
              </div>
            </div>
          </div>

          {/* Inclusions badging / Key amenities pills */}
          <div className="flex flex-wrap items-center gap-3 mb-10 pb-6 border-b border-slate-200 dark:border-slate-800/60">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest mr-2">Amenities:</span>
            {['Hotel', 'Meals', 'Transfers', 'Activities'].map((amenity, idx) => {
              const icons = ['bed', 'restaurant', 'directions_car', 'explore'];
              return (
                <div key={idx} className="flex items-center gap-1.5 px-4 py-2 bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-full text-xs font-bold shadow-sm">
                  <span className="material-symbols-outlined text-[16px] text-primary">{icons[idx]}</span>
                  <span>{amenity}</span>
                </div>
              );
            })}
          </div>

          {/* Trust Badges */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-12">
            {[
              { label: 'Easy Refund', icon: 'currency_exchange' },
              { label: 'Flexible Cancellation', icon: 'event_busy' },
              { label: 'Easy Pay', icon: 'credit_card' },
              { label: 'Certified Guides', icon: 'workspace_premium' },
              { label: '24/7 Support', icon: 'contact_support' }
            ].map((trust, idx) => (
              <div key={idx} className="p-4 bg-white dark:bg-[#151d29] rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col items-center justify-center text-center gap-2">
                <span className="material-symbols-outlined text-primary text-2xl">{trust.icon}</span>
                <span className="text-[11px] font-black uppercase text-slate-600 dark:text-slate-305 tracking-wider">{trust.label}</span>
              </div>
            ))}
          </div>

          {/* Sticky Tabs Navigation */}
          <div className="sticky top-[80px] bg-slate-50/90 dark:bg-[#0B1116]/90 backdrop-blur-xl z-30 border-b border-slate-200 dark:border-slate-800/80 -mx-4 px-4 py-4 mb-12 flex gap-3 overflow-x-auto no-scrollbar">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 lg:gap-20">

            {/* Left Column: Details */}
            <div className="space-y-16">

              {/* Overview Section */}
              <section id="overview" className="scroll-mt-36">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Overview</h2>
                
                {/* Altitude safety alert widget */}
                {isHighAltitude && (
                  <div className="p-6 bg-amber-50/50 dark:bg-amber-950/10 border border-amber-200/50 dark:border-amber-900/30 rounded-3xl mb-8 flex flex-col md:flex-row gap-5 items-start">
                    <div className="size-12 rounded-2xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl font-bold">medical_services</span>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-2">Altitude Safety &amp; Acclimatization Protocol</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium mb-3">
                        Leh is situated at 11,500 ft. Altitude sickness can affect anyone regardless of age or physical fitness. We strictly enforce a rest day on Day 1 to ensure a healthy trip.
                      </p>
                      <ul className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                        <li className="flex items-center gap-2 text-[11px] font-bold text-amber-800/80 dark:text-amber-400/85">
                          <span className="material-symbols-outlined text-sm">water_drop</span> Keep Hydrated (3-4L daily)
                        </li>
                        <li className="flex items-center gap-2 text-[11px] font-bold text-amber-800/80 dark:text-amber-400/85">
                          <span className="material-symbols-outlined text-sm">hotel</span> Mandatory Day 1 Bedrest
                        </li>
                        <li className="flex items-center gap-2 text-[11px] font-bold text-amber-800/80 dark:text-amber-400/85">
                          <span className="material-symbols-outlined text-sm">support_agent</span> Oxygen Support in Cabs
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="prose dark:prose-invert max-w-none text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  <p className="whitespace-pre-line leading-relaxed text-[15px]">{tour.overview}</p>
                </div>
              </section>

              {/* Itinerary Section */}
              <section id="itinerary" className="scroll-mt-36">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-3xl">map</span>
                  Day-by-Day Itinerary
                </h2>
                <div className="space-y-4">
                  {tour.itinerary?.map((item: any, idx: number) => (
                    <details key={idx} className="group bg-white dark:bg-[#151d29] rounded-3xl border border-slate-100 dark:border-slate-850 shadow-sm transition-all hover:shadow-md open:shadow-sm overflow-hidden" open={idx === 0}>
                      <summary className="flex items-center gap-5 p-6 cursor-pointer select-none list-none outline-none [&::-webkit-details-marker]:hidden group-open:text-primary">
                        <div className="flex-shrink-0 size-12 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-150 dark:border-slate-700 flex flex-col items-center justify-center group-open:bg-primary group-open:border-primary transition-colors">
                          <span className="text-[9px] font-black uppercase text-slate-400 group-open:text-white/70">Day</span>
                          <span className="text-lg font-black text-slate-900 dark:text-white group-open:text-white leading-none mt-0.5">{item.day || idx + 1}</span>
                        </div>
                        <div className="flex-1">
                          <h3 className="text-base md:text-lg font-black text-slate-900 dark:text-white group-open:text-primary transition-colors">{item.title}</h3>
                        </div>
                        <div className="flex-shrink-0 size-8 rounded-full bg-slate-50 dark:bg-slate-850 flex items-center justify-center group-open:rotate-180 transition-transform">
                          <span className="material-symbols-outlined text-slate-400">expand_more</span>
                        </div>
                      </summary>
                      
                      <div className="px-6 pb-6 pt-1 pl-[72px] -mt-2 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="p-5 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 relative">
                          <p className="text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-line text-sm font-medium">
                            {item.desc}
                          </p>
                          <div className="mt-4 flex items-center gap-2 pt-4 border-t border-slate-200 dark:border-slate-800/80">
                            <span className="material-symbols-outlined text-primary/70 text-[18px]">verified</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Premium Service Included</span>
                          </div>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* Age Limits Section */}
              <section className="scroll-mt-36 bg-white dark:bg-[#151d29] p-8 rounded-[2rem] border border-slate-150 dark:border-slate-800/80 shadow-sm">
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6">Age Limits (Trip Wise)</h2>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {ageLimitsList.map((tier, idx) => (
                    <div key={idx} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{tier.type}</span>
                      <span className="text-xs font-bold text-slate-500 mb-2">{tier.age}</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white">{tier.priceText}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Inclusions & Exclusions */}
              <section id="inclusions" className="scroll-mt-36 grid md:grid-cols-2 gap-8">
                <div className="bg-green-50/30 dark:bg-green-950/5 p-8 rounded-[2rem] border border-green-100/60 dark:border-green-900/20">
                  <h3 className="text-lg font-black text-green-800 dark:text-green-400 mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined bg-green-100 dark:bg-green-950 p-1.5 rounded-xl text-green-600 font-bold">check</span>
                    Inclusions
                  </h3>
                  <ul className="space-y-4">
                    {tour.included.map((inc, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-350 text-sm font-semibold">
                        <span className="material-symbols-outlined text-green-500 text-lg">check_circle</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="bg-red-50/30 dark:bg-red-950/5 p-8 rounded-[2rem] border border-red-100/60 dark:border-red-900/20">
                  <h3 className="text-lg font-black text-red-800 dark:text-red-400 mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined bg-red-100 dark:bg-red-950 p-1.5 rounded-xl text-red-505 font-bold">close</span>
                    Exclusions
                  </h3>
                  <ul className="space-y-4">
                    {tour.notIncluded.map((exc, i) => (
                      <li key={i} className="flex items-start gap-3 text-slate-700 dark:text-slate-355 text-sm font-semibold">
                        <span className="material-symbols-outlined text-red-400 text-lg">cancel</span>
                        <span>{exc}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </section>

              {/* Cancellation Policy */}
              <section id="cancellation" className="scroll-mt-36">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Cancellation Policy</h2>
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm bg-white dark:bg-[#151d29] mb-6">
                  <table className="w-full text-left border-collapse text-sm min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-5 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Timeline</th>
                        {cancellationPolicy.headers.map((h: string, i: number) => (
                          <th key={i} className="p-5 font-black text-slate-800 dark:text-slate-200 text-center">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-50 dark:border-slate-800/50">
                        <td className="p-5 font-bold text-slate-600 dark:text-slate-300">Cancellation Charge</td>
                        {cancellationPolicy.rows.cancellationCharge.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center font-bold text-slate-700 dark:text-slate-300">{v}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-800/10">
                        <td className="p-5 font-bold text-slate-600 dark:text-slate-300">Refund Amount</td>
                        {cancellationPolicy.rows.refundAmount.map((v: string, i: number) => (
                          <td key={i} className={`p-5 text-center font-black ${v.includes('100%') ? 'text-green-600 dark:text-green-400' : 'text-slate-700 dark:text-slate-300'}`}>{v}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-5 font-bold text-slate-600 dark:text-slate-300">Remaining Amount</td>
                        {cancellationPolicy.rows.remainingAmount.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center font-bold text-slate-500 dark:text-slate-400 text-xs">{v}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="p-5 bg-slate-50 dark:bg-slate-900/40 rounded-2xl border border-slate-150 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-2">Policy Guidelines</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed font-medium">
                    {cancellationPolicy.guidelines}
                  </p>
                </div>
              </section>

              {/* Payment Policy */}
              <section id="payment" className="scroll-mt-36">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Payment Policy</h2>
                <div className="overflow-x-auto border border-slate-100 dark:border-slate-800 rounded-[2rem] shadow-sm bg-white dark:bg-[#151d29]">
                  <table className="w-full text-left border-collapse text-sm min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        <th className="p-5 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Timeline</th>
                        {paymentPolicy.headers.map((h: string, i: number) => (
                          <th key={i} className="p-5 font-black text-slate-800 dark:text-slate-200 text-center">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-50 dark:border-slate-800/50">
                        <td className="p-5 font-bold text-slate-600 dark:text-slate-300">Booking Amount</td>
                        {paymentPolicy.rows.bookingAmount.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center font-bold text-slate-700 dark:text-slate-300">{v}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-800/10">
                        <td className="p-5 font-bold text-slate-600 dark:text-slate-300">Rest Payment</td>
                        {paymentPolicy.rows.restPayment.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center font-semibold text-slate-700 dark:text-slate-300">{v}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-5 font-bold text-slate-600 dark:text-slate-300">Status</td>
                        {paymentPolicy.rows.status.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center font-black text-green-600 dark:text-green-400">{v}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* FAQs Section */}
              <section id="faqs" className="scroll-mt-36">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6">Frequently Asked Questions</h2>
                <div className="space-y-3">
                  {faqs.map((faq: any, idx: number) => (
                    <details key={idx} className="group bg-white dark:bg-[#151d29] rounded-2xl border border-slate-100 dark:border-slate-855 shadow-sm overflow-hidden">
                      <summary className="flex items-center justify-between p-5 cursor-pointer select-none font-bold text-slate-800 dark:text-slate-200 outline-none list-none [&::-webkit-details-marker]:hidden group-open:text-primary">
                        <span className="text-sm md:text-base">{faq.q}</span>
                        <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
                      </summary>
                      <div className="px-5 pb-5 text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line bg-slate-50/35 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-800 p-4">
                        {faq.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* Client Testimonials */}
              <section className="bg-white dark:bg-[#151d29] p-8 rounded-[2rem] border border-slate-150 dark:border-slate-800/80 shadow-sm">
                <h2 className="text-xl font-black text-slate-955 dark:text-white text-center mb-6">What Our Clients Say About Us</h2>
                
                {/* Review Category Tags */}
                <div className="flex flex-wrap gap-2 justify-center mb-6">
                  {['All', 'Stays', 'Acclimatization', 'Driver'].map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedReviewTag(tag);
                        setReviewIndex(0);
                      }}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedReviewTag === tag
                          ? 'bg-primary text-white border-primary shadow-sm'
                          : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-primary/50'
                      }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                {/* Carousel Card */}
                {activeReview ? (
                  <div className="min-h-[140px] flex flex-col justify-between p-6 bg-slate-50 dark:bg-slate-900/50 rounded-2xl relative mb-6">
                    <span className="material-symbols-outlined text-4xl text-primary/10 absolute top-4 left-4 select-none pointer-events-none">format_quote</span>
                    <div className="relative z-10">
                      <div className="flex text-amber-400 mb-3">
                        {Array.from({ length: activeReview.rating }).map((_, i) => (
                          <span key={i} className="material-symbols-outlined text-sm fill-current">star</span>
                        ))}
                      </div>
                      <p className="text-sm text-slate-650 dark:text-slate-350 italic font-medium mb-4">
                        "{activeReview.text}"
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-slate-800 dark:text-white block">{activeReview.name}</span>
                        <span className="text-[10px] text-slate-450">{activeReview.date}</span>
                      </div>
                      {filteredReviews.length > 1 && (
                        <div className="flex gap-2">
                          <button
                            onClick={prevReview}
                            className="size-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 flex items-center justify-center text-slate-550 hover:bg-slate-50 transition-colors"
                            aria-label="Previous Review"
                          >
                            <span className="material-symbols-outlined text-sm">chevron_left</span>
                          </button>
                          <button
                            onClick={nextReview}
                            className="size-8 rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-855 flex items-center justify-center text-slate-550 hover:bg-slate-50 transition-colors"
                            aria-label="Next Review"
                          >
                            <span className="material-symbols-outlined text-sm">chevron_right</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-slate-400 text-xs bg-slate-50 dark:bg-slate-900 rounded-2xl">
                    No reviews available for this category filter.
                  </div>
                )}
              </section>

            </div>

            {/* Right Column: Sticky Booking Widget */}
            <div className="hidden lg:block">
              <div className="sticky top-32 space-y-6">
                <div className="bg-white dark:bg-[#151d29] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800/80 overflow-hidden ring-1 ring-slate-900/5">
                  
                  {/* Top Rate details - Fixed */}
                  <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Starting from</p>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-4xl font-black text-slate-900 dark:text-white tracking-tight">{formatPrice(perPersonPrice)}</span>
                      <span className="text-sm font-bold text-slate-500">/ person</span>
                    </div>
                    {tour.originalPrice && tour.originalPrice > activeOccupancy.price && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-sm text-slate-400 line-through decoration-slate-300 dark:decoration-slate-600">{formatPrice(perPersonOriginalPrice)}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 uppercase tracking-wider">Save {Math.round(((tour.originalPrice - activeOccupancy.price) / tour.originalPrice) * 100)}%</span>
                      </div>
                    )}
                    <div className="text-[11px] font-black text-slate-500 bg-slate-200/50 dark:bg-slate-800/60 px-3.5 py-1.5 rounded-xl w-fit mt-1 select-none">
                      Total: {formatPrice(calculateTotal())} for {guests}
                    </div>
                    {tour.remainingSeats && tour.remainingSeats < 10 && (
                      <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg text-xs font-bold mt-3">
                        <span className="material-symbols-outlined text-[16px]">local_fire_department</span>
                        Only {tour.remainingSeats} seats left!
                      </div>
                    )}
                  </div>

                  {/* Scrollable controls body (limits height on short laptops) */}
                  <div className="p-8 space-y-6 max-h-[calc(100vh-320px)] overflow-y-auto pr-2 scrollbar-thin">
                    
                    {/* Occupancy Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">Occupancy Pricing</label>
                      <div className="space-y-3">
                        {occupancyOptions.map(option => (
                          <button
                            type="button"
                            key={option.id}
                            onClick={() => setSelectedOccupancy(option.id)}
                            className={`w-full flex items-center justify-between p-4 rounded-2xl border text-left cursor-pointer transition-all duration-200 ${
                              selectedOccupancy === option.id 
                                ? 'bg-primary/5 border-primary shadow-inner' 
                                : 'bg-transparent border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div>
                              <span className={`text-sm font-bold block ${selectedOccupancy === option.id ? 'text-primary' : 'text-slate-850 dark:text-slate-205'}`}>{option.label}</span>
                              <span className="text-[10px] text-slate-450 dark:text-slate-500 font-medium">{option.hotel}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-black text-slate-900 dark:text-white">{formatPrice(option.price)}</span>
                              {selectedOccupancy === option.id && <span className="material-symbols-outlined text-primary text-[20px]">check_circle</span>}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Guests Selector */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">Travelers</label>
                      <div className="relative">
                        <TravelerSelector
                          value={guests}
                          onChange={(val) => setGuests(val)}
                        />
                      </div>
                    </div>

                    {/* Upgrades */}
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 ml-1">Add-ons</label>
                      <div className="space-y-2">
                        {addonsList.map(addon => (
                          <button
                            type="button"
                            key={addon.id}
                            onClick={() => toggleAddon(addon.id)}
                            className={`w-full flex items-center justify-between p-3 rounded-2xl border text-left cursor-pointer transition-all duration-250 ${
                              selectedAddons.includes(addon.id) 
                                ? 'bg-primary/5 border-primary shadow-inner' 
                                : 'bg-transparent border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div className={`size-5 rounded-md border flex items-center justify-center transition-colors ${selectedAddons.includes(addon.id) ? 'bg-primary border-primary' : 'border-slate-300 dark:border-slate-600'}`}>
                                {selectedAddons.includes(addon.id) && <span className="material-symbols-outlined text-white text-[14px]">check</span>}
                              </div>
                              <span className={`text-sm font-bold ${selectedAddons.includes(addon.id) ? 'text-primary' : 'text-slate-700 dark:text-slate-300'}`}>{addon.label}</span>
                            </div>
                            <span className="text-xs font-bold text-slate-500">+{formatPriceCompact(addon.price)}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* B2B Partner Commission HUD */}
                    {isB2BPartner && (
                      <div className="p-4 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/35 rounded-2xl">
                        <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block mb-1">B2B Partner Earnings</span>
                        <div className="flex justify-between items-center text-sm font-bold text-slate-850 dark:text-white">
                          <span>Estimated Commission</span>
                          <span className="text-primary text-base font-black">
                            {(() => {
                              const commissionVal = tour.partnerCommissionValue ?? 10;
                              const commissionType = tour.partnerCommissionType ?? 'Percentage';
                              if (commissionType === 'Percentage') {
                                return formatPrice(Math.round((calculateTotal() * Number(commissionVal)) / 100));
                              }
                              return formatPrice(Number(commissionVal));
                            })()}
                          </span>
                        </div>
                        <p className="text-[9px] text-slate-450 dark:text-slate-500 mt-1 font-medium leading-relaxed">
                          Based on {tour.partnerCommissionType ?? 'Percentage'} payout rate of {tour.partnerCommissionValue ?? '10'}{tour.partnerCommissionType === 'Flat_Amount' ? ' INR' : '%'}.
                        </p>
                      </div>
                    )}

                  </div>

                  {/* Actions - Fixed Bottom */}
                  <div className="p-8 pt-6 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#151d29] space-y-4">
                    <button onClick={() => setBookingModal(true)} className="w-full bg-primary hover:bg-primary-dark text-white font-black py-4 rounded-2xl shadow-xl shadow-primary/20 transition-all active:scale-95 text-base flex items-center justify-center gap-2">
                      <span className="material-symbols-outlined text-[20px]">send</span>
                      Send Query
                    </button>

                    <div className="flex gap-2">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`I'm interested in booking the tour: ${tour.title}\n${window.location.href}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 font-bold text-sm hover:bg-green-100 dark:hover:bg-green-900/20 transition-all"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        <span>WhatsApp Query</span>
                      </a>
                    </div>

                    <p className="text-[10px] text-center text-slate-400 font-medium">No immediate payment required. Dynamic quotes provided instantly.</p>
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
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                Price per person
                {selectedAddons.length > 0 && <span className="px-1 py-[1px] bg-primary/10 text-primary rounded-[3px] text-[8px] leading-none ml-1">+{selectedAddons.length} ADD-ONS</span>}
              </p>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-black text-slate-900 dark:text-white">{formatPrice(perPersonPrice)}</p>
                {tour.originalPrice && tour.originalPrice > activeOccupancy.price && (
                  <span className="text-xs text-slate-400 line-through">{formatPriceCompact(perPersonOriginalPrice)}</span>
                )}
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                Total: {formatPrice(calculateTotal())} ({guests})
              </p>
            </div>
            <button
              onClick={() => setBookingModal(true)}
              className="bg-primary hover:bg-primary-dark text-white px-8 py-3.5 rounded-2xl font-bold shadow-lg shadow-primary/20 active:scale-95 transition-all text-sm uppercase tracking-wider"
            >
              Book Now
            </button>
          </div>
        </div>
      </div >
    </>
  );
};