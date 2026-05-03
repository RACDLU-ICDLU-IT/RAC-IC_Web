import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/Button';

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
  const [step, setStep] = useState<'eligibility' | 'form' | 'success' | 'ineligible'>('eligibility');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [content, setContent] = useState<any>(null);

  React.useEffect(() => {
    getDoc(doc(db, 'settings', 'pageContent')).then(snap => {
      if (snap.exists()) setContent(snap.data());
    });
  }, []);

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
      await addDoc(collection(db, 'applications'), {
        ...data,
        status: 'pending',
        createdAt: serverTimestamp()
      });
      setStep('success');
    } catch (err: any) {
      console.error(err);
      alert('Failed to submit application. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-primary pt-32 pb-24 text-white selection:bg-accent selection:text-primary relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-accent/10 rounded-full blur-[100px] pointer-events-none"></div>
      
      <div className="max-w-3xl mx-auto px-6 relative z-10 w-full">
        {step === 'eligibility' && (
          <div className="text-center animate-fade-in-up">
            <h1 className="text-5xl md:text-7xl font-heading font-bold mb-8">Join the Movement.</h1>
            <p className="text-xl text-gray-300 max-w-xl mx-auto mb-16 leading-relaxed">
              Before we begin your application, let's make sure Interact is the right fit for you. Are you between <span className="text-white font-bold border-b border-accent">12 and 18 years old</span> and currently enrolled in school?
            </p>
            <div className="flex flex-col sm:flex-row justify-center gap-6">
              <Button size="lg" variant="primary" onClick={() => checkEligibility(true)}>
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
            <p className="text-gray-300 mb-8 max-w-lg mx-auto">
              Interact is specifically for youth aged 12-18. If you're older, consider joining Rotaract (ages 18+) or a local Rotary club to continue your service journey!
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
          </div>
        )}

        {step === 'form' && (
          <div className="bg-white text-primary p-8 md:p-12 rounded-3xl shadow-2xl animate-fade-in-up">
            <div className="text-center mb-10">
              <h2 className="text-3xl font-heading font-bold mb-2">Application Form</h2>
              <p className="text-gray-500">Tell us a bit about yourself. We'll review and get back to you shortly.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Full Name</label>
                  <input {...register('name')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all" placeholder="John Doe" />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Email Address</label>
                  <input {...register('email')} type="email" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all" placeholder="john@example.com" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Date of Birth</label>
                  <input {...register('dob')} type="date" className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all text-gray-700" />
                  {errors.dob && <p className="text-red-500 text-xs mt-1">{errors.dob.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Phone Number</label>
                  <input {...register('phone')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all" placeholder="+880..." />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">School Name</label>
                  <input {...register('school')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all" placeholder="Dhaka High School" />
                  {errors.school && <p className="text-red-500 text-xs mt-1">{errors.school.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Grade / Class</label>
                  <input {...register('grade')} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent transition-all" placeholder="10th Grade" />
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
            <h2 className="text-4xl font-heading font-bold mb-4">Application Received!</h2>
            <p className="text-gray-300 mb-10 max-w-lg mx-auto text-lg whitespace-pre-line">
              {content?.joinSuccessMessage || 'Thank you for taking the first step. Our board will review your application and contact you soon via email.'}
            </p>
            <Button variant="primary" onClick={() => window.location.href = '/'}>Return Home</Button>
          </div>
        )}
      </div>
    </div>
  );
}
