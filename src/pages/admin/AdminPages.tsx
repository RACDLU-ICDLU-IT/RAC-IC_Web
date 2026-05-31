import { supabase } from '../../supabase';
import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { LayoutTemplate, Trash, Plus } from 'lucide-react';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { useAdminTenant } from '../../hooks/useAdminTenant';

export default function AdminPages() {
  const { adminTenant: tenant } = useAdminTenant();
  const [content, setContent] = useState<any>({
    homeHeroTitle: tenant.id === 'racdlu'
      ? 'Fellowship\nThrough Service.'
      : 'Service\nAbove Self.',
    homeHeroSubtitle: `${tenant.fullName.toUpperCase()} — ${tenant.district}`,
    homeMissionText: tenant.id === 'racdlu'
      ? 'We are young professionals united by fellowship, leadership, and service.'
      : 'We are a generation of action. Bridging continents, uplifting communities.',
    homeStatMembers: 80,
    homeStatProjects: 30,
    homeStatHours: 500,
    homeAboutImage: '',
    aboutHeroImage: '',
    aboutRotaryImage: '',
    aboutMission: tenant.tagline,
    aboutVision: `A world where ${tenant.shortName} members lead meaningful, sustainable change.`,
    aboutValues: 'Fellowship, Integrity, Leadership, and Service.',
    aboutJourney: [
      { year: '2021', text: 'Club chartered with 20 founding members.' },
      { year: '2022', text: 'Reached 100 members and launched our first international exchange.' },
      { year: '2023', text: 'Awarded Presidential Citation by Rotary International for outstanding community impact.' },
      { year: '2024', text: 'Expanded community projects and focused on local sustainability.' },
      { year: '2025', text: 'Hosted the largest district conference for youth leaders.' },
      { year: '2026', text: 'Launching the digital platform to expand our reach entirely.' }
    ],
    sponsorshipIntro: 'We are deeply grateful for the generous support of our community sponsors who make our service projects possible.',
    contactAddress: tenant.contact.address,
    contactMapEmbed: '',
    joinSuccessMessage: "You're in! We'll review your application and be in touch within 48 hours.",
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  const fetchContent = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.from('page_content').select('data').eq('id', 'pageContent').eq('tenant_id', tenant.id).single();
      if (data && data.data) {
        setContent((prev: any) => ({ ...prev, ...data.data }));
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
  }, [tenant.id]);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await supabase.from('page_content').upsert({ id: 'pageContent', tenant_id: tenant.id, data: content }, { onConflict: 'id, tenant_id' });
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
            <div className="flex items-center gap-3">
              Page Content
              <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
                {tenant.id}
              </span>
            </div>
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
               <div>
                  <label className={labelClass}>Home About Image</label>
                  <div className="w-48"><CloudinaryUpload onUpload={(url) => setContent({...content, homeAboutImage: url})} currentUrl={content.homeAboutImage} aspectRatio="landscape" /></div>
               </div>
            </div>
         </section>

         <section>
            <h2 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-100 pb-2">About Page</h2>
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className={labelClass}>About Hero Image</label>
                    <div className="w-full"><CloudinaryUpload onUpload={(url) => setContent({...content, aboutHeroImage: url})} currentUrl={content.aboutHeroImage} aspectRatio="landscape" /></div>
                 </div>
                 <div>
                    <label className={labelClass}>Rotary Collaboration Image</label>
                    <div className="w-full"><CloudinaryUpload onUpload={(url) => setContent({...content, aboutRotaryImage: url})} currentUrl={content.aboutRotaryImage} aspectRatio="landscape" /></div>
                 </div>
               </div>
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
               
               <div className="pt-4 border-t border-gray-100 mt-6">
                 <div className="flex items-center justify-between mb-4">
                   <label className={labelClass} style={{ marginBottom: 0 }}>The Journey Steps</label>
                   <Button size="sm" variant="secondary" onClick={() => setContent({...content, aboutJourney: [...(content.aboutJourney || []), { year: '', text: '' }]})}>
                     <Plus size={16} className="text-gray-600 mr-2" /> Add Step
                   </Button>
                 </div>
                 <div className="space-y-4">
                   {(content.aboutJourney || []).map((step: any, index: number) => (
                     <div key={index} className="flex gap-4 items-start bg-gray-50 p-4 rounded-xl border border-gray-200">
                       <div className="w-24 shrink-0">
                         <input
                           placeholder="Year"
                           value={step.year}
                           onChange={(e) => {
                             const newJourney = [...content.aboutJourney];
                             newJourney[index].year = e.target.value;
                             setContent({...content, aboutJourney: newJourney});
                           }}
                           className={inputClass}
                         />
                       </div>
                       <div className="flex-1">
                         <textarea
                           placeholder="Milestone description"
                           value={step.text}
                           onChange={(e) => {
                             const newJourney = [...content.aboutJourney];
                             newJourney[index].text = e.target.value;
                             setContent({...content, aboutJourney: newJourney});
                           }}
                           className={inputClass}
                           rows={2}
                         />
                       </div>
                       <button
                         onClick={() => {
                           const newJourney = [...content.aboutJourney];
                           newJourney.splice(index, 1);
                           setContent({...content, aboutJourney: newJourney});
                         }}
                         className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                       >
                         <Trash size={18} />
                       </button>
                     </div>
                   ))}
                   {(content.aboutJourney || []).length === 0 && (
                     <p className="text-gray-400 text-sm text-center py-4">No journey steps added yet.</p>
                   )}
                 </div>
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
