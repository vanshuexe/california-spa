// Bangalore service areas. Each one gets its own landing page (/home-massage-in-<slug>/) so the
// site can rank for "massage at home in <area>" searches.
export interface AreaInfo {
  slug: string;
  name: string; // name used in headings
  short: string; // short name for <title> tags (keeps titles under 60 characters)
  fullName: string; // as shown in the booking form
  zone: string;
  about: string;
  nearby: string[]; // slugs of neighbouring areas (internal links)
}

export const AREAS: AreaInfo[] = [
  {
    slug: 'koramangala',
    name: 'Koramangala',
    short: 'Koramangala',
    fullName: 'Koramangala',
    zone: 'South-East Bangalore',
    about: 'Koramangala is one of the busiest residential and start-up neighbourhoods in the city, with many apartment blocks, co-living spaces and long working days.',
    nearby: ['hsr-layout', 'btm-layout', 'indiranagar', 'jayanagar'],
  },
  {
    slug: 'indiranagar',
    name: 'Indiranagar',
    short: 'Indiranagar',
    fullName: 'Indiranagar',
    zone: 'East Bangalore',
    about: 'Indiranagar is known for its tree-lined residential lanes, cafes and busy 100 Feet Road, and is home to many working professionals and families.',
    nearby: ['koramangala', 'marathahalli', 'mg-road'],
  },
  {
    slug: 'whitefield',
    name: 'Whitefield',
    short: 'Whitefield',
    fullName: 'Whitefield',
    zone: 'East Bangalore',
    about: 'Whitefield is Bangalore\'s eastern IT corridor, with large tech parks and many gated apartment communities, where travelling across the city for a spa can take hours.',
    nearby: ['marathahalli', 'bellandur-sarjapur-road', 'indiranagar'],
  },
  {
    slug: 'hsr-layout',
    name: 'HSR Layout',
    short: 'HSR Layout',
    fullName: 'HSR Layout',
    zone: 'South-East Bangalore',
    about: 'HSR Layout is a planned residential layout popular with young professionals, with a mix of apartments, independent houses and co-working spaces.',
    nearby: ['koramangala', 'btm-layout', 'bellandur-sarjapur-road', 'electronic-city'],
  },
  {
    slug: 'mg-road',
    name: 'MG Road & Central Bangalore',
    short: 'MG Road',
    fullName: 'MG Road / Central Bangalore',
    zone: 'Central Bangalore',
    about: 'MG Road and the central business district have many hotels, serviced apartments and offices, which makes in-room and at-home sessions convenient for visitors and residents alike.',
    nearby: ['indiranagar', 'koramangala', 'malleshwaram-rajajinagar'],
  },
  {
    slug: 'jp-nagar',
    name: 'JP Nagar',
    short: 'JP Nagar',
    fullName: 'JP Nagar',
    zone: 'South Bangalore',
    about: 'JP Nagar is a large residential area in South Bangalore with many independent homes and apartment communities.',
    nearby: ['jayanagar', 'btm-layout', 'bannerghatta-road'],
  },
  {
    slug: 'jayanagar',
    name: 'Jayanagar',
    short: 'Jayanagar',
    fullName: 'Jayanagar',
    zone: 'South Bangalore',
    about: 'Jayanagar is one of the older planned residential neighbourhoods of South Bangalore, known for its blocks, markets and many long-time resident families.',
    nearby: ['jp-nagar', 'btm-layout', 'bannerghatta-road'],
  },
  {
    slug: 'bellandur-sarjapur-road',
    name: 'Bellandur & Sarjapur Road',
    short: 'Bellandur',
    fullName: 'Bellandur / Sarjapur Road',
    zone: 'South-East Bangalore',
    about: 'Bellandur and Sarjapur Road form a tech-park corridor with a very large number of apartment communities, where commute times are long.',
    nearby: ['hsr-layout', 'whitefield', 'marathahalli', 'electronic-city'],
  },
  {
    slug: 'electronic-city',
    name: 'Electronic City',
    short: 'Electronic City',
    fullName: 'Electronic City',
    zone: 'South-East Bangalore',
    about: 'Electronic City is a major IT hub on the southern edge of Bangalore, with large campuses and many apartment communities nearby.',
    nearby: ['hsr-layout', 'bannerghatta-road', 'bellandur-sarjapur-road'],
  },
  {
    slug: 'marathahalli',
    name: 'Marathahalli',
    short: 'Marathahalli',
    fullName: 'Marathahalli',
    zone: 'East Bangalore',
    about: 'Marathahalli sits on the Outer Ring Road in East Bangalore, close to several tech parks, with a dense mix of apartments and rental homes.',
    nearby: ['whitefield', 'bellandur-sarjapur-road', 'indiranagar'],
  },
  {
    slug: 'hebbal',
    name: 'Hebbal & North Bangalore',
    short: 'Hebbal',
    fullName: 'Hebbal / North Bangalore',
    zone: 'North Bangalore',
    about: 'Hebbal is a key junction on the way to the airport in North Bangalore, surrounded by growing residential neighbourhoods.',
    nearby: ['yelahanka', 'malleshwaram-rajajinagar'],
  },
  {
    slug: 'btm-layout',
    name: 'BTM Layout',
    short: 'BTM Layout',
    fullName: 'BTM Layout',
    zone: 'South Bangalore',
    about: 'BTM Layout is a dense residential area in South Bangalore with many apartments, PGs and young professionals.',
    nearby: ['koramangala', 'hsr-layout', 'jayanagar', 'jp-nagar'],
  },
  {
    slug: 'bannerghatta-road',
    name: 'Bannerghatta Road',
    short: 'Bannerghatta Road',
    fullName: 'Bannerghatta Road',
    zone: 'South Bangalore',
    about: 'Bannerghatta Road is a long arterial road in South Bangalore lined with apartment communities, hospitals and offices.',
    nearby: ['jp-nagar', 'jayanagar', 'electronic-city', 'btm-layout'],
  },
  {
    slug: 'malleshwaram-rajajinagar',
    name: 'Malleshwaram & Rajajinagar',
    short: 'Malleshwaram',
    fullName: 'Malleshwaram / Rajajinagar',
    zone: 'West Bangalore',
    about: 'Malleshwaram and Rajajinagar are long-established neighbourhoods in West Bangalore with many family homes and apartment blocks.',
    nearby: ['hebbal', 'mg-road'],
  },
  {
    slug: 'yelahanka',
    name: 'Yelahanka',
    short: 'Yelahanka',
    fullName: 'Yelahanka',
    zone: 'North Bangalore',
    about: 'Yelahanka is a fast-growing area in North Bangalore near the airport road, with new apartment communities and villas.',
    nearby: ['hebbal'],
  },
];

export const areaBySlug = (slug: string) => AREAS.find((a) => a.slug === slug);
