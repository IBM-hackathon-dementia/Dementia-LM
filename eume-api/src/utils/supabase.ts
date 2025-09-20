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

export interface EffectiveTopic {
  id: string;
  user_id: string;
  topic_keywords: string[];
  success_count: number;
  total_count: number;
  success_rate: number;
  last_success_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TraumaInfo {
  id: string;
  user_id: string;
  trauma_keywords: string[];
  detailed_description: string;
  created_at: string;
  updated_at: string;
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

  // 효과적인 주제 저장/업데이트
  async saveEffectiveTopic(userId: string, keywords: string[], wasSuccessful: boolean): Promise<void> {
    await this.upsertUser(userId);

    // 키워드 조합으로 기존 주제 찾기
    const keywordString = keywords.sort().join(',');

    const { data: existingTopic, error: selectError } = await (this.supabase as any)
      .from('effective_topics')
      .select('*')
      .eq('user_id', userId)
      .contains('topic_keywords', keywords)
      .limit(1);

    if (selectError) {
      console.error('Error finding existing topic:', selectError);
    }

    if (existingTopic && existingTopic.length > 0) {
      // 기존 주제 업데이트
      const topic = existingTopic[0];
      const newTotalCount = topic.total_count + 1;
      const newSuccessCount = topic.success_count + (wasSuccessful ? 1 : 0);
      const newSuccessRate = newSuccessCount / newTotalCount;

      const { error } = await (this.supabase as any)
        .from('effective_topics')
        .update({
          success_count: newSuccessCount,
          total_count: newTotalCount,
          success_rate: newSuccessRate,
          last_success_at: wasSuccessful ? new Date().toISOString() : topic.last_success_at,
          updated_at: new Date().toISOString()
        })
        .eq('id', topic.id);

      if (error) {
        console.error('Error updating effective topic:', error);
      }
    } else {
      // 새 주제 생성
      const { error } = await (this.supabase as any)
        .from('effective_topics')
        .insert({
          user_id: userId,
          topic_keywords: keywords,
          success_count: wasSuccessful ? 1 : 0,
          total_count: 1,
          success_rate: wasSuccessful ? 1.0 : 0.0,
          last_success_at: wasSuccessful ? new Date().toISOString() : null
        });

      if (error) {
        console.error('Error creating effective topic:', error);
      }
    }
  }

  // 사용자의 효과적인 주제들 조회 (성공률 높은 순)
  async getEffectiveTopics(userId: string, limit: number = 10): Promise<EffectiveTopic[]> {
    const { data, error } = await (this.supabase as any)
      .from('effective_topics')
      .select('*')
      .eq('user_id', userId)
      .gte('total_count', 2) // 최소 2번 이상 시도된 주제만
      .order('success_rate', { ascending: false })
      .order('last_success_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error getting effective topics:', error);
      return [];
    }

    return data || [];
  }

  // 특정 키워드 조합의 효과성 조회
  async getTopicEffectiveness(userId: string, keywords: string[]): Promise<number> {
    const { data, error } = await (this.supabase as any)
      .from('effective_topics')
      .select('success_rate, total_count')
      .eq('user_id', userId)
      .contains('topic_keywords', keywords)
      .order('total_count', { ascending: false })
      .limit(1);

    if (error || !data || data.length === 0) {
      return 0.5; // 기본값: 50% 효과성
    }

    const topic = data[0];
    // 시도 횟수가 적으면 기본값에 가중치 적용
    if (topic.total_count < 3) {
      return (topic.success_rate + 0.5) / 2;
    }

    return topic.success_rate;
  }

  // 과거 대화에서 긍정적 반응을 얻은 키워드 분석
  async analyzePositiveKeywords(userId: string): Promise<string[]> {
    // 최근 50개 대화 메시지 조회
    const { data: messages, error } = await (this.supabase as any)
      .from('conversation_messages')
      .select('content, role, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(50);

    if (error || !messages) {
      return [];
    }

    // 긍정적 키워드 후보들
    const positiveKeywords = [
      '시골', '어린시절', '가족', '엄마', '아빠', '형제', '자매',
      '학교', '친구', '선생님', '고향', '집', '마당', '정원',
      '봄', '여름', '가을', '겨울', '꽃', '나무', '바다', '산',
      '음식', '밥', '국', '김치', '떡', '과자', '차', '커피',
      '일', '직장', '회사', '동료', '취미', '운동', '노래',
      '결혼', '신혼', '아이', '손자', '손녀', '명절', '생일',
      '여행', '나들이', '시장', '병원', '교회', '절', '공원'
    ];

    const keywordCounts: { [key: string]: number } = {};
    const userMessages = messages.filter((m: ConversationMessage) => m.role === 'user');

    // 사용자 메시지에서 키워드 빈도 계산
    userMessages.forEach((message: ConversationMessage) => {
      positiveKeywords.forEach(keyword => {
        if (message.content.includes(keyword)) {
          keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
        }
      });
    });

    // 빈도순으로 정렬하여 상위 키워드 반환
    return Object.entries(keywordCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([keyword]) => keyword);
  }

  // 트라우마 정보 저장/업데이트
  async saveTraumaInfo(userId: string, traumaInfo: {
    traumaKeywords: string[];
    detailedDescription: string;
  }): Promise<void> {
    await this.upsertUser(userId);

    // 기존 트라우마 정보 확인
    const { data: existingTrauma, error: selectError } = await (this.supabase as any)
      .from('trauma_info')
      .select('*')
      .eq('user_id', userId)
      .limit(1);

    if (selectError) {
      // 테이블이 존재하지 않는 경우 처리
      if (selectError.code === 'PGRST205') {
        console.log('trauma_info 테이블이 존재하지 않습니다. 스키마 확인이 필요합니다.');
        return; // 임시로 무시하고 리턴
      }
      console.error('Error finding existing trauma info:', selectError);
    }

    if (existingTrauma && existingTrauma.length > 0) {
      // 기존 정보 업데이트
      const { error } = await (this.supabase as any)
        .from('trauma_info')
        .update({
          trauma_keywords: traumaInfo.traumaKeywords,
          detailed_description: traumaInfo.detailedDescription,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', userId);

      if (error) {
        throw new Error(`Failed to update trauma info: ${error.message}`);
      }
    } else {
      // 새 트라우마 정보 생성
      const { error } = await (this.supabase as any)
        .from('trauma_info')
        .insert({
          user_id: userId,
          trauma_keywords: traumaInfo.traumaKeywords,
          detailed_description: traumaInfo.detailedDescription
        });

      if (error) {
        throw new Error(`Failed to create trauma info: ${error.message}`);
      }
    }
  }

  // 트라우마 정보 조회
  async getTraumaInfo(userId: string): Promise<TraumaInfo | null> {
    try {
      const { data, error } = await (this.supabase as any)
        .from('trauma_info')
        .select('*')
        .eq('user_id', userId)
        .limit(1)
        .single();

      if (error) {
        if (error.code === 'PGRST116') { // No rows found
          return null;
        }
        if (error.code === 'PGRST205') { // Table not found
          console.log('trauma_info 테이블이 존재하지 않습니다.');
          return null;
        }
        throw new Error(`Failed to get trauma info: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('trauma_info 조회 오류:', error);
      return null;
    }
  }

  // 특정 텍스트에 트라우마 키워드가 포함되어 있는지 확인
  async checkForTraumaContent(userId: string, text: string): Promise<{
    hasTrauma: boolean;
    matchedKeywords: string[];
  }> {
    const traumaInfo = await this.getTraumaInfo(userId);

    if (!traumaInfo) {
      return { hasTrauma: false, matchedKeywords: [] };
    }

    const matchedKeywords = traumaInfo.trauma_keywords.filter(term =>
      text.toLowerCase().includes(term.toLowerCase())
    );

    return {
      hasTrauma: matchedKeywords.length > 0,
      matchedKeywords
    };
  }

  // 트라우마 정보 삭제
  async deleteTraumaInfo(userId: string): Promise<void> {
    const { error } = await (this.supabase as any)
      .from('trauma_info')
      .delete()
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Failed to delete trauma info: ${error.message}`);
    }
  }
}