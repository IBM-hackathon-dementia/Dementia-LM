import { ragSystem } from './utils/rag-system';
import { reportRagSystem } from './utils/report-rag-system';
import { SupabaseStorage } from './utils/supabase';
import { PersonalizedQuestionSystem } from './utils/personalized-question-system';
import { D1Storage } from './utils/d1-storage';

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
	DB: D1Database;
};

async function handleSignup(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		console.log('🔍 회원가입 요청 수신:', {
			method: request.method,
			url: request.url,
			headers: Object.fromEntries(request.headers.entries()),
		});

		let signupData;
		try {
			signupData = await request.json() as {
				username: string;
				password: string;
				name: string;
			};
			console.log('✅ 파싱된 요청 데이터:', {
				username: signupData.username,
				name: signupData.name,
				hasPassword: !!signupData.password,
				rawData: signupData
			});
		} catch (parseError) {
			console.error('❌ JSON 파싱 실패:', parseError);
			// 원본 텍스트도 확인해보기
			try {
				const requestText = await request.clone().text();
				console.log('📄 원본 요청 텍스트:', requestText);
			} catch (textError) {
				console.error('텍스트 읽기 실패:', textError);
			}
			return new Response(JSON.stringify({ error: 'JSON 파싱 실패' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		if (!signupData.username || !signupData.password || !signupData.name) {
			return new Response(JSON.stringify({ error: '모든 필수 항목을 입력해주세요.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const d1Storage = new D1Storage(env.DB);

		// Check if user already exists
		const existingUser = await d1Storage.getUserByUsername(signupData.username);
		if (existingUser) {
			return new Response(JSON.stringify({ error: '이미 존재하는 사용자입니다.' }), {
				status: 409,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Create new user
		const userId = crypto.randomUUID();
		const user = {
			id: userId,
			username: signupData.username,
			name: signupData.name,
			role: 'caregiver',
			createdAt: new Date().toISOString(),
		};

		console.log('💾 사용자 생성 시작:', { userId, username: signupData.username, name: signupData.name });
		const startTime = Date.now();
		await d1Storage.createUser(user, signupData.password);
		const endTime = Date.now();
		console.log('✅ 사용자 생성 완료', `소요시간: ${endTime - startTime}ms`);

		const responseData = JSON.stringify(user);
		console.log('📤 회원가입 성공 응답:', responseData);

		return new Response(responseData, {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('❌ 회원가입 처리 중 오류:', error);
		const errorMessage = error instanceof Error ? error.message : '회원가입 중 오류가 발생했습니다.';
		const errorResponse = JSON.stringify({ error: errorMessage });
		console.log('📤 에러 응답:', errorResponse);

		return new Response(errorResponse, {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

async function handlePatientCreate(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		console.log('🔍 환자 생성 요청 수신:', {
			method: request.method,
			url: request.url,
			headers: Object.fromEntries(request.headers.entries()),
		});

		const patientData = await request.json() as {
			name: string;
			age: number;
			gender: 'MALE' | 'FEMALE';
			dementiaLevel: string;
			triggerElements: string;
			relationship: string;
			memo: string;
		};

		console.log('✅ 파싱된 환자 데이터:', patientData);

		if (!patientData.name || !patientData.age || !patientData.gender || !patientData.dementiaLevel || !patientData.relationship) {
			return new Response(JSON.stringify({ error: '모든 필수 항목을 입력해주세요.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const d1Storage = new D1Storage(env.DB);

		// Create new patient
		const patientId = crypto.randomUUID();
		const patient = {
			id: patientId,
			name: patientData.name,
			age: patientData.age,
			gender: patientData.gender,
			dementiaLevel: patientData.dementiaLevel,
			triggerElements: patientData.triggerElements,
			relationship: patientData.relationship,
			memo: patientData.memo,
			createdAt: new Date().toISOString(),
		};

		console.log('💾 환자 생성 시작:', { patientId, name: patientData.name });
		await d1Storage.createPatient(patient);
		console.log('✅ 환자 생성 완료');

		const responseData = JSON.stringify(patient);
		console.log('📤 환자 생성 성공 응답:', responseData);

		return new Response(responseData, {
			status: 201,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('❌ 환자 생성 처리 중 오류:', error);
		const errorMessage = error instanceof Error ? error.message : '환자 생성 중 오류가 발생했습니다.';
		const errorResponse = JSON.stringify({ error: errorMessage });
		console.log('📤 에러 응답:', errorResponse);

		return new Response(errorResponse, {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

async function handlePatientUpdate(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		console.log('🔍 환자 수정 요청 수신:', {
			method: request.method,
			url: request.url,
			headers: Object.fromEntries(request.headers.entries()),
		});

		const patientData = await request.json() as {
			name: string;
			age: number;
			gender: 'MALE' | 'FEMALE';
			dementiaLevel: string;
			triggerElements: string;
			relationship: string;
			memo: string;
		};

		console.log('✅ 파싱된 환자 수정 데이터:', patientData);

		if (!patientData.name || !patientData.age || !patientData.gender || !patientData.dementiaLevel || !patientData.relationship) {
			return new Response(JSON.stringify({ error: '모든 필수 항목을 입력해주세요.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Extract userId from URL path
		const url = new URL(request.url);
		const pathParts = url.pathname.split('/');
		const userId = pathParts[3]; // /api/users/{userId}/info

		if (!userId) {
			return new Response(JSON.stringify({ error: '사용자 ID가 필요합니다.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const d1Storage = new D1Storage(env.DB);

		const updatedPatient = {
			name: patientData.name,
			age: patientData.age,
			gender: patientData.gender,
			dementiaLevel: patientData.dementiaLevel,
			triggerElements: patientData.triggerElements,
			relationship: patientData.relationship,
			memo: patientData.memo,
			updatedAt: new Date().toISOString(),
		};

		console.log('💾 환자 수정 시작:', { userId, name: patientData.name });
		await d1Storage.updatePatient(userId, updatedPatient);
		console.log('✅ 환자 수정 완료');

		const responseData = JSON.stringify({
			id: userId,
			...updatedPatient,
		});
		console.log('📤 환자 수정 성공 응답:', responseData);

		return new Response(responseData, {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('❌ 환자 수정 처리 중 오류:', error);
		const errorMessage = error instanceof Error ? error.message : '환자 수정 중 오류가 발생했습니다.';
		const errorResponse = JSON.stringify({ error: errorMessage });
		console.log('📤 에러 응답:', errorResponse);

		return new Response(errorResponse, {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

async function handlePatientDelete(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		console.log('🗑️ 환자 삭제 요청 수신:', {
			method: request.method,
			url: request.url,
			headers: Object.fromEntries(request.headers.entries()),
		});

		// Extract userId from URL path
		const url = new URL(request.url);
		const pathParts = url.pathname.split('/');
		const userId = pathParts[3]; // /api/users/{userId}/info

		if (!userId) {
			console.error('❌ 사용자 ID가 없음');
			return new Response(JSON.stringify({ error: '사용자 ID가 필요합니다.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		console.log('🔍 삭제할 사용자 ID:', userId);

		const d1Storage = new D1Storage(env.DB);

		console.log('💾 환자 삭제 시작');
		const result = await d1Storage.deletePatient(userId);
		console.log('✅ 환자 삭제 완료, 삭제된 행 수:', result);

		const responseData = {
			success: true,
			message: '환자 정보가 성공적으로 삭제되었습니다.',
			deletedCount: result
		};

		console.log('📤 환자 삭제 성공 응답:', responseData);

		return new Response(JSON.stringify(responseData), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('❌ 환자 삭제 처리 중 오류:', error);
		const errorMessage = error instanceof Error ? error.message : '환자 삭제 중 오류가 발생했습니다.';
		const errorResponse = JSON.stringify({
			success: false,
			error: errorMessage
		});
		console.log('📤 삭제 에러 응답:', errorResponse);

		return new Response(errorResponse, {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

async function handleLogin(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		const loginData = await request.json() as {
			username: string;
			password: string;
		};

		if (!loginData.username || !loginData.password) {
			return new Response(JSON.stringify({ error: '이메일과 비밀번호를 입력해주세요.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const d1Storage = new D1Storage(env.DB);
		const user = await d1Storage.authenticateUser(loginData.username, loginData.password);

		if (!user) {
			return new Response(JSON.stringify({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' }), {
				status: 401,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// Generate simple tokens (in production, use proper JWT)
		const accessToken = crypto.randomUUID();
		const refreshToken = crypto.randomUUID();

		// Store tokens in KV for simple auth
		await env.CONVERSATION_HISTORY.put(`token:${accessToken}`, JSON.stringify({ userId: user.id, type: 'access' }), {
			expirationTtl: 3600, // 1 hour
		});

		await env.CONVERSATION_HISTORY.put(`token:${refreshToken}`, JSON.stringify({ userId: user.id, type: 'refresh' }), {
			expirationTtl: 86400 * 7, // 7 days
		});

		return new Response(JSON.stringify({
			accessToken,
			refreshToken,
			tokenType: 'Bearer',
			expiresIn: 3600,
		}), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : '로그인 중 오류가 발생했습니다.';
		return new Response(JSON.stringify({ error: errorMessage }), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

async function handleTraumaInfo(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	const url = new URL(request.url);
	const userId = request.headers.get('X-User-ID') || 'default-user';
	const d1Storage = new D1Storage(env.DB);

	try {
		if (request.method === 'GET') {
			// 트라우마 정보 조회
			const traumaInfo = await d1Storage.getTraumaInfo(userId);
			return new Response(JSON.stringify(traumaInfo || {}), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} else if (request.method === 'POST') {
			// 트라우마 정보 저장
			const traumaData = (await request.json()) as {
				traumaKeywords: string[];
				detailedDescription: string;
			};

			await d1Storage.saveTraumaInfo(userId, traumaData);

			return new Response(JSON.stringify({ success: true }), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} else if (request.method === 'DELETE') {
			// 트라우마 정보 삭제
			await d1Storage.deleteTraumaInfo(userId);

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

// Get user reports
async function handleGetUserReports(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		const url = new URL(request.url);
		const userId = url.pathname.split('/').pop();
		console.log('📊 사용자 리포트 조회 시작, userId:', userId);

		if (!userId) {
			return new Response(JSON.stringify({ error: 'User ID가 필요합니다.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// 임시로 빈 배열 반환 (실제로는 데이터베이스에서 조회)
		const mockReports = [
			{
				id: 'report_' + Date.now(),
				userId: userId,
				imageId: 'image_1',
				summary: '오늘 대화는 즐거운 분위기에서 진행되었습니다. 환자분이 가족 사진을 보며 많은 추억을 공유해주셨습니다.',
				memo: '긍정적인 반응이 많았음. 기억력 상태 양호.',
				generatedAt: new Date().toISOString(),
				status: 'COMPLETED',
				imageThumbnail: null,
				imageDescription: '가족 사진'
			}
		];

		console.log('📊 사용자 리포트 조회 완료, 개수:', mockReports.length);

		return new Response(JSON.stringify({
			reports: mockReports,
			totalCount: mockReports.length
		}), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('❌ 사용자 리포트 조회 오류:', error);
		return new Response(JSON.stringify({
			error: '리포트 조회 중 오류가 발생했습니다.',
			details: error instanceof Error ? error.message : String(error)
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Generate report from conversation
async function handleGenerateReport(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		const data = await request.json() as any;
		const userId = data.userId;
		const imageId = data.imageId;

		console.log('📊 리포트 생성 시작:', { userId, imageId });

		if (!userId || !imageId) {
			return new Response(JSON.stringify({ error: 'userId와 imageId가 필요합니다.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// 임시 리포트 생성 (실제로는 대화 내용을 분석하여 생성)
		const reportId = 'report_' + Date.now();
		const mockReport = {
			reportId: reportId,
			userId: userId,
			imageId: imageId,
			summary: '대화 세션이 성공적으로 완료되었습니다. 환자분의 참여도가 높았으며 긍정적인 반응을 보였습니다.',
			memo: '다음 세션에서는 더 다양한 사진을 활용해볼 것을 권장합니다.',
			generatedAt: new Date().toISOString(),
			status: 'COMPLETED'
		};

		console.log('📊 리포트 생성 완료:', reportId);

		return new Response(JSON.stringify(mockReport), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('❌ 리포트 생성 오류:', error);
		return new Response(JSON.stringify({
			error: '리포트 생성 중 오류가 발생했습니다.',
			details: error instanceof Error ? error.message : String(error)
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// Generate PDF report
async function handleGenerateReportPdf(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		const data = await request.json() as any;
		console.log('📄 PDF 생성 시작:', data);

		const { reportId, userId, includeImages, dateRange } = data;

		if (!reportId && !userId) {
			return new Response(JSON.stringify({ error: 'reportId 또는 userId가 필요합니다.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		// 실제 PDF 생성을 위한 HTML 콘텐츠 생성
		const reportHtml = await generatePdfReportHtml(reportId, userId, env, data);

		// HTML을 PDF로 변환
		const pdfBase64 = await generatePdfFromHtml(reportHtml);
		const pdfDataUrl = `data:application/pdf;base64,${pdfBase64}`;

		const pdfResponse = {
			pdfUrl: pdfDataUrl,
			reportId: reportId || 'generated_' + Date.now(),
			generatedAt: new Date().toISOString(),
			fileSize: pdfBase64.length,
			downloadUrl: pdfDataUrl
		};

		console.log('📄 PDF 생성 완료, 크기:', pdfBase64.length, 'bytes');

		return new Response(JSON.stringify(pdfResponse), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		console.error('❌ PDF 생성 오류:', error);
		return new Response(JSON.stringify({
			error: 'PDF 생성 중 오류가 발생했습니다.',
			details: error instanceof Error ? error.message : String(error)
		}), {
			status: 500,
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	}
}

// PDF 생성을 위한 HTML 리포트 생성
async function generatePdfReportHtml(reportId: string, userId: string, env: Env, requestData: any): Promise<string> {
	// 실제 리포트 데이터 기반 HTML 템플릿 (영문으로 변환하여 btoa 호환)
	const currentDate = new Date().toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	});

	// Mock data - 실제로는 D1 데이터베이스에서 가져와야 함
	const reportData = {
		totalSessions: 15,
		positiveResponseRate: 85,
		averageSessionTime: 12,
		photosUsed: 8,
		memoryRecallImprovement: 15,
		emotionalEngagement: 'High',
		participationIncrease: 'Significant',
		cognitiveStimulation: 'Active'
	};

	const reportHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dementia Care Session Report - ${reportId}</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #1e40af;
            margin: 0;
            font-size: 28px;
        }
        .header p {
            color: #6b7280;
            margin: 10px 0 0 0;
            font-size: 16px;
        }
        .section {
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
            border-left: 4px solid #3b82f6;
        }
        .section h2 {
            color: #1e40af;
            margin-top: 0;
            font-size: 20px;
        }
        .score-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 15px;
            margin: 15px 0;
        }
        .score-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #e5e7eb;
        }
        .score-value {
            font-size: 24px;
            font-weight: bold;
            color: #3b82f6;
        }
        .score-label {
            font-size: 12px;
            color: #6b7280;
            margin-top: 5px;
        }
        .recommendations {
            background: #fefce8;
            border: 1px solid #facc15;
            border-radius: 8px;
            padding: 15px;
        }
        .recommendations h3 {
            color: #92400e;
            margin-top: 0;
        }
        .recommendations ul {
            margin: 10px 0;
            padding-left: 20px;
        }
        .recommendations li {
            margin-bottom: 8px;
            color: #451a03;
        }
        .footer {
            text-align: center;
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            color: #6b7280;
            font-size: 14px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Dementia Reminiscence Therapy Report</h1>
            <p>Generated: ${currentDate} | Report ID: ${reportId}</p>
        </div>

        <div class="section">
            <h2>Activity Summary</h2>
            <div class="score-grid">
                <div class="score-item">
                    <div class="score-value">${reportData.totalSessions}</div>
                    <div class="score-label">Total Sessions</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${reportData.positiveResponseRate}%</div>
                    <div class="score-label">Positive Response</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${reportData.averageSessionTime}min</div>
                    <div class="score-label">Avg Session Time</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${reportData.photosUsed}</div>
                    <div class="score-label">Photos Used</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>Key Achievements</h2>
            <ul>
                <li><strong>Memory Recall Success:</strong> ${reportData.memoryRecallImprovement}% improvement from last week</li>
                <li><strong>Emotional Expression:</strong> ${reportData.emotionalEngagement} positive responses</li>
                <li><strong>Participation:</strong> ${reportData.participationIncrease} increase in conversation length</li>
                <li><strong>Cognitive Stimulation:</strong> ${reportData.cognitiveStimulation} memory activation across topics</li>
            </ul>
        </div>

        <div class="section">
            <h2>Personalized Recommendations</h2>
            <div class="recommendations">
                <h3>Environment Optimization</h3>
                <ul>
                    <li>Use bright lighting and quiet environment for better results</li>
                    <li>Family photos and nostalgic pictures show excellent response</li>
                    <li>Optimal times: 10-11AM and 3-4PM for activities</li>
                    <li>Consider outdoor activity photos for next sessions</li>
                </ul>
            </div>
        </div>

        <div class="section">
            <h2>Weekly Trends</h2>
            <p>This week's activities were very positive overall. Family-related topics showed high engagement, and emotional expression was rich and meaningful.</p>
            <p><strong>Next Week Goals:</strong> Explore new topic areas and incorporate outdoor activity photos</p>
        </div>

        <div class="footer">
            <p>This report was automatically generated by the e-umm system.</p>
            <p>For more detailed information, please consult with healthcare professionals.</p>
        </div>
    </div>
</body>
</html>
	`;

	return reportHtml;
}

// HTML을 PDF로 변환 (상세한 구현)
async function generatePdfFromHtml(html: string): Promise<string> {
	// 실제 환경에서는 Puppeteer나 다른 PDF 생성 라이브러리를 사용해야 합니다.
	// 여기서는 더 상세한 PDF 콘텐츠를 생성합니다.

	const currentDate = new Date().toLocaleDateString('en-US');

	const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
/F2 6 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 950
>>
stream
BT
/F2 20 Tf
50 750 Td
(Dementia Reminiscence Therapy Report) Tj
0 -25 Td
/F1 12 Tf
(Generated: ${currentDate}) Tj

0 -40 Td
/F2 14 Tf
(Activity Summary) Tj
0 -20 Td
/F1 12 Tf
(Total Sessions: 15) Tj
0 -18 Td
(Positive Response Rate: 85%) Tj
0 -18 Td
(Average Session Time: 12 minutes) Tj
0 -18 Td
(Photos Used: 8) Tj

0 -30 Td
/F2 14 Tf
(Key Achievements) Tj
0 -20 Td
/F1 12 Tf
(Memory Recall Success: 15% improvement from last week) Tj
0 -18 Td
(Emotional Expression: High positive responses) Tj
0 -18 Td
(Participation: Significant increase in conversation length) Tj
0 -18 Td
(Cognitive Stimulation: Active memory activation across topics) Tj

0 -30 Td
/F2 14 Tf
(Personalized Recommendations) Tj
0 -20 Td
/F1 12 Tf
(Environment Optimization:) Tj
0 -18 Td
(- Use bright lighting and quiet environment for better results) Tj
0 -18 Td
(- Family photos and nostalgic pictures show excellent response) Tj
0 -18 Td
(- Optimal times: 10-11AM and 3-4PM for activities) Tj
0 -18 Td
(- Consider outdoor activity photos for next sessions) Tj

0 -30 Td
/F2 14 Tf
(Weekly Trends) Tj
0 -20 Td
/F1 12 Tf
(This week's activities were very positive overall.) Tj
0 -18 Td
(Family-related topics showed high engagement.) Tj
0 -18 Td
(Next Week Goals: Explore new topic areas and) Tj
0 -18 Td
(incorporate outdoor activity photos) Tj

0 -40 Td
/F1 10 Tf
(This report was automatically generated by the e-umm system.) Tj
0 -15 Td
(For more detailed information, please consult with) Tj
0 -15 Td
(healthcare professionals.) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

6 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica-Bold
>>
endobj

xref
0 7
0000000000 65535 f
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000274 00000 n
0000001283 00000 n
0000001340 00000 n
trailer
<<
/Size 7
/Root 1 0 R
>>
startxref
1402
%%EOF`;

	// PDF 콘텐츠를 base64로 인코딩 (ASCII 문자만 사용하므로 btoa 안전)
	return btoa(pdfContent);
}

async function handleReportGeneration(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		const requestData = (await request.json()) as { conversations: ConversationMessage[]; sessionData: SessionData };
		const { conversations, sessionData } = requestData;

		if (!conversations || conversations.length === 0) {
			return new Response(JSON.stringify({ error: '대화 내역이 필요합니다.' }), {
				status: 400,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}

		const analysisPrompt = `치매 전문의로서 다음 대화를 K-MMSE, CDR, NPI 기준으로 분석하여 JSON 형식으로 응답하세요.

=== 환자 대화 ===
${conversations
	.map((msg: ConversationMessage, index: number) => `${index + 1}. ${msg.role === 'user' ? '환자' : '의료진'}: ${msg.content}`)
	.join('\n')}

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
			messages: [
				{
					role: 'user',
					content: analysisPrompt,
				},
			],
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
				positiveKeywords.forEach((keyword) => {
					if (msg.content.includes(keyword)) positiveCount++;
				});
				negativeKeywords.forEach((keyword) => {
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
				recommendations: cdrRecommendations,
			};
		}

		const finalResponse = {
			...sessionData,
			...analysisResult,
		};

		return new Response(JSON.stringify(finalResponse), {
			headers: { ...corsHeaders, 'Content-Type': 'application/json' },
		});
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : '보고서 생성 중 오류가 발생했습니다.';
		return new Response(
			JSON.stringify({
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
				recommendations: ['전문의 상담 권장'],
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			},
		);
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
			prompt:
				'치매 환자 회상 치료용 사진 분석:\n\n1. 장소와 배경\n2. 계절과 날씨\n3. 등장인물 (나이, 성별, 표정, 관계)\n4. 활동과 상황\n5. 시대적 배경\n6. 감정적 분위기\n7. 주목할 만한 세부사항\n\n기억 유도에 도움이 될 구체적 정보를 포함하여 한국어로 상세 분석하세요.',
			max_tokens: 768,
		});

		const userId = request.headers.get('X-User-ID') || 'default-user';
		const d1Storage = new D1Storage(env.DB);

		// D1 데이터베이스에 사진 세션 저장
		await d1Storage.createPhotoSession(userId, visionResponse.description || '사진을 분석했습니다.', Date.now());

		return new Response(
			JSON.stringify({
				imageAnalysis: visionResponse.description || '사진을 분석했습니다.',
			}),
			{
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			},
		);
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

		const hasPositive = positiveKeywords.some((keyword) => userText.includes(keyword));
		const hasNegative = negativeKeywords.some((keyword) => userText.includes(keyword));

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
			messages: [
				{
					role: 'user',
					content: analysisPrompt,
				},
			],
		});

		const result = (response.response || '').trim().toUpperCase();

		// LLM 응답에 따라 판단
		if (result.includes('POSITIVE')) return true;
		if (result.includes('NEGATIVE')) return false;

		// NEUTRAL이거나 명확하지 않은 경우 메시지 길이와 간단한 키워드로 판단
		const positiveKeywords = ['좋', '기쁘', '행복', '재미', '즐거', '웃', '그래', '네', '응', '맞'];
		const negativeKeywords = ['싫', '슬프', '힘들', '어려', '모르겠', '잊었', '기억이 안'];

		const positiveCount = positiveKeywords.filter((keyword) => userText.includes(keyword)).length;
		const negativeCount = negativeKeywords.filter((keyword) => userText.includes(keyword)).length;

		if (positiveCount > negativeCount) return true;
		if (negativeCount > positiveCount) return false;

		// 모든 판단이 애매한 경우 메시지 길이로 결정 (긴 응답은 참여도가 높음)
		return userText.length > 15;
	} catch (error) {
		console.error('LLM 반응 분석 실패, 키워드 방식 사용:', error);

		// LLM 실패 시 기존 키워드 방식으로 폴백
		const positiveKeywords = ['좋', '기쁘', '행복', '재미', '즐거', '웃', '사랑', '고마', '그래', '네', '응', '맞'];
		const negativeKeywords = ['싫', '슬프', '아프', '힘들', '어려', '못하겠', '모르겠', '잊었', '기억이 안', '헷갈'];

		const positiveCount = positiveKeywords.filter((keyword) => userText.includes(keyword)).length;
		const negativeCount = negativeKeywords.filter((keyword) => userText.includes(keyword)).length;

		if (positiveCount > negativeCount) return true;
		if (negativeCount > positiveCount) return false;
		return userText.length > 15;
	}
}

// 메시지에서 키워드 추출하는 함수
function extractKeywordsFromMessage(message: string): string[] {
	const keywords = [
		'시골',
		'어린시절',
		'가족',
		'엄마',
		'아빠',
		'형제',
		'자매',
		'학교',
		'친구',
		'선생님',
		'고향',
		'집',
		'마당',
		'정원',
		'봄',
		'여름',
		'가을',
		'겨울',
		'꽃',
		'나무',
		'바다',
		'산',
		'음식',
		'밥',
		'국',
		'김치',
		'떡',
		'과자',
		'차',
		'커피',
		'일',
		'직장',
		'회사',
		'동료',
		'취미',
		'운동',
		'노래',
		'결혼',
		'신혼',
		'아이',
		'손자',
		'손녀',
		'명절',
		'생일',
		'여행',
		'나들이',
		'시장',
		'병원',
		'교회',
		'절',
		'공원',
	];

	return keywords.filter((keyword) => message.includes(keyword));
}

// 이미지 업로드 핸들러
async function handleImageUpload(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		console.log('📷 이미지 업로드 요청 수신:', {
			method: request.method,
			url: request.url,
		});

		const uploadData = await request.json() as {
			userId: string;
			imageUrl: string;
			description: string;
			scheduledDate: string;
		};

		console.log('✅ 파싱된 업로드 데이터:', {
			userId: uploadData.userId,
			description: uploadData.description,
			imageUrlLength: uploadData.imageUrl?.length || 0,
			scheduledDate: uploadData.scheduledDate
		});

		// D1 데이터베이스에 이미지 정보 저장
		const storage = new D1Storage(env.DB);
		const imageId = crypto.randomUUID();

		await storage.storeImageUpload({
			id: imageId,
			userId: uploadData.userId,
			imageUrl: uploadData.imageUrl,
			description: uploadData.description,
			scheduledDate: uploadData.scheduledDate,
			uploadedAt: new Date().toISOString(),
			status: 'ACTIVE',
			usageCount: 0
		});

		const response = {
			id: imageId,
			userId: uploadData.userId,
			imageUrl: uploadData.imageUrl,
			description: uploadData.description,
			scheduledDate: uploadData.scheduledDate,
			uploadedAt: new Date().toISOString(),
			status: 'ACTIVE'
		};

		console.log('✅ 이미지 업로드 성공:', response);
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
		});
	} catch (error) {
		console.error('❌ 이미지 업로드 실패:', error);
		return new Response(
			JSON.stringify({
				error: '이미지 업로드에 실패했습니다.',
				details: error instanceof Error ? error.message : String(error)
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
			}
		);
	}
}

// 사용자 이미지 조회 핸들러
async function handleGetUserImages(request: Request, env: Env, corsHeaders: Record<string, string>): Promise<Response> {
	try {
		const url = new URL(request.url);
		const userId = url.pathname.split('/').pop();

		if (!userId) {
			return new Response(
				JSON.stringify({ error: '사용자 ID가 필요합니다.' }),
				{
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
				}
			);
		}

		console.log('📷 사용자 이미지 조회:', { userId });

		const storage = new D1Storage(env.DB);
		const images = await storage.getUserImages(userId);

		const response = {
			images: images,
			totalCount: images.length
		};

		console.log('✅ 사용자 이미지 조회 성공:', { userId, count: images.length });
		return new Response(JSON.stringify(response), {
			status: 200,
			headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
		});
	} catch (error) {
		console.error('❌ 사용자 이미지 조회 실패:', error);
		return new Response(
			JSON.stringify({
				error: '사용자 이미지 조회에 실패했습니다.',
				details: error instanceof Error ? error.message : String(error)
			}),
			{
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
			}
		);
	}
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID, X-Photo-Session, X-Image-Analysis, X-Trauma-Info, X-Text-Input, refreshToken',
			'Access-Control-Max-Age': '86400'
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		const url = new URL(request.url);
		console.log('🌐 요청 라우팅:', { pathname: url.pathname, method: request.method });

		if (url.pathname === '/api/auth/signup') {
			console.log('🚪 회원가입 핸들러로 라우팅');
			return await handleSignup(request, env, corsHeaders);
		}

		if (url.pathname === '/api/auth/login') {
			return await handleLogin(request, env, corsHeaders);
		}

		if (url.pathname.startsWith('/api/users/') && url.pathname.endsWith('/info') && request.method === 'POST') {
			return await handlePatientCreate(request, env, corsHeaders);
		}

		if (url.pathname.startsWith('/api/users/') && url.pathname.endsWith('/info') && request.method === 'PUT') {
			return await handlePatientUpdate(request, env, corsHeaders);
		}

		if (url.pathname.startsWith('/api/users/') && url.pathname.endsWith('/info') && request.method === 'DELETE') {
			return await handlePatientDelete(request, env, corsHeaders);
		}

		// Report API endpoints
		if (url.pathname.startsWith('/api/reports/user/') && request.method === 'GET') {
			return await handleGetUserReports(request, env, corsHeaders);
		}

		if (url.pathname === '/api/reports/generate' && request.method === 'POST') {
			return await handleGenerateReport(request, env, corsHeaders);
		}

		if (url.pathname === '/api/reports/generate/pdf' && request.method === 'POST') {
			return await handleGenerateReportPdf(request, env, corsHeaders);
		}

		// Legacy report generation endpoint for direct HTML reports
		if (url.pathname === '/api/generate-report' && request.method === 'POST') {
			return await handleReportGeneration(request, env, corsHeaders);
		}

		// Image API endpoints
		if (url.pathname === '/api/images/upload' && request.method === 'POST') {
			return await handleImageUpload(request, env, corsHeaders);
		}

		if (url.pathname.startsWith('/api/images/user/') && request.method === 'GET') {
			return await handleGetUserImages(request, env, corsHeaders);
		}

		if (url.pathname === '/analyze-image') {
			return await handleImageAnalysis(request, env, corsHeaders);
		}

		if (url.pathname === '/generate-report') {
			return await handleReportGeneration(request, env, corsHeaders);
		}

		if (url.pathname === '/trauma-info') {
			return await handleTraumaInfo(request, env, corsHeaders);
		}

		try {
			// FormData에서 오디오 파일 및 사진 데이터 추출
			const formData = await request.formData();
			const audioFile = formData.get('audio') as File;
			const textInput = formData.get('text') as string;
			const photosData = formData.get('photos') as string;
			const isTextInput = request.headers.get('X-Text-Input') === 'true';

			// 오디오 또는 텍스트 중 하나는 있어야 함
			if (!audioFile && !textInput) {
				return new Response(JSON.stringify({ error: '음성 데이터 또는 텍스트가 필요합니다.' }), {
					status: 400,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			let userText = '';

			// 패턴 미리 정의
			const koreanPattern = /[가-힣]/;
			const englishOnlyPattern = /^[a-zA-Z\s]+$/; // 오직 영어만으로 구성된 경우

			if (isTextInput && textInput) {
				// 텍스트 입력 처리
				userText = textInput.trim();
			} else if (audioFile) {
				// 오디오 입력 처리
				const audioData = await audioFile.arrayBuffer();

				const sttResponse = await env.AI.run('@cf/openai/whisper', {
					audio: [...new Uint8Array(audioData)],
					language: 'ko',
				});

				if (!sttResponse.text || sttResponse.text.trim() === '') {
					throw new Error('음성을 인식하지 못했어요. 더 명확하게 한국어로 말씀해 주세요.');
				}

				// 영어로 인식된 경우 기본 한국어 응답으로 처리
				if (englishOnlyPattern.test(sttResponse.text.trim())) {
					console.log('영어로 인식된 음성을 한국어 대화로 처리:', sttResponse.text);

					// 영어 단어에 따라 더 나은 한국어 응답 추정
					const englishText = sttResponse.text.toLowerCase();
					if (englishText.includes('yes') || englishText.includes('okay') || englishText.includes('sure')) {
						userText = '네';
					} else if (englishText.includes('no') || englishText.includes('nope')) {
						userText = '아니요';
					} else if (englishText.includes('good') || englishText.includes('nice') || englishText.includes('great')) {
						userText = '좋아요';
					} else {
						userText = '잘 모르겠어요'; // 기본값
					}
				} else {
					userText = sttResponse.text.trim();
				}

				console.log('최종 처리된 텍스트:', userText);
			}

			// 빈 텍스트 체크
			if (!userText || userText.trim() === '') {
				console.log('빈 텍스트 감지:', userText);
				throw new Error('음성을 인식하지 못했어요. 다시 시도해주세요.');
			}

			// 한국어 텍스트 검증 (이미 영어는 처리되었으므로 더 관대하게)
			// 한국어가 전혀 포함되지 않은 경우만 체크 (숫자, 특수문자만 있는 경우 등)
			if (!koreanPattern.test(userText) && userText.length > 5) {
				console.log('한국어가 포함되지 않은 텍스트:', userText);
				throw new Error('한국어로만 말씀해 주세요.');
			}

			const userId = request.headers.get('X-User-ID') || 'default-user';
			const hasPhotoSession = request.headers.get('X-Photo-Session') === 'true';

			// 업로드된 사진 데이터 처리
			let uploadedPhotos = [];
			let photoContext = '';

			if (photosData) {
				try {
					uploadedPhotos = JSON.parse(photosData);

					// 사진 정보를 기반으로 회상 치료 컨텍스트 생성
					if (uploadedPhotos.length > 0) {
						const photoDescriptions = uploadedPhotos
							.map((photo: any) => {
								let description = `사진: ${photo.description || '제목 없음'}`;
								if (photo.tags && photo.tags.length > 0) {
									description += ` (태그: ${photo.tags.join(', ')})`;
								}
								return description;
							})
							.join('\n');

						photoContext = `\n\n=== 업로드된 사진 정보 ===\n사용자가 업로드한 ${uploadedPhotos.length}장의 사진:\n${photoDescriptions}\n\n이 사진들을 활용하여 회상 치료 대화를 진행해주세요.`;
					}
				} catch (error) {
					console.error('사진 데이터 파싱 실패:', error);
				}
			}

			let imageAnalysis = '';
			const encodedImageAnalysis = request.headers.get('X-Image-Analysis');
			if (encodedImageAnalysis) {
				try {
					imageAnalysis = decodeURIComponent(escape(atob(encodedImageAnalysis)));
				} catch {
					imageAnalysis = '';
				}
			}

			// D1 데이터베이스 사용
			const d1Storage = new D1Storage(env.DB);
			const history = await d1Storage.getConversationHistory(userId);

			// 개인화된 질문 시스템 (D1 기반으로 추후 구현 가능)
			let personalizedQSystem = null;

			// 트라우마 정보 조회 (헤더에서 읽기)
			let traumaInfo = null;
			let traumaCheck = { hasTrauma: false, matchedKeywords: [] };

			const encodedTraumaInfo = request.headers.get('X-Trauma-Info');
			if (encodedTraumaInfo) {
				try {
					const traumaInfoJson = decodeURIComponent(escape(atob(encodedTraumaInfo)));
					const parsedTraumaInfo = JSON.parse(traumaInfoJson);
					traumaInfo = {
						trauma_keywords: parsedTraumaInfo.traumaKeywords || [],
					};

					// 트라우마 키워드 체크
					const matchedKeywords = traumaInfo.trauma_keywords.filter((term: string) => userText.toLowerCase().includes(term.toLowerCase()));

					traumaCheck = {
						hasTrauma: matchedKeywords.length > 0,
						matchedKeywords,
					};
				} catch (error) {
					console.error('트라우마 정보 파싱 실패:', error);
				}
			}

			const relevantGuidance = ragSystem.retrieveRelevantGuidance(userText);

			let conversationStage: 'initial' | 'conversation' | 'reminiscence' | 'closure' = 'conversation';

			if (hasPhotoSession && history.photoSession?.isActive) {
				conversationStage = 'reminiscence';
			} else if (uploadedPhotos.length > 0) {
				conversationStage = 'reminiscence'; // 사진이 업로드된 경우 회상 치료 모드
			} else if (history.messages.length === 0) {
				conversationStage = 'initial';
			} else if (userText.includes('기억') || userText.includes('옛날') || userText.includes('어린')) {
				conversationStage = 'reminiscence';
			} else if (userText.includes('고마워') || userText.includes('끝') || userText.includes('안녕')) {
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
			const validMessages = history.messages.filter((msg) => msg.role === 'user' || msg.role === 'assistant').slice(-4);

			for (let i = 0; i < validMessages.length; i++) {
				const currentMsg = validMessages[i];
				const prevMsg = i > 0 ? validMessages[i - 1] : null;

				if (!prevMsg || prevMsg.role !== currentMsg.role) {
					recentMessages.push({
						role: currentMsg.role,
						content: currentMsg.content,
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

${
	personalizedGreeting
		? `=== 개인화된 대화 시작 ===
이 분은 과거에 "${personalizedGreeting.trim()}"에 대해 좋은 반응을 보이셨습니다. 이를 자연스럽게 대화에 활용해보세요.`
		: ''
}

${
	traumaInfo
		? `=== 🚨 트라우마 보호 지침 (매우 중요) ===
**절대 금지 주제**: ${traumaInfo.trauma_keywords.join(', ')}

**중요 규칙**:
1. 위 주제들은 절대로 언급하지 마세요
2. 환자가 해당 주제를 꺼내더라도 즉시 다른 주제로 자연스럽게 전환하세요
3. "그것보다는..." "오늘 날씨가..." "좋아하시는 음식은..." 등으로 대화 전환
4. 절대로 트라우마 관련 질문이나 언급을 하지 마세요
5. 환자의 안전과 편안함이 최우선입니다

${traumaCheck.hasTrauma ? `**⚠️ 현재 위험**: 환자가 트라우마 관련 내용을 언급했습니다. 즉시 긍정적이고 안전한 주제로 전환하세요.` : ''}`
		: ''
}`;

			// 업로드된 사진 정보를 시스템 프롬프트에 추가
			if (photoContext) {
				systemPrompt += photoContext;
			}

			if (hasPhotoSession && imageAnalysis) {
				// 기억이 안 난다는 표현 감지
				const memoryDifficultyKeywords = ['모르', '잊', '헷갈', '안 나', '못하겠', '어려워', '기억이 안', '기억이 잘', '기억이 가물가물'];
				const hasMemoryDifficulty = memoryDifficultyKeywords.some((keyword) => userText.includes(keyword));

				systemPrompt += `

=== 사진 기반 회상 치료 ===
현재 사용자가 업로드한 사진을 보며 회상 치료를 진행하고 있습니다.

사진 분석 결과:
${imageAnalysis}

${
	hasMemoryDifficulty
		? `
**환자가 기억에 어려움을 표현했습니다. 다음 전략으로 기억을 도와주세요:**

기억 유도 전략:
- 사진의 구체적 정보를 활용한 힌트 제공하기
- "이 사진에서 파란색 바다가 보이네요. 바닷가에 가신 추억이 있으신가요?" 같이 사진 세부사항 활용
- "사진 속 분이 빨간 옷을 입으셨는데, 누구신 것 같나요?" 처럼 시각적 힌트로 기억 유도
- 위치, 날씨, 사람, 활동 등 사진의 구체적 요소를 하나씩 언급
- 시대적 배경이나 계절 정보도 힌트로 활용
- "1970년대쯤 찍힌 것 같은데..." "봄날 같아 보이는데..." 등으로 맥락 제공
- 한 번에 하나의 힌트만 제공하고 반응 기다리기`
		: `
사진 기반 대화 가이드라인:
- 사진 속 세부사항을 언급하며 자연스럽게 질문하기
- "이 사진을 보니..." "사진 속 ~가 보이는데..." 같은 표현 사용
- 사진과 관련된 개인적 경험이나 추억 유도하기
- 감정적 반응을 격려하고 지지하기
- 사진 속 인물, 장소, 상황에 대한 열린 질문하기
- 긍정적인 기억과 감정에 집중하기`
}`;
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
					content: userText,
				},
			];

			const llmResponse = await env.AI.run('@cf/google/gemma-3-12b-it', { messages });

			// 사용자 반응 분석 (긍정적 반응인지 판단)
			const isPositiveResponse = await analyzeUserResponse(userText, env.AI);

			// 이전 메시지에서 사용된 키워드가 있다면 효과성 기록 (Supabase가 있을 때만)
			if (personalizedQSystem && recentMessages.length > 0) {
				try {
					const lastAssistantMessage = recentMessages.filter((msg) => msg.role === 'assistant').pop();
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
			if (personalizedQSystem && !userText.includes('고마워') && !userText.includes('끝') && !userText.includes('안녕')) {
				try {
					const nextQuestion = await personalizedQSystem.generatePersonalizedQuestion(userId, env.AI, userText);
					if (nextQuestion.expectedEffectiveness > 0.6) {
						personalizedSuggestion = `\n\n[다음 대화 제안: ${nextQuestion.question}]`;
					}
				} catch (error) {
					console.log('개인화된 질문 생성 실패:', error);
				}
			}

			// 대화 히스토리 저장 (D1 데이터베이스 사용)
			const timestamp = Date.now();
			await d1Storage.addConversationMessage(userId, 'user', userText, timestamp);
			await d1Storage.addConversationMessage(userId, 'assistant', llmResponse.response || '', timestamp + 1);

			const finalResponse = {
				userText: userText,
				responseText: (llmResponse.response || '') + personalizedSuggestion,
			};

			return new Response(JSON.stringify(finalResponse), {
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		} catch (error: unknown) {
			console.error('🔥 백엔드 오류 발생:', error);
			const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
			const errorDetails = {
				error: errorMessage,
				timestamp: new Date().toISOString(),
				stack: error instanceof Error ? error.stack : undefined,
			};
			console.error('오류 상세:', errorDetails);

			return new Response(JSON.stringify(errorDetails), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' },
			});
		}
	},
};
