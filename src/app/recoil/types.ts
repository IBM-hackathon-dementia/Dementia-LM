export interface Caregiver {
  id: string;
  name: string;
  email: string;
  phone?: string;
  createdAt: Date;
}

export interface Patient {
  id: string;
  name: string;
  caregiverId: string;
  age: number;
  gender: 'male' | 'female';
  dementiaStage: 'mild' | 'moderate' | 'severe';
  hasTrauma: boolean;
  traumaDetails?: string;
  relationshipToCaregiver: string;
  profileImage?: string;
  preferences?: {
    topics: string[];
    voiceSettings: {
      speed: number;
      pitch: number;
      volume: number;
    };
  };
  createdAt: Date;
}

export interface AuthState {
  isAuthenticated: boolean;
  caregiver: Caregiver | null;
  selectedPatient: Patient | null;
}

export interface SessionState {
  currentConversationId: string | null;
  startedAt: Date | null;
  durationSec: number;
  isActive: boolean;
  isSpeaking: boolean;
  isListening: boolean;
  currentMessage: string;
  conversationHistory: ConversationMessage[];
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  audioUrl?: string;
  emotion?: 'positive' | 'neutral' | 'negative';
}

export interface MemoryItem {
  id: string;
  type: 'photo' | 'music';
  title: string;
  url: string;
  tags?: string[];
}

export interface ReportData {
  avgDuration: number;
  positiveRate: number;
  topTopic: string;
}

export interface ReportsState {
  weekly: ReportData;
  monthly: ReportData;
}

export interface SettingsState {
  fontScale: 'large' | 'xlarge';
  highContrast: boolean;
  notifications: boolean;
}

export interface Question {
  id: string;
  text: string;
  category: string;
  tags?: string[];
}