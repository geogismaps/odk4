interface TeableConfig {
  baseUrl: string;
  apiToken: string;
  tableId: string;
}

interface TeableField {
  id: string;
  name: string;
  type: string;
  options?: any;
}

interface TeableRecord {
  id: string;
  fields: Record<string, any>;
  createdTime?: string;
  lastModifiedTime?: string;
}

interface TeableResponse {
  records: TeableRecord[];
  offset?: string;
}

interface TeableTableStructure {
  id: string;
  name: string;
  fields: TeableField[];
}

export async function fetchTeableRecords(
  config: TeableConfig,
  options?: {
    fields?: string[];
    filterByFormula?: string;
    maxRecords?: number;
    pageSize?: number;
    sort?: Array<{ field: string; direction: 'asc' | 'desc' }>;
    view?: string;
  }
): Promise<TeableRecord[]> {
  if (!config.baseUrl || !config.apiToken || !config.tableId) {
    throw new Error('Missing Teable configuration');
  }

  const url = new URL(`${config.baseUrl}/api/table/${config.tableId}/record`);

  if (options?.fields) {
    options.fields.forEach(field => url.searchParams.append('fieldKeyType', 'name'));
  }

  if (options?.filterByFormula) {
    url.searchParams.append('filterByFormula', options.filterByFormula);
  }

  if (options?.maxRecords) {
    url.searchParams.append('take', options.maxRecords.toString());
  }

  if (options?.pageSize) {
    url.searchParams.append('take', options.pageSize.toString());
  }

  if (options?.sort) {
    url.searchParams.append('sort', JSON.stringify(options.sort));
  }

  if (options?.view) {
    url.searchParams.append('viewId', options.view);
  }

  console.log('Fetching Teable records from:', url.toString());

  try {
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    console.log('Teable records response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Teable API error response:', errorText);
      throw new Error(`Teable API error: ${response.status} - ${errorText}`);
    }

    const data: TeableResponse = await response.json();
    console.log('Teable records fetched:', data.records?.length || 0, 'records');
    if (data.records && data.records.length > 0) {
      console.log('Sample record fields:', Object.keys(data.records[0].fields));
    }
    return data.records || [];
  } catch (error) {
    console.error('Error fetching Teable records:', error);
    throw error;
  }
}

export async function fetchTeableTableStructure(
  config: Pick<TeableConfig, 'baseUrl' | 'apiToken' | 'tableId'>
): Promise<TeableTableStructure> {
  if (!config.baseUrl || !config.apiToken || !config.tableId) {
    throw new Error('Missing Teable configuration');
  }

  const url = `${config.baseUrl}/api/table/${config.tableId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${config.apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Teable API error: ${response.status} - ${errorText}`);
    }

    const data: TeableTableStructure = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching Teable table structure:', error);
    throw error;
  }
}

export async function fetchTeableTables(
  baseUrl: string,
  baseId: string,
  apiToken: string
): Promise<Array<{ id: string; name: string }>> {
  if (!baseUrl || !baseId || !apiToken) {
    throw new Error('Missing Teable configuration');
  }

  const url = `${baseUrl}/api/base/${baseId}/table`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Teable API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    return data.tables || data || [];
  } catch (error) {
    console.error('Error fetching Teable tables:', error);
    throw error;
  }
}

export function extractCoordinates(value: any): [number, number] | null {
  if (!value) return null;

  if (typeof value === 'string') {
    const trimmed = value.trim();
    const parts = trimmed.split(/[,\s]+/).map(p => parseFloat(p.trim())).filter(n => !isNaN(n));
    if (parts.length >= 2) {
      const lat = parts[0];
      const lng = parts[1];
      if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
        return [lat, lng];
      }
    }
  }

  if (Array.isArray(value) && value.length === 2) {
    const lat = parseFloat(value[0]);
    const lng = parseFloat(value[1]);
    if (!isNaN(lat) && !isNaN(lng)) {
      return [lat, lng];
    }
  }

  if (typeof value === 'object') {
    if ('lat' in value && 'lng' in value) {
      const lat = parseFloat(value.lat);
      const lng = parseFloat(value.lng);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
    if ('latitude' in value && 'longitude' in value) {
      const lat = parseFloat(value.latitude);
      const lng = parseFloat(value.longitude);
      if (!isNaN(lat) && !isNaN(lng)) {
        return [lat, lng];
      }
    }
  }

  return null;
}

export function findGeometryField(fields: TeableField[]): TeableField | null {
  const geoFieldTypes = ['geopoint', 'location', 'coordinates', 'geometry'];

  for (const field of fields) {
    if (geoFieldTypes.some(type => field.type.toLowerCase().includes(type))) {
      return field;
    }
  }

  for (const field of fields) {
    const nameLower = field.name.toLowerCase();
    if (nameLower.includes('location') ||
        nameLower.includes('coordinates') ||
        nameLower.includes('gps') ||
        nameLower.includes('lat') ||
        nameLower.includes('geo')) {
      return field;
    }
  }

  return null;
}

export function findAllPotentialGeometryFields(
  fields: TeableField[],
  sampleRecords?: TeableRecord[]
): TeableField[] {
  const potentialFields: TeableField[] = [];

  for (const field of fields) {
    const typeLower = field.type.toLowerCase();
    const nameLower = field.name.toLowerCase();

    const isGeoType = typeLower.includes('geopoint') ||
                      typeLower.includes('location') ||
                      typeLower.includes('geometry');

    const isTextType = typeLower.includes('text') ||
                       typeLower.includes('string') ||
                       typeLower === 'singlelinetext' ||
                       typeLower === 'longtext';

    const hasGeoName = nameLower.includes('location') ||
                       nameLower.includes('coordinates') ||
                       nameLower.includes('coordinate') ||
                       nameLower.includes('gps') ||
                       nameLower.includes('lat') ||
                       nameLower.includes('lng') ||
                       nameLower.includes('lon') ||
                       nameLower.includes('geo') ||
                       nameLower.includes('position') ||
                       nameLower.includes('point') ||
                       nameLower.includes('multipoint') ||
                       nameLower.includes('polygon') ||
                       nameLower.includes('multipolygon');

    let hasCoordinateData = false;
    if (sampleRecords && sampleRecords.length > 0) {
      for (const record of sampleRecords.slice(0, 5)) {
        const value = record.fields[field.id];
        if (extractCoordinates(value)) {
          hasCoordinateData = true;
          console.log(`Field "${field.name}" (${field.id}) contains coordinate data:`, value);
          break;
        }
      }
    }

    if (isGeoType || (isTextType && hasGeoName) || hasCoordinateData) {
      potentialFields.push(field);
    }
  }

  console.log('Potential geometry fields found:', potentialFields.map(f => `${f.name} (${f.type})`));
  return potentialFields;
}

export type { TeableConfig, TeableField, TeableRecord, TeableResponse, TeableTableStructure };
