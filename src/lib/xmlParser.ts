import { XMLParser } from 'fast-xml-parser';

export interface FormField {
  name: string;
  type: string;
  label: string;
  required: boolean;
  hint?: string;
  choices?: Array<{ value: string; label: string }>;
}

export interface ParsedForm {
  formId: string;
  title: string;
  version: string;
  fields: FormField[];
}

export function parseXForm(xmlContent: string): ParsedForm {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    removeNSPrefix: true,
  });

  const result = parser.parse(xmlContent);

  const h = result.html || result.h || result;
  const head = h.head || {};
  const body = h.body || {};
  const model = head.model || {};

  const instances = Array.isArray(model.instance) ? model.instance : model.instance ? [model.instance] : [];
  const primaryInstance = instances[0] || {};

  const data = primaryInstance.data || primaryInstance;
  const formId = data['@_id'] || 'unknown';
  const version = data['@_version'] || '1.0';

  const title = head.title || 'Untitled Form';

  const bindings = Array.isArray(model.bind) ? model.bind : model.bind ? [model.bind] : [];
  const inputs = Array.isArray(body.input) ? body.input : body.input ? [body.input] : [];
  const selects = Array.isArray(body.select1) ? body.select1 : body.select1 ? [body.select1] : [];
  const textareas = Array.isArray(body.textarea) ? body.textarea : body.textarea ? [body.textarea] : [];
  const uploads = Array.isArray(body.upload) ? body.upload : body.upload ? [body.upload] : [];

  const fields: FormField[] = [];

  inputs.forEach((input: any) => {
    const ref = input['@_ref'];
    const name = ref?.split('/').pop() || '';
    const binding = bindings.find((b: any) => b['@_nodeset'] === ref);

    fields.push({
      name,
      type: binding?.['@_type'] || 'string',
      label: input.label || name,
      required: binding?.['@_required'] === 'true()',
      hint: input.hint,
    });
  });

  selects.forEach((select: any) => {
    const ref = select['@_ref'];
    const name = ref?.split('/').pop() || '';
    const binding = bindings.find((b: any) => b['@_nodeset'] === ref);

    let items = Array.isArray(select.item) ? select.item : select.item ? [select.item] : [];

    if (items.length === 0 && select.itemset) {
      const instanceId = select.itemset['@_nodeset']?.match(/instance\('([^']+)'\)/)?.[1];
      if (instanceId) {
        const secondaryInstance = instances.find((inst: any) => inst['@_id'] === instanceId);
        if (secondaryInstance?.root?.item) {
          items = Array.isArray(secondaryInstance.root.item)
            ? secondaryInstance.root.item
            : [secondaryInstance.root.item];
        }
      }
    }

    fields.push({
      name,
      type: 'select_one',
      label: select.label || name,
      required: binding?.['@_required'] === 'true()',
      choices: items.map((item: any) => ({
        value: item.name || item.value || '',
        label: item.label || item.name || item.value || '',
      })),
    });
  });

  uploads.forEach((upload: any) => {
    const ref = upload['@_ref'];
    const name = ref?.split('/').pop() || '';
    const binding = bindings.find((b: any) => b['@_nodeset'] === ref);
    const mediatype = upload['@_mediatype'] || '';

    let fieldType = 'binary';
    if (mediatype.includes('image')) {
      fieldType = 'image';
    } else if (mediatype.includes('audio')) {
      fieldType = 'audio';
    } else if (mediatype.includes('video')) {
      fieldType = 'video';
    }

    fields.push({
      name,
      type: fieldType,
      label: upload.label || name,
      required: binding?.['@_required'] === 'true()',
      hint: upload.hint,
    });
  });

  textareas.forEach((textarea: any) => {
    const ref = textarea['@_ref'];
    const name = ref?.split('/').pop() || '';
    const binding = bindings.find((b: any) => b['@_nodeset'] === ref);

    fields.push({
      name,
      type: 'text',
      label: textarea.label || name,
      required: binding?.['@_required'] === 'true()',
      hint: textarea.hint,
    });
  });

  return {
    formId,
    title,
    version,
    fields,
  };
}

export function mapODKTypeToTeable(odkType: string): string {
  const typeMap: Record<string, string> = {
    'string': 'singleLineText',
    'int': 'number',
    'integer': 'number',
    'decimal': 'number',
    'date': 'date',
    'time': 'singleLineText',
    'dateTime': 'date',
    'geopoint': 'singleLineText',
    'geotrace': 'longText',
    'geoshape': 'longText',
    'binary': 'attachment',
    'select': 'singleSelect',
    'select_one': 'singleSelect',
    'select1': 'singleSelect',
    'select_multiple': 'multipleSelect',
    'text': 'longText',
    'barcode': 'singleLineText',
  };

  return typeMap[odkType.toLowerCase()] || 'singleLineText';
}
