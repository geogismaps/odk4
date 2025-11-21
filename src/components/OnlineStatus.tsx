import { useState, useEffect } from 'react';
import { Wifi, WifiOff, CloudOff, Cloud } from 'lucide-react';
import { getPendingSubmissions } from '../lib/offlineStorage';

export function OnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const updatePendingCount = async () => {
    try {
      const pending = await getPendingSubmissions();
      setPendingCount(pending.length);
    } catch (err) {
      console.error('Error getting pending submissions:', err);
    }
  };

  if (isOnline && pendingCount === 0) {
    return null;
  }

  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium ${
        isOnline
          ? 'bg-blue-500 text-white'
          : 'bg-amber-500 text-white'
      }`}
    >
      {isOnline ? (
        <>
          <Cloud className="w-4 h-4" />
          {pendingCount > 0 && <span>Syncing {pendingCount} submission{pendingCount > 1 ? 's' : ''}...</span>}
        </>
      ) : (
        <>
          <CloudOff className="w-4 h-4" />
          <span>Working Offline</span>
          {pendingCount > 0 && <span className="ml-2 bg-white text-amber-600 px-2 py-0.5 rounded-full text-xs">{pendingCount}</span>}
        </>
      )}
    </div>
  );
}

export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}
