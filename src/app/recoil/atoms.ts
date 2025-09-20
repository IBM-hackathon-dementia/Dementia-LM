import { atom } from 'recoil';
import { AuthState, SessionState, MemoryItem, ReportsState, SettingsState, Patient } from './types';
import { persistAtom } from './persist';

export const authState = atom<AuthState>({
  ...persistAtom('authState', {
    isAuthenticated: false,
    caregiver: null,
    selectedPatient: null,
  }),
});

export const patientsState = atom<Patient[]>({
  ...persistAtom('patientsState', []),
});

export const sessionState = atom<SessionState>({
  key: 'sessionState',
  default: {
    currentConversationId: null,
    startedAt: null,
    durationSec: 0,
    isActive: false,
    isSpeaking: false,
    isListening: false,
    currentMessage: '',
    conversationHistory: [],
  },
});

export const memoryItemsState = atom<MemoryItem[]>({
  key: 'memoryItemsState',
  default: [],
});

export const reportsState = atom<ReportsState>({
  key: 'reportsState',
  default: {
    weekly: {
      avgDuration: 0,
      positiveRate: 0,
      topTopic: '',
    },
    monthly: {
      avgDuration: 0,
      positiveRate: 0,
      topTopic: '',
    },
  },
});

export const settingsState = atom<SettingsState>({
  key: 'settingsState',
  default: {
    fontScale: 'large',
    highContrast: false,
    notifications: true,
  },
});