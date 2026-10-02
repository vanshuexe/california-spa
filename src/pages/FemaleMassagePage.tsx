import React from 'react';
import { PageId } from '../types';
import { SPA_NAME, SPA_PHONE, SPA_WHATSAPP_LINK } from '../data/siteData';

interface FemaleMassagePageProps {
  onNavigate: (page: PageId) => void;
}

export const FemaleMassagePage: React.FC<FemaleMassagePageProps> = ({ onNavigate }) => {
  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Top Banner Image */}
      <div className="text-center my-4">
        <img
          src="/assets/images/i2.png"
          alt="Spa massage oils and towels laid out for a treatment"
          className="rounded shadow-md max-w-full h-auto mx-auto border-2 border-[#a28321]"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://californiamassage.in/assets/images/i2.png';
          }}
        />
      </div>

      <div className="border-title text-center my-6">
        <h3>Female Massage Therapists - Bangalore</h3>
        <div className="ico-border">
          <i className="ico-bg flower"></i>
        </div>
        <span className="tag-line">Doorstep Royale Spa</span>
      </div>

      {/* Should I select Male or Female therapist */}
      <div className="pst my-4 bg-white/40 p-6 rounded-lg border border-[#a28321]/30 shadow-sm">
        <span className="voiletImp font35 block">
          Selecting a Professional Wellness Therapist
        </span>
        <p className="col81d742 font-bold text-base mt-2">
          At Doorstep Royale Spa, our therapists are trained rigorously in Swedish, Deep Tissue,
          and Aromatherapy techniques to provide both soothing care and effective tension release.
        </p>
      </div>

      {/* Female therapist benefits */}
      <div className="pst my-4 bg-white/40 p-6 rounded-lg border border-[#a28321]/30 shadow-sm">
        <span className="voiletImp font35 block">
          Benefits of Our Female Therapists
        </span>
        <p className="col81d742 text-base mt-2 leading-relaxed">
          Female therapists have a soothing, nurturing touch that can calm and relax your body,
          mind, and soul. They are extremely attentive to comfort levels, pressure preferences, and
          hygiene standards. Our certified female therapists at Doorstep Royale Spa are adept at both
          gentle relaxation strokes and targeted firm acupressure to alleviate deep-seated muscular
          knots.
        </p>
      </div>

      {/* Preferences and Etiquette */}
      <div className="pst my-6 space-y-4 bg-white/40 p-6 rounded-lg border border-[#a28321]/30 shadow-sm">
        <span className="voiletImp font35 block">
          Client Comfort, Safety & Privacy
        </span>
        <p className="col81d742 leading-relaxed">
          At Doorstep Royale Spa, we respect our clients’ personal preferences and comfort at all
          times. A large majority of both male and female clients in Bangalore express a preference
          for female massage therapists for their gentleness, meticulous attention to hygiene, and
          relaxing presence.
        </p>
        <p className="col81d742 leading-relaxed">
          All Doorstep Royale Spa sessions follow strict professional wellness protocols. Therapists
          arrive punctually at your residence or hotel with organic oils, fresh sanitized towels, and
          disposable covers.
        </p>
        <p className="col81d742 font-bold leading-relaxed">
          For bookings and inquiries across all Bangalore areas, call or WhatsApp{' '}
          <a
            className="voiletImp underline"
            href={`tel:${SPA_PHONE}`}
          >
            {SPA_PHONE}
          </a>
          .
        </p>
      </div>

      {/* Book button */}
      <div className="text-center my-8 flex flex-wrap justify-center gap-4">
        <button
          id="femaleMassageBookBtn"
          type="button"
          className="btn btn-action text-lg px-8 py-3 shadow-md hover:scale-105 transition"
          onClick={() => onNavigate('booking')}
        >
          Book Female Therapist (From ₹1,799 / 60 Mins)
        </button>

        <a
          href={`tel:${SPA_PHONE}`}
          className="btn btn-action text-lg px-8 py-3 shadow-md hover:scale-105 transition no-underline inline-flex items-center gap-2 text-[#ffdf88] hover:text-white"
        >
          <span>📞 Call {SPA_PHONE}</span>
        </a>
      </div>
    </article>
  );
};
