import { TherapistProfile, TestimonialItem, ServiceItem, PricingTier } from '../types';

export const SPA_NAME = 'DOORSTEP ROYALE SPA';
export const SPA_TAGLINE = 'Luxury Wellness, At Your Doorstep';
export const SPA_LOGO_URL = 'https://ik.imagekit.io/fdhgiehjz/royalspalogo.jpeg';
export const SPA_PHONE = '9180471825';
export const SPA_PHONE_FORMATTED = '+91 9180471825';
export const SPA_WHATSAPP_LINK =
  'https://wa.me/919180471825?text=Hello%20Doorstep%20Royale%20Spa,%20I%20would%20like%20to%20book%20a%20luxury%20home%20spa%20experience';

export const PRICING_DATA: PricingTier[] = [
  {
    duration: '60 Minutes',
    price: 1799,
    formatted: '₹1,799',
    popular: false,
    badge: 'Standard Session',
    note: 'Ideal for complete unwinding and relaxing body recharge.',
  },
  {
    duration: '90 Minutes',
    price: 2100,
    formatted: '₹2,100',
    popular: true,
    badge: 'Most Popular',
    note: 'Optimal therapeutic duration for deep relaxation & tension release.',
  },
  {
    duration: '120 Minutes',
    price: 3400,
    formatted: '₹3400',
    popular: false,
    badge: 'Ultimate Luxury',
    note: 'Extended head-to-toe full rejuvenation & holistic bliss.',
  },
];

export const EXPRESS_PRICING_DATA: PricingTier[] = [
  {
    duration: '30 Minutes',
    price: 999,
    formatted: '₹999',
    badge: 'Quick Refresh',
    note: 'Head, Neck & Shoulder or Foot Massage express tension relief.',
  },
  {
    duration: '45 Minutes',
    price: 1299,
    formatted: '₹1,299',
    badge: 'Targeted Focus',
    note: 'Focused acupressure & localized muscle knot unwinding.',
  },
];

export const SERVICES_DATA: ServiceItem[] = [
  {
    id: 'swedish',
    name: 'Swedish Massage',
    duration: '60 / 90 / 120 minutes',
    description: 'A relaxing full-body massage using smooth, flowing techniques.',
    recommendedFor: 'Full-body relaxation, stress relief, and gentle muscle toning.',
  },
  {
    id: 'deep-tissue',
    name: 'Deep Tissue Massage',
    duration: '60 / 90 / 120 minutes',
    description: 'A focused massage using firmer pressure for areas of muscular tension.',
    recommendedFor: 'Chronic stiffness, muscle knots, upper back aches, and sports recovery.',
  },
  {
    id: 'aromatherapy',
    name: 'Aromatherapy Massage',
    duration: '60 / 90 / 120 minutes',
    description: 'A relaxing massage experience incorporating aromatic oils.',
    recommendedFor: 'Calming the nervous system, deep peaceful sleep, and mental clarity.',
  },
  {
    id: 'relaxation',
    name: 'Relaxation Massage',
    duration: '60 / 90 / 120 minutes',
    description: 'A calming experience designed to help you unwind.',
    recommendedFor: 'Complete tranquility, daily stress relief, and restorative pampering.',
  },
  {
    id: 'head-neck-shoulder',
    name: 'Head, Neck & Shoulder Massage',
    duration: '30 / 45 / 60 minutes',
    description: 'Focused massage for commonly tense areas.',
    recommendedFor: 'Desk workers, screen-induced neck strain, headaches, and shoulder tension.',
  },
  {
    id: 'foot',
    name: 'Foot Massage',
    duration: '30 / 45 / 60 minutes',
    description: 'A relaxing treatment targeting reflexology points on tired feet.',
    recommendedFor: 'Fatigued legs, long standing hours, and improved circulation.',
  },
  {
    id: 'balinese',
    name: 'Balinese Massage',
    duration: '60 / 90 / 120 minutes',
    description: 'Traditional Indonesian holistic therapy combining acupressure, skin rolling, and aromatic oils.',
    recommendedFor: 'Lymphatic drainage, energy balancing, and soothing body aches.',
  },
  {
    id: 'thai',
    name: 'Traditional Thai Massage',
    duration: '60 / 90 / 120 minutes',
    description: 'Assisted yoga stretching without oils, incorporating rhythmic compression and deep static pressure.',
    recommendedFor: 'Joint mobility, body flexibility, and physical invigoration.',
  },
];

export const TESTIMONIALS_DATA: TestimonialItem[] = [
  {
    id: 't1',
    initials: 'SN',
    quote:
      'The massage services are very professional. I have taken their services multiple times and it was very satisfactory. The therapists are well mannered, skilled and courteous. Good value for time and money when you want to relax your body and mind at home. Thanks Doorstep Royale Spa for your services.',
    rating: 5,
  },
  {
    id: 't2',
    initials: 'AK',
    quote:
      'I had a great experience with Doorstep Royale Spa. The therapists are well trained with a pleasing personality. The sessions are focused on pain relief and overall relaxation. The therapists create a calm peaceful vibe with authentic oils at my doorstep.',
    rating: 5,
  },
  {
    id: 't3',
    initials: 'VS',
    quote: 'The service was very good',
    rating: 5,
  },
  {
    id: 't4',
    initials: 'VH',
    quote: 'Thanks for the wonderful service',
    rating: 5,
  },
  {
    id: 't5',
    initials: 'SA',
    quote: 'Thanks it was amazing',
    rating: 5,
  },
  {
    id: 't6',
    initials: 'ST',
    quote: 'Awesome So kind of you Thanks again for the services',
    rating: 5,
  },
  {
    id: 't7',
    initials: 'GR',
    quote: 'Thank you so much',
    rating: 5,
  },
  {
    id: 't8',
    initials: 'RR',
    quote: 'Thanks sober and pleasant',
    rating: 5,
  },
  {
    id: 't9',
    initials: 'UM',
    quote: 'One of the best head massages I have got in a long time',
    rating: 5,
  },
  {
    id: 't10',
    initials: 'MH',
    quote:
      'A very good service from your therapist Mary Really enjoyed Thanks a lot sir for your service',
    rating: 5,
  },
  {
    id: 't11',
    initials: 'BT',
    quote:
      'Loved the session with Pari never knew Ladies hand pressure could be that strong',
    rating: 5,
  },
  {
    id: 't12',
    initials: 'VS',
    quote: 'G8 service thank you',
    rating: 5,
  },
  {
    id: 't13',
    initials: 'SP',
    quote: 'Massage is done. She is just excellent…she did a very good job',
    rating: 5,
  },
  {
    id: 't14',
    initials: 'KH',
    quote:
      'Kangnu is a great therapist. She gave a very therapeutic and professional massage',
    rating: 5,
  },
  {
    id: 't15',
    initials: 'MJ',
    quote: 'She came on time was really nice massage I got',
    rating: 5,
  },
  {
    id: 't16',
    initials: 'TM',
    quote: 'Hello sir again a very good therapy session',
    rating: 5,
  },
  {
    id: 't17',
    initials: 'MN',
    quote: 'Very best service Keep it up Thanks',
    rating: 5,
  },
  {
    id: 't18',
    initials: 'MJ',
    quote: 'Massage was really good Thanks I will contact you next week for same',
    rating: 5,
  },
  {
    id: 't19',
    initials: 'SL',
    quote: 'She finished I felt very good thanks',
    rating: 5,
  },
  {
    id: 't20',
    initials: 'RV',
    quote:
      'It was one of the best experience I had she took care of everything',
    rating: 5,
  },
  {
    id: 't21',
    initials: 'DL',
    quote:
      'Mary is a total professional. Am very pleased with her.Very sweet and gentle',
    rating: 5,
  },
  {
    id: 't22',
    initials: 'KT',
    quote: 'Very nicely done massage 10 on 10',
    rating: 5,
  },
  {
    id: 't23',
    initials: 'BU',
    quote: 'It was very good experience I would rate 9',
    rating: 5,
  },
  {
    id: 't24',
    initials: 'SH',
    quote: 'Everything was fine and amazing I would rate 9/10',
    rating: 5,
  },
  {
    id: 't25',
    initials: 'SR',
    quote: 'Everything is good She came on time Do good 8',
    rating: 5,
  },
  {
    id: 't26',
    initials: 'RE',
    quote: 'All was well thx 9/10',
    rating: 5,
  },
];

export const THERAPISTS_DATA: TherapistProfile[] = [
  {
    id: 'mary',
    name: 'Mary',
    gender: 'Female',
    age: 26,
    experience: '4+ Years',
    specialties: ['Swedish', 'Aroma', 'Deep Tissue', 'Head & Shoulder'],
    photo: '/assets/slider/images/female-massage-bangalore.png',
    rating: 4.9,
    reviewsCount: 148,
    bio: 'Trained to Doorstep Royale Spa standards. Gentle, caring demeanor with excellent focus on stress relief, muscle tension unwinding, and soothing aroma strokes.',
  },
  {
    id: 'pari',
    name: 'Pari',
    gender: 'Female',
    age: 28,
    experience: '5+ Years',
    specialties: ['Deep Tissue', 'Balinese Acupressure', 'Pain Relief', 'Swedish'],
    photo: '/assets/slider/AboutPageSlider/5.png',
    rating: 4.95,
    reviewsCount: 172,
    bio: 'Renowned for firm, therapeutic hand pressure combined with Ayurvedic healing oils. Specialized in chronic back, neck, and shoulder ache relief.',
  },
  {
    id: 'kangnu',
    name: 'Kangnu',
    gender: 'Female',
    age: 25,
    experience: '3+ Years',
    specialties: ['Balinese', 'Aroma Relaxation', 'Swedish Relaxation', 'Thai Stretches'],
    photo: '/assets/slider/images/21.png',
    rating: 4.88,
    reviewsCount: 119,
    bio: 'Gentle, punctual, and attentive therapist providing an integrative mind-body relaxation session with meditative background music and authentic essences.',
  },
  {
    id: 'riya',
    name: 'Riya',
    gender: 'Female',
    age: 27,
    experience: '4 Years',
    specialties: ['Swedish', 'Esalen Long Flow', 'Aromatherapy', 'Ayurvedic Herbal'],
    photo: '/assets/slider/AboutPageSlider/6.png',
    rating: 4.92,
    reviewsCount: 94,
    bio: 'Specialist in Esalen-inspired continuous flowing strokes that induce deep tranquility, stimulate blood circulation, and balance energy.',
  },
  {
    id: 'david',
    name: 'David',
    gender: 'Male',
    age: 30,
    experience: '6 Years',
    specialties: ['Deep Tissue', 'Sports Therapy', 'Orthopedic Massage', 'Acupressure'],
    photo: '/assets/slider/AboutPageSlider/1.png',
    rating: 4.85,
    reviewsCount: 86,
    bio: 'Strong hands and deep anatomical knowledge for athletes and clients with intense muscle knots, stiffness, or sports fatigue.',
  },
];

export const BANGALORE_AREAS = [
  'Koramangala',
  'Indiranagar',
  'Whitefield',
  'HSR Layout',
  'MG Road / Central Bangalore',
  'JP Nagar',
  'Jayanagar',
  'Bellandur / Sarjapur Road',
  'Electronic City',
  'Marathahalli',
  'Hebbal / North Bangalore',
  'BTM Layout',
  'Bannerghatta Road',
  'Malleshwaram / Rajajinagar',
  'Yelahanka',
  'Other Area in Bangalore',
];
