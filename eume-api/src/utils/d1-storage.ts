export interface User {
  id: number;
  user_id: string;
  created_at: string;
  last_interaction_at: string;
}

export interface AuthUser {
  id: string;
  username: string;
  name: string;
  role: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationMessage {
  id: number;
  user_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
  created_at: string;
}

export interface PhotoSession {
  id: number;
  user_id: string;
  image_analysis: string | null;
  is_active: boolean;
  start_time: number;
  created_at: string;
  updated_at: string;
}

export interface EffectiveTopic {
  id: number;
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
  id: number;
  user_id: string;
  trauma_keywords: string[];
  detailed_description: string;
  created_at: string;
  updated_at: string;
}

export interface Patient {
  id: string;
  name: string;
  age: number;
  gender: 'MALE' | 'FEMALE';
  dementiaLevel: string;
  triggerElements: string;
  relationship: string;
  memo: string;
  createdAt: string;
}

export class D1Storage {
  private db: D1Database;

  constructor(db: D1Database) {
    this.db = db;
  }

  // 사용자 생성 또는 업데이트
  async upsertUser(userId: string): Promise<void> {
    await this.db.prepare(`
      INSERT INTO users (user_id, last_interaction_at)
      VALUES (?, CURRENT_TIMESTAMP)
      ON CONFLICT(user_id) DO UPDATE SET
        last_interaction_at = CURRENT_TIMESTAMP
    `).bind(userId).run();
  }

  // 대화 메시지 추가
  async addConversationMessage(userId: string, role: 'user' | 'assistant' | 'system', content: string, timestamp: number): Promise<void> {
    await this.upsertUser(userId);

    await this.db.prepare(`
      INSERT INTO conversation_messages (user_id, role, content, timestamp)
      VALUES (?, ?, ?, ?)
    `).bind(userId, role, content, timestamp).run();
  }

  // 최근 대화 메시지 조회
  async getRecentMessages(userId: string, limit: number = 20): Promise<ConversationMessage[]> {
    const result = await this.db.prepare(`
      SELECT * FROM conversation_messages
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT ?
    `).bind(userId, limit).all();

    return result.results ? (result.results as ConversationMessage[]).reverse() : [];
  }

  // 30분 이전 메시지 삭제 (세션 타임아웃)
  async cleanupOldMessages(userId: string): Promise<void> {
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);

    await this.db.prepare(`
      DELETE FROM conversation_messages
      WHERE user_id = ? AND timestamp < ?
    `).bind(userId, thirtyMinutesAgo).run();
  }

  // 사진 세션 생성
  async createPhotoSession(userId: string, imageAnalysis: string, startTime: number): Promise<number> {
    await this.upsertUser(userId);

    // 기존 활성 세션 비활성화
    await this.db.prepare(`
      UPDATE photo_sessions
      SET is_active = FALSE
      WHERE user_id = ? AND is_active = TRUE
    `).bind(userId).run();

    const result = await this.db.prepare(`
      INSERT INTO photo_sessions (user_id, image_analysis, is_active, start_time)
      VALUES (?, ?, TRUE, ?)
      RETURNING id
    `).bind(userId, imageAnalysis, startTime).first();

    return (result as any).id;
  }

  // 활성 사진 세션 조회
  async getActivePhotoSession(userId: string): Promise<PhotoSession | null> {
    const result = await this.db.prepare(`
      SELECT * FROM photo_sessions
      WHERE user_id = ? AND is_active = TRUE
      ORDER BY start_time DESC
      LIMIT 1
    `).bind(userId).first();

    if (!result) {
      return null;
    }

    const session = result as any;

    // 1시간 이상 된 세션은 비활성화
    if (Date.now() - session.start_time > 3600000) {
      await this.db.prepare(`
        UPDATE photo_sessions
        SET is_active = FALSE
        WHERE id = ?
      `).bind(session.id).run();
      return null;
    }

    return {
      ...session,
      topic_keywords: session.topic_keywords ? JSON.parse(session.topic_keywords) : []
    };
  }

  // 사진 세션 비활성화
  async deactivatePhotoSession(userId: string): Promise<void> {
    await this.db.prepare(`
      UPDATE photo_sessions
      SET is_active = FALSE
      WHERE user_id = ? AND is_active = TRUE
    `).bind(userId).run();
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

  // 효과적인 주제 저장/업데이트
  async saveEffectiveTopic(userId: string, keywords: string[], wasSuccessful: boolean): Promise<void> {
    await this.upsertUser(userId);

    const keywordString = JSON.stringify(keywords.sort());

    // 기존 주제 찾기
    const existingTopic = await this.db.prepare(`
      SELECT * FROM effective_topics
      WHERE user_id = ? AND topic_keywords = ?
      LIMIT 1
    `).bind(userId, keywordString).first();

    if (existingTopic) {
      // 기존 주제 업데이트
      const topic = existingTopic as any;
      const newTotalCount = topic.total_count + 1;
      const newSuccessCount = topic.success_count + (wasSuccessful ? 1 : 0);
      const newSuccessRate = newSuccessCount / newTotalCount;

      await this.db.prepare(`
        UPDATE effective_topics
        SET success_count = ?, total_count = ?, success_rate = ?,
            last_success_at = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `).bind(
        newSuccessCount,
        newTotalCount,
        newSuccessRate,
        wasSuccessful ? new Date().toISOString() : topic.last_success_at,
        topic.id
      ).run();
    } else {
      // 새 주제 생성
      await this.db.prepare(`
        INSERT INTO effective_topics (user_id, topic_keywords, success_count, total_count, success_rate, last_success_at)
        VALUES (?, ?, ?, 1, ?, ?)
      `).bind(
        userId,
        keywordString,
        wasSuccessful ? 1 : 0,
        wasSuccessful ? 1.0 : 0.0,
        wasSuccessful ? new Date().toISOString() : null
      ).run();
    }
  }

  // 사용자의 효과적인 주제들 조회 (성공률 높은 순)
  async getEffectiveTopics(userId: string, limit: number = 10): Promise<EffectiveTopic[]> {
    const result = await this.db.prepare(`
      SELECT * FROM effective_topics
      WHERE user_id = ? AND total_count >= 2
      ORDER BY success_rate DESC, last_success_at DESC
      LIMIT ?
    `).bind(userId, limit).all();

    return result.results ? (result.results as any[]).map(topic => ({
      ...topic,
      topic_keywords: JSON.parse(topic.topic_keywords)
    })) : [];
  }

  // 트라우마 정보 저장/업데이트
  async saveTraumaInfo(userId: string, traumaInfo: {
    traumaKeywords: string[];
    detailedDescription: string;
  }): Promise<void> {
    await this.upsertUser(userId);

    const keywordString = JSON.stringify(traumaInfo.traumaKeywords);

    await this.db.prepare(`
      INSERT INTO trauma_info (user_id, trauma_keywords, detailed_description)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id) DO UPDATE SET
        trauma_keywords = ?, detailed_description = ?, updated_at = CURRENT_TIMESTAMP
    `).bind(
      userId,
      keywordString,
      traumaInfo.detailedDescription,
      keywordString,
      traumaInfo.detailedDescription
    ).run();
  }

  // 트라우마 정보 조회
  async getTraumaInfo(userId: string): Promise<TraumaInfo | null> {
    const result = await this.db.prepare(`
      SELECT * FROM trauma_info WHERE user_id = ? LIMIT 1
    `).bind(userId).first();

    if (!result) {
      return null;
    }

    const trauma = result as any;
    return {
      ...trauma,
      trauma_keywords: JSON.parse(trauma.trauma_keywords)
    };
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
    await this.db.prepare(`
      DELETE FROM trauma_info WHERE user_id = ?
    `).bind(userId).run();
  }

  // 새 사용자 생성
  async createUser(user: {
    id: string;
    username: string;
    name: string;
    role: string;
    createdAt: string;
  }, password: string): Promise<void> {
    // Simple password hashing (in production, use proper bcrypt or similar)
    const hashedPassword = await this.hashPassword(password);

    await this.db.prepare(`
      INSERT INTO auth_users (id, username, name, role, password_hash, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      user.id,
      user.username,
      user.name,
      user.role,
      hashedPassword,
      user.createdAt,
      user.createdAt
    ).run();
  }

  // 사용자명으로 사용자 조회
  async getUserByUsername(username: string): Promise<AuthUser | null> {
    const result = await this.db.prepare(`
      SELECT id, username, name, role, created_at, updated_at
      FROM auth_users
      WHERE username = ?
      LIMIT 1
    `).bind(username).first();

    return result as AuthUser | null;
  }

  // 사용자 인증
  async authenticateUser(username: string, password: string): Promise<AuthUser | null> {
    const result = await this.db.prepare(`
      SELECT id, username, name, role, password_hash, created_at, updated_at
      FROM auth_users
      WHERE username = ?
      LIMIT 1
    `).bind(username).first();

    if (!result) {
      return null;
    }

    const user = result as any;
    const isValidPassword = await this.verifyPassword(password, user.password_hash);

    if (!isValidPassword) {
      return null;
    }

    return {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };
  }

  // 간단한 패스워드 해싱 (프로덕션에서는 bcrypt 사용 권장)
  private async hashPassword(password: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + 'salt123'); // 실제로는 랜덤 솔트 사용
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 패스워드 검증
  private async verifyPassword(password: string, hash: string): Promise<boolean> {
    const computedHash = await this.hashPassword(password);
    return computedHash === hash;
  }

  // 환자 생성
  async createPatient(patient: Patient): Promise<void> {
    await this.db.prepare(`
      INSERT INTO patients (id, name, age, gender, dementia_level, trigger_elements, relationship, memo, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      patient.id,
      patient.name,
      patient.age,
      patient.gender,
      patient.dementiaLevel,
      patient.triggerElements,
      patient.relationship,
      patient.memo,
      patient.createdAt
    ).run();
  }

  // 환자 수정 (현재는 사용자당 하나의 환자만 지원)
  async updatePatient(userId: string, patientData: {
    name: string;
    age: number;
    gender: 'MALE' | 'FEMALE';
    dementiaLevel: string;
    triggerElements: string;
    relationship: string;
    memo: string;
    updatedAt: string;
  }): Promise<void> {
    // 현재는 사용자당 첫 번째 환자를 업데이트 (임시 구현)
    const result = await this.db.prepare(`
      UPDATE patients
      SET name = ?, age = ?, gender = ?, dementia_level = ?, trigger_elements = ?, relationship = ?, memo = ?, created_at = ?
      WHERE id = (SELECT id FROM patients ORDER BY created_at ASC LIMIT 1)
    `).bind(
      patientData.name,
      patientData.age,
      patientData.gender,
      patientData.dementiaLevel,
      patientData.triggerElements,
      patientData.relationship,
      patientData.memo,
      patientData.updatedAt
    ).run();

    console.log('환자 업데이트 결과:', result);
  }
}