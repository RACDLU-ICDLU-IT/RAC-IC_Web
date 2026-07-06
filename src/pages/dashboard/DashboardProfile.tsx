import { supabase } from '../../supabase';
import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../hooks/useToast';
import { CloudinaryUpload } from '../../components/CloudinaryUpload';
import { Save, Loader2, Info, Zap, Star, Trophy } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTenant } from '../../hooks/useTenant';

export default function DashboardProfile() {
  const { profile, user } = useAuth();
  const { tenant } = useTenant();
  const { addToast } = useToast();
  const [formData, setFormData] = useState<any>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const userId = user?.id;
    if (!userId) return;
    supabase.from('users').select('*').eq('id', userId).eq('tenant_id', tenant.id).single().then(({ data }) => {
        if (data) {
          setFormData(data);
        }
        setLoading(false);
      }, err => {
        console.error(err);
        setLoading(false);
      });
  }, [user, tenant.id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev: any) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      // Only send editable fields - never let a member overwrite
      // admin-managed fields like xp, fp, level, role, status
      const { xp, fp, level, role, status, id, email, tenant_id, created_at, updatedAt, ...editableFields } = formData;
      await supabase.from('users').update({
        ...editableFields,
        updatedAt: new Date().toISOString()
      }).eq('id', user.id).eq('tenant_id', tenant.id);
      addToast('Profile updated successfully!', 'success');
    } catch (err) {
      console.error(err);
      addToast('Failed to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="w-8 h-8 border-4 border-accent border-t-transparent rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto animate-fade-in-up">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-heading font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1 text-sm">Manage your personal information and club details.</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white px-6 py-2.5 rounded-xl font-bold hover:bg-primary/90 transition-colors flex items-center gap-2 shadow-sm"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Changes
        </button>
      </div>

      <div className="bg-blue-50 text-blue-800 p-4 rounded-xl mb-8 flex gap-3 text-sm border border-blue-100">
        <Info size={20} className="shrink-0 mt-0.5 text-blue-500" />
        <p>
          <strong>Note:</strong> Some fields like your Role, Status, and Join Date are managed by club administrators. If you need to change these, please contact an admin.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Photo Upload */}
        <div className="col-span-1">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-4 font-heading border-b pb-2">Profile Photo</h3>
            <div className="mb-4">
              {formData.photo ? (
                <div className="aspect-square rounded-full overflow-hidden border-4 border-gray-50 mb-4 shadow-inner">
                  <img src={formData.photo} alt="Profile" className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="aspect-square rounded-full bg-gray-100 flex items-center justify-center text-6xl font-bold text-gray-300 border-4 border-gray-50 mb-4 shadow-inner">
                  {formData.name?.[0] || '?'}
                </div>
              )}
              <CloudinaryUpload 
                onUpload={(url) => setFormData((prev: any) => ({ ...prev, photo: url }))}
                buttonText="Upload New Photo"
              />
            </div>
            <div className="space-y-4 pt-4 border-t border-gray-50">
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Club Status</span>
                <div className={`inline-flex px-3 py-1 rounded-full text-xs font-bold uppercase tracking-widest ${formData.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  {formData.status || 'Pending'}
                </div>
              </div>
              <div>
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Club Role</span>
                <div className="font-bold text-gray-900 capitalize">{formData.role || 'Member'}</div>
              </div>
              {/* Points Summary */}
              <div className="pt-4 border-t border-gray-50">
                <span className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">Points</span>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-amber-600 font-bold flex items-center gap-1"><Zap size={11} /> XP</span>
                    <span className="font-bold text-gray-900">{(formData.xp || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-purple-600 font-bold flex items-center gap-1"><Star size={11} /> FP</span>
                    <span className="font-bold text-gray-900">{(formData.fp || 0).toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-primary font-bold flex items-center gap-1"><Trophy size={11} /> Level</span>
                    <span className="font-bold text-gray-900">{formData.level || 0}</span>
                  </div>
                </div>
                <Link to="/dashboard/points" className="block text-center text-xs text-primary font-bold mt-3 hover:underline">
                  View Point History →
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Form Fields */}
        <div className="col-span-1 md:col-span-2 space-y-6">
          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 font-heading border-b pb-2">Personal Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Email Address</label>
                <input
                  type="email"
                  value={formData.email || ''}
                  disabled
                  className="w-full px-4 py-2 bg-gray-100 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                />
                <p className="text-xs text-gray-400 mt-1">Email cannot be changed.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Phone Number</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone || ''}
                  onChange={handleChange}
                  placeholder="+880 1..."
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Date of Birth</label>
                <input
                  type="date"
                  name="dob"
                  value={formData.dob || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:bg-white transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Address</label>
              <textarea
                name="address"
                rows={3}
                value={formData.address || ''}
                onChange={handleChange}
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:bg-white transition-colors resize-none"
              />
            </div>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-6 font-heading border-b pb-2">Academic & Emergency Info</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">School / Institution</label>
                <input
                  type="text"
                  name="school"
                  value={formData.school || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:bg-white transition-colors"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Grade / Class</label>
                <input
                  type="text"
                  name="grade"
                  value={formData.grade || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:bg-white transition-colors"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Blood Group</label>
                <select
                  name="bloodGroup"
                  value={formData.bloodGroup || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:bg-white transition-colors"
                >
                  <option value="">Select...</option>
                  {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1.5">Emergency Contact Phone</label>
                <input
                  type="text"
                  name="emergencyPhone"
                  value={formData.emergencyPhone || ''}
                  onChange={handleChange}
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:bg-white transition-colors"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1.5">Emergency Contact Details</label>
              <textarea
                name="emergencyDetails"
                rows={2}
                value={formData.emergencyDetails || ''}
                onChange={handleChange}
                placeholder="Name and relationship..."
                className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent focus:bg-white transition-colors resize-none"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
