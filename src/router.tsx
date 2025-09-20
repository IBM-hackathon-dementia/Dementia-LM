import { createBrowserRouter } from 'react-router-dom';
import HomePage from './app/routes/index';
import LoginPage from './app/routes/login';
import DashboardPage from './app/routes/dashboard';
import ConversationPage from './app/routes/conversation';
import SessionPage from './app/routes/session';
import UploadPage from './app/routes/upload';
import ReportsPage from './app/routes/reports';
import CaregiverPage from './app/routes/caregiver';
import SettingsPage from './app/routes/settings';
import VoiceSettingsPage from './app/routes/voice-settings';
import OnboardingPage from './app/routes/onboarding';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <HomePage />,
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/dashboard',
    element: <DashboardPage />,
  },
  {
    path: '/conversation',
    element: <ConversationPage />,
  },
  {
    path: '/session',
    element: <SessionPage />,
  },
  {
    path: '/upload',
    element: <UploadPage />,
  },
  {
    path: '/reports',
    element: <ReportsPage />,
  },
  {
    path: '/caregiver',
    element: <CaregiverPage />,
  },
  {
    path: '/settings',
    element: <SettingsPage />,
  },
  {
    path: '/voice-settings',
    element: <VoiceSettingsPage />,
  },
  {
    path: '/onboarding',
    element: <OnboardingPage />,
  },
]);