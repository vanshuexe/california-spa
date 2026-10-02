import React, { useState } from 'react';
import { PageId, TestimonialItem } from '../types';
import { TESTIMONIALS_DATA, SPA_NAME, SPA_PHONE } from '../data/siteData';

interface TestimonialsPageProps {
  onNavigate: (page: PageId) => void;
  onShowAlert: (title: string, message: string) => void;
}

export const TestimonialsPage: React.FC<TestimonialsPageProps> = ({
  onNavigate,
  onShowAlert,
}) => {
  const [testimonials, setTestimonials] = useState<TestimonialItem[]>(TESTIMONIALS_DATA);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [newInitials, setNewInitials] = useState('');
  const [newQuote, setNewQuote] = useState('');

  const handleReviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInitials.trim() || !newQuote.trim()) {
      onShowAlert('Notice', 'Please provide your initials and review feedback.');
      return;
    }
    const newItem: TestimonialItem = {
      id: `t-${Date.now()}`,
      initials: newInitials.toUpperCase().slice(0, 3),
      quote: newQuote.trim(),
      rating: 5,
    };
    setTestimonials([newItem, ...testimonials]);
    setNewInitials('');
    setNewQuote('');
    setShowReviewForm(false);
    onShowAlert(
      'Thank You!',
      'Thank you for your valuable feedback. Your review has been submitted successfully to Doorstep Royale Spa!'
    );
  };

  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-5xl mx-auto px-4 sm:px-6">
      {/* Top Graphic */}
      <div className="text-center my-4">
        <img
          src="/assets/images/testimonials1-300x297.png"
          alt="Doorstep Royale Spa Client Testimonials"
          className="mx-auto max-w-[220px] h-auto drop-shadow"
          onError={(e) => {
            (e.target as HTMLImageElement).src =
              'https://californiamassage.in/assets/images/testimonials1-300x297.png';
          }}
        />
      </div>

      <div className="pst text-center my-4">
        <h3 className="text-3xl font-bold text-[#840000]">Client Testimonials</h3>
        <div className="ico-border">
          <i className="ico-bg flower"></i>
        </div>
      </div>

      <div className="text-center mb-6">
        <span className="voiletImp tag-line block text-2xl font-normal">
          (Verbatim unedited verifiable feedback from verified clients across Bangalore)
        </span>
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4 mb-8">
        <button
          id="toggleReviewFormBtn"
          type="button"
          className="btn btn-action"
          onClick={() => setShowReviewForm(!showReviewForm)}
        >
          {showReviewForm ? 'Close Review Form' : 'Submit Your Feedback'}
        </button>
        <button
          id="testimonialsBookBtn"
          type="button"
          className="btn btn-action shadow"
          onClick={() => onNavigate('booking')}
        >
          Book Your Appointment Now (From ₹1,799)
        </button>
        <a
          href={`tel:${SPA_PHONE}`}
          className="btn btn-action shadow no-underline inline-flex items-center gap-2 text-[#ffdf88] hover:text-white"
        >
          <span>📞 Call {SPA_PHONE}</span>
        </a>
      </div>

      {/* Optional Interactive Review Form */}
      {showReviewForm && (
        <div className="panel max-w-xl mx-auto mb-8 bg-[#f5f0e8] border-2 border-[#840000] p-6 rounded-lg shadow-md">
          <h4 className="text-center text-xl font-bold text-[#840000] mb-3">
            Share Your Experience with Doorstep Royale Spa
          </h4>
          <form onSubmit={handleReviewSubmit} className="space-y-4">
            <div>
              <label htmlFor="revInitials" className="block text-sm font-bold text-[#840000]">
                Your Initials or Name (e.g. RK, AJ) <span className="text-danger">*</span>
              </label>
              <input
                id="revInitials"
                type="text"
                maxLength={10}
                required
                value={newInitials}
                onChange={(e) => setNewInitials(e.target.value)}
                placeholder="SN"
                className="form-control"
              />
            </div>
            <div>
              <label htmlFor="revQuote" className="block text-sm font-bold text-[#840000]">
                Your Verbatim Feedback <span className="text-danger">*</span>
              </label>
              <textarea
                id="revQuote"
                rows={3}
                required
                value={newQuote}
                onChange={(e) => setNewQuote(e.target.value)}
                placeholder="Write your honest review here..."
                className="form-control"
              />
            </div>
            <div className="text-right">
              <button id="submitFeedbackBtn" type="submit" className="btn btn-action">
                Publish Feedback
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Two-Column Testimonials List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 my-4">
        {testimonials.map((item, idx) => (
          <div
            key={item.id || idx}
            className="bg-white/50 p-5 rounded-lg border border-[#a28321]/40 flex flex-col justify-between shadow-sm hover:shadow transition"
          >
            <div className="text-left leftpad8 mb-3">
              <span className="font29 block leading-relaxed text-[#228b22]">
                "{item.quote}"
              </span>
            </div>
            <div className="flex items-center justify-between border-t border-[#a28321]/20 pt-2 mt-auto">
              <h2 className="voiletImp font35 text-2xl font-bold m-0">
                {item.initials}
              </h2>
              <span className="text-amber-600 font-bold text-sm">★★★★★</span>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center my-8 flex flex-wrap justify-center gap-4">
        <button
          type="button"
          className="btn btn-action text-lg px-8 py-3 shadow-md hover:scale-105 transition"
          onClick={() => onNavigate('booking')}
        >
          Experience Doorstep Royale Spa in Bangalore
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
