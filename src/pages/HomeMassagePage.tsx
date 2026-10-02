import React from 'react';
import { PageId } from '../types';
import { SPA_NAME, SPA_TAGLINE, SPA_PHONE, SPA_WHATSAPP_LINK } from '../data/siteData';

interface HomeMassagePageProps {
  onNavigate: (page: PageId) => void;
}

export const HomeMassagePage: React.FC<HomeMassagePageProps> = ({ onNavigate }) => {
  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Banner */}
      <div className="text-center my-4">
        <img
          src="/assets/images/home_massage.png"
          alt="Doorstep Royale Spa therapist arriving for a home massage appointment"
          className="rounded shadow-md max-w-full h-auto mx-auto border-2 border-[#a28321]"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://californiamassage.in/assets/images/home_massage.png';
          }}
        />
      </div>

      <div className="border-title text-center my-6">
        <h3>Doorstep Home Spa Experience - Bangalore</h3>
        <div className="ico-border">
          <i className="ico-bg flower"></i>
        </div>
        <span className="tag-line">{SPA_TAGLINE}</span>
      </div>

      <div className="pst my-4 bg-white/40 p-6 rounded-lg border border-[#a28321]/30 shadow-sm">
        <span className="voiletImp font35 inline">Home Spa : </span>
        <span className="col81d742 font35 inline font-normal">
          Why Doorstep Spa Service is the Future of Wellness
        </span>
        <p className="col81d742 leftpad8 mt-2 text-base font-bold">
          Compare the advantages of experiencing luxury wellness in your private residence vs. travelling through city traffic:
        </p>
      </div>

      {/* Location 1: Own Home */}
      <div className="pst my-6 bg-white/40 p-6 rounded-lg border border-[#a28321]/30 shadow-sm">
        <span className="voiletImp font35 block text-2xl font-bold">
          1. In the Privacy of Your Own Home
        </span>

        <div className="mt-4">
          <span className="voiletImp font-bold text-lg block mb-2">
            Key Advantages:
          </span>
          <p className="col81d742 leftpad8 mb-1">
            a) <strong>Zero Travel:</strong> The therapist arrives directly at your home, saving you 2+ hours of Bangalore traffic and parking hassles.
          </p>
          <p className="col81d742 leftpad8 mb-1">
            b) <strong>Ultimate Comfort:</strong> You are fully at ease in your own temperature-controlled environment and private bathroom.
          </p>
          <p className="col81d742 leftpad8 mb-1">
            c) <strong>Post-Massage Sleep:</strong> Immediately after the session, you can take a warm shower and slip into a restorative nap without getting dressed to drive back home.
          </p>
          <p className="col81d742 leftpad8 mb-1">
            d) <strong>Complete Hygiene:</strong> Our therapists bring single-use disposable bedsheets and sanitized equipment.
          </p>
        </div>
      </div>

      {/* Location 2: Traditional Commercial Spas */}
      <div className="pst my-6 bg-white/40 p-6 rounded-lg border border-[#a28321]/30 shadow-sm">
        <span className="voiletImp font35 block text-2xl font-bold">
          2. Traditional Commercial Spas
        </span>

        <div className="mt-4">
          <span className="voiletImp font-bold text-lg block mb-2">
            Common Inconveniences:
          </span>
          <p className="col81d742 leftpad8 mb-1">
            a) Expensive overhead costs and hidden service taxes.
          </p>
          <p className="col81d742 leftpad8 mb-1">
            b) Commuting through heavy traffic destroys the relaxing benefits within 10 minutes of leaving.
          </p>
          <p className="col81d742 leftpad8 mb-1">
            c) Shared rooms, lack of personalized attention, and rushed time slots.
          </p>
        </div>
      </div>

      {/* Location 3: Hotel or Service Apartment */}
      <div className="pst my-6 bg-white/40 p-6 rounded-lg border border-[#a28321]/30 shadow-sm">
        <span className="voiletImp font35 block text-2xl font-bold">
          3. Hotel Room or Service Apartment
        </span>

        <div className="mt-4">
          <span className="voiletImp font-bold text-lg block mb-2">
            For Travelers & Executives:
          </span>
          <p className="col81d742 leftpad8 mb-1">
            a) Ideal for business travelers, IT professionals on onsite trips, and tourists staying in Bangalore hotels.
          </p>
          <p className="col81d742 leftpad8 mb-1">
            b) Therapist travels straight to your hotel room with full setup.
          </p>
          <p className="col81d742 leftpad8 mb-1">
            c) Assistance with arranging safe, certified partner accommodations available upon request.
          </p>
        </div>
      </div>

      {/* Conclusion & Doorstep summary */}
      <div className="pst my-6 bg-[#f5f0e8] p-6 rounded-lg border-2 border-[#840000] shadow-md">
        <h4 className="text-xl font-bold text-[#840000] mb-2">
          Experience Doorstep Royale Spa Today
        </h4>
        <p className="col81d742 text-base leading-relaxed">
          Doorstep Royale Spa delivers professional, certified massage therapies right to your doorstep anywhere in Bangalore. We offer transparent pricing: <strong>60 Minutes (₹1,799)</strong>, <strong>90 Minutes (₹2,100)</strong>, and <strong>120 Minutes (₹3,400)</strong>. Call us directly or book online to select your preferred therapist and time.
        </p>

        <div className="text-center mt-6 flex flex-wrap justify-center gap-4">
          <button
            id="homeMassageBookBtn"
            type="button"
            className="btn btn-action text-lg px-8 py-3 shadow-md hover:scale-105 transition"
            onClick={() => onNavigate('booking')}
          >
            Book Doorstep Session (From ₹1,799)
          </button>

          <a
            href={`tel:${SPA_PHONE}`}
            className="btn btn-action text-lg px-8 py-3 shadow-md hover:scale-105 transition no-underline inline-flex items-center gap-2 text-[#ffdf88] hover:text-white"
          >
            <span>📞 Call {SPA_PHONE}</span>
          </a>
        </div>
      </div>
    </article>
  );
};
