import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Loader2, Database, Table } from 'lucide-react';
import { fetchTeableTables, fetchTeableTableStructure, fetchTeableRecords, findAllPotentialGeometryFields, type TeableField } from '../lib/teableData';

interface TeableTableSelectorProps {
  baseUrl: string;
  baseId: string;
  apiToken: string;
  requireGeometry?: boolean;
  onSelect: (tableId: string, tableName: string, geometryField?: string) => void;
}

export function TeableTableSelector({
  baseUrl,
  baseId,
  apiToken,
  requireGeometry = false,
  onSelect
}: TeableTableSelectorProps) {
  const [selectedTableId, setSelectedTableId] = useState<string>('');
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [selectedGeometryField, setSelectedGeometryField] = useState<string>('');

  const { data: tables, isLoading: tablesLoading, error: tablesError } = useQuery({
    queryKey: ['teable-tables', baseId],
    queryFn: () => fetchTeableTables(baseUrl, baseId, apiToken),
    enabled: !!baseUrl && !!baseId && !!apiToken,
  });

  const { data: tableStructure, isLoading: structureLoading } = useQuery({
    queryKey: ['teable-table-structure', selectedTableId],
    queryFn: () => fetchTeableTableStructure({ baseUrl, apiToken, tableId: selectedTableId }),
    enabled: !!selectedTableId && requireGeometry,
  });

  const { data: sampleRecords } = useQuery({
    queryKey: ['teable-sample-records', selectedTableId],
    queryFn: () => fetchTeableRecords({ baseUrl, apiToken, tableId: selectedTableId }, { maxRecords: 5 }),
    enabled: !!selectedTableId && requireGeometry && !!tableStructure,
  });

  const geometryFields = tableStructure ? findAllPotentialGeometryFields(tableStructure.fields, sampleRecords) : [];

  useEffect(() => {
    if (geometryFields.length > 0 && !selectedGeometryField) {
      setSelectedGeometryField(geometryFields[0].id);
    }
  }, [geometryFields, selectedGeometryField]);

  const handleTableChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const tableId = e.target.value;
    setSelectedTableId(tableId);
    setSelectedGeometryField('');

    const table = tables?.find(t => t.id === tableId);
    if (table) {
      setSelectedTableName(table.name);
    }
  };

  const handleLoadData = () => {
    if (!selectedTableId) return;

    if (requireGeometry && !selectedGeometryField) {
      alert('Please select a geography field');
      return;
    }

    onSelect(selectedTableId, selectedTableName, requireGeometry ? selectedGeometryField : undefined);
  };

  if (tablesLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading tables from Teable...</p>
        </div>
      </div>
    );
  }

  if (tablesError) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Failed to Load Tables
          </h3>
          <p className="text-gray-600 mb-4">
            {(tablesError as Error).message}
          </p>
        </div>
      </div>
    );
  }

  if (!tables || tables.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No Tables Found
          </h3>
          <p className="text-gray-600">
            No tables found in your Teable base. Please create tables in Teable first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-8">
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center mb-6">
          <Table className="w-6 h-6 text-blue-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">
            {requireGeometry ? 'Select Table and Geography Field' : 'Select Table'}
          </h2>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Data Table
            </label>
            <select
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={selectedTableId}
              onChange={handleTableChange}
            >
              <option value="">Select a table...</option>
              {tables.map(table => (
                <option key={table.id} value={table.id}>
                  {table.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-sm text-gray-500">
              Choose the table containing your data
            </p>
          </div>

          {requireGeometry && selectedTableId && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Geography Field
              </label>
              {structureLoading ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin mr-2" />
                  <span className="text-sm text-gray-600">Loading fields...</span>
                </div>
              ) : geometryFields.length > 0 ? (
                <>
                  <select
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    value={selectedGeometryField}
                    onChange={(e) => setSelectedGeometryField(e.target.value)}
                  >
                    {geometryFields.map(field => (
                      <option key={field.id} value={field.id}>
                        {field.name} ({field.type})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-sm text-gray-500">
                    Select the field containing location/coordinates data
                  </p>
                </>
              ) : (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">
                        No Geography Fields Found
                      </p>
                      <p className="text-sm text-amber-700 mt-1">
                        This table doesn't appear to have any fields containing location or coordinate data.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="pt-4">
            <button
              onClick={handleLoadData}
              disabled={!selectedTableId || (requireGeometry && (!selectedGeometryField || geometryFields.length === 0))}
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {requireGeometry ? 'Load Map' : 'Load Table'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
