import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { BLOG_POSTS, DEFAULT_BLOG_FALLBACK_IMAGE, BlogPost } from '../src/data/blogData';
import { TOUR_PACKAGES, TourPackage } from '../constants/tourCatalog';
import { LeadCaptureModal } from '../components/ui/LeadCaptureModal';

export const BlogPostDetail: React.FC = () => {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<string>('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);
  const [showLeadModal, setShowLeadModal] = useState<boolean>(false);
  const [selectedLeadPkg, setSelectedLeadPkg] = useState<TourPackage | null>(null);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const [copiedAnswer, setCopiedAnswer] = useState<boolean>(false);
  const [faqHelpful, setFaqHelpful] = useState<Record<number, boolean | null>>({});

  const post: BlogPost | undefined = BLOG_POSTS.find((p) => p.slug === slug);

  // Set document title, meta tags, and structured JSON-LD schema
  useEffect(() => {
    if (!post) return;

    document.title = `${post.metaTitle} | Shravya Tours`;
    
    let metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      metaDesc = document.createElement('meta');
      metaDesc.setAttribute('name', 'description');
      document.head.appendChild(metaDesc);
    }
    metaDesc.setAttribute('content', post.metaDescription);

    // Inject JSON-LD Schema (Article + FAQPage)
    const schemaData = [
      {
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: post.title,
        description: post.metaDescription,
        image: [post.featuredImage],
        datePublished: post.publishedAt,
        author: {
          '@type': 'Person',
          name: post.author.name,
          jobTitle: post.author.role
        },
        publisher: {
          '@type': 'Organization',
          name: 'Shravya Tours',
          logo: {
            '@type': 'ImageObject',
            url: 'https://shravyatours.in/assets/logo.png'
          }
        }
      },
      {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: post.faqs.map((faq) => ({
          '@type': 'Question',
          name: faq.question,
          acceptedAnswer: {
            '@type': 'Answer',
            text: faq.answer
          }
        }))
      }
    ];

    const scriptId = 'blog-jsonld-schema';
    let scriptTag = document.getElementById(scriptId);
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = scriptId;
      scriptTag.setAttribute('type', 'application/ld+json');
      document.head.appendChild(scriptTag);
    }
    scriptTag.textContent = JSON.stringify(schemaData);

    return () => {
      const existingScript = document.getElementById(scriptId);
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, [post]);

  // Reading progress and active TOC section scroll tracking
  useEffect(() => {
    const handleScroll = () => {
      if (!post) return;

      const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = totalHeight > 0 ? (window.scrollY / totalHeight) * 100 : 0;
      setScrollProgress(Math.min(100, Math.max(0, progress)));

      const scrollPosition = window.scrollY + 220;
      for (let i = post.tableOfContents.length - 1; i >= 0; i--) {
        const sec = post.tableOfContents[i];
        const el = document.getElementById(sec.id);
        if (el && el.offsetTop <= scrollPosition) {
          setActiveSection(sec.id);
          break;
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [post]);

  if (!post) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 py-20 px-4 text-center space-y-4">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-200">Article Not Found</h2>
        <p className="text-slate-500 text-sm">The requested travel guide does not exist or has been relocated.</p>
        <button
          onClick={() => navigate('/blog')}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs hover:bg-emerald-700 transition-colors shadow-lg"
        >
          Back to Travel Blogs Hub
        </button>
      </div>
    );
  }

  // Related tour packages mapping
  const relatedPackages: TourPackage[] = TOUR_PACKAGES.filter((pkg) =>
    post.relatedPackageIds.includes(pkg.id)
  );

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const yOffset = -110;
      const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  const handleOpenLeadModal = (pkg?: TourPackage) => {
    if (pkg) setSelectedLeadPkg(pkg);
    else setSelectedLeadPkg(TOUR_PACKAGES[0]);
    setShowLeadModal(true);
  };

  const handleCopyAeoSummary = () => {
    navigator.clipboard.writeText(post.aeoDirectAnswer);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300 relative">
      {/* Top Fixed Reading Progress Indicator */}
      <div className="fixed top-0 left-0 right-0 h-1.5 bg-slate-200 dark:bg-slate-800 z-50">
        <div
          className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-150 shadow-md"
          style={{ width: `${scrollProgress}%` }}
        />
      </div>

      {/* Breadcrumb Navigation Bar */}
      <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80 sticky top-0 z-40">
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 text-xs text-slate-500 dark:text-slate-400 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none whitespace-nowrap">
            <Link to="/" className="hover:text-emerald-600 transition-colors flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">home</span> Home
            </Link>
            <span>/</span>
            <Link to="/blog" className="hover:text-emerald-600 transition-colors">Travel Blogs</Link>
            <span>/</span>
            <span className="text-slate-900 dark:text-slate-200 font-semibold truncate max-w-xs sm:max-w-md">{post.title}</span>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={() => navigate('/blog')}
              className="px-3 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg hover:bg-slate-200 transition-colors text-[11px] font-semibold flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">arrow_back</span> All Blogs
            </button>
          </div>
        </nav>
      </div>

      {/* Article Header Container */}
      <header className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="px-4 py-1.5 bg-emerald-600 text-white font-extrabold text-xs uppercase rounded-full tracking-wider shadow-md">
            {post.category}
          </span>
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold rounded-full flex items-center gap-1">
            <span className="material-symbols-outlined text-sm text-emerald-500">schedule</span> {post.readTime}
          </span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            Published {post.publishedAt}
          </span>
        </div>

        <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 dark:text-white leading-tight font-display tracking-tight">
          {post.title}
        </h1>

        {/* Author Bio Header Card */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-y border-slate-200 dark:border-slate-800 py-4 gap-4">
          <div className="flex items-center gap-3">
            <img
              src={post.author.avatar}
              alt={post.author.name}
              className="w-12 h-12 rounded-full object-cover ring-2 ring-emerald-500/30"
            />
            <div>
              <p className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                {post.author.name}
                <span className="material-symbols-outlined text-emerald-500 text-sm" title="Verified Author">verified</span>
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{post.author.role}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyAeoSummary}
              className="px-3.5 py-2 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-200 dark:hover:bg-slate-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">{copiedAnswer ? 'check_circle' : 'content_copy'}</span>
              {copiedAnswer ? 'Summary Copied!' : 'Copy Summary'}
            </button>

            <button
              onClick={() => {
                if (navigator.share) {
                  navigator.share({ title: post.title, url: window.location.href });
                } else {
                  navigator.clipboard.writeText(window.location.href);
                  alert('Article link copied to clipboard!');
                }
              }}
              className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 text-xs font-bold flex items-center gap-1.5 shadow-md transition-colors"
            >
              <span className="material-symbols-outlined text-sm">share</span> Share Guide
            </button>
          </div>
        </div>

        {/* Featured Hero Image Container with Fallback */}
        <div className="relative rounded-3xl overflow-hidden shadow-2xl h-72 sm:h-[420px] lg:h-[480px] group">
          <img
            src={post.featuredImage}
            alt={post.title}
            onError={(e) => {
              (e.target as HTMLImageElement).src = DEFAULT_BLOG_FALLBACK_IMAGE;
            }}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute bottom-4 left-4 right-4 text-white text-xs font-medium text-center sm:text-left backdrop-blur-md bg-black/40 p-3 rounded-2xl border border-white/10">
            📍 Destination Feature: {post.targetKeywords[0] || 'Travel Guide'}
          </div>
        </div>

        {/* AEO Direct Answer Box (AI Search Engine Snippet Card) */}
        <div className="relative rounded-3xl bg-gradient-to-br from-emerald-950 via-teal-900 to-slate-900 border border-emerald-500/40 p-6 sm:p-8 space-y-4 shadow-2xl text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-xs uppercase tracking-wider">
              <span className="material-symbols-outlined text-lg">psychology</span> 
              AEO Direct Answer Box (Perplexity & AI Overviews Indexed)
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/30">
              Verified Facts
            </span>
          </div>

          <blockquote className="text-slate-100 text-sm sm:text-base leading-relaxed font-medium pl-4 border-l-4 border-emerald-400">
            "{post.aeoDirectAnswer}"
          </blockquote>
        </div>
      </header>

      {/* Main Content Layout with Sticky Sidebar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 grid grid-cols-1 lg:grid-cols-12 gap-12">
        {/* Sticky Table of Contents Sidebar */}
        <aside className="lg:col-span-4 hidden lg:block">
          <div className="sticky top-20 space-y-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 shadow-md space-y-4">
              <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <span className="material-symbols-outlined text-emerald-600">format_list_bulleted</span>
                Table of Contents
              </h3>
              <nav className="space-y-1.5">
                {post.tableOfContents.map((sec, idx) => (
                  <button
                    key={sec.id}
                    onClick={() => scrollToSection(sec.id)}
                    className={`w-full text-left px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2.5 ${
                      activeSection === sec.id
                        ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 font-bold border-l-4 border-emerald-600 pl-3 shadow-sm'
                        : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${activeSection === sec.id ? 'bg-emerald-600 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'}`}>
                      0{idx + 1}
                    </span>
                    <span className="truncate">{sec.title}</span>
                  </button>
                ))}
              </nav>
            </div>

            {/* Free Custom Itinerary Quote Widget */}
            <div className="bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 text-white rounded-3xl p-6 space-y-4 shadow-xl border border-emerald-500/20">
              <div className="inline-flex p-2.5 bg-emerald-500/20 rounded-2xl text-emerald-400">
                <span className="material-symbols-outlined text-xl">support_agent</span>
              </div>
              <h4 className="font-bold text-base">Planning a Trip to this Destination?</h4>
              <p className="text-slate-300 text-xs leading-relaxed">
                Our Himalayan tour specialists will craft a customized day-by-day itinerary tailored to your group size, budget & dates.
              </p>
              <button
                onClick={() => handleOpenLeadModal()}
                className="w-full py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold rounded-xl text-xs hover:brightness-110 transition-all shadow-lg uppercase tracking-wider"
              >
                Request Free Custom Quote
              </button>
            </div>
          </div>
        </aside>

        {/* Main Article Body */}
        <main className="lg:col-span-8 space-y-12">
          {post.sections.map((section, idx) => (
            <section key={section.id} id={section.id} className="space-y-5 scroll-mt-28">
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white pb-3 border-b border-slate-200 dark:border-slate-800 flex items-center gap-3 font-display">
                <span className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 font-mono text-xs font-bold flex items-center justify-center flex-shrink-0">
                  0{idx + 1}
                </span>
                {section.title}
              </h2>

              {section.content && (
                <p className="text-slate-700 dark:text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line font-normal">
                  {section.content}
                </p>
              )}

              {/* Highlight Callout Box */}
              {section.highlightBox && (
                <div className="p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-l-4 border-amber-500 text-amber-900 dark:text-amber-200 text-xs sm:text-sm font-medium leading-relaxed shadow-sm">
                  💡 {section.highlightBox}
                </div>
              )}

              {/* In-content Section Image with Fallback */}
              {section.image && (
                <div className="space-y-2 py-2">
                  <div className="rounded-3xl overflow-hidden shadow-xl h-64 sm:h-84 group">
                    <img
                      src={section.image.url}
                      alt={section.image.alt}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = DEFAULT_BLOG_FALLBACK_IMAGE;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  {section.image.caption && (
                    <p className="text-center text-xs text-slate-500 dark:text-slate-400 italic">
                      📸 {section.image.caption}
                    </p>
                  )}
                </div>
              )}

              {/* Styled Data Table */}
              {section.table && (
                <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md my-6">
                  <table className="w-full text-left text-xs sm:text-sm text-slate-700 dark:text-slate-300">
                    <thead className="bg-slate-100 dark:bg-slate-800/90 text-slate-900 dark:text-white font-bold uppercase text-[11px] tracking-wider">
                      <tr>
                        {section.table.headers.map((h, hIdx) => (
                          <th key={hIdx} className="p-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                      {section.table.rows.map((row, rIdx) => (
                        <tr key={rIdx} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                          {row.map((cell, cIdx) => (
                            <td key={cIdx} className="p-4 font-medium">{cell}</td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}

          {/* Contextual Handcrafted Tour Package Cards */}
          {relatedPackages.length > 0 && (
            <section className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-lg space-y-6 my-12">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold text-emerald-600 uppercase tracking-wider">Handcrafted Packages</span>
                  <h3 className="text-xl font-black text-slate-900 dark:text-white font-display">Recommended Tour Packages</h3>
                </div>
                <Link
                  to="/packages"
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
                >
                  Explore Catalog <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {relatedPackages.map((pkg) => (
                  <div
                    key={pkg.id}
                    className="group border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden hover:shadow-2xl transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="relative h-44 overflow-hidden">
                        <img
                          src={pkg.image}
                          alt={pkg.name}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_BLOG_FALLBACK_IMAGE;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3">
                          <span className="px-3 py-1 bg-emerald-600 text-white text-[10px] font-extrabold rounded-full uppercase tracking-wider shadow-md">
                            {pkg.badge || 'Popular Package'}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-2">
                        <h4 className="font-bold text-base text-slate-900 dark:text-white line-clamp-1">{pkg.name}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <span>{pkg.duration}</span> • <span>{pkg.destination}</span>
                        </p>
                        <p className="text-sm font-extrabold text-emerald-600 dark:text-emerald-400 pt-1">
                          Starts at ₹{pkg.startingPrice.toLocaleString('en-IN')} / person
                        </p>
                      </div>
                    </div>

                    <div className="p-5 pt-0 flex items-center gap-3">
                      <button
                        onClick={() => navigate(`/packages/${pkg.id}`)}
                        className="flex-1 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-200 rounded-xl text-xs font-bold hover:bg-slate-200 transition-colors"
                      >
                        View Itinerary
                      </button>
                      <button
                        onClick={() => handleOpenLeadModal(pkg)}
                        className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-extrabold hover:bg-emerald-700 transition-colors shadow-md"
                      >
                        Quick Inquiry
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Interactive FAQ Accordion (SEO & AEO Indexed) */}
          {post.faqs.length > 0 && (
            <section className="space-y-6 pt-4">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                  <span className="material-symbols-outlined text-lg">help_outline</span>
                </span>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white font-display">Frequently Asked Questions</h3>
              </div>

              <div className="space-y-3">
                {post.faqs.map((faq, index) => {
                  const isOpen = openFaqIndex === index;
                  const isHelpful = faqHelpful[index];
                  return (
                    <div
                      key={index}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden transition-all shadow-sm"
                    >
                      <button
                        onClick={() => setOpenFaqIndex(isOpen ? null : index)}
                        className="w-full p-5 text-left font-bold text-sm text-slate-900 dark:text-white flex items-center justify-between gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                      >
                        <span>{faq.question}</span>
                        <span className={`material-symbols-outlined text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180 text-emerald-600' : ''}`}>
                          expand_more
                        </span>
                      </button>

                      {isOpen && (
                        <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-300 border-t border-slate-100 dark:border-slate-800/60 pt-4 leading-relaxed space-y-4">
                          <p>{faq.answer}</p>
                          <div className="flex items-center justify-between pt-2 text-[11px] text-slate-400">
                            <span>Was this answer helpful?</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setFaqHelpful((prev) => ({ ...prev, [index]: true }))}
                                className={`px-2 py-1 rounded-md border text-xs font-semibold ${isHelpful === true ? 'bg-emerald-500 text-white border-emerald-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                              >
                                👍 Yes
                              </button>
                              <button
                                onClick={() => setFaqHelpful((prev) => ({ ...prev, [index]: false }))}
                                className={`px-2 py-1 rounded-md border text-xs font-semibold ${isHelpful === false ? 'bg-rose-500 text-white border-rose-500' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                              >
                                👎 No
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </main>
      </div>

      {/* Lead Capture Modal */}
      {showLeadModal && (
        <LeadCaptureModal
          isOpen={showLeadModal}
          onClose={() => setShowLeadModal(false)}
          packageName={selectedLeadPkg ? selectedLeadPkg.name : post.title}
          destination={selectedLeadPkg ? selectedLeadPkg.destination : post.title}
        />
      )}
    </div>
  );
};

export default BlogPostDetail;
