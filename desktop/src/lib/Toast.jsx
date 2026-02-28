import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

let addToastFn = null;

export function toast(message, type = 'info') {
  if (addToastFn) addToastFn({ message, type, id: Date.now() });
}

export function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  addToastFn = useCallback((t) => {
    setToasts(prev => [...prev, t]);
    setTimeout(() => setToasts(prev => prev.filter(x => x.id !== t.id)), 4000);
  }, []);

  if (toasts.length === 0) return null;

  const icons = { success: CheckCircle, error: AlertTriangle, info: Info };
  const colors = { success: 'bg-neutral-500', error: 'bg-neutral-500', info: 'bg-neutral-800' };

  return (
    <div className="fixed bottom-4 right-4 z-[100] space-y-2">
      {toasts.map(t => {
        const Icon = icons[t.type] || icons.info;
        return (
          <div key={t.id} className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm shadow-lg anim-slide ${colors[t.type] || colors.info}`}>
            <Icon className="w-4 h-4 shrink-0" />
            <span className="flex-1">{t.message}</span>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}><X className="w-3 h-3" /></button>
          </div>
        );
      })}
    </div>
  );
}
