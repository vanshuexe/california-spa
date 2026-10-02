import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import {
  SERVICES_DATA,
  PRICING_DATA,
  EXPRESS_PRICING_DATA,
  SPA_PHONE,
  SPA_WHATSAPP_LINK,
} from '../data/siteData';

interface MassageStylePageProps {
  onNavigate: (page: PageId) => void;
}

export const MassageStylePage: React.FC<MassageStylePageProps> = ({ onNavigate }) => {
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
              alt={`Doorstep Royale Spa wellness slide ${idx + 1}`}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  `https://californiamassage.in${src}`;
              }}
            />
          </div>
        ))}
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

      {/* Decorative Gold Line */}
      <div className="text-center my-3">
        <img
          className="height68 mx-auto"
          src="/assets/slider/images/Decorative-Line-Gold-PNG-Image.png"
          alt=""
          role="presentation"
        />
      </div>

      {/* Header Section */}
      <div className="border-title text-center my-4">
        <h1 className="text-3xl font-bold text-[#840000]">Services & Pricing</h1>
        <div className="ico-border">
          <i className="ico-bg flower"></i>
        </div>
        <span className="tag-line">Doorstep Royale Spa</span>
      </div>

      {/* Intro banner */}
      <div className="bg-[#fffdfa] border-2 border-[#a28321] rounded-lg p-5 sm:p-6 text-center my-4 shadow-sm">
        <h3 className="text-2xl font-bold text-[#840000] mb-2">Our Services</h3>
        <p className="text-base text-[#228b22] font-semibold max-w-2xl mx-auto leading-relaxed">
          Enjoy professional wellness and massage services from the comfort of your home. Doorstep
          Royale Spa brings relaxation, rejuvenation, and skilled therapists directly to your doorstep.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-3">
          <a
            href={`tel:${SPA_PHONE}`}
            className="btn btn-action text-sm px-5 py-2 inline-flex items-center gap-2 no-underline text-[#ffdf88] hover:text-white"
          >
            <span>📞 Call 9180471825</span>
          </a>
          <a
            href={SPA_WHATSAPP_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] hover:bg-[#20ba59] text-white text-sm font-bold px-5 py-2 rounded-full inline-flex items-center gap-1.5 no-underline shadow"
          >
            <span>💬 WhatsApp Booking</span>
          </a>
        </div>
      </div>

      {/* PRICING SECTION */}
      <div className="box effect1 text-center box65 my-6">
        <strong>Pricing & Packages</strong>
      </div>

      {/* Transparent Pricing Table */}
      <div className="bg-white/60 rounded-xl border-2 border-[#840000] p-6 shadow-md my-4">
        <h4 className="text-center text-xl font-bold text-[#840000] mb-4">
          Doorstep Full Body Wellness Sessions
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#840000] bg-[#e0d5c1] text-[#840000]">
                <th className="py-3 px-4 font-bold text-base">Duration</th>
                <th className="py-3 px-4 font-bold text-base">All-Inclusive Price</th>
                <th className="py-3 px-4 font-bold text-base">Description & Benefits</th>
                <th className="py-3 px-4 font-bold text-base text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#a28321]/30">
              {PRICING_DATA.map((tier) => (
                <tr
                  key={tier.duration}
                  className={`hover:bg-amber-50/50 transition ${
                    tier.popular ? 'bg-amber-100/30 font-semibold' : ''
                  }`}
                >
                  <td className="py-3.5 px-4">
                    <span className="text-base text-[#840000] font-bold block">
                      {tier.duration}
                    </span>
                    {tier.badge && (
                      <span className="text-[10px] uppercase font-bold tracking-wide px-2 py-0.5 rounded-full bg-[#840000] text-[#ffdf88] inline-block mt-0.5">
                        {tier.badge}
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xl font-extrabold text-[#840000]">
                    {tier.formatted}
                  </td>
                  <td className="py-3.5 px-4 text-xs sm:text-sm text-[#228b22] max-w-xs">
                    {tier.note}
                  </td>
                  <td className="py-3.5 px-4 text-center">
                    <button
                      type="button"
                      className="btn btn-action text-xs px-4 py-1.5 shadow"
                      onClick={() => onNavigate('booking')}
                    >
                      Book Now
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Express Treatments Table */}
        <div className="mt-6 pt-4 border-t border-[#a28321]/40">
          <h5 className="font-bold text-[#840000] text-sm mb-2 uppercase tracking-wide">
            Targeted Express Sessions (Head, Neck, Shoulder & Foot)
          </h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {EXPRESS_PRICING_DATA.map((ep) => (
              <div
                key={ep.duration}
                className="bg-[#f5f0e8] p-3 rounded-lg border border-[#a28321] flex items-center justify-between"
              >
                <div>
                  <span className="font-bold text-[#840000] text-sm block">
                    {ep.duration} Express
                  </span>
                  <span className="text-xs text-[#228b22]">{ep.note}</span>
                </div>
                <div className="text-right ml-3">
                  <span className="font-extrabold text-base text-[#840000] block">
                    {ep.formatted}
                  </span>
                  <button
                    type="button"
                    className="text-xs font-bold text-[#b30af3] underline mt-0.5"
                    onClick={() => onNavigate('booking')}
                  >
                    Select
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* DETAILED SERVICES LIST */}
      <div className="box effect1 text-center box65 my-8">
        <strong>Our Signature Services & Techniques</strong>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-6">
        {/* Swedish Massage */}
        <div className="border-title bg-white/50 p-5 rounded-lg border-2 border-[#a28321]/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#840000] m-0">Swedish Massage</h3>
              <span className="text-xs font-bold bg-[#e0d5c1] text-[#840000] px-2.5 py-1 rounded">
                Duration: 60 / 90 minutes
              </span>
            </div>
            <div className="ico-border my-2">
              <i className="ico-bg flower"></i>
            </div>
            <p className="text-sm font-bold text-[#b30af3] my-1">
              A relaxing full-body massage using smooth, flowing techniques
            </p>
            <p className="text-xs sm:text-sm text-[#228b22] leading-relaxed my-2 font-sans">
              Swedish massage uses gentle effleurage, circular friction, and rhythmic tapping to
              release surface tension and enhance whole-body blood circulation. Ideal for overall
              stress reduction, gentle muscle unwinding, and peaceful mental clarity.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-action text-xs px-4 py-1.5 self-start mt-3"
            onClick={() => onNavigate('booking')}
          >
            Book Swedish Massage (From ₹1,799)
          </button>
        </div>

        {/* Deep Tissue Massage */}
        <div className="border-title bg-white/50 p-5 rounded-lg border-2 border-[#a28321]/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#840000] m-0">Deep Tissue Massage</h3>
              <span className="text-xs font-bold bg-[#e0d5c1] text-[#840000] px-2.5 py-1 rounded">
                Duration: 60 / 90 minutes
              </span>
            </div>
            <div className="ico-border my-2">
              <i className="ico-bg flower"></i>
            </div>
            <p className="text-sm font-bold text-[#b30af3] my-1">
              A focused massage using firmer pressure for areas of muscular tension
            </p>
            <p className="text-xs sm:text-sm text-[#228b22] leading-relaxed my-2 font-sans">
              Reaches deeper layers of muscle tissue, tendons, and connective fascia. Targets
              stubborn chronic knots, postural stiffness, repetitive strain, and sports tightness.
              Our therapists utilize authentic pain relief herbal ointments for rapid muscular comfort.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-action text-xs px-4 py-1.5 self-start mt-3"
            onClick={() => onNavigate('booking')}
          >
            Book Deep Tissue (From ₹1,799)
          </button>
        </div>

        {/* Aromatherapy Massage */}
        <div className="border-title bg-white/50 p-5 rounded-lg border-2 border-[#a28321]/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#840000] m-0">Aromatherapy Massage</h3>
              <span className="text-xs font-bold bg-[#e0d5c1] text-[#840000] px-2.5 py-1 rounded">
                Duration: 60 / 90 minutes
              </span>
            </div>
            <div className="ico-border my-2">
              <i className="ico-bg flower"></i>
            </div>
            <p className="text-sm font-bold text-[#b30af3] my-1">
              A relaxing massage experience incorporating aromatic oils
            </p>
            <p className="text-xs sm:text-sm text-[#228b22] leading-relaxed my-2 font-sans">
              Infused with natural floral and herbal essences such as lavender, eucalyptus, and
              ylang-ylang. The therapeutic aromas soothe the olfactory system, induce serene sleep,
              lower blood pressure, and rejuvenate sensitive skin textures.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-action text-xs px-4 py-1.5 self-start mt-3"
            onClick={() => onNavigate('booking')}
          >
            Book Aromatherapy (From ₹1,799)
          </button>
        </div>

        {/* Relaxation Massage */}
        <div className="border-title bg-white/50 p-5 rounded-lg border-2 border-[#a28321]/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#840000] m-0">Relaxation Massage</h3>
              <span className="text-xs font-bold bg-[#e0d5c1] text-[#840000] px-2.5 py-1 rounded">
                Duration: 60 / 90 minutes
              </span>
            </div>
            <div className="ico-border my-2">
              <i className="ico-bg flower"></i>
            </div>
            <p className="text-sm font-bold text-[#b30af3] my-1">
              A calming experience designed to help you unwind
            </p>
            <p className="text-xs sm:text-sm text-[#228b22] leading-relaxed my-2 font-sans">
              Slow, rhythmic, continuous gliding strokes accompanied by peaceful meditative
              background music. Leaves you feeling deeply restored, emotionally unburdened, and
              physically light.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-action text-xs px-4 py-1.5 self-start mt-3"
            onClick={() => onNavigate('booking')}
          >
            Book Relaxation Massage (From ₹1,799)
          </button>
        </div>

        {/* Head, Neck & Shoulder Massage */}
        <div className="border-title bg-white/50 p-5 rounded-lg border-2 border-[#a28321]/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#840000] m-0">Head, Neck & Shoulder</h3>
              <span className="text-xs font-bold bg-[#e0d5c1] text-[#840000] px-2.5 py-1 rounded">
                Duration: 30 / 45 minutes
              </span>
            </div>
            <div className="ico-border my-2">
              <i className="ico-bg flower"></i>
            </div>
            <p className="text-sm font-bold text-[#b30af3] my-1">
              Focused massage for commonly tense areas
            </p>
            <p className="text-xs sm:text-sm text-[#228b22] leading-relaxed my-2 font-sans">
              Specifically formulated for tech workers, drivers, and busy professionals. Eliminates
              cervical stiffness, eases ocular fatigue, and stops stress headaches in their tracks.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-action text-xs px-4 py-1.5 self-start mt-3"
            onClick={() => onNavigate('booking')}
          >
            Book Head, Neck & Shoulder (From ₹999)
          </button>
        </div>

        {/* Foot Massage */}
        <div className="border-title bg-white/50 p-5 rounded-lg border-2 border-[#a28321]/60 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-[#840000] m-0">Foot Massage</h3>
              <span className="text-xs font-bold bg-[#e0d5c1] text-[#840000] px-2.5 py-1 rounded">
                Duration: 30 / 45 minutes
              </span>
            </div>
            <div className="ico-border my-2">
              <i className="ico-bg flower"></i>
            </div>
            <p className="text-sm font-bold text-[#b30af3] my-1">
              A relaxing treatment for tired feet
            </p>
            <p className="text-xs sm:text-sm text-[#228b22] leading-relaxed my-2 font-sans">
              Reflexology pressure applied across solar plexus points, arches, heels, and calves.
              Revives fatigued feet, stimulates healthy circulation, and grounds bodily equilibrium.
            </p>
          </div>
          <button
            type="button"
            className="btn btn-action text-xs px-4 py-1.5 self-start mt-3"
            onClick={() => onNavigate('booking')}
          >
            Book Foot Massage (From ₹999)
          </button>
        </div>
      </div>

      {/* Hours and Booking Callout */}
      <div className="my-8 bg-[#f5f0e8] p-6 rounded-lg border-2 border-[#840000] shadow-md">
        <h3 className="text-2xl font-bold text-[#840000] mb-2">Hours and Booking Information</h3>
        <p className="font29 block mb-4">
          Doorstep Royale Spa appointments are available daily from <strong>9:00 AM to 7:00 PM</strong> across all
          neighborhoods of Bangalore. Our therapists arrive at your preferred location with all
          necessary equipment, sanitized disposable linens, natural oils, and soothing music.
        </p>
        <div className="text-center mt-4 flex flex-wrap justify-center gap-4">
          <button
            id="massageStyleBookBtn"
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
            <span>📞 Call 9180471825</span>
          </a>
        </div>
      </div>

      {/* Careers link */}
      <div
        className="JobDivbordrbg JobDivbox effect1 cursor-pointer hover:shadow-lg transition"
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
            Looking for female candidates, part or full time 18 to 35 years. Top compensation, travel
            allowance, and flexible schedules.
          </span>
        </div>
      </div>
    </article>
  );
};
