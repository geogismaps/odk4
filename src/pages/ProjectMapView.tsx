import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import { supabase } from '../lib/supabase';
import {
  fetchTeableRecords,
  fetchTeableTableStructure,
  extractCoordinates,
  type TeableConfig,
  type TeableRecord,
  type TeableField,
} from '../lib/teableData';
import { AlertCircle, Loader2, MapPin } from 'lucide-react';
import { TeableTableSelector } from '../components/TeableTableSelector';

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

export function ProjectMapView() {
  const { projectId } = useParams<{ projectId: string }>();
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const markerClusterRef = useRef<L.MarkerClusterGroup | null>(null);
  const [projectConfig, setProjectConfig] = useState<{ baseUrl: string; baseId: string; apiToken: string } | null>(null);
  const [teableConfig, setTeableConfig] = useState<TeableConfig | null>(null);
  const [selectedTableName, setSelectedTableName] = useState<string>('');
  const [selectedGeometryFieldId, setSelectedGeometryFieldId] = useState<string>('');

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

  const handleTableSelect = async (tableId: string, tableName: string, geometryFieldId?: string) => {
    if (!projectConfig || !projectId || !geometryFieldId) return;

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
      setSelectedGeometryFieldId(geometryFieldId);
    } catch (error) {
      console.error('Error saving table selection:', error);
      alert('Failed to save table selection');
    }
  };

  const { data: tableStructure } = useQuery({
    queryKey: ['teable-structure', teableConfig?.tableId],
    queryFn: () => fetchTeableTableStructure(teableConfig!),
    enabled: !!teableConfig,
  });

  const { data: records = [], isLoading } = useQuery({
    queryKey: ['teable-records', teableConfig?.tableId],
    queryFn: () => fetchTeableRecords(teableConfig!),
    enabled: !!teableConfig,
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current).setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;
    markerClusterRef.current = L.markerClusterGroup();
    map.addLayer(markerClusterRef.current);

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !markerClusterRef.current || !tableStructure || !records.length || !selectedGeometryFieldId) return;

    markerClusterRef.current.clearLayers();

    const geometryField = tableStructure.fields.find(f => f.id === selectedGeometryFieldId);
    if (!geometryField) {
      console.warn('Selected geometry field not found in table');
      return;
    }

    const markers: L.Marker[] = [];

    records.forEach((record: TeableRecord) => {
      const geoValue = record.fields[geometryField.name] || record.fields[geometryField.id];
      const coords = extractCoordinates(geoValue);

      if (coords) {
        const [lat, lng] = coords;

        const popupContent = Object.entries(record.fields)
          .map(([key, value]) => {
            if (value === null || value === undefined) return '';
            let displayValue = value;

            if (Array.isArray(value)) {
              displayValue = value.join(', ');
            } else if (typeof value === 'object') {
              displayValue = JSON.stringify(value);
            }

            return `<strong>${key}:</strong> ${displayValue}<br/>`;
          })
          .join('');

        const marker = L.marker([lat, lng]).bindPopup(popupContent);
        markers.push(marker);
        markerClusterRef.current!.addLayer(marker);
      }
    });

    if (markers.length > 0) {
      const group = L.featureGroup(markers);
      mapRef.current.fitBounds(group.getBounds(), { padding: [50, 50] });
    }
  }, [records, tableStructure, selectedGeometryFieldId]);

  if (!projectConfig) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Teable Not Configured
          </h3>
          <p className="text-gray-600">
            Please configure Teable integration in project settings to view data on map.
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
        requireGeometry={true}
        onSelect={handleTableSelect}
      />
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-spin" />
          <p className="text-gray-600">Loading map data...</p>
        </div>
      </div>
    );
  }

  const geometryField = tableStructure?.fields.find(f => f.id === selectedGeometryFieldId);
  const geoRecordsCount = records.filter((record) => {
    if (!geometryField) return false;
    const geoValue = record.fields[geometryField.name] || record.fields[geometryField.id];
    return extractCoordinates(geoValue) !== null;
  }).length;

  return (
    <div className="h-full flex flex-col">
      <div className="bg-white border-b px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{selectedTableName}</h2>
          <p className="text-sm text-gray-600">Geography Field: {geometryField?.name}</p>
        </div>
        <button
          onClick={() => setTeableConfig(null)}
          className="px-4 py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
        >
          Change Configuration
        </button>
      </div>
      {geoRecordsCount === 0 && (
        <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-4">
          <div className="flex">
            <MapPin className="h-5 w-5 text-amber-400" />
            <div className="ml-3">
              <p className="text-sm text-amber-700">
                No geographic data found in records. Make sure your forms capture location data.
              </p>
            </div>
          </div>
        </div>
      )}
      <div className="flex-1 relative rounded-lg overflow-hidden border border-gray-200">
        <div ref={mapContainerRef} className="absolute inset-0" />
      </div>
      <div className="mt-4 text-sm text-gray-600 text-center">
        Showing {geoRecordsCount} of {records.length} records with location data
      </div>
    </div>
  );
}
