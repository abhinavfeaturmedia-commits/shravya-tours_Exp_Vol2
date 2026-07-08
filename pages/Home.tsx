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
        
        // If we've reached the end
        if (scrollLeft >= maxScroll - 10) {
          carouselRef.current.scrollTo({ left: 0, behavior: 'smooth' });
        } else {
          // Find the width of a single card + gap
          const cardWidth = carouselRef.current.children[0]?.clientWidth || 350;
          const gap = 24; // 6 * 4px = 24px (gap-6)
          carouselRef.current.scrollBy({ left: cardWidth + gap, behavior: 'smooth' });
        }
      }
    }, 3500); // Wait 3.5 seconds before scrolling to the next
    
    return () => clearInterval(interval);
  }, []);

  const heroBanner = cmsBanners[0]; // Active Banner
  const collections = cmsGallery; // Use CMS Gallery for collections

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
    setBookingTravelers('2 Adults'); // Defaults to 2 adults for car bookings
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

  // Collections are now dynamic
  // const collections = ... (Removed static)

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
    windowWidth >= 1536 ? 240 : // 2xl
    windowWidth >= 1280 ? 220 : // xl
    windowWidth >= 1024 ? 190 : // lg
    windowWidth >= 768  ? 145 : // md
    95;                         // mobile

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

  // Reset index when filter changes
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

      {/* Hero Section */}
      {/* Hero Section */}
      <section className="relative w-full overflow-visible bg-slate-900 z-20">
        <div className="absolute inset-0 z-0">
          <OptimizedImage
            src={heroBanner?.imageUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=85&auto=format&fit=crop"}
            alt="Hero Background"
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-900"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center gap-8 md:gap-12 text-center pt-28 pb-20 lg:pt-32 lg:pb-24">
          <div className="flex flex-col gap-4 md:gap-6 max-w-5xl reveal">
            <h1 className="font-display text-white text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight drop-shadow-2xl italic">
              {heroBanner?.title || "Experience the World"}
            </h1>
            <p className="text-slate-200 text-base md:text-xl font-light leading-relaxed max-w-3xl mx-auto drop-shadow-lg reveal reveal-delay-2">
              {heroBanner?.subtitle || "Premium tours, transparent pricing, and 24/7 expert support."}
            </p>
          </div>

          {/* Booking Widget */}
          <div className="w-full max-w-6xl mt-2 animate-in slide-in-from-bottom-10 duration-1000 delay-200">
            {/* Tabs */}
            <div className="flex justify-center mb-8 px-4 w-full overflow-hidden">
              <div className="bg-black/30 backdrop-blur-md p-1.5 rounded-full inline-flex flex-nowrap max-w-full overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-white/10 shadow-xl touch-pan-x snap-x snap-mandatory">
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
                      ? 'bg-white text-slate-900 shadow-md transform scale-105'
                      : 'text-white/80 hover:bg-white/10 hover:text-white'
                      }`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{tab.icon}</span>
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Form Container */}
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2rem] shadow-2xl p-4 md:p-6 text-left border border-white/20 relative overflow-visible transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-amber-400 to-accent rounded-t-[2rem]"></div>

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



      {/* The SHRAWELLO Advantage */}
      <section className="py-12 mesh-warm dark:bg-slate-900 border-b border-border-light dark:border-border-dark grain">
        <div className="container mx-auto px-4 md:px-10 relative z-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: 'verified_user', title: 'Book Risk-Free', desc: 'Flexible cancellations & full refunds.', delay: '' },
              { icon: 'support_agent', title: '24/7 Expert Support', desc: 'Real humans, always ready to help.', delay: 'reveal-delay-2' },
              { icon: 'diamond', title: 'Handpicked Quality', desc: 'Every experience is vetted by experts.', delay: 'reveal-delay-4' }
            ].map((item, i) => (
              <div key={i} className={`reveal ${item.delay} flex items-center gap-4 p-5 rounded-2xl bg-white/60 dark:bg-white/5 backdrop-blur-sm hover:bg-white/90 dark:hover:bg-white/10 transition-colors border border-white/80 dark:border-white/10 shadow-sm`}>
                <div className="size-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-900 dark:text-white leading-tight">{item.title}</h3>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section (New) */}
      <section className="py-20 bg-[#F4EFE6] dark:bg-[#0D1710] grain relative overflow-hidden">
        <div className="container mx-auto px-4 md:px-10 relative z-10">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-center mb-4 text-slate-900 dark:text-white reveal italic">Stories from Happy Travelers</h2>
          <p className="text-center text-slate-500 max-w-2xl mx-auto mb-12">Don't just take our word for it—read verified reviews from our travelers on Google and Justdial.</p>
          
          {/* Carousel Container */}
          <div ref={carouselRef} className="flex overflow-x-auto pb-8 gap-6 snap-x snap-mandatory [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden reveal">
            {displayReviews.map((t, idx) => (
              <div 
                key={t.id} 
                className="snap-center shrink-0 w-[85vw] sm:w-[350px] md:w-[400px] bg-white/90 dark:bg-white/5 backdrop-blur-sm p-8 rounded-[2rem] shadow-lg border border-white dark:border-white/10 relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex text-amber-500">
                      {[...Array(Math.floor(t.rating))].map((_, i) => (
                        <span key={i} className="material-symbols-outlined text-lg fill">star</span>
                      ))}
                      {t.rating % 1 !== 0 && (
                        <span className="material-symbols-outlined text-lg fill">star_half</span>
                      )}
                    </div>
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md">
                      {t.platform}
                    </div>
                  </div>
                  <div className="text-5xl text-primary/10 dark:text-primary/20 absolute top-5 left-6 font-display leading-none select-none">"
                  </div>
                  <p className="text-slate-700 dark:text-slate-300 relative z-10 italic mb-6 leading-relaxed font-light line-clamp-6 text-sm md:text-base">
                    "{t.text}"
                  </p>
                </div>
                <div className="flex items-center gap-4 mt-auto">
                  {t.avatarUrl ? (
                    <img src={t.avatarUrl} alt={t.customerName} className="size-12 rounded-full object-cover shadow-inner" />
                  ) : (
                    <div className="size-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-inner">
                      {t.customerName[0]}
                    </div>
                  )}
                  <div>
                    <h4 className="font-bold text-slate-900 dark:text-white leading-none text-base">{t.customerName}</h4>
                    {t.date && <p className="text-xs text-slate-500 mt-1">{t.date}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          
          {/* Carousel instruction for mobile */}
          <div className="flex justify-center mt-4 md:hidden">
            <div className="flex items-center gap-2 text-slate-400 text-sm animate-pulse">
              <span className="material-symbols-outlined text-[18px]">swipe</span>
              <span>Swipe to read more</span>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* TRENDING DESTINATIONS — Fan Carousel (Pixel-perfect reference match) */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
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
            <h2 className="font-display text-slate-900 dark:text-white text-4xl md:text-5xl font-bold leading-tight tracking-tight italic mb-3">
              Trending Destinations
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

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* CURATED COLLECTIONS — Original Circular Section                 */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      <section className="py-12 bg-background-light dark:bg-background-dark border-t border-border-light dark:border-border-dark">
        <div className="container mx-auto px-4 md:px-10">
          <div className="flex flex-col md:flex-row justify-between items-end mb-8 gap-4 reveal">
            <div>
              <h2 className="font-display text-slate-900 dark:text-white text-3xl md:text-4xl font-bold tracking-tight mb-2 italic">Curated Collections</h2>
              <p className="text-slate-500 dark:text-slate-400 text-base font-light">Handpicked experiences for every type of traveler.</p>
            </div>
            <Link to="/packages" className="hidden md:flex items-center gap-2 text-primary font-bold hover:text-primary-dark transition-colors text-sm">
              View All <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </Link>
          </div>

          <div className="flex overflow-x-auto pb-4 gap-4 [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {collections.length > 0 ? collections.map((trip, idx) => (
              <div key={idx} onClick={() => navigate('/packages?search=' + encodeURIComponent(trip.title))} className="group cursor-pointer flex-shrink-0 flex flex-col items-center gap-3 min-w-[140px] md:min-w-[180px]">
                <div className="relative size-28 md:size-36 rounded-full overflow-hidden border-[4px] border-white dark:border-slate-800 shadow-xl group-hover:shadow-primary/30 transition-all duration-500 group-hover:-translate-y-1">
                  <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors z-10"></div>
                  <OptimizedImage
                    src={trip.imageUrl}
                    alt={trip.title}
                    className="w-full h-full"
                  />
                </div>
                <div className="text-center px-2">
                  <p className="text-slate-900 dark:text-white font-bold text-sm md:text-base group-hover:text-primary transition-colors leading-tight">{trip.title}</p>
                  <p className="text-slate-500 dark:text-slate-400 text-[10px] font-medium uppercase tracking-wide mt-1 line-clamp-1">{trip.category}</p>
                </div>
              </div>
            )) : <p className="text-center w-full text-slate-500">No collections found.</p>}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════ */}
      {/* MEMBERSHIP PRICING SECTION                                      */}
      {/* Only renders when at least one active plan has showOnHomepage   */}
      {/* ═══════════════════════════════════════════════════════════════ */}
      {(() => {
        const visiblePlans = membershipPlans.filter(p => p.isActive && p.showOnHomepage);
        if (visiblePlans.length === 0) return null;

        // Mark the most expensive plan as "Popular"
        const popularPlanId = visiblePlans.reduce((best, p) =>
          p.pricePerYear > best.pricePerYear ? p : best, visiblePlans[0]
        ).id;

        const tierGradients: Record<string, string> = {
          Bronze: 'from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20',
          Silver: 'from-slate-50 to-gray-100 dark:from-slate-900/40 dark:to-gray-900/40',
          Gold: 'from-yellow-50 to-amber-50 dark:from-yellow-950/20 dark:to-amber-950/20',
        };

        return (
          <section className="py-20 bg-background-light dark:bg-background-dark border-t border-border-light dark:border-border-dark relative overflow-hidden">
            {/* Subtle decorative blobs */}
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
                      {/* Popular ring via inline style */}
                      {isPopular && (
                        <div className="absolute inset-0 rounded-3xl pointer-events-none" style={{ boxShadow: `0 0 0 2px ${plan.color}` }} />
                      )}

                      {/* Popular Badge */}
                      {isPopular && (
                        <div className="absolute top-5 right-5 z-20">
                          <span className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full text-white shadow-lg" style={{ backgroundColor: plan.color }}>
                            <span className="material-symbols-outlined text-[12px]">star</span>
                            Popular
                          </span>
                        </div>
                      )}

                      {/* Card Header */}
                      <div className={`bg-gradient-to-br ${tierBg} px-8 pt-8 pb-7 relative overflow-hidden`}>
                        {/* Decorative circle */}
                        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full opacity-10" style={{ backgroundColor: plan.color }} />

                        <div className="relative z-10">
                          {/* Tier badge */}
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider px-3 py-1 rounded-full mb-4 border"
                            style={{ backgroundColor: `${plan.color}18`, color: plan.color, borderColor: `${plan.color}30` }}
                          >
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

                          {/* Price */}
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

                      {/* CTA Buttons */}
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

                      {/* Perks List */}
                      <div className="px-8 py-7 bg-white dark:bg-slate-900 flex-1 flex flex-col">
                        {/* Discount highlights */}
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

                        {/* Included Perks label */}
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

              {/* Bottom note */}
              <p className="text-center text-sm text-slate-400 dark:text-slate-500 mt-10 font-light">
                All plans include priority customer support. &nbsp;
                <Link to="/contact" className="text-primary font-semibold hover:underline">Contact us</Link> to learn more.
              </p>
            </div>
          </section>
        );
      })()}


    </>
  );
};