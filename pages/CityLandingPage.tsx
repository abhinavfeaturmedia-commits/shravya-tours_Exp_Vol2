import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { SEO } from '../components/ui/SEO';
import { getCityBySlug, MAHARASHTRA_CITIES, CityData } from '../src/data/maharashtraCities';
import { TOUR_PACKAGES } from '../constants/tourCatalog';
import { VEHICLE_CATEGORIES } from '../constants/vehicleCatalog';

export const CityLandingPage: React.FC = () => {
  const { citySlug } = useParams<{ citySlug: string }>();
  const navigate = useNavigate();
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  // Default to 'pune' if slug is missing or not found
  const city: CityData = getCityBySlug(citySlug || 'pune') || MAHARASHTRA_CITIES[0];

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [citySlug]);

  const whatsappMessage = encodeURIComponent(
    `Hello SHRAWELLO Travel Hub, I am looking for travel packages & cab services in ${city.cityName}. Please share options and pricing.`
  );
  const whatsappUrl = `https://wa.me/919766931393?text=${whatsappMessage}`;

  // Filter relevant packages matching city categories
  const relevantPackages = TOUR_PACKAGES.filter(pkg =>
    city.packageCategoryFilter.includes(pkg.categoryId)
  ).slice(0, 4);

  // Multi-entity Schema.org JSON-LD for Google Rich Snippets & AI citation
  const pageSchema = [
    {
      '@context': 'https://schema.org',
      '@type': 'TravelAgency',
      '@id': `https://shrawellotravels.com/travel-agency/${city.slug}#travelagency`,
      name: `SHRAWELLO Travel Hub - ${city.cityName}`,
      alternateName: `SHRAWELLO Tours & Cabs ${city.cityName}`,
      description: city.aeoDirectSummary,
      url: `https://shrawellotravels.com/travel-agency/${city.slug}`,
      telephone: '+919766931393',
      email: 'booking@shravyavision.com',
      image: city.heroImage,
      priceRange: '₹₹',
      address: {
        '@type': 'PostalAddress',
        addressLocality: city.cityName,
        addressRegion: 'Maharashtra',
        postalCode: city.geo.postalCode,
        streetAddress: city.geo.streetAddress,
        addressCountry: 'IN'
      },
      geo: {
        '@type': 'GeoCoordinates',
        latitude: city.geo.latitude,
        longitude: city.geo.longitude
      },
      areaServed: {
        '@type': 'City',
        name: city.cityName,
        containedInPlace: {
          '@type': 'AdministrativeArea',
          name: 'Maharashtra'
        }
      },
      openingHoursSpecification: {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        opens: '00:00',
        closes: '23:59'
      },
      sameAs: [
        'https://www.facebook.com/shrawellotravels',
        'https://www.instagram.com/shrawellotravels'
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: 'https://shrawellotravels.com/'
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Maharashtra Travel Hubs',
          item: 'https://shrawellotravels.com/travel-agency/pune'
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: `${city.cityName} Tours & Cabs`,
          item: `https://shrawellotravels.com/travel-agency/${city.slug}`
        }
      ]
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: city.faqs.map(faq => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer
        }
      }))
    }
  ];

  return (
    <>
      <SEO
        title={city.metaTitle}
        description={city.metaDescription}
        keywords={city.keywords}
        image={city.heroImage}
        canonical={`https://shrawellotravels.com/travel-agency/${city.slug}`}
        schema={pageSchema}
      />

      <div className="bg-slate-50 dark:bg-slate-950 min-h-screen text-slate-800 dark:text-slate-100">
        {/* ── 1. HERO SECTION ── */}
        <section className="relative min-h-[580px] lg:min-h-[640px] flex items-center justify-center pt-28 pb-20 px-6 overflow-hidden">
          {/* Background with Dark Overlay */}
          <div className="absolute inset-0 z-0">
            <img
              src={city.heroImage}
              alt={`Tours and Travel Services in ${city.cityName}, Maharashtra`}
              className="w-full h-full object-cover"
              fetchPriority="high"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/85 to-slate-900/75" />
          </div>

          <div className="container mx-auto relative z-10 max-w-5xl text-center md:text-left">
            {/* Breadcrumb & City Badge */}
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold tracking-wide bg-primary/20 text-primary border border-primary/30">
                <span className="material-symbols-outlined text-[15px]">location_on</span>
                {city.cityName} {city.marathiName && `(${city.marathiName})`}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-300 border border-white/10 backdrop-blur-sm">
                Maharashtra Regional Hub
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                <span className="material-symbols-outlined text-[14px]">verified</span>
                Verified Fleet
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.15] mb-6">
              {city.heroHeadline}
            </h1>

            {/* Subheadline */}
            <p className="text-base sm:text-lg md:text-xl text-slate-300 max-w-3xl leading-relaxed mb-8">
              {city.heroSubheadline}
            </p>

            {/* Trust Metrics Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mb-10 text-left">
              <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                <div className="text-emerald-400 font-bold text-lg">{city.stats.cabsAvailable}</div>
                <div className="text-xs text-slate-300">Live in {city.cityName}</div>
              </div>
              <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                <div className="text-amber-400 font-bold text-lg">{city.stats.rating}</div>
                <div className="text-xs text-slate-300">Customer Rating</div>
              </div>
              <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                <div className="text-cyan-400 font-bold text-lg">{city.stats.tripsCompleted}</div>
                <div className="text-xs text-slate-300">Trips Executed</div>
              </div>
              <div className="bg-white/10 dark:bg-slate-900/60 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                <div className="text-primary font-bold text-lg">24/7 Active</div>
                <div className="text-xs text-slate-300">Dispatch Desk</div>
              </div>
            </div>

            {/* Call To Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-base shadow-lg shadow-emerald-500/25 transition-all transform hover:-translate-y-0.5"
              >
                <span className="material-symbols-outlined text-[20px]">chat</span>
                Book on WhatsApp
              </a>

              <button
                onClick={() => navigate('/contact')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-base shadow-lg transition-all"
              >
                <span className="material-symbols-outlined text-[20px] text-primary">description</span>
                Request Custom Itinerary
              </button>

              <a
                href="tel:+919766931393"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-4 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-base border border-white/20 backdrop-blur-sm transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">call</span>
                +91 97669 31393
              </a>
            </div>
          </div>
        </section>

        {/* ── 2. AEO DIRECT ANSWER SUMMARY BOX (AI ENGINE OPTIMIZATION) ── */}
        <section className="container mx-auto px-6 -mt-10 relative z-20 max-w-5xl">
          <div className="bg-white dark:bg-slate-900 rounded-2xl p-6 md:p-8 shadow-xl border-2 border-emerald-500/30 dark:border-emerald-500/20">
            <div className="flex items-center gap-2.5 mb-4">
              <span className="size-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <span className="material-symbols-outlined text-[20px]">info</span>
              </span>
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                  AI Answer Engine & Verified Entity Snapshot
                </span>
                <h2 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white">
                  {city.cityName} Travel & Mobility Overview
                </h2>
              </div>
            </div>

            {/* Direct Answer Paragraph parsed by ChatGPT, Perplexity & Claude */}
            <p className="text-slate-700 dark:text-slate-300 text-base md:text-lg leading-relaxed mb-6 font-normal">
              {city.aeoDirectSummary}
            </p>

            {/* Key Facts Matrix */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-sm">
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">flight_takeoff</span>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Transit Hubs</span>
                  <span className="text-slate-500 dark:text-slate-400">{city.airportRailHub}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">apartment</span>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Major Service Zones</span>
                  <span className="text-slate-500 dark:text-slate-400">{city.commercialIndustrialHubs.slice(0, 3).join(', ')}</span>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">payments</span>
                <div>
                  <span className="font-bold text-slate-900 dark:text-white block">Starting Pricing</span>
                  <span className="text-slate-500 dark:text-slate-400">{city.startingPrice}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── 3. POPULAR OUTSTATION ROUTES FROM THIS CITY ── */}
        <section className="container mx-auto px-6 py-20 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              Direct Road Connectivity
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              Top Weekend Getaways & Outstation Trips from {city.cityName}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Clean, chauffeur-driven private cabs ready at your doorstep across {city.cityName} with zero hidden charges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {city.popularRoutes.map((route, idx) => (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-all hover:border-primary/40 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                      {route.distance}
                    </span>
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[15px]">schedule</span>
                      {route.duration}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                    {route.destination}
                  </h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed mb-4">
                    {route.highlight}
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="material-symbols-outlined text-[16px] text-primary">directions_car</span>
                    <span>{route.recommendedVehicle}</span>
                  </div>
                  <a
                    href={`https://wa.me/919766931393?text=${encodeURIComponent(`Hi SHRAWELLO, I want to book a cab for ${route.destination} from ${city.cityName}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-bold text-primary hover:underline flex items-center gap-0.5"
                  >
                    Inquire <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 4. POPULAR TOUR PACKAGES CONNECTED TO THIS CITY ── */}
        <section className="bg-slate-100 dark:bg-slate-900/50 py-20 px-6 border-y border-slate-200 dark:border-slate-800">
          <div className="container mx-auto max-w-6xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
                  Curated Vacation Deals
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
                  Handcrafted Tour Packages for {city.cityName} Travelers
                </h2>
              </div>
              <Link
                to="/packages"
                className="inline-flex items-center gap-1.5 text-sm font-bold text-primary hover:underline"
              >
                Browse All 40+ Packages <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relevantPackages.map(pkg => (
                <div
                  key={pkg.id}
                  className="bg-white dark:bg-slate-900 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition-all group flex flex-col"
                >
                  <div className="relative h-48 overflow-hidden">
                    <img
                      src={pkg.image}
                      alt={pkg.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-white px-2.5 py-1 rounded-full text-xs font-semibold">
                      {pkg.duration}
                    </div>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-semibold text-primary mb-1 uppercase tracking-wider">
                        {pkg.categoryId}
                      </div>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 group-hover:text-primary transition-colors">
                        {pkg.name}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 mb-4">
                        {pkg.description}
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] text-slate-400 block">Starting from</span>
                        <span className="text-base font-black text-slate-900 dark:text-white">
                          ₹{pkg.startingPrice.toLocaleString('en-IN')}
                        </span>
                      </div>
                      <Link
                        to={`/packages/${pkg.id}`}
                        className="px-3.5 py-2 rounded-lg bg-primary hover:bg-primary-dark text-white text-xs font-bold transition-all"
                      >
                        Details
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. CORPORATE TRAVEL & CAR RENTAL FLEET ── */}
        <section className="container mx-auto px-6 py-20 max-w-6xl">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              Executive & Group Mobility
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              Commercial Fleet Available in {city.cityName}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Yellow-plate commercial taxis with verified drivers, GPS tracking, and complete GST compliance for corporate and personal hire.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {VEHICLE_CATEGORIES.slice(0, 4).map(cat => (
              <div
                key={cat.id}
                className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between"
              >
                <div>
                  <div className="size-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-[26px]">{cat.icon}</span>
                  </div>
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">
                    {cat.displayName}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">{cat.tagline}</p>
                  <div className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300 mb-4">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-slate-400">group</span>
                      <span>{cat.defaultSeating}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-slate-400">luggage</span>
                      <span>{cat.defaultLuggage}</span>
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                  <div className="text-[11px] text-slate-400 mb-2">Models: {cat.topModels.slice(0, 2).join(', ')}</div>
                  <a
                    href={`https://wa.me/919766931393?text=${encodeURIComponent(`Hi SHRAWELLO, I want to rent a ${cat.displayName} in ${city.cityName}.`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full inline-flex items-center justify-center gap-1.5 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-primary hover:text-white text-slate-800 dark:text-slate-200 text-xs font-bold transition-all"
                  >
                    Check Availability
                  </a>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6. WHY CHOOSE SHRAWELLO IN THIS CITY ── */}
        <section className="bg-slate-900 text-white py-20 px-6">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center max-w-3xl mx-auto mb-14">
              <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
                The SHRAWELLO Advantage
              </span>
              <h2 className="text-3xl md:text-4xl font-black tracking-tight mb-4">
                Why Travelers & Corporates in {city.cityName} Trust Us
              </h2>
              <p className="text-slate-400">
                Operating with transparent pricing, zero surge gouging, and experienced Maharashtra highway chauffeurs.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
                <span className="material-symbols-outlined text-primary text-[32px] mb-4">verified_user</span>
                <h3 className="text-lg font-bold mb-2">100% Background Checked</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Every driver is police-audited, thoroughly trained for night/ghat driving, and verified.
                </p>
              </div>

              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
                <span className="material-symbols-outlined text-emerald-400 text-[32px] mb-4">price_check</span>
                <h3 className="text-lg font-bold mb-2">Zero Surge Pricing</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Clear, all-inclusive toll and driver pricing. No peak hour hidden surcharges.
                </p>
              </div>

              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
                <span className="material-symbols-outlined text-amber-400 text-[32px] mb-4">receipt_long</span>
                <h3 className="text-lg font-bold mb-2">GST Compliant Invoicing</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Full corporate invoicing with input tax credit for companies in {city.cityName}.
                </p>
              </div>

              <div className="bg-slate-800/80 p-6 rounded-2xl border border-slate-700">
                <span className="material-symbols-outlined text-cyan-400 text-[32px] mb-4">support_agent</span>
                <h3 className="text-lg font-bold mb-2">24/7 Dispatch Control</h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Live trip tracking and instant 24/7 customer support on WhatsApp and phone call.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── 7. FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION & SCHEMA) ── */}
        <section className="container mx-auto px-6 py-20 max-w-4xl">
          <div className="text-center mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-primary mb-2 block">
              Got Questions?
            </span>
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-4">
              Frequently Asked Questions in {city.cityName}
            </h2>
            <p className="text-slate-600 dark:text-slate-400">
              Clear answers to the most common questions our {city.cityName} travelers and corporate clients ask.
            </p>
          </div>

          <div className="space-y-4">
            {city.faqs.map((faq, index) => {
              const isOpen = openFaqIndex === index;
              return (
                <div
                  key={index}
                  className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden transition-all shadow-sm"
                >
                  <button
                    onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 font-bold text-slate-900 dark:text-white text-base md:text-lg focus:outline-none"
                  >
                    <span>{faq.question}</span>
                    <span className={`material-symbols-outlined text-primary text-[24px] transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                      expand_more
                    </span>
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-6 pt-1 text-slate-600 dark:text-slate-300 text-sm md:text-base leading-relaxed border-t border-slate-100 dark:border-slate-800/60">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* ── 8. BROWSE OTHER MAHARASHTRA HUBS (INTERNAL LINKING GRAPH) ── */}
        <section className="bg-slate-100 dark:bg-slate-900 py-16 px-6 border-t border-slate-200 dark:border-slate-800">
          <div className="container mx-auto max-w-6xl">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <span className="text-xs font-bold uppercase tracking-wider text-primary block mb-1">
                Statewide Network
              </span>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white">
                SHRAWELLO Hubs Across Maharashtra
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                Click any city to view local tour packages, outstation routes, and cab services.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {MAHARASHTRA_CITIES.map(c => {
                const isCurrent = c.slug === city.slug;
                return (
                  <Link
                    key={c.slug}
                    to={`/travel-agency/${c.slug}`}
                    className={`p-3 rounded-xl text-center text-xs font-bold transition-all border ${
                      isCurrent
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-primary hover:text-primary'
                    }`}
                  >
                    <div>{c.cityName}</div>
                    <div className={`text-[10px] font-normal ${isCurrent ? 'text-white/80' : 'text-slate-400'}`}>
                      {c.marathiName}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      </div>
    </>
  );
};

export default CityLandingPage;
