import React, { useState } from 'react';
import { PageId } from '../types';
import { submitInquiry } from '../lib/inquiries';
import {
  BANGALORE_AREAS,
  SPA_NAME,
  SPA_PHONE,
  SPA_PHONE_2,
  SPA_PHONE_FORMATTED,
  SPA_WHATSAPP_LINK,
  PRICING_DATA,
} from '../data/siteData';

interface ContactPageProps {
  onNavigate: (page: PageId) => void;
  onShowAlert: (title: string, message: string) => void;
}

export const ContactPage: React.FC<ContactPageProps> = ({
  onNavigate,
  onShowAlert,
}) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [area, setArea] = useState(BANGALORE_AREAS[0]);
  const [duration, setDuration] = useState('90 Minutes (₹2,100)');
  const [service, setService] = useState('Swedish Massage');
  const [locationType, setLocationType] = useState('My Home / Apartment');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      onShowAlert('Error', 'Please provide your name and mobile number.');
      return;
    }
    const err = await submitInquiry({
      type: 'contact',
      name,
      mobile,
      email,
      message,
      details: { Area: area, Duration: duration, Service: service, Location: locationType },
    });
    if (err) {
      onShowAlert('Could Not Send', `${err}\n\nPlease call us at ${SPA_PHONE}.`);
      return;
    }
    onShowAlert(
      'Inquiry Sent!',
      `Thank you, ${name}! Your inquiry for Doorstep Royale Spa in ${area} has been received. Our team will call or WhatsApp you at ${mobile} from ${SPA_PHONE} within a few minutes.`
    );
    setName('');
    setMobile('');
    setEmail('');
    setMessage('');
  };

  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-5xl mx-auto px-4 sm:px-6">
      <div className="border-title text-center my-4">
        <h3>Contact Doorstep Royale Spa</h3>
        <div className="ico-border">
          <i className="ico-bg flower"></i>
        </div>
        <span className="tag-line">Luxury Wellness, At Your Doorstep</span>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-6">
        <div className="bg-white/50 p-5 rounded-lg border-2 border-[#840000] text-center shadow-sm">
          <div className="text-3xl mb-2 text-[#b30af3]">📞</div>
          <h4 className="text-lg font-bold text-[#840000] mb-1">Direct Phone & WhatsApp</h4>
          <p className="text-lg font-extrabold text-[#840000] my-1">
            {SPA_PHONE}
            <br />
            {SPA_PHONE_2}
          </p>
          <p className="text-xs text-[#228b22] font-semibold leading-relaxed">
            Instant booking confirmation, therapist availability, and location support.
          </p>
          <a
            href={`tel:${SPA_PHONE}`}
            className="btn btn-action text-xs px-3.5 py-1 mt-2 inline-block no-underline text-[#ffdf88]"
          >
            Call Now
          </a>
        </div>

        <div className="bg-white/50 p-5 rounded-lg border-2 border-[#840000] text-center shadow-sm">
          <div className="text-3xl mb-2 text-[#b30af3]">⏰</div>
          <h4 className="text-lg font-bold text-[#840000] mb-1">Operating Hours</h4>
          <p className="text-sm text-[#228b22] font-semibold leading-relaxed">
            9:00 AM to 7:00 PM<br />
            7 Days a Week (Open on Weekends & Holidays)
          </p>
          <p className="text-xs text-[#840000] font-bold mt-2">
            Coverage Across All Bangalore Areas
          </p>
        </div>

        <div className="bg-white/50 p-5 rounded-lg border-2 border-[#840000] text-center shadow-sm">
          <div className="text-3xl mb-2 text-[#b30af3]">🏷️</div>
          <h4 className="text-lg font-bold text-[#840000] mb-1">Transparent Pricing</h4>
          <p className="text-sm text-[#228b22] font-semibold leading-relaxed">
            60 Mins: ₹1,799<br />
            90 Mins: ₹2,100 (Recommended)<br />
            120 Mins: ₹3,400
          </p>
          <button
            type="button"
            className="btn btn-action text-xs px-3.5 py-1 mt-2"
            onClick={() => onNavigate('services')}
          >
            View Pricing Details
          </button>
          <p className="text-xs text-[#5a0101] mt-2 mb-0 leading-snug">+ Travel (two-way auto fare) at actuals</p>
        </div>
      </div>

      {/* Quick Action Links */}
      <div className="my-6 text-center flex flex-wrap justify-center gap-4">
        <a
          href={`tel:${SPA_PHONE}`}
          className="btn btn-action text-base px-6 py-2.5 inline-flex items-center gap-2 no-underline text-[#ffdf88] hover:text-white shadow"
        >
          <span>📞 Call {SPA_PHONE}</span>
        </a>

        <a
          href={`tel:${SPA_PHONE_2}`}
          className="btn btn-action text-base px-6 py-2.5 inline-flex items-center gap-2 no-underline text-[#ffdf88] hover:text-white shadow"
        >
          <span>📞 Call {SPA_PHONE_2}</span>
        </a>

        <a
          href={SPA_WHATSAPP_LINK}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] hover:bg-[#20ba59] text-white font-bold text-base px-6 py-2.5 rounded-full inline-flex items-center gap-2 no-underline shadow"
        >
          <span>💬 WhatsApp {SPA_PHONE}</span>
        </a>

        <button
          type="button"
          className="btn btn-action text-base px-6 py-2.5 shadow"
          onClick={() => onNavigate('booking')}
        >
          📅 Book Online & Select Therapist
        </button>
      </div>

      {/* Contact & Inquiry Form */}
      <div className="panel max-w-2xl mx-auto my-8 bg-[#f5f0e8] border-2 border-[#840000] p-6 sm:p-8 rounded-lg shadow-md">
        <h4 className="text-center text-2xl font-bold text-[#840000] mb-2">
          Send a Doorstep Booking Inquiry
        </h4>
        <p className="text-center text-sm text-[#228b22] mb-6">
          Our coordinator responds swiftly via phone or WhatsApp. Your privacy is strictly protected.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ctName" className="block text-sm font-bold text-[#840000]">
                Your Name <span className="text-danger">*</span>
              </label>
              <input
                id="ctName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                className="form-control"
              />
            </div>

            <div>
              <label htmlFor="ctMobile" className="block text-sm font-bold text-[#840000]">
                Mobile Number (10 digits) <span className="text-danger">*</span>
              </label>
              <input
                id="ctMobile"
                type="tel"
                maxLength={10}
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9876543210"
                className="form-control"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ctEmail" className="block text-sm font-bold text-[#840000]">
                Email Address
              </label>
              <input
                id="ctEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-control"
              />
            </div>

            <div>
              <label htmlFor="ctArea" className="block text-sm font-bold text-[#840000]">
                Location in Bangalore <span className="text-danger">*</span>
              </label>
              <select
                id="ctArea"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="form-control"
              >
                {BANGALORE_AREAS.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="ctDuration" className="block text-sm font-bold text-[#840000]">
                Duration & Rate
              </label>
              <select
                id="ctDuration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="form-control"
              >
                <option value="60 Minutes (₹1,799)">60 Minutes (₹1,799)</option>
                <option value="90 Minutes (₹2,100)">90 Minutes (₹2,100)</option>
                <option value="120 Minutes (₹3,400)">120 Minutes (₹3,400)</option>
                <option value="30 Minutes Express (₹999)">30 Minutes Express (₹999)</option>
                <option value="45 Minutes Express (₹1,299)">45 Minutes Express (₹1,299)</option>
              </select>
            </div>

            <div>
              <label htmlFor="ctService" className="block text-sm font-bold text-[#840000]">
                Massage Style
              </label>
              <select
                id="ctService"
                value={service}
                onChange={(e) => setService(e.target.value)}
                className="form-control"
              >
                <option value="Swedish Massage">Swedish Massage</option>
                <option value="Deep Tissue Massage">Deep Tissue Massage</option>
                <option value="Aromatherapy Massage">Aromatherapy Massage</option>
                <option value="Relaxation Massage">Relaxation Massage</option>
                <option value="Head, Neck & Shoulder">Head, Neck & Shoulder</option>
                <option value="Foot Massage">Foot Massage</option>
                <option value="Balinese Massage">Balinese Massage</option>
                <option value="Traditional Thai">Traditional Thai</option>
              </select>
            </div>

            <div>
              <label htmlFor="ctLocType" className="block text-sm font-bold text-[#840000]">
                Treatment Setting
              </label>
              <select
                id="ctLocType"
                value={locationType}
                onChange={(e) => setLocationType(e.target.value)}
                className="form-control"
              >
                <option value="My Home / Apartment">My Home / Residence</option>
                <option value="My Hotel Room">My Hotel / Service Apartment</option>
                <option value="Need Hotel Assistance">Need Hotel Assistance (~Rs 1300)</option>
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="ctMsg" className="block text-sm font-bold text-[#840000]">
              Additional Requirements / Health Notes
            </label>
            <textarea
              id="ctMsg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="E.g., preferred therapist gender, upper back tightness, specific landmark..."
              className="form-control"
            />
          </div>

          <div className="text-center pt-3">
            <button
              id="submitContactInquiryBtn"
              type="submit"
              className="btn btn-action text-lg px-8 py-2.5 shadow-md hover:scale-105 transition"
            >
              Submit Doorstep Booking Inquiry
            </button>
          </div>
        </form>
      </div>

      {/* Assurance Note */}
      <div className="bg-[#e8decb] p-5 rounded-lg border border-[#a28321]/50 text-center my-6">
        <p className="font-bold text-[#840000] text-base mb-1">
          Doorstep Royale Spa Guarantee
        </p>
        <p className="text-sm text-[#228b22] m-0 leading-relaxed">
          Every session is conducted with genuine organic herbal oils, disposable fresh linens, clean equipment, and verified professional therapists. Transparent service pricing; the therapist's two-way auto fare is charged separately at actuals.
        </p>
      </div>
    </article>
  );
};
