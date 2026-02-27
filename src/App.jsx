import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './stores/store';
import { ErrorBoundary } from './lib/ErrorBoundary';
import { ToastContainer } from './lib/Toast';
import AuthPage from './pages/AuthPage';
import Dashboard from './pages/Dashboard';
import EditorPage from './pages/EditorPage';
import AdminPage from './pages/AdminPage';
import PlannerPage from './pages/PlannerPage';
import SurveyPlannerPage from './pages/SurveyPlannerPage';

export default function App() {
  const { token, checkAuth, darkMode } = useStore();

  useEffect(() => { checkAuth(); }, []);
  useEffect(() => { document.documentElement.classList.toggle('dark', darkMode); }, [darkMode]);

  return (
    <ErrorBoundary>
      <BrowserRouter>
        {!token ? <AuthPage /> : (
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/editor/:workId" element={<EditorPage />} />
            <Route path="/planner/:id" element={<PlannerPage />} />
            <Route path="/planner-survey" element={<SurveyPlannerPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        )}
      </BrowserRouter>
      <ToastContainer />
    </ErrorBoundary>
  );
}
