import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Lead, Package, CommissionType } from '../types';
import { SEO } from '../components/ui/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { toast } from '../components/ui/Toast';
import { TravelerSelector } from '../components/ui/TravelerSelector';
import { PhoneInput } from '../components/ui/PhoneInput';
import { api } from '../src/lib/api';
import { ImageUpload } from '../components/ui/ImageUpload';
import { formatPrice, formatPriceCompact, getLocationName } from '../utils/packageUtils';

export const PackageDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { packages, masterLocations, addLead, trendingDestinations, updatePackage, cmsGallery } = useData();
  const { hasPermission } = useAuth();

  // Package Management Permissions
  const canEdit = useMemo(() => {
    try {
      return hasPermission('inventory', 'manage') || hasPermission('itinerary', 'manage');
    } catch {
      return false;
    }
  }, [hasPermission]);

  const [isAdminEditOpen, setIsAdminEditOpen] = useState(false);
  const [activeEditTab, setActiveEditTab] = useState<'info' | 'settings' | 'media' | 'ageLimits' | 'cancellation' | 'payment' | 'inclusions' | 'faqs' | 'itinerary'>('info');

  const [editForm, setEditForm] = useState({
    title: '',
    location: '',
    price: 0,
    originalPrice: 0,
    days: 0,
    overview: '',
    validityDate: '',
    image: '',
    included: [] as string[],
    notIncluded: [] as string[],
    ageLimits: [] as { type: string; age: string; priceText: string }[],
    cancellationPolicy: {
      headers: [] as string[],
      rows: {
        cancellationCharge: [] as string[],
        refundAmount: [] as string[],
        remainingAmount: [] as string[]
      },
      guidelines: ''
    },
    paymentPolicy: {
      headers: [] as string[],
      rows: {
        bookingAmount: [] as string[],
        restPayment: [] as string[],
        status: [] as string[]
      }
    },
    faqs: [] as { q: string; a: string }[],
    itinerary: [] as { day: number; title: string; desc: string }[],
    description: '',
    groupSize: '',
    status: 'Active' as 'Active' | 'Inactive',
    remainingSeats: '' as string | number,
    offerEndTime: '',
    tag: '',
    tagColor: 'bg-blue-500 text-white',
    theme: '',
    partnerCommissionType: 'Percentage' as CommissionType,
    partnerCommissionValue: '' as string | number,
    addons: [] as { id: string; label: string; price: number }[],
    gallery: [] as string[]
  });

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

  // Aspect ratio of the first image in the gallery
  const [firstImageRatio, setFirstImageRatio] = useState(1.777); // Default 16:9
  useEffect(() => {
    if (tour?.gallery && tour.gallery.length > 0) {
      const img = new window.Image();
      img.src = tour.gallery[0];
      img.onload = () => {
        if (img.naturalWidth && img.naturalHeight) {
          setFirstImageRatio(img.naturalWidth / img.naturalHeight);
        }
      };
    }
  }, [tour?.gallery]);

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

  useEffect(() => {
    if (tour && isAdminEditOpen) {
      setEditForm({
        title: tour.title || '',
        location: tour.location || '',
        price: Number(tour.price) || 0,
        originalPrice: Number(tour.originalPrice) || 0,
        days: Number(tour.days) || 1,
        overview: tour.overview || '',
        validityDate: tour.validity_date || (tour as any).validityDate || '',
        image: tour.image || '',
        included: tour.included || [],
        notIncluded: tour.notIncluded || [],
        ageLimits: ageLimitsList,
        cancellationPolicy: cancellationPolicy,
        paymentPolicy: paymentPolicy,
        faqs: faqs,
        itinerary: tour.itinerary || [],
        description: tour.description || '',
        groupSize: tour.groupSize || '',
        status: tour.status || 'Active',
        remainingSeats: tour.remainingSeats ?? '',
        offerEndTime: tour.offerEndTime || '',
        tag: tour.tag || '',
        tagColor: tour.tagColor || 'bg-blue-500 text-white',
        theme: tour.theme || '',
        partnerCommissionType: tour.partnerCommissionType || 'Percentage',
        partnerCommissionValue: tour.partnerCommissionValue !== undefined && tour.partnerCommissionValue !== null ? tour.partnerCommissionValue : '',
        addons: tour.addons || [],
        gallery: tour.gallery || []
      });
    }
  }, [tour, isAdminEditOpen, ageLimitsList, cancellationPolicy, paymentPolicy, faqs]);

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!tour) return;
    try {
      const packageData: Partial<Package> = {
        title: editForm.title,
        location: editForm.location,
        price: editForm.price,
        originalPrice: editForm.originalPrice || undefined,
        days: editForm.days,
        overview: editForm.overview,
        validity_date: editForm.validityDate || null,
        image: editForm.image,
        included: editForm.included,
        notIncluded: editForm.notIncluded,
        itinerary: editForm.itinerary,
        description: editForm.description,
        groupSize: editForm.groupSize,
        status: editForm.status,
        remainingSeats: editForm.remainingSeats === '' ? undefined : Number(editForm.remainingSeats),
        offerEndTime: editForm.offerEndTime || undefined,
        tag: editForm.tag || undefined,
        tagColor: editForm.tagColor || undefined,
        theme: editForm.theme,
        partnerCommissionType: editForm.partnerCommissionValue === '' ? null : editForm.partnerCommissionType,
        partnerCommissionValue: editForm.partnerCommissionValue === '' ? null : Number(editForm.partnerCommissionValue),
        addons: editForm.addons,
        gallery: editForm.gallery,
        builderData: {
          ...(tour.builderData || {}),
          tripDetails: {
            ...(tour.builderData?.tripDetails || {}),
            title: editForm.title,
            days: editForm.days,
            nights: Math.max(0, editForm.days - 1),
            destination: editForm.location,
            coverImage: editForm.image,
            included: editForm.included,
            notIncluded: editForm.notIncluded
          },
          ageLimits: editForm.ageLimits,
          cancellationPolicy: editForm.cancellationPolicy,
          paymentPolicy: editForm.paymentPolicy,
          faqs: editForm.faqs
        }
      };

      await updatePackage(tour.id, packageData);
      setFullPackageData(prev => prev ? { ...prev, ...packageData } : null);
      setIsAdminEditOpen(false);
      toast.success("Package updated and synced successfully!");
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update package: " + err.message);
    }
  };

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

  const handleAgeLimitChange = (index: number, field: 'type' | 'age' | 'priceText', value: string) => {
    const newTiers = [...editForm.ageLimits];
    newTiers[index] = { ...newTiers[index], [field]: value };
    setEditForm(prev => ({ ...prev, ageLimits: newTiers }));
  };

  const addAgeLimitTier = () => {
    setEditForm(prev => ({
      ...prev,
      ageLimits: [...prev.ageLimits, { type: 'New Tier', age: '0-99 Years', priceText: 'Free' }]
    }));
  };

  const removeAgeLimitTier = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      ageLimits: prev.ageLimits.filter((_, i) => i !== index)
    }));
  };

  const handleCancellationHeaderChange = (index: number, val: string) => {
    const headers = [...editForm.cancellationPolicy.headers];
    headers[index] = val;
    setEditForm(prev => ({
      ...prev,
      cancellationPolicy: {
        ...prev.cancellationPolicy,
        headers
      }
    }));
  };

  const handleCancellationRowChange = (field: 'cancellationCharge' | 'refundAmount' | 'remainingAmount', index: number, val: string) => {
    const rowArr = [...editForm.cancellationPolicy.rows[field]];
    rowArr[index] = val;
    setEditForm(prev => ({
      ...prev,
      cancellationPolicy: {
        ...prev.cancellationPolicy,
        rows: {
          ...prev.cancellationPolicy.rows,
          [field]: rowArr
        }
      }
    }));
  };

  const handlePaymentHeaderChange = (index: number, val: string) => {
    const headers = [...editForm.paymentPolicy.headers];
    headers[index] = val;
    setEditForm(prev => ({
      ...prev,
      paymentPolicy: {
        ...prev.paymentPolicy,
        headers
      }
    }));
  };

  const handlePaymentRowChange = (field: 'bookingAmount' | 'restPayment' | 'status', index: number, val: string) => {
    const rowArr = [...editForm.paymentPolicy.rows[field]];
    rowArr[index] = val;
    setEditForm(prev => ({
      ...prev,
      paymentPolicy: {
        ...prev.paymentPolicy,
        rows: {
          ...prev.paymentPolicy.rows,
          [field]: rowArr
        }
      }
    }));
  };

  const handleInclusionChange = (index: number, value: string) => {
    const newArr = [...editForm.included];
    newArr[index] = value;
    setEditForm(prev => ({ ...prev, included: newArr }));
  };

  const addInclusion = () => {
    setEditForm(prev => ({ ...prev, included: [...prev.included, ''] }));
  };

  const removeInclusion = (index: number) => {
    setEditForm(prev => ({ ...prev, included: prev.included.filter((_, i) => i !== index) }));
  };

  const handleExclusionChange = (index: number, value: string) => {
    const newArr = [...editForm.notIncluded];
    newArr[index] = value;
    setEditForm(prev => ({ ...prev, notIncluded: newArr }));
  };

  const addExclusion = () => {
    setEditForm(prev => ({ ...prev, notIncluded: [...prev.notIncluded, ''] }));
  };

  const removeExclusion = (index: number) => {
    setEditForm(prev => ({ ...prev, notIncluded: prev.notIncluded.filter((_, i) => i !== index) }));
  };

  const handleGalleryUpload = async (file: File) => {
    try {
      const toastId = toast.loading('Uploading gallery image...');
      const publicUrl = await api.uploadFile(file, 'documents');
      setEditForm(prev => ({
        ...prev,
        gallery: [...prev.gallery, publicUrl]
      }));
      toast.success('Gallery image uploaded', { id: toastId });
    } catch (err: any) {
      toast.error(err.message || 'Failed to upload gallery image');
    }
  };

  const removeGalleryImage = (index: number) => {
    setEditForm(prev => ({
      ...prev,
      gallery: prev.gallery.filter((_, i) => i !== index)
    }));
  };

  const moveGalleryImage = (index: number, direction: 'left' | 'right') => {
    const list = [...editForm.gallery];
    if (direction === 'left' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'right' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }
    setEditForm(prev => ({ ...prev, gallery: list }));
  };

  const handleFaqChange = (index: number, field: 'q' | 'a', value: string) => {
    const newFaqs = [...editForm.faqs];
    newFaqs[index] = { ...newFaqs[index], [field]: value };
    setEditForm(prev => ({ ...prev, faqs: newFaqs }));
  };

  const addFaq = () => {
    setEditForm(prev => ({ ...prev, faqs: [...prev.faqs, { q: '', a: '' }] }));
  };

  const removeFaq = (index: number) => {
    setEditForm(prev => ({ ...prev, faqs: prev.faqs.filter((_, i) => i !== index) }));
  };

  const handleItineraryChange = (index: number, field: 'title' | 'desc', value: string) => {
    const newItin = [...editForm.itinerary];
    newItin[index] = { ...newItin[index], [field]: value };
    setEditForm(prev => ({ ...prev, itinerary: newItin }));
  };

  const addItineraryDay = () => {
    const newDayNum = editForm.itinerary.length + 1;
    setEditForm(prev => ({
      ...prev,
      itinerary: [...prev.itinerary, { day: newDayNum, title: `Day ${newDayNum}`, desc: '' }]
    }));
  };

  const removeItineraryDay = (index: number) => {
    setEditForm(prev => {
      const filtered = prev.itinerary.filter((_, i) => i !== index);
      const reindexed = filtered.map((item, i) => ({ ...item, day: i + 1 }));
      return { ...prev, itinerary: reindexed };
    });
  };

  const renderPolicyCell = (text: string) => {
    const textLower = text.toLowerCase();
    
    // Determine status: green check, red cross, or no icon
    let status: 'check' | 'cross' | 'none' = 'none';
    
    if (
      textLower.includes('free') || 
      textLower.includes('100%') || 
      textLower.includes('no payment') || 
      textLower.includes('optional') || 
      textLower.includes('confirmed') ||
      textLower.includes('10%') ||
      textLower.includes('15%')
    ) {
      status = 'check';
    } else if (
      textLower.includes('charge') ||
      textLower.includes('50%') || 
      textLower.includes('75%') || 
      textLower.includes('no refund') || 
      textLower.includes('mandatory') ||
      textLower.includes('part payment')
    ) {
      status = 'cross';
    }

    return (
      <div className="flex flex-col items-center justify-center gap-1.5 p-2 min-h-[64px]">
        {status === 'check' && (
          <span className="material-symbols-outlined text-green-600 text-base font-bold bg-green-50 dark:bg-green-950/40 p-1 rounded-full leading-none">check</span>
        )}
        {status === 'cross' && (
          <span className="material-symbols-outlined text-red-500 text-base font-bold bg-red-50 dark:bg-red-950/40 p-1 rounded-full leading-none">close</span>
        )}
        <span className="text-center font-bold text-xs md:text-sm text-slate-800 dark:text-slate-200">{text}</span>
      </div>
    );
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

        {/* Admin Control Bar */}
        {canEdit && (
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border-b border-indigo-500/20 text-white px-4 md:px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 sticky top-[80px] z-40 shadow-lg -mt-8 md:-mt-12 mb-8">
            <div className="flex items-center gap-3">
              <div className="size-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center">
                <span className="material-symbols-outlined text-indigo-400 text-lg">admin_panel_settings</span>
              </div>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-indigo-300">Package Admin Panel</p>
                <p className="text-[11px] text-slate-350">Quick edit fields or load this package in the full itinerary builder.</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveEditTab('info');
                  setIsAdminEditOpen(true);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/10"
              >
                <span className="material-symbols-outlined text-[16px]">edit</span>
                Quick Edit Package
              </button>
              <button
                onClick={() => navigate(`/admin/itinerary-builder?edit=${tour.id}`)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <span className="material-symbols-outlined text-[16px]">edit_road</span>
                Itinerary Builder
              </button>
              <button
                onClick={() => navigate('/admin/packages')}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-1.5 border border-slate-700"
              >
                <span className="material-symbols-outlined text-[16px]">inventory</span>
                Package List
              </button>
            </div>
          </div>
        )}

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
                className="relative w-full rounded-[2rem] overflow-hidden shadow-2xl cursor-pointer group max-h-[480px]"
                style={{ aspectRatio: firstImageRatio }}
                onClick={() => openLightbox(0)}
              >
                <OptimizedImage src={tour.gallery[0]} alt={tour.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />
              </div>
            ) : (
              <div>
                {/* Mobile horizontal snap scroll view */}
                <div className="block md:hidden relative w-full rounded-[1.5rem] overflow-hidden shadow-xl bg-slate-100 dark:bg-slate-900 group aspect-[16/10] max-h-[300px]">
                  <div 
                    ref={mobileScrollRef}
                    onScroll={handleMobileScroll}
                    className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth scrollbar-none h-full"
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
                <div className="hidden md:block relative w-full aspect-[21/9] max-h-[480px]">
                  {tour.gallery.length >= 4 ? (
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
                        {tour.gallery.length > 4 && (
                          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 backdrop-blur-[2px] transition-colors group-hover:bg-black/60">
                            <span className="material-symbols-outlined text-white text-3xl mb-1">photo_library</span>
                            <span className="text-white font-black text-sm">+{tour.gallery.length - 4} Photos</span>
                          </div>
                        )}
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
                                className="relative w-full h-full rounded-2xl overflow-hidden bg-slate-100 dark:bg-slate-900/50 cursor-pointer group shadow-md"
                              >
                                <OptimizedImage src={img} alt={`${tour.title} — ${realIdx + 1}`} className="w-full h-full object-cover transition-transform duration-505 group-hover:scale-[1.05]" />
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
              <div className="flex items-center gap-3 mb-2 flex-wrap">
                <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
                  {tour.title}
                </h1>
                {canEdit && (
                  <button
                    onClick={() => {
                      setActiveEditTab('info');
                      setIsAdminEditOpen(true);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm active:scale-95"
                    title="Edit Package Header & Info"
                  >
                    <span className="material-symbols-outlined text-[18px] block">edit</span>
                  </button>
                )}
              </div>
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
          <div className={`sticky ${canEdit ? 'top-[144px]' : 'top-[80px]'} bg-slate-50/90 dark:bg-[#0B1116]/90 backdrop-blur-xl z-30 border-b border-slate-200 dark:border-slate-800/80 -mx-4 px-4 py-4 mb-12 flex gap-3 overflow-x-auto no-scrollbar`}>
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => scrollToSection(tab.id)}
                className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                    : 'bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-indigo-500/50'
                }`}
              >
                {tab.label}
              </button>
            ))}
            {canEdit && (
              <button
                type="button"
                onClick={() => {
                  setActiveEditTab('info');
                  setIsAdminEditOpen(true);
                }}
                className="whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 bg-white dark:bg-[#151d29] border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 flex items-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">settings</span>
                Page Settings
              </button>
            )}
          </div>

          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-12 lg:gap-20">

            {/* Left Column: Details */}
            <div className="space-y-16">

              {/* Overview Section */}
              <section id="overview" className="scroll-mt-36">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  Overview
                  {canEdit && (
                    <button
                      onClick={() => {
                        setActiveEditTab('info');
                        setIsAdminEditOpen(true);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors align-middle"
                      title="Edit Overview"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  )}
                </h2>
                
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

              {/* Gallery Section */}
              {tour.gallery && tour.gallery.length > 0 && (
                <section id="gallery" className="scroll-mt-36 bg-white dark:bg-[#151d29] p-8 rounded-[2rem] border border-slate-150 dark:border-slate-800/80 shadow-sm">
                  <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-650">photo_library</span>
                    Gallery
                  </h2>
                  <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                    {tour.gallery.map((img, index) => (
                      <div 
                        key={index}
                        onClick={() => openLightbox(index)}
                        className="break-inside-avoid overflow-hidden rounded-2xl cursor-pointer group relative shadow-sm border border-slate-150 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 transition-all duration-300 hover:shadow-md"
                      >
                        <OptimizedImage 
                          src={img} 
                          alt={`${tour.title} Gallery ${index + 1}`} 
                          className="w-full h-auto object-cover transition-transform duration-500 group-hover:scale-105" 
                        />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Itinerary Section */}
              <section id="itinerary" className="scroll-mt-36">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                  <span className="material-symbols-outlined text-primary text-3xl">map</span>
                  Day-by-Day Itinerary
                  {canEdit && (
                    <button
                      onClick={() => {
                        setActiveEditTab('itinerary');
                        setIsAdminEditOpen(true);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors align-middle"
                      title="Edit Itinerary Days"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  )}
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
                <h2 className="text-xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  Age Limits (Trip Wise)
                  {canEdit && (
                    <button
                      onClick={() => {
                        setActiveEditTab('ageLimits');
                        setIsAdminEditOpen(true);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors align-middle"
                      title="Edit Age Limits"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  )}
                </h2>
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
                    {canEdit && (
                      <button
                        onClick={() => {
                          setActiveEditTab('inclusions');
                          setIsAdminEditOpen(true);
                        }}
                        className="p-1 hover:bg-green-100 dark:hover:bg-green-900/40 rounded-lg text-green-700 dark:text-green-400 hover:text-primary transition-colors align-middle ml-auto"
                        title="Edit Inclusions & Exclusions"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    )}
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
                    {canEdit && (
                      <button
                        onClick={() => {
                          setActiveEditTab('inclusions');
                          setIsAdminEditOpen(true);
                        }}
                        className="p-1 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-red-700 dark:text-red-400 hover:text-primary transition-colors align-middle ml-auto"
                        title="Edit Inclusions & Exclusions"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    )}
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
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  Cancellation Policy
                  {canEdit && (
                    <button
                      onClick={() => {
                        setActiveEditTab('cancellation');
                        setIsAdminEditOpen(true);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors align-middle"
                      title="Edit Cancellation Policy"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  )}
                </h2>
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
                        <td className="p-5 font-bold text-slate-655 dark:text-slate-300">Cancellation Charge</td>
                        {cancellationPolicy.rows.cancellationCharge.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-800/10">
                        <td className="p-5 font-bold text-slate-655 dark:text-slate-300">Refund Amount</td>
                        {cancellationPolicy.rows.refundAmount.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-5 font-bold text-slate-655 dark:text-slate-300">Remaining Amount</td>
                        {cancellationPolicy.rows.remainingAmount.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center">{renderPolicyCell(v)}</td>
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
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  Payment Policy
                  {canEdit && (
                    <button
                      onClick={() => {
                        setActiveEditTab('payment');
                        setIsAdminEditOpen(true);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors align-middle"
                      title="Edit Payment Policy"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  )}
                </h2>
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
                        <td className="p-5 font-bold text-slate-655 dark:text-slate-300">Booking Amount</td>
                        {paymentPolicy.rows.bookingAmount.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-50 dark:border-slate-800/50 bg-slate-50/20 dark:bg-slate-800/10">
                        <td className="p-5 font-bold text-slate-655 dark:text-slate-300">Rest Payment</td>
                        {paymentPolicy.rows.restPayment.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-5 font-bold text-slate-655 dark:text-slate-300">Status</td>
                        {paymentPolicy.rows.status.map((v: string, i: number) => (
                          <td key={i} className="p-5 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* FAQs Section */}
              <section id="faqs" className="scroll-mt-36">
                <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-2">
                  Frequently Asked Questions
                  {canEdit && (
                    <button
                      onClick={() => {
                        setActiveEditTab('faqs');
                        setIsAdminEditOpen(true);
                      }}
                      className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg text-slate-400 hover:text-primary transition-colors align-middle"
                      title="Edit FAQs"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  )}
                </h2>
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

            </div>

            {/* Right Column: Sticky Booking Widget */}
            <div className="hidden lg:block">
              <div className={`sticky ${canEdit ? 'top-[220px]' : 'top-[156px]'} space-y-6`}>
                <div className={`bg-white dark:bg-[#151d29] rounded-[2.5rem] shadow-2xl border border-slate-100 dark:border-slate-800/85 overflow-hidden ring-1 ring-slate-900/5 flex flex-col ${canEdit ? 'max-h-[calc(100vh-240px)]' : 'max-h-[calc(100vh-176px)]'}`}>
                  
                  {/* Top Rate details */}
                  <div className="p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 shrink-0">
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

                  {/* Controls body */}
                  <div className="p-6 space-y-4 flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-205 hover:scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
                    
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

                  {/* Actions */}
                  <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-800/80 bg-white dark:bg-[#151d29] space-y-4 shrink-0">
                    <div className="flex gap-3">
                      <a
                        href={`https://wa.me/?text=${encodeURIComponent(`I'm interested in booking the tour: ${tour.title}\n${window.location.href}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="size-14 rounded-2xl bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center transition-all shadow-md shadow-green-500/10 shrink-0"
                        title="Query on WhatsApp"
                      >
                        <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      </a>
                      <button onClick={() => setBookingModal(true)} className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-black py-4 rounded-2xl shadow-xl shadow-indigo-600/15 transition-all active:scale-95 text-base flex items-center justify-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">send</span>
                        Send Query
                      </button>
                    </div>

                    <p className="text-[10px] text-center text-slate-400 font-medium">No immediate payment required. Dynamic quotes provided instantly.</p>
                  </div>

                </div>
              </div>
            </div>
          </div>

          {/* Client Testimonials (Full Width Section) */}
          <section className="mt-16 bg-slate-50/50 dark:bg-slate-900/30 p-8 md:p-12 rounded-[2rem] border border-slate-200/60 dark:border-slate-800/50 shadow-sm">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-650 block mb-2">Reviews</span>
              <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">What Our Clients Say About Us</h2>
            </div>
            
            {/* Review Category Tags */}
            <div className="flex flex-wrap gap-2 justify-center mb-8">
              {['All', 'Stays', 'Acclimatization', 'Driver'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedReviewTag(tag);
                    setReviewIndex(0);
                  }}
                  className={`px-4 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 border ${
                    selectedReviewTag === tag
                      ? 'bg-indigo-650 text-white border-indigo-650 shadow-md shadow-indigo-650/10'
                      : 'bg-white dark:bg-[#151d29] border-slate-200 dark:border-slate-800 text-slate-650 dark:text-slate-400 hover:border-indigo-500/50'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Testimonials Grid */}
            {filteredReviews.length > 0 ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {filteredReviews.slice(reviewIndex * 3, (reviewIndex + 1) * 3).map((rev, idx) => {
                    const realIdx = reviewIndex * 3 + idx;
                    const colors = [
                      'bg-indigo-100 text-indigo-600',
                      'bg-amber-100 text-amber-600',
                      'bg-emerald-100 text-emerald-600'
                    ];
                    const avatarColor = colors[realIdx % colors.length];
                    const initials = rev.name.split(' ').map(n => n[0]).join('').toUpperCase();
                    
                    return (
                      <div key={realIdx} className="bg-white dark:bg-[#151d29] p-6 rounded-3xl border border-slate-100 dark:border-slate-855 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative min-h-[220px]">
                        <span className="material-symbols-outlined text-4xl text-indigo-500/10 absolute top-4 left-4 select-none pointer-events-none">format_quote</span>
                        
                        <div className="relative z-10 space-y-4">
                          <div className="flex text-amber-400">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <span key={i} className="material-symbols-outlined text-sm fill-current">star</span>
                            ))}
                          </div>
                          <p className="text-sm text-slate-650 dark:text-slate-350 italic font-medium leading-relaxed">
                            "{rev.text}"
                          </p>
                        </div>

                        <div className="mt-6 flex flex-col gap-4 border-t border-slate-150 dark:border-slate-800/80 pt-4">
                          <div className="flex items-center gap-3">
                            <div className={`size-10 rounded-full flex items-center justify-center font-bold text-xs ${avatarColor}`}>
                              {initials}
                            </div>
                            <div>
                              <span className="text-xs font-bold text-slate-800 dark:text-white block">{rev.name}</span>
                              <span className="text-[10px] text-slate-450 block">{rev.date || 'Verified Customer'}</span>
                            </div>
                          </div>

                          {idx === 1 && (
                            <div className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/60">
                              <div className="size-8 rounded-lg overflow-hidden shrink-0">
                                <OptimizedImage src={tour.image} alt={tour.title} className="w-full h-full object-cover" />
                              </div>
                              <div className="truncate">
                                <span className="text-[8px] font-black uppercase text-indigo-500 block leading-none">Booked Tour</span>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 truncate block mt-0.5 leading-none">{tour.title}</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Slider Controls / Page dots */}
                {Math.ceil(filteredReviews.length / 3) > 1 && (
                  <div className="flex items-center justify-center gap-4 mt-8">
                    <button
                      type="button"
                      onClick={() => setReviewIndex(prev => Math.max(0, prev - 1))}
                      disabled={reviewIndex === 0}
                      className="size-10 rounded-full border border-slate-205 dark:border-slate-800 bg-white dark:bg-[#151d29] flex items-center justify-center text-slate-550 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    
                    <div className="flex gap-2">
                      {Array.from({ length: Math.ceil(filteredReviews.length / 3) }).map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReviewIndex(idx)}
                          className={`size-2.5 rounded-full transition-all duration-300 ${
                            idx === reviewIndex ? 'bg-indigo-650 w-6' : 'bg-slate-300 dark:bg-slate-700 hover:bg-slate-400'
                          }`}
                          aria-label={`Go to slide page ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setReviewIndex(prev => Math.min(Math.ceil(filteredReviews.length / 3) - 1, prev + 1))}
                      disabled={reviewIndex === Math.ceil(filteredReviews.length / 3) - 1}
                      className="size-10 rounded-full border border-slate-205 dark:border-slate-800 bg-white dark:bg-[#151d29] flex items-center justify-center text-slate-550 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 text-xs bg-white dark:bg-[#151d29] border border-slate-100 dark:border-slate-800 rounded-3xl">
                No reviews available for this filter.
              </div>
            )}
          </section>
        </div>

        {/* Mobile Sticky Bottom Bar */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 p-4 z-40 lg:hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.1)] pb-safe-area-bottom">
          <div className="flex items-center justify-between max-w-lg mx-auto gap-4">
            <div className="shrink-0">
              <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1">
                Price per person
              </p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-xl font-black text-slate-900 dark:text-white">{formatPrice(perPersonPrice)}</p>
                {tour.originalPrice && tour.originalPrice > activeOccupancy.price && (
                  <span className="text-[11px] text-slate-400 line-through">{formatPriceCompact(perPersonOriginalPrice)}</span>
                )}
              </div>
              <p className="text-[9px] text-slate-500 font-bold">
                Total: {formatPrice(calculateTotal())}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-1 justify-end">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`I'm interested in booking the tour: ${tour.title}\n${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="size-11 rounded-xl bg-[#25D366] hover:bg-[#20ba59] text-white flex items-center justify-center transition-all shadow-md shrink-0"
                title="Query on WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
              <button
                onClick={() => setBookingModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3.5 rounded-xl font-bold shadow-lg shadow-indigo-600/10 active:scale-95 transition-all text-xs uppercase tracking-wider"
              >
                Book Now
              </button>
            </div>
          </div>
        </div>

        {/* Package Edit Modal */}
        {isAdminEditOpen && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
            <div className="bg-white dark:bg-[#151d29] w-full max-w-5xl rounded-[2rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] border border-slate-100 dark:border-slate-800 animate-in zoom-in-95">
              
              {/* Header */}
              <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-900/50 shrink-0">
                <div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                    <span className="material-symbols-outlined text-primary">edit_note</span>
                    Quick Edit Package
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">Quickly edit package details and policies. Changes are synced with the database.</p>
                </div>
                <button
                  onClick={() => setIsAdminEditOpen(false)}
                  className="p-1.5 text-slate-400 hover:text-slate-650 dark:hover:text-white hover:bg-slate-150 dark:hover:bg-slate-800 rounded-full transition-all"
                  aria-label="Close Edit Modal"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Sidebar + Form Panel body */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Tabs Sidebar */}
                <div className="w-64 bg-slate-50 dark:bg-slate-900/30 border-r border-slate-150 dark:border-slate-800 p-4 space-y-1.5 overflow-y-auto">
                  {[
                    { id: 'info', label: 'Info & Overview', icon: 'info' },
                    { id: 'settings', label: 'Marketing & Settings', icon: 'settings' },
                    { id: 'media', label: 'Media & Add-ons', icon: 'photo_library' },
                    { id: 'ageLimits', label: 'Age Limits', icon: 'child_care' },
                    { id: 'cancellation', label: 'Cancellation Policy', icon: 'event_busy' },
                    { id: 'payment', label: 'Payment Policy', icon: 'payments' },
                    { id: 'inclusions', label: 'Inclusions & Exclusions', icon: 'fact_check' },
                    { id: 'faqs', label: 'FAQs', icon: 'quiz' },
                    { id: 'itinerary', label: 'Itinerary Days', icon: 'map' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveEditTab(tab.id as any)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider text-left transition-all ${
                        activeEditTab === tab.id
                          ? 'bg-primary text-white shadow-md shadow-primary/20'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Right Form panel */}
                <div className="flex-1 overflow-y-auto p-6 md:p-8">
                  <form onSubmit={handleSaveAll} className="space-y-6">
                    {activeEditTab === 'info' && (
                      <div className="animate-in fade-in duration-200 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Package Title</label>
                            <input
                              required
                              type="text"
                              value={editForm.title}
                              onChange={e => setEditForm({ ...editForm, title: e.target.value })}
                              className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Location</label>
                            <select
                              required
                              value={editForm.location}
                              onChange={e => setEditForm({ ...editForm, location: e.target.value })}
                              className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                            >
                              <option value="">Select Location</option>
                              {masterLocations.map((loc) => (
                                <option key={loc.id} value={loc.id}>{loc.name}</option>
                              ))}
                            </select>
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Duration (Days)</label>
                            <input
                              required
                              type="number"
                              min="1"
                              value={editForm.days}
                              onChange={e => setEditForm({ ...editForm, days: parseInt(e.target.value) || 1 })}
                              className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Price (₹)</label>
                            <input
                              required
                              type="number"
                              min="0"
                              value={editForm.price}
                              onChange={e => setEditForm({ ...editForm, price: parseInt(e.target.value) || 0 })}
                              className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Strikethrough Price (₹) (Optional)</label>
                            <input
                              type="number"
                              min="0"
                              value={editForm.originalPrice || ''}
                              onChange={e => setEditForm({ ...editForm, originalPrice: parseInt(e.target.value) || 0 })}
                              className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Validity Date</label>
                            <input
                              type="date"
                              value={editForm.validityDate ? editForm.validityDate.split('T')[0] : ''}
                              onChange={e => setEditForm({ ...editForm, validityDate: e.target.value })}
                              className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                            />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Short Description</label>
                          <input
                            type="text"
                            value={editForm.description}
                            onChange={e => setEditForm({ ...editForm, description: e.target.value })}
                            className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                            placeholder="Brief description for search listings..."
                          />
                        </div>
                        <div className="space-y-1">
                          <ImageUpload
                            value={editForm.image}
                            onChange={url => setEditForm(prev => ({ ...prev, image: url }))}
                            label="Cover Image"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Full Overview</label>
                          <textarea
                            required
                            value={editForm.overview}
                            onChange={e => setEditForm({ ...editForm, overview: e.target.value })}
                            className="w-full h-40 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white resize-y"
                          />
                        </div>
                      </div>
                    )}

                    {activeEditTab === 'settings' && (
                      <div className="animate-in fade-in duration-200 space-y-6">
                        <div>
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">Marketing & Display Settings</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Status (Visibility)</label>
                              <select
                                value={editForm.status}
                                onChange={e => setEditForm({ ...editForm, status: e.target.value as any })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                              >
                                <option value="Active">Active (Visible)</option>
                                <option value="Inactive">Inactive (Hidden)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Group Size</label>
                              <input
                                type="text"
                                value={editForm.groupSize}
                                onChange={e => setEditForm({ ...editForm, groupSize: e.target.value })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                                placeholder="e.g. Max 10"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Badge Tag</label>
                              <input
                                type="text"
                                value={editForm.tag}
                                onChange={e => setEditForm({ ...editForm, tag: e.target.value })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                                placeholder="e.g. Best Seller"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Badge Color Class</label>
                              <select
                                value={editForm.tagColor}
                                onChange={e => setEditForm({ ...editForm, tagColor: e.target.value })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                              >
                                <option value="bg-blue-500 text-white">Blue</option>
                                <option value="bg-green-500 text-white">Green</option>
                                <option value="bg-red-500 text-white">Red</option>
                                <option value="bg-yellow-400 text-yellow-900">Yellow</option>
                                <option value="bg-purple-500 text-white">Purple</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Theme (Collection)</label>
                              <select
                                value={editForm.theme}
                                onChange={e => setEditForm({ ...editForm, theme: e.target.value })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                              >
                                <option value="">Select a Collection</option>
                                {(cmsGallery || []).map(item => (
                                  <option key={item.id} value={item.title}>{item.title}</option>
                                ))}
                                <option value="Other">Other</option>
                              </select>
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">Inventory & Countdown Timer</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Remaining Seats Limit (blank = unlimited)</label>
                              <input
                                type="number"
                                min="0"
                                value={editForm.remainingSeats}
                                onChange={e => setEditForm({ ...editForm, remainingSeats: e.target.value })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                                placeholder="e.g. 15"
                              />
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Offer End Date &amp; Time (UTC)</label>
                              <input
                                type="datetime-local"
                                value={editForm.offerEndTime}
                                onChange={e => setEditForm({ ...editForm, offerEndTime: e.target.value })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                              />
                            </div>
                          </div>
                        </div>

                        <div>
                          <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">B2B Partner Commission Overrides</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1">
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Commission Type</label>
                              <select
                                value={editForm.partnerCommissionType}
                                onChange={e => setEditForm({ ...editForm, partnerCommissionType: e.target.value as any })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                              >
                                <option value="Percentage">Percentage (%)</option>
                                <option value="Flat_Amount">Flat Amount (₹)</option>
                              </select>
                            </div>
                            <div className="space-y-1">
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Commission Value (blank for default)</label>
                              <input
                                type="number"
                                min="0"
                                value={editForm.partnerCommissionValue}
                                onChange={e => setEditForm({ ...editForm, partnerCommissionValue: e.target.value })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                                placeholder="e.g. 10 or 1500"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {activeEditTab === 'media' && (
                      <div className="animate-in fade-in duration-200 space-y-8">
                        <div>
                          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350">Package Photo Gallery</h3>
                            <div>
                              <input
                                type="file"
                                id="gallery-file-upload"
                                accept="image/*"
                                className="hidden"
                                onChange={e => {
                                  const file = e.target.files?.[0];
                                  if (file) handleGalleryUpload(file);
                                }}
                              />
                              <button
                                type="button"
                                onClick={() => document.getElementById('gallery-file-upload')?.click()}
                                className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 animate-in fade-in duration-300"
                              >
                                <span className="material-symbols-outlined text-[16px]">add_photo_alternate</span>
                                Add Photo
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {editForm.gallery.map((img, idx) => (
                              <div key={idx} className="relative group rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 aspect-video bg-slate-100 dark:bg-slate-900 shadow-sm transition-all hover:scale-[1.02]">
                                <img src={img} alt={`Gallery ${idx + 1}`} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                  {idx > 0 && (
                                    <button
                                      type="button"
                                      onClick={() => moveGalleryImage(idx, 'left')}
                                      className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/40 transition-colors"
                                      title="Move Left"
                                    >
                                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => removeGalleryImage(idx)}
                                    className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                                    title="Delete Photo"
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </button>
                                  {idx < editForm.gallery.length - 1 && (
                                    <button
                                      type="button"
                                      onClick={() => moveGalleryImage(idx, 'right')}
                                      className="p-1.5 bg-white/20 text-white rounded-lg hover:bg-white/40 transition-colors"
                                      title="Move Right"
                                    >
                                      <span className="material-symbols-outlined text-sm">arrow_forward</span>
                                    </button>
                                  )}
                                </div>
                                <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/55 text-white text-[9px] font-bold rounded">
                                  #{idx + 1}
                                </div>
                              </div>
                            ))}
                            {editForm.gallery.length === 0 && (
                              <div className="col-span-full text-center py-10 text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-3xl">add_photo_alternate</span>
                                No gallery images uploaded yet.
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <div className="flex justify-between items-center mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
                            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350">Package Add-ons</h3>
                            <button
                              type="button"
                              onClick={() => setEditForm(prev => ({
                                ...prev,
                                addons: [...prev.addons, { id: `addon-${Date.now()}`, label: '', price: 0 }]
                              }))}
                              className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95"
                            >
                              <span className="material-symbols-outlined text-[16px]">add_circle</span>
                              Add Add-on
                            </button>
                          </div>

                          <div className="space-y-3">
                            {editForm.addons.map((addon, idx) => (
                              <div key={addon.id} className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-slate-50 dark:bg-slate-850/40 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:border-primary/20">
                                <div className="flex-1 w-full space-y-1">
                                  <label className="text-[10px] font-bold text-slate-450 uppercase pl-1">Add-on Label</label>
                                  <input
                                    required
                                    type="text"
                                    placeholder="e.g. Include Flights"
                                    value={addon.label}
                                    onChange={e => {
                                      const u = [...editForm.addons];
                                      u[idx] = { ...addon, label: e.target.value };
                                      setEditForm(prev => ({ ...prev, addons: u }));
                                    }}
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                  />
                                </div>
                                <div className="w-full sm:w-44 space-y-1">
                                  <label className="text-[10px] font-bold text-slate-450 uppercase pl-1">Price (₹)</label>
                                  <input
                                    required
                                    type="number"
                                    placeholder="Price"
                                    min="0"
                                    value={addon.price}
                                    onChange={e => {
                                      const u = [...editForm.addons];
                                      u[idx] = { ...addon, price: parseInt(e.target.value) || 0 };
                                      setEditForm(prev => ({ ...prev, addons: u }));
                                    }}
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                  />
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setEditForm(prev => ({
                                    ...prev,
                                    addons: prev.addons.filter((_, i) => i !== idx)
                                  }))}
                                  className="mt-5 sm:mt-4 p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                  title="Delete Add-on"
                                >
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                              </div>
                            ))}
                            {editForm.addons.length === 0 && (
                              <div className="text-center py-10 text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-3xl">add_circle</span>
                                No custom add-ons specified.
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeEditTab === 'ageLimits' && (
                      <div className="animate-in fade-in duration-200 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Age Tiers</h4>
                          <button
                            type="button"
                            onClick={addAgeLimitTier}
                            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span> Add Tier
                          </button>
                        </div>
                        
                        <div className="space-y-3">
                          {editForm.ageLimits.map((tier, idx) => (
                            <div key={idx} className="flex flex-col sm:flex-row items-center gap-3 p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                              <div className="flex-1 w-full space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Tier Type</label>
                                <input
                                  required
                                  type="text"
                                  placeholder="e.g. Infant"
                                  value={tier.type}
                                  onChange={e => handleAgeLimitChange(idx, 'type', e.target.value)}
                                  className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                />
                              </div>
                              <div className="flex-1 w-full space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Age Range</label>
                                <input
                                  required
                                  type="text"
                                  placeholder="e.g. 0-2 Years"
                                  value={tier.age}
                                  onChange={e => handleAgeLimitChange(idx, 'age', e.target.value)}
                                  className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                />
                              </div>
                              <div className="flex-1 w-full space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Pricing Text</label>
                                <input
                                  required
                                  type="text"
                                  placeholder="e.g. Free"
                                  value={tier.priceText}
                                  onChange={e => handleAgeLimitChange(idx, 'priceText', e.target.value)}
                                  className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeAgeLimitTier(idx)}
                                className="mt-5 sm:mt-4 p-2 text-slate-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                title="Delete Tier"
                              >
                                <span className="material-symbols-outlined text-[20px]">delete</span>
                              </button>
                            </div>
                          ))}
                          {editForm.ageLimits.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-xs">
                              No age tiers specified. Click "Add Tier" to define age limits.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeEditTab === 'cancellation' && (
                      <div className="animate-in fade-in duration-200 space-y-6">
                        <div>
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Cancellation Policy Columns</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {(() => {
                              const cancelHeaders = [...(editForm.cancellationPolicy?.headers || [])];
                              while (cancelHeaders.length < 4) cancelHeaders.push(`Column ${cancelHeaders.length + 1}`);
                              const cancelCharges = [...(editForm.cancellationPolicy?.rows?.cancellationCharge || [])];
                              while (cancelCharges.length < 4) cancelCharges.push('');
                              const refundAmounts = [...(editForm.cancellationPolicy?.rows?.refundAmount || [])];
                              while (refundAmounts.length < 4) refundAmounts.push('');
                              const remainingAmounts = [...(editForm.cancellationPolicy?.rows?.remainingAmount || [])];
                              while (remainingAmounts.length < 4) remainingAmounts.push('');

                              return cancelHeaders.map((header, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Timeline Header</label>
                                    <input
                                      required
                                      type="text"
                                      value={header}
                                      onChange={e => handleCancellationHeaderChange(idx, e.target.value)}
                                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Charge</label>
                                    <input
                                      required
                                      type="text"
                                      value={cancelCharges[idx]}
                                      onChange={e => handleCancellationRowChange('cancellationCharge', idx, e.target.value)}
                                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Refund Amount</label>
                                    <input
                                      required
                                      type="text"
                                      value={refundAmounts[idx]}
                                      onChange={e => handleCancellationRowChange('refundAmount', idx, e.target.value)}
                                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Remaining</label>
                                    <input
                                      required
                                      type="text"
                                      value={remainingAmounts[idx]}
                                      onChange={e => handleCancellationRowChange('remainingAmount', idx, e.target.value)}
                                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                    />
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Policy Guidelines</label>
                          <textarea
                            value={editForm.cancellationPolicy.guidelines || ''}
                            onChange={e => setEditForm({
                              ...editForm,
                              cancellationPolicy: {
                                ...editForm.cancellationPolicy,
                                guidelines: e.target.value
                              }
                            })}
                            className="w-full h-32 rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white resize-y"
                            placeholder="Cancellation guidelines line-by-line..."
                          />
                        </div>
                      </div>
                    )}

                    {activeEditTab === 'payment' && (
                      <div className="animate-in fade-in duration-200 space-y-6">
                        <div>
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-4">Payment Policy Columns</h4>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {(() => {
                              const payHeaders = [...(editForm.paymentPolicy?.headers || [])];
                              while (payHeaders.length < 4) payHeaders.push(`Column ${payHeaders.length + 1}`);
                              const bookingAmounts = [...(editForm.paymentPolicy?.rows?.bookingAmount || [])];
                              while (bookingAmounts.length < 4) bookingAmounts.push('');
                              const restPayments = [...(editForm.paymentPolicy?.rows?.restPayment || [])];
                              while (restPayments.length < 4) restPayments.push('');
                              const statuses = [...(editForm.paymentPolicy?.rows?.status || [])];
                              while (statuses.length < 4) statuses.push('');

                              return payHeaders.map((header, idx) => (
                                <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Timeline Header</label>
                                    <input
                                      required
                                      type="text"
                                      value={header}
                                      onChange={e => handlePaymentHeaderChange(idx, e.target.value)}
                                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Booking Amount</label>
                                    <input
                                      required
                                      type="text"
                                      value={bookingAmounts[idx]}
                                      onChange={e => handlePaymentRowChange('bookingAmount', idx, e.target.value)}
                                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Rest Payment</label>
                                    <input
                                      required
                                      type="text"
                                      value={restPayments[idx]}
                                      onChange={e => handlePaymentRowChange('restPayment', idx, e.target.value)}
                                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Status</label>
                                    <input
                                      required
                                      type="text"
                                      value={statuses[idx]}
                                      onChange={e => handlePaymentRowChange('status', idx, e.target.value)}
                                      className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                    />
                                  </div>
                                </div>
                              ));
                            })()}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeEditTab === 'inclusions' && (
                      <div className="animate-in fade-in duration-200 grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* Inclusions */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-green-700 dark:text-green-400">Inclusions</h4>
                            <button
                              type="button"
                              onClick={addInclusion}
                              className="px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">add</span> Add Inclusion
                            </button>
                          </div>
                          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                            {editForm.included.map((inc, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  required
                                  type="text"
                                  value={inc}
                                  onChange={e => handleInclusionChange(idx, e.target.value)}
                                  className="flex-1 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                  placeholder="e.g. Stay at 4-star hotel"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeInclusion(idx)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-550 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            ))}
                            {editForm.included.length === 0 && (
                              <div className="text-center py-8 text-slate-400 text-xs">No inclusions added.</div>
                            )}
                          </div>
                        </div>

                        {/* Exclusions */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-red-700 dark:text-red-400">Exclusions</h4>
                            <button
                              type="button"
                              onClick={addExclusion}
                              className="px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-[16px]">add</span> Add Exclusion
                            </button>
                          </div>
                          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-2">
                            {editForm.notIncluded.map((exc, idx) => (
                              <div key={idx} className="flex items-center gap-2">
                                <input
                                  required
                                  type="text"
                                  value={exc}
                                  onChange={e => handleExclusionChange(idx, e.target.value)}
                                  className="flex-1 rounded-lg border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                  placeholder="e.g. Any personal expenses"
                                />
                                <button
                                  type="button"
                                  onClick={() => removeExclusion(idx)}
                                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-550 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                            ))}
                            {editForm.notIncluded.length === 0 && (
                              <div className="text-center py-8 text-slate-400 text-xs">No exclusions added.</div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeEditTab === 'faqs' && (
                      <div className="animate-in fade-in duration-200 space-y-4">
                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">FAQs ({editForm.faqs.length})</h4>
                          <button
                            type="button"
                            onClick={addFaq}
                            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span> Add FAQ
                          </button>
                        </div>
                        
                        <div className="space-y-4 max-h-[55vh] overflow-y-auto pr-2">
                          {editForm.faqs.map((faq, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 relative group">
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Question</label>
                                <input
                                  required
                                  type="text"
                                  value={faq.q}
                                  onChange={e => handleFaqChange(idx, 'q', e.target.value)}
                                  className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                  placeholder="e.g. What is included in meals?"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Answer</label>
                                <textarea
                                  required
                                  value={faq.a}
                                  onChange={e => handleFaqChange(idx, 'a', e.target.value)}
                                  className="w-full h-20 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white resize-y"
                                  placeholder="Answer text..."
                                />
                              </div>
                              <button
                                type="button"
                                onClick={() => removeFaq(idx)}
                                className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100 sm:opacity-100"
                                title="Delete FAQ"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            </div>
                          ))}
                          {editForm.faqs.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-xs">
                              No FAQs defined. Click "Add FAQ" to get started.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {activeEditTab === 'itinerary' && (
                      <div className="animate-in fade-in duration-200 space-y-4">
                        <div className="p-4 bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/35 rounded-2xl mb-4 flex gap-3">
                          <span className="material-symbols-outlined text-indigo-500 shrink-0">info</span>
                          <div>
                            <h5 className="text-xs font-bold text-indigo-700 dark:text-indigo-400 uppercase">Detailed Itinerary Builder Available</h5>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed font-medium">
                              This panel is for simple text adjustments to day titles and descriptions. To add/remove interactive elements like hotels, cabs, activities, flight options, net-cost pricing, or customize timelines, please use the full <button type="button" onClick={() => { setIsAdminEditOpen(false); navigate(`/admin/itinerary-builder?edit=${tour.id}`); }} className="font-bold text-primary hover:underline">Itinerary Builder</button>.
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mb-2">
                          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">Days List ({editForm.itinerary.length})</h4>
                          <button
                            type="button"
                            onClick={addItineraryDay}
                            className="px-3 py-1.5 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[16px]">add</span> Add Day
                          </button>
                        </div>

                        <div className="space-y-4 max-h-[45vh] overflow-y-auto pr-2">
                          {editForm.itinerary.map((item, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 relative group">
                              <div className="flex items-center justify-between">
                                <span className="px-2.5 py-1 bg-slate-205 dark:bg-slate-700 rounded-lg text-slate-800 dark:text-slate-200 text-[10px] font-black uppercase">
                                  Day {item.day || idx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => removeItineraryDay(idx)}
                                  className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                                  title="Delete Day"
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </div>
                              
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Day Title</label>
                                <input
                                  required
                                  type="text"
                                  value={item.title}
                                  onChange={e => handleItineraryChange(idx, 'title', e.target.value)}
                                  className="w-full rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                  placeholder="e.g. Arrival in Leh"
                                />
                              </div>
                              <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase">Day Description</label>
                                <textarea
                                  required
                                  value={item.desc}
                                  onChange={e => handleItineraryChange(idx, 'desc', e.target.value)}
                                  className="w-full h-24 rounded-lg border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-medium outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white resize-y"
                                  placeholder="Day summary/description..."
                                />
                              </div>
                            </div>
                          ))}
                          {editForm.itinerary.length === 0 && (
                            <div className="text-center py-8 text-slate-400 text-xs">
                              No days in itinerary. Click "Add Day" to add itinerary days.
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </form>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAdminEditOpen(false)}
                  className="px-5 py-2.5 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-black uppercase tracking-wider rounded-xl transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveAll()}
                  className="px-6 py-2.5 bg-primary hover:bg-primary-dark text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-lg shadow-primary/20 transition-all active:scale-95"
                >
                  Save Changes
                </button>
              </div>

            </div>
          </div>
        )}
      </div >
    </>
  );
};