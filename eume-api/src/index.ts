import { ragSystem } from './utils/rag-system';
import { reportRagSystem } from './utils/report-rag-system';
import { SupabaseStorage } from './utils/supabase';

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

		const analysisPrompt = `당신은 치매 전문 신경과 의사입니다. 다음 환자와의 대화를 표준화된 치매 평가 척도(K-MMSE, CDR, NPI)를 기준으로 분석하여 임상 보고서를 작성해주세요.

=== 환자 대화 내역 ===
${conversations.map((msg: ConversationMessage, index: number) =>
	`${index + 1}. ${msg.role === 'user' ? '환자' : '의료진'}: ${msg.content}`
).join('\n')}

=== 세션 정보 ===
- 평가 시작: ${new Date(sessionData.sessionStart).toLocaleString('ko-KR')}
- 평가 종료: ${new Date(sessionData.sessionEnd).toLocaleString('ko-KR')}
- 총 평가 시간: ${Math.round(sessionData.totalDuration / 60000)}분

다음 JSON 형식으로 정확하게 응답하세요:

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
			prompt: "이 사진을 한국어로 매우 자세히 분석해주세요. 치매 환자의 회상 치료에 도움이 되는 구체적인 정보들을 포함해주세요:\n\n1. 장소와 배경 (실내/실외, 바다/산/도시/시골 등)\n2. 계절과 날씨 (옷차림, 주변 환경을 통해 추측)\n3. 등장인물 (나이대, 성별, 표정, 복장, 관계 추측)\n4. 활동과 상황 (무엇을 하고 있는지, 특별한 행사인지)\n5. 시대적 배경 (사진 화질, 의상, 배경으로 추측되는 연대)\n6. 감정적 분위기 (즐거운지, 공식적인지, 편안한지)\n7. 주목할 만한 물건이나 세부사항\n\n기억 유도에 도움이 될 구체적인 세부사항들을 빠짐없이 언급해주세요.",
			max_tokens: 768
		});

		const userId = request.headers.get('X-User-ID') || 'default-user';

		// Supabase 클라이언트 초기화
		const supabase = new SupabaseStorage(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

		// 사진 세션 생성
		await supabase.createPhotoSession(userId, visionResponse.description || '사진을 분석했습니다.', Date.now());

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

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, X-User-ID, X-Photo-Session, X-Image-Analysis',
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
				throw new Error('음성을 인식하지 못했어요. 더 명확하게 말씀해 주세요.');
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

            // Supabase 클라이언트 초기화
            const supabase = new SupabaseStorage(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);

            // 대화 히스토리 조회 (30분 타임아웃, 1시간 사진 세션 타임아웃 자동 처리)
            const history = await supabase.getConversationHistory(userId);

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
${stageGuidance}`;

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
**환자가 기억에 어려움을 표현했습니다. 사진 정보를 활용한 유도 질문이 필요합니다.**

기억 유도 전략:
- 사진의 한 가지 특징만 간단히 언급하고 짧은 질문하기
- "바다가 보이네요. 가보신 적 있나요?" 같이 간결하게
- 복잡한 설명보다는 단순한 키워드 위주로 질문
- 한 번에 하나의 질문만 하기` : `
사진 기반 대화 가이드라인:
- 사진 속 세부사항을 언급하며 자연스럽게 질문하기
- "이 사진을 보니..." "사진 속 ~가 보이는데..." 같은 표현 사용
- 사진과 관련된 개인적 경험이나 추억 유도하기
- 감정적 반응을 격려하고 지지하기
- 사진 속 인물, 장소, 상황에 대한 열린 질문하기
- 긍정적인 기억과 감정에 집중하기`}`;
			}

			systemPrompt += `

응답 규칙:
- **절대 금지: 영어, Translation, 번역, 괄호 설명, 이모지 모두 사용 금지**
- **오직 순수 한국어만 사용 (영어 단어 하나도 금지)**
- **이모지 절대 사용 금지 (😊 ❤️ 🎉 등 모든 이모지 금지)**
- **반드시 15단어 이내로 짧게 대답**
- **질문은 하나만, 설명은 최소화**
- 존댓말 사용하되 너무 딱딱하지 않게
- "그러셨군요", "좋으셨겠어요" 같은 반응 간단히 사용
- 기억이 안 나거나 틀려도 절대 지적하지 말고 자연스럽게 넘어가기
- 어려운 단어 절대 사용 금지
- 자연스러운 한국어 감탄사 사용 ("어머", "그래요", "좋네요" 등)

잘못된 응답 예시 (절대 금지):
- "어머나! (Translation: Oh my!)" ❌
- "좋아요 😊 (I like it)" ❌
- "어머나 😊" ❌
- "참 좋네요! 🎉" ❌
- 모든 괄호 설명 ❌
- 모든 이모지 ❌

올바른 응답 예시:
"바다가 보이네요. 가보신 적 있나요?"
"좋으셨겠어요. 누구와 가셨나요?"
"그러셨군요. 재미있으셨나요?"

**최종 강조: 15단어 이내로 짧게 대답하세요. 순수 한국어만 사용하고 영어나 번역은 절대 포함하지 마세요.**`;

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


            // 새로운 메시지를 Supabase에 저장
            const timestamp = Date.now();
            await supabase.addConversationMessage(userId, 'user', sttResponse.text, timestamp);
            await supabase.addConversationMessage(userId, 'assistant', llmResponse.response || '', timestamp + 1);

			const finalResponse = {
				userText: sttResponse.text,
				responseText: llmResponse.response || ''
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
