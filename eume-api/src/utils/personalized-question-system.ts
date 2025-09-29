import { D1Storage } from './d1-storage';

export interface PersonalizedQuestion {
    question: string;
    keywords: string[];
    expectedEffectiveness: number;
    reasoning: string;
}

export class PersonalizedQuestionSystem {
    private d1Storage: D1Storage;

    constructor(database: D1Database) {
        this.d1Storage = new D1Storage(database);
    }

    // LLM을 사용해 과거 대화에서 효과적인 패턴 분석
    async analyzeConversationPatterns(userId: string, aiRunner: any): Promise<string[]> {
        const messages = await this.d1Storage.getRecentMessages(userId, 30);

        if (messages.length < 6) {
            return []; // 충분한 대화 데이터가 없으면 빈 배열 반환
        }

        const conversationText = messages
            .map((msg, idx) => `${idx + 1}. ${msg.role === 'user' ? '환자' : '이음이'}: ${msg.content}`)
            .join('\n');

        const analysisPrompt = `다음은 치매 환자와의 실제 대화 기록입니다. 환자가 긍정적으로 반응한 주제와 키워드를 분석해주세요.

=== 대화 기록 ===
${conversationText}

=== 분석 요청 ===
환자가 다음과 같은 반응을 보인 주제들을 찾아주세요:
1. 긴 대답을 한 주제
2. 감정적으로 반응한 주제
3. 구체적인 기억을 떠올린 주제
4. 웃음이나 기쁨을 표현한 주제

효과적인 키워드 5개를 JSON 배열로만 응답하세요.
예: ["시골집", "어머니", "봄날", "친구", "학교"]`;

        try {
            const response = await aiRunner.run('@cf/google/gemma-3-12b-it', {
                messages: [{
                    role: 'user',
                    content: analysisPrompt
                }]
            });

            const keywords = JSON.parse(response.response || '[]');
            return Array.isArray(keywords) ? keywords.slice(0, 5) : [];
        } catch (error) {
            console.error('키워드 분석 실패:', error);
            return [];
        }
    }

    // 개인화된 다음 질문 생성
    async generatePersonalizedQuestion(userId: string, aiRunner: any, currentContext: string = ''): Promise<PersonalizedQuestion> {
        // 1. 과거 효과적인 주제들 조회
        const effectiveTopics = await this.d1Storage.getEffectiveTopics(userId, 5);

        // 2. 최근 대화에서 긍정적 키워드 분석 (D1에서는 간단한 구현)
        const recentKeywords = await this.analyzePositiveKeywordsD1(userId);

        // 3. LLM으로 패턴 분석
        const aiAnalyzedKeywords = await this.analyzeConversationPatterns(userId, aiRunner);

        // 4. 모든 키워드 조합
        const allKeywords = [
            ...effectiveTopics.flatMap(topic => topic.topic_keywords),
            ...recentKeywords,
            ...aiAnalyzedKeywords
        ];

        const uniqueKeywords = [...new Set(allKeywords)].slice(0, 8);

        // 5. 개인화된 질문 생성 프롬프트
        const questionPrompt = `치매 환자를 위한 개인화된 질문을 생성해주세요.

=== 환자 정보 ===
- 과거 긍정적 반응 키워드: ${uniqueKeywords.join(', ')}
- 현재 대화 맥락: ${currentContext}

=== 효과적인 주제 패턴 ===
${effectiveTopics.map(topic =>
    `- ${topic.topic_keywords.join(' + ')}: 성공률 ${Math.round(topic.success_rate * 100)}%`
).join('\n')}

=== 질문 생성 규칙 ===
1. 과거 긍정적 반응을 얻은 키워드를 2-3개 조합
2. 구체적이고 감정적인 기억을 유도
3. 15단어 이내로 간단하게
4. "~하신 적 있나요?" "~은 어떠셨나요?" 형태 사용

JSON 형식으로 응답:
{
  "question": "생성된 질문",
  "keywords": ["사용된", "키워드들"],
  "reasoning": "이 질문을 선택한 이유"
}`;

        try {
            const response = await aiRunner.run('@cf/google/gemma-3-12b-it', {
                messages: [{
                    role: 'user',
                    content: questionPrompt
                }]
            });

            const result = JSON.parse(response.response || '{}');

            // 예상 효과성 계산
            const effectiveness = await this.calculateExpectedEffectiveness(userId, result.keywords || []);

            return {
                question: result.question || "오늘 기분은 어떠세요?",
                keywords: result.keywords || [],
                expectedEffectiveness: effectiveness,
                reasoning: result.reasoning || "개인화된 질문 생성"
            };
        } catch (error) {
            console.error('개인화된 질문 생성 실패:', error);

            // 기본 질문 반환
            return {
                question: uniqueKeywords.length > 0
                    ? `${uniqueKeywords[0]}에 대해 기억나는 것이 있으신가요?`
                    : "오늘 기분은 어떠세요?",
                keywords: uniqueKeywords.slice(0, 2),
                expectedEffectiveness: 0.5,
                reasoning: "기본 질문 사용"
            };
        }
    }

    // 키워드 조합의 예상 효과성 계산
    private async calculateExpectedEffectiveness(userId: string, keywords: string[]): Promise<number> {
        if (keywords.length === 0) return 0.5;

        const effectivenesses = await Promise.all(
            keywords.map(keyword => this.getTopicEffectivenessD1(userId, [keyword]))
        );

        // 평균 효과성 계산
        const avgEffectiveness = effectivenesses.reduce((sum, eff) => sum + eff, 0) / effectivenesses.length;

        // 키워드가 많을수록 약간의 보너스 (최대 0.1)
        const keywordBonus = Math.min(keywords.length * 0.02, 0.1);

        return Math.min(avgEffectiveness + keywordBonus, 1.0);
    }

    // 대화 후 효과성 피드백 저장
    async recordQuestionEffectiveness(userId: string, keywords: string[], wasEffective: boolean): Promise<void> {
        if (keywords.length === 0) return;

        // 개별 키워드와 조합 모두 저장
        await this.d1Storage.saveEffectiveTopic(userId, keywords, wasEffective);

        // 2개 키워드 조합도 저장
        if (keywords.length >= 2) {
            for (let i = 0; i < keywords.length - 1; i++) {
                for (let j = i + 1; j < keywords.length; j++) {
                    await this.d1Storage.saveEffectiveTopic(userId, [keywords[i], keywords[j]], wasEffective);
                }
            }
        }
    }

    // 사용자별 학습 현황 조회
    async getLearningStatus(userId: string): Promise<{
        totalTopics: number;
        effectiveTopics: number;
        averageSuccessRate: number;
        topKeywords: string[];
    }> {
        const effectiveTopics = await this.d1Storage.getEffectiveTopics(userId, 50);
        const recentKeywords = await this.analyzePositiveKeywordsD1(userId);

        const totalTopics = effectiveTopics.length;
        const highEffectiveTopics = effectiveTopics.filter(topic => topic.success_rate > 0.6).length;
        const avgSuccessRate = totalTopics > 0
            ? effectiveTopics.reduce((sum, topic) => sum + topic.success_rate, 0) / totalTopics
            : 0;

        return {
            totalTopics,
            effectiveTopics: highEffectiveTopics,
            averageSuccessRate: avgSuccessRate,
            topKeywords: recentKeywords.slice(0, 5)
        };
    }

    // D1 기반 긍정적 키워드 분석 (Supabase 대체)
    private async analyzePositiveKeywordsD1(userId: string): Promise<string[]> {
        const messages = await this.d1Storage.getRecentMessages(userId, 50);

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
        const userMessages = messages.filter(m => m.role === 'user');

        // 사용자 메시지에서 키워드 빈도 계산
        userMessages.forEach(message => {
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

    // D1 기반 주제 효과성 조회 (Supabase 대체)
    private async getTopicEffectivenessD1(userId: string, keywords: string[]): Promise<number> {
        const effectiveTopics = await this.d1Storage.getEffectiveTopics(userId, 100);

        // 키워드와 일치하는 주제 찾기
        const matchingTopic = effectiveTopics.find(topic =>
            keywords.every(keyword => topic.topic_keywords.includes(keyword))
        );

        if (!matchingTopic) {
            return 0.5; // 기본값: 50% 효과성
        }

        // 시도 횟수가 적으면 기본값에 가중치 적용
        if (matchingTopic.total_count < 3) {
            return (matchingTopic.success_rate + 0.5) / 2;
        }

        return matchingTopic.success_rate;
    }
}