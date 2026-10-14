import React, { Suspense, lazy, useState, useEffect } from 'react';
import { PageId } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SpaMusicPlayer } from './components/SpaMusicPlayer';
import { HelpChatWidget } from './components/HelpChatWidget';
import { GlobalModal, AlertState, ConfirmState } from './components/GlobalModal';
import { ChatNotifier } from './components/ChatNotifier';
import { applySeo } from './seo/head';
import { getSeo } from './seo/meta';
import { pageForLegacyHash, pageForPath, pathForPage } from './seo/routes';

// Pages
import { HomePage } from './pages/HomePage';
import { AboutUsPage } from './pages/AboutUsPage';
import { MassageStylePage } from './pages/MassageStylePage';
import { FemaleMassagePage } from './pages/FemaleMassagePage';
import { HomeMassagePage } from './pages/HomeMassagePage';
import { TestimonialsPage } from './pages/TestimonialsPage';
import { JobsPage } from './pages/JobsPage';
import { ContactPage } from './pages/ContactPage';
import { GuestChatPage } from './pages/GuestChatPage';
import { BookingPage } from './pages/BookingPage';
import { FaqPage } from './pages/FaqPage';
import { ServicePage } from './pages/ServicePage';
import { AreaPage } from './pages/AreaPage';
import { NotFoundPage } from './pages/NotFoundPage';

// Staff areas are not indexed and are only needed by a few people: load them on demand.
const AdminPage = lazy(() => import('./pages/AdminPage').then((m) => ({ default: m.AdminPage })));
const TherapistPage = lazy(() => import('./pages/TherapistPage').then((m) => ({ default: m.TherapistPage })));

const PageLoading = () => <div className="p-10 text-center text-[#840000]">Loading…</div>;

// Works in the browser and during pre-rendering (no window there).
function getInitialPage(): PageId {
  if (typeof window === 'undefined') return 'home';
  // Old links like /#booking keep working: move them to the real URL.
  const legacy = pageForLegacyHash(window.location.hash);
  if (legacy && window.location.hash.length > 1) {
    window.history.replaceState(null, '', pathForPage(legacy));
    return legacy;
  }
  return pageForPath(window.location.pathname);
}

interface AppProps {
  /** Set by the pre-renderer so each page is rendered without a browser. */
  initialPage?: PageId;
}

export default function App({ initialPage }: AppProps) {
  const [currentPage, setCurrentPage] = useState<PageId>(() => initialPage ?? getInitialPage());

  // Global modals
  const [alertState, setAlertState] = useState<AlertState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const [confirmState, setConfirmState] = useState<ConfirmState>({
    isOpen: false,
    title: '',
    message: '',
  });

  const showAlert = (title: string, message: string) => {
    setAlertState({ isOpen: true, title, message });
  };

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = () => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
  };

  // The top navbar is fixed and its height changes with screen size (it is much taller on
  // desktop), so the spacer under it follows its real height. Otherwise the top of every page
  // (e.g. the admin tabs) hides behind the navbar.
  const [spacerHeight, setSpacerHeight] = useState(90);
  useEffect(() => {
    const nav = document.querySelector<HTMLElement>('.navbar.navbar-inverse');
    if (!nav) return;
    const update = () => setSpacerHeight(Math.max(90, Math.ceil(nav.getBoundingClientRect().height)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(nav);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, []);

  // Back / forward buttons, and any old #hash links that appear later.
  useEffect(() => {
    const onPop = () => setCurrentPage(pageForPath(window.location.pathname));
    const onHash = () => {
      const legacy = pageForLegacyHash(window.location.hash);
      if (legacy && window.location.hash.length > 1) {
        window.history.replaceState(null, '', pathForPage(legacy));
        setCurrentPage(legacy);
      }
    };
    window.addEventListener('popstate', onPop);
    window.addEventListener('hashchange', onHash);
    return () => {
      window.removeEventListener('popstate', onPop);
      window.removeEventListener('hashchange', onHash);
    };
  }, []);

  // Keep title, description, canonical, robots, Open Graph and structured data in sync.
  useEffect(() => {
    applySeo(getSeo(currentPage));
    // @ts-expect-error gtag is only present when Google Analytics is configured
    if (typeof window.gtag === 'function') window.gtag('event', 'page_view', { page_path: pathForPage(currentPage) });
  }, [currentPage]);

  const handleNavigate = (page: PageId) => {
    const target: PageId = page === 'massage-style' ? 'services' : page;
    const path = pathForPage(target);
    if (window.location.pathname !== path) window.history.pushState(null, '', path);
    setCurrentPage(target);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSocialShare = (network: string) => {
    const shareTarget = getSeo(currentPage).canonical;
    const url = encodeURIComponent(shareTarget);
    const title = encodeURIComponent('Doorstep Royale Spa - Luxury Wellness, At Your Doorstep');

    let shareUrl = '';
    if (network === 'Facebook') {
      shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    } else if (network === 'Twitter') {
      shareUrl = `https://twitter.com/intent/tweet?url=${url}&text=${title}`;
    } else if (network === 'LinkedIn') {
      shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
    } else {
      shareUrl = `https://plus.google.com/share?url=${url}`;
    }

    // Open share window safely or show copy message
    try {
      window.open(shareUrl, '_blank', 'width=600,height=400,noopener,noreferrer');
    } catch {
      showAlert('Share', `Share Doorstep Royale Spa on ${network}: ${shareTarget}`);
    }
  };

  return (
    <div className="home min-h-screen flex flex-col justify-between">
      {/* Top Navbar */}
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Top spacer matching original site's #head.secondary */}
      <header
        id="head"
        className="secondary"
        aria-hidden="true"
        style={{ height: spacerHeight, minHeight: spacerHeight }}
      ></header>

      {/* Main Container */}
      <main className="container mx-auto px-2 sm:px-4 py-4 flex-1">
        <div className="row flex justify-center">
          {currentPage === 'home' && <HomePage onNavigate={handleNavigate} />}
          {currentPage === 'aboutus' && <AboutUsPage onNavigate={handleNavigate} />}
          {(currentPage === 'massage-style' || currentPage === 'services') && (
            <MassageStylePage onNavigate={handleNavigate} />
          )}
          {currentPage === 'female-massage' && <FemaleMassagePage onNavigate={handleNavigate} />}
          {currentPage === 'home-massage' && <HomeMassagePage onNavigate={handleNavigate} />}
          {currentPage === 'testimonials' && (
            <TestimonialsPage onNavigate={handleNavigate} onShowAlert={showAlert} />
          )}
          {currentPage === 'jobs' && (
            <JobsPage onNavigate={handleNavigate} onShowAlert={showAlert} />
          )}
          {currentPage === 'contact' && (
            <ContactPage onNavigate={handleNavigate} onShowAlert={showAlert} />
          )}
          {currentPage === 'guest' && (
            <GuestChatPage onNavigate={handleNavigate} onShowAlert={showAlert} />
          )}
          {(currentPage === 'booking' || currentPage === 'login' || currentPage === 'register') && (
            <BookingPage onNavigate={handleNavigate} onShowAlert={showAlert} />
          )}
          {currentPage === 'faq' && <FaqPage onNavigate={handleNavigate} />}
          {currentPage.startsWith('service:') && (
            <ServicePage slug={currentPage.slice(8)} onNavigate={handleNavigate} />
          )}
          {currentPage.startsWith('area:') && (
            <AreaPage slug={currentPage.slice(5)} onNavigate={handleNavigate} />
          )}
          {currentPage === 'not-found' && <NotFoundPage onNavigate={handleNavigate} />}
          {currentPage === 'admin' && (
            <Suspense fallback={<PageLoading />}>
              <AdminPage />
            </Suspense>
          )}
          {currentPage === 'therapist' && (
            <Suspense fallback={<PageLoading />}>
              <TherapistPage />
            </Suspense>
          )}
        </div>
      </main>

      {/* Floating help chat (hidden on the admin page) */}
      {currentPage !== 'admin' && <HelpChatWidget onNavigate={handleNavigate} />}

      {/* New chat message toasts for signed-in customers / therapists */}
      <ChatNotifier onNavigate={handleNavigate} />

      {/* Background Spa Music Player */}
      <SpaMusicPlayer />

      {/* Global Alerts & Confirms */}
      <GlobalModal
        alertState={alertState}
        onCloseAlert={closeAlert}
        confirmState={confirmState}
        onCloseConfirm={closeConfirm}
        onConfirmAction={handleConfirmAction}
      />

      {/* Footer */}
      <Footer onNavigate={handleNavigate} onShare={handleSocialShare} />
    </div>
  );
}
