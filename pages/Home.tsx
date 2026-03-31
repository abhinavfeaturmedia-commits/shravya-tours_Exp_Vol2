import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { SEO } from '../components/ui/SEO';
import { OptimizedImage } from '../components/ui/OptimizedImage';
import {
  HotelBookingForm,
  TourBookingForm,
  CarBookingForm,
  BusBookingForm,
  QuickBookingModal,
  HotelBookingData,
  CarBookingData,
  BusBookingData,
} from '../components/booking';

export const Home: React.FC = () => {
  const { packages, cmsBanners, cmsTestimonials, cmsGallery } = useData();
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
  const [bookingType, setBookingType] = useState<'Car' | 'Bus' | 'Hotel' | 'Tour'>('Car');
  const [bookingDetails, setBookingDetails] = useState('');

  // Form handlers
  const handleHotelSubmit = (data: HotelBookingData) => {
    const guestStr = `${data.guests.adults} Adult${data.guests.adults > 1 ? 's' : ''}, ${data.guests.children} Children, ${data.guests.rooms} Room${data.guests.rooms > 1 ? 's' : ''}`;
    setBookingType('Hotel');
    setBookingDetails(`Hotel in ${data.destination}, ${guestStr}`);
    setIsBookingModalOpen(true);
  };

  const handleTourSubmit = (data: { destination: string }) => {
    const query = encodeURIComponent(data.destination.trim());
    navigate(`/packages?search=${query}`);
  };

  const handleCarSubmit = (data: CarBookingData) => {
    setBookingType('Car');
    setBookingDetails(`${data.vehicleType} Rental: ${data.pickupLocation} ${data.sameDropOff ? '(Round Trip)' : `to ${data.dropoffLocation}`}`);
    setIsBookingModalOpen(true);
  };

  const handleBusSubmit = (data: BusBookingData) => {
    setBookingType('Bus');
    setBookingDetails(`Bus from ${data.from} to ${data.to}, ${data.seats} Seat(s)`);
    setIsBookingModalOpen(true);
  };

  // Collections are now dynamic
  // const collections = ... (Removed static)

  // Trending destinations - Left Static/Package driven for now as per plan
  const trendingTours = [
    { id: 'kerala-backwaters', title: 'Kerala Backwaters', price: '₹35,000', days: '5 Days', loc: 'Kerala, India', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBp90RDz-sdjWIaMxCiFRFPO2JsAtK8_dVyOrgkjVXU2eyOfv-QVT0aL8P898Icc29bRifPA2obAWYdG2DUFAu34TSsNNv6AEBb3PkvvVLUy7SiHFhxeAmVHy5JBvY1y3-aVD3CNyS4GknQTya93LHTeT3z7AdLkm9WnOOCJCJKFhwsg0FzrktdLVdl7GvmF40ru8MoKKDLDCnEKa5pwANUTQwYGofMrr6hkRstcsuxW0zFPZrgXEepwClL91yq119GbnN_2TXDnS-4' },
    { id: 'manali-escape', title: 'Majestic Manali', price: '₹28,000', days: '6 Days', loc: 'Himachal, India', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCw3nTyyZIHE-X4IDz1WIxoLShlt4crH7NAqMA0V0L2ehFuGP9AGiAolK-y2VtcGXQNnGxdEkuHTXyJ44x9J5RiIg5apuiNJV-7xi5I2UV2r-KSd-dgzrATQDbBkFz4UKlFbdF5SgirAYanpbXenNDr-_uktTK_A2FTmUBwhVLQfYFh1gqRN8EoLj-9g8qrA6B21OH52wai00ETSdEUNm2LJQX1poTztcNfmmE2IMrm1oTdfTQ3Sg0DwMSXi2UM_QPDWQt27m2xr8-D' },
    { id: 'golden-triangle', title: 'Golden Triangle Tour', price: '₹45,000', days: '6 Days', loc: 'North India', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDe8BDAUta_Sad0sbfFPp3eGFuTDne-kjCHaSbEmPIsw2A35eYa_4cmO0qQIrrAUnyuBkmJYYx5BswvQ8xoNvi-V48GV78qtY2osp3mRT5dAgVv31-tcAdYZIYq5VwnghdHN-xLMZHlH8DhevC9MvU-RUVOzTxENfRuR9CornjT44jfRzEHiuwDi6on6RQISv-Sa7xPzXf6U61FblGpi9Ou2aXfsR5_PoyNJhX-aCt1zuv1ogRgtmIOXqYjfcAQ79z48VNTNX3nLemm' },
    { id: 'ladakh-adventure', title: 'Leh Ladakh Adventure', price: '₹65,000', days: '8 Days', loc: 'Ladakh, India', img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDpQiwfKH0yIRycIB8I2oEBy84i-Io3CIha3W5YAJfjpY1Jghiz6KZm9ugQVQh2w1iYR3smMg-3cpUXS07wl7wtOG7tMr-mD3U-5wbABd_2KyTx6jhq4cZAZVjMPjbUU1yxD4LrltucSAO-ZFLoA_ccgWlKW0wsSVrrkrWiCVwGsI8quL38dPZQOPDjQJbUiojqsqXyVKEnZ2jpVDbJw0GE7jrTbRPihr9RoDuW21hmKXYHaB52a6heuHbI7htXFMkWjCPab-3djC20' },
  ];

  const actualReviews = [
    {
      id: "r1",
      customerName: "Omkar Bhalerao",
      platform: "Justdial",
      date: "20 Sep 2024",
      text: "I had an excellent experience with Shravya Tours & Travels. They offered good deals and their prices were reasonable. The reservations were efficient and timely, and their service was quick. Overall, it was an excellent interaction with them.",
      rating: 5,
    },
    {
      id: "r2",
      customerName: "User",
      platform: "Justdial",
      date: "24 Sep 2024",
      text: "Awesome and great experience with Shravya Tours and Travels. Well-experienced drivers with polite attitude.",
      rating: 5,
    },
    {
      id: "r3",
      customerName: "Payal Shinde",
      platform: "Justdial",
      date: "21 Sep 2024",
      text: "Shravya Tours & Travels is an excellent transportation booking service. Their clean vehicles, reasonable pricing, and adherence to standard procedures make them a top choice. With fast response times and quick service, they are a reliable option for all your travel needs.",
      rating: 5,
    },
    {
      id: "r4",
      customerName: "Tejas",
      platform: "Justdial",
      date: "21 Sep 2024",
      text: "I recently travelled with Shravya Tours and Travels and had a fantastic experience. The service was excellent, trip was very comfortable, and the rates were very reasonable. Highly recommend!!",
      rating: 5,
    },
    {
      id: "r5",
      customerName: "Dnyaneshwar Lohar",
      platform: "Justdial",
      date: "28 Sep 2024",
      text: "I had an excellent experience with Shravya Tours & Travels! The SUV provided was safe, clean, and properly sanitised. Booking was easy and the service was quick. I would highly recommend them for any travel needs.",
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
      text: "I recently travelled through Shravya Tours Sedan car to Southern region of India... The services are unbelievable, like free water bottles, tissue papers, basic medicines etc. are available in clean car. Wish you all the best for your future journey... Thanks...",
      rating: 5,
    },
    {
      id: "r8",
      customerName: "Pratik Patil",
      platform: "Google",
      date: "",
      text: "We booked an office friends' trip to Prayagraj with Shravya Tours and Travels, and it was an unforgettable experience! The team took care of every detail, from transportation to sightseeing, and ensured that we had a wonderful time. What sets them apart is their personalized attention to detail.",
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
      />

      {/* Hero Section */}
      {/* Hero Section */}
      <section className="relative w-full overflow-hidden bg-slate-900">
        <div className="absolute inset-0 z-0">
          <OptimizedImage
            src={heroBanner?.imageUrl || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=85&auto=format&fit=crop"}
            alt="Hero Background"
            className="w-full h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-slate-900"></div>
        </div>

        <div className="relative z-10 container mx-auto px-4 flex flex-col items-center gap-12 text-center pt-32 pb-24 lg:pt-40 lg:pb-32">
          <div className="flex flex-col gap-6 max-w-5xl reveal">
            <h1 className="font-display text-white text-5xl md:text-7xl font-bold leading-[1.05] tracking-tight drop-shadow-2xl italic">
              {heroBanner?.title || "Experience the World"}
            </h1>
            <p className="text-slate-200 text-lg md:text-2xl font-light leading-relaxed max-w-3xl mx-auto drop-shadow-lg reveal reveal-delay-2">
              {heroBanner?.subtitle || "Premium tours, transparent pricing, and 24/7 expert support."}
            </p>
          </div>

          {/* Booking Widget */}
          <div className="w-full max-w-6xl mt-4 animate-in slide-in-from-bottom-10 duration-1000 delay-200">
            {/* Tabs */}
            <div className="flex justify-center mb-8 px-4 w-full overflow-hidden">
              <div className="bg-black/30 backdrop-blur-md p-1.5 rounded-full inline-flex flex-nowrap max-w-full overflow-x-auto [-ms-scrollbar-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden border border-white/10 shadow-xl touch-pan-x snap-x snap-mandatory">
                {[
                  { id: 'hotel-booking', icon: 'hotel', label: 'Hotels' },
                  { id: 'tour-packages', icon: 'luggage', label: 'Tours' },
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
            <div className="bg-white/95 dark:bg-slate-900/90 backdrop-blur-md rounded-[2rem] shadow-2xl p-6 md:p-8 text-left border border-white/20 relative overflow-hidden transition-all duration-500">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-amber-400 to-accent"></div>

              {activeTab === 'hotel-booking' && <HotelBookingForm onSubmit={handleHotelSubmit} />}
              {activeTab === 'tour-packages' && <TourBookingForm onSubmit={handleTourSubmit} />}
              {activeTab === 'car-booking' && <CarBookingForm onSubmit={handleCarSubmit} />}
              {activeTab === 'bus-booking' && <BusBookingForm onSubmit={handleBusSubmit} />}
            </div>
          </div>
        </div>
      </section>



      {/* The Shravya Advantage */}
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
            {actualReviews.map((t, idx) => (
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
                  <div className="size-12 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold text-lg shadow-inner">
                    {t.customerName[0]}
                  </div>
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

      {/* Collections Section */}
      <section className="py-12 bg-background-light dark:bg-background-dark">
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

      {/* Trending Destinations */}
      <section className="py-20 mesh-warm dark:bg-background-dark grain relative">
        <div className="container mx-auto px-4 md:px-10 relative z-10">
          <div className="flex justify-between items-end mb-10 reveal">
            <div>
              <h2 className="font-display text-slate-900 dark:text-white text-4xl md:text-5xl font-bold leading-tight tracking-tight italic">Trending Destinations</h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg font-light">Join thousands of travelers exploring these hotspots.</p>
            </div>
            <Link className="hidden md:flex items-center text-primary font-bold hover:underline" to="/packages">
              Explore All
              <span className="material-symbols-outlined ml-1 text-sm">arrow_forward</span>
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {packages.slice(0, 4).map((tour, idx) => {
              const remainingSeats = tour.remainingSeats;

              return (
                <div key={idx} className={`reveal reveal-delay-${idx + 1}`}>
                  <Link to={`/packages/${tour.id}`} className="group block bg-white dark:bg-card-dark rounded-2xl overflow-hidden shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border border-border-light dark:border-border-dark">
                    <div className="relative h-64 overflow-hidden">
                      <OptimizedImage
                        src={tour.image}
                        alt={tour.title}
                        className="w-full h-full group-hover:scale-110 transition-transform duration-700"
                      />
                      <div className="absolute top-4 right-4 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-3 py-1.5 rounded-full text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1 shadow-sm">
                        <span className="material-symbols-outlined text-primary text-sm fill">schedule</span> {tour.days} Days
                      </div>

                      {remainingSeats !== undefined && remainingSeats < 10 && (
                        <div className="absolute top-4 left-4 bg-red-600/90 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-lg shadow-lg animate-pulse flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                          Only {remainingSeats} Left
                        </div>
                      )}
                    </div>
                    <div className="p-6">
                      <div className="flex justify-between items-start mb-3">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight group-hover:text-primary transition-colors line-clamp-2">{tour.title}</h3>
                      </div>
                      <div className="flex items-center gap-4 text-slate-500 dark:text-slate-400 text-sm font-medium mb-6">
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">schedule</span> {tour.days} Days</span>
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[18px]">location_on</span> {tour.location}</span>
                      </div>
                      <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-700 pt-4">
                        <div className="flex flex-col">
                          <span className="text-xs text-slate-400 uppercase tracking-wider font-bold">From</span>
                          <span className="text-lg font-black text-slate-900 dark:text-white">₹{tour.price.toLocaleString()}</span>
                        </div>
                        <div className="size-10 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 group-hover:bg-primary group-hover:text-white transition-colors">
                          <span className="material-symbols-outlined">arrow_forward</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>


    </>
  );
};