interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface CDRKnowledgeBase {
    level: string;
    criteria: {
        memory: string;
        orientation: string;
        judgment: string;
        communityAffairs: string;
        homeHobbies: string;
        personalCare: string;
    };
    characteristics: string[];
    recommendations: string[];
}

class ReportRAGSystem {
    private cdrKnowledge: CDRKnowledgeBase[] = [
        {
            level: "CDR 0 (정상)",
            criteria: {
                memory: "기억장애가 전혀 없거나 경미한 건망증이 때때로 나타남",
                orientation: "정상",
                judgment: "일상생활의 문제를 잘 해결하고 사업이나 재정문제도 잘 처리함",
                communityAffairs: "직장생활, 물건사기, 자원봉사, 사회적 활동 등에서 보통수준의 독립적 기능이 가능함",
                homeHobbies: "집안생활, 취미생활, 지적인 관심이 잘 유지되어 있음",
                personalCare: "정상"
            },
            characteristics: [
                "인지기능이 정상 범위",
                "독립적 생활 가능",
                "사회적 기능 유지"
            ],
            recommendations: [
                "현재 상태를 유지하기 위한 지적 활동 지속",
                "정기적인 건강 검진",
                "사회적 활동 참여 격려"
            ]
        },
        {
            level: "CDR 0.5 (매우 경도치매)",
            criteria: {
                memory: "경하지만 지속적인 건망증; 사건의 부분적인 회상만 가능",
                orientation: "시간에 대한 경미한 장애가 있는 것 외에는 정상",
                judgment: "문제해결능력, 유사성, 상이성 해석에 대한 경미한 장애",
                communityAffairs: "이와 같은 활동에 있어서의 장애가 의심되거나 약간의 장애가 있음",
                homeHobbies: "집안생활, 취미생활, 지적인 관심이 다소 손상되어 있음",
                personalCare: "정상"
            },
            characteristics: [
                "경도인지장애 수준",
                "일상생활에 미미한 영향",
                "조기 개입 중요"
            ],
            recommendations: [
                "인지 자극 프로그램 참여",
                "규칙적인 운동과 사회 활동",
                "전문의 정기 상담",
                "보호자 교육 필요"
            ]
        },
        {
            level: "CDR 1 (경도치매)",
            criteria: {
                memory: "중등도의 기억장애; 최근 것에 대한 기억장애가 더 심함; 일상생활에 지장이 있음",
                orientation: "시간에 대해 중등도의 장애가 있음; 사람과 장소에 대해서는 검사상으로는 정상이나 실생활에서 길 찾기에 장애가 있을 수 있음",
                judgment: "문제해결능력, 유사성, 상이성 해석에 대한 중등도의 장애",
                communityAffairs: "이와 같은 활동의 일부에 아직 참여하고 있고 언뜻 보기에는 정상활동을 수행하는 것처럼 보이나 사실상 독립적인 수행이 불가능함",
                homeHobbies: "집안생활에 경하지만 분명한 장애가 있고, 어려운 집안일은 포기된 상태임",
                personalCare: "가끔 개인위생에 대한 권고가 필요함"
            },
            characteristics: [
                "명확한 인지 저하",
                "일상생활 수행에 어려움",
                "감독과 지원 필요"
            ],
            recommendations: [
                "일상생활 지원 체계 구축",
                "안전 관리 강화",
                "정기적인 인지 평가",
                "가족 돌봄 교육"
            ]
        },
        {
            level: "CDR 2 (중등도치매)",
            criteria: {
                memory: "심한 기억장애; 과거에 반복적으로 많이 학습한 것만 기억; 새로운 정보는 금방 잊음",
                orientation: "시간에 대한 지남력은 상실되어 있고 장소에 대한 지남력 역시 자주 손상됨",
                judgment: "문제해결, 유사성, 상이성 해석에 심한 장애; 사회생활에서의 판단력이 대부분 손상됨",
                communityAffairs: "집 밖에서 독립적인 활동을 할 수 없으나 외견상으로는 집 밖에서도 기능을 잘 할 수 있어 보임",
                homeHobbies: "아주 간단한 집안 일만 할 수 있고, 관심이나 흥미가 매우 제한됨",
                personalCare: "옷 입기, 개인위생, 개인 소지품의 유지에 도움이 필요함"
            },
            characteristics: [
                "상당한 인지기능 저하",
                "전면적인 돌봄 필요",
                "행동심리증상 동반 가능"
            ],
            recommendations: [
                "24시간 돌봄 체계",
                "안전사고 예방 조치",
                "행동심리증상 관리",
                "보호자 스트레스 관리"
            ]
        },
        {
            level: "CDR 3 (심도치매)",
            criteria: {
                memory: "심한 기억장애; 부분적이고 단편적인 사실만 보존됨",
                orientation: "사람에 대한 지남력만 유지되고 있음",
                judgment: "판단이나 문제해결이 불가능함",
                communityAffairs: "집 밖에서 독립적인 활동을 할 수 없고 외견상으로도 가정을 떠나 외부에서는 정상적인 기능을 할 수 없어 보임",
                homeHobbies: "집안에서 의미있는 기능 수행이 없음",
                personalCare: "개인위생과 몸치장의 유지에 많은 도움이 필요하며, 자주 대소변의 실금이 있음"
            },
            characteristics: [
                "중증 인지기능 장애",
                "완전한 의존 상태",
                "의료적 돌봄 필수"
            ],
            recommendations: [
                "전문 의료진 상주",
                "욕창 예방 및 관리",
                "영양 관리",
                "감염 예방"
            ]
        }
    ];

    private analysisGuidelines = {
        memoryAssessment: {
            "단기기억": "대화 중 언급된 내용을 기억하는지 확인",
            "장기기억": "과거 경험이나 사건에 대한 회상 능력",
            "인식기억": "사람, 장소, 사건에 대한 인식"
        },
        orientationAssessment: {
            "시간지남력": "현재 시간, 날짜, 계절에 대한 인식",
            "장소지남력": "현재 위치나 장소에 대한 인식",
            "상황지남력": "현재 상황이나 맥락에 대한 이해"
        },
        languageAssessment: {
            "이해력": "질문이나 지시사항에 대한 이해 정도",
            "표현력": "자신의 생각을 언어로 표현하는 능력",
            "유창성": "말의 흐름과 적절한 어휘 사용"
        },
        behavioralSymptoms: [
            "초조/불안",
            "우울",
            "무감동/무관심",
            "환각/망상",
            "수면장애",
            "식사장애",
            "반복행동"
        ]
    };

    // 대화 내용을 분석하여 CDR 수준 추정
    estimateCDRLevel(conversations: ConversationMessage[]): string {
        const userMessages = conversations.filter(msg => msg.role === 'user');
        
        // 기본 점수 계산
        const memoryScore = this.assessMemory(userMessages);
        const orientationScore = this.assessOrientation(userMessages);
        const languageScore = this.assessLanguage(userMessages);
        
        const totalScore = memoryScore + orientationScore + languageScore;
        const avgScore = totalScore / 3;
        
        if (avgScore >= 4.5) return "CDR 0 (정상)";
        else if (avgScore >= 3.5) return "CDR 0.5 (매우 경도치매)";
        else if (avgScore >= 2.5) return "CDR 1 (경도치매)";
        else if (avgScore >= 1.5) return "CDR 2 (중등도치매)";
        else return "CDR 3 (심도치매)";
    }

    private assessMemory(userMessages: ConversationMessage[]): number {
        let score = 3; // 기본 점수
        
        // 응답의 일관성 체크
        const avgLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length;
        if (avgLength > 20) score += 1;
        if (avgLength < 5) score -= 1;
        
        // 반복적인 질문이나 혼란 체크
        const confusionKeywords = ['기억', '모르겠', '잊었', '헷갈'];
        const confusionCount = userMessages.reduce((count, msg) => {
            return count + confusionKeywords.filter(keyword => msg.content.includes(keyword)).length;
        }, 0);
        
        if (confusionCount > userMessages.length / 2) score -= 1;
        
        return Math.max(1, Math.min(5, score));
    }

    private assessOrientation(userMessages: ConversationMessage[]): number {
        let score = 3; // 기본 점수
        
        // 시공간 관련 키워드 체크
        const timeKeywords = ['오늘', '어제', '내일', '지금', '요즘'];
        const placeKeywords = ['집', '병원', '여기', '거기'];
        
        const hasTimeContext = userMessages.some(msg => 
            timeKeywords.some(keyword => msg.content.includes(keyword))
        );
        const hasPlaceContext = userMessages.some(msg => 
            placeKeywords.some(keyword => msg.content.includes(keyword))
        );
        
        if (hasTimeContext) score += 0.5;
        if (hasPlaceContext) score += 0.5;
        
        return Math.max(1, Math.min(5, score));
    }

    private assessLanguage(userMessages: ConversationMessage[]): number {
        let score = 3; // 기본 점수
        
        const totalWords = userMessages.reduce((sum, msg) => sum + msg.content.split(' ').length, 0);
        const avgWordsPerMessage = totalWords / userMessages.length;
        
        if (avgWordsPerMessage > 10) score += 1;
        else if (avgWordsPerMessage < 3) score -= 1;
        
        // 문장 구조의 복잡성 평가 (간단한 휴리스틱)
        const complexSentences = userMessages.filter(msg => 
            msg.content.includes('그런데') || 
            msg.content.includes('하지만') || 
            msg.content.includes('그래서')
        ).length;
        
        if (complexSentences > 0) score += 0.5;
        
        return Math.max(1, Math.min(5, score));
    }

    // CDR 수준에 따른 권장사항 제공
    getRecommendationsByLevel(level: string): string[] {
        const cdrData = this.cdrKnowledge.find(item => item.level.includes(level.split(' ')[1]));
        return cdrData?.recommendations || [];
    }

    // 행동심리증상 분석
    analyzeBehavioralSymptoms(conversations: ConversationMessage[]): string[] {
        const userMessages = conversations.filter(msg => msg.role === 'user');
        const symptoms: string[] = [];
        
        const anxietyKeywords = ['불안', '걱정', '무서워', '떨려'];
        const depressionKeywords = ['슬퍼', '우울', '힘들어', '포기'];
        const apathyKeywords = ['귀찮아', '관심없어', '상관없어'];
        
        const hasAnxiety = userMessages.some(msg => 
            anxietyKeywords.some(keyword => msg.content.includes(keyword))
        );
        const hasDepression = userMessages.some(msg => 
            depressionKeywords.some(keyword => msg.content.includes(keyword))
        );
        const hasApathy = userMessages.some(msg => 
            apathyKeywords.some(keyword => msg.content.includes(keyword))
        );
        
        if (hasAnxiety) symptoms.push('불안 증상');
        if (hasDepression) symptoms.push('우울 증상');
        if (hasApathy) symptoms.push('무관심 증상');
        
        return symptoms.length > 0 ? symptoms : ['특이사항 없음'];
    }

    // 종합적인 임상 소견 생성
    generateClinicalInsight(conversations: ConversationMessage[], cdrLevel: string): string {
        const userMessages = conversations.filter(msg => msg.role === 'user');
        const avgWordsPerMessage = userMessages.reduce((sum, msg) => sum + msg.content.split(' ').length, 0) / userMessages.length;
        
        let insight = `환자는 ${conversations.length}회의 대화 교환을 통해 `;
        
        if (avgWordsPerMessage > 10) {
            insight += "비교적 풍부한 언어 표현을 보였습니다. ";
        } else if (avgWordsPerMessage < 3) {
            insight += "제한적인 언어 표현을 보였습니다. ";
        } else {
            insight += "적절한 수준의 언어 표현을 보였습니다. ";
        }
        
        insight += `CDR 평가 기준에 따르면 ${cdrLevel} 수준으로 평가되며, `;
        
        if (cdrLevel.includes('0')) {
            insight += "정상적인 인지기능을 유지하고 있는 것으로 판단됩니다.";
        } else if (cdrLevel.includes('0.5')) {
            insight += "경미한 인지저하가 관찰되어 지속적인 관찰과 조기 개입이 필요합니다.";
        } else if (cdrLevel.includes('1')) {
            insight += "명확한 인지장애가 있어 일상생활 지원이 필요한 상태입니다.";
        } else {
            insight += "상당한 인지장애가 있어 전문적인 돌봄이 필요한 상태입니다.";
        }
        
        return insight;
    }

    // 위험요인 분석
    identifyRiskFactors(conversations: ConversationMessage[]): string[] {
        const userMessages = conversations.filter(msg => msg.role === 'user');
        const riskFactors: string[] = [];
        
        // 언어 기능 저하
        const avgLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length;
        if (avgLength < 5) {
            riskFactors.push("언어 기능 저하");
        }
        
        // 반복적 혼란
        const confusionCount = userMessages.filter(msg => 
            msg.content.includes('모르겠') || msg.content.includes('잊었')
        ).length;
        if (confusionCount > userMessages.length / 3) {
            riskFactors.push("기억력 저하");
        }
        
        // 참여도 저하
        if (userMessages.length < conversations.length / 3) {
            riskFactors.push("대화 참여도 저하");
        }
        
        return riskFactors.length > 0 ? riskFactors : ["특이 위험요인 없음"];
    }
}

export const reportRagSystem = new ReportRAGSystem();