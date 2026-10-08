import { Booking, TourChecklistItem, TourChecklistCategory, Package, MasterLocation } from '../types';

export type ChecklistTemplateId =
    | 'domestic_tour'
    | 'international_tour'
    | 'hotel_only'
    | 'cab_rental'
    | 'flight_only'
    | 'bus_transit'
    | 'train_transit'
    | 'activities_only'
    | 'visa_only'
    | 'hotel_flight'
    | 'hotel_transport'
    | 'custom_tour';

export interface ChecklistTemplateItem {
    taskNumber: number;
    title: string;
    category: TourChecklistCategory;
    notes: string;
    whatsappMessageTemplate: string;
}

export interface ChecklistTemplate {
    id: ChecklistTemplateId;
    name: string;
    badgeLabel: string;
    icon: string;
    badgeColor: string;
    description: string;
    items: ChecklistTemplateItem[];
}

// ─── 1. Domestic Tour Package (10-Point Checklist) ───────────────────────────
const DOMESTIC_TOUR_TEMPLATE: ChecklistTemplate = {
    id: 'domestic_tour',
    name: 'Domestic Tour Package',
    badgeLabel: 'Domestic Tour',
    icon: '🇮🇳',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    description: 'Tailored for Indian domestic holiday tours (e.g. Pune, Kashmir, Goa, Kerala, Himachal, Andaman, Rajasthan).',
    items: [
        {
            taskNumber: 1,
            title: 'Guest ID Proof & Passenger Manifest',
            category: 'Briefing',
            notes: 'Collect valid Government photo ID copies (Aadhar/Voter ID/Passport), verify all passenger full names, age, and dietary preferences.',
            whatsappMessageTemplate: 'Namaste {clientName}! Greetings from Shravya Tours.\n\nRegarding your booking {bRef} ({tourTitle}):\nPlease share clear copies of Government photo IDs (Aadhar Card / Voter ID / Passport) for all traveling guests to finalize hotel check-in and transit permits.'
        },
        {
            taskNumber: 2,
            title: 'Flight / Train / Transit Ticket Booking',
            category: 'Tickets',
            notes: 'Confirm transit tickets, coach/seat allocations, baggage allowance and verify live PNR status.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nTransit tickets update for {tourTitle} ({bRef}):\n*Flight / Train Booking* is currently {status}. Our reservations desk is verifying PNR confirmation and seat allocations.'
        },
        {
            taskNumber: 3,
            title: 'Hotel Confirmation & Room Vouchers',
            category: 'Hotel',
            notes: 'Reconfirm reservations directly with hotel properties, verify room types, meal plans (EP/CP/MAP/AP) & obtain hotel voucher codes.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nGood news! Your hotel accommodations for {tourTitle} ({bRef}) are confirmed. All property vouchers and meal plans are being prepared by our reservations desk.'
        },
        {
            taskNumber: 4,
            title: 'Cab / Vehicle & Chauffeur Allocation',
            category: 'Transport',
            notes: 'Confirm vehicle type (Innova Crysta / Tempo Traveller / Sedan), assign verified driver name, mobile number & vehicle registration number.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nRegarding your local transport for {tourTitle} ({bRef}):\nYour assigned chauffeur and vehicle registration details will be shared prior to departure. Pickup time and coordinator numbers are active.'
        },
        {
            taskNumber: 5,
            title: 'Inner Line Permits, Ferry Passes & Entry Permits',
            category: 'Activities',
            notes: 'Pre-procure required state/forest permits, ferry passes (e.g. Havelock/Neil/Rohtang/Ladakh), and monument entry tickets.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nWe are processing the required destination permits and entry passes for {tourTitle} ({bRef}) so your travel is completely hassle-free without long queues.'
        },
        {
            taskNumber: 6,
            title: 'Activity & Sightseeing Slots Pre-booking',
            category: 'Activities',
            notes: 'Pre-book slot permits, guided tours, safari slots, water sports, ropeway tickets, and special itinerary experiences.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour guided sightseeing and activity slots for {tourTitle} ({bRef}) are being reserved. Get ready for an unforgettable tour experience!'
        },
        {
            taskNumber: 7,
            title: 'Weather Advisory & Packing Guidelines Briefing',
            category: 'Briefing',
            notes: 'Dispatch destination weather forecast, recommended clothing checklist (e.g. warm clothes for hill stations, rainwear, temple dress code) to guest.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nAs your travel date approaches for {tourTitle} ({bRef}), we have prepared a quick weather advisory and packing checklist for your destination. Feel free to message here if you need any recommendations!'
        },
        {
            taskNumber: 8,
            title: 'Service Vouchers Handover to Guest',
            category: 'Vouchers',
            notes: 'Compile & dispatch hotel vouchers, driver details, and day-by-day tour itinerary docket to guest.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour complete service vouchers and detailed tour docket for {tourTitle} ({bRef}) are ready. Please review the attached docket for all property check-in and transit details.'
        },
        {
            taskNumber: 9,
            title: 'Travel Tickets Handover to Guest',
            category: 'Tickets',
            notes: 'Deliver confirmed flight/train tickets with baggage guidelines, web check-in advisories, and station/airport arrival instructions.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour confirmed transit tickets and check-in details for {tourTitle} ({bRef}) have been issued. Please keep digital copies handy during travel.'
        },
        {
            taskNumber: 10,
            title: '24/7 Helpline Briefing & Final Payment Check',
            category: 'Briefing',
            notes: 'Ensure 100% final balance is collected, share dedicated 24/7 on-ground emergency coordinator hotline and final briefing note.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nWe are excited to welcome you on tour {tourTitle} ({bRef})!\nYour 24/7 Shravya Tours on-ground helpline is active. Please let us know if you need any assistance before departure. Have a wonderful trip!'
        }
    ]
};

// ─── 2. International Tour Package (10-Point Checklist) ──────────────────────
const INTERNATIONAL_TOUR_TEMPLATE: ChecklistTemplate = {
    id: 'international_tour',
    name: 'International Tour Package',
    badgeLabel: 'International Tour',
    icon: '🌍',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    description: 'Tailored for overseas international holiday packages (e.g. Dubai, Bali, Singapore, Thailand, Maldives, Europe).',
    items: [
        {
            taskNumber: 1,
            title: 'Passport & Visa Document Collection',
            category: 'Visa',
            notes: 'Collect passport copies (minimum 6 months validity from return date), passport photos, employment letters & financial proofs.',
            whatsappMessageTemplate: 'Namaste {clientName}! Greetings from Shravya Tours.\n\nRegarding your international booking {bRef} ({tourTitle}):\nPlease share clear copies of your passport (minimum 6 months validity from return date) and visa documentation at your earliest convenience.'
        },
        {
            taskNumber: 2,
            title: 'Visa Processing & Embassy / VFS Submission',
            category: 'Visa',
            notes: 'Submit visa paperwork to embassy/VFS/consulate portal and obtain submission tracking code.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nUpdate on your international visa application for {tourTitle} ({bRef}):\n*Visa Submission* is currently {status}. We are tracking your application directly with the visa processing centre.'
        },
        {
            taskNumber: 3,
            title: 'Visa Approval & Validity Verification',
            category: 'Visa',
            notes: 'Verify stamped/eVisa validity dates against itinerary travel dates, check single/multiple entry status, and verify traveler names.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nGreat news! Your visa for {tourTitle} ({bRef}) is being verified against travel dates and passport details. We will share your approved eVisa/copy shortly.'
        },
        {
            taskNumber: 4,
            title: 'International Flight Booking & PNR Confirmation',
            category: 'Tickets',
            notes: 'Confirm international flights, transit layovers, seat assignments, terminal details, and baggage allowance (check-in & cabin).',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour international flight transit details for {tourTitle} ({bRef}) are confirmed. PNR status, baggage allowance, and terminal details are recorded.'
        },
        {
            taskNumber: 5,
            title: 'Overseas Hotel Confirmation & Property Vouchers',
            category: 'Hotel',
            notes: 'Reconfirm overseas hotel bookings, room categories, breakfast inclusion, and verify local tourism taxes (e.g. Tourism Dirham, City Tax).',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour overseas hotel reservations for {tourTitle} ({bRef}) are reconfirmed. All room allocations and vouchers are ready for check-in.'
        },
        {
            taskNumber: 6,
            title: 'International DMC & Ground Transport Allocation',
            category: 'Transport',
            notes: 'Confirm destination management company (DMC), assign airport pickup representative, private cab/coach, and driver details.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nRegarding your overseas airport pickup & local transport for {tourTitle} ({bRef}):\nOur local partner DMC has allocated your vehicle and representative for seamless airport welcome.'
        },
        {
            taskNumber: 7,
            title: 'Theme Park & Sightseeing Slots Pre-booking',
            category: 'Activities',
            notes: 'Pre-purchase time-stamped entry vouchers for major attractions (e.g. Burj Khalifa, Universal Studios, Desert Safari, Island tours).',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour attraction passes and activity slots for {tourTitle} ({bRef}) are booked. Entry QR codes and tickets are added to your travel docket.'
        },
        {
            taskNumber: 8,
            title: 'Overseas Travel Insurance & Forex / SIM Advisory',
            category: 'Briefing',
            notes: 'Issue comprehensive international travel medical insurance policy; advise guest on currency exchange, international roaming, or local eSIM.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour overseas travel medical insurance for {tourTitle} ({bRef}) is being finalized. We have also attached key forex and international SIM advisories for your destination.'
        },
        {
            taskNumber: 9,
            title: 'Complete Travel Docket Handover to Guest',
            category: 'Vouchers',
            notes: 'Compile & dispatch complete travel docket: e-visas, air tickets, hotel vouchers, insurance policy, and immigration arrival cards.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour complete international travel docket for {tourTitle} ({bRef}) has been compiled. Please review the attached vouchers, visas, and flight tickets.'
        },
        {
            taskNumber: 10,
            title: '24/7 International Emergency Briefing & Payment Check',
            category: 'Briefing',
            notes: 'Ensure 100% tour balance is collected, share Indian Embassy emergency contact, 24/7 overseas DMC helpline, and final departure briefing.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nWe are delighted to assist your international holiday {tourTitle} ({bRef})! Your 24/7 emergency coordinator hotline and overseas partner contacts are active. Have a safe and remarkable voyage!'
        }
    ]
};

// ─── 3. Hotel Stay Only (10-Point Checklist) ─────────────────────────────────
const HOTEL_ONLY_TEMPLATE: ChecklistTemplate = {
    id: 'hotel_only',
    name: 'Hotel Stay Only',
    badgeLabel: 'Hotel Stay',
    icon: '🏨',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800',
    description: 'Tailored for standalone hotel reservations, resorts, homestays, and weekend staycations.',
    items: [
        {
            taskNumber: 1,
            title: 'Guest ID Proof & Room Occupancy Verification',
            category: 'Hotel',
            notes: 'Collect valid Govt ID proofs for all adult guests; verify adult and child count matches booked room configuration.',
            whatsappMessageTemplate: 'Namaste {clientName}! Regarding your hotel booking {bRef} ({tourTitle}): Please share photo ID proofs of traveling guests to ensure seamless arrival check-in at the property.'
        },
        {
            taskNumber: 2,
            title: 'Special Preferences & Bedding Arrangement',
            category: 'Hotel',
            notes: 'Confirm bed type (King / Twin bed), smoking / non-smoking preference, floor preference, and accessibility requirements.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nWe are coordinating with the hotel reservations desk for {tourTitle} ({bRef}) regarding your preferred room configuration and bedding requests.'
        },
        {
            taskNumber: 3,
            title: 'Direct Property Confirmation & PMS Voucher Code',
            category: 'Hotel',
            notes: 'Reconfirm reservation directly with hotel front desk / reservations manager and obtain hotel Property Management System (PMS) confirmation number.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour room reservation at {tourTitle} ({bRef}) is confirmed in the hotel central system. Your booking reference is verified with the property.'
        },
        {
            taskNumber: 4,
            title: 'Meal Plan & Dining Inclusions Verification',
            category: 'Hotel',
            notes: 'Verify booked meal plan (EP: Room Only, CP: Continental Breakfast, MAP: Breakfast+Dinner, AP: All Meals) directly with hotel F&B desk.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour dining meal plan inclusions for {tourTitle} ({bRef}) are confirmed with the hotel kitchen and front office.'
        },
        {
            taskNumber: 5,
            title: 'Early Check-in / Late Check-out Coordination',
            category: 'Hotel',
            notes: 'Confirm guest arrival timing with hotel; request complimentary early check-in or late check-out if arrival schedule requires it.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nPlease share your expected arrival time at the property for {tourTitle} ({bRef}) so we can coordinate smooth room allocation with front desk.'
        },
        {
            taskNumber: 6,
            title: 'Hotel Location Map & Transport Directions Handover',
            category: 'Transport',
            notes: 'Share accurate Google Maps navigation location, landmark notes, nearby transit stations, and airport transfer options with guest.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nHere is the Google Maps location pin and directions for your hotel stay ({tourTitle}): We recommend saving this for your driver upon arrival.'
        },
        {
            taskNumber: 7,
            title: 'Official Hotel Confirmation Voucher Dispatch',
            category: 'Vouchers',
            notes: 'Generate and send official branded hotel confirmation voucher with reservation number, hotel contact person, and check-in timing.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour official Hotel Confirmation Voucher for {tourTitle} ({bRef}) is ready. Please find the attached PDF voucher to show at the reception desk.'
        },
        {
            taskNumber: 8,
            title: 'Hotel Amenities & House Rules Briefing',
            category: 'Briefing',
            notes: 'Brief guest regarding swimming pool timing, gym/spa access, buffet hours, pet rules, and security deposit policy upon check-in.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nKey stay information for {tourTitle} ({bRef}): Check-in is typically 2:00 PM and check-out 11:00 AM. Breakfast buffet is served from 7:30 to 10:30 AM.'
        },
        {
            taskNumber: 9,
            title: 'Hotel Duty Manager & Front Desk Contact Handover',
            category: 'Briefing',
            notes: 'Provide guest with direct hotel reception desk phone number and duty manager contact for smooth arrival check-in.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nHere is the direct Front Office / Duty Manager contact number for your hotel reservation ({tourTitle}). Feel free to connect directly on arrival.'
        },
        {
            taskNumber: 10,
            title: 'Final Payment Settlement & Zero Balance Check',
            category: 'Briefing',
            notes: 'Ensure complete room charges and taxes are settled, verify zero balance with property, and dispatch invoice/receipt to customer.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour hotel stay {tourTitle} ({bRef}) is fully processed and confirmed. Wishing you a relaxing and pleasant stay! Please reach out if you need anything.'
        }
    ]
};

// ─── 4. Car / Cab Rental Only (10-Point Checklist) ───────────────────────────
const CAB_RENTAL_TEMPLATE: ChecklistTemplate = {
    id: 'cab_rental',
    name: 'Car / Cab Rental',
    badgeLabel: 'Car Rental',
    icon: '🚗',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    description: 'Tailored for airport taxi transfers, local city rentals, outstation cabs, and corporate fleet bookings.',
    items: [
        {
            taskNumber: 1,
            title: 'Route, Doorstep Pickup & Reporting Time Reconfirmation',
            category: 'Transport',
            notes: 'Verify exact pickup address, landmark, flight/train arrival details, and reconfirm reporting time with customer.',
            whatsappMessageTemplate: 'Namaste {clientName}! Regarding your cab rental {bRef} ({tourTitle}): Please reconfirm your exact pickup location address and required departure time.'
        },
        {
            taskNumber: 2,
            title: 'Vehicle Category & Passenger/Luggage Capacity Match',
            category: 'Transport',
            notes: 'Confirm vehicle model (Sedan / Ertiga / Innova Crysta / Tempo Traveller) matches passenger headcount and luggage volume.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour requested vehicle category for {tourTitle} ({bRef}) has been locked in with our fleet operations team.'
        },
        {
            taskNumber: 3,
            title: 'Commercial Vehicle Compliance & Fitness Verification',
            category: 'Transport',
            notes: 'Inspect yellow-board commercial registration, valid motor insurance, state road tax permits, and vehicle fitness certificate.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour assigned vehicle for {tourTitle} ({bRef}) has passed our safety and commercial compliance inspection.'
        },
        {
            taskNumber: 4,
            title: 'Chauffeur Allocation & Driving License Verification',
            category: 'Transport',
            notes: 'Assign experienced, courteous driver; verify commercial driving license, active mobile number, and local route familiarity.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nAn experienced chauffeur has been designated for your trip {tourTitle} ({bRef}). Route briefing and timing have been communicated.'
        },
        {
            taskNumber: 5,
            title: 'Vehicle Cleanliness, AC & Mechanical Inspection',
            category: 'Transport',
            notes: 'Ensure vehicle is thoroughly washed/sanitized, air conditioning operates smoothly, stepney/jack available, and GPS tracking active.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nVehicle sanitization and air conditioning checks for {tourTitle} ({bRef}) are complete to ensure maximum comfort.'
        },
        {
            taskNumber: 6,
            title: 'Toll, Parking & Interstate Permit Policy Briefing',
            category: 'Briefing',
            notes: 'Clarify toll plaza charges, state border tax, parking charges, and night driver allowance policy clearly to customer.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nTrip tariff advisory for {tourTitle} ({bRef}): Base tariff, driver allowance, and toll/parking guidelines have been updated for your booking.'
        },
        {
            taskNumber: 7,
            title: 'Chauffeur & Vehicle Details Handover to Customer',
            category: 'Vouchers',
            notes: 'Dispatch driver name, phone number, vehicle model, and registration number to customer 12-24 hours prior to scheduled departure.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nHere are your chauffeur details for {tourTitle} ({bRef}): Driver details and vehicle registration number are active for your trip.'
        },
        {
            taskNumber: 8,
            title: 'Driver Route Briefing & Special Instructions',
            category: 'Transport',
            notes: 'Brief driver regarding guest pickup point, preferred travel route, ghat section safety precautions, and client special requests.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nOur fleet controller has briefed your driver on the optimal route and timings for {tourTitle} ({bRef}).'
        },
        {
            taskNumber: 9,
            title: '24/7 Fleet Coordinator & Breakdown Support Helpline',
            category: 'Briefing',
            notes: 'Provide customer with 24/7 dedicated fleet operations manager contact number for en-route assistance or emergency vehicle backup.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nFor any real-time assistance during your ride {tourTitle} ({bRef}), our 24/7 Shravya Fleet Helpdesk is standing by to assist you.'
        },
        {
            taskNumber: 10,
            title: 'Trip Advance Settlement & Final Billing Verification',
            category: 'Briefing',
            notes: 'Verify trip advance payment is recorded, explain balance collection protocol at trip conclusion, and issue booking confirmation receipt.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour cab booking {tourTitle} ({bRef}) is confirmed. Thank you for choosing Shravya Tours! Wishing you a smooth and safe drive.'
        }
    ]
};

// ─── 5. Flight Ticket Booking Only (10-Point Checklist) ──────────────────────
const FLIGHT_ONLY_TEMPLATE: ChecklistTemplate = {
    id: 'flight_only',
    name: 'Flight Ticket Booking',
    badgeLabel: 'Flight Booking',
    icon: '✈️',
    badgeColor: 'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800',
    description: 'Tailored for domestic and international airline ticket bookings, group flights, and airfare reservations.',
    items: [
        {
            taskNumber: 1,
            title: 'Passenger Name Verification as per Govt Photo ID',
            category: 'Tickets',
            notes: 'Verify passenger full names, date of birth, and title exactly match Government photo ID (Aadhar / Passport) to prevent airline check-in denial.',
            whatsappMessageTemplate: 'Namaste {clientName}! Regarding flight booking {bRef} ({tourTitle}): Please verify that traveler names match your Government ID / Passport exactly.'
        },
        {
            taskNumber: 2,
            title: 'Flight Ticket Issuance & Airline PNR Confirmation',
            category: 'Tickets',
            notes: 'Issue flight tickets, verify confirmed booking status on airline portal, and check departure/arrival flight numbers and times.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour airline ticket for {tourTitle} ({bRef}) is confirmed. Airline PNR and flight numbers are verified.'
        },
        {
            taskNumber: 3,
            title: 'Baggage Allowance & Fare Rules Verification',
            category: 'Tickets',
            notes: 'Verify cabin baggage and check-in baggage allowances (15 kg domestic / 20-30 kg intl); check fare cancellation and date change penalty rules.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nBaggage allowance update for {tourTitle} ({bRef}): Standard check-in allowance is confirmed as per airline policy.'
        },
        {
            taskNumber: 4,
            title: 'Seat Selection & Special Assistance Requests',
            category: 'Tickets',
            notes: 'Reserve preferred window / aisle seats, extra legroom seats, and submit requests for wheelchair or infant bassinet if required.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nPreferred seat allocations and special assistance preferences for {tourTitle} ({bRef}) are being processed.'
        },
        {
            taskNumber: 5,
            title: 'Meal Selection & Frequent Flyer / GST Details',
            category: 'Tickets',
            notes: 'Pre-book hot meals (Veg / Non-veg / Jain), add passenger Frequent Flyer / Loyalty numbers, and update corporate GST registration details.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nInflight meal selections and frequent flyer / corporate GST details for {tourTitle} ({bRef}) have been linked to your ticket.'
        },
        {
            taskNumber: 6,
            title: 'Mandatory Web Check-in & Boarding Pass Retrieval',
            category: 'Tickets',
            notes: 'Complete online web check-in 24-48 hours prior to departure, generate digital boarding passes, and download baggage tags.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nMandatory web check-in for flight {tourTitle} ({bRef}) is open. Our ticketing desk can assist you with boarding passes.'
        },
        {
            taskNumber: 7,
            title: 'E-Ticket & Boarding Pass Handover to Passenger',
            category: 'Vouchers',
            notes: 'Dispatch verified e-ticket PDF, digital boarding passes, and baggage drop guidelines to traveler via WhatsApp and email.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nHere are your confirmed flight tickets and e-tickets for {tourTitle} ({bRef}). Please keep soft copies handy on your phone.'
        },
        {
            taskNumber: 8,
            title: 'Terminal & Flight Status Real-Time Radar Monitoring',
            category: 'Briefing',
            notes: 'Monitor flight departure terminal (T1/T2/T3), track real-time flight status, and notify passenger in case of gate changes or schedule delays.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nTerminal advisory for {tourTitle} ({bRef}): Departure terminal details and gate timings are tracked live by our flight desk.'
        },
        {
            taskNumber: 9,
            title: 'Airport Transit Advisory & Security Buffer Guidelines',
            category: 'Briefing',
            notes: 'Advise passenger to report at airport 2.5 hours prior for domestic flights (3.5 hours for international), and review prohibited cabin items.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nAirport arrival advisory for {tourTitle} ({bRef}): Please arrive at least 2.5 hours prior to scheduled departure. Have a pleasant flight!'
        },
        {
            taskNumber: 10,
            title: 'Final Airfare Settlement & Tax Invoice Dispatch',
            category: 'Briefing',
            notes: 'Ensure 100% airfare payment is settled, confirm zero outstanding balance, and deliver official GST invoice to traveler / corporate.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour flight booking {tourTitle} ({bRef}) is completed. Your invoice and receipts are saved. Thank you for booking with Shravya Tours!'
        }
    ]
};

// ─── 6. Bus Transit Booking (10-Point Checklist) ─────────────────────────────
const BUS_TRANSIT_TEMPLATE: ChecklistTemplate = {
    id: 'bus_transit',
    name: 'Bus Ticket Booking',
    badgeLabel: 'Bus Booking',
    icon: '🚌',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800',
    description: 'Tailored for intercity luxury bus tickets (AC Sleeper, Volvo, Scania, BharatBenz).',
    items: [
        {
            taskNumber: 1,
            title: 'Passenger Details & Seat Preference Verification',
            category: 'Tickets',
            notes: 'Verify passenger names, gender, age, and seat allocations (Sleeper / Semi-sleeper / Lower / Upper berth).',
            whatsappMessageTemplate: 'Namaste {clientName}! Regarding your bus booking {bRef} ({tourTitle}): Please verify traveler names, age, and berth allocations.'
        },
        {
            taskNumber: 2,
            title: 'Ticket Confirmation & Bus Operator PNR Check',
            category: 'Tickets',
            notes: 'Confirm ticket issuance on bus operator portal, verify PNR code, and reconfirm bus service number.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour bus ticket for {tourTitle} ({bRef}) is confirmed with the operator. PNR and coach service numbers are verified.'
        },
        {
            taskNumber: 3,
            title: 'Boarding Point & Exact Reporting Time Confirmation',
            category: 'Transport',
            notes: 'Verify exact boarding point landmark, reporting time (arrive 20-30 min prior), and provide boarding point Google Maps location.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nBoarding details for {tourTitle} ({bRef}): Please report at the boarding point 20-30 minutes before departure time.'
        },
        {
            taskNumber: 4,
            title: 'Bus Operator Live GPS Tracking Link Obtainment',
            category: 'Transport',
            notes: 'Obtain operator bus live GPS tracking link and confirm bus crew mobile number availability.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nLive bus tracking link for {tourTitle} ({bRef}): You can monitor the real-time vehicle movement as departure approaches.'
        },
        {
            taskNumber: 5,
            title: 'Luggage Allowance & Travel Guidelines Advisory',
            category: 'Briefing',
            notes: 'Brief passenger on bus luggage restrictions (typically 15-20 kg per passenger), prohibited cargo, and onboard amenities.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nLuggage advisory for {tourTitle} ({bRef}): Keep small valuables and medicine in your cabin handbag for easy reach.'
        },
        {
            taskNumber: 6,
            title: 'Confirmed E-Ticket PDF Dispatch to Passenger',
            category: 'Vouchers',
            notes: 'Send confirmed m-ticket / PDF ticket with QR code, boarding point landmark, and bus operator contact details to passenger.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nHere is your confirmed bus e-ticket for {tourTitle} ({bRef}). Show this m-ticket to the bus conductor at boarding.'
        },
        {
            taskNumber: 7,
            title: 'Dropping Point & Estimated Arrival Briefing',
            category: 'Transport',
            notes: 'Brief passenger on estimated arrival time, scheduled rest stops, dropping point landmark, and local transit options upon arrival.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nDropping point details for {tourTitle} ({bRef}): Estimated arrival time and drop landmark are noted on your voucher.'
        },
        {
            taskNumber: 8,
            title: 'Conductor / Bus Operator Helpline Handover',
            category: 'Briefing',
            notes: 'Share bus driver/conductor mobile number and operator 24/7 central customer care helpline with passenger.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nHere is the bus crew and operator contact number for {tourTitle} ({bRef}) for quick coordination on departure day.'
        },
        {
            taskNumber: 9,
            title: '24/7 Agency Support Helpline Handover',
            category: 'Briefing',
            notes: 'Provide 24/7 Shravya Tours transit assistance contact in case of boarding delays, missed bus, or route changes.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nOur 24/7 Shravya Tours helpdesk is active if you need any assistance before or during your bus journey ({tourTitle}).'
        },
        {
            taskNumber: 10,
            title: 'Fare Payment Settlement & Receipt Clearance',
            category: 'Briefing',
            notes: 'Ensure full ticket fare is collected, verify payment status, and issue payment receipt to passenger.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour bus booking {tourTitle} ({bRef}) is fully confirmed. Have a safe, comfortable, and restful journey!'
        }
    ]
};

// ─── 7. Train Transit Booking (10-Point Checklist) ───────────────────────────
const TRAIN_TRANSIT_TEMPLATE: ChecklistTemplate = {
    id: 'train_transit',
    name: 'Train Ticket Booking',
    badgeLabel: 'Train Booking',
    icon: '🚆',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
    description: 'Tailored for Indian Railways (IRCTC) passenger train bookings and tourist express journeys.',
    items: [
        {
            taskNumber: 1,
            title: 'Passenger List & Berth Preference Verification',
            category: 'Tickets',
            notes: 'Verify passenger names, age, senior citizen / child quotas, and berth preferences (Lower / Middle / Upper / Side Lower).',
            whatsappMessageTemplate: 'Namaste {clientName}! Regarding train booking {bRef} ({tourTitle}): Please verify traveler passenger names and age details as per Government ID.'
        },
        {
            taskNumber: 2,
            title: 'IRCTC PNR Confirmation & Current Status Verification',
            category: 'Tickets',
            notes: 'Check live PNR status on IRCTC (CNF / RAC / WL), coach allocation, and berth number verification.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour IRCTC PNR status for {tourTitle} ({bRef}) is being tracked. PNR and confirmed coach details are active.'
        },
        {
            taskNumber: 3,
            title: 'Departure Railway Junction & Platform Guidance',
            category: 'Transport',
            notes: 'Confirm originating railway station, scheduled departure time, and advise passenger to check live platform display upon arrival.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nDeparture station details for {tourTitle} ({bRef}): Train departure time is confirmed. Please verify your platform on station monitors.'
        },
        {
            taskNumber: 4,
            title: 'Live Train Running Status (NTES) Tracking Link',
            category: 'Transport',
            notes: 'Set up live train running status tracking link via National Train Enquiry System (NTES) to track delays or rescheduling.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nLive train running status for {tourTitle} ({bRef}): You can check real-time train running status via NTES/IRCTC.'
        },
        {
            taskNumber: 5,
            title: 'Station Reporting & Mandatory ID Proof Advisory',
            category: 'Briefing',
            notes: 'Advise passenger to report at station 30-45 minutes prior; remind passenger to carry original Government photo ID matching the ticket.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nTravel reminder for train {tourTitle} ({bRef}): Please carry original photo ID (Aadhar/Voter ID) matching passenger names.'
        },
        {
            taskNumber: 6,
            title: 'Confirmed E-Ticket Handover to Passenger',
            category: 'Vouchers',
            notes: 'Dispatch confirmed IRCTC electronic reservation slip (ERS / PDF) with QR code to traveler via WhatsApp and email.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nHere is your confirmed railway electronic ticket (ERS) for {tourTitle} ({bRef}). Digital copy is valid for travel.'
        },
        {
            taskNumber: 7,
            title: 'Catering & Bedroll Inclusions Verification',
            category: 'Tickets',
            notes: 'Verify onboard catering / meal booking (Veg / Non-veg), and confirm bedroll provision for AC coach reservations.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nOnboard catering and meal bookings for train {tourTitle} ({bRef}) have been noted with the coach pantry service.'
        },
        {
            taskNumber: 8,
            title: 'TTE / Station Assistance Helpline Handover',
            category: 'Briefing',
            notes: 'Share Railway Security Helpline (139 / RailMadad) and IRCTC customer care contacts with traveler for on-board support.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nRailway helpline for {tourTitle} ({bRef}): You can dial 139 for RailMadad, security, or medical assistance on-board.'
        },
        {
            taskNumber: 9,
            title: '24/7 Shravya Tours Emergency Transit Helpline',
            category: 'Briefing',
            notes: 'Share 24/7 agency support coordinator helpline in case of train cancellation, chart preparation status, or missed train assistance.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nOur 24/7 Shravya Tours transit desk is available if you need any assistance regarding your train journey ({tourTitle}).'
        },
        {
            taskNumber: 10,
            title: 'Rail Fare Settlement & Final Invoice Clearance',
            category: 'Briefing',
            notes: 'Ensure complete rail fare and agency service fee is collected and recorded with official transaction receipt.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour train ticket booking {tourTitle} ({bRef}) is complete. Have a pleasant and safe railway journey!'
        }
    ]
};

// ─── 8. Activities / Sightseeing Only (10-Point Checklist) ───────────────────
const ACTIVITIES_ONLY_TEMPLATE: ChecklistTemplate = {
    id: 'activities_only',
    name: 'Activities & Sightseeing',
    badgeLabel: 'Activities Only',
    icon: '🎟️',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800',
    description: 'Tailored for adventure activities, water sports, safaris, museum/monument entries, and day excursions.',
    items: [
        {
            taskNumber: 1,
            title: 'Participant Eligibility & Medical/Age Verification',
            category: 'Activities',
            notes: 'Check participant age limits, weight criteria, and medical fitness requirements (e.g. scuba diving, paragliding, high altitude trek).',
            whatsappMessageTemplate: 'Namaste {clientName}! Regarding your activity booking {bRef} ({tourTitle}): Please verify participant count and medical fitness declarations.'
        },
        {
            taskNumber: 2,
            title: 'Activity Slot Timing & Date Confirmation',
            category: 'Activities',
            notes: 'Confirm morning/evening slot timing with activity operator and lock in participant schedule.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour activity slot time for {tourTitle} ({bRef}) is locked with the vendor operator.'
        },
        {
            taskNumber: 3,
            title: 'Permit / Ticket Generation & Booking QR Code',
            category: 'Activities',
            notes: 'Procure official entry voucher, QR code, permit docket, and confirm barcode is scannable.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour official entry vouchers and QR passes for {tourTitle} ({bRef}) are generated and verified.'
        },
        {
            taskNumber: 4,
            title: 'Guide / Instructor Allocation & Contact Details',
            category: 'Activities',
            notes: 'Assign certified local guide, naturalist, scuba instructor, or safety pilot with verified credentials.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nA certified guide / instructor has been assigned for your experience on {tourTitle} ({bRef}).'
        },
        {
            taskNumber: 5,
            title: 'Safety Gear & Equipment Readiness Check',
            category: 'Activities',
            notes: 'Verify availability of life jackets, helmets, harnesses, oxygen tanks, or safety gear required for the activity.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nSafety protocol check for {tourTitle} ({bRef}): Operator safety gear and briefing standards have been verified.'
        },
        {
            taskNumber: 6,
            title: 'Dress Code, Footwear & Prohibited Items Advisory',
            category: 'Briefing',
            notes: 'Brief customer on appropriate clothing, footwear, camera permits, and list of prohibited belongings at the activity venue.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nDress code advisory for {tourTitle} ({bRef}): Please wear comfortable shoes and lightweight clothing suitable for the activity.'
        },
        {
            taskNumber: 7,
            title: 'Assembly Point & Google Maps Directions Handover',
            category: 'Transport',
            notes: 'Share exact reporting location, parking details, reporting time buffer, and Google Maps pin with participant.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nHere is the exact assembly point location for {tourTitle} ({bRef}): Please arrive 15 minutes prior to your slot.'
        },
        {
            taskNumber: 8,
            title: 'Activity Voucher Dispatch to Customer',
            category: 'Vouchers',
            notes: 'Deliver official entry passes, QR tickets, and voucher docket to guest via WhatsApp and email.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nAttached are your official entry passes and activity vouchers for {tourTitle} ({bRef}). Show these upon arrival.'
        },
        {
            taskNumber: 9,
            title: '24/7 On-Ground Local Coordinator Helpline Sharing',
            category: 'Briefing',
            notes: 'Provide 24/7 on-ground activity coordinator phone number in case of weather delays or reporting assistance.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nHere is the on-ground coordinator helpline for {tourTitle} ({bRef}) for quick coordination at the activity base.'
        },
        {
            taskNumber: 10,
            title: 'Final Payment Settlement & Receipt Clearance',
            category: 'Briefing',
            notes: 'Ensure activity fee is cleared, record final transaction, and issue booking receipt to customer.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour activity booking {tourTitle} ({bRef}) is confirmed. Have an exhilarating and memorable experience!'
        }
    ]
};

// ─── 9. Visa Assistance Only (10-Point Checklist) ────────────────────────────
const VISA_ONLY_TEMPLATE: ChecklistTemplate = {
    id: 'visa_only',
    name: 'Visa Processing Only',
    badgeLabel: 'Visa Processing',
    icon: '🛂',
    badgeColor: 'bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800',
    description: 'Tailored for standalone tourist/business visa processing, VFS appointments, and consular documentation.',
    items: [
        {
            taskNumber: 1,
            title: 'Country Visa Document Checklist Handover',
            category: 'Visa',
            notes: 'Dispatch detailed country-specific document checklist, photo specifications, and financial requirements to applicant.',
            whatsappMessageTemplate: 'Namaste {clientName}! Regarding your visa service {bRef} ({tourTitle}): Please review the country document checklist to prepare your dossier.'
        },
        {
            taskNumber: 2,
            title: 'Original Passport & Supporting Documents Collection',
            category: 'Visa',
            notes: 'Collect original passport (min 6 months validity, 2 blank pages), photos, bank statements, ITR, and employment verification.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nRegarding visa file {bRef} ({tourTitle}): Please courier or hand over original passports and verified financial proofs.'
        },
        {
            taskNumber: 3,
            title: 'Visa Application Form Drafting & Scrutiny',
            category: 'Visa',
            notes: 'Draft and scrutinize official embassy visa application form, ensuring 100% accuracy matching passport details.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour visa application form for {tourTitle} ({bRef}) is drafted and undergoing dual verification by our visa officer.'
        },
        {
            taskNumber: 4,
            title: 'Flight & Hotel Travel Proofs Documentation',
            category: 'Visa',
            notes: 'Generate confirmed flight itineraries, hotel reservations, and day-by-day travel schedule required by the embassy.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nTravel proof documentation (flight tickets & hotel dockets) for your visa file {tourTitle} ({bRef}) is compiled.'
        },
        {
            taskNumber: 5,
            title: 'Mandatory Travel Medical Insurance Issuance',
            category: 'Visa',
            notes: 'Issue embassy-compliant international travel medical insurance policy with required coverage (e.g. €30,000 for Schengen / $50,000).',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nEmbassy-compliant travel medical insurance for your visa application {tourTitle} ({bRef}) has been issued.'
        },
        {
            taskNumber: 6,
            title: 'Embassy / VFS / Consulate Biometrics Slot Booking',
            category: 'Visa',
            notes: 'Book biometric and document submission appointment at the nearest VFS / Embassy application center.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour VFS / Embassy biometrics appointment slot for {tourTitle} ({bRef}) has been successfully scheduled.'
        },
        {
            taskNumber: 7,
            title: 'Application Submission & Tracking Reference Obtainment',
            category: 'Visa',
            notes: 'Submit visa paperwork to embassy/VFS/consulate portal and obtain official submission tracking code.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour visa file for {tourTitle} ({bRef}) is submitted. Your official tracking reference number is active.'
        },
        {
            taskNumber: 8,
            title: 'Real-time Embassy Status Monitoring & Follow-up',
            category: 'Visa',
            notes: 'Track daily visa processing progress on embassy portal, respond promptly to any consular queries or interview calls.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nOur visa department is tracking your file status for {tourTitle} ({bRef}) directly on the consular portal.'
        },
        {
            taskNumber: 9,
            title: 'Passport Collection & Stamped Visa / eVisa Verification',
            category: 'Visa',
            notes: 'Collect passport from VFS/embassy, verify stamped visa/eVisa validity dates against itinerary travel dates, and verify traveler names.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nGreat news! Your visa for {tourTitle} ({bRef}) is approved. Dates and traveler details are verified.'
        },
        {
            taskNumber: 10,
            title: 'Safe Passport Handover to Applicant & Final Payment',
            category: 'Visa',
            notes: 'Safely deliver passport with approved visa to customer, verify final service fee clearance, and provide travel briefing.',
            whatsappMessageTemplate: 'Namaste {clientName}!\n\nYour passport with approved visa for {tourTitle} ({bRef}) is ready for delivery. Congratulations and thank you for choosing Shravya Tours!'
        }
    ]
};

// ─── Master Template Dictionary ──────────────────────────────────────────────
export const CHECKLIST_TEMPLATES: Record<ChecklistTemplateId, ChecklistTemplate> = {
    domestic_tour: DOMESTIC_TOUR_TEMPLATE,
    international_tour: INTERNATIONAL_TOUR_TEMPLATE,
    hotel_only: HOTEL_ONLY_TEMPLATE,
    cab_rental: CAB_RENTAL_TEMPLATE,
    flight_only: FLIGHT_ONLY_TEMPLATE,
    bus_transit: BUS_TRANSIT_TEMPLATE,
    train_transit: TRAIN_TRANSIT_TEMPLATE,
    activities_only: ACTIVITIES_ONLY_TEMPLATE,
    visa_only: VISA_ONLY_TEMPLATE,
    hotel_flight: {
        ...DOMESTIC_TOUR_TEMPLATE,
        id: 'hotel_flight',
        name: 'Hotel + Flight Combo',
        badgeLabel: 'Hotel + Flight',
        icon: '✈️🏨',
        badgeColor: 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/60 dark:text-teal-300 dark:border-teal-800',
        description: 'Tailored for combo bookings with hotel accommodation and flight transit.',
    },
    hotel_transport: {
        ...DOMESTIC_TOUR_TEMPLATE,
        id: 'hotel_transport',
        name: 'Hotel + Transport Combo',
        badgeLabel: 'Hotel + Transport',
        icon: '🏨🚗',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800',
        description: 'Tailored for combo bookings with hotel stay and dedicated cab/transport.',
    },
    custom_tour: {
        ...DOMESTIC_TOUR_TEMPLATE,
        id: 'custom_tour',
        name: 'Custom Tour Package',
        badgeLabel: 'Custom Tour',
        icon: '✨',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
        description: 'Tailored for bespoke and customized multi-service itineraries.',
    }
};

// ─── Destination Classifier (International vs Domestic) ──────────────────────
const INTERNATIONAL_KEYWORDS = [
    'dubai', 'uae', 'united arab emirates', 'abu dhabi', 'sharjah',
    'bali', 'indonesia', 'jakarta',
    'singapore',
    'thailand', 'bangkok', 'phuket', 'pattaya', 'krabi', 'koh samui',
    'maldives', 'male',
    'vietnam', 'hanoi', 'da nang', 'ho chi minh', 'phu quoc',
    'malaysia', 'kuala lumpur', 'langkawi', 'penang',
    'switzerland', 'zurich', 'geneva', 'europe', 'france', 'paris', 'italy', 'rome',
    'london', 'uk', 'united kingdom', 'scotland',
    'turkey', 'istanbul', 'cappadocia',
    'georgia', 'tbilisi',
    'azerbaijan', 'baku',
    'kazakhstan', 'almaty',
    'uzbekistan', 'tashkent',
    'mauritius',
    'sri lanka', 'colombo', 'kandy',
    'nepal', 'kathmandu', 'pokhara',
    'bhutan', 'paro', 'thimphu',
    'egypt', 'cairo',
    'japan', 'tokyo', 'kyoto',
    'australia', 'sydney', 'melbourne',
    'new zealand', 'auckland',
    'usa', 'united states', 'america', 'new york', 'california',
    'canada', 'toronto', 'vancouver',
    'oman', 'muscat', 'qatar', 'doha', 'saudi', 'riyadh', 'jeddah', 'umrah', 'hajj',
    'international', 'abroad', 'overseas'
];

/**
 * Checks whether a given string refers to an international destination.
 */
export const isInternationalText = (text?: string | null): boolean => {
    if (!text) return false;
    const lower = text.toLowerCase();
    return INTERNATIONAL_KEYWORDS.some(kw => {
        // Match word boundaries or substring
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(lower) || lower.includes(kw);
    });
};

/**
 * Intelligently auto-detects the ideal checklist template for a booking.
 */
export const detectBookingChecklistType = (
    booking: Booking,
    linkedPackage?: Package | null,
    masterLocations: MasterLocation[] = []
): ChecklistTemplateId => {
    const serviceType = String(booking.serviceType || '').toLowerCase().trim();
    const bookingType = String(booking.type || '').trim();

    // 1. Direct Service Type overrides
    if (serviceType === 'visa only' || serviceType.includes('visa')) {
        return 'visa_only';
    }
    if (serviceType === 'flight only') {
        return 'flight_only';
    }
    if (serviceType === 'hotel only') {
        return 'hotel_only';
    }
    if (serviceType === 'transport only') {
        return 'cab_rental';
    }
    if (serviceType === 'activities only') {
        return 'activities_only';
    }
    if (serviceType === 'hotel + flight') {
        return 'hotel_flight';
    }
    if (serviceType === 'hotel + transport') {
        return 'hotel_transport';
    }

    // 2. Booking Type matches
    if (bookingType === 'Flight') {
        return 'flight_only';
    }
    if (bookingType === 'Hotel') {
        return 'hotel_only';
    }
    if (bookingType === 'Car') {
        return 'cab_rental';
    }
    if (bookingType === 'Bus') {
        return 'bus_transit';
    }
    if (bookingType === 'Train') {
        return 'train_transit';
    }

    // 3. For 'Tour' or unspecified type, evaluate destination (International vs Domestic)
    let isIntl = false;

    // Check linked package if available
    if (linkedPackage) {
        if (isInternationalText(linkedPackage.title) || isInternationalText(linkedPackage.location) || isInternationalText(linkedPackage.description)) {
            isIntl = true;
        }

        // Check if package location maps to a foreign country in masterLocations
        if (linkedPackage.location && masterLocations.length > 0) {
            const loc = masterLocations.find(l => 
                String(l.id) === String(linkedPackage.location) || 
                l.name.toLowerCase() === String(linkedPackage.location).toLowerCase()
            );
            if (loc && loc.country && loc.country.toLowerCase() !== 'india' && loc.country.trim() !== '') {
                isIntl = true;
            }
        }
    }

    // Check booking title and details
    if (!isIntl && (isInternationalText(booking.title) || isInternationalText(booking.details))) {
        isIntl = true;
    }

    // Check supplier bookings for DMC or international clues
    if (!isIntl && booking.supplierBookings && booking.supplierBookings.length > 0) {
        const hasDmc = booking.supplierBookings.some(sb => 
            sb.serviceType === 'DMC' || String(sb.notes || '').toLowerCase().includes('dmc')
        );
        if (hasDmc && (isInternationalText(booking.title) || isInternationalText(booking.details))) {
            isIntl = true;
        }
    }

    return isIntl ? 'international_tour' : 'domestic_tour';
};

/**
 * Returns the resolved template object for a booking.
 */
export const getChecklistTemplateForBooking = (
    booking: Booking,
    linkedPackage?: Package | null,
    masterLocations: MasterLocation[] = []
): ChecklistTemplate => {
    const templateId = detectBookingChecklistType(booking, linkedPackage, masterLocations);
    return CHECKLIST_TEMPLATES[templateId] || DOMESTIC_TOUR_TEMPLATE;
};

/**
 * Detects if a booking's existing checklist has a structural mismatch with its true booking type.
 * e.g., A Domestic Tour ("Trip to Pune") holding legacy International Visa tasks.
 */
export const detectChecklistMismatch = (
    existingItems: TourChecklistItem[] = [],
    booking: Booking,
    linkedPackage?: Package | null,
    masterLocations: MasterLocation[] = []
): { hasMismatch: boolean; detectedTemplate: ChecklistTemplate; reason?: string } => {
    const detectedTemplate = getChecklistTemplateForBooking(booking, linkedPackage, masterLocations);
    if (!existingItems || existingItems.length === 0) {
        return { hasMismatch: false, detectedTemplate };
    }

    const hasVisaTasks = existingItems.some(i => 
        i.category === 'Visa' || i.title.toLowerCase().includes('visa')
    );

    // Mismatch Case 1: Domestic Tour contains Visa tasks
    if (detectedTemplate.id === 'domestic_tour' && hasVisaTasks) {
        return {
            hasMismatch: true,
            detectedTemplate,
            reason: `Detected as Domestic Tour ("${booking.title || 'Tour'}"), but currently has international Visa tasks.`
        };
    }

    // Mismatch Case 2: Standalone Car, Hotel or Flight holding Visa tasks
    if (['hotel_only', 'cab_rental', 'flight_only', 'bus_transit', 'train_transit'].includes(detectedTemplate.id) && hasVisaTasks) {
        return {
            hasMismatch: true,
            detectedTemplate,
            reason: `Detected as ${detectedTemplate.name}, but currently contains international Visa tasks.`
        };
    }

    return { hasMismatch: false, detectedTemplate };
};
