import { SupabaseStorage } from './supabase';

export interface PersonalizedQuestion {
    question: string;
    keywords: string[];
    expectedEffectiveness: number;
    reasoning: string;
}

export class PersonalizedQuestionSystem {
    private supabase: SupabaseStorage;

    constructor(supabaseUrl: string, supabaseKey: string) {
        this.supabase = new SupabaseStorage(supabaseUrl, supabaseKey);
    }

    // LLM을 사용해 과거 대화에서 효과적인 패턴 분석
    async analyzeConversationPatterns(userId: string, aiRunner: any): Promise<string[]> {
        const messages = await this.supabase.getRecentMessages(userId, 30);

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
        const effectiveTopics = await this.supabase.getEffectiveTopics(userId, 5);

        // 2. 최근 대화에서 긍정적 키워드 분석
        const recentKeywords = await this.supabase.analyzePositiveKeywords(userId);

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
            keywords.map(keyword => this.supabase.getTopicEffectiveness(userId, [keyword]))
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
        await this.supabase.saveEffectiveTopic(userId, keywords, wasEffective);

        // 2개 키워드 조합도 저장
        if (keywords.length >= 2) {
            for (let i = 0; i < keywords.length - 1; i++) {
                for (let j = i + 1; j < keywords.length; j++) {
                    await this.supabase.saveEffectiveTopic(userId, [keywords[i], keywords[j]], wasEffective);
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
        const effectiveTopics = await this.supabase.getEffectiveTopics(userId, 50);
        const recentKeywords = await this.supabase.analyzePositiveKeywords(userId);

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
}