import React, { useEffect, useState } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { LayoutTemplate } from 'lucide-react';

export default function AdminPages() {
  const [content, setContent] = useState<any>({
    homeHeroTitle: 'Service\nAbove Self.',
    homeHeroSubtitle: 'INTERACT CLUB OF DHAKA LUMINOUS — District 64',
    homeMissionText: 'We are a generation of action. Bridging continents, uplifting communities.',
    homeStatMembers: 120,
    homeStatProjects: 45,
    homeStatHours: 1000,
    aboutMission: 'To empower youth to take action, develop leadership skills, and create positive change.',
    aboutVision: 'A world where young people are actively leading toward sustainable, equitable futures.',
    aboutValues: 'Integrity, Compassion, Innovation, and Service Above Self.',
    sponsorshipIntro: 'Partner with us to support youth service and community impact in Dhaka.',
    contactAddress: '',
    contactMapEmbed: '',
    joinSuccessMessage: "You're in! We'll review your application and be in touch within 48 hours.",
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const fetchContent = async () => {
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, 'settings', 'pageContent'));
      if (snap.exists()) {
        setContent((prev: any) => ({ ...prev, ...snap.data() }));
      }
    } catch (err) {
      console.error(err);
      addToast('Failed to load page content', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'pageContent'), content);
      addToast('Page content saved successfully', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to save page content', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const inputClass = "w-full px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent bg-white transition-colors";
  const labelClass = "block text-sm font-bold text-gray-800 mb-2";

  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading editor...</div>;
  }

  return (
    <div className="max-w-4xl space-y-8 pb-32">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-gray-900 flex items-center gap-2">
            <LayoutTemplate size={24} className="text-primary" />
            Page Content
          </h1>
          <p className="text-gray-500 text-sm mt-1">Manage static text blocks across the public site</p>
        </div>
        <Button onClick={handleSave} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save All Changes'}</Button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 space-y-8">
         <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Home Page</h2>
            <div className="space-y-4">
               <div>
                  <label className={labelClass}>Hero Title</label>
                  <textarea value={content.homeHeroTitle || ''} onChange={e => setContent({...content, homeHeroTitle: e.target.value})} className={inputClass} rows={2} />
               </div>
               <div>
                  <label className={labelClass}>Hero Subtitle</label>
                  <textarea value={content.homeHeroSubtitle || ''} onChange={e => setContent({...content, homeHeroSubtitle: e.target.value})} className={inputClass} rows={2} />
               </div>
               <div>
                  <label className={labelClass}>Mission Text</label>
                  <textarea value={content.homeMissionText || ''} onChange={e => setContent({...content, homeMissionText: e.target.value})} className={inputClass} rows={2} />
               </div>
               <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className={labelClass}>Members Stat</label>
                    <input type="number" value={content.homeStatMembers || 0} onChange={e => setContent({...content, homeStatMembers: parseInt(e.target.value) || 0})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Projects Stat</label>
                    <input type="number" value={content.homeStatProjects || 0} onChange={e => setContent({...content, homeStatProjects: parseInt(e.target.value) || 0})} className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Hours Stat</label>
                    <input type="number" value={content.homeStatHours || 0} onChange={e => setContent({...content, homeStatHours: parseInt(e.target.value) || 0})} className={inputClass} />
                  </div>
               </div>
            </div>
         </section>

         <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">About Page</h2>
            <div className="space-y-4">
               <div>
                   <label className={labelClass}>Mission Statement</label>
                   <textarea value={content.aboutMission || ''} onChange={e => setContent({...content, aboutMission: e.target.value})} className={inputClass} rows={3} />
               </div>
               <div>
                   <label className={labelClass}>Vision Statement</label>
                   <textarea value={content.aboutVision || ''} onChange={e => setContent({...content, aboutVision: e.target.value})} className={inputClass} rows={3} />
               </div>
               <div>
                   <label className={labelClass}>Core Values</label>
                   <textarea value={content.aboutValues || ''} onChange={e => setContent({...content, aboutValues: e.target.value})} className={inputClass} rows={3} />
               </div>
            </div>
         </section>

         <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Contact Page</h2>
            <div className="space-y-4">
               <div>
                  <label className={labelClass}>Club Address</label>
                  <textarea value={content.contactAddress || ''} onChange={e => setContent({...content, contactAddress: e.target.value})} className={inputClass} rows={2} />
               </div>
               <div>
                  <label className={labelClass}>Map Embed URL</label>
                  <input value={content.contactMapEmbed || ''} onChange={e => setContent({...content, contactMapEmbed: e.target.value})} className={inputClass} placeholder="Google Maps embed URL" />
               </div>
            </div>
         </section>

         <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">Join Config</h2>
            <div className="space-y-4">
               <div>
                  <label className={labelClass}>Success Message</label>
                  <textarea value={content.joinSuccessMessage || ''} onChange={e => setContent({...content, joinSuccessMessage: e.target.value})} className={inputClass} rows={2} />
               </div>
            </div>
         </section>
      </div>
    </div>
  );
}
