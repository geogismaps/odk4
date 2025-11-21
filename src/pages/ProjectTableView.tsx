import { useMemo, useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AgGridReact } from 'ag-grid-react';
import { ColDef } from 'ag-grid-community';
import 'ag-grid-community/styles/ag-grid.css';
import 'ag-grid-community/styles/ag-theme-alpine.css';
import { supabase } from '../lib/supabase';
import { fetchTeableRecords, fetchTeableTableStructure, type TeableConfig } from '../lib/teableData';
import { AlertCircle, Loader2 } from 'lucide-react';
import { TeableTableSelector } from '../components/TeableTableSelector';

export function ProjectTableView() {
  const { projectId } = useParams<{ projectId: string }>();
  const [projectConfig, setProjectConfig] = useState<{ baseUrl: string; baseId: string; apiToken: string } | null>(null);
  const [teableConfig, setTeableConfig] = useState<TeableConfig | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string>('');

  useEffect(() => {
    loadTeableConfig();
  }, [projectId]);

  const loadTeableConfig = async () => {
    if (!projectId) return;

    try {
      const { data: project, error } = await supabase
        .from('projects')
        .select('teable_base_url, teable_base_id, teable_api_token, teable_table_id, teable_table_name')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      if (project?.teable_base_url && project?.teable_base_id && project?.teable_api_token) {
        setProjectConfig({
          baseUrl: project.teable_base_url,
          baseId: project.teable_base_id,
          apiToken: project.teable_api_token,
        });

        if (project.teable_table_id && project.teable_table_name) {
          setTeableConfig({
            baseUrl: project.teable_base_url,
            apiToken: project.teable_api_token,
            tableId: project.teable_table_id,
          });
          setSelectedTableName(project.teable_table_name);
        }
      }
    } catch (error) {
      console.error('Error loading Teable config:', error);
    }
  };

  const handleTableSelect = async (tableId: string, tableName: string) => {
    if (!projectConfig || !projectId) return;

    try {
      const { error } = await supabase
        .from('projects')
        .update({
          teable_table_id: tableId,
          teable_table_name: tableName,
        })
        .eq('id', projectId);

      if (error) throw error;

      setTeableConfig({
        baseUrl: projectConfig.baseUrl,
        apiToken: projectConfig.apiToken,
        tableId,
      });
      setSelectedTableName(tableName);
    } catch (error) {
      console.error('Error saving table selection:', error);
      alert('Failed to save table selection');
    }
  };

  const { data: tableStructure, isLoading: structureLoading } = useQuery({
    queryKey: ['teable-structure', teableConfig?.tableId],
    queryFn: () => fetchTeableTableStructure(teableConfig!),
    enabled: !!teableConfig,
  });

  const { data: records = [], isLoading: recordsLoading } = useQuery({
    queryKey: ['teable-records', teableConfig?.tableId],
    queryFn: () => fetchTeableRecords(teableConfig!),
    enabled: !!teableConfig,
    refetchInterval: 30000,
  });

  const columnDefs = useMemo<ColDef[]>(() => {
    if (!tableStructure) return [];

    return tableStructure.fields.map((field) => ({
      headerName: field.name,
      field: field.id,
      sortable: true,
      filter: true,
      resizable: true,
      flex: 1,
      minWidth: 150,
      valueFormatter: (params: any) => {
        const value = params.value;
        if (value === null || value === undefined) return '';

        if (Array.isArray(value)) {
          return value.join(', ');
        }

        if (typeof value === 'object') {
          if (value.lat !== undefined && value.lng !== undefined) {
            return `${value.lat}, ${value.lng}`;
          }
          return JSON.stringify(value);
        }

        if (field.type === 'date' || field.type === 'createdTime' || field.type === 'lastModifiedTime') {
          try {
            return new Date(value).toLocaleString();
          } catch {
            return value;
          }
        }

        return value.toString();
      },
    }));
  }, [tableStructure]);

  const rowData = useMemo(() => {
    return records.map((record) => ({
      id: record.id,
      ...record.fields,
    }));
  }, [records]);

  if (!projectConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Teable Not Configured
          </h3>
          <p className="text-gray-600">
            Please configure Teable integration in project settings to view data in table format.
          </p>
        </div>
      </div>
    );
  }

  if (!teableConfig) {
    return (
      <TeableTableSelector
        baseUrl={projectConfig.baseUrl}
        baseId={projectConfig.baseId}
        apiToken={projectConfig.apiToken}
        requireGeometry={false}
        onSelect={handleTableSelect}
      />
    );
  }

  if (structureLoading || recordsLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading table data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">{selectedTableName}</h2>
        <button
          onClick={() => setTeableConfig(null)}
          className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Change Table
        </button>
      </div>
      <div className="flex-1 ag-theme-alpine">
        <AgGridReact
          columnDefs={columnDefs}
          rowData={rowData}
          pagination={true}
          paginationPageSize={50}
          paginationPageSizeSelector={[25, 50, 100, 200]}
          defaultColDef={{
            sortable: true,
            filter: true,
            resizable: true,
          }}
          domLayout="normal"
          suppressCellFocus={true}
          enableCellTextSelection={true}
        />
      </div>
    </div>
  );
}
