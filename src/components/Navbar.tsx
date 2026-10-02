import React, { useState, useEffect } from 'react';
import { PageId } from '../types';
import { SPA_NAME, SPA_TAGLINE, SPA_LOGO_URL } from '../data/siteData';

interface NavbarProps {
  currentPage: PageId;
  onNavigate: (page: PageId) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentPage, onNavigate }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 30);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (e: React.MouseEvent, page: PageId) => {
    e.preventDefault();
    onNavigate(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const navLinks: { label: string; page: PageId }[] = [
    { label: 'Home', page: 'home' },
    { label: 'About', page: 'aboutus' },
    { label: 'Services & Pricing', page: 'services' },
    { label: 'Female Massage', page: 'female-massage' },
    { label: 'Home Spa', page: 'home-massage' },
    { label: 'Testimonials', page: 'testimonials' },
    { label: 'Jobs', page: 'jobs' },
    { label: 'Contact', page: 'contact' },
    { label: 'Chat with Us', page: 'guest' },
    { label: 'LOGIN / BOOK Appt', page: 'booking' },
  ];

  return (
    <nav
      id="mainNavbar"
      className={`navbar navbar-inverse ${isScrolled ? 'nav-scrolled' : ''}`}
    >
      <div className="max-w-7xl mx-auto px-2 sm:px-6 w-full flex items-center justify-between flex-wrap min-[1200px]:flex-nowrap">
        {/* Brand / Logo */}
        <a
          id="navbarBrandLogo"
          href="/"
          onClick={(e) => handleNavClick(e, 'home')}
          className="navbar-brand cursor-pointer flex items-center gap-2.5 py-1 no-underline group"
        >
          <img
            src={SPA_LOGO_URL}
            alt={`${SPA_NAME} Logo`}
            className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover border-2 border-[#a28321] shadow-md shrink-0 bg-[#3a0202] group-hover:scale-105 transition-transform"
            onError={(e) => {
              (e.target as HTMLElement).style.display = 'none';
            }}
          />
          <div className="flex flex-col text-left leading-tight">
            <span className="text-[#840000] font-bold text-lg sm:text-xl tracking-wide uppercase font-['Patrick_Hand',cursive] group-hover:text-[#a00000] transition-colors">
              {SPA_NAME}
            </span>
            <span className="text-[#228b22] text-[10px] sm:text-[11px] font-bold tracking-wider font-sans uppercase">
              {SPA_TAGLINE}
            </span>
          </div>
        </a>

        {/* Quick Phone Call Button (Always Accessible) */}
        <a
          id="navbarDirectCall"
          href="tel:9180471825"
          className="order-2 min-[1200px]:order-3 inline-flex items-center gap-1.5 bg-[#840000] hover:bg-[#990000] text-[#ffdf88] hover:text-white px-3 py-1.5 rounded-full border border-[#a28321] text-xs sm:text-sm font-bold shadow-sm transition mr-1 sm:mr-0 no-underline"
          title="Call Doorstep Royale Spa: 9180471825"
        >
          <span>📞</span>
          <span className="tracking-wide">9180471825</span>
        </a>

        {/* Mobile menu toggle */}
        <button
          id="navbarMobileToggle"
          type="button"
          className="navbar-toggle order-3 min-[1200px]:order-2"
          aria-label="Toggle navigation"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <span className="icon-bar"></span>
          <span className="icon-bar"></span>
          <span className="icon-bar"></span>
        </button>

        {/* Navigation Menu */}
        <div
          id="mainNavCollapse"
          className={`navbar-collapse ${mobileMenuOpen ? 'show' : ''} order-4 min-[1200px]:order-2`}
        >
          <ul className="navbar-nav pull-right">
            {navLinks.map((item) => {
              const isActive =
                currentPage === item.page ||
                (item.page === 'services' && currentPage === 'massage-style');
              return (
                <li
                  key={item.page}
                  className={`${isActive ? 'active' : ''}`}
                >
                  <a
                    id={`navItem-${item.page}`}
                    href={`#${item.page}`}
                    data-page={item.page}
                    onClick={(e) => handleNavClick(e, item.page)}
                  >
                    {item.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </nav>
  );
};
