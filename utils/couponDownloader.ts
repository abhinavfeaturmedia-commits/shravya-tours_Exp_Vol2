/**
 * couponDownloader.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Utility that converts a coupon into a downloadable PNG image or a branded PDF
 * by rendering a high-fidelity off-screen DOM element and capturing it.
 *
 * DATAFLOW:
 *  1. Caller provides a Coupon object.
 *  2. An off-screen element of exactly 880px × 375px is dynamically created.
 *  3. Injected HTML matches the high-fidelity designs perfectly.
 *  4. We wait for all Unsplash images inside the ticket to load completely.
 *  5. html2canvas renders the off-screen node at scale: 3 (crisp high-DPI).
 *  6. For PNG  → download is triggered directly from the high-res canvas.
 *  7. For PDF  → high-res image is drawn full-bleed into A5 landscape jsPDF.
 *  8. After download, database download_count is updated and DOM node is destroyed.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { Coupon } from '../types';

// ─── Helper: Increment download_count in DB ───────────────────────────────────
async function trackDownload(couponId: string, currentCount: number): Promise<void> {
    if (!couponId || couponId === 'preview') return;
    try {
        const token = localStorage.getItem('shravya_jwt');
        if (!token) return;
        await fetch(`/api/crud/coupons/${couponId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ download_count: (currentCount || 0) + 1 }),
        });
    } catch (e) {
        console.warn('Failed to track coupon download:', e);
    }
}

// ─── Helper: Safe date formatter ─────────────────────────────────────────────
function fmtDate(dateStr?: string): string {
    if (!dateStr) return '31 DEC 2026';
    try { return format(new Date(dateStr), 'dd MMM yyyy').toUpperCase(); }
    catch { return dateStr.toUpperCase(); }
}

// ─── Helper: Generate Ticket HTML String ──────────────────────────────────────
function getCouponHtml(coupon: Coupon): string {
    const isTours = coupon.type === 'ToursOnly';
    const discVal = coupon.discountValue || 15;
    const isPercent = coupon.discountType === 'Percentage';
    const promoCode = coupon.code || (isTours ? 'TOUR15' : 'SHRAVELLO015');
    const expiryStr = fmtDate(coupon.validTo);

    // Common absolute-positioned SVGs for suitcases, passport, and boarding pass
    const luggageSvg = `
        <svg class="absolute bottom-[44px] right-[-10px] w-[140px] h-[95px] opacity-90 pointer-events-none z-10" viewBox="0 0 140 95" fill="none">
            <!-- Boarding Pass -->
            <g transform="rotate(-15, 60, 45)">
                <rect x="35" y="10" width="70" height="40" rx="3" fill="#ffffff" />
                <rect x="35" y="10" width="70" height="10" fill="#005B5C" rx="1.5" />
                <circle cx="45" cy="15" r="2" fill="#ffffff" />
                <path d="M43 15h15" stroke="#ffffff" stroke-width="1" />
                <rect x="40" y="24" width="30" height="3" rx="1" fill="#e2e8f0" />
                <rect x="40" y="30" width="20" height="3" rx="1" fill="#e2e8f0" />
                <line x1="88" y1="20" x2="88" y2="45" stroke="#cbd5e1" stroke-width="1" stroke-dasharray="1.5,1.5" />
                <rect x="92" y="22" width="2" height="18" fill="#1e293b" />
                <rect x="96" y="22" width="1" height="18" fill="#1e293b" />
                <rect x="99" y="22" width="3" height="18" fill="#1e293b" />
                <rect x="103" y="22" width="1" height="18" fill="#1e293b" />
            </g>
            <!-- Passport -->
            <g transform="rotate(8, 85, 55)">
                <rect x="70" y="25" width="45" height="60" rx="4" fill="#0E3E2B" stroke="#B08D3E" stroke-width="1.5" />
                <text x="92.5" y="38" fill="#B08D3E" font-size="5" font-weight="bold" font-family="serif" text-anchor="middle" letter-spacing="1">PASSPORT</text>
                <circle cx="92.5" cy="55" r="9" stroke="#B08D3E" stroke-width="1" fill="none" />
                <circle cx="92.5" cy="55" r="6" stroke="#B08D3E" stroke-width="0.7" fill="none" stroke-dasharray="1,1" />
                <ellipse cx="92.5" cy="55" rx="3" ry="9" stroke="#B08D3E" stroke-width="0.7" fill="none" />
                <ellipse cx="92.5" cy="55" rx="9" ry="3" stroke="#B08D3E" stroke-width="0.7" fill="none" />
            </g>
            <!-- Green/Teal Suitcase -->
            <g transform="translate(10, 30)">
                <rect x="10" y="15" width="70" height="48" rx="10" fill="#1E3E3F" stroke="#122728" stroke-width="2" />
                <rect x="14" y="19" width="62" height="40" rx="7" stroke="#2a5354" stroke-width="1.5" fill="none" />
                <path d="M10 25c0-5 5-10 10-10" stroke="#0f1f20" stroke-width="3" fill="none" />
                <path d="M80 25c0-5-5-10-10-10" stroke="#0f1f20" stroke-width="3" fill="none" />
                <path d="M10 53c0 5 5 10 10 10" stroke="#0f1f20" stroke-width="3" fill="none" />
                <path d="M80 53c0 5-5 10-10 10" stroke="#0f1f20" stroke-width="3" fill="none" />
                <path d="M35 15V8c0-2.2 1.8-4 4-4h12c2.2 0 4 1.8 4 4v7" stroke="#0f1f20" stroke-width="4.5" fill="none" />
                <rect x="33" y="12" width="6" height="4" rx="1" fill="#B08D3E" />
                <rect x="51" y="12" width="6" height="4" rx="1" fill="#B08D3E" />
                <rect x="24" y="15" width="6" height="48" fill="#122728" />
                <rect x="60" y="15" width="6" height="48" fill="#122728" />
                <rect x="23" y="30" width="8" height="6" fill="#B08D3E" rx="1" />
                <rect x="59" y="30" width="8" height="6" fill="#B08D3E" rx="1" />
                <rect x="36" y="28" width="18" height="18" rx="3" fill="#ffffff" />
                <circle cx="45" cy="37" r="6" fill="#f97316" />
                <path d="M42 35l6 4M42 39l6-4" stroke="#ffffff" stroke-width="1.5" />
                <circle cx="20" cy="50" r="4" fill="#E11D48" />
                <rect x="54" y="48" width="10" height="6" rx="1" fill="#2563EB" transform="rotate(-10, 59, 51)" />
            </g>
        </svg>
    `;

    if (isTours) {
        /* --- Tours Only Card Template --- */
        return `
            <div class="w-[880px] h-[375px] shrink-0 relative flex rounded-[32px] overflow-hidden shadow-2xl bg-[#0B1116] border border-slate-800/80 font-sans" style="box-sizing: border-box;">
                
                <!-- Notches -->
                <div class="absolute -top-[16px] left-[68%] w-[32px] h-[32px] rounded-full bg-[#151d29] border-b border-slate-800/85 z-30"></div>
                <div className="absolute -bottom-[16px] left-[68%] w-[32px] h-[32px] rounded-full bg-[#151d29] border-t border-slate-800/85 z-30"></div>
                
                <!-- Perforated separator -->
                <div class="absolute top-0 bottom-0 left-[68%] flex flex-col justify-between py-6 pointer-events-none z-30 -translate-x-0.5">
                    ${Array.from({ length: 16 }).map(() => '<div class="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm"></div>').join('')}
                </div>

                <!-- Left Section - Scenic beach couple background -->
                <div class="w-[68%] h-full relative p-8 flex flex-col justify-between overflow-hidden text-white" style="box-sizing: border-box;">
                    <div class="absolute inset-0 -z-10 bg-[url('https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000')] bg-cover bg-center brightness-[0.85] saturate-[1.1]"></div>
                    <div class="absolute inset-0 bg-gradient-to-r from-[#012521]/95 via-[#012521]/60 to-transparent -z-10"></div>

                    <!-- Header branding logo -->
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg border border-amber-300/30">
                                <span class="material-symbols-outlined text-[24px]">beach_access</span>
                            </div>
                            <div>
                                <div class="flex items-baseline gap-1 leading-none">
                                    <span class="text-lg font-black tracking-tight text-orange-400 font-display">SHRAWELLO</span>
                                    <span class="text-sm font-bold tracking-tight text-white font-display">TravelHub</span>
                                </div>
                                <span class="text-[7.5px] font-black text-white/50 tracking-[0.25em] uppercase block mt-1 leading-none">— CORPORATE TRAVEL AND EVENTS —</span>
                            </div>
                        </div>

                        <!-- Flying plane trail -->
                        <div class="relative pr-6 pt-1 select-none">
                            <span class="text-amber-300 font-semibold text-xs tracking-wider italic block" style="font-family: 'Dancing Script', 'Brush Script MT', cursive;">
                                Explore the World. Create Memories.
                            </span>
                            <svg class="absolute top-2.5 right-[-10px] w-48 h-8 opacity-40 pointer-events-none" viewBox="0 0 200 40">
                                <path d="M10 30 C 50 10, 100 0, 180 20" fill="none" stroke="#ffffff" stroke-width="1" stroke-dasharray="3,3" />
                                <path d="M180 20 L174 15 L178 19 Z" fill="#ffffff" />
                            </svg>
                        </div>
                    </div>

                    <!-- Slogan -->
                    <div class="my-auto pt-4 pl-2 space-y-1">
                        <h2 class="text-4xl font-extrabold tracking-tight leading-none">
                            <span class="block text-white drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">EXPLORE MORE.</span>
                            <span class="block text-orange-400 drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)] mt-1">PAY LESS.</span>
                        </h2>
                        <p class="text-amber-200 font-bold text-xs tracking-wider pl-0.5 pt-1.5" style="font-family: 'Dancing Script', 'Brush Script MT', cursive, serif;">
                            Create Memories That Last Forever
                        </p>
                    </div>

                    <!-- Category badges & Bottom feature bar -->
                    <div class="space-y-4">
                        <div class="flex gap-5 pl-2 select-none">
                            ${[
                                { label: 'Customized Tours', icon: 'map' },
                                { label: 'Family Packages', icon: 'family_restroom' },
                                { label: 'Honeymoon Packages', icon: 'favorite' },
                                { label: 'Group Tours', icon: 'groups' }
                            ].map(cat => `
                                <div class="flex flex-col items-center gap-1.5">
                                    <div class="w-[50px] h-[50px] rounded-full bg-[#012521]/70 backdrop-blur-sm border border-orange-400/50 flex items-center justify-center text-orange-400 shadow-md">
                                        <span class="material-symbols-outlined text-[22px]">${cat.icon}</span>
                                    </div>
                                    <span class="text-[9px] font-black text-white/90 text-center tracking-wide block leading-tight">${cat.label}</span>
                                </div>
                            `).join('')}
                        </div>

                        <div class="bg-[#002622]/80 backdrop-blur-sm border border-emerald-800/40 rounded-2xl h-11 px-6 flex items-center justify-between text-white text-[10px] font-black tracking-wider shadow-lg" style="box-sizing: border-box;">
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-orange-400 text-sm">percent</span>
                                <span>BEST PRICES <span class="text-orange-400 font-medium">Guaranteed</span></span>
                            </div>
                            <div class="w-px h-4 bg-emerald-800/40"></div>
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-orange-400 text-sm">verified_user</span>
                                <span>TRUSTED & SAFE <span class="text-orange-400 font-medium">Our Priority</span></span>
                            </div>
                            <div class="w-px h-4 bg-emerald-800/40"></div>
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-orange-400 text-sm">headset_mic</span>
                                <span>24/7 SUPPORT <span className="text-orange-400 font-medium">We're Always Here</span></span>
                            </div>
                            <div class="w-px h-4 bg-emerald-800/40"></div>
                            <div class="flex items-center gap-2">
                                <span class="material-symbols-outlined text-orange-400 text-sm">luggage</span>
                                <span>HASSLE FREE <span class="text-orange-400 font-medium">Travel Experience</span></span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Right Section - Coupon Stub -->
                <div class="w-[32%] h-full bg-[#03231D] relative p-6 flex flex-col justify-between items-center text-center overflow-hidden" style="box-sizing: border-box;">
                    <div class="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] opacity-5 pointer-events-none"></div>

                    <div class="pt-2">
                        <span class="text-amber-300 font-bold text-xs block tracking-wider" style="font-family: 'Dancing Script', 'Brush Script MT', cursive;">
                            ★ Special Offer ★
                        </span>
                    </div>

                    <div class="my-auto pt-2 flex flex-col items-center">
                        <div class="flex items-baseline justify-center select-none">
                            <span class="text-7xl font-black text-white tracking-tighter leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                                ${discVal}
                            </span>
                            <div class="flex flex-col items-start ml-1 leading-none">
                                <span class="text-3xl font-black text-white">${isPercent ? '%' : '₹'}</span>
                                <span class="text-xl font-black text-orange-500 tracking-wider">${isPercent ? 'OFF' : 'FLAT'}</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-black text-white/80 tracking-widest uppercase block mt-1">ON ALL TOUR PACKAGES</span>
                    </div>

                    <div class="w-full relative px-2 my-auto" style="box-sizing: border-box;">
                        <div class="absolute top-[-9px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[7.5px] uppercase tracking-widest px-3 py-0.5 rounded-full z-15 shadow">
                            COUPON CODE
                        </div>
                        <div class="w-full bg-white rounded-2xl p-2.5 border-[3px] border-double border-orange-400 shadow-xl flex items-center justify-center relative overflow-hidden" style="box-sizing: border-box;">
                            <div class="absolute inset-0.5 border border-dashed border-slate-300 rounded-xl pointer-events-none"></div>
                            <span class="font-mono text-base font-extrabold text-[#03231D] tracking-widest uppercase block z-10">
                                ${promoCode}
                            </span>
                        </div>
                    </div>

                    <div class="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10.5px] tracking-wider py-2 px-3 rounded-xl shadow flex items-center justify-center gap-2 select-none" style="box-sizing: border-box;">
                        <span class="material-symbols-outlined text-[15px] font-black">calendar_today</span>
                        <span>VALID TILL: ${expiryStr}</span>
                      </div>

                    ${luggageSvg}
                </div>
            </div>
        `;
    } else {
        /* --- Multi-Category Card Template --- */
        return `
            <div class="w-[880px] h-[375px] shrink-0 relative flex rounded-[32px] overflow-hidden shadow-2xl bg-[#0B1116] border border-slate-800/80 font-sans" style="box-sizing: border-box;">
                
                <!-- Notches -->
                <div class="absolute -top-[16px] left-[68%] w-[32px] h-[32px] rounded-full bg-[#151d29] border-b border-slate-800/85 z-30"></div>
                <div class="absolute -bottom-[16px] left-[68%] w-[32px] h-[32px] rounded-full bg-[#151d29] border-t border-slate-800/85 z-30"></div>
                
                <!-- Perforated separator -->
                <div class="absolute top-0 bottom-0 left-[68%] flex flex-col justify-between py-6 pointer-events-none z-30 -translate-x-0.5">
                    ${Array.from({ length: 16 }).map(() => '<div class="w-1.5 h-1.5 rounded-full bg-white/90 shadow-sm"></div>').join('')}
                </div>

                <!-- Left Section - Branded Cream & Slanted Categories -->
                <div class="w-[68%] h-full bg-gradient-to-br from-[#FCFBF9] to-[#F3EFE9] text-slate-800 relative p-8 flex flex-col justify-between overflow-hidden" style="box-sizing: border-box;">
                    
                    <!-- Dotted Route Map Path -->
                    <svg class="absolute inset-0 w-full h-full opacity-[0.12] pointer-events-none" viewBox="0 0 600 375">
                        <path d="M30 60 Q 150 140, 220 70 T 400 120" fill="none" stroke="#FF6A00" stroke-width="2.5" stroke-dasharray="5,5" />
                        <circle cx="30" cy="60" r="5" fill="#FF6A00" />
                        <circle cx="220" cy="70" r="5" fill="#008060" />
                        <circle cx="400" cy="120" r="5" fill="#0066CC" />
                    </svg>

                    <!-- Header Logo -->
                    <div class="flex justify-between items-start">
                        <div class="flex items-center gap-3">
                            <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-amber-400 to-orange-500 flex items-center justify-center text-white shadow-lg border border-amber-300/30">
                                <span class="material-symbols-outlined text-[24px]">beach_access</span>
                            </div>
                            <div>
                                <div class="flex items-baseline gap-1 leading-none">
                                    <span class="text-lg font-black tracking-tight text-[#FF6A00] font-display">SHRAWELLO</span>
                                    <span class="text-sm font-bold tracking-tight text-[#008060] font-display">TravelHub</span>
                                </div>
                                <span class="text-[7.5px] font-black text-slate-400 tracking-[0.25em] uppercase block mt-1 leading-none">— CORPORATE TRAVEL AND EVENTS —</span>
                            </div>
                        </div>
                    </div>

                    <!-- Middle Area - Slogan + Slants -->
                    <div class="flex justify-between items-center my-auto pt-2 pl-1 select-none">
                        
                        <div class="space-y-4 max-w-[280px]">
                            <div>
                                <h2 class="text-[28px] font-black tracking-tight leading-none text-[#003632]">ONE DESTINATION.</h2>
                                <h2 class="text-[28px] font-black tracking-tight leading-none text-[#FF6A00] mt-1.5">ENDLESS JOURNEYS.</h2>
                                <p class="text-xs text-slate-500 font-bold mt-2.5">
                                    Travel <span class="text-emerald-600">Smart</span>. Book <span class="text-[#003632]">Easy</span>. Save <span class="text-orange-500">More</span>.
                                </p>
                            </div>

                            <div class="space-y-1.5">
                                ${['Easy Bookings', 'Best Prices', 'Verified Partners', '24/7 Support'].map(feat => `
                                    <div class="flex items-center gap-2 text-[10.5px] font-extrabold text-slate-700">
                                        <span class="w-4 h-4 rounded-full bg-emerald-600 flex items-center justify-center text-white">
                                            <span class="material-symbols-outlined text-[11px] font-black">check</span>
                                        </span>
                                        <span>${feat}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <!-- Slants -->
                        <div class="flex gap-2.5 h-[165px] pl-6 pr-2">
                            ${[
                                { title: 'CAB BOOKING', text: 'Safe. Reliable. Rides.', icon: 'local_taxi', color: 'bg-orange-500', img: 'https://images.unsplash.com/photo-1549880181-56a44cf8a4a1?auto=format&fit=crop&q=80&w=300' },
                                { title: 'TRAIN BOOKING', text: 'Comfortable. Connected.', icon: 'train', color: 'bg-emerald-600', img: 'https://images.unsplash.com/photo-1532103054090-334e6e60ab29?auto=format&fit=crop&q=80&w=300' },
                                { title: 'FLIGHT BOOKING', text: 'Best Fares. Fly High.', icon: 'flight', color: 'bg-blue-600', img: 'https://images.unsplash.com/photo-1436491865332-7a61a109cc05?auto=format&fit=crop&q=80&w=300' },
                                { title: 'TOUR PACKAGES', text: 'Explore. Create Memories.', icon: 'beach_access', color: 'bg-purple-600', img: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=300' }
                            ].map(col => `
                                <div class="w-[66px] h-[155px] -skew-x-12 overflow-hidden rounded-xl border border-white shadow-md relative transition-all duration-300">
                                    <div class="absolute inset-0 -skew-x-12">
                                        <img src="${col.img}" class="absolute inset-0 w-full h-full object-cover brightness-[0.8]" />
                                        <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/30"></div>
                                    </div>
                                    <div class="skew-x-12 w-[110px] h-[155px] absolute left-[-22px] top-0 flex flex-col justify-between p-2.5" style="box-sizing: border-box;">
                                        <div class="flex flex-col items-center select-none pt-1">
                                            <div class="w-6 h-6 rounded-full ${col.color} flex items-center justify-center text-white shadow-sm">
                                                <span class="material-symbols-outlined text-[14px]">${col.icon}</span>
                                            </div>
                                            <span class="text-[7.5px] font-black text-white text-center tracking-wider block mt-1">${col.title}</span>
                                        </div>
                                        <div class="${col.color} text-white text-[7px] font-black leading-tight py-1 px-1 rounded text-center shadow-md select-none">
                                            ${col.text}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>

                    <!-- Bottom feature rounded bar -->
                    <div class="bg-white/90 border border-slate-200/50 rounded-2xl h-11 px-6 flex items-center justify-between text-slate-700 text-[10px] font-black tracking-wider shadow-md select-none" style="box-sizing: border-box;">
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[#008060] text-sm">verified</span>
                            <span>BEST PRICES <span class="text-slate-400 font-medium">Guaranteed</span></span>
                        </div>
                        <div class="w-px h-4 bg-slate-200"></div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[#008060] text-sm">security</span>
                            <span>TRUSTED & SAFE <span class="text-slate-400 font-medium">Our Priority</span></span>
                        </div>
                        <div class="w-px h-4 bg-slate-200"></div>
                        <div class="flex items-center gap-2">
                            <span class="material-symbols-outlined text-[#008060] text-sm">support_agent</span>
                            <span>24/7 SUPPORT <span class="text-slate-400 font-medium">Always Here</span></span>
                        </div>
                        <div class="w-px h-4 bg-slate-200"></div>
                        <div class="flex items-center gap-2">
                          <span class="material-symbols-outlined text-[#008060] text-sm">local_offer</span>
                          <span>EXCLUSIVE OFFERS <span class="text-slate-400 font-medium">More Savings</span></span>
                        </div>
                    </div>
                </div>

                <!-- Right Section - Coupon Stub -->
                <div class="w-[32%] h-full bg-[#03231D] relative p-6 flex flex-col justify-between items-center text-center overflow-hidden" style="box-sizing: border-box;">
                    <div class="absolute inset-0 bg-[radial-gradient(#ffffff_1px,transparent_1px)] [background-size:12px_12px] opacity-5 pointer-events-none"></div>

                    <div class="pt-2 select-none">
                        <span class="text-amber-300 font-black text-[10px] block tracking-[0.2em] uppercase leading-none">
                            ★ SPECIAL DISCOUNT ★
                        </span>
                      </div>

                    <div class="my-auto pt-2 flex flex-col items-center">
                        <div class="flex items-baseline justify-center select-none">
                            <span class="text-7xl font-black text-white tracking-tighter leading-none drop-shadow-[0_2px_10px_rgba(0,0,0,0.3)]">
                                ${discVal}
                            </span>
                            <div class="flex flex-col items-start ml-1 leading-none">
                                <span class="text-3xl font-black text-white">${isPercent ? '%' : '₹'}</span>
                                <span class="text-xl font-black text-orange-500 tracking-wider">${isPercent ? 'OFF' : 'FLAT'}</span>
                            </div>
                        </div>
                        <span class="text-[10px] font-black text-white/95 tracking-[0.15em] uppercase block mt-1">ON ALL BOOKINGS</span>
                        <span class="text-[8px] font-bold text-orange-400/80 tracking-widest block mt-0.5">CAB | TRAIN | FLIGHTS | TOURS</span>
                    </div>

                    <div class="w-full relative px-2 my-auto" style="box-sizing: border-box;">
                        <div class="absolute top-[-9px] left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[7.5px] uppercase tracking-widest px-3 py-0.5 rounded-full z-15 shadow">
                            COUPON CODE
                        </div>
                        <div class="w-full bg-white rounded-2xl p-2.5 border-[3px] border-double border-orange-400 shadow-xl flex items-center justify-center relative overflow-hidden" style="box-sizing: border-box;">
                            <div class="absolute inset-0.5 border border-dashed border-slate-300 rounded-xl pointer-events-none"></div>
                            <span class="font-mono text-base font-extrabold text-[#03231D] tracking-widest uppercase block z-10">
                                ${promoCode}
                            </span>
                        </div>
                    </div>

                    <div class="flex justify-around items-center w-full px-2 py-1 bg-[#011B16] rounded-xl border border-white/5 shadow-inner select-none my-auto" style="box-sizing: border-box;">
                        <span class="material-symbols-outlined text-orange-400 text-base font-bold">local_taxi</span>
                        <div class="w-px h-3 bg-white/10"></div>
                        <span class="material-symbols-outlined text-orange-400 text-base font-bold">train</span>
                        <div class="w-px h-3 bg-white/10"></div>
                        <span class="material-symbols-outlined text-orange-400 text-base font-bold">flight</span>
                        <div class="w-px h-3 bg-white/10"></div>
                        <span class="material-symbols-outlined text-orange-400 text-base font-bold">luggage</span>
                    </div>

                    <div class="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black text-[10.5px] tracking-wider py-2 px-3 rounded-xl shadow flex items-center justify-center gap-2 select-none" style="box-sizing: border-box;">
                        <span class="material-symbols-outlined text-[15px] font-black">calendar_today</span>
                        <span>VALID TILL: ${expiryStr}</span>
                    </div>

                    ${luggageSvg}
                </div>
            </div>
        `;
    }
}

// ─── PNG DOWNLOAD via html2canvas ─────────────────────────────────────────────
export async function downloadCouponAsImage(
    coupon: Coupon,
    elementRef: HTMLElement | null
): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;

    let targetElement = elementRef;
    let isOffscreen = false;

    // If no DOM element is provided (e.g. from row download), build a high-fidelity off-screen card
    if (!targetElement) {
        targetElement = document.createElement('div');
        targetElement.style.position = 'absolute';
        targetElement.style.left = '-9999px';
        targetElement.style.top = '-9999px';
        targetElement.style.width = '880px';
        targetElement.style.height = '375px';
        targetElement.style.overflow = 'hidden';
        targetElement.innerHTML = getCouponHtml(coupon);
        document.body.appendChild(targetElement);
        isOffscreen = true;

        // Preload image assets inside the ticket to avoid blank spaces
        const images = Array.from(targetElement.querySelectorAll('img'));
        await Promise.all(images.map(img => {
            if (img.complete) return Promise.resolve();
            return new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = resolve; // avoid getting stuck
            });
        }));
    }

    try {
        const canvas = await html2canvas(targetElement, {
            backgroundColor: null,
            scale: 3, // scale up for high-DPI crisp print quality
            useCORS: true,
            logging: false,
            allowTaint: false,
        });

        const link = document.createElement('a');
        link.download = `COUPON_${coupon.code}_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();

        await trackDownload(coupon.id, coupon.downloadCount || 0);
    } catch (err) {
        console.error('Image download failed:', err);
        throw err;
    } finally {
        if (isOffscreen && targetElement && targetElement.parentNode) {
            targetElement.parentNode.removeChild(targetElement);
        }
    }
}

// ─── PDF DOWNLOAD via html2canvas + jsPDF ──────────────────────────────────────
export async function downloadCouponAsPDF(coupon: Coupon): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;

    // Card dimensions for A5 print format (landscape aspect 1.6)
    const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: [210, 130], // aspect-ratio calibrated exactly for A5
    });

    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    // Render high-fidelity card in absolute off-screen container
    const container = document.createElement('div');
    container.style.position = 'absolute';
    container.style.left = '-9999px';
    container.style.top = '-9999px';
    container.style.width = '880px';
    container.style.height = '375px';
    container.style.overflow = 'hidden';
    container.innerHTML = getCouponHtml(coupon);
    document.body.appendChild(container);

    // Preload image assets inside the ticket to avoid blank spaces
    const images = Array.from(container.querySelectorAll('img'));
    await Promise.all(images.map(img => {
        if (img.complete) return Promise.resolve();
        return new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = resolve; // avoid getting stuck
        });
    }));

    try {
        const canvas = await html2canvas(container, {
            backgroundColor: null,
            scale: 3.5, // 3.5x scale to guarantee extremely crisp high-resolution PDF print exports
            useCORS: true,
            logging: false,
            allowTaint: false,
        });

        // Insert the high-resolution captured canvas image full-bleed into the PDF
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 0, 0, W, H);

        doc.save(`COUPON_${coupon.code}_Shrawello.pdf`);
        await trackDownload(coupon.id, coupon.downloadCount || 0);
    } catch (err) {
        console.error('PDF generation failed:', err);
        throw err;
    } finally {
        if (container && container.parentNode) {
            container.parentNode.removeChild(container);
        }
    }
}
