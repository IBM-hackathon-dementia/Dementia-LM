import { ragSystem } from './utils/rag-system';

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
			prompt: "이 사진을 한국어로 자세히 설명해주세요. 사람들의 표정, 장소, 상황, 시대적 배경 등을 포함해서 회상 치료에 도움이 될 수 있는 모든 세부사항을 설명해주세요.",
			max_tokens: 512
		});

		const userId = request.headers.get('X-User-ID') || 'default-user';
		
		let history: ConversationHistory = await env.CONVERSATION_HISTORY.get(userId, 'json') || {
			messages: [],
			lastInteractionTime: Date.now()
		};

		history.photoSession = {
			imageAnalysis: visionResponse.description || '사진을 분석했습니다.',
			isActive: true,
			startTime: Date.now()
		};

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

export interface Env {
    AI: Ai;
    CONVERSATION_HISTORY: KVNamespace;
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
			});

			if (!sttResponse.text) {
				throw new Error('음성을 인식하지 못했어요.');
			}

            const userId = request.headers.get('X-User-ID') || 'default-user';
            const hasPhotoSession = request.headers.get('X-Photo-Session') === 'true';
            
            let imageAnalysis = '';
            const encodedImageAnalysis = request.headers.get('X-Image-Analysis');
            if (encodedImageAnalysis) {
                try {
                    imageAnalysis = decodeURIComponent(escape(atob(encodedImageAnalysis)));
                } catch (e) {
                    imageAnalysis = '';
                }
            }

            let history: ConversationHistory = await env.CONVERSATION_HISTORY.get(userId, 'json') || {
                messages: [],
                lastInteractionTime: Date.now()
            };

            if (Date.now() - history.lastInteractionTime > 1800000) {
                history = {
                    messages: [],
                    lastInteractionTime: Date.now()
                };
            }

            if (history.photoSession && Date.now() - history.photoSession.startTime > 3600000) {
                history.photoSession.isActive = false;
            }

            const recentMessages = history.messages.slice(-5);
            const relevantGuidance = ragSystem.retrieveRelevantGuidance(sttResponse.text);
            
            let conversationStage: 'initial' | 'conversation' | 'reminiscence' | 'closure' = 'conversation';
            
            if (hasPhotoSession && history.photoSession?.isActive) {
                conversationStage = 'reminiscence';
            } else if (recentMessages.length === 0) {
                conversationStage = 'initial';
            } else if (sttResponse.text.includes('기억') || sttResponse.text.includes('옛날') || sttResponse.text.includes('어린')) {
                conversationStage = 'reminiscence';
            } else if (sttResponse.text.includes('고마워') || sttResponse.text.includes('끝') || sttResponse.text.includes('안녕')) {
                conversationStage = 'closure';
            }

            const stageGuidance = ragSystem.getStageGuidance(conversationStage);

			let systemPrompt = `You are "이음이", a warm and caring AI companion designed specifically for elderly people with dementia. You must respond in Korean only.

당신은 치매 어르신을 위한 따뜻한 AI 동반자 "이음이"입니다. 반드시 한국어로만 대답하세요.

=== 대화 가이드 (Conversation Guidelines) ===
${relevantGuidance}

=== 현재 단계 가이드 (Stage-specific Guidelines) ===
${stageGuidance}`;

			if (hasPhotoSession && imageAnalysis) {
				systemPrompt += `

=== 사진 기반 회상 치료 (Photo-based Reminiscence Therapy) ===
현재 사용자가 업로드한 사진을 보며 회상 치료를 진행하고 있습니다.

사진 분석 결과:
${imageAnalysis}

사진 기반 대화 가이드라인:
- 사진 속 세부사항을 언급하며 자연스럽게 질문하기
- "이 사진을 보니..." "사진 속 ~가 보이는데..." 같은 표현 사용
- 사진과 관련된 개인적 경험이나 추억 유도하기
- 감정적 반응을 격려하고 지지하기
- 사진 속 인물, 장소, 상황에 대한 열린 질문하기
- 긍정적인 기억과 감정에 집중하기`;
			}

			systemPrompt += `

=== 핵심 원칙 (Core Principles) ===
1. 항상 존중하고 따뜻한 말투로 대화하기
2. 2-3문장 이내로 간결하고 명확하게 답변하기  
3. 쉽고 친근한 단어 사용하기 (어려운 표현 금지)
4. 칭찬과 격려를 자주 표현하기
5. 긍정적인 기억과 추억 위주로 대화하기
6. 사용자의 감정에 공감하고 지지하기
7. 절대 틀렸다고 지적하거나 교정하지 않기

Response format: Always respond in warm, respectful Korean with 2-3 short sentences maximum.`;

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

			const llmResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', { messages });

            history.messages.push(
                {
                    role: 'user',
                    content: sttResponse.text,
                    timestamp: Date.now()
                },
                {
                    role: 'assistant',
                    content: llmResponse.response || '',
                    timestamp: Date.now()
                }
            );
            history.lastInteractionTime = Date.now();

            await env.CONVERSATION_HISTORY.put(userId, JSON.stringify(history));

			const finalResponse = {
				userText: sttResponse.text,
				responseText: llmResponse.response || '',
			};

			return new Response(JSON.stringify(finalResponse), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error: unknown) {

			const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
			const errorDetails = {
				error: errorMessage,
				timestamp: new Date().toISOString(),
			};

			return new Response(JSON.stringify(errorDetails), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
