import React from 'react';
import { PageId } from '../types';
import { Link } from '../components/Link';

interface Props {
  onNavigate: (page: PageId) => void;
}

export const NotFoundPage: React.FC<Props> = ({ onNavigate }) => (
  <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-3xl mx-auto px-4 text-center my-10">
    <div className="border-title text-center my-4">
      <h1>Page not found</h1>
      <div className="ico-border">
        <i className="ico-bg flower"></i>
      </div>
    </div>
    <p className="text-base text-[#333] leading-relaxed">
      Sorry, we could not find that page. You can head back to the home page, see our services and prices, or book a
      home massage in Bangalore.
    </p>
    <div className="my-6 flex flex-wrap justify-center gap-4">
      <Link page="home" onNavigate={onNavigate} className="btn btn-action px-6 py-2.5 no-underline text-[#ffdf88]">
        Home
      </Link>
      <Link page="services" onNavigate={onNavigate} className="btn btn-action px-6 py-2.5 no-underline text-[#ffdf88]">
        Services & Pricing
      </Link>
      <Link page="booking" onNavigate={onNavigate} className="btn btn-action px-6 py-2.5 no-underline text-[#ffdf88]">
        Book Now
      </Link>
    </div>
  </article>
);
