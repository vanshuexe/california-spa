import React from 'react';
import { PageId } from '../types';
import { EXPRESS_PRICING_DATA, PRICING_DATA, SERVICES_DATA, SPA_PHONE, SPA_PHONE_2 } from '../data/siteData';
import { AREAS, areaBySlug } from '../seo/areas';
import { SERVICE_SLUGS } from '../seo/routes';
import { Link } from '../components/Link';
import { TravelNotice } from '../components/TravelNotice';
import { NotFoundPage } from './NotFoundPage';

interface Props {
  slug: string;
  onNavigate: (page: PageId) => void;
}

export const AreaPage: React.FC<Props> = ({ slug, onNavigate }) => {
  const area = areaBySlug(slug);
  if (!area) return <NotFoundPage onNavigate={onNavigate} />;
  const tiers = [...EXPRESS_PRICING_DATA, ...PRICING_DATA];
  const nearby = area.nearby.map((s) => areaBySlug(s)).filter(Boolean);

  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-4xl mx-auto px-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="text-xs text-[#5a0101] mt-2">
        <Link page="home" onNavigate={onNavigate} className="underline">Home</Link> › Home Massage in {area.name}
      </nav>

      <div className="border-title text-center my-4">
        <h1>Home Massage in {area.name}, Bangalore</h1>
        <div className="ico-border">
          <i className="ico-bg flower"></i>
        </div>
        <span className="tag-line">Professional therapists at your doorstep, 9 AM to 10 PM daily</span>
      </div>

      <section className="bg-white/60 rounded-xl border border-[#a28321] p-5 my-4">
        <h2 className="text-xl font-bold text-[#840000] mb-2">Massage at home in {area.name}</h2>
        <p className="text-sm leading-relaxed">{area.about}</p>
        <p className="text-sm leading-relaxed mt-2">
          Doorstep Royale Spa brings a trained massage therapist to your home, apartment or hotel room in {area.name} ({area.zone}).
          There is no travel, no waiting and no traffic for you: book online, pay a small advance securely, and relax in your own space
          with fresh linen, oils and professional equipment provided by the therapist.
        </p>
      </section>

      <section className="bg-white/60 rounded-xl border border-[#a28321] p-5 my-4">
        <h2 className="text-xl font-bold text-[#840000] mb-2">Massage styles available in {area.name}</h2>
        <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-sm p-0 list-none">
          {SERVICES_DATA.map((s) => (
            <li key={s.id}>
              <Link page={`service:${SERVICE_SLUGS[s.id]}`} onNavigate={onNavigate} className="underline text-[#840000] font-semibold">
                {s.name}
              </Link>{' '}
              <span className="text-[#228b22]">({s.duration})</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="bg-white/60 rounded-xl border border-[#a28321] p-5 my-4">
        <h2 className="text-xl font-bold text-[#840000] mb-3">Prices in {area.name}</h2>
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
            Book a Massage in {area.name}
          </Link>
        </div>
      </section>

      <section className="bg-white/60 rounded-xl border border-[#a28321] p-5 my-4">
        <h2 className="text-xl font-bold text-[#840000] mb-2">Booking in {area.name}: common questions</h2>
        <h3 className="text-base font-bold text-[#5a0101] mt-2">Do you serve {area.name}?</h3>
        <p className="text-sm leading-relaxed">
          Yes. Select "{area.fullName}" as your area while booking. If you are unsure whether your exact address is covered, call{' '}
          <a href={`tel:${SPA_PHONE}`}>{SPA_PHONE}</a> or <a href={`tel:${SPA_PHONE_2}`}>{SPA_PHONE_2}</a>.
        </p>
        <h3 className="text-base font-bold text-[#5a0101] mt-2">What time can I book in {area.name}?</h3>
        <p className="text-sm leading-relaxed">
          Sessions are available every day from 9:00 AM to 10:00 PM, including weekends and holidays.
        </p>
        <h3 className="text-base font-bold text-[#5a0101] mt-2">Are travel charges included?</h3>
        <p className="text-sm leading-relaxed">
          No. The therapist's two-way auto fare is paid by the client at the actual fare. See our{' '}
          <Link page="faq" onNavigate={onNavigate} className="underline">FAQs</Link> for details.
        </p>
      </section>

      {nearby.length > 0 && (
        <section className="my-4">
          <h2 className="text-lg font-bold text-[#840000] mb-2">Also serving nearby areas</h2>
          <ul className="flex flex-wrap gap-2 p-0 list-none">
            {nearby.map((a) => (
              <li key={a!.slug}>
                <Link
                  page={`area:${a!.slug}`}
                  onNavigate={onNavigate}
                  className="inline-block px-3 py-1.5 rounded-full border border-[#840000] text-[#840000] text-sm no-underline hover:bg-[#840000] hover:text-white"
                >
                  Home massage in {a!.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="my-4">
        <h2 className="text-lg font-bold text-[#840000] mb-2">All areas we serve in Bangalore</h2>
        <ul className="flex flex-wrap gap-2 p-0 list-none">
          {AREAS.filter((a) => a.slug !== area.slug).map((a) => (
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
    </article>
  );
};
