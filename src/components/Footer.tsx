import React from 'react';
import { PageId } from '../types';
import { SPA_NAME, SPA_LOGO_URL, SERVICES_DATA } from '../data/siteData';
import { AREAS } from '../seo/areas';
import { SERVICE_SLUGS } from '../seo/routes';
import { Link } from './Link';

interface FooterProps {
  onNavigate: (page: PageId) => void;
  onShare: (network: string) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onShare }) => {
  const handleLink = (e: React.MouseEvent, page: PageId) => {
    e.preventDefault();
    onNavigate(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <footer id="footer" className="top-space">
      {/* Top social sharing strip */}
      <div className="footer3 pdgbtm30">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center mb-6">
            <div className="ico-border">
              <i className="ico-bg flower"></i>
            </div>
          </div>

          <div className="social-sharing">
            <button
              id="shareFacebookBtn"
              type="button"
              className="button-facebook"
              onClick={() => onShare('Facebook')}
            >
              Share on Facebook
            </button>
            <button
              id="shareTwitterBtn"
              type="button"
              className="button-twitter"
              onClick={() => onShare('Twitter')}
            >
              Share on Twitter
            </button>
            <button
              id="shareGooglePlusBtn"
              type="button"
              className="button-googleplus"
              onClick={() => onShare('Google+')}
            >
              Share on Google+
            </button>
            <button
              id="shareLinkedinBtn"
              type="button"
              className="button-linkedin"
              onClick={() => onShare('LinkedIn')}
            >
              Share on Linkedin
            </button>
          </div>
        </div>
      </div>

      {/* Navigation bar and Need Help box */}
      <div className="footer2">
        <div className="max-w-6xl mx-auto px-4">
          <div className="flex flex-col items-center justify-center pt-2 mb-4">
            <img
              src={SPA_LOGO_URL}
              alt={`${SPA_NAME} Logo`}
              className="w-12 h-12 rounded-full object-cover border-2 border-[#a28321] shadow mb-1.5 bg-[#3a0202]"
              onError={(e) => {
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="text-[#ffdf88] font-bold text-lg uppercase tracking-wider font-['Patrick_Hand',cursive]">
              {SPA_NAME}
            </span>
          </div>

          <div className="widget mb-4">
            <div className="widget-body">
              <p className="simplenav font25 text-center flex flex-wrap justify-center items-center gap-x-2 gap-y-1">
                <a
                  id="footerLink-home"
                  href="/"
                  onClick={(e) => handleLink(e, 'home')}
                >
                  Home
                </a>
                <span>|</span>
                <a
                  id="footerLink-aboutus"
                  href="/about-us/"
                  onClick={(e) => handleLink(e, 'aboutus')}
                >
                  About
                </a>
                <span>|</span>
                <a
                  id="footerLink-services"
                  href="/services-pricing/"
                  onClick={(e) => handleLink(e, 'services')}
                >
                  Services & Pricing
                </a>
                <span>|</span>
                <a
                  id="footerLink-female-massage"
                  href="/female-massage-bangalore/"
                  onClick={(e) => handleLink(e, 'female-massage')}
                >
                  Female Therapists
                </a>
                <span>|</span>
                <a
                  id="footerLink-home-massage"
                  href="/home-spa-massage-bangalore/"
                  onClick={(e) => handleLink(e, 'home-massage')}
                >
                  Home Spa
                </a>
                <span>|</span>
                <a
                  id="footerLink-testimonials"
                  href="/testimonials/"
                  onClick={(e) => handleLink(e, 'testimonials')}
                >
                  Testimonials
                </a>
                <span>|</span>
                <a
                  id="footerLink-jobs"
                  href="/jobs/"
                  onClick={(e) => handleLink(e, 'jobs')}
                >
                  Jobs
                </a>
                <span>|</span>
                <a
                  id="footerLink-contact"
                  href="/contact/"
                  onClick={(e) => handleLink(e, 'contact')}
                >
                  Contact
                </a>
                <span>|</span>
                <a
                  id="footerLink-faq"
                  href="/faq/"
                  onClick={(e) => handleLink(e, 'faq')}
                >
                  FAQ
                </a>
                <span>|</span>
                <a
                  id="footerLink-booking"
                  href="/book-appointment/"
                  data-page="booking"
                  onClick={(e) => handleLink(e, 'booking')}
                >
                  LOGIN / BOOK Appt
                </a>
              </p>
            </div>
          </div>

          <nav aria-label="Massage services" className="text-center mb-4">
            <h2 className="text-[#ffdf88] text-sm font-bold uppercase tracking-wide mb-1">Massage Services</h2>
            <p className="simplenav text-xs flex flex-wrap justify-center gap-x-3 gap-y-1 m-0">
              {SERVICES_DATA.map((s) => (
                <Link key={s.id} page={`service:${SERVICE_SLUGS[s.id]}`} onNavigate={onNavigate} onAfterClick={() => window.scrollTo({ top: 0 })}>
                  {s.name}
                </Link>
              ))}
            </p>
          </nav>

          <nav aria-label="Areas we serve in Bangalore" className="text-center mb-4">
            <h2 className="text-[#ffdf88] text-sm font-bold uppercase tracking-wide mb-1">Home Massage Across Bangalore</h2>
            <p className="simplenav text-xs flex flex-wrap justify-center gap-x-3 gap-y-1 m-0">
              {AREAS.map((a) => (
                <Link key={a.slug} page={`area:${a.slug}`} onNavigate={onNavigate} onAfterClick={() => window.scrollTo({ top: 0 })}>
                  {a.name}
                </Link>
              ))}
            </p>
          </nav>

          <div className="text-center mt-6 flex flex-wrap items-center justify-center gap-4">
            <button
              id="footerNeedHelpBtn"
              type="button"
              className="box1 effect1 text-center inline-block cursor-pointer bg-transparent hover:opacity-90 transition"
              onClick={(e) => handleLink(e, 'guest')}
            >
              <strong>
                <span className="gspan">
                  NEED HELP{' '}
                  <span style={{ color: 'inherit', textDecoration: 'underline' }}>
                    chat with Admin
                  </span>
                </span>
              </strong>
            </button>

            <a
              id="footerCallBtn"
              href="tel:9180471825"
              className="btn btn-action text-sm px-5 py-2 inline-flex items-center gap-2 no-underline text-[#ffdf88] hover:text-white"
            >
              <span>📞 9180471825</span>
            </a>
            <a
              id="footerCallBtn2"
              href="tel:9972459417"
              className="btn btn-action text-sm px-5 py-2 inline-flex items-center gap-2 no-underline text-[#ffdf88] hover:text-white"
            >
              <span>📞 9972459417</span>
            </a>
          </div>

          <div className="text-center mt-4 text-[#cfb687] text-xs font-sans">
            © {new Date().getFullYear()} Doorstep Royale Spa. Luxury Wellness, At Your Doorstep. All Rights Reserved. Professional Doorstep Home Spa Services across Bangalore.
          </div>
        </div>
      </div>
    </footer>
  );
};
