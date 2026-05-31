import { supabase } from '../../supabase';
import React, { useState, useEffect } from 'react';
import { Button } from '../../components/ui/Button';
import { useToast } from '../../hooks/useToast';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { useAdminTenant } from '../../hooks/useAdminTenant';

export default function AdminSettings() {
  const [formData, setFormData] = useState({
    clubName: '',
    tagline: '',
    contactEmail: '',
    phone: '',
    address: '',
    logoUrl: '',
    districtNumber: '64',
    rotaryYear: '2025-2026',
    sponsorClubName: 'Rotary Club of Dhaka Luminous',
    foundingYear: '2015',
    memberDues: 0,
    maxMembers: 150,
    meetingSchedule: 'Every 1st and 3rd Saturday at 4:00 PM',
    meetingVenue: 'Rotary Bhaban, Dhaka',
    privacyPolicyUrl: '',
    googleMapsEmbedUrl: '',
    facebookUrl: '',
    instagramUrl: '',
    twitterUrl: '',
    youtubeUrl: '',
    linkedinUrl: '',
  });
  const { adminTenant: tenant } = useAdminTenant();
  const [isSaving, setIsSaving] = useState(false);
  const { addToast } = useToast();

  // Load tenant specific settings
  useEffect(() => {
    const fetchSettings = async () => {
      const { data } = await supabase.from('settings').select('*').eq('id', `${tenant.id}-global`).single();
      if (data && data.data) {
        setFormData(prev => ({ ...prev, ...data.data }));
      }
    };
    fetchSettings();
  }, [tenant.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData({ ...formData, [name]: type === 'number' ? Number(value) : value });
  };

  const handleSave = async (data = formData) => {
    setIsSaving(true);
    try {
      const { error } = await supabase.from('settings').upsert({ id: `${tenant.id}-global`, data: data }, { onConflict: 'id' });
      if (error) throw error;
      addToast('Settings saved successfully', 'success');
      // Intentionally not reloading context to avoid overriding admin state, 
      // but the change is saved for public site
    } catch (error) {
      console.error(error);
      addToast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogoUpload = async (url: string) => {
    const updated = { ...formData, logoUrl: url };
    setFormData(updated);
    await handleSave(updated);
  };

  const inputClass = "w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent transition-colors bg-white placeholder:text-gray-400";
  const labelClass = "block text-sm font-medium text-gray-700 mb-1.5";
  const sectionClass = "pt-6 mt-6 border-t border-gray-100";

  return (
    <div className="space-y-8 pb-12">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-heading font-bold text-gray-900">Global Settings</h1>
            <span className="bg-gray-100 text-gray-600 text-xs px-2.5 py-1 rounded-full font-bold border border-gray-200 uppercase tracking-wider">
              {tenant.id}
            </span>
          </div>
          <p className="text-gray-500 text-sm mt-1">Manage your club's global information and branding.</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 md:p-8">
        <div className="space-y-6 max-w-4xl">
          
          <div>
             <label className={labelClass}>Club Logo</label>
             {formData.logoUrl && (
               <div className="mb-3">
                 <img
                   src={formData.logoUrl}
                   alt="Club logo"
                   className="h-16 w-16 object-contain rounded-lg border border-gray-200 bg-gray-50 p-1"
                   onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                 />
               </div>
             )}
             <div className="w-48">
               <CloudinaryUpload 
                 onUpload={handleLogoUpload} 
                 currentUrl={formData.logoUrl} 
                 aspectRatio="square" 
                 label="Upload Logo" 
               />
             </div>
             <p className="text-xs text-gray-500 mt-2">Logo is auto-saved after upload. Recommended: Square PNG or SVG with transparent background.</p>
          </div>

          <div className={sectionClass}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Basic Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Club Name</label>
                <input name="clubName" value={formData.clubName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Tagline</label>
                <input name="tagline" value={formData.tagline} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>District Number</label>
                <input name="districtNumber" value={formData.districtNumber} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Sponsor Rotary Club Name</label>
                <input name="sponsorClubName" value={formData.sponsorClubName} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Current Rotary Year</label>
                <input name="rotaryYear" value={formData.rotaryYear} onChange={handleChange} className={inputClass} placeholder="e.g. 2025-2026" />
              </div>
              <div>
                <label className={labelClass}>Founding Year</label>
                <input name="foundingYear" value={formData.foundingYear} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Operations & Defaults</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Member Dues (Annual)</label>
                <input type="number" name="memberDues" value={formData.memberDues} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Maximum Members Capacity</label>
                <input type="number" name="maxMembers" value={formData.maxMembers} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Default Meeting Schedule</label>
                <input name="meetingSchedule" value={formData.meetingSchedule} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Default Meeting Venue</label>
                <input name="meetingVenue" value={formData.meetingVenue} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Contact & Location</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Contact Email</label>
                <input name="contactEmail" value={formData.contactEmail} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Phone Number</label>
                <input name="phone" value={formData.phone} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Office / Meeting Address</label>
                <input name="address" value={formData.address} onChange={handleChange} className={inputClass} />
              </div>
              <div className="md:col-span-2">
                <label className={labelClass}>Google Maps Embed URL</label>
                <input name="googleMapsEmbedUrl" value={formData.googleMapsEmbedUrl || ''} onChange={handleChange} placeholder="https://www.google.com/maps/embed?..." className={inputClass} />
              </div>
            </div>
          </div>

          <div className={sectionClass}>
            <h4 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-4">Social Media & Legal</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelClass}>Facebook URL</label>
                <input name="facebookUrl" value={formData.facebookUrl || ''} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Instagram URL</label>
                <input name="instagramUrl" value={formData.instagramUrl || ''} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>LinkedIn URL</label>
                <input name="linkedinUrl" value={formData.linkedinUrl || ''} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Twitter / X URL</label>
                <input name="twitterUrl" value={formData.twitterUrl || ''} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>YouTube URL</label>
                <input name="youtubeUrl" value={formData.youtubeUrl || ''} onChange={handleChange} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Privacy Policy URL</label>
                <input name="privacyPolicyUrl" value={formData.privacyPolicyUrl || ''} onChange={handleChange} className={inputClass} />
              </div>
            </div>
          </div>
          
          <div className="pt-8 flex justify-end">
            <Button onClick={() => handleSave()} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Settings'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
