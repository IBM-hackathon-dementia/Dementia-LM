'use client';

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

export default function Home() {
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [conversations, setConversations] = useState<ConversationMessage[]>([]);
    const [photoSession, setPhotoSession] = useState<PhotoSession | null>(null);
    const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
    const [currentSession, setCurrentSession] = useState<ConversationSession | null>(null);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const conversationEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (conversationEndRef.current) {
            conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [conversations]);

    const synth = typeof window !== 'undefined' ? window.speechSynthesis : null;

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

        try {
            setIsAnalyzingPhoto(true);
            setStatus('thinking');
            const imageUrl = URL.createObjectURL(file);

            let userId = localStorage.getItem('userId');
            if (!userId) {
                userId = 'user_' + Date.now();
                localStorage.setItem('userId', userId);
            }

            const formData = new FormData();
            formData.append('image', file);

            const response = await fetch('http://127.0.0.1:8787/analyze-image', {
                method: 'POST',
                headers: {
                    'X-User-ID': userId
                },
                body: formData,
            });

            const result = await response.json() as { imageAnalysis: string; error?: string };

            if (!response.ok) {
                throw new Error(result.error || '이미지 분석 중 오류가 발생했습니다.');
            }

            setPhotoSession({
                imageUrl,
                imageAnalysis: result.imageAnalysis,
                isActive: true
            });

            setConversations([]);
            setIsAnalyzingPhoto(false);
            setStatus('idle');
            speak('사진을 보며 함께 이야기해볼까요?');

        } catch (err: Error | unknown) {
            const errorMessage = err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다';
            setError(`사진 업로드 오류: ${errorMessage}`);
            setIsAnalyzingPhoto(false);
            setStatus('idle');
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

            const response = await fetch('http://127.0.0.1:8787', {
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
            const response = await fetch('http://127.0.0.1:8787/generate-report', {
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

    const generateReport = (analysis: ConversationAnalysis) => {
        const reportHTML = `
            <!DOCTYPE html>
            <html lang="ko">
            <head>
                <meta charset="UTF-8">
                <title>치매 인지기능 평가 보고서 - 이음이 AI 케어</title>
                <style>
                    body { font-family: 'Malgun Gothic', '맑은 고딕', Arial, sans-serif; margin: 20px; line-height: 1.6; }
                    h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
                    h2 { color: #1e40af; margin-top: 30px; margin-bottom: 15px; font-size: 18px; }
                    .info-section { background: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                    .score { font-weight: bold; color: #059669; }
                    .metric { margin: 8px 0; }
                    .recommendation { background: #eff6ff; padding: 10px; border-left: 4px solid #3b82f6; margin: 10px 0; }
                    .footer { margin-top: 40px; text-align: center; color: #6b7280; font-size: 12px; }
                    .header-info { background: #fef3c7; padding: 10px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
                </style>
            </head>
            <body>
                <h1>치매 인지기능 평가 보고서</h1>
                <div class="header-info">
                    <strong>이음이 AI 케어 시스템</strong> | 표준화된 치매 평가 척도(K-MMSE, CDR, NPI) 기반
                </div>
                
                <div class="info-section">
                    <h2>기본 정보</h2>
                    <div class="metric">대화 시작: ${new Date(analysis.sessionStart).toLocaleString('ko-KR')}</div>
                    <div class="metric">대화 종료: ${new Date(analysis.sessionEnd).toLocaleString('ko-KR')}</div>
                    <div class="metric">소요 시간: ${Math.round(analysis.totalDuration / 60000)}분</div>
                    <div class="metric">전체 대화 횟수: ${analysis.totalConversations}회</div>
                </div>

                <div class="info-section">
                    <h2>대화 내역 요약</h2>
                    <p>${analysis.conversationSummary}</p>
                </div>

                <div class="info-section">
                    <h2>I. K-MMSE 기반 인지기능 평가</h2>
                    <div class="metric">지남력 (Orientation): <span class="score">${analysis.orientationScore || 3}/5</span></div>
                    <div class="metric">주의집중력 (Attention): <span class="score">${analysis.attentionScore || 3}/5</span></div>
                    <div class="metric">기억력 (Memory): <span class="score">${analysis.memoryScore || 3}/5</span></div>
                    <div class="metric">언어기능 (Language): <span class="score">${analysis.languageScore || 3}/5</span></div>
                    <div class="metric">이해력 (Comprehension): <span class="score">${analysis.comprehensionScore || 3}/5</span></div>
                </div>

                <div class="info-section">
                    <h2>II. CDR 기반 기능수준 평가</h2>
                    <div class="metric">전반적 기능수준: <span class="score">${analysis.functionalLevel || '평가 중'}</span></div>
                </div>

                <div class="info-section">
                    <h2>III. NPI 기반 행동심리증상</h2>
                    <div class="metric">감정상태: <span class="score">${analysis.emotionalState || '안정'}</span></div>
                    <div class="metric">행동증상: ${(analysis.behavioralSymptoms || ['특이사항 없음']).join(', ')}</div>
                </div>

                <div class="info-section">
                    <h2>IV. 종합 임상 평가</h2>
                    <div class="metric">전반적 인지상태: ${analysis.overallCognition || '평가 진행 중'}</div>
                    <div class="metric">위험요인: ${(analysis.riskFactors || ['해당없음']).join(', ')}</div>
                </div>

                <div class="info-section">
                    <h2>V. 대화 참여도 분석</h2>
                    <div class="metric">긍정적 반응: ${analysis.positiveReactions}회</div>
                    <div class="metric">부정적 반응: ${analysis.negativeReactions}회</div>
                    <div class="metric">참여도: <span class="score">${analysis.participationLevel}/5</span></div>
                    <div class="metric">기분 변화: ${analysis.moodChanges.join(', ')}</div>
                </div>

                ${analysis.detailedAnalysis ? `
                <div class="info-section">
                    <h2>상세 분석</h2>
                    <p>${analysis.detailedAnalysis}</p>
                </div>
                ` : ''}

                ${analysis.careRecommendations && analysis.careRecommendations.length > 0 ? `
                <div class="info-section">
                    <h2>VI. 전문 케어 지침</h2>
                    ${analysis.careRecommendations.map(rec => `<div class="recommendation">🏥 ${rec}</div>`).join('')}
                </div>
                ` : ''}

                <div class="info-section">
                    <h2>VII. 보호자 교육 및 권장사항</h2>
                    ${analysis.recommendations && analysis.recommendations.length > 0 
                        ? analysis.recommendations.map(rec => `<div class="recommendation">📋 ${rec}</div>`).join('')
                        : `${analysis.positiveReactions > analysis.negativeReactions 
                            ? `<div class="recommendation">✓ 환자가 긍정적으로 참여하고 있습니다.</div>
                               <div class="recommendation">✓ 현재와 같은 방식으로 대화를 지속해주세요.</div>`
                            : `<div class="recommendation">⚠ 환자의 참여도 향상이 필요합니다.</div>
                               <div class="recommendation">⚠ 더 친숙한 주제나 사진을 활용해보세요.</div>`
                        }
                        <div class="recommendation">📚 정기적인 인지 자극 활동을 권장합니다.</div>
                        <div class="recommendation">👨‍⚕️ 주기적인 전문의 상담을 받으시기 바랍니다.</div>`
                    }
                </div>

                <div class="footer">
                    <p>보고서 생성 시간: ${new Date().toLocaleString('ko-KR')}</p>
                    <p>이음이 AI 치매 케어 서비스</p>
                </div>
            </body>
            </html>
        `;

        const blob = new Blob([reportHTML], { type: 'text/html;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `이음이_대화보고서_${new Date().toISOString().slice(0, 10)}.html`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
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
            <div className="text-center w-full max-w-lg">
                <div className="mb-8">
                    <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                        <img
                            src="/character.png"
                            alt="이음이 캐릭터"
                            width={96}
                            height={96}
                            className="rounded-2xl shadow-lg"
                        />
                    </div>
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
                    {(isAnalyzingPhoto || status === 'thinking' || status === 'speaking') && (
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