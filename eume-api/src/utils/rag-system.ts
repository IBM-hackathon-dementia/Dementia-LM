import guideData from '../data/dementia-care-guide.json';

interface GuideContext {
    section: string;
    content: string[];
    priority: number;
}

export class RAGSystem {
    private readonly keywordMap = new Map<string, GuideContext[]>([
        ['안녕', [
            { section: '기본 인사', content: guideData.conversationPreparation.initialQuestions.slice(0, 3), priority: 1 },
            { section: '격려 표현', content: guideData.responsePatterns.encouragingPhrases.slice(0, 3), priority: 2 }
        ]],
        ['기분', [
            { section: '감정 확인', content: ['기분이 어떠신가요?', '오늘 컨디션은 어떠세요?'], priority: 1 },
            { section: '격려', content: guideData.responsePatterns.encouragingPhrases.slice(0, 3), priority: 2 }
        ]],
        ['날씨', [
            { section: '현재 인식', content: guideData.conversationPreparation.initialQuestions.filter(q => q.includes('날씨')), priority: 1 }
        ]],
        ['시간', [
            { section: '지남력 훈련', content: guideData.conversationPreparation.initialQuestions.filter(q => q.includes('시간') || q.includes('몇')), priority: 1 }
        ]],
        
        ['어린', [
            { section: '회상 주제', content: ['어린 시절 이야기를 들려주세요', '어릴 때 가장 기억에 남는 일이 있나요?'], priority: 1 }
        ]],
        ['고향', [
            { section: '회상 주제', content: ['고향이 어디신가요?', '고향에서의 추억이 있으시나요?'], priority: 1 }
        ]],
        ['가족', [
            { section: '회상 주제', content: ['가족과의 좋은 추억이 있으신가요?', '가족 이야기를 들려주세요'], priority: 1 }
        ]],
        ['음식', [
            { section: '회상 주제', content: ['좋아하시는 음식이 있나요?', '옛날에 자주 드셨던 음식이 있으신가요?'], priority: 1 }
        ]],
        ['노래', [
            { section: '회상 주제', content: ['좋아하시는 노래가 있나요?', '옛날에 즐겨 들으셨던 노래가 있으신가요?'], priority: 1 }
        ]],
        
        ['슬프', [
            { section: '부정적 감정 대응', content: guideData.conversationGuidelines.emotionalSupport.encouragement, priority: 1 }
        ]],
        ['힘들', [
            { section: '부정적 감정 대응', content: guideData.conversationGuidelines.emotionalSupport.encouragement, priority: 1 }
        ]],
        ['좋', [
            { section: '긍정적 반응', content: guideData.responsePatterns.encouragingPhrases, priority: 1 }
        ]],
        
        ['모르겠', [
            { section: '명료화', content: guideData.responsePatterns.clarificationPhrases, priority: 1 }
        ]],
        ['다시', [
            { section: '명료화', content: guideData.responsePatterns.clarificationPhrases, priority: 1 }
        ]]
    ]);

    private readonly conversationPrinciples = guideData.conversationGuidelines.basicAttitude;
    private readonly encouragingPhrases = guideData.responsePatterns.encouragingPhrases;

    public retrieveRelevantGuidance(userInput: string): string {
        const contexts: GuideContext[] = [];
        const inputLower = userInput.toLowerCase();

        for (const [keyword, guideContexts] of this.keywordMap) {
            if (inputLower.includes(keyword)) {
                contexts.push(...guideContexts);
            }
        }

        const sortedContexts = contexts
            .sort((a, b) => a.priority - b.priority)
            .slice(0, 3); // 최대 3개 컨텍스트만 사용

        let guidance = '';
        
        guidance += '대화 시 기본 원칙:\n';
        guidance += this.conversationPrinciples.slice(0, 3).map(principle => `- ${principle}`).join('\n');
        guidance += '\n\n';

        if (sortedContexts.length > 0) {
            guidance += '상황별 가이드:\n';
            for (const context of sortedContexts) {
                guidance += `${context.section}:\n`;
                guidance += context.content.map(item => `- ${item}`).join('\n');
                guidance += '\n';
            }
        }

        guidance += '격려 표현 예시:\n';
        guidance += this.encouragingPhrases.slice(0, 3).map(phrase => `- ${phrase}`).join('\n');

        return guidance;
    }

    public getStageGuidance(stage: 'initial' | 'conversation' | 'reminiscence' | 'closure'): string {
        switch (stage) {
            case 'initial':
                return `초기 대화 가이드:
- ${guideData.conversationPreparation.initialQuestions.slice(0, 3).join('\n- ')}

기본 태도:
- ${guideData.conversationGuidelines.basicAttitude.slice(0, 3).join('\n- ')}`;

            case 'reminiscence':
                return `회상 활동 가이드:
추천 주제:
- ${guideData.reminiscenceProgram.topics.slice(0, 5).join('\n- ')}

진행 방법:
- 환자가 자발적으로 이야기하도록 유도
- 경청과 반복적 질문으로 대화 확장
- 긍정적인 기억 위주로 대화 진행`;

            case 'closure':
                return `마무리 가이드:
- 오늘의 이야기를 간단히 정리
- 활동 소감을 나누며 끝맺음
- 긍정적인 마무리 인사

마무리 표현:
- ${guideData.responsePatterns.transitionPhrases.slice(0, 2).join('\n- ')}`;

            default:
                return `일반 대화 가이드:
- ${this.conversationPrinciples.slice(0, 3).join('\n- ')}

격려 표현:
- ${this.encouragingPhrases.slice(0, 3).join('\n- ')}`;
        }
    }
}

export const ragSystem = new RAGSystem();