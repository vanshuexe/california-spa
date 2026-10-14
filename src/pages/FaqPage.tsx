import React from 'react';
import { PageId } from '../types';
import { FAQS } from '../seo/faqs';
import { Link } from '../components/Link';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const FaqPage: React.FC<Props> = ({ onNavigate }) => (
  <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-4xl mx-auto px-4 sm:px-6">
    <div className="border-title text-center my-4">
      <h1>Frequently Asked Questions</h1>
      <div className="ico-border">
        <i className="ico-bg flower"></i>
      </div>
      <span className="tag-line">Home massage in Bangalore: prices, timings, booking and more</span>
    </div>

    <div className="space-y-3 my-6">
      {FAQS.map((f) => (
        <details key={f.q} className="bg-white/60 border border-[#a28321] rounded-lg p-4 group" open>
          <summary className="cursor-pointer font-bold text-[#840000] text-base list-none">
            <h2 className="inline text-base font-bold m-0">{f.q}</h2>
          </summary>
          <p className="mt-2 mb-0 text-sm leading-relaxed text-[#333]">{f.a}</p>
        </details>
      ))}
    </div>

    <div className="text-center my-8 flex flex-wrap justify-center gap-4">
      <Link page="booking" onNavigate={onNavigate} className="btn btn-action px-6 py-2.5 no-underline text-[#ffdf88]">
        Book a Home Massage
      </Link>
      <Link page="contact" onNavigate={onNavigate} className="btn btn-action px-6 py-2.5 no-underline text-[#ffdf88]">
        Contact Us
      </Link>
    </div>
  </article>
);
