import React, { useState } from 'react';
import { PageId } from '../types';
import { SPA_NAME, SPA_PHONE } from '../data/siteData';
import { submitInquiry } from '../lib/inquiries';

interface JobsPageProps {
  onNavigate: (page: PageId) => void;
  onShowAlert: (title: string, message: string) => void;
}

export const JobsPage: React.FC<JobsPageProps> = ({ onNavigate, onShowAlert }) => {
  const [role, setRole] = useState('SPA Therapist');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Female');
  const [mobile, setMobile] = useState('');
  const [email, setEmail] = useState('');
  const [experience, setExperience] = useState('Fresher OK');
  const [workType, setWorkType] = useState('Full Time');
  const [notes, setNotes] = useState('');

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !mobile.trim()) {
      onShowAlert('Missing Information', 'Please provide at least your Name and Mobile Number.');
      return;
    }

    const err = await submitInquiry({
      type: 'job',
      name,
      mobile,
      email,
      message: notes,
      details: { Role: role, Age: age, Gender: gender, Experience: experience, 'Work Type': workType },
    });
    if (err) {
      onShowAlert('Could Not Submit', `${err}\n\nPlease call us at ${SPA_PHONE}.`);
      return;
    }

    onShowAlert(
      'Application Received!',
      `Thank you, ${name}! Your application for "${role}" has been submitted to Doorstep Royale Spa management. Our recruitment team will contact you at ${mobile} shortly.`
    );

    setName('');
    setAge('');
    setMobile('');
    setEmail('');
    setNotes('');
  };

  return (
    <article className="col-xs-12 maincontent col-md-12 col-sm-12 max-w-5xl mx-auto px-4 sm:px-6">
      <div className="border-title text-center my-4">
        <h3>Career Opportunities at Doorstep Royale Spa</h3>
        <div className="ico-border">
          <i className="ico-bg flower"></i>
        </div>
        <span className="tag-line">Join Our Luxury Doorstep Wellness Team</span>
      </div>

      {/* Main Job Vacancies Box */}
      <div className="JobDivbordrbg JobDivbox effect1 my-6 shadow-md">
        <div>
          <span>JOB VACANCIES</span>
        </div>
        <div>
          <span className="text-base text-amber-900 font-semibold">
            (Referral fee provided if we hire someone through you)
          </span>
        </div>
        <div className="mt-4">
          <span>
            <em>1) &nbsp; SPA & Wellness Therapist</em>
          </span>
        </div>
        <div>
          <span>
            Looking for female candidates, part or full time 18 to 35 years, Fresher OK. Top
            compensation. Travel allowance and accommodation assistance available.
          </span>
        </div>
        <div className="mt-4">
          <span>
            <em>2) &nbsp; Spa Coordinator & Client Assistant</em>
          </span>
        </div>
        <div>
          <span>
            Customer communication, scheduling doorstep appointments, Bangalore geography
            knowledge. Part-time or Full-time.
          </span>
        </div>
      </div>

      {/* Why Work With Us */}
      <div className="pst my-6 bg-white/40 p-6 rounded-lg border border-[#a28321]/30">
        <h4 className="text-xl font-bold text-[#840000] mb-3">Why Join Doorstep Royale Spa?</h4>
        <ul className="space-y-2">
          <li className="col81d742">
            <strong>Professional Skill Development:</strong> Training in Swedish, Aromatherapy, Deep Tissue, and Esalen-style relaxing techniques.
          </li>
          <li className="col81d742">
            <strong>Top Industry Compensation:</strong> Generous per-session rates plus travel allowances, performance bonuses, and client tips.
          </li>
          <li className="col81d742">
            <strong>Safe, Respectful Work Culture:</strong> Strict client screening and identity verification before every home appointment.
          </li>
          <li className="col81d742">
            <strong>Free Accommodation Support:</strong> Safe lodging and boarding assistance for candidates relocating to Bangalore.
          </li>
          <li className="col81d742">
            <strong>Referral Bonus:</strong> Know someone suitable? Refer a candidate and receive a cash referral fee upon hiring!
          </li>
        </ul>
      </div>

      {/* Interactive Application Form */}
      <div className="panel max-w-2xl mx-auto my-8 bg-[#f5f0e8] border-2 border-[#840000] p-6 rounded-lg shadow-md">
        <h4 className="text-center text-xl font-bold text-[#840000] mb-2">
          Apply Online / Submit Referral
        </h4>
        <p className="text-center text-sm text-[#228b22] mb-6">
          Fill in your details below or call our hiring desk at {SPA_PHONE}.
        </p>

        <form onSubmit={handleApply} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="jobRole" className="block text-sm font-bold text-[#840000]">
                Position Applying For <span className="text-danger">*</span>
              </label>
              <select
                id="jobRole"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="form-control"
              >
                <option value="SPA Therapist">1) SPA & Wellness Therapist</option>
                <option value="Spa Coordinator">2) Spa Coordinator / Telecaller</option>
                <option value="Friend Referral">Referral on behalf of a friend</option>
              </select>
            </div>

            <div>
              <label htmlFor="jobFullName" className="block text-sm font-bold text-[#840000]">
                Candidate Full Name <span className="text-danger">*</span>
              </label>
              <input
                id="jobFullName"
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter full name"
                className="form-control"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label htmlFor="jobAge" className="block text-sm font-bold text-[#840000]">
                Age (18-35) <span className="text-danger">*</span>
              </label>
              <input
                id="jobAge"
                type="number"
                min="18"
                max="50"
                required
                value={age}
                onChange={(e) => setAge(e.target.value)}
                placeholder="24"
                className="form-control"
              />
            </div>

            <div>
              <label htmlFor="jobGender" className="block text-sm font-bold text-[#840000]">
                Gender
              </label>
              <select
                id="jobGender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="form-control"
              >
                <option value="Female">Female (Preferred for Therapist)</option>
                <option value="Male">Male</option>
              </select>
            </div>

            <div>
              <label htmlFor="jobType" className="block text-sm font-bold text-[#840000]">
                Work Type
              </label>
              <select
                id="jobType"
                value={workType}
                onChange={(e) => setWorkType(e.target.value)}
                className="form-control"
              >
                <option value="Full Time">Full Time</option>
                <option value="Part Time">Part Time</option>
                <option value="Weekends Only">Weekends Only</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="jobMobile" className="block text-sm font-bold text-[#840000]">
                Mobile Number (10 digits) <span className="text-danger">*</span>
              </label>
              <input
                id="jobMobile"
                type="tel"
                maxLength={10}
                required
                value={mobile}
                onChange={(e) => setMobile(e.target.value)}
                placeholder="9876543210"
                className="form-control"
              />
            </div>

            <div>
              <label htmlFor="jobEmail" className="block text-sm font-bold text-[#840000]">
                Email Address
              </label>
              <input
                id="jobEmail"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="form-control"
              />
            </div>
          </div>

          <div>
            <label htmlFor="jobExp" className="block text-sm font-bold text-[#840000]">
              Prior Experience
            </label>
            <select
              id="jobExp"
              value={experience}
              onChange={(e) => setExperience(e.target.value)}
              className="form-control"
            >
              <option value="Fresher OK">Fresher / No prior spa experience (Full training provided)</option>
              <option value="1-2 Years">1 - 2 Years Spa / Massage Experience</option>
              <option value="3+ Years">3+ Years Experienced Therapist</option>
            </select>
          </div>

          <div>
            <label htmlFor="jobNotes" className="block text-sm font-bold text-[#840000]">
              Additional Notes / Background / Referral details
            </label>
            <textarea
              id="jobNotes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Tell us about yourself, current location in Bangalore, or the candidate you are referring..."
              className="form-control"
            />
          </div>

          <div className="text-center pt-2">
            <button id="submitJobApplicationBtn" type="submit" className="btn btn-action text-base px-8 py-2">
              Submit Application
            </button>
          </div>
        </form>
      </div>

      <div className="text-center my-6">
        <span className="text-base text-[#840000]">
          Have questions about job openings?{' '}
          <a
            href={`tel:${SPA_PHONE}`}
            className="underline text-[#b30af3] font-bold"
          >
            Call {SPA_PHONE}
          </a>{' '}
          or{' '}
          <button
            type="button"
            className="underline text-[#b30af3] font-bold cursor-pointer bg-transparent border-0"
            onClick={() => onNavigate('guest')}
          >
            Chat directly with Admin
          </button>
        </span>
      </div>
    </article>
  );
};
