import React from 'react';
import { PageId } from '../types';
import { EXPRESS_PRICING_DATA, PRICING_DATA, SERVICES_DATA, SPA_PHONE, SPA_PHONE_2 } from '../data/siteData';
import { AREAS } from '../seo/areas';
import { SERVICE_SLUGS, serviceBySlug } from '../seo/routes';
import { Link } from '../components/Link';
import { TravelNotice } from '../components/TravelNotice';
import { NotFoundPage } from './NotFoundPage';

interface Props {
  slug: string;
  onNavigate: (page: PageId) => void;
}

// What each treatment involves (plain descriptions, no medical claims).
const DETAILS: Record<string, string> = {
  swedish:
    'Swedish massage uses long gliding strokes, kneading and gentle circular movements along the muscles, usually with light to medium pressure. It is the most popular choice for first-time guests.',
  'deep-tissue':
    'Deep tissue massage uses slower strokes and firmer pressure to work on the deeper layers of muscle. Tell your therapist how the pressure feels so it stays firm but comfortable.',
  aromatherapy:
    'Aromatherapy massage combines gentle massage strokes with aromatic oils chosen for their scent, creating a calm, unhurried atmosphere in your own room.',
  relaxation:
    'Relaxation massage is slow and gentle, with light to medium pressure, designed to help you switch off after a long day.',
  'head-neck-shoulder':
    'This focused session works on the scalp, neck, shoulders and upper back, the areas that tighten most with desk work and long hours on screens. Shorter durations make it easy to fit in during the day.',
  foot:
    'Foot massage concentrates on the feet and lower legs, applying pressure to reflexology points. It is a quick way to refresh tired feet after a day of standing or walking.',
  balinese:
    'Balinese massage blends gentle stretches, acupressure, skin rolling and aromatic oils in a flowing sequence inspired by traditional Indonesian techniques.',
  thai:
    'Traditional Thai massage is done without oil, usually over comfortable clothing, using assisted stretching and rhythmic compression to improve flexibility and loosen stiff joints.',
};

export const ServicePage: React.FC<Props> = ({ slug, onNavigate }) => {
  const svc = serviceBySlug(slug);
  if (!svc) return <NotFoundPage onNavigate={onNavigate} />;

  const short = /30 \//.test(svc.duration);
  const tiers = short ? [...EXPRESS_PRICING_DATA, PRICING_DATA[0]] : PRICING_DATA;
  const others = SERVICES_DATA.filter((s) => s.id !== svc.id);

  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-4xl mx-auto px-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-xs text-[#5a0101] mt-2">
        <Link page="home" onNavigate={onNavigate} className="underline">Home</Link> ›{' '}
        <Link page="services" onNavigate={onNavigate} className="underline">Services & Pricing</Link> › {svc.name}
      </nav>

      <div className="border-title text-center my-4">
        <h1>{svc.name} at Home in Bangalore</h1>
        <div className="ico-border">
          <i className="ico-bg flower"></i>
        </div>
        <span className="tag-line">{svc.description}</span>
      </div>

      <section className="bg-white/60 rounded-xl border border-[#a28321] p-5 my-4">
        <h2 className="text-xl font-bold text-[#840000] mb-2">About {svc.name}</h2>
        <p className="text-sm leading-relaxed">{DETAILS[svc.id] ?? svc.description}</p>
        {svc.recommendedFor && (
          <p className="text-sm leading-relaxed mt-2">
            <strong>Good for:</strong> {svc.recommendedFor}
          </p>
        )}
        <p className="text-sm leading-relaxed mt-2">
          Doorstep Royale Spa brings this treatment to your home, apartment or hotel room anywhere in Bangalore. Your
          therapist arrives with fresh linen, oils and equipment, sets up in about ten minutes and leaves the room as
          you found it.
        </p>
      </section>

      <section className="bg-white/60 rounded-xl border border-[#a28321] p-5 my-4">
        <h2 className="text-xl font-bold text-[#840000] mb-3">{svc.name} prices in Bangalore</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-[#840000] text-[#840000]">
                <th className="py-2 px-3">Duration</th>
                <th className="py-2 px-3">Service fee</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#a28321]/30">
              {tiers.map((t) => (
                <tr key={t.duration}>
                  <td className="py-2 px-3">{t.duration}</td>
                  <td className="py-2 px-3 font-bold text-[#840000]">{t.formatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <TravelNotice compact className="mt-4" />
        <div className="text-center mt-4">
          <Link page="booking" onNavigate={onNavigate} className="btn btn-action px-6 py-2.5 no-underline text-[#ffdf88]">
            Book {svc.name}
          </Link>
        </div>
      </section>

      <section className="bg-white/60 rounded-xl border border-[#a28321] p-5 my-4">
        <h2 className="text-xl font-bold text-[#840000] mb-2">How it works</h2>
        <ol className="list-decimal pl-5 text-sm leading-relaxed space-y-1">
          <li>Choose your duration, therapist, date, time and area on the booking page.</li>
          <li>Pay a ₹500 or ₹1,000 advance online securely. Your booking is confirmed as soon as the advance is verified, and the balance is paid on the day of service.</li>
          <li>A therapist is assigned and you can chat with them from My Account about arrival and instructions.</li>
          <li>The therapist arrives, sets up and delivers your session. Open daily 9 AM to 10 PM.</li>
        </ol>
      </section>

      <section className="my-4">
        <h2 className="text-lg font-bold text-[#840000] mb-2">Other massage styles</h2>
        <ul className="flex flex-wrap gap-2 p-0 list-none">
          {others.map((s) => (
            <li key={s.id}>
              <Link
                page={`service:${SERVICE_SLUGS[s.id]}`}
                onNavigate={onNavigate}
                className="inline-block px-3 py-1.5 rounded-full border border-[#840000] text-[#840000] text-sm no-underline hover:bg-[#840000] hover:text-white"
              >
                {s.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="my-4">
        <h2 className="text-lg font-bold text-[#840000] mb-2">{svc.name} across Bangalore</h2>
        <ul className="flex flex-wrap gap-2 p-0 list-none">
          {AREAS.map((a) => (
            <li key={a.slug}>
              <Link
                page={`area:${a.slug}`}
                onNavigate={onNavigate}
                className="inline-block px-3 py-1.5 rounded-full bg-[#e8decb] text-[#5a0101] text-sm no-underline hover:bg-[#d9c9a7]"
              >
                {a.name}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <p className="text-center text-sm my-6">
        Questions? Call <a href={`tel:${SPA_PHONE}`}>{SPA_PHONE}</a> or <a href={`tel:${SPA_PHONE_2}`}>{SPA_PHONE_2}</a>, or read
        our <Link page="faq" onNavigate={onNavigate} className="underline">FAQs</Link>.
      </p>
    </article>
  );
};
