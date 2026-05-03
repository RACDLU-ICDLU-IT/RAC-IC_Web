import React, { useState, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useSettings } from '../contexts/SettingsContext';
import { useToast } from '../hooks/useToast';
import { Mail, Phone, MapPin, Clock, Loader2, CheckCircle2 } from 'lucide-react';

export default function Contact() {
  const { settings } = useSettings();
  const { addToast } = useToast();
  
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [content, setContent] = useState<any>(null);

  useEffect(() => {
    getDoc(doc(db, 'settings', 'pageContent')).then(snap => {
      if (snap.exists()) setContent(snap.data());
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email || !formData.message) {
      addToast('Please fill in all fields.', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await addDoc(collection(db, 'contact_messages'), {
        ...formData,
        read: false,
        createdAt: serverTimestamp(),
      });
      setSubmitted(true);
      addToast('Message sent! We\'ll get back to you soon.', 'success');
    } catch (err) {
      addToast('Failed to send message. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="bg-[#F7F5F0] min-h-screen pt-24 pb-32">
      <section className="py-16 md:py-24 px-6 max-w-7xl mx-auto border-b-2 border-primary mb-16">
        <h1 className="text-7xl md:text-[120px] font-heading font-bold text-primary leading-none">
          Contact.
        </h1>
        <p className="text-gray-500 mt-4 text-xl max-w-2xl">
          Have a question or want to get involved? We'd love to hear from you.
        </p>
      </section>

      <section className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-16">
          
          {/* Left Column - Form */}
          <div className="lg:col-span-3">
            <h2 className="text-3xl font-heading font-bold mb-8">Send a message</h2>
            
            {submitted ? (
              <div className="bg-green-50 border border-green-100 p-12 rounded-3xl text-center flex flex-col items-center">
                <CheckCircle2 size={48} className="text-green-500 mb-4" />
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Message sent!</h3>
                <p className="text-gray-600 mb-8">We'll get back to you within 24 hours.</p>
                <button 
                  onClick={() => { setSubmitted(false); setFormData({ name: '', email: '', message: '' }); }}
                  className="px-6 py-3 bg-white border border-gray-200 rounded-xl font-bold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  Send another message
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="relative">
                  <input
                    id="name"
                    type="text"
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white transition-colors placeholder-transparent"
                    placeholder="Full Name"
                  />
                  <label htmlFor="name" className="absolute left-4 top-4 text-gray-400 text-sm transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-focus:text-accent peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs">
                    Full Name
                  </label>
                </div>
                
                <div className="relative">
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={e => setFormData({...formData, email: e.target.value})}
                    className="peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white transition-colors placeholder-transparent"
                    placeholder="Email Address"
                  />
                  <label htmlFor="email" className="absolute left-4 top-4 text-gray-400 text-sm transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-focus:text-accent peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs">
                    Email Address
                  </label>
                </div>

                <div className="relative">
                  <textarea
                    id="message"
                    rows={6}
                    value={formData.message}
                    onChange={e => setFormData({...formData, message: e.target.value})}
                    className="peer w-full px-4 pt-6 pb-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white transition-colors resize-none placeholder-transparent"
                    placeholder="Your Message"
                  />
                  <label htmlFor="message" className="absolute left-4 top-4 text-gray-400 text-sm transition-all duration-200 peer-focus:top-2 peer-focus:text-xs peer-focus:text-accent peer-placeholder-shown:top-4 peer-placeholder-shown:text-base peer-placeholder-shown:text-gray-400 peer-not-placeholder-shown:top-2 peer-not-placeholder-shown:text-xs">
                    Your Message
                  </label>
                </div>

                <button 
                  type="submit" 
                  disabled={submitting}
                  className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 className="animate-spin" size={20} /> : 'Send Message'}
                </button>
              </form>
            )}
          </div>

          {/* Right Column - Info */}
          <div className="lg:col-span-2">
            <h2 className="text-3xl font-heading font-bold mb-8">Get in touch</h2>
            
            <div className="space-y-4">
              {[
                { icon: <Mail size={20} />, label: 'Email', value: settings.contactEmail, href: settings.contactEmail ? `mailto:${settings.contactEmail}` : '' },
                { icon: <Phone size={20} />, label: 'Phone', value: settings.phone, href: settings.phone ? `tel:${settings.phone}` : '' },
                { icon: <MapPin size={20} />, label: 'Venue / Address', value: content?.contactAddress || settings.meetingVenue },
                { icon: <Clock size={20} />, label: 'Meeting Schedule', value: settings.meetingSchedule },
              ].map(item => (
                <div key={item.label} className="flex items-start gap-4 p-5 bg-white rounded-2xl border border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent shrink-0">
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-0.5">{item.label}</p>
                    {item.href ? (
                      <a href={item.href} className="text-gray-800 font-medium hover:text-accent transition-colors">{item.value || 'Not set'}</a>
                    ) : (
                      <p className="text-gray-800 font-medium">{item.value || 'Not set'}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Map embed */}
            {(content?.contactMapEmbed || settings.googleMapsEmbedUrl) && (
              <div className="mt-8 rounded-2xl overflow-hidden border border-gray-100 h-64 bg-gray-200">
                <iframe src={content?.contactMapEmbed || settings.googleMapsEmbedUrl} width="100%" height="100%" style={{ border: 0 }} allowFullScreen loading="lazy" />
              </div>
            )}
          </div>

        </div>
      </section>
    </div>
  );
}
