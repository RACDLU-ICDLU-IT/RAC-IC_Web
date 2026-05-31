import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { Form, FormField, FormResponse, FormAnswer } from '../types/forms';

export function exportResponsesToExcel(
  form: Form,
  fields: FormField[],
  responses: FormResponse[],
  answers: FormAnswer[]
) {
  // Sheet 1: Responses
  // Columns: Respondent Email, Submitted Date, and each field's label
  const sortedFields = [...fields]
    .filter(f => f.type !== 'section' && f.type !== 'image')
    .sort((a, b) => a.position - b.position);

  const headers = ['Respondent Email', 'Submitted At', ...sortedFields.map(f => f.label)];

  // Match responses with answers
  const rows = responses.map(resp => {
    const rowData: Record<string, any> = {
      'Respondent Email': resp.respondent_email || 'Anonymous',
      'Submitted At': format(new Date(resp.submitted_at), 'yyyy-MM-dd HH:mm:ss'),
    };

    // Find answers for this response
    const respAnswers = answers.filter(ans => ans.response_id === resp.id);

    sortedFields.forEach(field => {
      const answer = respAnswers.find(ans => ans.field_id === field.id);
      let cellValue = '';

      if (answer && answer.value !== undefined && answer.value !== null) {
        if (Array.isArray(answer.value)) {
          cellValue = answer.value.join(', ');
        } else if (typeof answer.value === 'object') {
          // Grid type answer: Record<rowLabel, columnValue/values>
          cellValue = Object.entries(answer.value)
            .map(([row, col]) => `${row}: ${col}`)
            .join(' | ');
        } else {
          cellValue = String(answer.value);
        }
      }

      rowData[field.label] = cellValue;
    });

    return rowData;
  });

  const wsResponses = XLSX.utils.json_to_sheet(rows, { header: headers });

  // Sheet 2: Summary
  const summaryData = [
    { Label: 'Form Title', Value: form.title },
    { Label: 'Description', Value: form.description || '' },
    { Label: 'Permalink URL', Value: `/forms/${form.permalink}` },
    { Label: 'Status', Value: form.is_published ? 'Published' : 'Draft' },
    { Label: 'Total Responses', Value: responses.length },
    { Label: 'Created At', Value: form.created_at ? format(new Date(form.created_at), 'yyyy-MM-dd') : '' },
    { Label: 'Export Date', Value: format(new Date(), 'yyyy-MM-dd HH:mm:ss') },
  ];

  const wsSummary = XLSX.utils.json_to_sheet(summaryData);

  // Set column widths for better readability
  const colWidthsResponses = [
    { wch: 25 }, // Respondent Email
    { wch: 20 }, // Submitted At
    ...sortedFields.map(() => ({ wch: 30 })) // Field columns
  ];
  wsResponses['!cols'] = colWidthsResponses;

  const colWidthsSummary = [
    { wch: 20 }, // Label
    { wch: 50 }  // Value
  ];
  wsSummary['!cols'] = colWidthsSummary;

  // Create workbook container
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');
  XLSX.utils.book_append_sheet(wb, wsResponses, 'Responses');

  // Trigger download
  const dateStr = format(new Date(), 'yyyy-MM-dd');
  const safeTitle = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  XLSX.writeFile(wb, `${safeTitle}-responses-${dateStr}.xlsx`);
}
