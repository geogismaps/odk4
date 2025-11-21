import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { parseXForm, FormField } from '../lib/xmlParser';
import { syncSubmissionToTeable } from '../lib/teableSync';
import { ArrowLeft, Save, MapPin, Camera, Mic, Video, Pen, CloudOff } from 'lucide-react';
import { getOfflineForm, queueSubmission, saveFormProgress, getFormProgress, clearFormProgress } from '../lib/offlineStorage';
import { useOnlineStatus, OnlineStatus } from '../components/OnlineStatus';
import type { Database } from '../lib/database.types';

type FormRow = Database['public']['Tables']['forms']['Row'];

export function FormCollect() {
  const { formId } = useParams<{ formId: string }>();
  const { userProfile } = useAuth();
  const navigate = useNavigate();
  const isOnline = useOnlineStatus();
  const [form, setForm] = useState<FormRow | null>(null);
  const [fields, setFields] = useState<FormField[]>([]);
  const [values, setValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);

  useEffect(() => {
    loadForm();
  }, [formId]);

  useEffect(() => {
    if (autoSaveEnabled && formId && Object.keys(values).length > 0) {
      const timer = setTimeout(() => {
        saveFormProgress(formId, values).catch(err => {
          console.error('Auto-save failed:', err);
        });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [values, formId, autoSaveEnabled]);

  const loadForm = async () => {
    try {
      const offlineForm = await getOfflineForm(formId!);

      if (offlineForm) {
        setForm({
          id: offlineForm.id,
          project_id: offlineForm.projectId,
          name: offlineForm.name,
          xml_content: offlineForm.xmlContent,
          version: offlineForm.version,
          is_active: true,
          created_at: new Date().toISOString(),
          description: null,
        });
        setFields(offlineForm.fields);
        setIsOfflineMode(true);

        const savedProgress = await getFormProgress(formId!);
        if (savedProgress) {
          setValues(savedProgress.data);
        }
      } else if (navigator.onLine) {
        const { data, error } = await supabase
          .from('forms')
          .select('*')
          .eq('id', formId!)
          .maybeSingle();

        if (error) throw error;
        if (!data) throw new Error('Form not found');

        setForm(data);
        const parsed = parseXForm(data.xml_content);
        setFields(parsed.fields);

        const savedProgress = await getFormProgress(formId!);
        if (savedProgress) {
          setValues(savedProgress.data);
        }
      } else {
        throw new Error('Form not available offline. Please connect to the internet.');
      }
    } catch (err) {
      console.error('Error loading form:', err);
      alert('Failed to load form: ' + (err as Error).message);
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const submissionId = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      if (isOnline) {
        const { data: submission, error } = await supabase
          .from('submissions')
          .insert({
            form_id: formId!,
            user_id: userProfile?.id || null,
            data: values,
          })
          .select()
          .single();

        if (error) throw error;

        syncSubmissionToTeable(submission.id).catch(err => {
          console.error('Background sync failed:', err);
        });

        await clearFormProgress(formId!);
        alert('Submission saved successfully!');
      } else {
        await queueSubmission({
          id: submissionId,
          form_id: formId!,
          user_id: userProfile?.id || null,
          data: values,
        });

        await clearFormProgress(formId!);
        alert('Submission queued for sync when online!');
      }

      navigate(-1);
    } catch (err) {
      console.error('Error submitting form:', err);
      alert('Failed to submit form: ' + (err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OnlineStatus />
      <nav className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate(-1)}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold text-gray-900">{form?.name}</h1>
              {isOfflineMode && (
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded-full flex items-center gap-1">
                  <CloudOff className="w-3 h-3" />
                  Offline
                </span>
              )}
            </div>
            <button
              type="submit"
              form="collection-form"
              disabled={submitting}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm"
            >
              <Save className="w-4 h-4" />
              {submitting ? 'Saving...' : 'Submit'}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-3xl mx-auto px-4 py-6">
        <form id="collection-form" onSubmit={handleSubmit} className="space-y-6">
          {fields.map((field, index) => (
            <FieldInput
              key={index}
              field={field}
              value={values[field.name]}
              onChange={(value) => setValues({ ...values, [field.name]: value })}
            />
          ))}
        </form>
      </main>
    </div>
  );
}

interface FieldInputProps {
  field: FormField;
  value: any;
  onChange: (value: any) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  const renderInput = () => {
    switch (field.type.toLowerCase()) {
      case 'geopoint':
        return <GPSInput value={value} onChange={onChange} />;

      case 'binary':
      case 'image':
        return <CameraInput value={value} onChange={onChange} />;

      case 'audio':
        return <AudioInput value={value} onChange={onChange} />;

      case 'video':
        return <VideoInput value={value} onChange={onChange} />;

      case 'select_one':
      case 'select1':
        return (
          <select
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Select an option</option>
            {field.choices?.map((choice, idx) => (
              <option key={idx} value={choice.value}>
                {choice.label}
              </option>
            ))}
          </select>
        );

      case 'int':
      case 'integer':
      case 'decimal':
        return (
          <input
            type="number"
            value={value || ''}
            onChange={(e) => onChange(e.target.value ? parseFloat(e.target.value) : null)}
            required={field.required}
            step={field.type === 'decimal' ? '0.01' : '1'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      case 'text':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            rows={4}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );

      default:
        return (
          <input
            type="text"
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <label className="block text-sm font-medium text-gray-900 mb-2">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.hint && (
        <p className="text-sm text-gray-600 mb-3">{field.hint}</p>
      )}
      {renderInput()}
    </div>
  );
}

function GPSInput({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState('');

  const captureLocation = () => {
    setCapturing(true);
    setError('');

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setCapturing(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        };
        onChange(location);
        setCapturing(false);
      },
      (err) => {
        setError('Failed to get location: ' + err.message);
        setCapturing(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div>
      <button
        type="button"
        onClick={captureLocation}
        disabled={capturing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
      >
        <MapPin className="w-5 h-5" />
        {capturing ? 'Getting location...' : value ? 'Update Location' : 'Capture Location'}
      </button>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      {value && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm">
          <p className="text-gray-700">
            <span className="font-medium">Latitude:</span> {value.latitude?.toFixed(6)}
          </p>
          <p className="text-gray-700">
            <span className="font-medium">Longitude:</span> {value.longitude?.toFixed(6)}
          </p>
          <p className="text-gray-600 text-xs mt-1">
            Accuracy: ±{value.accuracy?.toFixed(0)}m
          </p>
        </div>
      )}
    </div>
  );
}

function CameraInput({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const [capturing, setCapturing] = useState(false);

  const capturePhoto = async () => {
    try {
      setCapturing(true);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });

      const video = document.createElement('video');
      video.srcObject = stream;
      video.play();

      await new Promise(resolve => {
        video.onloadedmetadata = resolve;
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      canvas.getContext('2d')?.drawImage(video, 0, 0);

      stream.getTracks().forEach(track => track.stop());

      const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
      onChange(dataUrl);
      setCapturing(false);
    } catch (err) {
      console.error('Error capturing photo:', err);
      alert('Failed to capture photo');
      setCapturing(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={capturePhoto}
        disabled={capturing}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
      >
        <Camera className="w-5 h-5" />
        {capturing ? 'Capturing...' : value ? 'Retake Photo' : 'Capture Photo'}
      </button>
      {value && (
        <div className="mt-3">
          <img src={value} alt="Captured" className="w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}

function AudioInput({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange(reader.result);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
      >
        <Mic className="w-5 h-5" />
        {recording ? 'Stop Recording' : value ? 'Re-record' : 'Start Recording'}
      </button>
      {value && (
        <div className="mt-3">
          <audio src={value} controls className="w-full" />
        </div>
      )}
    </div>
  );
}

function VideoInput({ value, onChange }: { value: any; onChange: (value: any) => void }) {
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const reader = new FileReader();
        reader.onloadend = () => {
          onChange(reader.result);
        };
        reader.readAsDataURL(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setMediaRecorder(recorder);
      setRecording(true);
    } catch (err) {
      console.error('Error starting recording:', err);
      alert('Failed to start recording');
    }
  };

  const stopRecording = () => {
    if (mediaRecorder) {
      mediaRecorder.stop();
      setRecording(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={recording ? stopRecording : startRecording}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
      >
        <Video className="w-5 h-5" />
        {recording ? 'Stop Recording' : value ? 'Re-record' : 'Start Recording'}
      </button>
      {value && (
        <div className="mt-3">
          <video src={value} controls className="w-full rounded-lg" />
        </div>
      )}
    </div>
  );
}
