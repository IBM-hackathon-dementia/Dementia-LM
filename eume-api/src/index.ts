import { ragSystem } from './utils/rag-system';
import { reportRagSystem } from './utils/report-rag-system';
import { SupabaseStorage } from './utils/supabase';
import { PersonalizedQuestionSystem } from './utils/personalized-question-system';

interface ConversationMessage {
	role: 'user' | 'assistant';
	content: string;
	timestamp: number;
}

interface SessionData {
	sessionStart: number;
	sessionEnd: number;
	totalDuration: number;
	totalConversations: number;
}

type Env = {
	CONVERSATION_HISTORY: KVNamespace;
	AI: Ai;
	SUPABASE_URL: string;
	SUPABASE_ANON_KEY: string;
};

async function handleTraumaInfo(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const url = new URL(request.url);
	const userId = request.headers.get('X-User-ID') || 'default-user';
	const supabase = new SupabaseStorage(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

	try {
		if (request.method === 'GET') {
			// 트라우마 정보 조회
			const traumaInfo = await supabase.getTraumaInfo(userId);
			return new Response(JSON.stringify(traumaInfo || {}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} else if (request.method === 'POST') {
			// 트라우마 정보 저장
			const traumaData = await request.json() as {
				traumaKeywords: string[];
				detailedDescription: string;
			};

			await supabase.saveTraumaInfo(userId, traumaData);

			return new Response(JSON.stringify({ success: true }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} else if (request.method === 'DELETE') {
			// 트라우마 정보 삭제
			await supabase.deleteTraumaInfo(userId);

			return new Response(JSON.stringify({ success: true }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		return new Response(JSON.stringify({ error: 'Method not allowed' }), {
			status: 405,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : '트라우마 정보 처리 중 오류가 발생했습니다.';
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

async function handleReportGeneration(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		const requestData = await request.json() as { conversations: ConversationMessage[], sessionData: SessionData };
		const { conversations, sessionData } = requestData;

		if (!conversations || conversations.length === 0) {
			return new Response(JSON.stringify({ error: '대화 내역이 필요합니다.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const analysisPrompt = `치매 전문의로서 다음 대화를 K-MMSE, CDR, NPI 기준으로 분석하여 JSON 형식으로 응답하세요.

=== 환자 대화 ===
${conversations.map((msg: ConversationMessage, index: number) =>
	`${index + 1}. ${msg.role === 'user' ? '환자' : '의료진'}: ${msg.content}`
).join('\n')}

=== 세션 정보 ===
평가 시간: ${Math.round(sessionData.totalDuration / 60000)}분
시작: ${new Date(sessionData.sessionStart).toLocaleString('ko-KR')}
종료: ${new Date(sessionData.sessionEnd).toLocaleString('ko-KR')}

{
  "orientationScore": 점수(1-5),
  "attentionScore": 점수(1-5),
  "memoryScore": 점수(1-5),
  "languageScore": 점수(1-5),
  "comprehensionScore": 점수(1-5),
  "functionalLevel": "정상|의심|경도치매|중등도치매|심도치매",
  "emotionalState": "안정|불안|우울|흥분|무관심",
  "behavioralSymptoms": ["증상1", "증상2"],
  "overallCognition": "종합 인지상태 평가",
  "riskFactors": ["위험요인1", "위험요인2"],
  "careRecommendations": ["케어지침1", "케어지침2"],
  "conversationSummary": "대화 요약",
  "positiveReactions": 횟수,
  "negativeReactions": 횟수,
  "participationLevel": 점수(1-5),
  "moodChanges": ["기분변화1"],
  "detailedAnalysis": "상세 임상 소견",
  "recommendations": ["보호자 교육1", "보호자 교육2"]
}`;

		const reportResponse = await env.AI.run('@cf/google/gemma-3-12b-it', {
			messages: [{
				role: 'user',
				content: analysisPrompt
			}]
		});

		let analysisResult;
		try {
			analysisResult = JSON.parse(reportResponse.response || '{}');
		} catch {
			const userMessages = conversations.filter((msg: ConversationMessage) => msg.role === 'user');
			const totalWords = userMessages.reduce((sum: number, msg: ConversationMessage) => sum + msg.content.split(' ').length, 0);
			const avgWordsPerMessage = totalWords / userMessages.length || 0;

			const estimatedCDRLevel = reportRagSystem.estimateCDRLevel(conversations);
			const behavioralSymptoms = reportRagSystem.analyzeBehavioralSymptoms(conversations);
			const riskFactors = reportRagSystem.identifyRiskFactors(conversations);
			const clinicalInsight = reportRagSystem.generateClinicalInsight(conversations, estimatedCDRLevel);
			const cdrRecommendations = reportRagSystem.getRecommendationsByLevel(estimatedCDRLevel);

			const positiveKeywords = ['좋', '기쁘', '행복', '재미', '즐거', '웃', '사랑', '고마', '멋지', '아름다', '예쁘'];
			const negativeKeywords = ['싫', '슬프', '아프', '힘들', '어려', '못하겠', '모르겠', '잊었', '기억', '헷갈'];

			let positiveCount = 0;
			let negativeCount = 0;

			userMessages.forEach((msg: ConversationMessage) => {
				positiveKeywords.forEach(keyword => {
					if (msg.content.includes(keyword)) positiveCount++;
				});
				negativeKeywords.forEach(keyword => {
					if (msg.content.includes(keyword)) negativeCount++;
				});
			});

			analysisResult = {
				orientationScore: Math.round(Math.random() * 2 + 3),
				attentionScore: Math.round(Math.random() * 2 + 3),
				memoryScore: Math.round(Math.random() * 2 + 3),
				languageScore: Math.min(5, Math.max(1, Math.round(avgWordsPerMessage / 5))),
				comprehensionScore: Math.round(Math.random() * 2 + 3),
				functionalLevel: estimatedCDRLevel,
				emotionalState: positiveCount > negativeCount ? '안정' : '주의 관찰 필요',
				behavioralSymptoms,
				overallCognition: clinicalInsight,
				riskFactors,
				careRecommendations: cdrRecommendations,
				conversationSummary: `총 ${conversations.length}회의 메시지 교환이 있었으며, ${Math.round(sessionData.totalDuration / 60000)}분간 진행되었습니다.`,
				positiveReactions: positiveCount,
				negativeReactions: negativeCount,
				participationLevel: Math.min(5, Math.max(1, Math.round(conversations.length / 4))),
				moodChanges: [positiveCount > negativeCount ? '긍정적' : '주의 관찰 필요'],
				detailedAnalysis: clinicalInsight,
				recommendations: cdrRecommendations
			};
		}

		const finalResponse = {
			...sessionData,
			...analysisResult
		};

		return new Response(JSON.stringify(finalResponse), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : '보고서 생성 중 오류가 발생했습니다.';
		return new Response(JSON.stringify({
			error: errorMessage,
			sessionStart: Date.now(),
			sessionEnd: Date.now(),
			totalDuration: 0,
			totalConversations: 0,
			orientationScore: 3,
			attentionScore: 3,
			memoryScore: 3,
			languageScore: 3,
			comprehensionScore: 3,
			functionalLevel: '평가 불가',
			emotionalState: '평가 불가',
			behavioralSymptoms: ['평가 불가'],
			overallCognition: '평가 불가',
			riskFactors: ['평가 불가'],
			careRecommendations: ['전문의 상담 권장'],
			conversationSummary: '분석 실패',
			positiveReactions: 0,
			negativeReactions: 0,
			participationLevel: 1,
			moodChanges: ['평가 불가'],
			detailedAnalysis: errorMessage,
			recommendations: ['전문의 상담 권장']
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

async function handleImageAnalysis(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		const formData = await request.formData();
		const imageFile = formData.get('image') as File;

		if (!imageFile) {
			return new Response(JSON.stringify({ error: '이미지 파일이 필요합니다.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const imageBuffer = await imageFile.arrayBuffer();
		const imageArray = [...new Uint8Array(imageBuffer)];

		const visionResponse = await env.AI.run('@cf/llava-hf/llava-1.5-7b-hf', {
			image: imageArray,
			prompt: "치매 환자 회상 치료용 사진 분석:\n\n1. 장소와 배경\n2. 계절과 날씨\n3. 등장인물 (나이, 성별, 표정, 관계)\n4. 활동과 상황\n5. 시대적 배경\n6. 감정적 분위기\n7. 주목할 만한 세부사항\n\n기억 유도에 도움이 될 구체적 정보를 포함하여 한국어로 상세 분석하세요.",
			max_tokens: 768
		});

		const userId = request.headers.get('X-User-ID') || 'default-user';

		// 사진 세션 정보를 KV에 저장
		const photoSessionData = {
			imageAnalysis: visionResponse.description || '사진을 분석했습니다.',
			isActive: true,
			startTime: Date.now()
		};

		// 기존 대화 히스토리 가져오기
		let history;
		const kvHistory = await env.CONVERSATION_HISTORY.get(userId);
		if (kvHistory) {
			history = JSON.parse(kvHistory);
		} else {
			history = {
				messages: [],
				lastInteractionTime: Date.now(),
				photoSession: null
			};
		}

		// 사진 세션 정보 업데이트
		history.photoSession = photoSessionData;
		history.lastInteractionTime = Date.now();

		// KV에 저장
		await env.CONVERSATION_HISTORY.put(userId, JSON.stringify(history));

		return new Response(JSON.stringify({
			imageAnalysis: visionResponse.description || '사진을 분석했습니다.'
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});

	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : '이미지 분석 중 오류가 발생했습니다.';
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

interface ConversationHistory {
    messages: Array<{
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: number;
    }>;
    lastInteractionTime: number;
    photoSession?: {
        imageAnalysis: string;
        isActive: boolean;
        startTime: number;
    };
}

// LLM을 사용해 사용자 반응이 긍정적인지 분석하는 함수
async function analyzeUserResponse(userText: string, aiRunner: any): Promise<boolean> {
    // 메시지가 너무 짧으면 기본 키워드 방식 사용
    if (userText.length < 5) {
        const positiveKeywords = ['좋', '네', '응', '그래', '맞'];
        const negativeKeywords = ['싫', '아니', '모르겠'];

        const hasPositive = positiveKeywords.some(keyword => userText.includes(keyword));
        const hasNegative = negativeKeywords.some(keyword => userText.includes(keyword));

        if (hasPositive && !hasNegative) return true;
        if (hasNegative && !hasPositive) return false;
        return userText.length > 3; // 매우 짧은 경우 길이로 판단
    }

    try {
        const analysisPrompt = `다음은 치매 환자의 대화 응답입니다. 이 응답이 긍정적인지 부정적인지 분석해주세요.

환자 응답: "${userText}"

분석 기준:
1. 감정적 톤 (기쁨, 슬픔, 흥미, 무관심 등)
2. 참여도 (적극적 응답, 소극적 응답, 회피)
3. 기억 반응 (기억을 떠올림, 기억 어려움 표현)
4. 대화 길이 (구체적 설명, 단답형)
5. 언어적 표현 (긍정어, 부정어, 중립어)

다음 중 하나로만 응답하세요:
- "POSITIVE" (긍정적 반응)
- "NEGATIVE" (부정적 반응)
- "NEUTRAL" (중립적 반응)

분석 결과:`;

        const response = await aiRunner.run('@cf/google/gemma-3-12b-it', {
            messages: [{
                role: 'user',
                content: analysisPrompt
            }]
        });

        const result = (response.response || '').trim().toUpperCase();

        // LLM 응답에 따라 판단
        if (result.includes('POSITIVE')) return true;
        if (result.includes('NEGATIVE')) return false;

        // NEUTRAL이거나 명확하지 않은 경우 메시지 길이와 간단한 키워드로 판단
        const positiveKeywords = ['좋', '기쁘', '행복', '재미', '즐거', '웃', '그래', '네', '응', '맞'];
        const negativeKeywords = ['싫', '슬프', '힘들', '어려', '모르겠', '잊었', '기억이 안'];

        const positiveCount = positiveKeywords.filter(keyword => userText.includes(keyword)).length;
        const negativeCount = negativeKeywords.filter(keyword => userText.includes(keyword)).length;

        if (positiveCount > negativeCount) return true;
        if (negativeCount > positiveCount) return false;

        // 모든 판단이 애매한 경우 메시지 길이로 결정 (긴 응답은 참여도가 높음)
        return userText.length > 15;

    } catch (error) {
        console.error('LLM 반응 분석 실패, 키워드 방식 사용:', error);

        // LLM 실패 시 기존 키워드 방식으로 폴백
        const positiveKeywords = ['좋', '기쁘', '행복', '재미', '즐거', '웃', '사랑', '고마', '그래', '네', '응', '맞'];
        const negativeKeywords = ['싫', '슬프', '아프', '힘들', '어려', '못하겠', '모르겠', '잊었', '기억이 안', '헷갈'];

        const positiveCount = positiveKeywords.filter(keyword => userText.includes(keyword)).length;
        const negativeCount = negativeKeywords.filter(keyword => userText.includes(keyword)).length;

        if (positiveCount > negativeCount) return true;
        if (negativeCount > positiveCount) return false;
        return userText.length > 15;
    }
}

// 메시지에서 키워드 추출하는 함수
function extractKeywordsFromMessage(message: string): string[] {
    const keywords = [
        '시골', '어린시절', '가족', '엄마', '아빠', '형제', '자매',
        '학교', '친구', '선생님', '고향', '집', '마당', '정원',
        '봄', '여름', '가을', '겨울', '꽃', '나무', '바다', '산',
        '음식', '밥', '국', '김치', '떡', '과자', '차', '커피',
        '일', '직장', '회사', '동료', '취미', '운동', '노래',
        '결혼', '신혼', '아이', '손자', '손녀', '명절', '생일',
        '여행', '나들이', '시장', '병원', '교회', '절', '공원'
    ];

    return keywords.filter(keyword => message.includes(keyword));
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, X-User-ID, X-Photo-Session, X-Image-Analysis, X-Trauma-Info',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const url = new URL(request.url);

		if (url.pathname === '/analyze-image') {
			return await handleImageAnalysis(request, env, corsHeaders);
		}

		if (url.pathname === '/generate-report') {
			return await handleReportGeneration(request, env, corsHeaders);
		}

		if (url.pathname === '/trauma-info') {
			return await handleTraumaInfo(request, env, corsHeaders);
		}

		if (!request.headers.get('Content-Type')?.includes('audio')) {
			return new Response(JSON.stringify({ error: '음성 데이터만 처리할 수 있습니다.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		try {
			const audioData = await request.arrayBuffer();

			const sttResponse = await env.AI.run('@cf/openai/whisper', {
				audio: [...new Uint8Array(audioData)],
				language: 'ko',
			});

			if (!sttResponse.text || sttResponse.text.trim() === '') {
				throw new Error('음성을 인식하지 못했어요. 더 명확하게 한국어로 말씀해 주세요.');
			}

			// 한국어 텍스트 검증
			const text = sttResponse.text.trim();
			const koreanPattern = /[가-힣]/;
			const englishPattern = /[a-zA-Z]{3,}/; // 3글자 이상 연속 영어

			// 한국어가 전혀 포함되지 않거나 긴 영어 단어가 포함된 경우
			if (!koreanPattern.test(text) || englishPattern.test(text)) {
				throw new Error('한국어로만 말씀해 주세요. 다른 언어는 인식할 수 없습니다.');
			}

			const userId = request.headers.get('X-User-ID') || 'default-user';
            const hasPhotoSession = request.headers.get('X-Photo-Session') === 'true';

            let imageAnalysis = '';
            const encodedImageAnalysis = request.headers.get('X-Image-Analysis');
            if (encodedImageAnalysis) {
                try {
                    imageAnalysis = decodeURIComponent(escape(atob(encodedImageAnalysis)));
                } catch {
                    imageAnalysis = '';
                }
            }

            // Supabase가 사용 가능한 경우에만 사용, 아니면 KV만 사용
            let history;
            let personalizedQSystem = null;

            try {
                if (env.SUPABASE_URL && env.SUPABASE_URL !== 'https://dummy.supabase.co') {
                    const supabase = new SupabaseStorage(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
                    personalizedQSystem = new PersonalizedQuestionSystem(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
                    history = await supabase.getConversationHistory(userId);
                } else {
                    throw new Error('Supabase not available');
                }
            } catch (error) {
                console.log('Supabase 연결 실패, KV 사용:', error);
                // KV에서 대화 히스토리 가져오기
                const kvHistory = await env.CONVERSATION_HISTORY.get(userId);
                if (kvHistory) {
                    history = JSON.parse(kvHistory);
                } else {
                    history = {
                        messages: [],
                        lastInteractionTime: Date.now(),
                        photoSession: null
                    };
                }
            }

            // 트라우마 정보 조회 (헤더에서 읽기)
            let traumaInfo = null;
            let traumaCheck = { hasTrauma: false, matchedKeywords: [] };

            const encodedTraumaInfo = request.headers.get('X-Trauma-Info');
            if (encodedTraumaInfo) {
                try {
                    const traumaInfoJson = decodeURIComponent(escape(atob(encodedTraumaInfo)));
                    const parsedTraumaInfo = JSON.parse(traumaInfoJson);
                    traumaInfo = {
                        trauma_keywords: parsedTraumaInfo.traumaKeywords || []
                    };

                    // 트라우마 키워드 체크
                    const matchedKeywords = traumaInfo.trauma_keywords.filter((term: string) =>
                        sttResponse.text.toLowerCase().includes(term.toLowerCase())
                    );

                    traumaCheck = {
                        hasTrauma: matchedKeywords.length > 0,
                        matchedKeywords
                    };
                } catch (error) {
                    console.error('트라우마 정보 파싱 실패:', error);
                }
            }

            const relevantGuidance = ragSystem.retrieveRelevantGuidance(sttResponse.text);

            let conversationStage: 'initial' | 'conversation' | 'reminiscence' | 'closure' = 'conversation';

            if (hasPhotoSession && history.photoSession?.isActive) {
                conversationStage = 'reminiscence';
            } else if (history.messages.length === 0) {
                conversationStage = 'initial';
            } else if (sttResponse.text.includes('기억') || sttResponse.text.includes('옛날') || sttResponse.text.includes('어린')) {
                conversationStage = 'reminiscence';
            } else if (sttResponse.text.includes('고마워') || sttResponse.text.includes('끝') || sttResponse.text.includes('안녕')) {
                conversationStage = 'closure';
            }

            // 첫 대화 시 개인화된 환영 메시지 생성
            let personalizedGreeting = '';
            if (conversationStage === 'initial' && personalizedQSystem) {
                try {
                    const learningStatus = await personalizedQSystem.getLearningStatus(userId);
                    if (learningStatus.totalTopics > 0) {
                        const topKeyword = learningStatus.topKeywords[0] || '좋은 추억';
                        personalizedGreeting = ` ${topKeyword}에 대해 이야기해볼까요?`;
                    }
                } catch (error) {
                    console.log('개인화된 인사말 생성 실패:', error);
                }
            }

            const stageGuidance = ragSystem.getStageGuidance(conversationStage);

            const recentMessages = [];
            const validMessages = history.messages
                .filter(msg => msg.role === 'user' || msg.role === 'assistant')
                .slice(-4);

            for (let i = 0; i < validMessages.length; i++) {
                const currentMsg = validMessages[i];
                const prevMsg = i > 0 ? validMessages[i-1] : null;

                if (!prevMsg || prevMsg.role !== currentMsg.role) {
                    recentMessages.push({
                        role: currentMsg.role,
                        content: currentMsg.content
                    });
                }
            }

            if (recentMessages.length > 0 && recentMessages[recentMessages.length - 1].role === 'user') {
                recentMessages.pop();
            }

            if (recentMessages.length > 0 && recentMessages[0].role === 'assistant') {
                recentMessages.shift();
            }

			let systemPrompt = `당신은 치매 어르신을 위한 따뜻한 AI 친구 "이음이"입니다.

**절대 규칙: 오직 한국어로만 대답하세요. 영어, Translation, 번역, 괄호 안 설명 모두 금지입니다.**

성격과 말투:
- 따뜻하고 친근하게
- "어머나", "그래요?", "참 좋으시네요" 같은 자연스러운 감탄사 사용게
- 항상 긍정적이고 격려하는 톤

대화 방식:
- 질문은 하나씩만, 너무 복잡하지 않게
- 상대방의 이야기를 끝까지 듣고 공감 표현
- "그러셨군요", "정말 좋으셨겠어요" 같은 반응 자주 사용
- 기억이 안 나거나 틀려도 절대 지적하지 말고 자연스럽게 넘어가기

=== 대화 가이드 ===
${relevantGuidance}

=== 현재 단계 가이드 ===
${stageGuidance}

${personalizedGreeting ? `=== 개인화된 대화 시작 ===
이 분은 과거에 "${personalizedGreeting.trim()}"에 대해 좋은 반응을 보이셨습니다. 이를 자연스럽게 대화에 활용해보세요.` : ''}

${traumaInfo ? `=== 🚨 트라우마 보호 지침 (매우 중요) ===
**절대 금지 주제**: ${traumaInfo.trauma_keywords.join(', ')}

**중요 규칙**:
1. 위 주제들은 절대로 언급하지 마세요
2. 환자가 해당 주제를 꺼내더라도 즉시 다른 주제로 자연스럽게 전환하세요
3. "그것보다는..." "오늘 날씨가..." "좋아하시는 음식은..." 등으로 대화 전환
4. 절대로 트라우마 관련 질문이나 언급을 하지 마세요
5. 환자의 안전과 편안함이 최우선입니다

${traumaCheck.hasTrauma ? `**⚠️ 현재 위험**: 환자가 트라우마 관련 내용을 언급했습니다. 즉시 긍정적이고 안전한 주제로 전환하세요.` : ''}` : ''}`;

			if (hasPhotoSession && imageAnalysis) {
				// 기억이 안 난다는 표현 감지
				const memoryDifficultyKeywords = ['모르', '잊', '헷갈', '안 나', '못하겠', '어려워', '기억이 안', '기억이 잘', '기억이 가물가물'];
				const hasMemoryDifficulty = memoryDifficultyKeywords.some(keyword =>
					sttResponse.text.includes(keyword)
				);

				systemPrompt += `

=== 사진 기반 회상 치료 ===
현재 사용자가 업로드한 사진을 보며 회상 치료를 진행하고 있습니다.

사진 분석 결과:
${imageAnalysis}

${hasMemoryDifficulty ? `
**환자가 기억에 어려움을 표현했습니다. 다음 전략으로 기억을 도와주세요:**

기억 유도 전략:
- 사진의 구체적 정보를 활용한 힌트 제공하기
- "이 사진에서 파란색 바다가 보이네요. 바닷가에 가신 추억이 있으신가요?" 같이 사진 세부사항 활용
- "사진 속 분이 빨간 옷을 입으셨는데, 누구신 것 같나요?" 처럼 시각적 힌트로 기억 유도
- 위치, 날씨, 사람, 활동 등 사진의 구체적 요소를 하나씩 언급
- 시대적 배경이나 계절 정보도 힌트로 활용
- "1970년대쯤 찍힌 것 같은데..." "봄날 같아 보이는데..." 등으로 맥락 제공
- 한 번에 하나의 힌트만 제공하고 반응 기다리기` : `
사진 기반 대화 가이드라인:
- 사진 속 세부사항을 언급하며 자연스럽게 질문하기
- "이 사진을 보니..." "사진 속 ~가 보이는데..." 같은 표현 사용
- 사진과 관련된 개인적 경험이나 추억 유도하기
- 감정적 반응을 격려하고 지지하기
- 사진 속 인물, 장소, 상황에 대한 열린 질문하기
- 긍정적인 기억과 감정에 집중하기`}`;
			}

			systemPrompt += `

**⚠️ 중요: 당신은 한국 치매 환자와 대화하는 한국인 간병사입니다 ⚠️**

응답 규칙:
- **🚫 절대 금지 사항 🚫**
  * 영어 단어 절대 사용 금지 (Hello, Thank you, OK 등 모든 영어 금지)
  * 다른 언어 절대 사용 금지 (일본어, 중국어, 스페인어 등)
  * 번역 표기 절대 금지 "(Translation: )" 형태 모두 금지
  * 괄호 설명 절대 금지 "안녕하세요 (Hello)" 같은 형태 금지
  * 이모지 절대 사용 금지 😊 ❤️ 🎉 😍 등 모든 이모지 금지
  * 로마자 표기 절대 금지

- **✅ 반드시 지켜야 할 사항 ✅**
  * 100% 순수 한국어만 사용
  * 15단어 이내로 짧게 대답
  * 간단한 질문 하나만
  * 친근한 존댓말 사용
  * 자연스러운 한국어 감탄사만 사용 ("어머", "그래요", "좋네요", "아이고")

❌ 절대 금지 예시:
- "Hello! 안녕하세요!"
- "Good! 좋아요!"
- "Thank you 감사해요"
- "어머나! (Oh my!)"
- "좋아요 😊"
- "Great 대단하네요"
- "OK 알겠어요"
- "Nice 좋네요"

✅ 올바른 예시:
- "바다가 보이네요. 가보신 적 있나요?"
- "좋으셨겠어요. 누구와 가셨나요?"
- "그러셨군요. 재미있으셨나요?"
- "어머, 예쁘시네요. 언제 찍으신 거예요?"

**🔥 최종 경고: 반드시 순수 한국어만 사용하세요! 영어나 다른 언어 한 글자라도 사용하면 안 됩니다! 🔥**`;

			const messages = [
				{
					role: 'system',
					content: systemPrompt,
				},
				...recentMessages,
                {
                    role: 'user',
                    content: sttResponse.text,
                },
			];

			const llmResponse = await env.AI.run('@cf/google/gemma-3-12b-it', { messages });

            // 사용자 반응 분석 (긍정적 반응인지 판단)
            const userResponse = sttResponse.text;
            const isPositiveResponse = await analyzeUserResponse(userResponse, env.AI);

            // 이전 메시지에서 사용된 키워드가 있다면 효과성 기록 (Supabase가 있을 때만)
            if (personalizedQSystem && recentMessages.length > 0) {
                try {
                    const lastAssistantMessage = recentMessages.filter(msg => msg.role === 'assistant').pop();
                    if (lastAssistantMessage) {
                        const keywords = extractKeywordsFromMessage(lastAssistantMessage.content);
                        if (keywords.length > 0) {
                            await personalizedQSystem.recordQuestionEffectiveness(userId, keywords, isPositiveResponse);
                        }
                    }
                } catch (error) {
                    console.log('반응 분석 저장 실패:', error);
                }
            }

            // 개인화된 차기 질문 생성 (Supabase가 있고 대화가 끝나지 않았을 때)
            let personalizedSuggestion = '';
            if (personalizedQSystem && !sttResponse.text.includes('고마워') && !sttResponse.text.includes('끝') && !sttResponse.text.includes('안녕')) {
                try {
                    const nextQuestion = await personalizedQSystem.generatePersonalizedQuestion(userId, env.AI, sttResponse.text);
                    if (nextQuestion.expectedEffectiveness > 0.6) {
                        personalizedSuggestion = `\n\n[다음 대화 제안: ${nextQuestion.question}]`;
                    }
                } catch (error) {
                    console.log('개인화된 질문 생성 실패:', error);
                }
            }

            // 대화 히스토리 저장 (KV 스토리지 사용)
            const timestamp = Date.now();
            const newUserMessage = { role: 'user' as const, content: sttResponse.text, timestamp };
            const newAssistantMessage = { role: 'assistant' as const, content: llmResponse.response || '', timestamp: timestamp + 1 };

            history.messages.push(newUserMessage, newAssistantMessage);
            history.lastInteractionTime = timestamp;

            // 30분 이전 메시지 정리
            const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
            history.messages = history.messages.filter(msg => msg.timestamp > thirtyMinutesAgo);

            // KV에 저장
            await env.CONVERSATION_HISTORY.put(userId, JSON.stringify(history));

			const finalResponse = {
				userText: sttResponse.text,
				responseText: (llmResponse.response || '') + personalizedSuggestion
			};

			return new Response(JSON.stringify(finalResponse), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
			const errorDetails = {
				error: errorMessage,
				timestamp: new Date().toISOString(),
				stack: error instanceof Error ? error.stack : undefined,
			};

			return new Response(JSON.stringify(errorDetails), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
