/**
 * couponDownloader.ts  ─ Premium Travel Coupon Renderer
 * ─────────────────────────────────────────────────────────────────────────────
 * Generates a 880×375px boarding-pass style coupon for PNG / PDF export.
 * Fully compatible with html2canvas ^1.4.1.
 *
 * html2canvas safe rules:
 *  ✓ No `inset` shorthand
 *  ✓ No flex `gap` — use margin on children
 *  ✓ No `repeating-linear-gradient` on <4px elements
 *  ✓ No Unicode special chars — use plain ASCII or SVG shapes
 *  ✓ allowTaint + crossorigin on images
 *  ✓ CSS `border-right: dashed` for the ticket stub separator
 *  ✓ Inline SVG for decorative patterns (globe lines, routes, compass)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { Coupon } from '../types';

// ─── Font injection ───────────────────────────────────────────────────────────
function ensureFontsInjected(): void {
    if (typeof document === 'undefined') return;
    if (document.getElementById('shrawello-coupon-fonts')) return;
    const link = document.createElement('link');
    link.id = 'shrawello-coupon-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap';
    document.head.appendChild(link);
}

// ─── DB download tracking ─────────────────────────────────────────────────────
async function trackDownload(couponId: string, currentCount: number): Promise<void> {
    if (!couponId || couponId === 'preview') return;
    try {
        const token = localStorage.getItem('shravya_jwt');
        if (!token) return;
        await fetch(`/api/crud/coupons/${couponId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ download_count: (currentCount || 0) + 1 }),
        });
    } catch (e) { console.warn('trackDownload failed:', e); }
}

// ─── Date formatter ──────────────────────────────────────────────────────────
function fmtDate(d?: string): string {
    if (!d) return '31 DEC 2026';
    try { return format(new Date(d), 'dd MMM yyyy').toUpperCase(); }
    catch { return d.toUpperCase(); }
}

// ─────────────────────────────────────────────────────────────────────────────
// PIXEL LAYOUT MAP
//
// LEFT SECTION (598 × 375px — white, brand, slogan, icons, feature bar)
//   Logo + brand :  18px → 72px
//   [gap 6px]
//   Slogan block :  78px → 190px  (32/30px, tagline, accent bar)
//   [gap 8px]
//   Icon row     : 198px → 258px  (40px circles + labels)
//   [gap 8px]
//   Feature bar  : 266px → 310px  (44px, green-tinted)
//   T&C          : bottom 4px
//
// RIGHT SECTION (282 × 375px — dark emerald, discount, code, validity, expiry)
//   Offer header :  16px → 36px
//   Discount     :  40px → 172px  (70px number + subtitle + dots)
//   [zone sep]   : 178px (thin white line)
//   Code section : 186px → 252px  (badge + 46px box)
//   Validity     : 262px → 296px  (FROM–TO dates)
//   Expiry       : bottom 12px
// ─────────────────────────────────────────────────────────────────────────────
function getCouponHtml(coupon: Coupon): string {
    const isTours     = coupon.type === 'ToursOnly';
    const discVal     = coupon.discountValue || 15;
    const isPct       = coupon.discountType === 'Percentage';
    const code        = coupon.code || (isTours ? 'TOUR15' : 'SHRAWELLO15');
    const expiry      = fmtDate(coupon.validTo);
    const validFrom   = fmtDate(coupon.validFrom);
    const minSpend    = coupon.minBookingAmount || 0;
    const logoUrl     = typeof window !== 'undefined'
        ? `${window.location.origin}/logo.png` : '/logo.png';

    const F  = "'Outfit', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif";
    const codeFs = code.length > 14 ? '11px' : code.length > 11 ? '13px' : '14px';

    // ── SHARED: Min spend sub-label ───────────────────────────────────────────
    const minSpendHtml = minSpend > 0
        ? `<div style="text-align:center;margin-top:5px;">
               <span style="font-family:${F};font-size:7px;font-weight:700;color:#94a3b8;letter-spacing:0.05em;white-space:nowrap;">
                   MIN. SPEND: &#8377;${minSpend.toLocaleString('en-IN')}
               </span>
           </div>`
        : '';

    const dividerTop = minSpend > 0 ? 254 : 240;
    const validityTop = dividerTop + 22;

    // ── SHARED: Header branding ───────────────────────────────────────────────
    const headerHtml = `
        <div style="position:absolute;left:28px;top:18px;display:flex;align-items:center;">
            <img src="${logoUrl}" crossorigin="anonymous"
                 style="width:48px;height:48px;object-fit:contain;border-radius:10px;margin-right:13px;flex-shrink:0;" />
            <div style="display:flex;flex-direction:column;justify-content:center;line-height:1;">
                <div style="font-family:${F};font-size:21px;font-weight:800;color:#024430;letter-spacing:0.02em;line-height:1.1;">SHRAWELLO</div>
                <div style="font-family:${F};font-size:14px;font-weight:800;color:#E65F2B;margin-top:2px;line-height:1.1;">TravelHub</div>
                <div style="font-family:${F};font-size:7.5px;font-weight:700;color:#b0bcc8;letter-spacing:0.14em;text-transform:uppercase;margin-top:4px;line-height:1;">CORPORATE TRAVEL AND EVENTS</div>
            </div>
        </div>`;

    // ── SHARED: T&C ──────────────────────────────────────────────────────────
    const tncHtml = `
        <div style="position:absolute;bottom:4px;left:28px;right:10px;
                    font-family:${F};font-size:6.5px;font-weight:500;color:#b8c2cc;line-height:1.4;">
            *Valid once per user. Non-transferable. Cannot be combined with other offers.
        </div>`;

    // ── ATMOSPHERE: Left section travel SVG background ────────────────────────
    // Low-opacity route arcs, city dots, compass rose (opacity 0.015, shifted right)
    const travelBgSvg = `
        <svg style="position:absolute;top:0;left:0;width:598px;height:375px;z-index:1;pointer-events:none;"
             xmlns="http://www.w3.org/2000/svg">
            <!-- Flight route arcs -->
            <path d="M 28 345 Q 220 135 515 95" fill="none" stroke="#024430" stroke-width="1.4"
                  stroke-dasharray="5 9" opacity="0.05"/>
            <path d="M 70 368 Q 295 155 568 125" fill="none" stroke="#024430" stroke-width="0.9"
                  stroke-dasharray="3 12" opacity="0.03"/>
            <!-- Airport/city dots -->
            <circle cx="28" cy="345" r="3" fill="#E65F2B" opacity="0.08"/>
            <circle cx="515" cy="95" r="3" fill="#E65F2B" opacity="0.08"/>
            <!-- Compass rose (ultra faint opacity 0.015, shifted bottom-right away from text) -->
            <g transform="translate(470, 240)" opacity="0.015">
                <circle cx="0" cy="0" r="45" stroke="#024430" stroke-width="0.8" fill="none" stroke-dasharray="2 5"/>
                <circle cx="0" cy="0" r="30" stroke="#024430" stroke-width="0.5" fill="none"/>
                <line x1="0" y1="-45" x2="0" y2="-30" stroke="#024430" stroke-width="1.2"/>
                <line x1="0" y1="30" x2="0" y2="45" stroke="#024430" stroke-width="1.2"/>
                <line x1="-45" y1="0" x2="-30" y2="0" stroke="#024430" stroke-width="1.2"/>
                <line x1="30" y1="0" x2="45" y2="0" stroke="#024430" stroke-width="1.2"/>
            </g>
        </svg>`;

    // ── ATMOSPHERE: Right section globe grid SVG ──────────────────────────────
    const globeBgSvg = `
        <svg style="position:absolute;top:0;left:0;width:282px;height:375px;z-index:2;pointer-events:none;"
             xmlns="http://www.w3.org/2000/svg">
            <g fill="none" stroke="rgba(255,255,255,0.05)" stroke-width="0.7">
                <path d="M 141 0 Q 82 188 141 375"/>
                <path d="M 141 0 Q 200 188 141 375"/>
                <path d="M 0 94 Q 141 76 282 94"/>
                <path d="M 0 188 Q 141 173 282 188"/>
                <path d="M 0 281 Q 141 266 282 281"/>
            </g>
        </svg>`;

    // ── RIGHT SECTION (shared for both card types) ────────────────────────────
    const offerLabel   = isTours
        ? '&mdash;&nbsp;SPECIAL OFFER&nbsp;&mdash;'
        : '&#9733;&nbsp;EXCLUSIVE OFFER&nbsp;&#9733;';
    const discSubtitle = isTours ? 'ON ALL TOUR PACKAGES' : 'ON ALL BOOKINGS';
    const discSubline  = isTours ? '' :
        `<div style="font-family:${F};font-size:7.5px;font-weight:700;color:#5eead4;
                     letter-spacing:0.07em;text-transform:uppercase;margin-top:3px;white-space:nowrap;">
             CAB &nbsp;|&nbsp; TRAIN &nbsp;|&nbsp; FLIGHTS &nbsp;|&nbsp; TOURS
         </div>`;

    const rightSection = `
        <div style="width:282px;height:375px;background-color:#024430;position:relative;
                    box-sizing:border-box;overflow:hidden;font-family:${F};">

            ${globeBgSvg}

            <!-- Dot grid -->
            <div style="position:absolute;top:0;left:0;width:282px;height:375px;
                        background-image:radial-gradient(rgba(255,255,255,0.06) 1px,transparent 1px);
                        background-size:12px 12px;pointer-events:none;z-index:3;"></div>

            <!-- ── ZONE 1: Offer Label (top: 24px) ────────────────────────── -->
            <div style="position:absolute;top:24px;left:0;width:282px;text-align:center;z-index:10;">
                <span style="font-family:${F};color:#fb923c;font-weight:800;font-size:11px;
                             letter-spacing:0.15em;text-transform:uppercase;">
                    ${offerLabel}
                </span>
            </div>

            <!-- ── ZONE 2: Discount Number + Subtitle (top: 54px) ─────────── -->
            <div style="position:absolute;top:54px;left:0;width:282px;
                        display:flex;flex-direction:column;align-items:center;z-index:10;">
                <div style="display:flex;align-items:center;justify-content:center;height:58px;">
                    <span style="font-family:${F};font-size:52px;font-weight:800;color:#ffffff;
                                 line-height:1;letter-spacing:-0.03em;margin-right:5px;">
                        ${discVal}
                    </span>
                    <div style="display:flex;flex-direction:column;align-items:flex-start;justify-content:center;line-height:1.1;">
                        <span style="font-family:${F};font-size:20px;font-weight:800;color:#ffffff;line-height:1;">
                            ${isPct ? '%' : '&#8377;'}
                        </span>
                        <span style="font-family:${F};font-size:11px;font-weight:800;color:#fb923c;
                                     line-height:1;margin-top:2px;text-transform:uppercase;letter-spacing:0.04em;">
                            ${isPct ? 'OFF' : 'FLAT'}
                        </span>
                    </div>
                </div>
                <!-- Explicit margin-top 14px to guarantee no collision -->
                <div style="font-family:${F};font-size:9.5px;font-weight:800;
                            color:rgba(255,255,255,0.92);letter-spacing:0.1em;text-transform:uppercase;
                            margin-top:14px;text-align:center;white-space:nowrap;line-height:1.2;">
                    ${discSubtitle}
                </div>
                ${discSubline}
            </div>

            <!-- ── ZONE 3: Airplane Divider (top: 146px) ─────────────────── -->
            <div style="position:absolute;top:146px;left:31px;width:220px;
                        display:flex;align-items:center;justify-content:center;z-index:10;">
                <div style="height:1px;background-color:rgba(251,146,60,0.35);flex:1;"></div>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#fb923c" style="margin:0 8px;flex-shrink:0;">
                    <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L14 19v-5.5L21 16z" transform="rotate(90 12 12)"/>
                </svg>
                <div style="height:1px;background-color:rgba(251,146,60,0.35);flex:1;"></div>
            </div>

            <!-- ── ZONE 4: Coupon Code Box (top: 196px) ──────────────────── -->
            <div style="position:absolute;top:196px;left:24px;width:234px;z-index:10;">
                <!-- Tab badge -->
                <div style="display:flex;justify-content:center;position:relative;top:7px;z-index:15;">
                    <div style="font-family:${F};background-color:#E65F2B;color:#ffffff;
                                font-weight:800;font-size:8px;text-transform:uppercase;
                                letter-spacing:0.14em;padding:2px 14px;
                                border-radius:10px;white-space:nowrap;line-height:1.2;">
                        COUPON CODE
                    </div>
                </div>
                <!-- Code box with un-cropped line-height 1 and padding-bottom 1px -->
                <div style="width:234px;height:50px;background-color:#ffffff;
                            border-radius:14px;padding:2.5px;
                            border:2px solid #E65F2B;box-sizing:border-box;">
                    <div style="border:1px dashed #cbd5e1;border-radius:10px;
                                width:100%;height:100%;background-color:#ffffff;
                                display:flex;align-items:center;justify-content:center;
                                box-sizing:border-box;overflow:hidden;padding:0 6px;">
                        <span style="font-family:${F};font-size:${codeFs};font-weight:800;
                                     color:#024430;letter-spacing:0.06em;text-transform:uppercase;
                                     white-space:nowrap;line-height:1;display:inline-block;padding-bottom:1px;">
                            ${code}
                        </span>
                    </div>
                </div>
                ${minSpendHtml}
            </div>

            <!-- ── ZONE 5: Valid Till Footer (bottom: 24px) ─────────────── -->
            <div style="position:absolute;bottom:24px;left:0;width:282px;
                        display:flex;align-items:center;justify-content:center;color:#fb923c;z-index:10;">
                <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" fill="none"
                     stroke="#fb923c" stroke-width="2.5" viewBox="0 0 24 24"
                     style="flex-shrink:0;margin-right:6px;">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
                    <line x1="16" y1="2" x2="16" y2="6"/>
                    <line x1="8" y1="2" x2="8" y2="6"/>
                    <line x1="3" y1="10" x2="21" y2="10"/>
                </svg>
                <span style="font-family:${F};color:#fb923c;font-weight:800;font-size:11px;
                             letter-spacing:0.08em;white-space:nowrap;line-height:1;">
                    VALID TILL: ${expiry}
                </span>
            </div>
        </div>`;

    // ─────────────────────────────────────────────────────────────────────────
    if (isTours) {
        /* ══════════════════════════════════════════════════════════════════════
           TOURS EXCLUSIVE VOUCHER
        ══════════════════════════════════════════════════════════════════════ */
        const leftSection = `
            <div style="width:598px;height:375px;background-color:#ffffff;position:relative;
                        box-sizing:border-box;overflow:hidden;
                        border-right:2px dashed rgba(0,0,0,0.13);">

                ${travelBgSvg}

                <!-- Dotted Flight Path SVG Arrow (curved gracefully towards top-right) -->
                <div style="position:absolute;top:32px;right:25px;pointer-events:none;z-index:10;">
                    <svg width="192" height="48" viewBox="0 0 200 50" style="opacity:0.85;">
                        <path d="M 10 40 C 60 20, 110 5, 170 25" fill="none" stroke="#024430" stroke-width="1.8" stroke-dasharray="4,4"/>
                        <g transform="translate(170, 25) rotate(15) scale(0.9)">
                            <path d="M 12 0 L -4 -12 L -2 -3 L -14 0 L -2 3 L -4 12 Z" fill="#024430"/>
                        </g>
                    </svg>
                </div>

                <div style="position:relative;z-index:5;">
                    ${headerHtml}
                </div>

                <!-- Slogan block (top: 82px, height ~91px, ends at 173px) -->
                <div style="position:absolute;left:40px;top:82px;width:518px;
                            display:flex;flex-direction:column;z-index:5;">
                    <div style="font-family:${F};font-size:28px;font-weight:800;color:#024430;
                                line-height:1.1;letter-spacing:-0.01em;">EXPLORE MORE.</div>
                    <div style="font-family:${F};font-size:28px;font-weight:800;color:#E65F2B;
                                line-height:1.1;letter-spacing:-0.01em;margin-top:1px;">PAY LESS.</div>
                    <!-- Explicit Orange Accent Line Bar -->
                    <div style="display:block;width:44px;height:3px;background-color:#E65F2B;
                                margin-top:6px;border-radius:2px;"></div>
                    <div style="font-family:${F};font-size:13px;font-weight:600;font-style:italic;color:#024430;
                                margin-top:4px;line-height:1.2;">
                        Create Memories That Last Forever
                    </div>
                </div>

                <!-- Category icons (top: 194px, 21px clearance below slogan text) -->
                <div style="position:absolute;left:40px;top:194px;width:518px;
                            display:flex;justify-content:space-between;align-items:flex-start;z-index:5;">

                    <div style="width:110px;display:flex;flex-direction:column;align-items:center;text-align:center;">
                        <div style="width:44px;height:44px;border-radius:22px;background-color:#024430;
                                    display:flex;align-items:center;justify-content:center;margin-bottom:5px;flex-shrink:0;box-shadow:0 3px 5px rgba(0,0,0,0.08);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none"
                                 stroke="#ffffff" stroke-width="2.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                            </svg>
                        </div>
                        <div style="font-family:${F};font-size:8.5px;font-weight:700;color:#1e293b;
                                    line-height:1.1;letter-spacing:0.01em;white-space:nowrap;">Customized Tours</div>
                    </div>

                    <div style="width:110px;display:flex;flex-direction:column;align-items:center;text-align:center;">
                        <div style="width:44px;height:44px;border-radius:22px;background-color:#E65F2B;
                                    display:flex;align-items:center;justify-content:center;margin-bottom:5px;flex-shrink:0;box-shadow:0 3px 5px rgba(0,0,0,0.08);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none"
                                 stroke="#ffffff" stroke-width="2.5" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/>
                            </svg>
                        </div>
                        <div style="font-family:${F};font-size:8.5px;font-weight:700;color:#1e293b;
                                    line-height:1.1;letter-spacing:0.01em;white-space:nowrap;">Family Packages</div>
                    </div>

                    <div style="width:110px;display:flex;flex-direction:column;align-items:center;text-align:center;">
                        <div style="width:44px;height:44px;border-radius:22px;background-color:#024430;
                                    display:flex;align-items:center;justify-content:center;margin-bottom:5px;flex-shrink:0;box-shadow:0 3px 5px rgba(0,0,0,0.08);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="#ffffff" viewBox="0 0 24 24">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
                            </svg>
                        </div>
                        <div style="font-family:${F};font-size:8.5px;font-weight:700;color:#1e293b;
                                    line-height:1.1;letter-spacing:0.01em;white-space:nowrap;">Honeymoon Packages</div>
                    </div>

                    <div style="width:110px;display:flex;flex-direction:column;align-items:center;text-align:center;">
                        <div style="width:44px;height:44px;border-radius:22px;background-color:#E65F2B;
                                    display:flex;align-items:center;justify-content:center;margin-bottom:5px;flex-shrink:0;box-shadow:0 3px 5px rgba(0,0,0,0.08);">
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="#ffffff" viewBox="0 0 24 24">
                                <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                            </svg>
                        </div>
                        <div style="font-family:${F};font-size:8.5px;font-weight:700;color:#1e293b;
                                    line-height:1.1;letter-spacing:0.01em;white-space:nowrap;">Group Tours</div>
                    </div>
                </div>

                <!-- Feature bar (top: 280px, 26px clearance below categories) -->
                <div style="position:absolute;left:40px;top:280px;width:518px;height:44px;
                            background-color:#ffffff;border:1px solid #e2e8f0;
                            border-radius:14px;box-sizing:border-box;
                            display:flex;align-items:center;justify-content:space-between;
                            padding-left:18px;padding-right:18px;z-index:5;">

                    <div style="display:flex;align-items:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
                             stroke="#024430" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-right:8px;">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/>
                        </svg>
                        <div style="display:flex;flex-direction:column;line-height:1.1;">
                            <span style="font-family:${F};font-size:10px;font-weight:700;color:#334155;white-space:nowrap;">Best Prices</span>
                            <span style="font-family:${F};font-size:8px;font-weight:600;color:#94a3b8;white-space:nowrap;margin-top:1px;">Guaranteed</span>
                        </div>
                    </div>

                    <div style="width:1px;height:16px;background-color:#e2e8f0;flex-shrink:0;"></div>

                    <div style="display:flex;align-items:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
                             stroke="#E65F2B" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-right:8px;">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M18 18h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2m-12 7h-2a2 2 0 01-2-2v-3a2 2 0 012-2h2m12 5V9a6 6 0 00-12 0v8"/>
                        </svg>
                        <div style="display:flex;flex-direction:column;line-height:1.1;">
                            <span style="font-family:${F};font-size:10px;font-weight:700;color:#334155;white-space:nowrap;">24/7 Support</span>
                            <span style="font-family:${F};font-size:8px;font-weight:600;color:#94a3b8;white-space:nowrap;margin-top:1px;">We're Always Here</span>
                        </div>
                    </div>

                    <div style="width:1px;height:16px;background-color:#e2e8f0;flex-shrink:0;"></div>

                    <div style="display:flex;align-items:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none"
                             stroke="#024430" stroke-width="2" viewBox="0 0 24 24" style="flex-shrink:0;margin-right:8px;">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM9 7V4a2 2 0 012-2h2a2 2 0 012 2v3"/>
                        </svg>
                        <div style="display:flex;flex-direction:column;line-height:1.1;">
                            <span style="font-family:${F};font-size:10px;font-weight:700;color:#334155;white-space:nowrap;">Hassle Free</span>
                            <span style="font-family:${F};font-size:8px;font-weight:600;color:#94a3b8;white-space:nowrap;margin-top:1px;">Travel Experience</span>
                        </div>
                    </div>
                </div>

                ${tncHtml}
            </div>`;

        return `
            <div style="width:880px;height:375px;display:flex;border-radius:32px;overflow:hidden;
                        background-color:#ffffff;border:1px solid #e2e8f0;
                        font-family:${F};position:relative;box-sizing:border-box;">
                <!-- Ticket notch circles -->
                <div style="position:absolute;top:-16px;left:582px;width:32px;height:32px;
                            border-radius:50%;background-color:#ffffff;border:1px solid #e2e8f0;z-index:30;box-sizing:border-box;"></div>
                <div style="position:absolute;bottom:-16px;left:582px;width:32px;height:32px;
                            border-radius:50%;background-color:#ffffff;border:1px solid #e2e8f0;z-index:30;box-sizing:border-box;"></div>
                ${leftSection}
                ${rightSection}
            </div>`;

    } else {
        /* ══════════════════════════════════════════════════════════════════════
           MULTI-CATEGORY PREMIUM PASS
        ══════════════════════════════════════════════════════════════════════ */
        const leftSection = `
            <div style="width:598px;height:375px;background-color:#ffffff;position:relative;
                        box-sizing:border-box;overflow:hidden;
                        border-right:2px dashed rgba(0,0,0,0.13);">

                ${travelBgSvg}

                <div style="position:relative;z-index:5;">
                    ${headerHtml}
                </div>

                <!-- Slogan -->
                <div style="position:absolute;left:36px;top:78px;width:490px;
                            display:flex;flex-direction:column;z-index:5;">
                    <div style="font-family:${F};font-size:30px;font-weight:800;color:#024430;
                                line-height:1.05;letter-spacing:-0.02em;">ONE PLATFORM.</div>
                    <div style="font-family:${F};font-size:28px;font-weight:800;color:#E65F2B;
                                line-height:1.05;letter-spacing:-0.02em;margin-top:2px;">ALL YOUR JOURNEYS.</div>
                    <div style="display:block;width:48px;height:3px;background-color:#E65F2B;
                                margin-top:9px;border-radius:2px;"></div>
                    <div style="font-family:${F};font-size:11px;font-weight:500;color:#5a6a7a;
                                margin-top:7px;line-height:1.45;letter-spacing:0.01em;">
                        Smart bookings. Premium travel experiences made affordable.
                    </div>
                </div>

                <!-- 4 icon tiles: top 198px -->
                <div style="position:absolute;left:28px;top:198px;width:534px;
                            display:flex;justify-content:space-between;align-items:flex-start;z-index:5;">

                    <div style="width:116px;display:flex;flex-direction:column;align-items:center;text-align:center;">
                        <div style="width:42px;height:42px;border-radius:12px;background-color:#fff7ed;
                                    border:1.5px solid #fed7aa;display:flex;align-items:center;justify-content:center;
                                    margin-bottom:5px;flex-shrink:0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none"
                                 stroke="#E65F2B" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M19 17h2a1 1 0 001-1v-3a1 1 0 00-1-1h-2.28a2 2 0 01-1.68-.9l-.96-1.44A2 2 0 0014.4 9H9.6a2 2 0 00-1.68.9l-.96 1.44a2 2 0 01-1.68.9H3a1 1 0 00-1 1v3a1 1 0 001 1h2"/>
                                <path d="M5 18h14" stroke-linecap="round"/>
                            </svg>
                        </div>
                        <div style="font-family:${F};font-size:8px;font-weight:800;color:#334155;line-height:1.2;max-width:90px;">CAB BOOKING</div>
                        <div style="font-family:${F};font-size:7px;color:#94a3b8;font-weight:500;line-height:1.3;margin-top:2px;">Local &bull; Outstation</div>
                    </div>

                    <div style="width:116px;display:flex;flex-direction:column;align-items:center;text-align:center;">
                        <div style="width:42px;height:42px;border-radius:12px;background-color:#f0fdf4;
                                    border:1.5px solid #bbf7d0;display:flex;align-items:center;justify-content:center;
                                    margin-bottom:5px;flex-shrink:0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none"
                                 stroke="#008060" stroke-width="2" viewBox="0 0 24 24">
                                <rect x="5" y="3" width="14" height="15" rx="3"/>
                                <rect x="7" y="5" width="10" height="5" rx="1"/>
                                <circle cx="9" cy="14" r="1.5" fill="#008060"/>
                                <circle cx="15" cy="14" r="1.5" fill="#008060"/>
                            </svg>
                        </div>
                        <div style="font-family:${F};font-size:8px;font-weight:800;color:#334155;line-height:1.2;max-width:90px;">TRAIN BOOKING</div>
                        <div style="font-family:${F};font-size:7px;color:#94a3b8;font-weight:500;line-height:1.3;margin-top:2px;">All Classes &bull; Tatkal</div>
                    </div>

                    <div style="width:116px;display:flex;flex-direction:column;align-items:center;text-align:center;">
                        <div style="width:42px;height:42px;border-radius:12px;background-color:#eff6ff;
                                    border:1.5px solid #bfdbfe;display:flex;align-items:center;justify-content:center;
                                    margin-bottom:5px;flex-shrink:0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none"
                                 stroke="#2563eb" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M12 19l9 2-9-16-9 16 9-2zm0 0v-8"/>
                            </svg>
                        </div>
                        <div style="font-family:${F};font-size:8px;font-weight:800;color:#334155;line-height:1.2;max-width:90px;">FLIGHT BOOKING</div>
                        <div style="font-family:${F};font-size:7px;color:#94a3b8;font-weight:500;line-height:1.3;margin-top:2px;">Domestic &bull; Intl</div>
                    </div>

                    <div style="width:116px;display:flex;flex-direction:column;align-items:center;text-align:center;">
                        <div style="width:42px;height:42px;border-radius:12px;background-color:#faf5ff;
                                    border:1.5px solid #ddd6fe;display:flex;align-items:center;justify-content:center;
                                    margin-bottom:5px;flex-shrink:0;">
                            <svg xmlns="http://www.w3.org/2000/svg" width="19" height="19" fill="none"
                                 stroke="#7c3aed" stroke-width="2" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round"
                                    d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                            </svg>
                        </div>
                        <div style="font-family:${F};font-size:8px;font-weight:800;color:#334155;line-height:1.2;max-width:90px;">TOUR PACKAGES</div>
                        <div style="font-family:${F};font-size:7px;color:#94a3b8;font-weight:500;line-height:1.3;margin-top:2px;">Honeymoon &bull; Family</div>
                    </div>
                </div>

                <!-- Feature bar: top 266px, 4 cols, green tint -->
                <div style="position:absolute;left:28px;top:266px;width:534px;height:44px;
                            background-color:rgba(2,68,48,0.055);border:1.5px solid rgba(2,68,48,0.14);
                            border-radius:12px;box-sizing:border-box;
                            display:flex;align-items:center;justify-content:space-between;
                            padding-left:14px;padding-right:14px;z-index:5;">

                    <div style="display:flex;align-items:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none"
                             stroke="#008060" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0;margin-right:6px;">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <div>
                            <div style="font-family:${F};font-size:8px;font-weight:800;color:#24433a;white-space:nowrap;line-height:1.3;">TRUSTED &amp; SAFE</div>
                            <div style="font-family:${F};font-size:7px;font-weight:600;color:#7a9a8f;white-space:nowrap;line-height:1.2;">Verified</div>
                        </div>
                    </div>
                    <div style="width:1px;height:22px;background-color:rgba(2,68,48,0.18);flex-shrink:0;"></div>
                    <div style="display:flex;align-items:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none"
                             stroke="#E65F2B" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0;margin-right:6px;">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8V6m0 12v-2"/>
                        </svg>
                        <div>
                            <div style="font-family:${F};font-size:8px;font-weight:800;color:#24433a;white-space:nowrap;line-height:1.3;">BEST PRICES</div>
                            <div style="font-family:${F};font-size:7px;font-weight:600;color:#7a9a8f;white-space:nowrap;line-height:1.2;">Guaranteed</div>
                        </div>
                    </div>
                    <div style="width:1px;height:22px;background-color:rgba(2,68,48,0.18);flex-shrink:0;"></div>
                    <div style="display:flex;align-items:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none"
                             stroke="#008060" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0;margin-right:6px;">
                            <path stroke-linecap="round" stroke-linejoin="round"
                                d="M18 18h2a2 2 0 002-2v-3a2 2 0 00-2-2h-2m-12 7h-2a2 2 0 01-2-2v-3a2 2 0 012-2h2m12 5V9a6 6 0 00-12 0v8"/>
                        </svg>
                        <div>
                            <div style="font-family:${F};font-size:8px;font-weight:800;color:#24433a;white-space:nowrap;line-height:1.3;">24/7 SUPPORT</div>
                            <div style="font-family:${F};font-size:7px;font-weight:600;color:#7a9a8f;white-space:nowrap;line-height:1.2;">Always Here</div>
                        </div>
                    </div>
                    <div style="width:1px;height:22px;background-color:rgba(2,68,48,0.18);flex-shrink:0;"></div>
                    <div style="display:flex;align-items:center;">
                        <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none"
                             stroke="#E65F2B" stroke-width="2.5" viewBox="0 0 24 24" style="flex-shrink:0;margin-right:6px;">
                            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z"/>
                        </svg>
                        <div>
                            <div style="font-family:${F};font-size:8px;font-weight:800;color:#24433a;white-space:nowrap;line-height:1.3;">EASY BOOKING</div>
                            <div style="font-family:${F};font-size:7px;font-weight:600;color:#7a9a8f;white-space:nowrap;line-height:1.2;">Quick &amp; Free</div>
                        </div>
                    </div>
                </div>

                ${tncHtml}
            </div>`;

        return `
            <div style="width:880px;height:375px;display:flex;border-radius:28px;overflow:hidden;
                        background-color:#ffffff;border:1.5px solid #d1d9e0;
                        font-family:${F};position:relative;box-sizing:border-box;">
                <div style="position:absolute;top:-14px;left:583px;width:28px;height:28px;
                            border-radius:50%;background-color:#d8dde4;z-index:30;box-sizing:border-box;"></div>
                <div style="position:absolute;bottom:-14px;left:583px;width:28px;height:28px;
                            border-radius:50%;background-color:#d8dde4;z-index:30;box-sizing:border-box;"></div>
                ${leftSection}
                ${rightSection}
            </div>`;
    }
}

// ─── PNG DOWNLOAD ─────────────────────────────────────────────────────────────
export async function downloadCouponAsImage(
    coupon: Coupon,
    elementRef: HTMLElement | null
): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    ensureFontsInjected();

    let target = elementRef;
    let offscreen = false;

    if (!target) {
        target = document.createElement('div');
        target.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:880px;height:375px;overflow:hidden;';
        target.innerHTML = getCouponHtml(coupon);
        document.body.appendChild(target);
        offscreen = true;

        await Promise.all(Array.from(target.querySelectorAll('img')).map(img =>
            img.complete ? Promise.resolve() : new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); })
        ));
        try { await document.fonts.ready; } catch (_) { /* skip */ }
        await new Promise(r => setTimeout(r, 500));
    }

    try {
        const canvas = await html2canvas(target, {
            backgroundColor: '#ffffff',
            scale: 3,
            useCORS: true,
            allowTaint: true,
            logging: false,
            imageTimeout: 8000,
        });
        const link = document.createElement('a');
        link.download = `SHRAWELLO_COUPON_${coupon.code || 'PREVIEW'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
        await trackDownload(coupon.id, coupon.downloadCount || 0);
    } catch (err) {
        console.error('[downloadCouponAsImage]', err);
        throw err;
    } finally {
        if (offscreen && target?.parentNode) target.parentNode.removeChild(target);
    }
}

// ─── PDF DOWNLOAD ─────────────────────────────────────────────────────────────
export async function downloadCouponAsPDF(coupon: Coupon): Promise<void> {
    const html2canvas = (await import('html2canvas')).default;
    ensureFontsInjected();

    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [210, 89.5] });
    const W = doc.internal.pageSize.getWidth();
    const H = doc.internal.pageSize.getHeight();

    const container = document.createElement('div');
    container.style.cssText = 'position:absolute;left:-9999px;top:-9999px;width:880px;height:375px;overflow:hidden;';
    container.innerHTML = getCouponHtml(coupon);
    document.body.appendChild(container);

    await Promise.all(Array.from(container.querySelectorAll('img')).map(img =>
        img.complete ? Promise.resolve() : new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r(); })
    ));
    try { await document.fonts.ready; } catch (_) { /* skip */ }
    await new Promise(r => setTimeout(r, 500));

    try {
        const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 3.5,
            useCORS: true,
            allowTaint: true,
            logging: false,
            imageTimeout: 8000,
        });
        doc.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, W, H);
        const tag = coupon.type === 'ToursOnly' ? 'TOURS' : 'ALLPASS';
        doc.save(`SHRAWELLO_${tag}_${coupon.code || 'COUPON'}.pdf`);
        await trackDownload(coupon.id, coupon.downloadCount || 0);
    } catch (err) {
        console.error('[downloadCouponAsPDF]', err);
        throw err;
    } finally {
        if (container?.parentNode) container.parentNode.removeChild(container);
    }
}
