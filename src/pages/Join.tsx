import { supabase } from '../supabase';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/Button';
import { useToast } from '../hooks/useToast';
import { useTenant } from '../hooks/useTenant';
import SEOHead from '../components/SEOHead';

// Validation Schema
const joinSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  dob: z.string().min(1, 'Date of birth is required'),
  phone: z.string().min(5, 'Valid phone is required'),
  school: z.string().min(2, 'School name is required'),
  grade: z.string().min(1, 'Grade/Class is required')
});

type JoinFormData = z.infer<typeof joinSchema>;

export default function Join() {
  const { tenant } = useTenant();
  const clubTypeName = tenant.id === 'racdlu' ? 'Rotaract' : 'Interact';
  const ageRange = tenant.id === 'racdlu' ? '18 and 30 years old' : '12 and 18 years old';
  const rejectionMessage = tenant.id === 'racdlu' 
    ? 'Rotaract is for young adults aged 18-30. If you are under 18, consider joining Interact instead.'
    : 'Interact is specifically for youth aged 12-18. If you\'re older, consider joining Rotaract (ages 18+) or a local Rotary club.';
  const [step, setStep] = useState<'eligibility' | 'form' | 'success' | 'ineligible'>('eligibility');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState<any>({});
  const { addToast } = useToast();

  const isLight = tenant.brand.primaryColor === '#FFFFFF';

  React.useEffect(() => {
    supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single().then(({ data }) => {
      if (data && data.data) {
        setContent(data.data);
      }
    });
  }, [tenant.id]);

  const { register, handleSubmit, formState: { errors } } = useForm<JoinFormData>({
    resolver: zodResolver(joinSchema)
  });

  const checkEligibility = (isEligible: boolean) => {
    if (isEligible) setStep('form');
    else setStep('ineligible');
  };

  const onSubmit = async (data: JoinFormData) => {
    setIsSubmitting(true);
    try {
      await supabase.from('applications').insert({
        ...data,
        tenant_id: tenant.id,
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setStep('success');
    } catch (err: any) {
      console.error(err);
      addToast('Failed to submit application. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

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
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-[100px] pointer-events-none ${isLight ? 'bg-white/10' : 'bg-accent/10'}`}></div>
      
      <div className="max-w-3xl mx-auto px-6 relative z-10 w-full">
        {step === 'eligibility' && (
          <div className="text-center animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-heading font-bold mb-8">Join the Movement.</h1>
            <p className="text-xl text-gray-200 max-w-xl mx-auto mb-16 leading-relaxed">
              Before we begin your application, let's make sure {clubTypeName} is the right fit for you. Are you between <span className="text-white font-bold border-b border-white/50">{ageRange}</span>?
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Button size="lg" variant="secondary" onClick={() => checkEligibility(true)}>
                Yes, I am
              </Button>
              <Button size="lg" variant="outline" onClick={() => checkEligibility(false)}>
                No, I'm not
              </Button>
            </div>
          </div>
        )}

        {step === 'ineligible' && (
          <div className="text-center bg-white/5 p-12 rounded-3xl border border-white/10 animate-fade-in-up">
            <h2 className="text-3xl font-heading font-bold mb-4">You're still welcome!</h2>
            <p className="text-gray-200 mb-8 max-w-lg mx-auto">
              {rejectionMessage}
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
          </div>
        )}

        {step === 'form' && (
          <div className="bg-white text-gray-900 p-8 md:p-12 rounded-3xl shadow-2xl animate-fade-in-up">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-heading font-bold mb-2">Application Form</h2>
              <p className="text-gray-500">Tell us a bit about yourself. We'll review and get back to you shortly.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input {...register('name')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900" placeholder="John Doe" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input {...register('email')} type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900" placeholder="john@example.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth</label>
                  <input {...register('dob')} type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-700" />
                  {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                  <input {...register('phone')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900" placeholder="+880..." />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">School Name</label>
                  <input {...register('school')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900" placeholder="Dhaka High School" />
                  {errors.school && <p className="text-red-500 text-xs mt-1">{errors.school.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Grade / Class</label>
                  <input {...register('grade')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-900" placeholder="10th Grade" />
                  {errors.grade && <p className="text-red-500 text-xs mt-1">{errors.grade.message}</p>}
                </div>
              </div>
              
              <div className="pt-6">
                <Button type="submit" variant="primary" size="lg" className="w-full !rounded-xl" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Submit Application'}
                </Button>
              </div>
            </form>
          </div>
        )}

        {step === 'success' && (
          <div className="text-center bg-white/5 p-12 rounded-3xl border border-white/10 animate-fade-in-up">
            <div className="w-24 h-24 bg-green-500 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_50px_rgba(34,197,94,0.4)]">
              <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
              </svg>
            </div>
            <h2 className="text-4xl font-heading font-bold mb-4 text-white animate-pulse">Application Received!</h2>
            <p className="text-gray-100 mb-10 max-w-lg mx-auto text-lg whitespace-pre-line">
              {content?.joinSuccessMessage || 'Thank you for taking the first step. Our board will review your application and contact you soon via email.'}
            </p>
            <Button variant="secondary" onClick={() => window.location.href = '/'}>Return Home</Button>
          </div>
        )}
      </div>
    </div>
  );
}
