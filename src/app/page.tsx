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

export default function Home() {
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');
    const [conversations, setConversations] = useState<ConversationMessage[]>(
        []
    );
    const [photoSession, setPhotoSession] = useState<PhotoSession | null>(null);
    const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);

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
                    audio: true,
                });
                const mediaRecorder = new MediaRecorder(stream);
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
            } catch (err) {
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
    }

    const handlePhotoUpload = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
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

            const response = await fetch(
                'http://127.0.0.1:8787/analyze-image',
                {
                    method: 'POST',
                    headers: {
                        'X-User-ID': userId,
                    },
                    body: formData,
                }
            );

            const result = (await response.json()) as {
                imageAnalysis: string;
                error?: string;
            };

            if (!response.ok) {
                throw new Error(
                    result.error || '이미지 분석 중 오류가 발생했습니다.'
                );
            }

            setPhotoSession({
                imageUrl,
                imageAnalysis: result.imageAnalysis,
                isActive: true,
            });

            setConversations([]);
            setIsAnalyzingPhoto(false);
            setStatus('idle');
            speak('사진을 보며 함께 이야기해볼까요?');
        } catch (err: Error | unknown) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : '알 수 없는 오류가 발생했습니다';
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
                'X-User-ID': userId,
                'X-Photo-Session': photoSession?.isActive ? 'true' : 'false',
            };

            // Base64 인코딩으로 한글 텍스트 전송
            if (photoSession?.imageAnalysis) {
                headers['X-Image-Analysis'] = btoa(
                    unescape(encodeURIComponent(photoSession.imageAnalysis))
                );
            }

            const formData = new FormData();
            formData.append('audio', audioBlob, 'audio.webm');

            const response = await fetch(
                'http://127.0.0.1:8787',
                {
                    method: 'POST',
                    headers,
                    body: formData,
                }
            );

            const result = (await response.json()) as ApiResponse;

            if (!response.ok) {
                throw new Error(
                    result.error || '알 수 없는 오류가 발생했습니다.'
                );
            }

            const timestamp = Date.now();
            setConversations((prev) => [
                ...prev,
                {
                    role: 'user',
                    content: result.userText || '음성 인식 실패',
                    timestamp: timestamp,
                },
                {
                    role: 'assistant',
                    content: result.responseText,
                    timestamp: timestamp + 1,
                },
            ]);

            speak(result.responseText);
        } catch (err: Error | unknown) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : '알 수 없는 오류가 발생했습니다';
            setError(`오류가 발생했어요: ${errorMessage}`);
            setStatus('idle');
        }
    };

    const speak = (text: string) => {
        if (synth && text) {
            const utterance = new SpeechSynthesisUtterance(text);

            const koreanVoice = synth
                .getVoices()
                .find((voice) => voice.lang === 'ko-KR');
            if (koreanVoice) {
                utterance.voice = koreanVoice;
            }

            utterance.onstart = () => setStatus('speaking');
            utterance.onend = () => setStatus('idle');
            utterance.onerror = () => setStatus('idle');

            synth.speak(utterance);
        } else {
            setStatus('idle');
        }
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
                return photoSession
                    ? '사진을 보며 대화해보세요'
                    : '아래 버튼을 누르고 말씀해주세요';
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
                                        사진을 올려주시거나 <br /> 대화를
                                        시작해주세요.
                                    </p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {conversations.slice(-2).map((message, index) => (
                                <p
                                    key={`${message.timestamp}-${index}`}
                                    className="text-3xl font-semibold text-gray-800 leading-relaxed px-4"
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
                    {(isAnalyzingPhoto ||
                        status === 'thinking' ||
                        status === 'speaking') && (
                        <div className="flex space-x-1">
                            <div className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"></div>
                            <div
                                className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                                style={{ animationDelay: '0.1s' }}
                            ></div>
                            <div
                                className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                                style={{ animationDelay: '0.2s' }}
                            ></div>
                        </div>
                    )}
                </div>

                <div className="flex flex-col items-center gap-6">
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
                                className="w-16 h-16 rounded-full shadow-xl transition-all duration-200 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center bg-orange-400 hover:bg-orange-500"
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
                        <svg
                            className="w-8 h-8 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                        >
                            <path
                                fillRule="evenodd"
                                d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 715 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z"
                                clipRule="evenodd"
                            />
                        </svg>
                    </button>

                    {!photoSession && (
                        <p className="text-sm text-gray-500 text-center max-w-xs"></p>
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
