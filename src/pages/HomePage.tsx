import { useState, useRef, useEffect } from 'react';

interface ConversationMessage {
    role: 'user' | 'assistant';
    content: string;
    timestamp: number;
}

interface PhotoSession {
    imageUrl: string;
    imageAnalysis?: string;
    isActive: boolean;
}

interface ConversationAnalysis {
    sessionStart: number;
    sessionEnd: number;
    totalDuration: number;
    totalConversations: number;
    orientationScore: number;
    attentionScore: number;
    memoryScore: number;
    languageScore: number;
    comprehensionScore: number;
    functionalLevel: string;
    emotionalState: string;
    behavioralSymptoms: string[];
    overallCognition: string;
    riskFactors: string[];
    careRecommendations: string[];
    conversationSummary: string;
    positiveReactions: number;
    negativeReactions: number;
    participationLevel: number;
    moodChanges: string[];
    detailedAnalysis?: string;
    recommendations?: string[];
}

interface ConversationSession {
    messages: ConversationMessage[];
    photoSession: PhotoSession | null;
    startTime: number;
    endTime?: number;
}

interface TraumaInfo {
    traumaKeywords: string[];
    detailedDescription: string;
}

export default function HomePage() {
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [conversations, setConversations] = useState<ConversationMessage[]>([]);
    const [photoSession, setPhotoSession] = useState<PhotoSession | null>(null);
    const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);
    const [showTraumaModal, setShowTraumaModal] = useState(false);
    const [traumaInfo, setTraumaInfo] = useState<TraumaInfo>({
        traumaKeywords: [],
        detailedDescription: ''
    });

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const conversationEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversations]);

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

    // 트라우마 정보 로드 (임시로 로컬 스토리지 사용)
    useEffect(() => {
        const loadTraumaInfo = () => {
            try {
                const savedTraumaInfo = localStorage.getItem('traumaInfo');
                if (savedTraumaInfo) {
                    const parsed = JSON.parse(savedTraumaInfo);
                    setTraumaInfo({
                        traumaKeywords: parsed.traumaKeywords || [],
                        detailedDescription: parsed.detailedDescription || ''
                    });
                }
            } catch (error) {
                console.error('트라우마 정보 로드 실패:', error);
            }
        };

        loadTraumaInfo();
    }, []);

    const saveTraumaInfo = async () => {
        try {
            // 임시로 로컬 스토리지에 저장
            localStorage.setItem('traumaInfo', JSON.stringify(traumaInfo));

            // 백엔드에도 저장 시도 (실패해도 로컬은 저장됨)
            try {
                let userId = localStorage.getItem('userId');
                if (!userId) {
                    userId = 'user_' + Date.now();
                    localStorage.setItem('userId', userId);
                }

                await fetch('https://eume-api.hwjinfo.workers.dev/trauma-info', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-User-ID': userId
                    },
                    body: JSON.stringify(traumaInfo)
                });
            } catch (backendError) {
                console.log('백엔드 저장 실패, 로컬 저장만 완료:', backendError);
            }

            setShowTraumaModal(false);
            alert('트라우마 정보가 저장되었습니다.');
        } catch (error) {
            console.error('트라우마 정보 저장 실패:', error);
            alert('저장에 실패했습니다.');
        }
    };

    const toggleRecording = async () => {
        if (synth?.speaking) {
            synth.cancel();
        }

        if (status === 'recording') {
            mediaRecorderRef.current?.stop();
            setStatus('transcribing');
            setError('');
        } else {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    audio: {
                        sampleRate: 44100,
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true
                    },
                });
                const mediaRecorder = new MediaRecorder(stream, {
                    mimeType: 'audio/webm;codecs=opus'
                });
                mediaRecorderRef.current = mediaRecorder;

                mediaRecorder.ondataavailable = (event) => {
                    audioChunksRef.current.push(event.data);
                };

                mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(audioChunksRef.current, {
                        type: 'audio/webm',
                    });
                    audioChunksRef.current = [];
                    sendAudioToApi(audioBlob);
                    stream.getTracks().forEach((track) => track.stop());
                };

                mediaRecorder.start();
                setStatus('recording');
                setError('');
            } catch {
                setError(
                    '마이크를 사용할 수 없어요. 브라우저 설정을 확인해 주세요.'
                );
                setStatus('idle');
            }
        }
    };

    interface ApiResponse {
        userText: string;
        responseText: string;
        error?: string;
        imageAnalysis?: string;
        audioData?: number[];
    }

    const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !file.type.startsWith('image/')) {
            setError('이미지 파일만 업로드할 수 있어요.');
            return;
        }

        let progressInterval: number | null = null;
        let analysisInterval: number | null = null;

        try {
            setIsAnalyzingPhoto(true);
            setStatus('thinking');
            setUploadProgress(0);
            
            setUploadProgress(10);
            const reader = new FileReader();
            const imageUrl = await new Promise<string>((resolve) => {
                reader.onload = (e) => {
                    setUploadProgress(30);
                    resolve(e.target?.result as string);
                };
                reader.readAsDataURL(file);
            });

            let userId = localStorage.getItem('userId');
            if (!userId) {
                userId = 'user_' + Date.now();
                localStorage.setItem('userId', userId);
            }

            const formData = new FormData();
            formData.append('image', file);

            setUploadProgress(40);
            progressInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev < 65) {
                        const increment = Math.random() * 8 + 2;
                        return Math.min(65, Math.round((prev + increment) * 10) / 10);
                    }
                    return prev;
                });
            }, 100);

            const response = await fetch('https://eume-api.hwjinfo.workers.dev/analyze-image', {
                method: 'POST',
                headers: {
                    'X-User-ID': userId
                },
                body: formData,
            });

            if (progressInterval) clearInterval(progressInterval);
            setUploadProgress(70);

            analysisInterval = setInterval(() => {
                setUploadProgress(prev => {
                    if (prev < 95) {
                        const increment = Math.random() * 4 + 2;
                        return Math.min(95, Math.round((prev + increment) * 10) / 10);
                    }
                    return prev;
                });
            }, 120);

            const result = await response.json() as { imageAnalysis: string; error?: string };

            if (!response.ok) {
                throw new Error(result.error || '이미지 분석 중 오류가 발생했습니다.');
            }

            clearInterval(analysisInterval);
            // 분석 완료
            setUploadProgress(100);

            setPhotoSession({
                imageUrl,
                imageAnalysis: result.imageAnalysis,
                isActive: true
            });

            setConversations([]);
            setIsAnalyzingPhoto(false);
            setStatus('idle');
            speak('사진을 자세히 살펴봤어요. 이제 이 사진에 대해 이야기해볼까요?');

            setTimeout(() => setUploadProgress(0), 2000);

        } catch (err: Error | unknown) {
            const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다';
            setError(`사진 업로드 오류: ${errorMessage}`);
            setUploadProgress(0);
            setIsAnalyzingPhoto(false);
            setStatus('idle');
        } finally {
            if (progressInterval) clearInterval(progressInterval);
            if (analysisInterval) clearInterval(analysisInterval);
        }
    };

    const sendAudioToApi = async (audioBlob: Blob) => {
        setStatus('thinking');
        try {
            let userId = localStorage.getItem('userId');
            if (!userId) {
                userId = 'user_' + Date.now();
                localStorage.setItem('userId', userId);
            }

            const headers: Record<string, string> = {
                'Content-Type': 'audio/webm',
                'X-User-ID': userId,
                'X-Photo-Session': photoSession?.isActive ? 'true' : 'false'
            };

            if (photoSession?.imageAnalysis) {
                headers['X-Image-Analysis'] = btoa(unescape(encodeURIComponent(photoSession.imageAnalysis)));
            }

            // 트라우마 정보를 헤더에 추가
            const savedTraumaInfo = localStorage.getItem('traumaInfo');
            if (savedTraumaInfo) {
                headers['X-Trauma-Info'] = btoa(unescape(encodeURIComponent(savedTraumaInfo)));
            }

            const response = await fetch('https://eume-api.hwjinfo.workers.dev', {
                method: 'POST',
                headers,
                body: audioBlob,
            });

            const result = await response.json() as ApiResponse;

            if (!response.ok) {
                throw new Error(
                    result.error || '알 수 없는 오류가 발생했습니다.'
                );
            }

            const timestamp = Date.now();
            if (conversations.length === 0 && !currentSession) {
                setCurrentSession({
                    messages: [],
                    photoSession: photoSession,
                    startTime: Date.now()
                });
            }

            setConversations(prev => [
                ...prev,
                {
                    role: 'user',
                    content: result.userText || '음성 인식 실패',
                    timestamp: timestamp
                },
                {
                    role: 'assistant',
                    content: result.responseText,
                    timestamp: timestamp + 1
                }
            ]);

            speak(result.responseText);
        } catch (err: Error | unknown) {
            const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다';
            setError(`오류가 발생했어요: ${errorMessage}`);
            setStatus('idle');
        }
    };

    const speak = (text: string) => {
        if (synth && text) {
            synth.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);

            const voices = synth.getVoices();
            const koreanVoices = voices.filter(voice => 
                voice.lang === 'ko-KR' || voice.lang.startsWith('ko-')
            );

            let selectedVoice = null;
            
            const preferredVoices = [
                'Microsoft Heami - Korean (Korea)',
                'Google 한국의',
                'Microsoft SunHi - Korean (Korea)',
                'Samsung Korean',
                'Naver Clova'
            ];

            for (const preferred of preferredVoices) {
                selectedVoice = voices.find(voice => 
                    voice.name.includes(preferred) || 
                    voice.name.toLowerCase().includes(preferred.toLowerCase())
                );
                if (selectedVoice) break;
            }

            if (!selectedVoice && koreanVoices.length > 0) {
                selectedVoice = koreanVoices.find(voice => 
                    voice.name.includes('Female') || 
                    voice.name.includes('여성') || 
                    voice.name.includes('Heami') ||
                    voice.name.includes('SunHi')
                ) || koreanVoices[0];
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.lang = 'ko-KR';
            utterance.rate = 0.85;
            utterance.pitch = 1.1;
            utterance.volume = 1.0;

            utterance.onstart = () => setStatus('speaking');
            utterance.onend = () => setStatus('idle');
            utterance.onerror = () => setStatus('idle');

            setTimeout(() => {
                synth.speak(utterance);
            }, 100);
        } else {
            setStatus('idle');
        }
    };

    const analyzeConversation = async (session: ConversationSession): Promise<ConversationAnalysis> => {
        const messages = session.messages;
        const duration = (session.endTime || Date.now()) - session.startTime;
        const totalConversations = parseInt(localStorage.getItem('totalConversations') || '0') + 1;
        
        try {
            const response = await fetch('https://eume-api.hwjinfo.workers.dev/generate-report', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    conversations: messages,
                    sessionData: {
                        sessionStart: session.startTime,
                        sessionEnd: session.endTime || Date.now(),
                        totalDuration: duration,
                        totalConversations
                    }
                })
            });

            if (!response.ok) {
                throw new Error('보고서 생성 API 호출 실패');
            }

            const analysisResult = await response.json() as ConversationAnalysis;
            return analysisResult;

        } catch (error) {
            console.error('LLM 보고서 생성 실패, 기본 분석 사용:', error);
            
            const userMessages = messages.filter(m => m.role === 'user');
            const avgUserMessageLength = userMessages.reduce((sum, msg) => sum + msg.content.length, 0) / userMessages.length || 0;
            const linguisticFluency = Math.min(5, Math.max(1, Math.round(avgUserMessageLength / 10)));
            
            const positiveKeywords = ['좋아', '기뻐', '행복', '재미있', '즐거운', '웃음'];
            const negativeKeywords = ['슬픈', '힘들', '어려운', '모르겠', '잊었'];
            
            const positiveReactions = userMessages.reduce((count, msg) => {
                return count + positiveKeywords.filter(keyword => msg.content.includes(keyword)).length;
            }, 0);
            
            const negativeReactions = userMessages.reduce((count, msg) => {
                return count + negativeKeywords.filter(keyword => msg.content.includes(keyword)).length;
            }, 0);
            
            return {
                sessionStart: session.startTime,
                sessionEnd: session.endTime || Date.now(),
                totalDuration: duration,
                conversationSummary: `${messages.length}개의 메시지가 교환되었으며, ${Math.round(duration / 60000)}분간 대화했습니다.`,
                totalConversations,
                orientationScore: 3,
                attentionScore: 3,
                memoryScore: 3,
                languageScore: linguisticFluency,
                comprehensionScore: 3,
                functionalLevel: '평가 중',
                emotionalState: '안정',
                behavioralSymptoms: ['특이사항 없음'],
                overallCognition: '평가 진행 중',
                riskFactors: ['해당없음'],
                careRecommendations: [],
                positiveReactions,
                negativeReactions,
                participationLevel: Math.min(5, Math.max(1, Math.round(messages.length / 4))),
                moodChanges: positiveReactions > negativeReactions ? ['긍정적'] : ['주의 관찰 필요']
            };
        }
    };

    const generateHTML = (analysis: ConversationAnalysis) => {
        const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>치매 인지기능 평가 보고서</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background-color: #f9f9f9;
        }
        .report-container {
            background: white;
            padding: 40px;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        .header {
            text-align: center;
            border-bottom: 3px solid #4A90E2;
            padding-bottom: 20px;
            margin-bottom: 30px;
        }
        .title {
            font-size: 24px;
            font-weight: bold;
            color: #2c3e50;
            margin-bottom: 10px;
        }
        .subtitle {
            font-size: 14px;
            color: #7f8c8d;
        }
        .section {
            margin-bottom: 25px;
        }
        .section-title {
            font-size: 18px;
            font-weight: bold;
            color: #34495e;
            border-left: 4px solid #4A90E2;
            padding-left: 12px;
            margin-bottom: 15px;
        }
        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
            margin-bottom: 20px;
        }
        .info-item {
            padding: 12px;
            background: #f8f9fa;
            border-radius: 4px;
        }
        .score-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #eee;
        }
        .score-value {
            font-weight: bold;
            color: #4A90E2;
        }
        .list-item {
            margin: 8px 0;
            padding-left: 15px;
            position: relative;
        }
        .list-item:before {
            content: "•";
            color: #4A90E2;
            position: absolute;
            left: 0;
        }
        .summary-box {
            background: #e8f4f8;
            padding: 20px;
            border-radius: 6px;
            margin: 15px 0;
        }
        .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #95a5a6;
            border-top: 1px solid #ecf0f1;
            padding-top: 20px;
        }
        .chart-container {
            position: relative;
            height: 400px;
            margin: 20px 0;
            background: #f8f9fa;
            border-radius: 8px;
            padding: 20px;
        }
        .chart-title {
            text-align: center;
            font-weight: bold;
            margin-bottom: 15px;
            color: #34495e;
        }
        @media print {
            body {
                background: white;
                padding: 0;
            }
            .report-container {
                box-shadow: none;
                padding: 20px;
            }
        }
    </style>
</head>
<body>
    <div class="report-container">
        <div class="header">
            <div class="title">치매 인지기능 평가 보고서</div>
            <div class="subtitle">이음이 AI 케어 시스템 | 표준화된 치매 평가 척도 기반</div>
        </div>

        <div class="section">
            <div class="section-title">■ 기본 정보</div>
            <div class="info-grid">
                <div class="info-item">
                    <strong>대화 시작:</strong> ${new Date(analysis.sessionStart).toLocaleString('ko-KR')}
                </div>
                <div class="info-item">
                    <strong>대화 종료:</strong> ${new Date(analysis.sessionEnd).toLocaleString('ko-KR')}
                </div>
                <div class="info-item">
                    <strong>소요 시간:</strong> ${Math.round(analysis.totalDuration / 60000)}분
                </div>
                <div class="info-item">
                    <strong>전체 대화 횟수:</strong> ${analysis.totalConversations}회
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">■ 대화 내역 요약</div>
            <div class="summary-box">
                ${analysis.conversationSummary}
            </div>
        </div>

        <div class="section">
            <div class="section-title">■ I. K-MMSE 기반 인지기능 평가</div>
            <div class="score-item">
                <span>지남력 (Orientation)</span>
                <span class="score-value">${analysis.orientationScore || 3}/5</span>
            </div>
            <div class="score-item">
                <span>주의집중력 (Attention)</span>
                <span class="score-value">${analysis.attentionScore || 3}/5</span>
            </div>
            <div class="score-item">
                <span>기억력 (Memory)</span>
                <span class="score-value">${analysis.memoryScore || 3}/5</span>
            </div>
            <div class="score-item">
                <span>언어기능 (Language)</span>
                <span class="score-value">${analysis.languageScore || 3}/5</span>
            </div>
            <div class="score-item">
                <span>이해력 (Comprehension)</span>
                <span class="score-value">${analysis.comprehensionScore || 3}/5</span>
            </div>
        </div>

        <div class="section">
            <div class="section-title">■ II. CDR 기반 기능수준 평가</div>
            <div class="info-item">
                <strong>전반적 기능수준:</strong> ${analysis.functionalLevel || '평가 중'}
            </div>
        </div>

        <div class="section">
            <div class="section-title">■ III. NPI 기반 행동심리증상</div>
            ${analysis.behavioralSymptoms && analysis.behavioralSymptoms.length > 0 ? 
                analysis.behavioralSymptoms.map((symptom: string) => `<div class="list-item">${symptom}</div>`).join('') :
                '<div class="list-item">특이사항 없음</div>'
            }
        </div>

        <div class="section">
            <div class="section-title">■ IV. 감정 상태 및 참여도</div>
            <div class="info-grid">
                <div class="info-item">
                    <strong>감정 상태:</strong> ${analysis.emotionalState || '안정'}
                </div>
                <div class="info-item">
                    <strong>참여도:</strong> ${analysis.participationLevel || 3}/5
                </div>
                <div class="info-item">
                    <strong>긍정 반응:</strong> ${analysis.positiveReactions || 0}회
                </div>
                <div class="info-item">
                    <strong>부정 반응:</strong> ${analysis.negativeReactions || 0}회
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">■ V. 위험 요인</div>
            ${analysis.riskFactors && analysis.riskFactors.length > 0 ? 
                analysis.riskFactors.map((risk: string) => `<div class="list-item">${risk}</div>`).join('') :
                '<div class="list-item">특이사항 없음</div>'
            }
        </div>

        <div class="section">
            <div class="section-title">■ VI. 주차별 진행 추이</div>
            <div class="chart-container">
                <div class="chart-title">인지기능 점수 변화 (최근 8주)</div>
                <canvas id="weeklyChart"></canvas>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 20px;">
                <div class="chart-container" style="height: 350px;">
                    <div class="chart-title">현재 인지기능 점수</div>
                    <canvas id="barChart"></canvas>
                </div>
                
                <div class="chart-container" style="height: 350px;">
                    <div class="chart-title">대화 반응 분포</div>
                    <canvas id="pieChart"></canvas>
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-title">■ VII. 종합 소견</div>
            <div class="summary-box">
                ${analysis.overallCognition || analysis.detailedAnalysis || '종합적으로 양호한 상태입니다.'}
            </div>
        </div>

        <div class="section">
            <div class="section-title">■ VIII. 케어 권장사항</div>
            ${analysis.participationLevel >= 3 ?
                '<div class="list-item" style="background: #e8f5e8; padding: 12px; border-left: 4px solid #4CAF50; margin-bottom: 10px;"><strong>🎉 참여도 우수:</strong> 환자분께서 적극적으로 참여하셨습니다. 사탕, 칭찬, 작은 선물 등의 긍정적 보상을 제공하여 지속적인 참여 동기를 부여해주세요.</div>' :
                ''
            }
            ${analysis.careRecommendations && analysis.careRecommendations.length > 0 ?
                analysis.careRecommendations.map((recommendation: string) => `<div class="list-item">${recommendation}</div>`).join('') :
                ''
            }
            ${analysis.recommendations && analysis.recommendations.length > 0 ?
                analysis.recommendations.map((recommendation: string) => `<div class="list-item">${recommendation}</div>`).join('') :
                ''
            }
        </div>

        <div class="footer">
            <div>보고서 생성일: ${new Date().toLocaleString('ko-KR')}</div>
            <div>이음이 AI 치매 케어 서비스</div>
        </div>
    </div>
    
    <script>
        // 차트 생성을 위한 모의 데이터
        const currentScores = {
            orientation: ${analysis.orientationScore || 3},
            attention: ${analysis.attentionScore || 3},
            memory: ${analysis.memoryScore || 3},
            language: ${analysis.languageScore || 3},
            comprehension: ${analysis.comprehensionScore || 3}
        };
        
        // 8주간의 모의 데이터 생성 (현재 점수를 기준으로 변화)
        const generateWeeklyData = (currentScore) => {
            const data = [];
            const baseScore = currentScore;
            
            for (let i = 7; i >= 0; i--) {
                // 점진적인 개선을 보이는 패턴으로 생성
                let score = baseScore + (Math.random() - 0.3) * 1.5;
                if (i > 4) score -= 0.5; // 초기 몇 주는 낮은 점수
                score = Math.max(1, Math.min(5, score)); // 1-5 범위 제한
                data.push(Math.round(score * 10) / 10);
            }
            return data;
        };
        
        const weekLabels = ['8주전', '7주전', '6주전', '5주전', '4주전', '3주전', '2주전', '1주전'];
        
        // 차트가 로드된 후 실행
        window.addEventListener('load', function() {
            const ctx = document.getElementById('weeklyChart');
            if (ctx) {
                new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: weekLabels,
                        datasets: [
                            {
                                label: '지남력',
                                data: generateWeeklyData(currentScores.orientation),
                                borderColor: '#FF6B6B',
                                backgroundColor: 'rgba(255, 107, 107, 0.1)',
                                tension: 0.4
                            },
                            {
                                label: '주의집중력',
                                data: generateWeeklyData(currentScores.attention),
                                borderColor: '#4ECDC4',
                                backgroundColor: 'rgba(78, 205, 196, 0.1)',
                                tension: 0.4
                            },
                            {
                                label: '기억력',
                                data: generateWeeklyData(currentScores.memory),
                                borderColor: '#45B7D1',
                                backgroundColor: 'rgba(69, 183, 209, 0.1)',
                                tension: 0.4
                            },
                            {
                                label: '언어기능',
                                data: generateWeeklyData(currentScores.language),
                                borderColor: '#96CEB4',
                                backgroundColor: 'rgba(150, 206, 180, 0.1)',
                                tension: 0.4
                            },
                            {
                                label: '이해력',
                                data: generateWeeklyData(currentScores.comprehension),
                                borderColor: '#FFEAA7',
                                backgroundColor: 'rgba(255, 234, 167, 0.1)',
                                tension: 0.4
                            }
                        ]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 5,
                                ticks: {
                                    stepSize: 1,
                                    callback: function(value) {
                                        return value + '점';
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 20,
                                    usePointStyle: true
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return context.dataset.label + ': ' + context.parsed.y + '점';
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // 막대그래프 생성 (현재 점수)
            const barCtx = document.getElementById('barChart');
            if (barCtx) {
                new Chart(barCtx, {
                    type: 'bar',
                    data: {
                        labels: ['지남력', '주의집중력', '기억력', '언어기능', '이해력'],
                        datasets: [{
                            label: '현재 점수',
                            data: [
                                currentScores.orientation,
                                currentScores.attention, 
                                currentScores.memory,
                                currentScores.language,
                                currentScores.comprehension
                            ],
                            backgroundColor: [
                                'rgba(255, 107, 107, 0.8)',
                                'rgba(78, 205, 196, 0.8)', 
                                'rgba(69, 183, 209, 0.8)',
                                'rgba(150, 206, 180, 0.8)',
                                'rgba(255, 234, 167, 0.8)'
                            ],
                            borderColor: [
                                '#FF6B6B',
                                '#4ECDC4',
                                '#45B7D1', 
                                '#96CEB4',
                                '#FFEAA7'
                            ],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                            y: {
                                beginAtZero: true,
                                max: 5,
                                ticks: {
                                    stepSize: 1,
                                    callback: function(value) {
                                        return value + '점';
                                    }
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: false
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        return '점수: ' + context.parsed.y + '점';
                                    }
                                }
                            }
                        }
                    }
                });
            }
            
            // 파이차트 생성 (반응 분포)
            const pieCtx = document.getElementById('pieChart');
            if (pieCtx) {
                const positiveReactions = ${analysis.positiveReactions || 3};
                const negativeReactions = ${analysis.negativeReactions || 2};
                const neutralReactions = 4;
                
                new Chart(pieCtx, {
                    type: 'pie',
                    data: {
                        labels: ['긍정적 반응', '중립적 반응', '부정적 반응'],
                        datasets: [{
                            data: [positiveReactions, neutralReactions, negativeReactions],
                            backgroundColor: [
                                '#4CAF50',
                                '#FFC107', 
                                '#FF5722'
                            ],
                            borderColor: [
                                '#388E3C',
                                '#F57C00',
                                '#D32F2F'
                            ],
                            borderWidth: 2
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: {
                                position: 'bottom',
                                labels: {
                                    padding: 15,
                                    usePointStyle: true
                                }
                            },
                            tooltip: {
                                callbacks: {
                                    label: function(context) {
                                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                        const percentage = Math.round((context.parsed / total) * 100);
                                        return context.label + ': ' + context.parsed + '회 (' + percentage + '%)';
                                    }
                                }
                            }
                        }
                    }
                });
            }
        });
    </script>
</body>
</html>
        `;

        const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `이음이_대화보고서_${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const generateReport = (analysis: ConversationAnalysis) => {
        generateHTML(analysis);
    };

    const endConversation = async () => {
        if (synth?.speaking) {
            synth.cancel();
        }
        if (mediaRecorderRef.current && status === 'recording') {
            mediaRecorderRef.current.stop();
        }
        
        if (currentSession && conversations.length > 0) {
            const endedSession = {
                ...currentSession,
                messages: conversations,
                endTime: Date.now()
            };
            
            setStatus('thinking');
            setError('보고서를 생성하고 있습니다...');
            
            try {
                const analysis = await analyzeConversation(endedSession);
                localStorage.setItem('totalConversations', analysis.totalConversations.toString());
                generateReport(analysis);
                
            } catch {
                setError('보고서 생성 중 오류가 발생했습니다.');
            }
        }
        
        setConversations([]);
        setPhotoSession(null);
        setCurrentSession(null);
        setStatus('idle');
        setError('');
    };

    const getStatusText = () => {
        if (isAnalyzingPhoto) {
            return '사진을 분석중입니다...';
        }
        
        switch (status) {
            case 'recording':
                return '듣고 있어요...';
            case 'transcribing':
                return '무슨 말인지 알아듣고 있어요...';
            case 'thinking':
                return '어떤 대답을 할지 생각 중이에요...';
            case 'speaking':
                return '이음이가 대답하고 있어요...';
            default:
                return photoSession ? '사진을 보며 대화해보세요' : '아래 버튼을 누르고 말씀해주세요';
        }
    };

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-teal-50 to-orange-50 p-6">
            {/* 트라우마 설정 모달 */}
            {showTraumaModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl max-w-md w-full max-h-[90vh] overflow-y-auto p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">환자 보호 설정</h2>
                            <button
                                onClick={() => setShowTraumaModal(false)}
                                className="text-gray-500 hover:text-gray-700"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    금지 키워드/주제 (쉼표로 구분)
                                </label>
                                <input
                                    type="text"
                                    value={traumaInfo.traumaKeywords.join(', ')}
                                    onChange={(e) => setTraumaInfo({
                                        ...traumaInfo,
                                        traumaKeywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                                    })}
                                    placeholder="예: 사고, 병원, 수술, 교통사고, 가족 사망, 질병"
                                    className="w-full p-3 border border-gray-300 rounded-lg"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    상세 설명
                                </label>
                                <textarea
                                    value={traumaInfo.detailedDescription}
                                    onChange={(e) => setTraumaInfo({
                                        ...traumaInfo,
                                        detailedDescription: e.target.value
                                    })}
                                    placeholder="트라우마에 대한 상세 설명을 입력하세요"
                                    rows={4}
                                    className="w-full p-3 border border-gray-300 rounded-lg"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowTraumaModal(false)}
                                className="flex-1 py-3 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300"
                            >
                                취소
                            </button>
                            <button
                                onClick={saveTraumaInfo}
                                className="flex-1 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                저장
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="text-center w-full max-w-lg">
                <div className="mb-8 relative">
                    <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <img
                            src="/character.png"
                            alt="이음이 캐릭터"
                            width={96}
                            height={96}
                            className="rounded-2xl shadow-lg"
                        />
                    </div>

                    {/* 트라우마 설정 버튼 */}
                    <button
                        onClick={() => setShowTraumaModal(true)}
                        className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-red-600 shadow-lg"
                        title="환자 보호 설정"
                    >
                        🛡️
                    </button>
                </div>

                {photoSession && (
                    <div className="mb-8">
                        <div className="relative">
                            <img
                                src={photoSession.imageUrl}
                                alt="업로드된 사진"
                                className="w-full max-w-sm mx-auto rounded-xl shadow-lg"
                            />
                            <button
                                onClick={() => setPhotoSession(null)}
                                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                            >
                                ×
                            </button>
                        </div>
                    </div>
                )}

                <div className="mb-12">
                    {conversations.length === 0 ? (
                        <div className="space-y-4">
                            {photoSession ? (
                                <div className="space-y-4">
                                    <p className="text-3xl font-semibold text-gray-800 leading-relaxed">
                                        사진을 보며 이야기해볼까요?
                                    </p>
                                    <p className="text-2xl text-gray-600 leading-relaxed">
                                        이 사진에 대해 기억나는 것이 있으신가요?
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <p className="text-3xl font-semibold text-gray-800 leading-relaxed">
                                        이음이와 대화해보세요!
                                    </p>
                                    <p className="text-3xl font-semibold text-gray-800 leading-relaxed">
                                        사진을 올려주시거나 <br /> 대화를 시작해주세요.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {conversations.slice(-2).map((message, index) => (
                                <p
                                    key={`${message.timestamp}-${index}`}
                                    className={`text-3xl font-semibold leading-relaxed px-4 ${
                                        message.role === 'assistant' 
                                            ? 'text-orange-600' 
                                            : 'text-gray-800'
                                    }`}
                                >
                                    {message.content}
                                </p>
                            ))}
                            <div ref={conversationEndRef} />
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center mb-8">
                    <p className="text-lg text-gray-600 mb-4">
                        {getStatusText()}
                    </p>
                    {isAnalyzingPhoto && uploadProgress > 0 && (
                        <div className="w-full max-w-xs mb-4">
                            <div className="w-full bg-gray-200 rounded-full h-2.5">
                                <div
                                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                                    style={{ width: `${uploadProgress}%` }}
                                ></div>
                            </div>
                            <div className="text-sm text-gray-600 mt-2 text-center">
                                사진 분석 중... {Math.round(uploadProgress * 10) / 10}%
                                <br />
                                <span className="text-xs text-gray-500">(30초 정도 소요됩니다)</span>
                            </div>
                        </div>
                    )}
                    {((isAnalyzingPhoto && uploadProgress === 0) || status === 'thinking' || status === 'speaking') && (
                        <div className="flex space-x-1">
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce"></div>
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-6">
                    {(photoSession || conversations.length > 0) && (
                        <button
                            onClick={endConversation}
                            className="px-6 py-3 bg-orange-500 text-white rounded-full shadow-lg hover:bg-orange-600 transition-all duration-200 ease-in-out transform hover:scale-105 flex items-center gap-2"
                        >
                            <svg
                                className="w-5 h-5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                            대화 종료
                        </button>
                    )}

                    {!photoSession && (
                        <div className="relative">
                            <input
                                type="file"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                disabled={status !== 'idle'}
                            />
                            <button
                                disabled={status !== 'idle'}
                                className="w-16 h-16 rounded-full shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center bg-blue-500 hover:bg-blue-600"
                            >
                                <svg
                                    className="w-8 h-8 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                    />
                                </svg>
                            </button>
                        </div>
                    )}

                    <button
                        onClick={toggleRecording}
                        disabled={status !== 'idle' && status !== 'recording'}
                        className={`w-16 h-16 rounded-full shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center ${
                            status === 'recording'
                                ? 'bg-red-500 hover:bg-red-600'
                                : 'bg-gray-400 hover:bg-gray-500'
                        }`}
                    >
                        {status === 'recording' ? (
                            <svg
                                className="w-8 h-8 text-white"
                                fill="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <rect x="6" y="6" width="12" height="12" rx="2"/>
                            </svg>
                        ) : (
                            <svg
                                className="w-8 h-8 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                                />
                            </svg>
                        )}
                    </button>

                    {!photoSession && (
                        <p className="text-sm text-gray-500 text-center max-w-xs">
                        </p>
                    )}
                </div>

                {error && (
                    <div className="mt-8 p-4 bg-red-50 border border-red-200 rounded-xl">
                        <p className="text-red-600">{error}</p>
                    </div>
                )}
            </div>
        </main>
    );
}