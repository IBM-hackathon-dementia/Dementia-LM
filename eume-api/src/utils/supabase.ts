import { createClient } from '@supabase/supabase-js';

// Supabase 타입 정의
export interface User {
  id: string;
  user_id: string;
  created_at: string;
  last_interaction_at: string;
}

export interface ConversationMessage {
  id: string;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  created_at: string;
}

export interface PhotoSession {
  id: string;
  user_id: string;
  image_analysis: string | null;
  is_active: boolean;
  start_time: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationSession {
  id: string;
  user_id: string;
  session_start: number;
  session_end: number | null;
  total_duration: number | null;
  total_conversations: number;
  photo_session_id: string | null;
  created_at: string;
}

export function createSupabaseClient(supabaseUrl: string, supabaseKey: string) {
  return createClient(supabaseUrl, supabaseKey);
}

export class SupabaseStorage {
  private supabase: ReturnType<typeof createClient>;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  // 사용자 생성 또는 업데이트
  async upsertUser(userId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('users')
      .upsert({
        user_id: userId,
        last_interaction_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

    if (error) {
      throw new Error(`Failed to upsert user: ${error.message}`);
    }
  }

  // 대화 메시지 추가
  async addConversationMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, timestamp: number): Promise<void> {
    await this.upsertUser(userId);

    const { error } = await (this.supabase as any)
      .from('conversation_messages')
      .insert({
        user_id: userId,
        role,
        content,
        timestamp
      });

    if (error) {
      throw new Error(`Failed to add conversation message: ${error.message}`);
    }
  }

  // 최근 대화 메시지 조회
  async getRecentMessages(userId: string, limit: number = 20): Promise<ConversationMessage[]> {
    const { data, error } = await (this.supabase as any)
      .from('conversation_messages')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to get recent messages: ${error.message}`);
    }

    return data?.reverse() || [];
  }

  // 30분 이전 메시지 삭제 (세션 타임아웃)
  async cleanupOldMessages(userId: string): Promise<void> {
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);

    const { error } = await (this.supabase as any)
      .from('conversation_messages')
      .delete()
      .eq('user_id', userId)
      .lt('timestamp', thirtyMinutesAgo);

    if (error) {
      throw new Error(`Failed to cleanup old messages: ${error.message}`);
    }
  }

  // 사진 세션 생성
  async createPhotoSession(userId: string, imageAnalysis: string, startTime: number): Promise<string> {
    await this.upsertUser(userId);

    // 기존 활성 세션 비활성화
    await (this.supabase as any)
      .from('photo_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    const { data, error } = await (this.supabase as any)
      .from('photo_sessions')
      .insert({
        user_id: userId,
        image_analysis: imageAnalysis,
        is_active: true,
        start_time: startTime
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(`Failed to create photo session: ${error.message}`);
    }

    return data.id;
  }

  // 활성 사진 세션 조회
  async getActivePhotoSession(userId: string): Promise<PhotoSession | null> {
    const { data, error } = await (this.supabase as any)
      .from('photo_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('start_time', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') { // No rows found
        return null;
      }
      throw new Error(`Failed to get active photo session: ${error.message}`);
    }

    // 1시간 이상 된 세션은 비활성화
    if (data && Date.now() - data.start_time > 3600000) {
      await (this.supabase as any)
        .from('photo_sessions')
        .update({ is_active: false })
        .eq('id', data.id);
      return null;
    }

    return data;
  }

  // 사진 세션 비활성화
  async deactivatePhotoSession(userId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('photo_sessions')
      .update({ is_active: false })
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error) {
      throw new Error(`Failed to deactivate photo session: ${error.message}`);
    }
  }

  // 대화 히스토리 조회 (기존 KV 형태와 호환)
  async getConversationHistory(userId: string): Promise<{
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }>;
    lastInteractionTime: number;
    photoSession?: { imageAnalysis: string; isActive: boolean; startTime: number } | null;
  }> {
    // 오래된 메시지 정리
    await this.cleanupOldMessages(userId);

    // 최근 메시지 조회
    const messages = await this.getRecentMessages(userId);

    // 활성 사진 세션 조회
    const photoSession = await this.getActivePhotoSession(userId);

    const lastInteractionTime = messages.length > 0
      ? Math.max(...messages.map(m => m.timestamp))
      : Date.now();

    return {
      messages: messages.map(m => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp
      })),
      lastInteractionTime,
      photoSession: photoSession ? {
        imageAnalysis: photoSession.image_analysis || '',
        isActive: photoSession.is_active,
        startTime: photoSession.start_time
      } : null
    };
  }

  // 대화 히스토리 저장 (기존 KV 형태와 호환)
  async saveConversationHistory(userId: string, history: {
    messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string; timestamp: number }>;
    lastInteractionTime: number;
    photoSession?: { imageAnalysis: string; isActive: boolean; startTime: number };
  }): Promise<void> {
    // 새로운 메시지만 추가 (기존 메시지는 이미 저장되어 있음)
    const existingMessages = await this.getRecentMessages(userId);
    const existingTimestamps = new Set(existingMessages.map(m => m.timestamp));

    for (const message of history.messages) {
      if (!existingTimestamps.has(message.timestamp)) {
        await this.addConversationMessage(userId, message.role, message.content, message.timestamp);
      }
    }

    // 사진 세션 업데이트
    if (history.photoSession) {
      const activeSession = await this.getActivePhotoSession(userId);
      if (!activeSession && history.photoSession.isActive) {
        await this.createPhotoSession(userId, history.photoSession.imageAnalysis, history.photoSession.startTime);
      } else if (activeSession && !history.photoSession.isActive) {
        await this.deactivatePhotoSession(userId);
      }
    }
  }
}