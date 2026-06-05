import { supabase } from '../supabase';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';
import { CloudinaryUpload } from '../components/CloudinaryUpload';

// Validation Schema
const joinSchema = z.object({
  name: z.string().min(2, 'Full name is required (min 2 characters)'),
  email: z.string().email('A valid email address is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  gender: z.string().min(1, 'Please select your gender'),
  phone: z.string().min(5, 'A valid phone number is required'),
  emergencyContact: z.string().min(3, 'Emergency contact information is required'),
  address: z.string().min(5, 'Residential address is required'),
  referredBy: z.string().optional(),
});

type JoinFormData = z.infer<typeof joinSchema>;

export default function Join() {
  const { tenant } = useTenant();
  const isRotaract = tenant.id === 'racdlu';
  const clubTypeName = isRotaract ? 'Rotaract' : 'Interact';
  const ageRange = isRotaract ? '18 and 30 years old' : '12 and 18 years old';

  // Ineligibility reasons: 'under' = too young, 'over' = too old
  const [ineligibleReason, setIneligibleReason] = useState<'under' | 'over' | null>(null);

  // For Rotaract: under 18 → Interact; over 30 → Rotary
  // For Interact: any ineligible → Rotaract (ages 18+) or Rotary
  const getIneligibleContent = () => {
    if (isRotaract) {
      if (ineligibleReason === 'under') {
        return {
          message:
            'Rotaract is for young adults aged 18–30. If you are under 18, consider joining Interact instead.',
          buttons: [
            {
              label: 'Join Interact',
              href: 'https://www.icdlu.org/join',
              variant: 'secondary' as const,
            },
          ],
        };
      }
      // over 30
      return {
        message:
          'Rotaract is for young adults aged 18–30. If you are over 30, consider joining Rotary Club instead.',
        buttons: [
          {
            label: 'Join Rotary Club',
            href: 'https://rcdlu.org/join-us/',
            variant: 'secondary' as const,
          },
        ],
      };
    } else {
      // Interact
      return {
        message:
          "Interact is specifically for youth aged 12–18. If you're older, consider joining Rotaract (ages 18+) or a local Rotary club.",
        buttons: [
          {
            label: 'Join Rotaract',
            href: 'https://www.racdlu.org/join',
            variant: 'secondary' as const,
          },
        ],
      };
    }
  };

  const [step, setStep] = useState<'eligibility' | 'code-check' | 'form' | 'success' | 'ineligible'>('eligibility');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState<any>({});
  const { addToast } = useToast();

  const [inviteCode, setInviteCode] = useState('');
  const [codeError, setCodeError] = useState('');
  const [isVerifyingCode, setIsVerifyingCode] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPublicId, setPhotoPublicId] = useState('');

  const isLight = tenant.brand.primaryColor === '#FFFFFF';

  React.useEffect(() => {
    supabase
      .from('page_content')
      .select('data')
      .eq('id', 'pageContent')
      .eq('tenant_id', tenant.id)
      .single()
      .then(({ data }) => {
        if (data && data.data) {
          setContent(data.data);
        }
      });
  }, [tenant.id]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema),
  });

  const checkEligibility = (eligible: boolean, reason?: 'under' | 'over') => {
    if (eligible) {
      setStep('code-check');
    } else {
      setIneligibleReason(reason || 'under');
      setStep('ineligible');
    }
  };

  const onSubmit = async (data: JoinFormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.from('applications').insert({
        name: data.name,
        email: data.email,
        dob: data.dob,
        gender: data.gender,
        phone: data.phone,
        emergencyContact: data.emergencyContact,
        address: data.address,
        referredBy: data.referredBy || '',
        photo: photoUrl,
        codeUsed: inviteCode.trim().toUpperCase(),
        tenant_id: tenant.id,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      if (error) throw error;
      setStep('success');
    } catch (err: any) {
      console.error('Application submit error:', err);
      addToast('Failed to submit application. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    const trimmed = inviteCode.trim().toUpperCase();
    if (trimmed.length !== 12) {
      setCodeError('Please enter a complete 12-character code.');
      return;
    }
    setIsVerifyingCode(true);
    setCodeError('');
    try {
      const { data, error } = await supabase.rpc('verify_application_code', {
        p_code: trimmed,
        p_tenant_id: tenant.id,
      });
      if (error) throw error;
      if (data && data.valid === true) {
        setStep('form');
      } else {
        setCodeError(
          data?.message || 'Invalid code. Please contact us to receive a valid invitation code.'
        );
      }
    } catch (err: any) {
      console.error('Code verification error:', err);
      setCodeError('Verification failed. Please try again or contact us.');
    } finally {
      setIsVerifyingCode(false);
    }
  };

  const ineligibleContent = getIneligibleContent();

  return (
    <div
      className="min-h-screen pt-32 pb-24 text-white relative overflow-hidden"
      style={{ backgroundColor: isLight ? 'var(--color-accent)' : 'var(--color-primary)' }}
    >
      <SEOHead
        title="Join Our Club"
        description={`Apply to join ${tenant.fullName} and become part of a global youth service movement.`}
        canonicalPath="/join"
      />
      {/* Background glow */}
      <div
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] pointer-events-none ${
          isLight ? 'bg-white/10' : 'bg-accent/10'
        }`}
      ></div>

      <div className="max-w-3xl mx-auto px-6 relative z-10 w-full">
        {/* ── ELIGIBILITY STEP ── */}
        {step === 'eligibility' && (
          <div className="text-center animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-heading font-bold mb-8">Join the Movement.</h1>
            <p className="text-xl text-gray-200 max-w-xl mx-auto mb-16 leading-relaxed">
              Before we begin your application, let's make sure {clubTypeName} is the right fit for
              you. Are you between{' '}
              <span className="text-white font-bold border-b border-white/50">{ageRange}</span>?
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Button size="lg" variant="secondary" onClick={() => checkEligibility(true)}>
                Yes, I am
              </Button>
              {isRotaract ? (
                /* Rotaract: two "No" options — under 18 or over 30 */
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => checkEligibility(false, 'under')}
                  >
                    No, I'm under 18
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={() => checkEligibility(false, 'over')}
                  >
                    No, I'm over 30
                  </Button>
                </div>
              ) : (
                <Button size="lg" variant="outline" onClick={() => checkEligibility(false, 'under')}>
                  No, I'm not
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ── INELIGIBLE STEP ── */}
        {step === 'ineligible' && (
          <div className="text-center bg-white/5 p-12 rounded-3xl border border-white/10 animate-fade-in-up">
            <h2 className="text-3xl font-heading font-bold mb-4">You're still welcome!</h2>
            <p className="text-gray-200 mb-8 max-w-lg mx-auto">{ineligibleContent.message}</p>
            <div className="flex flex-col sm:flex-row justify-center gap-4 mb-6">
              {ineligibleContent.buttons.map((btn) => (
                <a key={btn.label} href={btn.href} target="_blank" rel="noopener noreferrer">
                  <Button variant={btn.variant} size="lg">
                    {btn.label} →
                  </Button>
                </a>
              ))}
            </div>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </div>
        )}

        {/* ── CODE CHECK STEP ── */}
        {step === 'code-check' && (
          <div className="text-center animate-fade-in-up max-w-md mx-auto">
            <div className="bg-white/5 border border-white/10 rounded-3xl p-10 space-y-6">
              {/* Lock icon */}
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>

              <div>
                <h2 className="text-3xl font-heading font-bold text-white mb-2">
                  Invitation Required
                </h2>
                <p className="text-gray-300 text-sm leading-relaxed">
                  Applications are by invitation only. Enter the 12-character code you received from
                  the club to continue.
                </p>
              </div>

              <div className="space-y-4">
                {/* Code input */}
                <input
                  type="text"
                  value={inviteCode}
                  onChange={(e) => {
                    setInviteCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                    setCodeError('');
                  }}
                  maxLength={12}
                  placeholder="XXXXXXXXXXXX"
                  className="w-full px-4 py-4 bg-white/10 border border-white/20 rounded-xl text-white text-center text-xl font-mono tracking-[0.4em] placeholder-white/25 focus:outline-none focus:border-white/60 focus:bg-white/15 transition-all uppercase"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleVerifyCode();
                  }}
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                />

                {/* Error state */}
                {codeError && (
                  <div className="bg-red-500/20 border border-red-400/30 rounded-xl p-4 text-left">
                    <p className="text-red-200 text-sm mb-3">{codeError}</p>
                    <a
                      href="/contact"
                      className="inline-flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white text-xs font-medium px-4 py-2 rounded-lg transition-colors border border-white/20"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                      Contact Us for a Code
                    </a>
                  </div>
                )}

                {/* ── VERIFY BUTTON — solid white, bold, full-width ── */}
                <button
                  onClick={handleVerifyCode}
                  disabled={isVerifyingCode || inviteCode.trim().length < 12}
                  className="
                    w-full py-4 px-6 rounded-xl font-bold text-base tracking-wide
                    transition-all duration-200 select-none
                    bg-white text-gray-900
                    hover:bg-gray-100 active:scale-[0.98]
                    disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white
                    flex items-center justify-center gap-2.5
                  "
                >
                  {isVerifyingCode ? (
                    <>
                      <svg className="animate-spin w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Verifying…
                    </>
                  ) : (
                    <>
                      Verify Code & Continue
                      <svg
                        className="w-4 h-4 shrink-0"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2.5}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </>
                  )}
                </button>

                <button
                  onClick={() => {
                    setStep('eligibility');
                    setCodeError('');
                    setInviteCode('');
                  }}
                  className="block w-full text-center text-white/50 hover:text-white text-sm transition-colors mt-2"
                >
                  ← Go Back
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── APPLICATION FORM STEP ── */}
        {step === 'form' && (
          <div className="bg-white text-gray-900 p-8 md:p-12 rounded-3xl shadow-2xl animate-fade-in-up">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-heading font-bold mb-2">Application Form</h2>
              <p className="text-gray-500 text-sm">
                Please fill in all details carefully. We will review and contact you shortly.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* Formal Picture */}
              <div className="flex flex-col items-center gap-3">
                <label className="text-sm font-bold text-gray-700">
                  Formal Picture <span className="text-red-500">*</span>
                </label>
                <div className="w-36">
                  <CloudinaryUpload
                    onUpload={(url, publicId) => {
                      setPhotoUrl(url);
                      setPhotoPublicId(publicId);
                    }}
                    currentUrl={photoUrl}
                    currentPublicId={photoPublicId}
                    label="Upload Photo"
                    aspectRatio="portrait"
                  />
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Upload a clear, formal/passport-style photo
                </p>
              </div>

              <div className="border-t border-gray-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Full Name */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Full Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('name')}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900"
                    placeholder="Your full name as per official ID"
                  />
                  {errors.name && (
                    <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>
                  )}
                </div>

                {/* Date of Birth */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Date of Birth <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('dob')}
                    type="date"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-700"
                  />
                  {errors.dob && (
                    <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>
                  )}
                </div>

                {/* Gender */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Gender <span className="text-red-500">*</span>
                  </label>
                  <select
                    {...register('gender')}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900"
                  >
                    <option value="">Select gender...</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {errors.gender && (
                    <p className="text-red-500 text-xs mt-1">{errors.gender.message}</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900"
                    placeholder="your@email.com"
                  />
                  {errors.email && (
                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                  )}
                </div>

                {/* Phone */}
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('phone')}
                    type="tel"
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900"
                    placeholder="+880 01XXX XXXXXX"
                  />
                  {errors.phone && (
                    <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>
                  )}
                </div>

                {/* Emergency Contact */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Emergency Contact <span className="text-red-500">*</span>
                  </label>
                  <input
                    {...register('emergencyContact')}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900"
                    placeholder="Parent/Guardian name and phone number"
                  />
                  {errors.emergencyContact && (
                    <p className="text-red-500 text-xs mt-1">{errors.emergencyContact.message}</p>
                  )}
                </div>

                {/* Residential Address */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Residential Address <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    {...register('address')}
                    rows={2}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900 resize-none"
                    placeholder="House/Road/Block, Area, City"
                  />
                  {errors.address && (
                    <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>
                  )}
                </div>

                {/* Referred By */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-2">
                    Referred By{' '}
                    <span className="text-gray-400 font-normal">(optional)</span>
                  </label>
                  <input
                    {...register('referredBy')}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900"
                    placeholder="Name of the member who referred you (if any)"
                  />
                </div>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full !rounded-xl"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting Application...' : 'Submit Application →'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {/* ── SUCCESS STEP ── */}
        {step === 'success' && (
          <div className="text-center bg-white/5 p-12 rounded-3xl border border-white/10 animate-fade-in-up">
            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                ></path>
              </svg>
            </div>
            <h2 className="text-4xl font-heading font-bold mb-4 text-white animate-pulse">
              Application Received!
            </h2>
            <p className="text-gray-100 mb-10 max-w-lg mx-auto text-lg whitespace-pre-line">
              {content?.joinSuccessMessage ||
                'Thank you for taking the first step. Our board will review your application and contact you soon via email.'}
            </p>
            <Button variant="secondary" onClick={() => (window.location.href = '/')}>
              Return Home
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
