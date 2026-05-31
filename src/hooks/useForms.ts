import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { Form, FormField, FormSection, FullForm } from '../types/forms';
import { useToast } from './useToast';
import { useTenant } from './useTenant';

export function useForms() {
  const { tenant } = useTenant();
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();

  const fetchFormsList = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('forms')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as Form[];
    } catch (err: any) {
      console.error('Error fetching forms:', err);
      addToast(err.message || 'Failed to fetch forms list', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [addToast, tenant.id]);

  const getFormWithResponsesCount = useCallback(async () => {
    setLoading(true);
    try {
      const { data: formList, error: formError } = await supabase
        .from('forms')
        .select('*')
        .eq('tenant_id', tenant.id)
        .order('created_at', { ascending: false });

      if (formError) throw formError;
      if (!formList || formList.length === 0) return [];

      // Fire all count queries in parallel — no more N+1
      const countResults = await Promise.all(
        formList.map(form =>
          supabase
            .from('form_responses')
            .select('*', { count: 'exact', head: true })
            .eq('form_id', form.id)
        )
      );

      return formList.map((f, idx) => ({
        ...f,
        response_count: countResults[idx].count ?? 0,
      }));
    } catch (err: any) {
      console.error('Error fetching forms with counts:', err);
      addToast(err.message || 'Failed to load forms data', 'error');
      return [];
    } finally {
      setLoading(false);
    }
  }, [addToast, tenant.id]);

  const fetchFullForm = useCallback(async (formId: string): Promise<FullForm | null> => {
    setLoading(true);
    try {
      const [formRes, sectionsRes, fieldsRes] = await Promise.all([
        supabase.from('forms').select('*').eq('id', formId).eq('tenant_id', tenant.id).single(),
        supabase.from('form_sections').select('*').eq('form_id', formId).order('position', { ascending: true }),
        supabase.from('form_fields').select('*').eq('form_id', formId).order('position', { ascending: true }),
      ]);

      if (formRes.error) throw formRes.error;

      return {
        ...formRes.data,
        sections: sectionsRes.data || [],
        fields: fieldsRes.data || [],
      } as FullForm;
    } catch (err: any) {
      console.error('Error fetching full form:', err);
      addToast(err.message || 'Failed to load form details', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [addToast, tenant.id]);

  const fetchFormByPermalink = useCallback(async (permalink: string): Promise<FullForm | null> => {
    setLoading(true);
    try {
      const formRes = await supabase.from('forms').select('*').eq('permalink', permalink).eq('tenant_id', tenant.id).single();
      if (formRes.error) {
        if (formRes.error.code === 'PGRST116') {
          return null; // Not found
        }
        throw formRes.error;
      }

      const formId = formRes.data.id;
      const [sectionsRes, fieldsRes] = await Promise.all([
        supabase.from('form_sections').select('*').eq('form_id', formId).order('position', { ascending: true }),
        supabase.from('form_fields').select('*').eq('form_id', formId).order('position', { ascending: true }),
      ]);

      return {
        ...formRes.data,
        sections: sectionsRes.data || [],
        fields: fieldsRes.data || [],
      } as FullForm;
    } catch (err: any) {
      console.error('Error fetching form by permalink:', err);
      addToast(err.message || 'Failed to load form', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const createForm = useCallback(async (form: Partial<Form>): Promise<Form | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id;

      const { data, error } = await supabase
        .from('forms')
        .insert({
          title: form.title || 'Untitled Form',
          permalink: form.permalink || `untitled-${Date.now()}`,
          description: form.description || '',
          is_published: false,
          collect_email: form.collect_email ?? true,
          allow_multiple_responses: form.allow_multiple_responses ?? false,
          show_progress_bar: form.show_progress_bar ?? true,
          confirmation_message: form.confirmation_message || 'Thank you for your response!',
          created_by: userId,
          tenant_id: tenant.id,
        })
        .select()
        .single();

      if (error) throw error;
      addToast('Form created successfully', 'success');
      return data as Form;
    } catch (err: any) {
      console.error('Error creating form:', err);
      addToast(err.message || 'Failed to create form', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const updateFormMetadata = useCallback(async (formId: string, formObj: Partial<Form>) => {
    try {
      const { error } = await supabase
        .from('forms')
        .update({
          title: formObj.title,
          description: formObj.description,
          permalink: formObj.permalink,
          is_published: formObj.is_published,
          collect_email: formObj.collect_email,
          allow_multiple_responses: formObj.allow_multiple_responses,
          show_progress_bar: formObj.show_progress_bar,
          confirmation_message: formObj.confirmation_message,
          updated_at: new Date().toISOString(),
        })
        .eq('id', formId);

      if (error) throw error;
      return true;
    } catch (err: any) {
      console.error('Error updating form metadata:', err);
      addToast(err.message || 'Failed to update form settings', 'error');
      return false;
    }
  }, [addToast]);

  const saveFormStructure = useCallback(async (
    formId: string,
    sections: FormSection[],
    fields: FormField[]
  ) => {
    try {
      // 1. Fetch current ids to identify deletions
      const [currentSecsRes, currentFieldsRes] = await Promise.all([
        supabase.from('form_sections').select('id').eq('form_id', formId),
        supabase.from('form_fields').select('id').eq('form_id', formId),
      ]);

      const currentSecIds = (currentSecsRes.data || []).map(s => s.id);
      const currentFieldIds = (currentFieldsRes.data || []).map(f => f.id);

      const incomingSecIds = sections.map(s => s.id);
      const incomingFieldIds = fields.map(f => f.id);

      const secIdsToDelete = currentSecIds.filter(id => !incomingSecIds.includes(id));
      const fieldIdsToDelete = currentFieldIds.filter(id => !incomingFieldIds.includes(id));

      // 2. Perform deletions
      if (secIdsToDelete.length > 0) {
        await supabase.from('form_sections').delete().in('id', secIdsToDelete);
      }
      if (fieldIdsToDelete.length > 0) {
        await supabase.from('form_fields').delete().in('id', fieldIdsToDelete);
      }

      // 3. Upsert incoming sections
      if (sections.length > 0) {
        const { error: secError } = await supabase
          .from('form_sections')
          .upsert(
            sections.map((s, idx) => ({
              id: s.id,
              form_id: formId,
              title: s.title || '',
              description: s.description || '',
              position: idx,
            })),
            { onConflict: 'id' }
          );
        if (secError) throw secError;
      }

      // 4. Upsert incoming fields
      if (fields.length > 0) {
        const { error: fError } = await supabase
          .from('form_fields')
          .upsert(
            fields.map((f, idx) => ({
              id: f.id,
              form_id: formId,
              section_id: f.section_id || null,
              type: f.type,
              label: f.label,
              description: f.description || '',
              placeholder: f.placeholder || '',
              required: f.required,
              position: idx,
              options: f.options || null,
              validation: f.validation || null,
              image_url: f.image_url || '',
              scale_min: f.scale_min,
              scale_max: f.scale_max,
              scale_min_label: f.scale_min_label || '',
              scale_max_label: f.scale_max_label || '',
            })),
            { onConflict: 'id' }
          );
        if (fError) throw fError;
      }

      return true;
    } catch (err: any) {
      console.error('Error saving form structure:', err);
      addToast(err.message || 'Failed to save form structure', 'error');
      return false;
    }
  }, [addToast]);

  const deleteForm = useCallback(async (formId: string) => {
    setLoading(true);
    try {
      // Supabase cascade rules should handle associated fields/sections if configured,
      // but let's do safe parallel deletes first
      await Promise.all([
        supabase.from('form_fields').delete().eq('form_id', formId),
        supabase.from('form_sections').delete().eq('form_id', formId),
        supabase.from('form_responses').delete().eq('form_id', formId),
      ]);

      const { error } = await supabase.from('forms').delete().eq('id', formId);
      if (error) throw error;

      addToast('Form deleted successfully', 'success');
      return true;
    } catch (err: any) {
      console.error('Error deleting form:', err);
      addToast(err.message || 'Failed to delete form', 'error');
      return false;
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  const verifyPermalinkUnique = useCallback(async (slug: string, formId?: string) => {
    try {
      let query = supabase.from('forms').select('id').eq('permalink', slug).eq('tenant_id', tenant.id);
      if (formId) {
        query = query.neq('id', formId);
      }
      const { data, error } = await query;
      if (error) throw error;
      return (data || []).length === 0;
    } catch (err) {
      console.error('Permalink check error:', err);
      return false;
    }
  }, [tenant.id]);

  return {
    loading,
    fetchFormsList,
    getFormWithResponsesCount,
    fetchFullForm,
    fetchFormByPermalink,
    createForm,
    updateFormMetadata,
    saveFormStructure,
    deleteForm,
    verifyPermalinkUnique,
  };
}
