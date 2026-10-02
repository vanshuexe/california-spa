import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { FadeInSection } from '../components/FadeInSection';
import {
  SPA_NAME,
  SPA_TAGLINE,
  SPA_LOGO_URL,
  SPA_PHONE,
  SPA_PHONE_FORMATTED,
  SPA_WHATSAPP_LINK,
  PRICING_DATA,
  SERVICES_DATA,
} from '../data/siteData';

interface HomePageProps {
  onNavigate: (page: PageId) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ onNavigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    {
      src: '/assets/slider/images/21.png',
      alt: 'Doorstep Royale Spa therapist providing relaxing home wellness',
    },
    {
      src: '/assets/slider/images/female-massage-bangalore.png',
      alt: 'Professional certified female massage therapist in Bangalore',
    },
    {
      src: '/assets/slider/images/home_massage.png',
      alt: 'Doorstep spa therapist arriving for home appointment',
    },
    {
      src: '/assets/slider/images/i2.png',
      alt: 'Luxury aromatherapy oils, herbs and clean towels',
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Hero Royale Callout Card */}
      <FadeInSection id="homeHeroSection" delay={50}>
        <div className="bg-gradient-to-r from-[#fdfbf7] via-[#f5f0e8] to-[#eee4d3] border-2 border-[#a28321] rounded-lg p-5 sm:p-7 shadow-md my-3 text-center">
          <div className="flex flex-col items-center justify-center mb-2">
            <img
              src={SPA_LOGO_URL}
              alt={`${SPA_NAME} Logo`}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-[#a28321] shadow-lg mb-2 bg-[#3a0202] hover:scale-105 transition-transform"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <div className="inline-flex items-center justify-center gap-2">
              <span className="text-xl sm:text-2xl">👑</span>
              <h1 className="text-2xl sm:text-3xl font-bold text-[#840000] tracking-wider uppercase m-0 font-['Patrick_Hand',cursive]">
                {SPA_NAME}
              </h1>
              <span className="text-xl sm:text-2xl">👑</span>
            </div>
          </div>

          <p className="tag-line text-2xl sm:text-3xl text-[#840000] my-1">
            {SPA_TAGLINE}
          </p>

          <p className="text-sm sm:text-base text-[#228b22] font-semibold max-w-2xl mx-auto leading-relaxed my-3 font-sans">
            Experience professional spa and wellness services in the comfort and privacy of your
            home. Doorstep Royale Spa brings relaxation, rejuvenation and professional massage
            services directly to your doorstep.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
            <button
              id="heroBookBtn"
              type="button"
              className="btn btn-action text-sm sm:text-base px-6 py-2.5 shadow hover:scale-105 transition"
              onClick={() => onNavigate('booking')}
            >
              📅 Book Your Home Spa Experience
            </button>

            <a
              id="heroCallBtn"
              href={`tel:${SPA_PHONE}`}
              className="btn btn-action text-sm sm:text-base px-6 py-2.5 inline-flex items-center gap-2 shadow hover:scale-105 transition no-underline text-[#ffdf88] hover:text-white"
            >
              <span>📞</span>
              <span>{SPA_PHONE}</span>
            </a>

            <a
              id="heroWhatsAppBtn"
              href={SPA_WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-sm sm:text-base px-5 py-2.5 rounded-full border border-green-700 inline-flex items-center gap-2 shadow transition hover:scale-105 no-underline"
            >
              <span>💬</span>
              <span>WhatsApp Us</span>
            </a>
          </div>
        </div>
      </FadeInSection>

      {/* Responsive Slider Container */}
      <FadeInSection id="homeSliderSection" delay={150}>
        <div className="row" id="camera_wrap">
          <div className="relative overflow-hidden rounded shadow-md my-3 bg-[#181015] aspect-[1000/594] w-full max-h-[580px]">
            {slides.map((slide, idx) => (
              <div
                key={idx}
                className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
                  idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
                }`}
              >
                <img
                  src={slide.src}
                  alt={slide.alt}
                  className="w-full h-full object-contain object-center"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      `https://californiamassage.in${slide.src}`;
                  }}
                />
              </div>
            ))}

            {/* Slide Indicators / Dots */}
            <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  id={`slideDot-${idx}`}
                  type="button"
                  className={`w-3 h-3 rounded-full transition-all cursor-pointer ${
                    idx === currentSlide
                      ? 'bg-[#ff9b22] scale-125'
                      : 'bg-white/60 hover:bg-white'
                  }`}
                  onClick={() => setCurrentSlide(idx)}
                  aria-label={`Slide ${idx + 1}`}
                />
              ))}
            </div>
          </div>
        </div>
      </FadeInSection>

      {/* Welcome Title Section */}
      <FadeInSection id="homeWelcomeSection">
        {/* Decorative Gold Line */}
        <div className="text-center my-3">
          <img
            className="height68 mx-auto"
            src="/assets/slider/images/Decorative-Line-Gold-PNG-Image.png"
            alt=""
            role="presentation"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://californiamassage.in/assets/slider/images/Decorative-Line-Gold-PNG-Image.png';
            }}
          />
        </div>

        <div className="border-title text-center my-4">
          <h3>Welcome to Doorstep Royale Spa</h3>
          <div className="ico-border">
            <i className="ico-bg flower"></i>
          </div>
          <span className="tag-line">Your Private Spa Experience, At Home</span>
        </div>

        {/* Welcome Intro Paragraph */}
        <div className="my-5 text-center sm:text-left bg-white/40 p-5 rounded-lg border border-[#a28321]/40 shadow-sm">
          <p className="font29 block mb-2 leading-relaxed">
            Leave the stress of your busy day behind. Doorstep Royale Spa provides professional
            wellness and massage experiences at your preferred location, allowing you to relax
            without travelling to a spa.
          </p>
          <p className="text-[#228b22] text-sm sm:text-base leading-relaxed">
            We bring complete spa equipment, sanitized fresh disposable linens, certified organic
            oils, and soothing ambient music straight to your residence, villa, apartment, or hotel
            anywhere in Bangalore.
          </p>
        </div>
      </FadeInSection>

      {/* Why Choose Doorstep Royale Spa */}
      <FadeInSection id="homeWhyChooseSection">
        <div className="box box65 effect1 text-center my-5">
          <strong>Why Choose Doorstep Royale Spa?</strong>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-4">
          <div className="bg-white/50 p-5 rounded-lg border border-[#a28321]/50 shadow-sm">
            <ul className="space-y-3">
              <li className="flex items-start gap-3 col81d742 font-medium">
                <span className="text-lg text-[#840000]">✨</span>
                <span><strong>Convenient home service:</strong> No fighting Bangalore traffic or waiting in reception lobbies.</span>
              </li>
              <li className="flex items-start gap-3 col81d742 font-medium">
                <span className="text-lg text-[#840000]">✨</span>
                <span><strong>Professional wellness therapists:</strong> Rigorously trained, polite, groomed, and background-verified therapists.</span>
              </li>
              <li className="flex items-start gap-3 col81d742 font-medium">
                <span className="text-lg text-[#840000]">✨</span>
                <span><strong>Comfortable and private experience:</strong> Relax in the absolute safety and privacy of your own personal sanctuary.</span>
              </li>
            </ul>
          </div>
          <div className="bg-white/50 p-5 rounded-lg border border-[#a28321]/50 shadow-sm">
            <ul className="space-y-3">
              <li className="flex items-start gap-3 col81d742 font-medium">
                <span className="text-lg text-[#840000]">✨</span>
                <span><strong>Flexible appointment scheduling:</strong> Book from 9:00 AM to 7:00 PM, 7 days a week including weekends.</span>
              </li>
              <li className="flex items-start gap-3 col81d742 font-medium">
                <span className="text-lg text-[#840000]">✨</span>
                <span><strong>Hygiene-focused service:</strong> Fresh disposable sheets, sanitized gear, and strictly audited hygienic standards.</span>
              </li>
              <li className="flex items-start gap-3 col81d742 font-medium">
                <span className="text-lg text-[#840000]">✨</span>
                <span><strong>Fixed Transparent Pricing:</strong> Clear upfront rates with zero unexpected surprise charges.</span>
              </li>
            </ul>
          </div>
        </div>
      </FadeInSection>

      {/* SERVICES & PRICING TABLE SECTION */}
      <FadeInSection id="homePricingSection">
        <div className="border-title text-center my-6">
          <h3>Services & Pricing</h3>
          <div className="ico-border">
            <i className="ico-bg flower"></i>
          </div>
          <span className="tag-line">Simple, Transparent Doorstep Rates</span>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 my-6">
          {PRICING_DATA.map((tier) => (
            <div
              key={tier.duration}
              className={`relative rounded-xl p-6 text-center border-2 transition hover:shadow-lg flex flex-col justify-between ${
                tier.popular
                  ? 'bg-gradient-to-b from-[#fffaf0] to-[#f4ebe0] border-[#840000] shadow-md scale-102 ring-2 ring-[#a28321]'
                  : 'bg-white/60 border-[#a28321]/60'
              }`}
            >
              {tier.badge && (
                <span
                  className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-sm ${
                    tier.popular
                      ? 'bg-[#840000] text-[#ffdf88]'
                      : 'bg-[#a28321] text-white'
                  }`}
                >
                  {tier.badge}
                </span>
              )}

              <div>
                <h4 className="text-xl font-bold text-[#840000] mt-2 mb-1">
                  {tier.duration}
                </h4>
                <div className="my-3">
                  <span className="text-3xl sm:text-4xl font-extrabold text-[#840000]">
                    {tier.formatted}
                  </span>
                  <span className="text-xs text-[#228b22] block mt-1 font-semibold">
                    All-Inclusive Doorstep Home Service
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-[#228b22] leading-relaxed mb-4">
                  {tier.note}
                </p>
              </div>

              <button
                type="button"
                className={`w-full py-2.5 rounded-full font-bold text-sm tracking-wide transition ${
                  tier.popular
                    ? 'btn btn-action text-white'
                    : 'bg-[#840000] hover:bg-[#a00000] text-[#ffdf88] hover:text-white'
                }`}
                onClick={() => onNavigate('booking')}
              >
                Book {tier.duration} ({tier.formatted})
              </button>
            </div>
          ))}
        </div>
      </FadeInSection>

      {/* Services List Preview */}
      <FadeInSection id="homeServicesSection">
        <div className="box effect1 text-center box65 my-6">
          <strong>Our Signature Services</strong>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 my-4">
          {SERVICES_DATA.slice(0, 6).map((service) => (
            <div
              key={service.id}
              className="bg-white/60 p-4 rounded-lg border border-[#a28321]/50 shadow-sm flex flex-col justify-between hover:bg-white/80 transition"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <h5 className="font-bold text-base text-[#840000] m-0">
                    {service.name}
                  </h5>
                  <span className="text-xs bg-[#e0d5c1] text-[#840000] px-2 py-0.5 rounded font-semibold whitespace-nowrap">
                    {service.duration}
                  </span>
                </div>
                <p className="text-xs text-[#228b22] leading-relaxed my-2">
                  {service.description}
                </p>
              </div>
              <a
                href="#booking"
                className="text-xs font-bold text-[#b30af3] hover:underline inline-flex items-center gap-1 mt-2"
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate('booking');
                }}
              >
                Book This Therapy →
              </a>
            </div>
          ))}
        </div>

        {/* View All Services Link */}
        <div className="text-center my-4">
          <button
            type="button"
            className="btn btn-action text-sm px-6 py-2"
            onClick={() => onNavigate('services')}
          >
            View All Services & Details →
          </button>
        </div>
      </FadeInSection>

      {/* Box: Popular Categories */}
      <FadeInSection id="homeSpecializedSection">
        <div className="box effect1 text-center box50 my-6">
          <strong>Specialized Home Offerings</strong>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pst text-center sm:text-left my-2">
          <div className="flex justify-center md:justify-end">
            <ul>
              <li>
                <a
                  id="popularServiceFemale"
                  className="colb30af3 font-bold text-lg"
                  href="#female-massage"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('female-massage');
                  }}
                >
                  Female Therapists Bangalore
                </a>
              </li>
            </ul>
          </div>
          <div className="flex justify-center md:justify-start">
            <ul>
              <li>
                <a
                  id="popularServiceHome"
                  className="colb30af3 font-bold text-lg"
                  href="#home-massage"
                  onClick={(e) => {
                    e.preventDefault();
                    onNavigate('home-massage');
                  }}
                >
                  Home Spa Bangalore
                </a>
              </li>
            </ul>
          </div>
        </div>
      </FadeInSection>

      {/* Box: Benefits of Body Massage */}
      <FadeInSection id="homeBenefitsSection">
        <div className="box effect1 text-center box65 my-6">
          <strong>What are the Benefits of Doorstep Body Massage?</strong>
        </div>

        <div className="pst col81d742 space-y-4 text-justify my-4 bg-white/40 p-5 rounded-lg border border-[#a28321]/40">
          <p>
            Massage is one therapy that has universal acceptance in terms of its benefits. Western
            wellness systems, Indian Ayurveda, and Asian meridian therapy all unanimously extol its
            restorative healing. Having a professional massage at your doorstep multiplies these
            benefits, as you do not experience post-session commuting stress.
          </p>

          <p className="font-bold text-[#840000]">1) Blood Circulation & Oxygenation</p>
          <p>
            By massaging and rubbing the skin muscles and organs it stimulates blood flow. Blood
            delivers vital oxygen and nutrients to whole-body tissues, flushing lactic acid and
            waste products for rejuvenated vitality.
          </p>

          <p className="font-bold text-[#840000]">2) Lymph Drainage & Immunity</p>
          <p>
            Light and rhythmic strokes stimulate the lymphatic vessels beneath the skin, facilitating
            natural toxin clearance and bolstering immune defense mechanisms.
          </p>

          <p className="font-bold text-[#840000]">3) Relieves Headaches & Cervical Strain</p>
          <p>
            The most frequent cause of tension headaches is muscular tightness in the neck and upper
            back. Soothing therapeutic strokes ease these tight fascia layers immediately.
          </p>

          <p className="font-bold text-[#840000]">4) Stress Reduction & Neurochemical Balance</p>
          <p>
            Massage naturally stimulates dopamine and serotonin production while drastically lowering
            elevated cortisol levels, leaving you with lasting peace and restorative sleep.
          </p>
        </div>
      </FadeInSection>

      {/* Quick Action Button to Book */}
      <FadeInSection id="homeCtaSection">
        <div className="text-center my-6">
          <button
            id="homeBookNowBtn"
            type="button"
            className="btn btn-action text-lg px-8 py-3 shadow-md hover:scale-105 transition"
            onClick={() => onNavigate('booking')}
          >
            View Therapist Profiles & Book Appointment (From ₹1,799)
          </button>
        </div>
      </FadeInSection>

      {/* Job Vacancies Box */}
      <FadeInSection id="homeCareersSection">
        <div
          className="JobDivbordrbg JobDivbox effect1 cursor-pointer hover:shadow-lg transition my-6"
          onClick={() => onNavigate('jobs')}
        >
          <div>
            <span>CAREERS AT DOORSTEP ROYALE SPA</span>
          </div>
          <div>
            <span className="text-sm">
              (Referral fee provided if we hire someone through you)
            </span>
          </div>
          <div>
            <span>
              <em>1) &nbsp; Female Spa & Wellness Therapist</em>
            </span>
          </div>
          <div>
            <span>
              Looking for professional female therapists (18 to 35 yrs). Full-time / part-time. Top
              industry compensation and travel allowances provided.
            </span>
          </div>
          <div className="mt-3">
            <button
              type="button"
              className="btn btn-action text-sm px-4 py-1"
              onClick={(e) => {
                e.stopPropagation();
                onNavigate('jobs');
              }}
            >
              Apply for Position
            </button>
          </div>
        </div>
      </FadeInSection>
    </article>
  );
};

