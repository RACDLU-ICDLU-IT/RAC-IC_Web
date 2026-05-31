export type FieldType =
  | 'short_answer'
  | 'paragraph'
  | 'multiple_choice'
  | 'checkboxes'
  | 'dropdown'
  | 'linear_scale'
  | 'multiple_choice_grid'
  | 'checkbox_grid'
  | 'date'
  | 'time'
  | 'image'
  | 'section'
  | 'file_upload';

export interface Form {
  id: string;
  title: string;
  description?: string;
  permalink: string;
  is_published: boolean;
  collect_email: boolean;
  allow_multiple_responses: boolean;
  show_progress_bar: boolean;
  confirmation_message: string;
  created_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface FormSection {
  id: string;
  form_id: string;
  title?: string;
  description?: string;
  position: number;
}

export interface FormField {
  id: string;
  form_id: string;
  section_id?: string | null;
  type: FieldType;
  label: string;
  description?: string;
  placeholder?: string;
  required: boolean;
  position: number;
  options?: {
    choices?: string[];
    rows?: string[];
    columns?: string[];
    allowOther?: boolean;
  } | null;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    allowedTypes?: string[];
  } | null;
  image_url?: string;
  scale_min?: number;
  scale_max?: number;
  scale_min_label?: string;
  scale_max_label?: string;
}

export interface FormResponse {
  id: string;
  form_id: string;
  respondent_email?: string;
  submitted_at: string;
  metadata?: Record<string, any>;
}

export interface FormAnswer {
  id: string;
  response_id: string;
  field_id: string;
  value: any; // Can be string, string[], or Record<string, string> for grids
}

export interface FullForm extends Form {
  sections: FormSection[];
  fields: FormField[];
}
