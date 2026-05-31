import { useState, useCallback } from 'react';
import { supabase } from '../supabase';
import { FormResponse, FormAnswer } from '../types/forms';
import { useToast } from './useToast';
import { useTenant } from './useTenant';

export function useFormResponses() {
  const [loading, setLoading] = useState(false);
  const { addToast } = useToast();
  const { tenant } = useTenant();

  const fetchResponsesForForm = useCallback(async (formId: string) => {
    setLoading(true);
    try {
      const [respsRes, answersRes] = await Promise.all([
        supabase
          .from('form_responses')
          .select('*')
          .eq('form_id', formId)
          .eq('tenant_id', tenant.id)
          .order('submitted_at', { ascending: false }),

        supabase
          .from('form_answers')
          .select('*, form_fields!inner(form_id)')
          .eq('form_fields.form_id', formId),
      ]);

      if (respsRes.error) throw respsRes.error;
      if (answersRes.error) throw answersRes.error;

      return {
        responses: (respsRes.data || []) as FormResponse[],
        answers: (answersRes.data || []).map(ans => ({
          id: ans.id,
          response_id: ans.response_id,
          field_id: ans.field_id,
          value: ans.value,
        })) as FormAnswer[],
      };
    } catch (err: any) {
      console.error('Error fetching responses:', err);
      addToast(err.message || 'Failed to fetch form responses', 'error');
      return { responses: [], answers: [] };
    } finally {
      setLoading(false);
    }
  }, [addToast, tenant.id]);

  const submitResponse = useCallback(async (
    formId: string,
    email: string | undefined,
    answers: { fieldId: string; value: any }[]
  ) => {
    setLoading(true);
    try {
      // 1. Create form_responses entry — include tenant_id for data isolation
      const { data: responseData, error: responseError } = await supabase
        .from('form_responses')
        .insert({
          form_id: formId,
          tenant_id: tenant.id,
          respondent_email: email || null,
          metadata: {
            userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
            referrer: typeof document !== 'undefined' ? document.referrer : 'none',
          },
        })
        .select()
        .single();

      if (responseError) throw responseError;
      const responseId = responseData.id;

      // 2. Prepare and insert form_answers
      if (answers.length > 0) {
        const answersBatch = answers.map(ans => ({
          response_id: responseId,
          field_id: ans.fieldId,
          value: ans.value,
        }));

        const { error: answersError } = await supabase
          .from('form_answers')
          .insert(answersBatch);

        if (answersError) throw answersError;
      }

      return responseId;
    } catch (err: any) {
      console.error('Error submitting form response:', err);
      addToast(err.message || 'Failed to submit form responses', 'error');
      return null;
    } finally {
      setLoading(false);
    }
  }, [addToast, tenant.id]);

  return {
    loading,
    fetchResponsesForForm,
    submitResponse,
  };
}
