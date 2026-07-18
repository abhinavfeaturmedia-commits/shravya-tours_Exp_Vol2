import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { SEO } from '../components/ui/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import { formatPrice } from '../utils/packageUtils';
import {
  HotelBookingForm,
  TourBookingForm,
  CarBookingForm,
  BusBookingForm,
  TrainBookingForm,
  FlightBookingForm,
  QuickBookingModal,
  HotelBookingData,
  CarBookingData,
  BusBookingData,
  TrainBookingData,
  FlightBookingData,
} from '../components/booking';

export const Home: React.FC = () => {
  const { packages, cmsBanners, cmsTestimonials, cmsGallery, trendingDestinations, membershipPlans } = useData();
  const [activeTab, setActiveTab] = useState('tour-packages');
  const navigate = useNavigate();

  const carouselRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      if (carouselRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = carouselRef.current;
        const maxScroll = scrollWidth - clientWidth;
        if (scrollLeft >= maxScroll - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          const cardWidth = carouselRef.current.children[0]?.clientWidth || 350;
          const gap = 24;
          carouselRef.current.scrollBy({ left: cardWidth + gap, behavior: 'smooth' });
        }
      }
    }, 3500);
    return () => clearInterval(interval);
  }, []);

  const heroBanner = cmsBanners[0];
  const collections = cmsGallery;

  // Quick Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingType, setBookingType] = useState<'Car' | 'Bus' | 'Hotel' | 'Tour' | 'Train' | 'Flight'>('Car');
  const [bookingDetails, setBookingDetails] = useState('');
  const [bookingOrigin, setBookingOrigin] = useState('');
  const [bookingDestination, setBookingDestination] = useState('');
  const [bookingDate, setBookingDate] = useState('');
  const [bookingTravelers, setBookingTravelers] = useState('');

  // Form handlers
  const handleHotelSubmit = (data: HotelBookingData) => {
    const guestStr = `${data.guests.adults} Adult${data.guests.adults > 1 ? 's' : ''}, ${data.guests.children} Children, ${data.guests.rooms} Room${data.guests.rooms > 1 ? 's' : ''}`;
    setBookingType('Hotel');
    setBookingDetails(`Hotel in ${data.destination}, ${guestStr}`);
    setBookingOrigin('');
    setBookingDestination(data.destination);
    setBookingDate(data.checkIn);
    setBookingTravelers(`${data.guests.adults} Adult${data.guests.adults > 1 ? 's' : ''}${data.guests.children > 0 ? `, ${data.guests.children} Child${data.guests.children > 1 ? 'ren' : ''}` : ''}`);
    setIsBookingModalOpen(true);
  };

  const handleTourSubmit = (data: { destination: string }) => {
    const query = encodeURIComponent(data.destination.trim());
    navigate(`/packages?search=${query}`);
  };

  const handleCarSubmit = (data: CarBookingData) => {
    setBookingType('Car');
    setBookingDetails(`${data.vehicleType} Rental: ${data.pickupLocation} ${data.sameDropOff ? '(Round Trip)' : `to ${data.dropoffLocation}`}`);
    setBookingOrigin(data.pickupLocation);
    setBookingDestination(data.dropoffLocation || data.pickupLocation);
    setBookingDate(data.pickupDate);
    setBookingTravelers('2 Adults');
    setIsBookingModalOpen(true);
  };

  const handleBusSubmit = (data: BusBookingData) => {
    setBookingType('Bus');
    setBookingDetails(`Bus from ${data.from} to ${data.to}, ${data.seats} Seat(s), ${data.acType}, ${data.busType}`);
    setBookingOrigin(data.from);
    setBookingDestination(data.to);
    setBookingDate(data.date);
    setBookingTravelers(`${data.seats} Adult${data.seats > 1 ? 's' : ''}`);
    setIsBookingModalOpen(true);
  };

  const handleTrainSubmit = (data: TrainBookingData) => {
    setBookingType('Train');
    setBookingDetails(`Train from ${data.from} to ${data.to}, ${data.passengers} Passenger(s), Class: ${data.classType}`);
    setBookingOrigin(data.from);
    setBookingDestination(data.to);
    setBookingDate(data.date);
    setBookingTravelers(`${data.passengers} Adult${data.passengers > 1 ? 's' : ''}`);
    setIsBookingModalOpen(true);
  };

  const handleFlightSubmit = (data: FlightBookingData) => {
    setBookingType('Flight');
    setBookingDetails(`Flight from ${data.from} to ${data.to}, ${data.passengers} Passenger(s), Class: ${data.classType}`);
    setBookingOrigin(data.from);
    setBookingDestination(data.to);
    setBookingDate(data.date);
    setBookingTravelers(`${data.passengers} Adult${data.passengers > 1 ? 's' : ''}`);
    setIsBookingModalOpen(true);
  };

  // Trending packages: active only, first 4
  const trendingPackages = packages.filter(p => p.status !== 'Inactive').slice(0, 4);

  // ─── Fan Carousel State ───
  const [fanIndex, setFanIndex] = useState(0);
  const [windowWidth, setWindowWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize, { passive: true });
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const spacingFactor =
    windowWidth >= 1536 ? 240 :
    windowWidth >= 1280 ? 220 :
    windowWidth >= 1024 ? 190 :
    windowWidth >= 768  ? 145 :
    95;

  const [destFilter, setDestFilter] = useState('All');
  const [isHovered, setIsHovered] = useState(false);
  const fanTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const filteredDests = destFilter === 'All'
    ? trendingDestinations
    : trendingDestinations.filter(d => d.region === destFilter || d.country === destFilter);

  const destRegions = ['All', ...Array.from(new Set(trendingDestinations.map(d => d.region || d.country || '').filter(Boolean)))];

  const goPrev = useCallback(() => {
    setFanIndex(prev => prev === 0 ? Math.max(0, filteredDests.length - 1) : prev - 1);
  }, [filteredDests.length]);

  const goNext = useCallback(() => {
    setFanIndex(prev => (prev + 1) % Math.max(1, filteredDests.length));
  }, [filteredDests.length]);

  useEffect(() => {
    if (filteredDests.length === 0 || isHovered) return;
    fanTimerRef.current = setInterval(goNext, 4000);
    return () => { if (fanTimerRef.current) clearInterval(fanTimerRef.current); };
  }, [goNext, filteredDests.length, isHovered]);

  useEffect(() => { setFanIndex(0); }, [destFilter]);

  const fallbackReviews = [
    {
      id: "r1",
      customerName: "Omkar Bhalerao",
      platform: "Justdial",
      date: "20 Sep 2024",
      text: "I had an excellent experience with SHRAWELLO Travel Hub. They offered good deals and their prices were reasonable. The reservations were efficient and timely, and their service was quick. Overall, it was an excellent interaction with them.",
      rating: 5,
    },
    {
      id: "r2",
      customerName: "User",
      platform: "Justdial",
      date: "24 Sep 2024",
      text: "Awesome and great experience with SHRAWELLO Travel Hub. Well-experienced drivers with polite attitude.",
      rating: 5,
    },
    {
      id: "r3",
      customerName: "Payal Shinde",
      platform: "Justdial",
      date: "21 Sep 2024",
      text: "SHRAWELLO Travel Hub is an excellent transportation booking service. Their clean vehicles, reasonable pricing, and adherence to standard procedures make them a top choice. With fast response times and quick service, they are a reliable option for all your travel needs.",
      rating: 5,
    },
    {
      id: "r4",
      customerName: "Tejas",
      platform: "Justdial",
      date: "21 Sep 2024",
      text: "I recently travelled with SHRAWELLO Travel Hub and had a fantastic experience. The service was excellent, trip was very comfortable, and the rates were very reasonable. Highly recommend!!",
      rating: 5,
    },
    {
      id: "r5",
      customerName: "Dnyaneshwar Lohar",
      platform: "Justdial",
      date: "28 Sep 2024",
      text: "I had an excellent experience with SHRAWELLO Travel Hub! The SUV provided was safe, clean, and properly sanitised. Booking was easy and the service was quick. I would highly recommend them for any travel needs.",
      rating: 5,
    },
    {
      id: "r6",
      customerName: "CMA Dinesh Naik",
      platform: "Google",
      date: "",
      text: "Professional service at value for money rate. I really recommend this tour service.",
      rating: 5,
    },
    {
      id: "r7",
      customerName: "Sandesh Sankpal",
      platform: "Google",
      date: "",
      text: "I recently travelled through SHRAWELLO Travel Hub Sedan car to Southern region of India... The services are unbelievable, like free water bottles, tissue papers, basic medicines etc. are available in clean car. Wish you all the best for your future journey... Thanks...",
      rating: 5,
    },
    {
      id: "r8",
      customerName: "Pratik Patil",
      platform: "Google",
      date: "",
      text: "We booked an office friends' trip to Prayagraj with SHRAWELLO Travel Hub, and it was an unforgettable experience! The team took care of every detail, from transportation to sightseeing, and ensured that we had a wonderful time. What sets them apart is their personalized attention to detail.",
      rating: 5,
    },
    {
      id: "r9",
      customerName: "Dinesh Patil",
      platform: "Google",
      date: "",
      text: "We were thinking to visit Prayagraj Kumbh Mela... The trip was really memorable. They provided Mineral water bottle from start to end of trip as a complementary with basic medicine. We never get such a comfortable journey. The car was new and clean. Highly recommended for such type of trips.",
      rating: 4.5,
    }
  ];

  const activeCmsTestimonials = cmsTestimonials.filter(t => t.isActive);
  const displayReviews = activeCmsTestimonials.length > 0
    ? activeCmsTestimonials.map(t => ({
        id: t.id,
        customerName: t.customerName,
        platform: t.location || 'Website',
        date: '',
        text: t.text,
        rating: t.rating,
        avatarUrl: t.avatarUrl
      }))
    : fallbackReviews;

  // Hero floating images
  const heroFloatingImages = [
    heroBanner?.imageUrl || "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=400&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80&auto=format&fit=crop",
  ];

  return (
    <>
      <SEO
        title="Home"
        description="Book handpicked hotels, seamless flights, and immersive tours. Join 50,000+ travelers for unforgettable experiences."
      />

      {/* Quick Booking Modal */}
      <QuickBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        bookingType={bookingType}
        bookingDetails={bookingDetails}
        origin={bookingOrigin}
        destination={bookingDestination}
        defaultDate={bookingDate}
        defaultTravelers={bookingTravelers}
      />

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* HERO SECTION — WonderKids-inspired bright airy layout       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="relative w-full overflow-hidden bg-[#FBF7F0] dark:bg-[#0D1710]" style={{ minHeight: '92vh' }}>
        {/* Decorative blob backgrounds */}
        <div className="absolute top-[-80px] right-[-80px] w-[420px] h-[420px] rounded-full bg-primary/10 dark:bg-primary/15 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-60px] left-[-60px] w-[340px] h-[340px] rounded-full bg-accent/10 dark:bg-accent/15 blur-[90px] pointer-events-none" />
        <div className="absolute top-1/2 left-1/3 w-[200px] h-[200px] rounded-full bg-amber-400/8 blur-[70px] pointer-events-none" />

        <div className="container mx-auto px-4 md:px-10 relative z-10">
          <div className="flex flex-col lg:flex-row items-center gap-12 pt-24 pb-16 lg:pt-28 lg:pb-20 min-h-[92vh]">

            {/* LEFT — Text + CTAs + Stats */}
            <div className="flex-1 flex flex-col gap-8 text-center lg:text-left max-w-xl mx-auto lg:mx-0">
              {/* Eyebrow badge */}
              <div className="flex justify-center lg:justify-start">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 dark:bg-primary/20 text-primary text-xs font-black uppercase tracking-[0.2em] border border-primary/20">
                  <span className="size-2 rounded-full bg-primary animate-ping inline-block" />
                  ✦ India's Most Loved Travel Hub
                </span>
              </div>

              {/* Headline */}
              <div className="reveal">
                <h1 className="font-display text-slate-900 dark:text-white leading-[1.07] tracking-tight">
                  <span className="text-5xl md:text-6xl xl:text-7xl font-black block">
                    {heroBanner?.title
                      ? heroBanner.title.split(' ').map((word: string, i: number) =>
                          i === 1 || i === 2
                            ? <span key={i} className="italic" style={{ color: '#C9732A', fontFamily: 'Outfit, sans-serif' }}>{word}{' '}</span>
                            : <span key={i}>{word}{' '}</span>
                        )
                      : <>
                          Your Journey{' '}
                          <span className="italic" style={{ color: '#C9732A', fontFamily: 'Outfit, sans-serif' }}>Starts&nbsp;</span>
                          Here
                        </>
                    }
                  </span>
                </h1>
                <p className="mt-5 text-slate-600 dark:text-slate-400 text-base md:text-lg font-light leading-relaxed max-w-lg mx-auto lg:mx-0 reveal reveal-delay-2">
                  {heroBanner?.subtitle || "Premium tours, transparent pricing, and 24/7 expert support — crafted for every kind of traveler."}
                </p>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-wrap gap-4 justify-center lg:justify-start reveal reveal-delay-2">
                <Link
                  to="/packages"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-white font-bold text-sm shadow-lg transition-all duration-300 hover:scale-105 hover:shadow-xl active:scale-100"
                  style={{ backgroundColor: '#C9732A', boxShadow: '0 8px 30px rgba(201,115,42,0.35)' }}
                >
                  <span className="material-symbols-outlined text-[18px]">explore</span>
                  Explore Tours
                </Link>
                <a
                  href="#booking-widget"
                  className="inline-flex items-center gap-2.5 px-8 py-4 rounded-full text-slate-800 dark:text-white font-bold text-sm bg-white dark:bg-white/10 border border-slate-200 dark:border-white/15 shadow-sm transition-all duration-300 hover:scale-105 hover:shadow-md active:scale-100"
                >
                  Book Now
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                </a>
              </div>

              {/* Stats row */}
              <div className="flex items-center gap-8 justify-center lg:justify-start reveal reveal-delay-4">
                {[
                  { value: '50K+', label: 'Happy Travelers' },
                  { value: '200+', label: 'Destinations' },
                  { value: '4.9★', label: 'Avg. Rating' },
                ].map((stat, i) => (
                  <div key={i} className="flex flex-col items-center lg:items-start">
                    <span className="font-display text-2xl font-black text-slate-900 dark:text-white">{stat.value}</span>
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT — Floating photo collage */}
            <div className="flex-1 relative hidden lg:flex items-center justify-center" style={{ minHeight: '480px' }}>
              {/* Blob shape behind */}
              <div
                className="absolute inset-0 rounded-[60%_40%_30%_70%/60%_30%_70%_40%] opacity-30 dark:opacity-20"
                style={{ background: 'linear-gradient(135deg, #C9732A33 0%, #2D6A4F33 100%)', top: '5%', left: '5%', right: '5%', bottom: '5%' }}
              />

              {/* Main large image */}
              <div
                className="absolute rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white dark:border-white/10 transition-transform duration-700 hover:scale-[1.02]"
                style={{ width: '260px', height: '340px', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}
              >
                <img
                  src={heroFloatingImages[0]}
                  alt="Featured destination"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="font-bold text-sm leading-tight">Discover India</p>
                  <p className="text-xs text-white/70 mt-0.5">200+ Packages</p>
                </div>
              </div>

              {/* Top-right floating image */}
              <div
                className="absolute rounded-[1.5rem] overflow-hidden shadow-xl border-3 border-white dark:border-white/10 hover:scale-105 transition-transform duration-500"
                style={{ width: '150px', height: '190px', top: '2%', right: '6%' }}
              >
                <img src={heroFloatingImages[1]} alt="Travel" className="w-full h-full object-cover" />
              </div>

              {/* Bottom-left floating image */}
              <div
                className="absolute rounded-[1.5rem] overflow-hidden shadow-xl border-3 border-white dark:border-white/10 hover:scale-105 transition-transform duration-500"
                style={{ width: '140px', height: '170px', bottom: '4%', left: '4%' }}
              >
                <img src={heroFloatingImages[2]} alt="Adventure" className="w-full h-full object-cover" />
              </div>

              {/* Floating stat badge */}
              <div
                className="absolute flex items-center gap-3 bg-white dark:bg-slate-800 rounded-2xl px-4 py-3 shadow-xl border border-white dark:border-white/10"
                style={{ bottom: '20%', right: '2%' }}
              >
                <div className="size-10 rounded-full flex items-center justify-center text-white text-lg" style={{ backgroundColor: '#C9732A' }}>
                  <span className="material-symbols-outlined text-[20px]">verified</span>
                </div>
                <div>
                  <p className="font-black text-sm text-slate-900 dark:text-white">Book Risk-Free</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400">Free cancellation</p>
                </div>
              </div>

              {/* Floating hashtag tags — WonderKids style */}
              <div className="absolute top-[8%] left-[0%] flex flex-col gap-2">
                {['#adventure', '#comfort', '#memories'].map((tag, i) => (
                  <span
                    key={i}
                    className="px-3 py-1.5 rounded-full text-[11px] font-black border shadow-sm"
                    style={{
                      backgroundColor: i === 0 ? '#C9732A18' : i === 1 ? '#2D6A4F18' : '#f59e0b18',
                      color: i === 0 ? '#C9732A' : i === 1 ? '#2D6A4F' : '#d97706',
                      borderColor: i === 0 ? '#C9732A30' : i === 1 ? '#2D6A4F30' : '#f59e0b30',
                    }}
                  >
                    {tag}
                  </span>
                ))}
              </div>

              {/* Animated ping dot */}
              <div className="absolute top-[18%] right-[28%]">
                <div className="size-3 rounded-full bg-primary animate-ping opacity-60" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* BOOKING WIDGET — Elevated card anchored below hero          */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section id="booking-widget" className="relative bg-[#FBF7F0] dark:bg-[#0D1710] pb-16">
        <div className="container mx-auto px-4 md:px-10">
          <div className="w-full max-w-5xl mx-auto -mt-2 animate-in slide-in-from-bottom-8 duration-700">
            {/* Section label */}
            <div className="flex justify-center mb-6">
              <h2 className="font-display text-slate-900 dark:text-white text-2xl md:text-3xl font-bold text-center">
                Our <em className="not-italic" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>booking</em> services
              </h2>
            </div>

            {/* Tabs */}
            <div className="flex justify-center mb-5 px-4 w-full overflow-hidden">
              <div className="bg-white dark:bg-white/5 backdrop-blur-md p-1.5 rounded-full inline-flex flex-nowrap max-w-full overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-slate-200 dark:border-white/10 shadow-md touch-pan-x snap-x snap-mandatory">
                {[
                  { id: 'hotel-booking', icon: 'hotel', label: 'Hotels' },
                  { id: 'tour-packages', icon: 'luggage', label: 'Tours' },
                  { id: 'flight-booking', icon: 'flight', label: 'Flights' },
                  { id: 'train-booking', icon: 'train', label: 'Trains' },
                  { id: 'car-booking', icon: 'directions_car', label: 'Cars' },
                  { id: 'bus-booking', icon: 'directions_bus', label: 'Buses' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-4 md:px-6 py-3 rounded-full flex items-center gap-2.5 text-sm font-bold transition-all duration-300 whitespace-nowrap ${activeTab === tab.id
                      ? 'text-white shadow-md transform scale-105'
                      : 'text-slate-600 dark:text-white/70 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                    }`}
                    style={activeTab === tab.id ? { backgroundColor: '#C9732A', boxShadow: '0 4px 16px rgba(201,115,42,0.35)' } : {}}
                  >
                    <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Container */}
            <div className="bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl p-4 md:p-6 text-left border border-slate-100 dark:border-white/10 relative overflow-visible transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 rounded-t-[2rem]" style={{ background: 'linear-gradient(90deg, #C9732A, #f59e0b, #2D6A4F)' }} />
              {activeTab === 'hotel-booking' && <HotelBookingForm onSubmit={handleHotelSubmit} />}
              {activeTab === 'tour-packages' && <TourBookingForm onSubmit={handleTourSubmit} />}
              {activeTab === 'flight-booking' && <FlightBookingForm onSubmit={handleFlightSubmit} />}
              {activeTab === 'train-booking' && <TrainBookingForm onSubmit={handleTrainSubmit} />}
              {activeTab === 'car-booking' && <CarBookingForm onSubmit={handleCarSubmit} />}
              {activeTab === 'bus-booking' && <BusBookingForm onSubmit={handleBusSubmit} />}
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* WHY SHRAWELLO — WonderKids bold colored feature cards       */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-white dark:bg-slate-950 relative overflow-hidden">
        {/* Decorative dots grid */}
        <div
          className="absolute inset-0 pointer-events-none opacity-[0.04] dark:opacity-[0.06]"
          style={{ backgroundImage: 'radial-gradient(#C9732A 1px, transparent 1px)', backgroundSize: '28px 28px' }}
        />

        <div className="container mx-auto px-4 md:px-10 relative z-10">
          {/* Section Header */}
          <div className="text-center mb-14 reveal">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-4 rounded-full bg-primary/10 dark:bg-primary/15 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
              <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
              The SHRAWELLO Advantage
            </span>
            <h2 className="font-display text-slate-900 dark:text-white text-4xl md:text-5xl font-bold leading-tight">
              Our <em className="not-italic" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>exceptional</em>{' '}
              <br className="hidden md:block" />features
            </h2>
            <p className="mt-4 text-slate-500 dark:text-slate-400 text-base font-light max-w-lg mx-auto">
              Everything you need for a seamless, memorable journey — all in one place.
            </p>
          </div>

          {/* Feature Cards Grid — WonderKids style */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                icon: 'verified_user',
                title: 'Book',
                titleAccent: 'Risk-Free',
                desc: 'Flexible cancellations and full refunds on eligible bookings. Travel with complete peace of mind.',
                bg: 'bg-[#FBF7F0] dark:bg-white/5',
                iconBg: '#C9732A',
                accentColor: '#C9732A',
                delay: '',
                tag: '#safe',
              },
              {
                icon: 'support_agent',
                title: '24/7 Expert',
                titleAccent: 'Support',
                desc: 'Real humans, always ready to help. Our team is available around the clock for every traveler.',
                bg: 'bg-[#C9732A] dark:bg-[#C9732A]',
                iconBg: '#fff',
                accentColor: '#fff',
                delay: 'reveal-delay-2',
                tag: '#reliable',
                dark: true,
              },
              {
                icon: 'diamond',
                title: 'Handpicked',
                titleAccent: 'Quality',
                desc: 'Every tour, hotel, and experience is personally vetted by our travel experts for excellence.',
                bg: 'bg-amber-50 dark:bg-amber-950/20',
                iconBg: '#f59e0b',
                accentColor: '#d97706',
                delay: 'reveal-delay-4',
                tag: '#premium',
              },
            ].map((card, i) => (
              <div
                key={i}
                className={`reveal ${card.delay} relative group ${card.bg} rounded-[2rem] p-8 overflow-hidden border transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${
                  card.dark
                    ? 'border-white/10 text-white'
                    : 'border-slate-100 dark:border-white/10 text-slate-900 dark:text-white'
                }`}
              >
                {/* Background blob */}
                <div
                  className="absolute -top-12 -right-12 w-40 h-40 rounded-full opacity-20 transition-transform duration-700 group-hover:scale-150"
                  style={{ backgroundColor: card.dark ? '#fff' : card.iconBg }}
                />

                {/* Tag pill */}
                <span
                  className="inline-block px-3 py-1 rounded-full text-[11px] font-black mb-5 border"
                  style={{
                    backgroundColor: card.dark ? 'rgba(255,255,255,0.15)' : `${card.iconBg}18`,
                    color: card.dark ? '#fff' : card.accentColor,
                    borderColor: card.dark ? 'rgba(255,255,255,0.25)' : `${card.iconBg}30`,
                  }}
                >
                  {card.tag}
                </span>

                {/* Icon */}
                <div
                  className="size-14 rounded-2xl flex items-center justify-center mb-5 shadow-lg"
                  style={{ backgroundColor: card.dark ? 'rgba(255,255,255,0.2)' : `${card.iconBg}20` }}
                >
                  <span
                    className="material-symbols-outlined text-[28px]"
                    style={{ color: card.dark ? '#fff' : card.iconBg }}
                  >
                    {card.icon}
                  </span>
                </div>

                <h3 className={`font-display text-2xl font-black leading-tight mb-3 ${card.dark ? 'text-white' : 'text-slate-900 dark:text-white'}`}>
                  {card.title}{' '}
                  <span className="italic block" style={{ color: card.dark ? '#ffe0b2' : card.accentColor }}>
                    {card.titleAccent}
                  </span>
                </h3>
                <p className={`text-sm leading-relaxed font-light ${card.dark ? 'text-white/80' : 'text-slate-500 dark:text-slate-400'}`}>
                  {card.desc}
                </p>

                {/* Arrow link */}
                <Link
                  to="/about"
                  className="inline-flex items-center gap-1.5 mt-5 text-[13px] font-bold transition-all duration-300"
                  style={{ color: card.dark ? '#ffe0b2' : card.accentColor }}
                >
                  Learn more
                  <span className="material-symbols-outlined text-[15px] transition-transform duration-300 group-hover:translate-x-1">
                    arrow_forward
                  </span>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* TESTIMONIALS — Blog-card style strip                        */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-20 bg-[#FBF7F0] dark:bg-[#0D1710] relative overflow-hidden">
        {/* Subtle wavy border top */}
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: 'linear-gradient(90deg, #C9732A, #f59e0b, #2D6A4F, #C9732A)' }} />

        <div className="container mx-auto px-4 md:px-10 relative z-10">
          {/* Section Header */}
          <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6 reveal">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.25em] mb-3 block"
                style={{ color: '#C9732A' }}>
                <span className="size-2 rounded-full animate-ping inline-block" style={{ backgroundColor: '#C9732A' }} />
                ✦ Verified Reviews
              </span>
              <h2 className="font-display text-slate-900 dark:text-white text-4xl md:text-5xl font-bold leading-tight">
                Read our <em className="not-italic" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>traveler</em> stories
              </h2>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex -space-x-3">
                {[
                  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&crop=faces&q=80",
                  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&crop=faces&q=80",
                  "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&crop=faces&q=80",
                ].map((src, i) => (
                  <img key={i} src={src} alt={`Traveler ${i + 1}`} className="size-10 rounded-full ring-3 ring-white dark:ring-slate-900 object-cover shadow-md" />
                ))}
              </div>
              <div>
                <p className="font-black text-slate-900 dark:text-white text-sm">50,000+</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">happy travelers</p>
              </div>
            </div>
          </div>

          {/* Scrollable testimonial cards */}
          <div ref={carouselRef} className="flex overflow-x-auto pb-8 gap-6 snap-x snap-mandatory [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden reveal">
            {displayReviews.map((t, idx) => (
              <div
                key={t.id}
                className="snap-center shrink-0 w-[85vw] sm:w-[340px] md:w-[380px] bg-white dark:bg-white/5 p-7 rounded-[1.75rem] shadow-lg border border-slate-100 dark:border-white/10 relative flex flex-col justify-between group hover:-translate-y-1 transition-all duration-300 hover:shadow-xl"
              >
                {/* Left accent bar */}
                <div className="absolute left-0 top-6 bottom-6 w-1 rounded-r-full" style={{ backgroundColor: idx % 3 === 0 ? '#C9732A' : idx % 3 === 1 ? '#2D6A4F' : '#f59e0b' }} />

                <div>
                  {/* Stars + Platform */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex text-amber-500">
                      {[...Array(Math.floor(t.rating))].map((_, i) => (
                        <span key={i} className="material-symbols-outlined text-lg fill">star</span>
                      ))}
                      {t.rating % 1 !== 0 && (
                        <span className="material-symbols-outlined text-lg fill">star_half</span>
                      )}
                    </div>
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {t.platform}
                    </span>
                  </div>

                  {/* Big quote mark */}
                  <div className="text-6xl font-display leading-none select-none mb-2 opacity-10" style={{ color: '#C9732A' }}>"</div>
                  <p className="text-slate-700 dark:text-slate-300 italic mb-6 leading-relaxed font-light line-clamp-5 text-sm">
                    "{t.text}"
                  </p>
                </div>

                {/* Author */}
                <div className="flex items-center gap-4 mt-auto pt-4 border-t border-slate-100 dark:border-white/10">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.customerName} className="size-11 rounded-full object-cover shadow-inner ring-2" style={{ ringColor: '#C9732A20' }} />
                  ) : (
                    <div className="size-11 rounded-full flex items-center justify-center text-white font-black text-base shadow-inner"
                      style={{ background: 'linear-gradient(135deg, #C9732A, #2D6A4F)' }}>
                      {t.customerName[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="font-black text-slate-900 dark:text-white text-[15px] leading-none">{t.customerName}</h4>
                    {t.date && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{t.date}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Swipe hint (mobile) */}
          <div className="flex justify-center mt-4 md:hidden">
            <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
              <span className="material-symbols-outlined text-[18px]">swipe</span>
              <span>Swipe to read more</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* TRENDING DESTINATIONS — Fan Carousel (Pixel-perfect reference match) */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section
        className="py-20 bg-slate-50 dark:bg-slate-950 relative overflow-hidden transition-colors duration-500"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Background blur orbs */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] rounded-full bg-primary/5 dark:bg-primary/10 blur-[130px]" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-amber-500/5 dark:bg-amber-500/10 blur-[120px]" />
        </div>

        <div className="container mx-auto px-4 md:px-10 relative z-10">
          {/* Section title */}
          <div className="text-center mb-10 reveal">
            <span className="text-xs font-black uppercase tracking-[0.3em] text-primary mb-3 block flex items-center gap-1.5 justify-center">
              <span className="inline-block size-2 rounded-full bg-primary animate-ping" />
              ✦ TRENDING NOW
            </span>
            <h2 className="font-display text-slate-900 dark:text-white text-4xl md:text-5xl font-bold leading-tight tracking-tight mb-3">
              Trending <em className="not-italic" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Destinations</em>
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-base font-light max-w-xl mx-auto">
              Explore the world's most sought-after travel destinations, handpicked by our expert team.
            </p>
          </div>

          {/* Pill filter tabs — matching reference image */}
          <div className="flex flex-wrap justify-center gap-2 mb-10 reveal">
            {destRegions.slice(0, 9).map((region) => (
              <button
                key={region}
                onClick={() => setDestFilter(region)}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 border ${
                  destFilter === region
                    ? 'bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-950 dark:border-white shadow-lg'
                    : 'bg-white text-slate-600 border-slate-200 dark:bg-white/5 dark:text-slate-300 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {region}
              </button>
            ))}
            <Link
              to="/packages"
              className="px-5 py-2 rounded-full text-sm font-semibold bg-white text-slate-700 border border-slate-300 dark:bg-white/5 dark:text-amber-400 dark:border-amber-400/20 hover:bg-slate-50 dark:hover:bg-white/10 transition-all duration-300 flex items-center gap-1.5"
            >
              View More <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {filteredDests.length > 0 ? (
            <>
              {/* Fan / Stack Carousel */}
              <div
                className="relative flex justify-center items-center reveal"
                style={{ height: windowWidth >= 768 ? '520px' : '360px' }}
              >
                {(filteredDests.length <= 5 ? filteredDests : [
                  filteredDests[(fanIndex - 2 + filteredDests.length) % filteredDests.length],
                  filteredDests[(fanIndex - 1 + filteredDests.length) % filteredDests.length],
                  filteredDests[fanIndex % filteredDests.length],
                  filteredDests[(fanIndex + 1) % filteredDests.length],
                  filteredDests[(fanIndex + 2) % filteredDests.length],
                ]).map((dest, i, arr) => {
                  const total = arr.length;
                  const centerIdx = Math.floor(total / 2);
                  const offset = i - centerIdx;
                  const isCenter = offset === 0;
                  const absOffset = Math.abs(offset);
                  const baseWidth = windowWidth >= 1280 ? 280 : windowWidth >= 768 ? 240 : 180;
                  const baseHeight = windowWidth >= 1280 ? 430 : windowWidth >= 768 ? 380 : 280;
                  const scale = isCenter ? 1 : absOffset === 1 ? 0.84 : 0.68;
                  const zIndex = total - absOffset;
                  const opacity = absOffset === 0 ? 1 : absOffset === 1 ? 0.9 : 0.55;
                  const verticalOffset = isCenter ? 0 : absOffset === 1 ? 30 : 55;
                  return (
                    <div
                      key={dest.id}
                      onClick={() => {
                        if (isCenter) navigate('/packages?destinationId=' + encodeURIComponent(dest.id));
                        else setFanIndex(filteredDests.indexOf(dest));
                      }}
                      className={`absolute cursor-pointer transition-all duration-500 ease-out group select-none ${
                        isCenter ? '' : 'hover:opacity-90 hover:z-[50]'
                      }`}
                      style={{
                        width: `${baseWidth}px`,
                        height: `${baseHeight}px`,
                        zIndex,
                        opacity,
                        transform: `translateX(${offset * (isCenter ? 0 : spacingFactor)}px) translateY(${verticalOffset}px) scale(${scale})`,
                        left: '50%',
                        marginLeft: `-${baseWidth / 2}px`,
                        top: '50%',
                        marginTop: `-${baseHeight / 2}px`,
                      }}
                    >
                      <div className={`relative w-full h-full overflow-hidden transition-all duration-500 ${
                        isCenter
                          ? 'rounded-[2rem] shadow-[0_40px_80px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_80px_rgba(0,0,0,0.65)] ring-1 ring-black/5 dark:ring-white/10'
                          : 'rounded-[1.5rem] shadow-[0_15px_45px_rgba(0,0,0,0.15)] dark:shadow-[0_15px_45px_rgba(0,0,0,0.45)] border border-black/5 dark:border-white/5'
                      }`}>
                        <img
                          src={dest.imageUrl}
                          alt={dest.name}
                          className={`w-full h-full object-cover transition-transform duration-[2000ms] ${isCenter ? 'group-hover:scale-110' : ''}`}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />
                        {dest.badge && (
                          <div
                            className="absolute top-4 left-4 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest text-white flex items-center gap-1.5"
                            style={{ backgroundColor: dest.badgeColor || '#ef4444', boxShadow: `0 0 18px ${dest.badgeColor || '#ef4444'}70` }}
                          >
                            <span className="size-1.5 bg-white rounded-full animate-ping shrink-0" />
                            {dest.badge}
                          </div>
                        )}
                        <div className={`absolute bottom-4 right-4 rounded-full bg-white/15 backdrop-blur-md border border-white/25 flex items-center justify-center text-white transition-transform duration-300 group-hover:scale-110 ${isCenter ? 'size-10' : 'size-8'}`}>
                          <span className={`material-symbols-outlined ${isCenter ? 'text-[18px]' : 'text-[14px]'}`}>
                            {i % 2 === 0 ? 'play_arrow' : 'photo_camera'}
                          </span>
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-4 pr-14 z-10">
                          <h3 className={`font-black text-white leading-tight drop-shadow ${isCenter ? 'text-xl md:text-2xl' : 'text-sm'}`}>
                            {dest.name}
                          </h3>
                          {isCenter && dest.country && (
                            <p className="text-slate-300 text-xs mt-1 flex items-center gap-1 font-light">
                              <span className="material-symbols-outlined text-[13px] text-primary">location_on</span>
                              {dest.country}
                            </p>
                          )}
                          {isCenter && (
                            <>
                              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/10">
                                <div className="flex -space-x-2">
                                  <img className="size-6 rounded-full ring-2 ring-black object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=80&fit=crop&crop=faces&q=80" alt="t1" />
                                  <img className="size-6 rounded-full ring-2 ring-black object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&fit=crop&crop=faces&q=80" alt="t2" />
                                  <img className="size-6 rounded-full ring-2 ring-black object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&fit=crop&crop=faces&q=80" alt="t3" />
                                </div>
                                <span className="text-amber-300 text-[11px] font-bold tracking-wide">
                                  {dest.statLabel || `${(dest.packageCount || 0) + 100}+ travelers visited`}
                                </span>
                              </div>
                              <div className="mt-3 flex items-center gap-1.5 text-white/75 text-xs font-semibold group-hover:text-primary transition-colors">
                                <span>Explore packages</span>
                                <span className="material-symbols-outlined text-[13px] transition-transform group-hover:translate-x-1 duration-300">arrow_forward</span>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Navigation arrows + dot indicators */}
              <div className="flex justify-center items-center gap-4 mt-10">
                <button
                  id="fan-prev-btn"
                  onClick={() => { if (fanTimerRef.current) { clearInterval(fanTimerRef.current); fanTimerRef.current = null; } goPrev(); }}
                  className="size-12 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-transparent text-slate-700 dark:text-white flex items-center justify-center hover:bg-slate-900 hover:text-white hover:border-slate-900 dark:hover:bg-white dark:hover:text-slate-950 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
                  aria-label="Previous destination"
                >
                  <span className="material-symbols-outlined font-light text-[20px]">arrow_back</span>
                </button>

                <div className="flex gap-1.5">
                  {filteredDests.slice(0, Math.min(filteredDests.length, 7)).map((_, dotIdx) => (
                    <button
                      key={dotIdx}
                      onClick={() => setFanIndex(dotIdx)}
                      className={`rounded-full transition-all duration-300 ${
                        fanIndex % filteredDests.length === dotIdx
                          ? 'w-5 h-2 bg-slate-900 dark:bg-white'
                          : 'size-2 bg-slate-300 dark:bg-slate-600 hover:bg-slate-500 dark:hover:bg-slate-400'
                      }`}
                    />
                  ))}
                </div>

                <button
                  id="fan-next-btn"
                  onClick={() => { if (fanTimerRef.current) { clearInterval(fanTimerRef.current); fanTimerRef.current = null; } goNext(); }}
                  className="size-12 rounded-full border border-slate-300 dark:border-white/20 bg-white dark:bg-transparent text-slate-700 dark:text-white flex items-center justify-center hover:bg-slate-900 hover:text-white hover:border-slate-900 dark:hover:bg-white dark:hover:text-slate-950 transition-all duration-300 hover:scale-105 active:scale-95 shadow-sm"
                  aria-label="Next destination"
                >
                  <span className="material-symbols-outlined font-light text-[20px]">arrow_forward</span>
                </button>
              </div>
            </>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
              {trendingPackages.map((tour, idx) => (
                <div key={idx} className={`reveal reveal-delay-${idx + 1}`}>
                  <Link to={`/packages/${tour.id}`} className="group block bg-white dark:bg-white/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-slate-100 dark:border-white/10">
                    <div className="relative h-64 overflow-hidden">
                      <OptimizedImage src={tour.image} alt={tour.title} className="w-full h-full group-hover:scale-110 transition-transform duration-700" />
                      <div className="absolute top-4 right-4 bg-black/60 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-white flex items-center gap-1">
                        <span className="material-symbols-outlined text-primary text-sm fill">schedule</span> {tour.days} Days
                      </div>
                    </div>
                    <div className="p-6">
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors line-clamp-2 mb-3">{tour.title}</h3>
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-white/10 pt-4">
                        <span className="text-lg font-black text-slate-900 dark:text-white">{formatPrice(tour.price)}</span>
                        <div className="size-9 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white group-hover:bg-primary group-hover:text-white transition-colors">
                          <span className="material-symbols-outlined text-sm">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* CURATED COLLECTIONS — Restyled pill cards                   */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <section className="py-16 bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-white/5">
        <div className="container mx-auto px-4 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-4 reveal">
            <div>
              <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-[0.25em] mb-2 block"
                style={{ color: '#C9732A' }}>
                ✦ Hand-selected for you
              </span>
              <h2 className="font-display text-slate-900 dark:text-white text-3xl md:text-4xl font-bold">
                Curated <em className="not-italic" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Collections</em>
              </h2>
              <p className="text-slate-500 dark:text-slate-400 text-base font-light mt-1">Handpicked experiences for every type of traveler.</p>
            </div>
            <Link to="/packages" className="hidden md:flex items-center gap-2 font-bold hover:opacity-75 transition-opacity text-sm" style={{ color: '#C9732A' }}>
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          {/* Horizontal scrollable pill cards */}
          <div className="flex overflow-x-auto pb-4 gap-4 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden reveal">
            {collections.length > 0 ? collections.map((trip, idx) => (
              <div
                key={idx}
                onClick={() => navigate('/packages?search=' + encodeURIComponent(trip.title))}
                className="group cursor-pointer flex-shrink-0 flex items-center gap-4 bg-[#FBF7F0] dark:bg-white/5 hover:bg-white dark:hover:bg-white/10 border border-slate-100 dark:border-white/10 rounded-2xl px-4 py-3 pr-6 shadow-sm hover:shadow-lg transition-all duration-300 hover:-translate-y-0.5 min-w-[200px]"
              >
                {/* Circular thumbnail */}
                <div className="relative size-14 rounded-xl overflow-hidden flex-shrink-0 border-2 border-white dark:border-white/10 shadow-md group-hover:scale-105 transition-transform duration-300">
                  <OptimizedImage
                    src={trip.imageUrl}
                    alt={trip.title}
                    className="w-full h-full"
                  />
                </div>
                <div>
                  <p className="text-slate-900 dark:text-white font-black text-sm group-hover:text-primary transition-colors">{trip.title}</p>
                  <p className="text-slate-400 dark:text-slate-500 text-[11px] font-medium uppercase tracking-wide mt-0.5">{trip.category}</p>
                </div>
                <span className="material-symbols-outlined text-slate-300 dark:text-slate-600 text-[18px] ml-auto group-hover:text-primary group-hover:translate-x-1 transition-all duration-300">arrow_forward</span>
              </div>
            )) : (
              <p className="text-center w-full text-slate-500 py-8">No collections found.</p>
            )}
          </div>

          {/* Mobile view all link */}
          <div className="flex justify-center mt-6 md:hidden">
            <Link to="/packages" className="flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-full border transition-all duration-300 hover:text-white hover:border-transparent"
              style={{ color: '#C9732A', borderColor: '#C9732A40' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = '#C9732A'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              View All Collections <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* MEMBERSHIP PRICING SECTION — Unchanged logic/data           */}
      {/* ═══════════════════════════════════════════════════════════ */}
      {(() => {
        const visiblePlans = membershipPlans.filter(p => p.isActive && p.showOnHomepage);
        if (visiblePlans.length === 0) return null;

        const popularPlanId = visiblePlans.reduce((best, p) =>
          p.pricePerYear > best.pricePerYear ? p : best, visiblePlans[0]
        ).id;

        const tierGradients: Record<string, string> = {
          Bronze: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
          Silver: 'from-slate-50 to-gray-100 dark:from-slate-900/40 dark:to-gray-900/40',
          Gold: 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20',
        };

        return (
          <section className="py-20 bg-[#FBF7F0] dark:bg-[#0D1710] border-t border-slate-100 dark:border-white/5 relative overflow-hidden">
            <div className="pointer-events-none absolute -top-32 -left-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-indigo-400/5 blur-3xl" />

            <div className="container mx-auto px-4 md:px-10 relative z-10">
              {/* Section Header */}
              <div className="text-center mb-14 reveal">
                <span className="inline-flex items-center gap-2 px-4 py-1.5 mb-5 rounded-full bg-primary/10 dark:bg-primary/15 text-primary text-xs font-bold uppercase tracking-widest border border-primary/20">
                  <span className="material-symbols-outlined text-[14px]">workspace_premium</span>
                  Membership
                </span>
                <h2 className="font-display text-slate-900 dark:text-white text-4xl md:text-5xl font-bold tracking-tight leading-tight">
                  Travel <em className="not-italic" style={{ fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>Membership</em> Plans
                </h2>
                <p className="mt-4 text-slate-500 dark:text-slate-400 text-base md:text-lg font-light max-w-xl mx-auto">
                  Unlock exclusive discounts, priority service, and handpicked perks on every journey you take with us.
                </p>
              </div>

              {/* Plan Cards */}
              <div className={`grid gap-8 ${
                visiblePlans.length === 1 ? 'grid-cols-1 max-w-sm mx-auto' :
                visiblePlans.length === 2 ? 'grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto' :
                'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
              }`}>
                {visiblePlans.map((plan, idx) => {
                  const isPopular = plan.id === popularPlanId && visiblePlans.length > 1;
                  const tierBg = tierGradients[plan.tier] || tierGradients.Bronze;
                  const topPerks = plan.perks.slice(0, 6);
                  const hasMorePerks = plan.perks.length > 6;

                  return (
                    <div
                      key={plan.id}
                      className={`reveal reveal-delay-${idx + 1} relative flex flex-col rounded-3xl overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl ${
                        isPopular
                          ? 'shadow-2xl ring-2 ring-offset-2 ring-offset-background-light dark:ring-offset-background-dark'
                          : 'shadow-lg border border-slate-200 dark:border-white/10'
                      }`}
                      style={isPopular ? { ringColor: plan.color } : {}}
                    >
                      {isPopular && (
                        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: `0 0 0 2px ${plan.color}` }} />
                      )}

                      {isPopular && (
                        <div className="absolute top-5 right-5 z-20">
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full text-white shadow-lg" style={{ backgroundColor: plan.color }}>
                            <span className="material-symbols-outlined text-[12px]">star</span>
                            Popular
                          </span>
                        </div>
                      )}

                      <div className={`bg-gradient-to-br ${tierBg} px-8 pt-8 pb-7 relative overflow-hidden`}>
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: plan.color }} />
                        <div className="relative z-10">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-4 border"
                            style={{ backgroundColor: `${plan.color}18`, color: plan.color, borderColor: `${plan.color}30` }}>
                            <span className="material-symbols-outlined text-[13px]">workspace_premium</span>
                            {plan.tier} Tier
                          </span>

                          <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-1">{plan.name}</h3>
                          <p className="text-slate-500 dark:text-slate-400 text-sm font-light mb-5">
                            {plan.discountType === 'Flat_Amount'
                              ? `Save ₹${plan.discountFlat.toLocaleString()} on every booking`
                              : `Save up to ${plan.discountPercent}% on every booking`
                            }
                          </p>

                          <div className="flex items-baseline gap-2 mb-1">
                            <span className="text-4xl font-black text-slate-900 dark:text-white">
                              ₹{plan.pricePerYear.toLocaleString()}
                            </span>
                            <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">/year</span>
                          </div>
                          {plan.pricePerMonth > 0 && (
                            <p className="text-[12px] text-slate-400 dark:text-slate-500 font-light">
                              or ₹{plan.pricePerMonth.toLocaleString()}/month · cancel anytime
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="px-8 py-5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-white/5 flex flex-col gap-3">
                        <Link
                          to={`/contact?plan=${encodeURIComponent(plan.name)}`}
                          className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl font-bold text-sm text-white transition-all duration-300 hover:opacity-90 hover:scale-[1.02] active:scale-100 shadow-lg"
                          style={{ backgroundColor: plan.color, boxShadow: `0 8px 24px ${plan.color}35` }}
                        >
                          <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
                          Join Now
                        </Link>
                        <Link
                          to="/contact"
                          className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl font-semibold text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"
                        >
                          Talk to us
                          <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                        </Link>
                      </div>

                      <div className="px-8 py-7 bg-white dark:bg-slate-900 flex-1 flex flex-col">
                        <div className="grid grid-cols-2 gap-3 mb-6">
                          {plan.hotelDiscount > 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                              <span className="material-symbols-outlined text-slate-400 text-[16px]">hotel</span>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Hotel +{plan.hotelDiscount}%</span>
                            </div>
                          )}
                          {plan.tourDiscount > 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                              <span className="material-symbols-outlined text-slate-400 text-[16px]">tour</span>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Tour +{plan.tourDiscount}%</span>
                            </div>
                          )}
                          {plan.flightDiscount > 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                              <span className="material-symbols-outlined text-slate-400 text-[16px]">flight</span>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Flight +{plan.flightDiscount}%</span>
                            </div>
                          )}
                          {plan.cabDiscount > 0 && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-white/5 border border-slate-100 dark:border-white/5">
                              <span className="material-symbols-outlined text-slate-400 text-[16px]">local_taxi</span>
                              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">Cab +{plan.cabDiscount}%</span>
                            </div>
                          )}
                        </div>

                        {topPerks.length > 0 && (
                          <>
                            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4">Included perks</p>
                            <ul className="space-y-3 flex-1">
                              {topPerks.map((perk, i) => (
                                <li key={i} className="flex items-start gap-3">
                                  <div
                                    className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center mt-0.5"
                                    style={{ backgroundColor: `${plan.color}20`, color: plan.color }}
                                  >
                                    <span className="material-symbols-outlined text-[12px] font-bold">check</span>
                                  </div>
                                  <span className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">{perk}</span>
                                </li>
                              ))}
                              {hasMorePerks && (
                                <li className="flex items-center gap-2 text-slate-400 dark:text-slate-500">
                                  <span className="material-symbols-outlined text-[14px]">more_horiz</span>
                                  <span className="text-xs font-semibold">{plan.perks.length - 6} more perks included</span>
                                </li>
                              )}
                            </ul>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-10 font-light">
                All plans include priority customer support. &nbsp;
                <Link to="/contact" className="font-semibold hover:underline" style={{ color: '#C9732A' }}>Contact us</Link> to learn more.
              </p>
            </div>
          </section>
        );
      })()}

    </>
  );
};