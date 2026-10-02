import React, { useState, useEffect } from 'react';
import { PageId } from './types';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { SpaMusicPlayer } from './components/SpaMusicPlayer';
import { HelpChatWidget } from './components/HelpChatWidget';
import { GlobalModal, AlertState, ConfirmState } from './components/GlobalModal';

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
import { AdminPage } from './pages/AdminPage';

function getPageFromHash(): PageId {
  const hash = window.location.hash.replace(/^#\/?/, '').trim();
  const validPages: PageId[] = [
    'home',
    'aboutus',
    'massage-style',
    'female-massage',
    'home-massage',
    'testimonials',
    'jobs',
    'contact',
    'guest',
    'booking',
    'login',
    'register',
    'admin',
  ];
  if (validPages.includes(hash as PageId)) {
    return hash as PageId;
  }
  return 'home';
}

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageId>(getPageFromHash);

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

  const showConfirm = (title: string, message: string, onConfirm?: () => void) => {
    setConfirmState({ isOpen: true, title, message, onConfirm });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({ ...prev, isOpen: false }));
  };

  const handleConfirmAction = () => {
    if (confirmState.onConfirm) {
      confirmState.onConfirm();
    }
  };

  // Sync with browser hash
  useEffect(() => {
    const handleHashChange = () => {
      const page = getPageFromHash();
      setCurrentPage(page);
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleNavigate = (page: PageId) => {
    setCurrentPage(page);
    window.location.hash = page;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSocialShare = (network: string) => {
    const url = encodeURIComponent(window.location.origin || 'https://californiamassage.in');
    const title = encodeURIComponent(
      'Doorstep Royale Spa - Luxury Wellness, At Your Doorstep'
    );

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
      showAlert('Share', `Share California Spa on ${network}: ${window.location.origin}`);
    }
  };

  return (
    <div className="home min-h-screen flex flex-col justify-between">
      {/* Top Navbar */}
      <Navbar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Top spacer matching original site's #head.secondary */}
      <header id="head" className="secondary" aria-hidden="true"></header>

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
          {currentPage === 'admin' && <AdminPage />}
        </div>
      </main>

      {/* Floating help chat (hidden on the admin page) */}
      {currentPage !== 'admin' && <HelpChatWidget onNavigate={handleNavigate} />}

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
