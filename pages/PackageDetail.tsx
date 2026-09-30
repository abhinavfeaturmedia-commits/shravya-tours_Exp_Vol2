import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Lead, Package, CommissionType, PackageVideo } from '../types';
import { SEO } from '../components/ui/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { toast } from '../components/ui/Toast';
import { TravelerSelector } from '../components/ui/TravelerSelector';
import { PhoneInput } from '../components/ui/PhoneInput';
import { api } from '../src/lib/api';
import { ImageUpload } from '../components/ui/ImageUpload';
import { formatPrice, formatPriceCompact, getLocationName, formatTripDuration, getPackageBasePax, getPackageRoute, formatNightsDaysCode, getPackageReviewCount, getPackagePricingInfo } from '../utils/packageUtils';
import { getEmbedUrl, getVideoThumbnail } from '../utils/videoUtils';
import { copyToClipboard } from '../utils/clipboard';
import { useCustomerAuth, CUSTOMER_JWT_KEY } from '../context/CustomerAuthContext';
import { BorderBeam } from 'border-beam';

export const PackageDetail: React.FC = () => {
  const { id: rawId } = useParams<{ id: string }>();
  const id = useMemo(() => (rawId ? rawId.split('?')[0] : ''), [rawId]);
  const navigate = useNavigate();
  const { packages, masterLocations, addLead, trendingDestinations, updatePackage, cmsGallery, cmsPosts } = useData();
  const { hasPermission } = useAuth();
  
  const { customer, isAuthenticated } = useCustomerAuth();
  const [isWishlisted, setIsWishlisted] = useState(false);

  useEffect(() => {
    const hashQuery = window.location.hash.includes('?') ? window.location.hash.split('?')[1] : '';
    const params = new URLSearchParams(window.location.search || hashQuery);
    const partnerRef = params.get('ref');
    if (partnerRef) {
      sessionStorage.setItem('shravya_partner_ref', partnerRef);
      sessionStorage.setItem('shrawello_partner_ref', partnerRef);
      localStorage.setItem('shravya_ref_partner', partnerRef);
      localStorage.setItem('shravya_ref_partner_time', String(Date.now()));
    }
  }, [rawId]);

  useEffect(() => {
    const checkWishlistStatus = async () => {
      if (!isAuthenticated || !id) return;
      try {
        const token = localStorage.getItem(CUSTOMER_JWT_KEY);
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/customer/wishlist`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          const wishlisted = data.some((p: any) => p.id === id);
          setIsWishlisted(wishlisted);
        }
      } catch (err) {
        console.error(err);
      }
    };
    checkWishlistStatus();
  }, [isAuthenticated, id]);

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/customer/login');
      return;
    }
    try {
      const token = localStorage.getItem(CUSTOMER_JWT_KEY);
      const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/customer/wishlist/toggle`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ packageId: id })
      });
      if (res.ok) {
        const data = await res.json();
        setIsWishlisted(data.added);
        toast.success(data.added ? 'Added to wishlist!' : 'Removed from wishlist!');
      }
    } catch (err) {
      console.error(err);
    }
  };

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
  const [isAdminMenuOpen, setIsAdminMenuOpen] = useState(false);
  const adminMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (adminMenuRef.current && !adminMenuRef.current.contains(event.target as Node)) {
        setIsAdminMenuOpen(false);
      }
    };
    if (isAdminMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdminMenuOpen]);

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
    gallery: [] as string[],
    pricingMode: 'group' as 'group' | 'per_person',
    videos: [] as PackageVideo[]
  });

  const [guests, setGuests] = useState(() => {
    const initialTour = packages?.find(p => p.id === id);
    const basePax = initialTour ? getPackageBasePax(initialTour) : 2;
    return `${basePax} Adult${basePax > 1 ? 's' : ''}`;
  });
  const [bookingModal, setBookingModal] = useState(false);
  const [bookingData, setBookingData] = useState({
    name: '',
    email: '',
    phone: '',
    isWhatsappSame: true,
    whatsapp: '',
    date: ''
  });

  useEffect(() => {
    if (bookingModal) {
      const todayStr = new Date().toISOString().split('T')[0];
      setBookingData(prev => ({
        ...prev,
        date: (prev.date && prev.date >= todayStr) ? prev.date : todayStr,
        name: (isAuthenticated && customer?.name) ? customer.name : prev.name,
        email: (isAuthenticated && customer?.email) ? customer.email : prev.email,
        phone: (isAuthenticated && customer?.phone) ? customer.phone : prev.phone,
        whatsapp: (isAuthenticated && customer?.whatsapp) ? customer.whatsapp : (customer?.phone || prev.whatsapp),
        isWhatsappSame: (isAuthenticated && customer?.whatsapp) ? customer.whatsapp === customer.phone : prev.isWhatsappSame
      }));
    }
  }, [bookingModal, isAuthenticated, customer]);

  // Customization State
  const [selectedAddons, setSelectedAddons] = useState<string[]>([]);
  const [selectedOccupancy, setSelectedOccupancy] = useState('double');
  const [selectedHotelTier, setSelectedHotelTier] = useState<'standard' | 'deluxe' | 'luxury'>('standard');

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
  const [isOverviewExpanded, setIsOverviewExpanded] = useState(false);
  const [isInclusionsExpanded, setIsInclusionsExpanded] = useState(false);
  const [activePricingStar, setActivePricingStar] = useState<number>(3);
  const [videoCarouselIdx, setVideoCarouselIdx] = useState(0);

  // Offer countdown
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [offerExpired, setOfferExpired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const rawTour = packages.find(p => p.id === id);

  // Direct API fetch for this specific package.
  // This is the PRIMARY data source when the page is opened fresh via an affiliate link
  // and DataContext hasn't yet populated packages[] from the bulk fetch.
  const [fullPackageData, setFullPackageData] = useState<Package | null>(null);
  const [directFetchDone, setDirectFetchDone] = useState(false);
  useEffect(() => {
    if (!id) return;
    setDirectFetchDone(false);
    api.getPackageById(id)
      .then(full => {
        if (full) setFullPackageData(full);
      })
      .catch(console.warn)
      .finally(() => setDirectFetchDone(true));
  }, [id]);

  // Merge: rawTour (from DataContext bulk list) + fullPackageData (from direct API fetch).
  // Use fullPackageData as primary fallback when rawTour isn't available yet.
  const tour = useMemo(() => {
    if (rawTour) {
      return { ...rawTour, builderData: fullPackageData?.builderData ?? rawTour.builderData };
    }
    // Fallback: direct API fetch result (handles fresh new-window opens via affiliate links)
    return fullPackageData ?? null;
  }, [rawTour, fullPackageData]);

  // Auto-synchronize default guests count to the package's canonical groupSize once tour loads
  const initializedPkgIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (tour?.id && initializedPkgIdRef.current !== tour.id) {
      initializedPkgIdRef.current = tour.id;
      const basePax = getPackageBasePax(tour);
      setGuests(`${basePax} Adult${basePax > 1 ? 's' : ''}`);
    }
  }, [tour?.id, tour?.groupSize]);

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

  const HOTEL_TIERS = [
    { id: 'standard', name: 'Standard', stars: '3★', hotelType: 'Deluxe Cozy Room', multiplier: 1.0 },
    { id: 'deluxe', name: 'Deluxe', stars: '4★', hotelType: 'Premium View Hotel', multiplier: 1.15 },
    { id: 'luxury', name: 'Luxury', stars: '5★', hotelType: 'Executive 5★ Resort', multiplier: 1.35 },
  ];

  const currentHotelTier = useMemo(() => {
    return HOTEL_TIERS.find(t => t.id === selectedHotelTier) || HOTEL_TIERS[0];
  }, [selectedHotelTier]);

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
        gallery: tour.gallery || [],
        pricingMode: tour.pricingMode || 'group',
        videos: tour.videos || []
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
        pricingMode: editForm.pricingMode,
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
        videos: editForm.videos,
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
  const TABS = useMemo(() => {
    const list = [
      { id: 'overview', label: 'Overview' },
      { id: 'itinerary', label: 'Itinerary' },
      { id: 'inclusions', label: 'Inclusions & Exclusions' },
      { id: 'cancellation', label: 'Cancellation Policy' },
      { id: 'payment', label: 'Payment Policy' },
      { id: 'things-to-pack', label: 'Things To Pack' },
      { id: 'faqs', label: 'FAQs' }
    ];
    if (tour?.videos && tour.videos.length > 0) {
      list.push({ id: 'videos', label: 'Videos & Reels' });
    }
    return list;
  }, [tour?.videos]);

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
    // Show skeleton while the direct API fetch is in progress
    // This handles fresh new-window opens (affiliate links) before DataContext finishes loading
    if (!directFetchDone) {
      return (
        <div className="min-h-screen pt-28 pb-16 px-4 md:px-8 max-w-[1440px] mx-auto">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-4"></div>
          <div className="h-12 w-3/4 bg-slate-200 dark:bg-slate-800 rounded animate-pulse mb-8"></div>
          <div className="h-[500px] w-full bg-slate-200 dark:bg-slate-800 rounded-[2rem] animate-pulse"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
            {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl animate-pulse" />)}
          </div>
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

  const getOccupancyCapacity = (id: string, label: string): number => {
    const normalizedId = id.toLowerCase();
    const normalizedLabel = label.toLowerCase();
    if (normalizedId.includes('single') || normalizedLabel.includes('single')) return 1;
    if (normalizedId.includes('triple') || normalizedLabel.includes('triple')) return 3;
    if (normalizedId.includes('quad') || normalizedLabel.includes('quad')) return 4;
    return 2; // Default double sharing
  };

  const calculateTotal = () => {
    const { adults, children } = parseGuestCounts();
    const isGroup = !(tour.pricingMode && String(tour.pricingMode).toLowerCase().includes('person'));
    const basePax = getPackageBasePax(tour);
    const totalGuests = adults + children;
    const effectiveOccPrice = Math.round(activeOccupancy.price * currentHotelTier.multiplier);

    if (isGroup) {
      const packageMultiplier = Math.max(1, Math.ceil(totalGuests / (basePax > 0 ? basePax : 2)));
      const tourBasePrice = effectiveOccPrice * packageMultiplier;
      return Math.round(tourBasePrice + getAddonsTotal());
    } else {
      const adultCost = adults * effectiveOccPrice;
      const childCost = children * Math.round(effectiveOccPrice * 0.85);
      return Math.round(adultCost + childCost + getAddonsTotal());
    }
  };

  const calculateOriginalTotal = () => {
    if (!tour.originalPrice) return 0;
    const { adults, children } = parseGuestCounts();
    const isGroup = !(tour.pricingMode && String(tour.pricingMode).toLowerCase().includes('person'));
    const basePax = getPackageBasePax(tour);
    const totalGuests = adults + children;
    const occupancyRatio = (tour.price && Number(tour.price) > 0) ? (activeOccupancy.price / Number(tour.price)) : 1;
    const adjustedOriginalRate = Number(tour.originalPrice) * occupancyRatio * currentHotelTier.multiplier;

    if (isGroup) {
      const packageMultiplier = Math.max(1, Math.ceil(totalGuests / (basePax > 0 ? basePax : 2)));
      return Math.round((adjustedOriginalRate * packageMultiplier) + getAddonsTotal());
    } else {
      const adultCost = adults * adjustedOriginalRate;
      const childCost = children * Math.round(adjustedOriginalRate * 0.85);
      return Math.round(adultCost + childCost + getAddonsTotal());
    }
  };

  const headcount = getPaxHeadcount();
  const perPersonPrice = Math.round(calculateTotal() / (headcount > 0 ? headcount : 1));
  const perPersonOriginalPrice = Math.round(calculateOriginalTotal() / (headcount > 0 ? headcount : 1));

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
        startDate: bookingData.date || undefined,
        endDate: (() => {
          if (!bookingData.date) return undefined;
          const start = new Date(bookingData.date);
          if (isNaN(start.getTime())) return undefined;
          const days = typeof tour.days === 'number' && tour.days > 1 ? tour.days - 1 : 0;
          start.setDate(start.getDate() + days);
          return start.toISOString().split('T')[0];
        })(),
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

      const res: any = await addLead(newLead as Lead);
      setBookingModal(false);

      const displayRefId = res?.formattedLeadNumber || (res?.leadNumber ? `LD-${String(res.leadNumber).padStart(4, '0')}` : (res?.leadId || referenceId));

      navigate('/booking-confirmation', {
        state: {
          referenceId: displayRefId,
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

  const handleGetPdf = () => {
    window.print();
  };

  const starMultiplier = useMemo(() => {
    if (activePricingStar === 4) return 1.15;
    if (activePricingStar === 5) return 1.35;
    return 1.0;
  }, [activePricingStar]);

  const base2PaxPrice = Math.round((tour?.price || 18180) * starMultiplier);
  const base4PaxPrice = Math.round(base2PaxPrice * 0.88);
  const noCostEmi = Math.round(base2PaxPrice / 12);

  const thingsToPackList = useMemo(() => {
    if (tour?.builderData?.thingsToPack && tour.builderData.thingsToPack.length > 0) {
      return tour.builderData.thingsToPack;
    }
    if (isHighAltitude) {
      return [
        {
          category: 'Clothing & Warmth',
          icon: 'checkroom',
          items: [
            'Thermal base layers (top & bottom)',
            'Windproof and waterproof heavy jacket / fleece',
            'Comfortable quick-dry trekking pants & t-shirts',
            'Woolen beanie, neck warmer, and insulated gloves',
            '3-4 pairs of woolen socks & cotton socks'
          ]
        },
        {
          category: 'Footwear',
          icon: 'hiking',
          items: [
            'Sturdy, comfortable trekking/hiking shoes with good grip',
            'Lightweight camp shoes or slip-on sandals for hotels',
            'Extra cushioned inner soles for comfort'
          ]
        },
        {
          category: 'Documents & Cash',
          icon: 'badge',
          items: [
            'Original Government Photo ID (Aadhaar Card / Passport)',
            '4-6 printed passport-sized photographs',
            'Physical printouts of booking vouchers & permits',
            'Cash for remote areas (ATMs are scarce beyond Leh)'
          ]
        },
        {
          category: 'Health, Electronics & Sun Protection',
          icon: 'medical_services',
          items: [
            'Diamox / AMS medication (consult physician before use)',
            'High SPF Sunscreen (SPF 50+) and protective lip balm',
            'UV-rated polarized sunglasses (essential for snow glare)',
            'Power bank (20,000 mAh recommended for cold battery drain)',
            'Personal first aid kit with pain relief & electrolyte packets'
          ]
        }
      ];
    }
    return [
      {
        category: 'Clothing & Wearables',
        icon: 'checkroom',
        items: [
          'Lightweight cotton t-shirts and breathable shirts',
          'Comfortable trousers, chinos, or travel shorts',
          'Light sweater or cardigan for air-conditioned transit',
          'Sun hat / cap and polarized sunglasses'
        ]
      },
      {
        category: 'Footwear',
        icon: 'hiking',
        items: [
          'Comfortable walking shoes or lightweight sneakers',
          'Casual sandals or flip-flops for leisure walks',
          'Breathable cotton socks'
        ]
      },
      {
        category: 'Documents & Money',
        icon: 'badge',
        items: [
          'Original Government Photo ID (Aadhaar / Passport / Voter ID)',
          'Digital & printed copies of hotel & flight vouchers',
          'Credit/debit cards and backup cash for local markets'
        ]
      },
      {
        category: 'Personal Care & Electronics',
        icon: 'medical_services',
        items: [
          'Personal medications and basic first aid travel pouch',
          'Sunscreen, insect repellent, and personal toiletries',
          'Phone charger, universal adapter, and power bank'
        ]
      }
    ];
  }, [tour, isHighAltitude]);

  const relatedTrips = useMemo(() => {
    return packages.filter(p => p.id !== tour.id).slice(0, 4);
  }, [packages, tour.id]);

  const blogList = useMemo(() => {
    if (cmsPosts && cmsPosts.length >= 4) {
      return cmsPosts.slice(0, 4);
    }
    return [
      {
        id: 'post-1',
        title: 'Complete Guide to Leh Ladakh in 2026: Permits, Acclimatization & Best Routes',
        category: 'DESTINATION GUIDE',
        coverImage: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80',
        publishedDate: '15 May 2026',
        readTime: '6 min read',
        excerpt: 'Everything you need to know about high-altitude permits, Diamox dosage, road conditions across Zojila and Khardung La, and ideal night stays.'
      },
      {
        id: 'post-2',
        title: 'Top 7 Hidden Gems You Must Visit in Ladakh Beyond Pangong & Nubra',
        category: 'TRAVEL INSPIRATION',
        coverImage: 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=800&q=80',
        publishedDate: '28 Apr 2026',
        readTime: '5 min read',
        excerpt: 'Explore Hanle Dark Sky Sanctuary, Tso Moriri tranquil waters, Turtuk apricot orchards, and the breathtaking Aryan valley villages.'
      },
      {
        id: 'post-3',
        title: 'Packing 101: What to Wear in Extreme Weather and Cold Deserts',
        category: 'PACKING TIPS',
        coverImage: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80',
        publishedDate: '10 Apr 2026',
        readTime: '4 min read',
        excerpt: 'Layering strategies that keep you warm at night and comfortable during sunny high-altitude days without carrying excessive luggage.'
      },
      {
        id: 'post-4',
        title: 'Why Acclimatization is Crucial on High Altitude Himalayan Tours',
        category: 'HEALTH & SAFETY',
        coverImage: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=800&q=80',
        publishedDate: '02 Mar 2026',
        readTime: '5 min read',
        excerpt: 'Medical insights on Acute Mountain Sickness (AMS), hydration protocols, oxygen saturation levels, and gradual elevation gains.'
      }
    ];
  }, [cmsPosts]);

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
        canonical={`https://shrawellotravels.com/packages/${tour.id}`}
        schema={jsonLd}
      />

      <div className="bg-slate-50 dark:bg-[#0B1116] min-h-screen pb-40 md:pb-20 relative pt-24 md:pt-28">

        {/* Admin Floating Control Panel */}
        {canEdit && (
          <div ref={adminMenuRef} className="fixed bottom-6 left-6 z-[100] flex flex-col items-start">
            {/* Popover Menu */}
            {isAdminMenuOpen && (
              <div className="mb-3 bg-slate-900/95 dark:bg-[#151d29]/95 border border-indigo-500/30 text-white rounded-2xl p-4 shadow-2xl animate-in slide-in-from-bottom-2 fade-in duration-200 w-72 backdrop-blur-md">
                <div className="flex items-center justify-between border-b border-slate-800 dark:border-slate-700/60 pb-2.5 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-indigo-400 text-lg">admin_panel_settings</span>
                    <span className="font-bold text-xs uppercase tracking-widest text-indigo-300">Package Admin</span>
                  </div>
                  <button 
                    onClick={() => setIsAdminMenuOpen(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <span className="material-symbols-outlined text-sm">close</span>
                  </button>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => {
                      setActiveEditTab('info');
                      setIsAdminEditOpen(true);
                      setIsAdminMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 shadow-md shadow-indigo-600/20"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                    Quick Edit Package
                  </button>
                  <button
                    onClick={() => {
                      navigate(`/admin/itinerary-builder?edit=${tour.id}`);
                      setIsAdminMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 border border-slate-700"
                  >
                    <span className="material-symbols-outlined text-[16px]">edit_road</span>
                    Itinerary Builder
                  </button>
                  <button
                    onClick={() => {
                      navigate('/admin/packages');
                      setIsAdminMenuOpen(false);
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-800 hover:bg-slate-750 active:scale-95 text-slate-200 font-bold rounded-xl text-xs uppercase tracking-wider transition-all flex items-center gap-2.5 border border-slate-700"
                  >
                    <span className="material-symbols-outlined text-[16px]">inventory</span>
                    Package List
                  </button>
                </div>
              </div>
            )}
            
            {/* Toggle FAB */}
            <button
              onClick={() => setIsAdminMenuOpen(!isAdminMenuOpen)}
              className={`size-12 rounded-full flex items-center justify-center transition-all duration-300 shadow-2xl active:scale-95 ${
                isAdminMenuOpen 
                  ? 'bg-slate-800 text-white border border-slate-700 hover:bg-slate-700' 
                  : 'bg-indigo-600 text-white hover:bg-indigo-500 hover:scale-105 shadow-indigo-600/30 border border-indigo-500/30'
              }`}
              title="Package Admin Menu"
            >
              <span className="material-symbols-outlined text-xl">
                {isAdminMenuOpen ? 'close' : 'admin_panel_settings'}
              </span>
            </button>
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
            className="fixed inset-0 z-[200] flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/75 backdrop-blur-md animate-in fade-in duration-300 cursor-pointer overflow-y-auto"
          >
            <div 
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-[#151d29] w-full max-w-md rounded-3xl shadow-2xl p-5 sm:p-7 animate-in zoom-in-95 ring-1 ring-white/10 cursor-default max-h-[90vh] flex flex-col overflow-hidden my-auto"
            >
              <div className="flex justify-between items-center pb-4 mb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">Secure Your Spot</h3>
                <button onClick={() => setBookingModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close Booking Modal"><span className="material-symbols-outlined text-xl">close</span></button>
              </div>
              <form onSubmit={confirmBooking} className="space-y-3.5 overflow-y-auto pr-1 flex-1 min-h-0 custom-scrollbar pb-1">
                <div className="space-y-1">
                  <label htmlFor="booking-name" className="block text-xs font-bold uppercase text-slate-500 pl-1">Full Name</label>
                  <input required id="booking-name" type="text" className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white" placeholder="John Doe" value={bookingData.name} onChange={e => setBookingData({ ...bookingData, name: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <label htmlFor="booking-email" className="block text-xs font-bold uppercase text-slate-500 pl-1">Email</label>
                  <input required id="booking-email" type="email" className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white" placeholder="john@example.com" value={bookingData.email} onChange={e => setBookingData({ ...bookingData, email: e.target.value })} />
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

                <div className="space-y-2">
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
                  <input 
                    required 
                    id="booking-date" 
                    min={new Date().toISOString().split('T')[0]} 
                    max={(() => {
                      const todayStr = new Date().toISOString().split('T')[0];
                      const rawValidity = tour.validity_date || (tour as any).validityDate;
                      if (!rawValidity) return undefined;
                      const parsed = new Date(rawValidity);
                      if (isNaN(parsed.getTime())) return undefined;
                      const formatted = parsed.toISOString().split('T')[0];
                      return formatted >= todayStr ? formatted : undefined;
                    })()} 
                    type="date" 
                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3 text-sm font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white" 
                    value={bookingData.date || new Date().toISOString().split('T')[0]} 
                    onChange={e => setBookingData({ ...bookingData, date: e.target.value })} 
                  />
                </div>
                <div className="p-3.5 bg-primary/5 rounded-2xl border border-primary/10 space-y-1.5">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500">
                    <span>{tour.pricingMode === 'group' ? 'Package Base Rate' : 'Price Per Person'}</span>
                    <span>{formatPrice(tour.pricingMode === 'group' ? activeOccupancy.price : perPersonPrice)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm font-black text-slate-900 dark:text-white border-t border-slate-200/50 dark:border-slate-700/50 pt-1.5">
                    <span>Estimated Total ({activeOccupancy.label})</span>
                    <span className="text-base sm:text-lg">{formatPrice(calculateTotal())}</span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium opacity-80">Based on {guests} and {selectedAddons.length} add-ons.</p>
                  <p className="text-[10px] text-green-600 dark:text-green-400 mt-0.5 font-bold flex items-center gap-1">
                    <span className="material-symbols-outlined text-[12px]">check_circle</span>
                    All taxes & GST included • No hidden charges
                  </p>
                </div>

                <div className="p-2.5 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl">
                  <p className="text-xs text-amber-700 dark:text-amber-400 font-medium flex items-start gap-1.5">
                    <span className="material-symbols-outlined text-[14px] mt-0.5 flex-shrink-0">info</span>
                    <span><strong>Free cancellation</strong> up to 30 days before travel. Partial refunds apply afterwards.</span>
                  </p>
                </div>

                <button type="submit" className="w-full bg-primary text-white py-3.5 rounded-xl font-bold text-base shadow-xl shadow-primary/20 hover:bg-primary-dark transition-all active:scale-95 mt-2 shrink-0">Send Request</button>
              </form>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="max-w-[1600px] mx-auto px-4 md:px-8 xl:px-12">


          {/* === PDF REFERENCE MASTHEAD GALLERY (Left Hero + Right 3-Photos + Review Bubble) === */}
          <div className="mb-6">
            {tour.gallery.length === 0 ? (
              <div className="w-full rounded-[2rem] bg-slate-100 dark:bg-slate-800/50 flex flex-col items-center justify-center gap-3 border-2 border-dashed border-slate-200 dark:border-slate-700" style={{ height: '440px' }}>
                <span className="material-symbols-outlined text-5xl text-slate-300 dark:text-slate-600">image_not_supported</span>
                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500">No photos available yet</p>
              </div>
            ) : tour.gallery.length === 1 ? (
              <div
                className="relative w-full rounded-[2rem] overflow-hidden shadow-xl cursor-pointer group max-h-[460px]"
                style={{ aspectRatio: firstImageRatio }}
                onClick={() => openLightbox(0)}
              >
                <OptimizedImage src={tour.gallery[0]} alt={tour.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                {/* Review Bubble on single image */}
                <div className="absolute bottom-6 left-6 max-w-xs sm:max-w-sm bg-black/65 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-white shadow-2xl pointer-events-none">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-white">{reviews[0]?.name || 'Pardha Saradhi'}</span>
                    <div className="flex text-amber-400 text-xs">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className="material-symbols-outlined text-xs fill-current">star</span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[11px] text-white/90 line-clamp-2 italic font-normal leading-relaxed">
                    "{reviews[0]?.text || 'Just go for it. Leh Ladakh is truly a trip of a lifetime! Seamless execution.'}"
                  </p>
                </div>
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
                  <div className="absolute top-4 left-4 px-3 py-1.5 bg-black/50 backdrop-blur-md rounded-full text-white text-xs font-bold flex items-center gap-1.5 shadow-lg">
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

                {/* Desktop PDF Reference Masthead Gallery */}
                <div className="hidden md:grid grid-cols-12 gap-3 h-[460px] w-full rounded-[2rem] overflow-hidden shadow-lg bg-slate-100 dark:bg-slate-900">
                  {/* Left 7 Columns (approx 58% width): Large Hero Image with Traveler Review Bubble */}
                  <div 
                    onClick={() => openLightbox(0)}
                    className="col-span-7 h-full relative cursor-pointer overflow-hidden group select-none"
                  >
                    <OptimizedImage
                      src={tour.gallery[0]}
                      alt={`${tour.title} — Main`}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />
                    
                    {/* Authentic Traveler Review Quote Overlay (PDF Page 1 reference) */}
                    <div className="absolute bottom-5 left-5 right-5 max-w-sm bg-black/65 backdrop-blur-md border border-white/20 rounded-2xl p-3.5 text-white shadow-2xl pointer-events-none">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-white">{reviews[0]?.name || 'Pardha Saradhi'}</span>
                        <div className="flex text-amber-400 text-xs">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <span key={i} className="material-symbols-outlined text-xs fill-current">star</span>
                          ))}
                        </div>
                      </div>
                      <p className="text-[11px] text-white/90 line-clamp-2 italic font-normal leading-relaxed">
                        "{reviews[0]?.text || 'Just go for it. Leh Ladakh is truly a trip of a lifetime! Seamless execution.'}"
                      </p>
                    </div>
                  </div>

                  {/* Right 5 Columns (approx 42% width): 3 Image Stack with +Photos pill */}
                  <div className="col-span-5 grid grid-rows-2 gap-3 h-full">
                    {/* Top Right Photo */}
                    <div 
                      onClick={() => openLightbox(1)}
                      className="row-span-1 relative cursor-pointer overflow-hidden group rounded-2xl"
                    >
                      <OptimizedImage
                        src={tour.gallery[1] || tour.gallery[0]}
                        alt={`${tour.title} — 2`}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    </div>

                    {/* Bottom Right: 2 photos side by side */}
                    <div className="row-span-1 grid grid-cols-2 gap-3 h-full">
                      <div 
                        onClick={() => openLightbox(2)}
                        className="relative cursor-pointer overflow-hidden group rounded-2xl"
                      >
                        <OptimizedImage
                          src={tour.gallery[2] || tour.gallery[0]}
                          alt={`${tour.title} — 3`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                      </div>
                      
                      <div 
                        onClick={() => openLightbox(3)}
                        className="relative cursor-pointer overflow-hidden group rounded-2xl"
                      >
                        <OptimizedImage
                          src={tour.gallery[3] || tour.gallery[1] || tour.gallery[0]}
                          alt={`${tour.title} — 4`}
                          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />
                        {/* +Photos Pill Overlay (PDF Page 1 reference) */}
                        <div className="absolute inset-0 bg-black/40 hover:bg-black/50 transition-colors flex items-center justify-center p-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openLightbox(0);
                            }}
                            className="px-3.5 py-1.5 bg-white/95 dark:bg-slate-900/95 hover:bg-white text-slate-900 dark:text-white rounded-full font-black text-xs shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
                          >
                            <span className="material-symbols-outlined text-[15px]">photo_library</span>
                            <span>+{Math.max(1, tour.gallery.length - 4)} Photos &gt;</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* === PDF REFERENCE BREADCRUMBS === */}
          <nav className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 mb-4 overflow-x-auto no-scrollbar py-1">
            <Link to="/" className="hover:text-primary transition-colors flex items-center gap-1 shrink-0 font-medium">
              <span className="material-symbols-outlined text-[15px]">home</span>
              Home
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <Link to="/packages" className="hover:text-primary transition-colors shrink-0 font-medium">
              Packages
            </Link>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="hover:text-primary transition-colors shrink-0 font-medium">
              {getLocationName(tour.location, masterLocations)}
            </span>
            <span className="text-slate-300 dark:text-slate-700">/</span>
            <span className="text-slate-900 dark:text-white font-bold truncate max-w-xs sm:max-w-md">
              {tour.title}
            </span>
          </nav>

          {/* === PDF REFERENCE TITLE & ACTIONS HEADER === */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-tight">
                  {tour.title}
                </h1>
                {canEdit && (
                  <button
                    onClick={() => {
                      setActiveEditTab('info');
                      setIsAdminEditOpen(true);
                    }}
                    className="p-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-full text-slate-500 hover:text-slate-800 dark:hover:text-white transition-all shadow-sm active:scale-95 shrink-0"
                    title="Edit Package Header & Info"
                  >
                    <span className="material-symbols-outlined text-[16px] block">edit</span>
                  </button>
                )}
              </div>

              {/* Sub-header: Rating, Review Count & Duration */}
              <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-2.5 font-medium">
                <div className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-900/40 px-2.5 py-1 rounded-full">
                  <div className="flex text-amber-500">
                    <span className="material-symbols-outlined text-sm fill-current">star</span>
                  </div>
                  <span className="font-black text-slate-900 dark:text-white">4.8</span>
                  <span className="text-slate-400 dark:text-slate-500 font-medium">/ 5.0</span>
                  <span className="text-slate-600 dark:text-slate-300 font-bold ml-1">({reviews.length > 0 ? `${reviews.length * 28 + 142} ratings` : '2,842 ratings'})</span>
                </div>
                <span className="text-slate-300 dark:text-slate-700 font-light">•</span>
                <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-primary">schedule</span>
                  {tour.days} Days / {Math.max(1, tour.days - 1)} Nights
                </span>
                <span className="text-slate-300 dark:text-slate-700 font-light">•</span>
                <span className="font-semibold text-slate-600 dark:text-slate-400 flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm text-emerald-500">verified</span>
                  Certified Local Operator
                </span>
              </div>
            </div>

            {/* Right Action Buttons: Share & Wishlist */}
            <div className="flex items-center gap-2 self-start shrink-0">
              <button
                type="button"
                onClick={() => {
                  copyToClipboard(window.location.href).then(success => {
                    if (success) {
                      toast.success('Link copied to clipboard!');
                    } else {
                      toast.error('Failed to copy link to clipboard');
                    }
                  });
                }}
                className="px-3.5 py-2 bg-white dark:bg-[#151d29] hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-1.5 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">share</span>
                <span>Share</span>
              </button>

              <button
                type="button"
                onClick={handleToggleWishlist}
                className={`p-2 rounded-xl border transition-all flex items-center justify-center shadow-sm active:scale-95 ${
                  isWishlisted
                    ? 'bg-rose-50 border-rose-200 text-rose-500 dark:bg-rose-950/30 dark:border-rose-800'
                    : 'bg-white dark:bg-[#151d29] border-slate-200 dark:border-slate-800 text-slate-500 hover:text-rose-500'
                }`}
                title={isWishlisted ? "Remove from Wishlist" : "Save to Wishlist"}
              >
                <span className={`material-symbols-outlined text-[18px] ${isWishlisted ? 'fill-current' : ''}`}>
                  favorite
                </span>
              </button>
            </div>
          </div>

          {/* Social Proof Recommendation Banner */}
          <div className="bg-[#f0f4ff] dark:bg-[#14223d] border border-[#d6e4ff] dark:border-[#1e345e] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-3 mb-8 shadow-xs">
            <div className="flex items-center gap-3.5">
              <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0 dark:bg-primary/20">
                <span className="material-symbols-outlined text-xl font-bold">verified_user</span>
              </div>
              <p className="text-slate-800 dark:text-slate-200 text-xs sm:text-sm font-semibold leading-relaxed">
                {tour.id === 'leh-ladakh-tourist-special' ? (
                  <span>Yesterday, a Jammu/Kashmir Protocol Officer booked this tour package through our Delhi desk.</span>
                ) : (
                  <span>Recently, {getPaxHeadcount() + 8} travelers successfully booked this tour package through our partner networks.</span>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 bg-white dark:bg-slate-900 px-3.5 py-1.5 rounded-full shadow-xs border border-slate-100 dark:border-slate-800">
              <span className="text-amber-500 font-black text-xs flex items-center gap-0.5">
                <span className="material-symbols-outlined text-xs fill-current">star</span> 4.8
              </span>
              <span className="text-slate-300 dark:text-slate-700 text-xs">|</span>
              <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-300">Top Rated</span>
            </div>
          </div>
          
          {/* Main Grid Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] xl:grid-cols-[1fr_390px] gap-8 lg:gap-10">

            {/* Left Column: Details & Content */}
            <div className="space-y-8 lg:space-y-10 min-w-0">

              {/* === PDF REFERENCE DETAILS TRI-BOX === */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div className="p-4 rounded-2xl bg-white dark:bg-[#151d29] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">flight_takeoff</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Pickup &amp; Drop</span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate block">
                      {tour.pickupDrop || `${getLocationName(tour.location, masterLocations)} Airport`}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#151d29] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">explore</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Category</span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate block">
                      {tour.category || 'Road Trip & Adventure'}
                    </span>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-white dark:bg-[#151d29] border border-slate-200/80 dark:border-slate-800/80 shadow-xs flex items-center gap-3.5">
                  <div className="size-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-2xl">schedule</span>
                  </div>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">Duration</span>
                    <span className="text-xs sm:text-sm font-black text-slate-800 dark:text-white truncate block">
                      {tour.days} Days / {Math.max(1, tour.days - 1)} Nights
                    </span>
                  </div>
                </div>
              </div>

              {/* === PDF REFERENCE INCLUSIONS 4-PILL ROW === */}
              <div className="flex flex-wrap items-center gap-2.5">
                {[
                  { label: 'Stay Included', icon: 'hotel' },
                  { label: 'Meals as per Itinerary', icon: 'restaurant' },
                  { label: 'Sightseeing Included', icon: 'photo_camera' },
                  { label: 'Transfers Included', icon: 'directions_car' }
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/30 text-emerald-800 dark:text-emerald-300 rounded-full text-xs font-bold shadow-xs">
                    <span className="material-symbols-outlined text-[14px] text-emerald-600 dark:text-emerald-400 font-black">check</span>
                    <span>{item.label}</span>
                  </div>
                ))}
              </div>

              {/* === PDF REFERENCE 5 TRUST BADGES RIBBON === */}
              <div className="flex flex-wrap items-center gap-2 sm:gap-3 py-2 border-y border-slate-200/70 dark:border-slate-800/70">
                {[
                  { label: 'No Hidden Charges', icon: 'verified' },
                  { label: 'Verified Local Drivers', icon: 'badge' },
                  { label: '100% Customized Trips', icon: 'tune' },
                  { label: '24x7 On-Trip Support', icon: 'support_agent' },
                  { label: 'Easy EMI Available', icon: 'credit_score' }
                ].map((trust, idx) => (
                  <div key={idx} className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-100/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/50 text-slate-700 dark:text-slate-300 rounded-lg text-[11px] font-semibold">
                    <span className="material-symbols-outlined text-primary text-sm">{trust.icon}</span>
                    <span>{trust.label}</span>
                  </div>
                ))}
              </div>

              {/* Sticky Tabs Navigation */}
              <div className="sticky top-[80px] bg-slate-50/90 dark:bg-[#0B1116]/90 backdrop-blur-xl z-30 border-b border-slate-200 dark:border-slate-800/80 -mx-4 px-4 py-4 mb-4 flex gap-3 overflow-x-auto no-scrollbar">
                {TABS.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => scrollToSection(tab.id)}
                    className={`whitespace-nowrap px-5 py-2.5 rounded-full text-xs font-black uppercase tracking-wider transition-all duration-300 ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                        : 'bg-white dark:bg-[#151d29] border border-slate-200 dark:border-slate-800 text-slate-655 dark:text-slate-400 hover:border-indigo-500/50'
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

              {/* Detail Sections Container */}
              <div className="space-y-14">

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
                  <div className="p-5 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30 rounded-2xl mb-6 flex flex-col md:flex-row gap-4 items-start">
                    <div className="size-11 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-2xl font-bold">medical_services</span>
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-800 dark:text-amber-400 uppercase tracking-wider mb-1.5">Altitude Safety &amp; Acclimatization Protocol</h4>
                      <p className="text-xs text-slate-600 dark:text-slate-350 leading-relaxed font-medium mb-3">
                        Leh is situated at 11,500 ft. Altitude sickness can affect anyone regardless of age or physical fitness. We strictly enforce a rest day on Day 1 to ensure a healthy trip.
                      </p>
                      <ul className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <li className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800/80 dark:text-amber-400/85">
                          <span className="material-symbols-outlined text-sm text-primary">water_drop</span> Keep Hydrated (3-4L daily)
                        </li>
                        <li className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800/80 dark:text-amber-400/85">
                          <span className="material-symbols-outlined text-sm text-primary">hotel</span> Mandatory Day 1 Bedrest
                        </li>
                        <li className="flex items-center gap-1.5 text-[11px] font-bold text-amber-800/80 dark:text-amber-400/85">
                          <span className="material-symbols-outlined text-sm text-primary">support_agent</span> Oxygen Support in Cabs
                        </li>
                      </ul>
                    </div>
                  </div>
                )}

                <div className="text-slate-600 dark:text-slate-300 font-medium leading-relaxed">
                  <p className={`whitespace-pre-line leading-relaxed text-sm ${!isOverviewExpanded ? 'line-clamp-4' : ''}`}>
                    {tour.overview}
                  </p>
                  {tour.overview && tour.overview.length > 250 && (
                    <button
                      type="button"
                      onClick={() => setIsOverviewExpanded(!isOverviewExpanded)}
                      className="mt-3 text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isOverviewExpanded ? (
                        <>View Less <span className="material-symbols-outlined text-xs">expand_less</span></>
                      ) : (
                        <>Read Full Overview <span className="material-symbols-outlined text-xs">expand_more</span></>
                      )}
                    </button>
                  )}
                </div>
              </section>

              {/* Itinerary Section */}
              <section id="itinerary" className="scroll-mt-36">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-3">
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
                  <span className="text-xs font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    {tour.days} Days Detailed Plan
                  </span>
                </div>

                <div className="space-y-4">
                  {tour.itinerary?.map((item: any, idx: number) => (
                    <details key={idx} className="group bg-white dark:bg-[#151d29] rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-all hover:shadow-md open:shadow-xs overflow-hidden" open={idx === 0}>
                      <summary className="flex items-center gap-4 p-5 cursor-pointer select-none list-none outline-none [&::-webkit-details-marker]:hidden group-open:text-primary">
                        <div className="flex-shrink-0 size-11 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center group-open:bg-primary group-open:border-primary transition-colors">
                          <span className="text-[9px] font-black uppercase text-slate-400 group-open:text-white/70">Day</span>
                          <span className="text-base font-black text-slate-900 dark:text-white group-open:text-white leading-none mt-0.5">{item.day || idx + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-open:text-primary transition-colors truncate">{item.title}</h3>
                        </div>
                        <div className="flex-shrink-0 size-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center group-open:rotate-180 transition-transform">
                          <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>
                        </div>
                      </summary>
                      
                      <div className="px-5 pb-5 pt-1 pl-[64px] -mt-1 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800/60 relative">
                          <p className="text-slate-600 dark:text-slate-350 leading-relaxed whitespace-pre-line text-xs sm:text-sm font-medium">
                            {item.desc}
                          </p>
                          <div className="mt-3 flex items-center gap-2 pt-3 border-t border-slate-200/70 dark:border-slate-800/70">
                            <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Included: Stay &amp; Transfers</span>
                          </div>
                        </div>
                      </div>
                    </details>
                  ))}
                </div>

                {/* === PDF REFERENCE CENTERED [ GET PDF ITINERARY ] BUTTON (Page 2) === */}
                <div className="flex justify-center pt-6">
                  <button
                    type="button"
                    onClick={handleGetPdf}
                    className="px-6 py-3 rounded-full border-2 border-slate-300 dark:border-slate-700 hover:border-primary dark:hover:border-primary text-slate-700 dark:text-slate-200 hover:text-primary font-bold text-xs uppercase tracking-wider flex items-center gap-2 transition-all shadow-xs hover:shadow-md active:scale-95 bg-white dark:bg-[#151d29]"
                  >
                    <span className="material-symbols-outlined text-base text-primary">description</span>
                    Get PDF Itinerary
                  </button>
                </div>
              </section>

              {/* Age Limits (Trip Wise) Section (PDF Page 2 reference) */}
              <section className="scroll-mt-36 bg-white dark:bg-[#151d29] p-6 sm:p-7 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
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
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Guidelines</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {ageLimitsList.map((tier, idx) => (
                    <div key={idx} className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800/60 flex flex-col items-center justify-center text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">{tier.type}</span>
                      <span className="text-xs font-bold text-slate-500 mb-1">{tier.age}</span>
                      <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white">{tier.priceText}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Inclusions & Exclusions (PDF Page 2 reference) */}
              <section id="inclusions" className="scroll-mt-36 grid md:grid-cols-2 gap-6">
                <div className="bg-emerald-50/30 dark:bg-emerald-950/10 p-6 rounded-2xl border border-emerald-100/70 dark:border-emerald-900/30">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base sm:text-lg font-black text-emerald-800 dark:text-emerald-400 flex items-center gap-2.5">
                      <span className="material-symbols-outlined bg-emerald-100 dark:bg-emerald-950/70 p-1 rounded-lg text-emerald-600 font-bold text-base">check</span>
                      Inclusions
                    </h3>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setActiveEditTab('inclusions');
                          setIsAdminEditOpen(true);
                        }}
                        className="p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-lg text-emerald-700 dark:text-emerald-400 hover:text-primary transition-colors align-middle"
                        title="Edit Inclusions"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {(isInclusionsExpanded ? tour.included : tour.included.slice(0, 5)).map((inc, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-300 text-xs sm:text-sm font-semibold">
                        <span className="material-symbols-outlined text-emerald-500 text-base shrink-0 mt-0.5">check_circle</span>
                        <span>{inc}</span>
                      </li>
                    ))}
                  </ul>
                  {tour.included.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setIsInclusionsExpanded(!isInclusionsExpanded)}
                      className="mt-4 text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isInclusionsExpanded ? 'View Less' : `+ View ${tour.included.length - 5} More Inclusions`}
                    </button>
                  )}
                </div>

                <div className="bg-rose-50/30 dark:bg-rose-950/10 p-6 rounded-2xl border border-rose-100/70 dark:border-rose-900/30">
                  <div className="flex items-center justify-between mb-5">
                    <h3 className="text-base sm:text-lg font-black text-rose-800 dark:text-rose-400 flex items-center gap-2.5">
                      <span className="material-symbols-outlined bg-rose-100 dark:bg-rose-950/70 p-1 rounded-lg text-rose-500 font-bold text-base">close</span>
                      Exclusions
                    </h3>
                    {canEdit && (
                      <button
                        onClick={() => {
                          setActiveEditTab('inclusions');
                          setIsAdminEditOpen(true);
                        }}
                        className="p-1 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg text-rose-700 dark:text-rose-400 hover:text-primary transition-colors align-middle"
                        title="Edit Exclusions"
                      >
                        <span className="material-symbols-outlined text-[18px]">edit</span>
                      </button>
                    )}
                  </div>
                  <ul className="space-y-3">
                    {(isInclusionsExpanded ? tour.notIncluded : tour.notIncluded.slice(0, 5)).map((exc, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-slate-700 dark:text-slate-350 text-xs sm:text-sm font-semibold">
                        <span className="material-symbols-outlined text-rose-400 text-base shrink-0 mt-0.5">cancel</span>
                        <span>{exc}</span>
                      </li>
                    ))}
                  </ul>
                  {tour.notIncluded.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setIsInclusionsExpanded(!isInclusionsExpanded)}
                      className="mt-4 text-xs font-bold text-rose-700 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      {isInclusionsExpanded ? 'View Less' : `+ View ${tour.notIncluded.length - 5} More Exclusions`}
                    </button>
                  )}
                </div>
              </section>

              {/* Cancellation Policy (PDF Page 2 reference) */}
              <section id="cancellation" className="scroll-mt-36">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
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
                </div>
                <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs bg-white dark:bg-[#151d29] mb-4">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800">
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Timeline</th>
                        {cancellationPolicy.headers.map((h: string, i: number) => (
                          <th key={i} className="p-4 font-black text-slate-800 dark:text-slate-200 text-center">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="p-4 font-bold text-slate-600 dark:text-slate-300">Cancellation Charge</td>
                        {cancellationPolicy.rows.cancellationCharge.map((v: string, i: number) => (
                          <td key={i} className="p-4 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/10">
                        <td className="p-4 font-bold text-slate-600 dark:text-slate-300">Refund Amount</td>
                        {cancellationPolicy.rows.refundAmount.map((v: string, i: number) => (
                          <td key={i} className="p-4 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-slate-600 dark:text-slate-300">Remaining Amount</td>
                        {cancellationPolicy.rows.remainingAmount.map((v: string, i: number) => (
                          <td key={i} className="p-4 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200/70 dark:border-slate-800">
                  <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider block mb-1">Policy Guidelines</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400 whitespace-pre-line leading-relaxed font-medium">
                    {cancellationPolicy.guidelines}
                  </p>
                </div>
              </section>

              {/* Payment Policy (PDF Page 2 reference) */}
              <section id="payment" className="scroll-mt-36">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2">
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
                </div>
                <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-800 rounded-2xl shadow-xs bg-white dark:bg-[#151d29]">
                  <table className="w-full text-left border-collapse text-xs sm:text-sm min-w-[500px]">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-200/70 dark:border-slate-800">
                        <th className="p-4 font-bold text-slate-500 uppercase text-[10px] tracking-wider">Timeline</th>
                        {paymentPolicy.headers.map((h: string, i: number) => (
                          <th key={i} className="p-4 font-black text-slate-800 dark:text-slate-200 text-center">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-100 dark:border-slate-800/50">
                        <td className="p-4 font-bold text-slate-600 dark:text-slate-300">Booking Amount</td>
                        {paymentPolicy.rows.bookingAmount.map((v: string, i: number) => (
                          <td key={i} className="p-4 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                      <tr className="border-b border-slate-100 dark:border-slate-800/50 bg-slate-50/30 dark:bg-slate-800/10">
                        <td className="p-4 font-bold text-slate-600 dark:text-slate-300">Rest Payment</td>
                        {paymentPolicy.rows.restPayment.map((v: string, i: number) => (
                          <td key={i} className="p-4 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                      <tr>
                        <td className="p-4 font-bold text-slate-600 dark:text-slate-300">Status</td>
                        {paymentPolicy.rows.status.map((v: string, i: number) => (
                          <td key={i} className="p-4 text-center">{renderPolicyCell(v)}</td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </section>

              {/* === PDF REFERENCE THINGS TO PACK (Page 3) === */}
              <section id="things-to-pack" className="scroll-mt-36">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
                    <span className="material-symbols-outlined text-primary text-3xl">backpack</span>
                    Things To Pack
                  </h2>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">
                    Recommended Checklist
                  </span>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {thingsToPackList.map((cat, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-white dark:bg-[#151d29] border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
                      <div className="flex items-center gap-2.5 mb-3.5 pb-2.5 border-b border-slate-100 dark:border-slate-800">
                        <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined text-lg">{cat.icon}</span>
                        </div>
                        <h4 className="text-sm font-black text-slate-800 dark:text-white">{cat.category}</h4>
                      </div>
                      <ul className="space-y-2">
                        {cat.items.map((item, i) => (
                          <li key={i} className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-350">
                            <span className="size-1.5 rounded-full bg-indigo-500 shrink-0" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
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
                    <details key={idx} className="group bg-white dark:bg-[#151d29] rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs overflow-hidden">
                      <summary className="flex items-center justify-between p-4 sm:p-5 cursor-pointer select-none font-bold text-slate-800 dark:text-slate-200 outline-none list-none [&::-webkit-details-marker]:hidden group-open:text-primary">
                        <span className="text-xs sm:text-sm md:text-base">{faq.q}</span>
                        <span className="material-symbols-outlined text-slate-400 group-open:rotate-180 transition-transform">expand_more</span>
                      </summary>
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-500 dark:text-slate-400 leading-relaxed whitespace-pre-line bg-slate-50/35 dark:bg-slate-900/10 border-t border-slate-100 dark:border-slate-800 p-4">
                        {faq.a}
                      </div>
                    </details>
                  ))}
                </div>
              </section>

              {/* Tour Videos & Reels Section */}
              {tour.videos && tour.videos.length > 0 && (
                <section id="videos" className="scroll-mt-36">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white mb-6 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-3xl">play_circle</span>
                    Memories for Life (Videos &amp; Reels)
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {tour.videos.map((video: PackageVideo) => {
                      const isVertical = video.platform === 'instagram';
                      return (
                        <div 
                          key={video.id} 
                          className={`bg-white dark:bg-[#151d29] rounded-2xl overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-xs transition-all hover:shadow-md flex flex-col ${
                            isVertical ? 'max-w-[340px] mx-auto w-full' : 'w-full'
                          }`}
                        >
                          <div className={isVertical ? 'aspect-[9/16]' : 'aspect-video'}>
                            <VideoCardPlayer video={video} fallbackImage={tour.image} />
                          </div>
                          {video.caption && (
                            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-850/10">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-300 text-center">
                                {video.caption}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

            </div> {/* Close Detail Sections Container */}
          </div> {/* Close Left Column */}

          {/* === PDF REFERENCE STICKY BOOKING WIDGET === */}
          <div className="hidden lg:block">
            <div className={`sticky ${canEdit ? 'top-[144px]' : 'top-[84px]'} space-y-4`}>
              <div className="bg-white dark:bg-[#151d29] rounded-3xl shadow-xl border border-slate-200/80 dark:border-slate-800/80 overflow-hidden flex flex-col">
                  
                {/* Header: Starting Price & EMI banner */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/60 dark:bg-slate-900/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Starting from</span>
                    {perPersonOriginalPrice > perPersonPrice && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-black bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400 uppercase tracking-wider">
                        Save {Math.round(((perPersonOriginalPrice - perPersonPrice) / perPersonOriginalPrice) * 100)}%
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-baseline gap-1.5 mb-1">
                    <span className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
                      {formatPrice(perPersonPrice)}
                    </span>
                    <span className="text-xs font-bold text-slate-500">
                      / person
                    </span>
                    {perPersonOriginalPrice > perPersonPrice && (
                      <span className="text-xs text-slate-400 line-through ml-1 font-medium">
                        {formatPrice(perPersonOriginalPrice)}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                    (Inclusive of all taxes &amp; fees)
                  </p>

                  {/* No-cost EMI note (PDF Page 1 reference) */}
                  <div className="mt-3.5 flex items-center gap-2 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100/70 dark:border-indigo-900/40 text-[11px] font-semibold text-indigo-900 dark:text-indigo-300">
                    <span className="material-symbols-outlined text-sm text-indigo-600 dark:text-indigo-400">credit_card</span>
                    <span>No-cost EMI available starting at <strong className="font-black text-indigo-700 dark:text-indigo-200">₹{noCostEmi.toLocaleString('en-IN')}/mo</strong></span>
                  </div>
                </div>

                {/* Body Content */}
                <div className="p-6 space-y-5">
                  
                  {/* Hotel Star Category Tabs (PDF Page 1 & 2 reference) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-primary">hotel</span>
                        Select Hotel Category
                      </label>
                      <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-md">
                        {activePricingStar === 3 ? 'Standard' : activePricingStar === 4 ? 'Deluxe' : 'Super Luxury'}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl">
                      {[3, 4, 5].map((star) => {
                        const isSelected = activePricingStar === star;
                        return (
                          <button
                            key={star}
                            type="button"
                            onClick={() => {
                              setActivePricingStar(star);
                              if (star === 3) setSelectedHotelTier('budget');
                              else if (star === 4) setSelectedHotelTier('standard');
                              else setSelectedHotelTier('luxury');
                            }}
                            className={`py-2 px-1 rounded-lg text-xs font-bold transition-all flex flex-col items-center justify-center gap-0.5 cursor-pointer ${
                              isSelected
                                ? 'bg-white dark:bg-[#151d29] text-slate-900 dark:text-white shadow-xs border border-slate-200 dark:border-slate-700'
                                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                            }`}
                          >
                            <span className="text-[11px]">{star} Star</span>
                            <div className="flex text-amber-500 text-[10px]">
                              {Array.from({ length: star }).map((_, i) => (
                                <span key={i} className="material-symbols-outlined text-[11px] fill-current">star</span>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Occupancy Pricing Matrix Table (PDF Page 1 & 2 reference) */}
                  <div>
                    <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                      Occupancy Pricing (Per Person)
                    </label>
                    <div className="border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden text-xs">
                      <div className="grid grid-cols-2 bg-slate-50 dark:bg-slate-800/50 p-2.5 font-bold text-slate-500 dark:text-slate-400 border-b border-slate-200/70 dark:border-slate-800 text-[11px]">
                        <span>Occupancy</span>
                        <span className="text-right">Price / Person</span>
                      </div>
                      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold">
                        <div className="grid grid-cols-2 p-3 items-center bg-white dark:bg-[#151d29] hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <span className="text-slate-800 dark:text-slate-200">Double Sharing (2 Pax)</span>
                          <span className="text-right font-black text-slate-900 dark:text-white text-sm">₹{base2PaxPrice.toLocaleString('en-IN')}</span>
                        </div>
                        <div className="grid grid-cols-2 p-3 items-center bg-white dark:bg-[#151d29] hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                          <span className="text-slate-800 dark:text-slate-200">Quad Sharing (4 Pax)</span>
                          <span className="text-right font-black text-emerald-600 dark:text-emerald-400 text-sm">₹{base4PaxPrice.toLocaleString('en-IN')}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Optional Customizer: Travelers & Add-ons Collapsible */}
                  <details className="group border border-slate-200/80 dark:border-slate-800 rounded-xl overflow-hidden">
                    <summary className="flex items-center justify-between p-3 cursor-pointer select-none font-bold text-xs text-slate-600 dark:text-slate-400 outline-none list-none bg-slate-50/60 dark:bg-slate-900/30">
                      <span className="flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-primary">group</span>
                        Travelers &amp; Upgrades ({guests} Guests)
                      </span>
                      <span className="material-symbols-outlined text-slate-400 text-sm group-open:rotate-180 transition-transform">expand_more</span>
                    </summary>
                    <div className="p-3.5 space-y-3 bg-white dark:bg-[#151d29] border-t border-slate-100 dark:border-slate-800">
                      <div>
                        <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Select Number of Guests</label>
                        <TravelerSelector
                          value={guests}
                          onChange={(val) => setGuests(val)}
                        />
                      </div>

                      {addonsList.length > 0 && (
                        <div>
                          <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">Available Add-ons</label>
                          <div className="space-y-1.5 max-h-[120px] overflow-y-auto">
                            {addonsList.map(addon => (
                              <button
                                type="button"
                                key={addon.id}
                                onClick={() => toggleAddon(addon.id)}
                                className={`w-full flex items-center justify-between p-2 rounded-lg border text-left cursor-pointer transition-all ${
                                  selectedAddons.includes(addon.id) 
                                    ? 'bg-primary/5 border-primary text-primary' 
                                    : 'bg-transparent border-slate-150 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="text-xs font-semibold">{addon.label}</span>
                                <span className="text-[10px] font-bold">+{formatPriceCompact(addon.price)}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>

                  {/* B2B Partner Commission HUD (Preserved for agents) */}
                  {isB2BPartner && (
                    <div className="p-3.5 bg-indigo-50/70 dark:bg-indigo-950/20 border border-indigo-150 dark:border-indigo-900/35 rounded-xl">
                      <span className="text-[10px] font-black uppercase text-indigo-500 tracking-wider block mb-1">B2B Partner Earnings</span>
                      <div className="flex justify-between items-center text-xs font-bold text-slate-850 dark:text-white">
                        <span>Estimated Commission</span>
                        <span className="text-primary text-sm font-black">
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
                    </div>
                  )}

                  {/* Dual Action CTAs: [ Send Query ] and [ Get PDF ] */}
                  <div className="space-y-2.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setBookingModal(true)}
                      className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all active:scale-95 text-sm flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">send</span>
                      Send Query
                    </button>

                    <button
                      type="button"
                      onClick={handleGetPdf}
                      className="w-full border-2 border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200 font-bold py-3 rounded-xl transition-all active:scale-95 text-xs flex items-center justify-center gap-2 cursor-pointer bg-white dark:bg-[#151d29]"
                    >
                      <span className="material-symbols-outlined text-[18px] text-primary">description</span>
                      Get PDF Itinerary
                    </button>

                    {/* WhatsApp Fast Chat CTA */}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(`Hi, I'm interested in the tour package: ${tour.title}\n${window.location.href}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#20ba59] text-white font-black py-3 rounded-xl shadow-sm transition-all active:scale-95 text-xs flex items-center justify-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                      Chat on WhatsApp
                    </a>
                  </div>

                  {/* Travel Expert Help Card */}
                  <div className="pt-2 text-center">
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                      Need custom quotes or immediate booking?
                    </p>
                    <p className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                      Call our trip expert directly anytime
                    </p>
                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>

          {/* === PDF REFERENCE CLIENT REVIEWS & EXPERIENCES (Page 4) === */}
          <section className="mt-16 bg-slate-50/60 dark:bg-slate-900/40 p-6 sm:p-10 lg:p-12 rounded-3xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 pb-8 border-b border-slate-200/80 dark:border-slate-800/80">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1.5">Verified Feedback</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Client Reviews &amp; Experiences</h2>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">Real travelers who explored Ladakh with Shravya Tours</p>
              </div>

              {/* Overall Score & Trust Badges (PDF Page 4 reference) */}
              <div className="flex items-center gap-4 bg-white dark:bg-[#151d29] px-5 py-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-xs shrink-0">
                <div className="text-center pr-4 border-r border-slate-200 dark:border-slate-800">
                  <span className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white block leading-none">4.8</span>
                  <div className="flex text-amber-500 text-xs mt-1 justify-center">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i} className="material-symbols-outlined text-xs fill-current">star</span>
                    ))}
                  </div>
                  <span className="text-[9px] text-slate-400 font-bold block mt-0.5">2,842 Ratings</span>
                </div>
                <div className="space-y-1 text-xs font-semibold text-slate-600 dark:text-slate-350">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-emerald-500 text-sm">verified</span>
                    <span>100% Genuine Reviews</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-sm">thumb_up</span>
                    <span>98.6% Recommended</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Review Category Tags */}
            <div className="flex flex-wrap gap-2 mb-8">
              {['All', 'Stays', 'Acclimatization', 'Driver'].map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setSelectedReviewTag(tag);
                    setReviewIndex(0);
                  }}
                  className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all border cursor-pointer ${
                    selectedReviewTag === tag
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                      : 'bg-white dark:bg-[#151d29] border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-400'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>

            {/* Testimonials 3-Card Grid */}
            {filteredReviews.length > 0 ? (
              <div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {filteredReviews.slice(reviewIndex * 3, (reviewIndex + 1) * 3).map((rev, idx) => {
                    const realIdx = reviewIndex * 3 + idx;
                    const colors = [
                      'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300',
                      'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300',
                      'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                    ];
                    const avatarColor = colors[realIdx % colors.length];
                    const initials = rev.name.split(' ').map((n: string) => n[0]).join('').toUpperCase();
                    
                    return (
                      <div key={realIdx} className="bg-white dark:bg-[#151d29] p-6 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative min-h-[220px]">
                        <span className="material-symbols-outlined text-4xl text-slate-200 dark:text-slate-800 absolute top-4 right-4 select-none pointer-events-none">format_quote</span>
                        
                        <div className="relative z-10 space-y-3">
                          <div className="flex text-amber-500">
                            {Array.from({ length: rev.rating }).map((_, i) => (
                              <span key={i} className="material-symbols-outlined text-xs fill-current">star</span>
                            ))}
                          </div>
                          <p className="text-xs sm:text-sm text-slate-650 dark:text-slate-350 italic font-medium leading-relaxed">
                            "{rev.text}"
                          </p>
                        </div>

                        <div className="mt-5 flex items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                          <div className={`size-9 rounded-full flex items-center justify-center font-black text-xs ${avatarColor}`}>
                            {initials}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-slate-900 dark:text-white block">{rev.name}</span>
                            <span className="text-[10px] text-slate-400 block">{rev.date || 'Verified Traveler'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Slider Controls */}
                {Math.ceil(filteredReviews.length / 3) > 1 && (
                  <div className="flex items-center justify-center gap-3 mt-8">
                    <button
                      type="button"
                      onClick={() => setReviewIndex(prev => Math.max(0, prev - 1))}
                      disabled={reviewIndex === 0}
                      className="size-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151d29] flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Previous page"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_left</span>
                    </button>
                    
                    <div className="flex gap-1.5">
                      {Array.from({ length: Math.ceil(filteredReviews.length / 3) }).map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setReviewIndex(idx)}
                          className={`size-2 rounded-full transition-all ${
                            idx === reviewIndex ? 'bg-indigo-600 w-5' : 'bg-slate-300 dark:bg-slate-700'
                          }`}
                          aria-label={`Go to slide page ${idx + 1}`}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setReviewIndex(prev => Math.min(Math.ceil(filteredReviews.length / 3) - 1, prev + 1))}
                      disabled={reviewIndex === Math.ceil(filteredReviews.length / 3) - 1}
                      className="size-9 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-[#151d29] flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                      aria-label="Next page"
                    >
                      <span className="material-symbols-outlined text-sm">chevron_right</span>
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-10 text-center text-slate-400 text-xs bg-white dark:bg-[#151d29] border border-slate-200/80 dark:border-slate-800 rounded-2xl">
                No reviews available for this filter.
              </div>
            )}
          </section>

          {/* === PDF REFERENCE OUR BLOGS (Page 4) === */}
          <section className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">Traveler Guides</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Our Blogs</h2>
              </div>
              <Link
                to="/blog"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                Read All Blogs <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left 7 Columns: 3 Horizontal Blog Cards */}
              <div className="lg:col-span-7 space-y-4">
                {blogList.slice(0, 3).map((blog) => (
                  <Link
                    key={blog.id}
                    to={`/blog/${blog.id}`}
                    className="p-4 rounded-2xl bg-white dark:bg-[#151d29] border border-slate-200/80 dark:border-slate-800/80 shadow-xs hover:shadow-md transition-all flex flex-col sm:flex-row gap-4 items-center group cursor-pointer"
                  >
                    <div className="w-full sm:w-44 h-28 rounded-xl overflow-hidden shrink-0 bg-slate-100 dark:bg-slate-800 relative">
                      <OptimizedImage
                        src={blog.image}
                        alt={blog.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        <span>{blog.date}</span>
                        <span>•</span>
                        <span>{blog.readTime}</span>
                      </div>
                      <h4 className="text-sm font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors line-clamp-2 leading-snug">
                        {blog.title}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 font-medium">
                        {blog.excerpt}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>

              {/* Right 5 Columns: 1 Large Featured Guide Card */}
              <div className="lg:col-span-5">
                {blogList[0] && (
                  <Link
                    to={`/blog/${blogList[0].id}`}
                    className="relative block h-full min-h-[320px] rounded-3xl overflow-hidden group shadow-md"
                  >
                    <OptimizedImage
                      src={blogList[0].image}
                      alt={blogList[0].title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />
                    
                    <div className="absolute top-4 left-4">
                      <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 text-slate-900 backdrop-blur-md">
                        Featured Read
                      </span>
                    </div>

                    <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
                      <div className="flex items-center gap-2 text-[11px] text-white/80 font-semibold">
                        <span>{blogList[0].date}</span>
                        <span>•</span>
                        <span>{blogList[0].readTime}</span>
                      </div>
                      <h3 className="text-lg sm:text-xl font-black text-white leading-tight line-clamp-2 group-hover:text-amber-300 transition-colors">
                        {blogList[0].title}
                      </h3>
                      <p className="text-xs text-white/85 line-clamp-2 font-normal">
                        {blogList[0].excerpt}
                      </p>
                      <div className="pt-2 flex items-center gap-1.5 text-xs font-bold text-amber-400">
                        <span>Read Full Guide</span>
                        <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </div>
                    </div>
                  </Link>
                )}
              </div>
            </div>
          </section>

          {/* === PDF REFERENCE RELATED TRIPS (Page 5, matching Image 1 Aesthetic) === */}
          <section className="mt-16">
            <div className="flex items-center justify-between mb-8">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 block mb-1">Recommended Handpicked Tours</span>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">Related Trips</h2>
              </div>
              <Link
                to="/packages"
                className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
              >
                View All Trips <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedTrips.map((trip) => {
                const tripPrice = trip.pricingMode === 'Total_Tour' && trip.maxGuests && trip.maxGuests > 0
                  ? Math.round(trip.price / trip.maxGuests)
                  : trip.price;
                const tripOriginalPrice = trip.originalPrice || Math.round(tripPrice * 1.25);

                return (
                  <Link
                    key={trip.id}
                    to={`/packages/${trip.id}`}
                    onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                    className="group relative rounded-2xl overflow-hidden bg-slate-900 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col aspect-[3/4] cursor-pointer"
                  >
                    {/* Background Hero Image */}
                    <OptimizedImage
                      src={trip.image || trip.gallery?.[0] || tour.image}
                      alt={trip.title}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />

                    {/* Dark gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/20" />

                    {/* Top Badges: Location & Duration */}
                    <div className="relative p-4 flex items-center justify-between gap-2 z-10">
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-black/50 backdrop-blur-md text-white border border-white/20 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[12px] text-amber-400">pin_drop</span>
                        {getLocationName(trip.location, masterLocations)}
                      </span>
                      <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/90 text-slate-900 backdrop-blur-md">
                        {trip.days}D / {Math.max(1, trip.days - 1)}N
                      </span>
                    </div>

                    {/* Bottom Metadata & Pricing (Image 1 Style) */}
                    <div className="relative mt-auto p-4 z-10 space-y-2">
                      <h4 className="text-base font-black text-white leading-snug line-clamp-2 group-hover:text-amber-300 transition-colors">
                        {trip.title}
                      </h4>

                      <div className="flex items-baseline justify-between pt-1 border-t border-white/15">
                        <div>
                          <span className="text-[10px] text-white/70 block uppercase tracking-wider">Starting from</span>
                          <div className="flex items-baseline gap-1.5">
                            <span className="text-lg font-black text-white">₹{tripPrice.toLocaleString('en-IN')}</span>
                            {tripOriginalPrice > tripPrice && (
                              <span className="text-xs text-white/50 line-through">₹{tripOriginalPrice.toLocaleString('en-IN')}</span>
                            )}
                          </div>
                        </div>

                        <span className="px-3 py-1.5 rounded-xl bg-white text-slate-900 text-xs font-black group-hover:bg-amber-400 transition-colors">
                          View Trip &gt;
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* === PDF REFERENCE CUSTOMIZED TOUR BANNER (Page 5) === */}
          <section className="mt-16 mb-8 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-8 sm:p-12 relative overflow-hidden border border-slate-800 shadow-xl">
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 pointer-events-none flex items-center justify-center">
              <span className="material-symbols-outlined text-[200px]">landscape</span>
            </div>

            <div className="max-w-2xl relative z-10 space-y-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400 text-slate-950 inline-block">
                Custom Itineraries
              </span>
              <h3 className="text-2xl sm:text-3xl font-black tracking-tight">
                Want a Customized Tour Package for Your Dates?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed">
                Connect with our local destination specialists for a tailor-made Ladakh or Himalayan trip with private vehicle, flexible schedule, and handpicked stays.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setBookingModal(true)}
                  className="px-6 py-3.5 bg-white hover:bg-amber-400 text-slate-950 rounded-xl font-black text-xs uppercase tracking-wider transition-all shadow-lg active:scale-95 cursor-pointer flex items-center gap-2"
                >
                  <span className="material-symbols-outlined text-base text-indigo-700">edit_calendar</span>
                  Plan My Custom Trip
                </button>
              </div>
            </div>
          </section>

        </div> {/* Close max-w-[1600px] Container */}

        {/* === PDF REFERENCE MOBILE STICKY BOTTOM BAR === */}
        <div className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-200 dark:border-slate-800 px-4 py-3 z-40 lg:hidden shadow-[0_-4px_20px_-5px_rgba(0,0,0,0.15)] pb-safe-area-bottom">
          <div className="flex items-center justify-between max-w-lg mx-auto gap-3">
            <div className="shrink-0 min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Starting from
              </p>
              <div className="flex items-baseline gap-1">
                <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                  {formatPrice(perPersonPrice)}
                </p>
                <span className="text-[10px] font-bold text-slate-500">/ pax</span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleGetPdf}
                className="px-3 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-[#151d29] text-slate-700 dark:text-slate-200 font-bold text-[11px] flex items-center gap-1 active:scale-95 transition-all shadow-xs"
                title="Get PDF Itinerary"
              >
                <span className="material-symbols-outlined text-sm text-primary">description</span>
                PDF
              </button>

              <button
                type="button"
                onClick={() => setBookingModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold shadow-md shadow-indigo-600/20 active:scale-95 transition-all text-xs flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-[15px]">send</span>
                Send Query
              </button>

              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Hi, I'm interested in booking the tour: ${tour.title}\n${window.location.href}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="size-9 rounded-xl bg-[#25D366] text-white flex items-center justify-center transition-all shadow-sm shrink-0"
                title="Query on WhatsApp"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
              </a>
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
                              <label className="block text-xs font-bold uppercase text-slate-500 pl-1">Pricing Mode</label>
                              <select
                                value={editForm.pricingMode}
                                onChange={e => setEditForm({ ...editForm, pricingMode: e.target.value as any })}
                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 p-3.5 font-medium outline-none focus:ring-2 focus:ring-primary transition-all text-slate-900 dark:text-white"
                              >
                                <option value="group">Group/Package Price</option>
                                <option value="per_person">Per Person Price</option>
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

                        {/* Tour Videos Management section */}
                        <div className="mt-8 pt-8 border-t border-slate-100 dark:border-slate-800">
                          <div className="flex justify-between items-center mb-4">
                            <div>
                              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-350">Package Tour Videos & Reels</h3>
                              <p className="text-[11px] text-slate-400 mt-0.5">Add embeddable YouTube links, Instagram Reels, or Facebook videos.</p>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const tempId = `vid-${Date.now()}`;
                                setEditForm(prev => ({
                                  ...prev,
                                  videos: [...(prev.videos || []), { id: tempId, platform: 'youtube', url: '', caption: '' }]
                                }));
                              }}
                              className="px-3.5 py-2 bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 active:scale-95 animate-in fade-in duration-300"
                            >
                              <span className="material-symbols-outlined text-[16px]">add_circle</span>
                              Add Video Link
                            </button>
                          </div>

                          <div className="space-y-4">
                            {(editForm.videos || []).map((video, idx) => (
                              <div key={video.id} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 bg-slate-50 dark:bg-slate-850/40 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all hover:border-primary/20">
                                {/* Platform Select */}
                                <div className="w-full sm:w-44 space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase pl-1">Platform</label>
                                  <select
                                    value={video.platform}
                                    onChange={e => {
                                      const vList = [...editForm.videos];
                                      vList[idx] = { ...video, platform: e.target.value as any };
                                      setEditForm(prev => ({ ...prev, videos: vList }));
                                    }}
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-bold outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                  >
                                    <option value="youtube">YouTube</option>
                                    <option value="instagram">Instagram</option>
                                    <option value="facebook">Facebook</option>
                                  </select>
                                </div>
                                {/* URL Input */}
                                <div className="flex-1 w-full space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase pl-1">Video / Reel URL</label>
                                  <input
                                    required
                                    type="url"
                                    placeholder="e.g. https://www.instagram.com/reel/..."
                                    value={video.url}
                                    onChange={e => {
                                      const vList = [...editForm.videos];
                                      vList[idx] = { ...video, url: e.target.value };
                                      setEditForm(prev => ({ ...prev, videos: vList }));
                                    }}
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                  />
                                </div>
                                {/* Caption Input */}
                                <div className="w-full sm:w-64 space-y-1">
                                  <label className="text-[10px] font-bold text-slate-400 uppercase pl-1">Caption / Description</label>
                                  <input
                                    type="text"
                                    placeholder="e.g. Day 2 Highlights"
                                    value={video.caption || ''}
                                    onChange={e => {
                                      const vList = [...editForm.videos];
                                      vList[idx] = { ...video, caption: e.target.value };
                                      setEditForm(prev => ({ ...prev, videos: vList }));
                                    }}
                                    className="w-full rounded-lg border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-800 px-3 py-2 text-xs font-semibold outline-none focus:ring-1 focus:ring-primary text-slate-900 dark:text-white"
                                  />
                                </div>
                                {/* Delete Button */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditForm(prev => ({
                                      ...prev,
                                      videos: prev.videos.filter((_, i) => i !== idx)
                                    }));
                                  }}
                                  className="mt-5 sm:mt-4 p-2 text-slate-450 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                                  title="Remove Video Link"
                                >
                                  <span className="material-symbols-outlined text-[20px]">delete</span>
                                </button>
                              </div>
                            ))}
                            {(editForm.videos || []).length === 0 && (
                              <div className="text-center py-10 text-slate-400 text-xs border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl flex flex-col items-center justify-center gap-2">
                                <span className="material-symbols-outlined text-3xl">videocam</span>
                                No tour videos added. Click 'Add Video Link' above.
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

const VideoCardPlayer: React.FC<{ video: PackageVideo; fallbackImage?: string }> = ({ video, fallbackImage }) => {
  const [play, setPlay] = useState(false);
  const embedUrl = getEmbedUrl(video.platform, video.url);
  const thumbnailUrl = getVideoThumbnail(video.platform, video.url, fallbackImage);

  if (!play) {
    let iconName = 'play_arrow';
    let iconBg = 'bg-red-600';
    let label = 'Watch Video';
    
    if (video.platform === 'instagram') {
      iconName = 'movie';
      iconBg = 'bg-gradient-to-tr from-amber-500 via-pink-500 to-purple-600';
      label = 'Watch Reel';
    } else if (video.platform === 'facebook') {
      iconName = 'videocam';
      iconBg = 'bg-blue-600';
      label = 'Watch Video';
    }

    return (
      <div 
        onClick={() => setPlay(true)}
        className="relative w-full h-full bg-slate-950 cursor-pointer flex items-center justify-center group overflow-hidden"
      >
        {/* Background Thumbnail Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
          style={{ backgroundImage: `url(${thumbnailUrl})` }}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-slate-950/40 group-hover:bg-slate-950/30 transition-colors" />

        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className={`size-14 rounded-full ${iconBg} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
            <span className="material-symbols-outlined text-white text-3xl font-bold">{iconName}</span>
          </div>
          <span className="text-white text-[10px] uppercase tracking-widest font-black bg-black/60 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-sm shadow-md">
            {label}
          </span>
        </div>
      </div>
    );
  }

  return (
    <iframe
      src={embedUrl}
      title={video.caption || "Package Video"}
      className="w-full h-full border-0"
      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
      allowFullScreen
    />
  );
};