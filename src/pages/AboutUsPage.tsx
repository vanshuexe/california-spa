import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import {
  SPA_NAME,
  SPA_TAGLINE,
  SPA_LOGO_URL,
  SPA_PHONE,
  SPA_WHATSAPP_LINK,
  PRICING_DATA,
} from '../data/siteData';

interface AboutUsPageProps {
  onNavigate: (page: PageId) => void;
}

export const AboutUsPage: React.FC<AboutUsPageProps> = ({ onNavigate }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const slides = [
    '/assets/slider/AboutPageSlider/1.png',
    '/assets/slider/AboutPageSlider/5.png',
    '/assets/slider/AboutPageSlider/6.png',
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Slider */}
      <div className="relative overflow-hidden rounded-md shadow-md my-4 bg-[#181015] aspect-[16/9] max-h-[440px]">
        {slides.map((src, idx) => (
          <div
            key={idx}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              idx === currentSlide ? 'opacity-100 z-10' : 'opacity-0 z-0'
            }`}
          >
            <img
              src={src}
              alt={`About Doorstep Royale Spa slide ${idx + 1}`}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://californiamassage.in${src}`;
              }}
            />
          </div>
        ))}
        {/* Dots */}
        <div className="absolute bottom-3 left-0 right-0 z-20 flex justify-center gap-2">
          {slides.map((_, idx) => (
            <button
              key={idx}
              type="button"
              className={`w-3 h-3 rounded-full transition-all ${
                idx === currentSlide ? 'bg-[#ff9b22] scale-125' : 'bg-white/60'
              }`}
              onClick={() => setCurrentSlide(idx)}
              aria-label={`Slide ${idx + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Decorative Line */}
      <div className="text-center my-3">
        <img
          className="height68 mx-auto"
          src="/assets/slider/images/Decorative-Line-Gold-PNG-Image.png"
          alt=""
          role="presentation"
        />
      </div>

      {/* Header */}
      <div className="border-title text-center my-4">
        <img
          src={SPA_LOGO_URL}
          alt="Doorstep Royale Spa Logo"
          className="w-20 h-20 rounded-full object-cover border-2 border-[#a28321] shadow-lg mx-auto mb-2 bg-[#3a0202]"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
        <h1 className="text-3xl font-bold text-[#840000]">About Doorstep Royale Spa</h1>
        <div className="ico-border">
          <i className="ico-bg flower"></i>
        </div>
        <span className="tag-line">{SPA_TAGLINE}</span>
      </div>

      {/* Intro Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 my-6 items-center">
        <div className="md:col-span-8 text-left">
          <h3 className="text-2xl font-bold text-[#840000] mb-2">Who We Are</h3>
          <p className="font29 block mb-3 leading-relaxed">
            Doorstep Royale Spa is Bangalore’s premier luxury doorstep wellness provider. Leave
            the stress of your busy day behind. We provide professional wellness and massage
            experiences at your preferred location, allowing you to relax without travelling to a
            spa.
          </p>
          <p className="text-sm text-[#228b22] font-semibold leading-relaxed mb-4">
            Our certified therapists arrive equipped with premium aromatic oils, authentic pain
            relief ointments, fresh sanitized linens, and calming music to turn your residence into
            a personal sanctuary.
          </p>
          <h4 className="text-xl font-bold text-[#840000] mb-2">
            Our Signature Therapies:
          </h4>
          <p className="voiletImp font35">SWEDISH MASSAGE</p>
          <p className="voiletImp font35">DEEP TISSUE MASSAGE</p>
          <p className="voiletImp font35">AROMATHERAPY MASSAGE</p>
          <p className="voiletImp font35">RELAXATION MASSAGE</p>
          <p className="voiletImp font35">HEAD, NECK & SHOULDER</p>
          <p className="voiletImp font35">FOOT REFLEXOLOGY</p>
        </div>
        <div className="md:col-span-4 text-center">
          <img
            src="/assets/images/type21.png"
            alt="Doorstep Royale Spa therapies"
            className="rounded shadow-md max-w-full h-auto mx-auto border-2 border-[#a28321]"
            onError={(e) => {
              (e.target as HTMLImageElement).src =
                'https://californiamassage.in/assets/images/type21.png';
            }}
          />
        </div>
      </div>

      <div className="border-t border-[#a28321] my-6"></div>

      {/* Why Choose Doorstep Royale Spa */}
      <div className="box effect1 text-center box65 my-6">
        <strong>Why Choose Doorstep Royale Spa?</strong>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 my-6">
        <div className="bg-white/50 p-4 rounded-lg border border-[#a28321]/50 text-center">
          <span className="text-2xl block mb-1">🏡</span>
          <h5 className="font-bold text-[#840000] text-base mb-1">Convenient Home Service</h5>
          <p className="text-xs text-[#228b22] leading-relaxed">
            No commute, traffic stress, or parking hassles. Pure relaxation in your own space.
          </p>
        </div>

        <div className="bg-white/50 p-4 rounded-lg border border-[#a28321]/50 text-center">
          <span className="text-2xl block mb-1">👩‍⚕️</span>
          <h5 className="font-bold text-[#840000] text-base mb-1">Professional Therapists</h5>
          <p className="text-xs text-[#228b22] leading-relaxed">
            Experienced, verified, well-mannered therapists trained to royal hospitality standards.
          </p>
        </div>

        <div className="bg-white/50 p-4 rounded-lg border border-[#a28321]/50 text-center">
          <span className="text-2xl block mb-1">🔒</span>
          <h5 className="font-bold text-[#840000] text-base mb-1">Comfortable & Private</h5>
          <p className="text-xs text-[#228b22] leading-relaxed">
            Absolute privacy and safety with strict adherence to professional wellness codes.
          </p>
        </div>

        <div className="bg-white/50 p-4 rounded-lg border border-[#a28321]/50 text-center">
          <span className="text-2xl block mb-1">📅</span>
          <h5 className="font-bold text-[#840000] text-base mb-1">Flexible Scheduling</h5>
          <p className="text-xs text-[#228b22] leading-relaxed">
            Available 9:00 AM to 7:00 PM every day including weekends and holidays.
          </p>
        </div>

        <div className="bg-white/50 p-4 rounded-lg border border-[#a28321]/50 text-center">
          <span className="text-2xl block mb-1">🌿</span>
          <h5 className="font-bold text-[#840000] text-base mb-1">Hygiene-Focused</h5>
          <p className="text-xs text-[#228b22] leading-relaxed">
            Fresh disposable sheets, sanitized supplies, and certified organic herbal oils.
          </p>
        </div>

        <div className="bg-white/50 p-4 rounded-lg border border-[#a28321]/50 text-center">
          <span className="text-2xl block mb-1">💎</span>
          <h5 className="font-bold text-[#840000] text-base mb-1">Transparent Pricing</h5>
          <p className="text-xs text-[#228b22] leading-relaxed">
            Fixed rates (₹1,799 / ₹2,100 / ₹3,400) with zero surprise add-ons.
          </p>
        </div>
      </div>

      {/* Hours and Charges */}
      <div className="my-8 bg-[#f5f0e8] p-6 rounded-lg border-2 border-[#840000] shadow-md">
        <h3 className="text-2xl font-bold text-[#840000] mb-2">Hours and Charges</h3>
        <p className="font29 block mb-4">
          Appointments are available daily from 9:00 AM to 7:00 PM across all parts of Bangalore.
          Transparent pricing starts from ₹1,799 for 60 minutes, ₹2,100 for 90 minutes, and ₹3,400
          for 120 minutes. Experience five-star spa quality at a fraction of hotel rates.
        </p>
        <div className="text-center mt-4 flex flex-wrap justify-center gap-4">
          <button
            id="aboutBookNowBtn"
            type="button"
            className="btn btn-action text-lg px-8 py-3 shadow-md hover:scale-105 transition"
            onClick={() => onNavigate('booking')}
          >
            Book Your Home Spa Session (From ₹1,799)
          </button>
          <a
            href={`tel:${SPA_PHONE}`}
            className="btn btn-action text-lg px-8 py-3 shadow-md hover:scale-105 transition no-underline inline-flex items-center gap-2 text-[#ffdf88] hover:text-white"
          >
            <span>📞 Call {SPA_PHONE}</span>
          </a>
        </div>
      </div>

      {/* Job Vacancies Box */}
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
            <em>1) &nbsp; Spa & Wellness Therapist</em>
          </span>
        </div>
        <div>
          <span>
            Looking for female candidates, part or full time 18 to 35 years. Top industry
            compensation, travel allowance, and accommodation support available.
          </span>
        </div>
      </div>
    </article>
  );
};
