import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { BLOG_POSTS, BLOG_CATEGORIES, DEFAULT_BLOG_FALLBACK_IMAGE, BlogPost } from '../src/data/blogData';

export const BlogList: React.FC = () => {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bookmarkedIds, setBookmarkedIds] = useState<string[]>([]);

  // Category counts computation
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { All: BLOG_POSTS.length };
    BLOG_POSTS.forEach((post) => {
      counts[post.category] = (counts[post.category] || 0) + 1;
    });
    return counts;
  }, []);

  const filteredPosts = useMemo(() => {
    return BLOG_POSTS.filter((post) => {
      const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory;
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        post.title.toLowerCase().includes(query) ||
        post.metaDescription.toLowerCase().includes(query) ||
        post.targetKeywords.some((k) => k.toLowerCase().includes(query));
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const featuredPost = BLOG_POSTS[0]; // Kashmir 6-Day Itinerary

  const toggleBookmark = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setBookmarkedIds((prev) =>
      prev.includes(id) ? prev.filter((bId) => bId !== id) : [...prev, id]
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
      {/* Luxury Animated Hero Banner */}
      <section className="relative overflow-hidden bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 text-white py-16 sm:py-24 px-4 sm:px-6 lg:px-8">
        {/* Glow Spheres */}
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-teal-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:24px_24px]" />

        <div className="relative max-w-7xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-emerald-300 border border-white/20 text-xs font-bold uppercase tracking-wider shadow-lg">
            <span className="material-symbols-outlined text-sm text-emerald-400">auto_awesome</span> 
            Shravya Travel Intelligence & SEO/AEO Guides
          </div>

          <h1 className="text-3xl sm:text-6xl font-black tracking-tight text-white font-display leading-tight">
            Discover India Through <br className="hidden sm:inline" />
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300">
              Expert Travel Guides & Itineraries
            </span>
          </h1>

          <p className="max-w-3xl mx-auto text-base sm:text-xl text-slate-300 font-light leading-relaxed">
            Handcrafted day-by-day itineraries, transparent cost breakdowns, seasonal advice, and local travel logistics curated by seasoned Himalayan specialists.
          </p>

          {/* Quick Search Bar */}
          <div className="max-w-2xl mx-auto pt-4">
            <div className="relative flex items-center shadow-2xl">
              <span className="material-symbols-outlined absolute left-5 text-emerald-400 text-xl">search</span>
              <input
                type="text"
                placeholder="Search destination, budget, or permits (e.g. Kashmir cost, Ladakh checklist)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-12 py-4 bg-white/10 backdrop-blur-xl text-white placeholder-slate-400 rounded-2xl border border-white/20 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:bg-white/20 transition-all text-sm sm:text-base shadow-inner"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 text-slate-400 hover:text-white p-1"
                >
                  <span className="material-symbols-outlined text-sm">close</span>
                </button>
              )}
            </div>

            {/* Popular Search Tags */}
            <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-300">
              <span className="font-semibold text-slate-400">Trending Searches:</span>
              {['Kashmir Cost', 'Ladakh Checklist', 'Chardham Yatra', 'Honeymoon Places', 'Rajasthan 7-Day'].map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSearchQuery(tag)}
                  className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-emerald-300 transition-colors"
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-12">
        {/* Category Filters */}
        <div className="flex items-center gap-3 overflow-x-auto pb-3 scrollbar-none">
          {BLOG_CATEGORIES.map((cat) => {
            const count = categoryCounts[cat] || 0;
            const isActive = selectedCategory === cat;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-5 py-2.5 rounded-2xl text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-300 flex items-center gap-2 ${
                  isActive
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-700 text-white shadow-xl shadow-emerald-600/30 scale-105 ring-2 ring-emerald-400/40'
                    : 'bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-800'
                }`}
              >
                <span>{cat}</span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Magazine-Style Featured Post Hero Card */}
        {selectedCategory === 'All' && !searchQuery && featuredPost && (
          <div className="relative group overflow-hidden rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xl transition-all duration-500 hover:shadow-2xl grid grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-7 relative h-72 sm:h-96 lg:h-auto overflow-hidden">
              <img
                src={featuredPost.featuredImage}
                alt={featuredPost.title}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = DEFAULT_BLOG_FALLBACK_IMAGE;
                }}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-3.5 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 text-white text-xs font-extrabold uppercase rounded-full shadow-lg tracking-wider">
                  ⭐ Editor's Choice
                </span>
                <span className="px-3.5 py-1.5 bg-slate-900/80 backdrop-blur-md text-white text-xs font-semibold rounded-full">
                  {featuredPost.category}
                </span>
              </div>
            </div>

            <div className="lg:col-span-5 p-6 sm:p-10 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                    <span className="material-symbols-outlined text-sm">schedule</span> {featuredPost.readTime}
                  </span>
                  <span>•</span>
                  <span>Published {featuredPost.publishedAt}</span>
                </div>

                <h2
                  onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                  className="text-xl sm:text-3xl font-extrabold text-slate-900 dark:text-white hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors cursor-pointer line-clamp-3 leading-snug font-display"
                >
                  {featuredPost.title}
                </h2>

                <p className="text-slate-600 dark:text-slate-300 text-sm line-clamp-3 leading-relaxed">
                  {featuredPost.aeoDirectAnswer}
                </p>
              </div>

              <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={featuredPost.author.avatar}
                    alt={featuredPost.author.name}
                    className="w-10 h-10 rounded-full object-cover ring-2 ring-emerald-500/30"
                  />
                  <div>
                    <p className="text-xs font-bold text-slate-900 dark:text-white">{featuredPost.author.name}</p>
                    <p className="text-[10px] text-slate-500 dark:text-slate-400">{featuredPost.author.role}</p>
                  </div>
                </div>

                <button
                  onClick={() => navigate(`/blog/${featuredPost.slug}`)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white text-xs font-bold hover:shadow-lg hover:shadow-emerald-600/30 transition-all"
                >
                  Read Full Guide <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Blog Posts Responsive Grid */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-3 font-display">
              <span className="p-2 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-xl">
                <span className="material-symbols-outlined text-xl">article</span>
              </span>
              {selectedCategory === 'All' ? 'All Published Guides' : `${selectedCategory} Guides`}
              <span className="text-sm font-normal text-slate-500">({filteredPosts.length})</span>
            </h3>
          </div>

          {filteredPosts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-12 text-center space-y-4 border border-slate-200 dark:border-slate-800 shadow-md">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700">search_off</span>
              <h4 className="text-xl font-bold text-slate-800 dark:text-slate-200">No travel articles match your query</h4>
              <p className="text-slate-500 text-sm max-w-md mx-auto">Try clearing search keywords or choosing another category above.</p>
              <button
                onClick={() => { setSelectedCategory('All'); setSearchQuery(''); }}
                className="px-6 py-3 bg-emerald-600 text-white text-xs font-bold rounded-xl hover:bg-emerald-700 transition-colors shadow-lg"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post) => {
                const isBookmarked = bookmarkedIds.includes(post.id);
                return (
                  <article
                    key={post.id}
                    className="group bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow-2xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1"
                  >
                    <div>
                      {/* Image Banner with Fallback */}
                      <div
                        onClick={() => navigate(`/blog/${post.slug}`)}
                        className="relative h-52 sm:h-60 overflow-hidden cursor-pointer"
                      >
                        <img
                          src={post.featuredImage}
                          alt={post.title}
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = DEFAULT_BLOG_FALLBACK_IMAGE;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />

                        {/* Top Overlay Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="px-3 py-1 bg-slate-900/80 backdrop-blur-md text-white text-[11px] font-bold rounded-full">
                            {post.category}
                          </span>

                          <button
                            onClick={(e) => toggleBookmark(e, post.id)}
                            className={`p-2 rounded-full backdrop-blur-md transition-all ${
                              isBookmarked
                                ? 'bg-emerald-500 text-white'
                                : 'bg-slate-900/60 text-white hover:bg-slate-900'
                            }`}
                            title={isBookmarked ? 'Bookmarked' : 'Save for later'}
                          >
                            <span className="material-symbols-outlined text-sm">
                              {isBookmarked ? 'bookmark' : 'bookmark_border'}
                            </span>
                          </button>
                        </div>

                        {/* Read Time Overlay */}
                        <div className="absolute bottom-3 right-3 bg-black/70 backdrop-blur-md text-white px-3 py-1 rounded-xl text-[11px] font-medium flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs text-emerald-400">schedule</span> {post.readTime}
                        </div>
                      </div>

                      {/* Content */}
                      <div className="p-6 space-y-3">
                        <h3
                          onClick={() => navigate(`/blog/${post.slug}`)}
                          className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors cursor-pointer line-clamp-2 leading-snug"
                        >
                          {post.title}
                        </h3>

                        <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed line-clamp-3">
                          {post.metaDescription}
                        </p>
                      </div>
                    </div>

                    {/* Footer */}
                    <div className="p-6 pt-0 mt-4 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <img
                          src={post.author.avatar}
                          alt={post.author.name}
                          className="w-8 h-8 rounded-full object-cover ring-2 ring-emerald-500/20"
                        />
                        <div>
                          <p className="text-xs font-bold text-slate-900 dark:text-white">{post.author.name}</p>
                          <p className="text-[10px] text-slate-500">{post.publishedAt}</p>
                        </div>
                      </div>

                      <button
                        onClick={() => navigate(`/blog/${post.slug}`)}
                        className="text-xs font-bold text-emerald-600 dark:text-emerald-400 group-hover:translate-x-1 transition-transform flex items-center gap-1"
                      >
                        Read Guide <span className="material-symbols-outlined text-sm">arrow_forward</span>
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>

        {/* AI Travel Assistant CTA Banner */}
        <div className="rounded-3xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-950 text-white p-8 sm:p-14 relative overflow-hidden shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 border border-emerald-500/20">
          <div className="space-y-4 max-w-2xl relative z-10">
            <span className="px-3.5 py-1.5 bg-emerald-500/20 text-emerald-300 rounded-full text-xs font-bold uppercase tracking-wider border border-emerald-500/30">
              ⚡ Free AI Travel Planner
            </span>
            <h3 className="text-2xl sm:text-4xl font-black font-display leading-tight">
              Get a Custom Day-by-Day Itinerary in Seconds
            </h3>
            <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
              Tell our AI engine your destination, duration, and group type to receive an instant customized itinerary with budget estimates and hotel choices.
            </p>
          </div>

          <div className="relative z-10 flex-shrink-0">
            <button
              onClick={() => navigate('/packages')}
              className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 font-extrabold rounded-2xl shadow-xl hover:brightness-110 transition-all flex items-center gap-2 text-sm uppercase tracking-wider"
            >
              <span className="material-symbols-outlined">explore</span> Browse Tour Packages
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BlogList;
