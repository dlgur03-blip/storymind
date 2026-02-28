import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './stores/store';
import { ErrorBoundary } from './lib/ErrorBoundary';
import { ToastContainer } from './lib/Toast';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import PlannerPage from './pages/PlannerPage';
import SurveyPlannerPage from './pages/SurveyPlannerPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  const { init, darkMode } = useStore();

  useEffect(() => { init(); }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/editor/:workId" element={<EditorPage />} />
          <Route path="/planner/:id" element={<PlannerPage />} />
          <Route path="/planner-survey" element={<SurveyPlannerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
      <ToastContainer />
    </ErrorBoundary>
  );
}
