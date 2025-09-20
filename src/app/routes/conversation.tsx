import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useRecoilState } from 'recoil';
import { authState, sessionState } from '../recoil/atoms';
import { ConversationMessage } from '../recoil/types';

const ConversationPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useRecoilValue(authState);
  const [session, setSession] = useRecoilState(sessionState);
  const [isRecording, setIsRecording] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [microphoneError, setMicrophoneError] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 업로드된 사진 가져오기
  const getUploadedPhotos = () => {
    if (!auth.selectedPatient) return [];
    const savedPhotos = localStorage.getItem(`photos_${auth.selectedPatient.id}`);
    return savedPhotos ? JSON.parse(savedPhotos) : [];
  };

  // 자동 스크롤
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [session.conversationHistory]);

  // STT 설정
  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      // Speech Recognition 사용 가능
    } else {
      console.warn('브라우저에서 음성 인식을 지원하지 않습니다.');
    }
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      mediaRecorderRef.current = mediaRecorder;

      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });

        // 스트림 종료
        stream.getTracks().forEach(track => track.stop());

        // 실제 API로 음성 전송
        try {
          setIsThinking(true);
          await sendAudioToAPI(audioBlob);
        } catch (error) {
          console.error('API 호출 오류:', error);

          let errorMessage = '음성 처리 중 오류가 발생했습니다. 다시 시도해주세요.';

          // 특정 에러 메시지에 따라 더 친절한 안내 제공
          if (error instanceof Error) {
            if (error.message.includes('한국어로만')) {
              errorMessage = '한국어로 명확하게 말씀해 주세요.';
            } else if (error.message.includes('음성을 인식하지 못했어요')) {
              errorMessage = '음성을 인식하지 못했어요. 조금 더 크고 명확하게 말씀해 주세요.';
            }
          }

          setMicrophoneError(errorMessage);
          setIsThinking(false);

          // 5초 후 에러 메시지 자동 제거
          setTimeout(() => {
            setMicrophoneError('');
          }, 5000);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setSession(prev => ({ ...prev, isListening: true }));

    } catch (error) {
      console.error('마이크 접근 오류:', error);
      setMicrophoneError('마이크 접근이 차단되었습니다. 브라우저 주소창 왼쪽의 마이크 아이콘을 클릭하여 권한을 허용해주세요.');
      setShowTextInput(true);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setSession(prev => ({ ...prev, isListening: false }));
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (textInput.trim()) {
      try {
        setIsThinking(true);
        // 텍스트를 음성으로 변환하는 대신 직접 API 호출
        await sendTextToAPI(textInput.trim());
        setTextInput('');
        setShowTextInput(false);
      } catch (error) {
        console.error('텍스트 처리 오류:', error);
        setMicrophoneError('텍스트 처리 중 오류가 발생했습니다.');
        setIsThinking(false);
      }
    }
  };

  const sendTextToAPI = async (text: string) => {
    try {
      // 사용자 ID 생성 또는 가져오기
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = 'user_' + Date.now();
        localStorage.setItem('userId', userId);
      }

      // 업로드된 사진 정보 포함하여 API 호출
      const uploadedPhotos = getUploadedPhotos();
      const formData = new FormData();
      formData.append('text', text);

      if (uploadedPhotos.length > 0) {
        formData.append('photos', JSON.stringify(uploadedPhotos));
      }

      const headers: Record<string, string> = {
        'X-User-ID': userId,
        'X-Photo-Session': uploadedPhotos.length > 0 ? 'true' : 'false',
        'X-Text-Input': 'true',
      };

      const response = await fetch('https://eume-api.hwjinfo.workers.dev', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        // 에러 응답에서 메시지 추출 시도
        try {
          const errorResult = await response.json();
          throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
        } catch (jsonError) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // 응답 처리
      handleAPIResponse(text, result.responseText);

    } catch (error) {
      console.error('텍스트 API 호출 실패:', error);

      // 오류 발생 시 기본 응답
      const userMessage: ConversationMessage = {
        id: Date.now().toString(),
        role: 'user',
        content: text,
        timestamp: new Date(),
      };

      const assistantMessage: ConversationMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: getUploadedPhotos().length > 0
          ? `${text}에 대해 말씀해주셔서 감사해요. 업로드하신 ${getUploadedPhotos().length}장의 사진들을 보니 소중한 추억들이 많으시네요. 더 자세히 말씀해주실 수 있나요?`
          : '텍스트로 말씀해주셔서 감사해요. 더 자세히 말씀해주실 수 있나요?',
        timestamp: new Date(),
      };

      setSession(prev => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, userMessage, assistantMessage],
      }));

      speakText(assistantMessage.content);
    }
  };

  // API 호출 함수
  const sendAudioToAPI = async (audioBlob: Blob) => {
    try {
      // 사용자 ID 생성 또는 가져오기
      let userId = localStorage.getItem('userId');
      if (!userId) {
        userId = 'user_' + Date.now();
        localStorage.setItem('userId', userId);
      }

      const formData = new FormData();
      formData.append('audio', audioBlob, 'audio.webm');

      // 업로드된 사진 정보 포함
      const uploadedPhotos = getUploadedPhotos();
      if (uploadedPhotos.length > 0) {
        formData.append('photos', JSON.stringify(uploadedPhotos));
      }

      const headers: Record<string, string> = {
        'X-User-ID': userId,
        'X-Photo-Session': uploadedPhotos.length > 0 ? 'true' : 'false',
      };

      const response = await fetch('https://eume-api.hwjinfo.workers.dev', {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        // 에러 응답에서 메시지 추출 시도
        try {
          const errorResult = await response.json();
          throw new Error(errorResult.error || `HTTP error! status: ${response.status}`);
        } catch (jsonError) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      // 사용자 메시지와 AI 응답을 대화 기록에 추가
      handleAPIResponse(result.userText, result.responseText);

    } catch (error) {
      console.error('API 호출 실패:', error);
      throw error;
    }
  };

  const handleAPIResponse = (userText: string, responseText: string) => {
    const timestamp = Date.now();

    // 사용자 메시지 추가
    const userMessage: ConversationMessage = {
      id: timestamp.toString(),
      role: 'user',
      content: userText || '음성 인식 실패',
      timestamp: new Date(),
    };

    // AI 응답 메시지 추가
    const assistantMessage: ConversationMessage = {
      id: (timestamp + 1).toString(),
      role: 'assistant',
      content: responseText,
      timestamp: new Date(),
    };

    setSession(prev => ({
      ...prev,
      conversationHistory: [...prev.conversationHistory, userMessage, assistantMessage],
    }));

    // thinking 상태 해제
    setIsThinking(false);

    // TTS로 음성 출력
    speakText(responseText);
  };

  const speakText = (text: string) => {
    if ('speechSynthesis' in window) {
      // 기존 음성 중지
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      speechSynthesisRef.current = utterance;

      // 음성 설정
      utterance.rate = auth.selectedPatient?.preferences?.voiceSettings.speed || 0.8;
      utterance.pitch = auth.selectedPatient?.preferences?.voiceSettings.pitch || 1;
      utterance.volume = auth.selectedPatient?.preferences?.voiceSettings.volume || 0.8;
      utterance.lang = 'ko-KR';

      utterance.onstart = () => {
        setSession(prev => ({ ...prev, isSpeaking: true }));
      };

      utterance.onend = () => {
        setSession(prev => ({ ...prev, isSpeaking: false }));
      };

      utterance.onerror = (error) => {
        console.error('TTS 오류:', error);
        setSession(prev => ({ ...prev, isSpeaking: false }));

        // interrupted 에러는 정상적인 중단이므로 사용자에게 알리지 않음
        if (error.error !== 'interrupted') {
          console.warn('음성 출력 중 오류가 발생했지만 계속 진행합니다:', error.error);
        }
      };

      window.speechSynthesis.speak(utterance);
    }
  };



  const startSession = () => {
    if (!session.isActive) {
      setSession(prev => ({
        ...prev,
        isActive: true,
        startedAt: new Date(),
        currentConversationId: Date.now().toString(),
      }));

      // 첫 인사말
      const welcomeMessage: ConversationMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `안녕하세요, ${auth.selectedPatient?.name}님! 오늘 함께 즐거운 이야기를 나누어보아요.`,
        timestamp: new Date(),
      };

      setSession(prev => ({
        ...prev,
        conversationHistory: [welcomeMessage],
      }));

      speakText(welcomeMessage.content);
    }
  };

  const endSession = () => {
    window.speechSynthesis.cancel();
    setSession(prev => ({
      ...prev,
      isActive: false,
      isSpeaking: false,
      isListening: false,
    }));
    navigate('/');
  };

  if (!auth.selectedPatient) {
    navigate('/dashboard');
    return null;
  }

  return (
    <main style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom, #f0fdfa, #fef7ed)',
      padding: 'var(--space-6)',
    }}>
      <div style={{
        textAlign: 'center',
        width: '100%',
        maxWidth: '32rem',
      }}>
        <div style={{ marginBottom: 'var(--space-8)' }}>
          <div style={{
            width: '6rem',
            height: '6rem',
            margin: '0 auto var(--space-6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <img
              src="/character.png"
              alt="이음이 캐릭터"
              style={{
                width: '96px',
                height: '96px',
                borderRadius: '1rem',
                boxShadow: 'var(--shadow-lg)'
              }}
            />
          </div>
        </div>

        <div style={{ marginBottom: 'clamp(var(--space-6), 4vw, var(--space-10))' }}>
          {/* 사진 업로드 상태 표시 */}
          {(() => {
            const uploadedPhotos = getUploadedPhotos();
            return uploadedPhotos.length > 0 && (
              <div style={{
                background: 'var(--color-primary-light)',
                border: '1px solid var(--color-primary)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-3)',
                marginBottom: 'var(--space-4)',
                textAlign: 'center'
              }}>
                <p style={{
                  fontSize: 'var(--text-sm)',
                  color: 'var(--color-primary-dark)',
                  margin: 0
                }}>
                  📷 업로드된 사진 {uploadedPhotos.length}장을 활용하여 대화합니다
                </p>
              </div>
            );
          })()}

          {session.conversationHistory.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <p style={{
                  fontSize: 'clamp(var(--text-xl), 4vw, var(--text-2xl))',
                  fontWeight: '600',
                  color: 'var(--color-text-primary)',
                  lineHeight: '1.4'
                }}>
                  {auth.selectedPatient?.name}님, 이음이와 대화해보세요!
                </p>
                <p style={{
                  fontSize: 'clamp(var(--text-lg), 3vw, var(--text-xl))',
                  color: 'var(--color-text-secondary)',
                  lineHeight: '1.4'
                }}>
                  {getUploadedPhotos().length > 0
                    ? '업로드하신 사진들에 대해 이야기해보세요!'
                    : '아래 버튼을 누르고 말씀해주세요.'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
              {session.conversationHistory.slice(-2).map((message, index) => (
                <div
                  key={`${message.timestamp}-${index}`}
                  style={{
                    fontSize: 'clamp(var(--text-xl), 4vw, var(--text-2xl))',
                    fontWeight: '600',
                    color: message.role === 'assistant' ? 'var(--color-assistant)' : 'var(--color-text-primary)',
                    lineHeight: '1.6',
                    padding: '0 var(--space-4)',
                    textAlign: 'center',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'keep-all',
                    overflowWrap: 'break-word'
                  }}
                >
                  {message.content}
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: 'var(--space-8)'
        }}>
          <p style={{
            fontSize: 'var(--text-lg)',
            color: 'var(--color-text-muted)',
            marginBottom: 'var(--space-4)'
          }}>
            {session.isSpeaking ? 'AI가 말하고 있어요...' :
             isThinking ? '이음이가 생각중입니다...' :
             session.isListening ? '듣고 있어요...' :
             isRecording ? '녹음 중...' :
             session.isActive ? '버튼을 눌러 말씀해주세요' : '대화를 시작해보세요'}
          </p>
          {(session.isSpeaking || isThinking) && (
            <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: isThinking ? 'var(--color-assistant)' : 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'bounce 1s infinite'
              }}></div>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: isThinking ? 'var(--color-assistant)' : 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'bounce 1s infinite',
                animationDelay: '0.1s'
              }}></div>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: isThinking ? 'var(--color-assistant)' : 'var(--color-primary)',
                borderRadius: '50%',
                animation: 'bounce 1s infinite',
                animationDelay: '0.2s'
              }}></div>
            </div>
          )}
        </div>

        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--space-6)'
        }}>
          {/* 대화 시작 버튼 (대화 시작 전에만 표시) */}
          {!session.isActive && (
            <button
              onClick={startSession}
              style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                boxShadow: 'var(--shadow-xl)',
                transition: 'all 0.2s ease-in-out',
                transform: 'scale(1)',
                backgroundColor: 'var(--color-primary)',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg
                style={{ width: '2rem', height: '2rem', color: 'white' }}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}

          {/* 녹음 버튼 (대화 중에만 표시) */}
          {session.isActive && (
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={session.isSpeaking || isThinking}
              style={{
                width: '4rem',
                height: '4rem',
                borderRadius: '50%',
                boxShadow: 'var(--shadow-xl)',
                transition: 'all 0.2s ease-in-out',
                transform: 'scale(1)',
                backgroundColor: isRecording ? 'var(--color-danger)' :
                                (session.isSpeaking || isThinking) ? '#9CA3AF' : '#9CA3AF',
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: (session.isSpeaking || isThinking) ? 'not-allowed' : 'pointer',
                opacity: (session.isSpeaking || isThinking) ? 0.5 : 1
              }}
              onMouseEnter={(e) => {
                if (!session.isSpeaking && !isThinking) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
            >
              <svg
                style={{ width: '2rem', height: '2rem', color: 'white' }}
                fill="currentColor"
                viewBox="0 0 24 24"
              >
                <path d="M12 2a3 3 0 0 1 3 3v6a3 3 0 0 1-6 0V5a3 3 0 0 1 3-3z"/>
                <path d="M19 10v1a7 7 0 0 1-14 0v-1a1 1 0 0 1 2 0v1a5 5 0 0 0 10 0v-1a1 1 0 0 1 2 0z"/>
                <path d="M12 18.5a1 1 0 0 1 1 1V22a1 1 0 0 1-2 0v-2.5a1 1 0 0 1 1-1z"/>
                <path d="M8 22h8a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2z"/>
              </svg>
            </button>
          )}
        </div>

        {/* 오류 메시지 */}
        {microphoneError && (
          <div style={{
            marginTop: 'var(--space-8)',
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-danger-light)',
            border: `1px solid var(--color-danger)`,
            borderRadius: 'var(--border-radius-lg)'
          }}>
            <p style={{ color: 'var(--color-danger)', margin: 0 }}>
              ⚠️ {microphoneError}
            </p>
          </div>
        )}

        {/* 텍스트 입력 버튼 (대화 중에만 표시) */}
        {session.isActive && !isRecording && !isThinking && !session.isSpeaking && (
          <div style={{ marginTop: 'var(--space-4)' }}>
            <button
              onClick={() => setShowTextInput(true)}
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                textDecoration: 'underline',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              텍스트로 입력하기
            </button>
          </div>
        )}

        {/* 텍스트 입력 폼 */}
        {showTextInput && (
          <div style={{
            marginTop: 'var(--space-6)',
            width: '100%',
            maxWidth: '28rem'
          }}>
            <form onSubmit={handleTextSubmit} style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-3)'
            }}>
              <textarea
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                placeholder="여기에 메시지를 입력해주세요..."
                rows={3}
                style={{
                  width: '100%',
                  padding: 'var(--space-3)',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--border-radius-lg)',
                  fontSize: 'var(--text-lg)',
                  fontFamily: 'var(--font-family-primary)'
                }}
              />
              <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                <button
                  type="submit"
                  disabled={!textInput.trim()}
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--color-primary)',
                    color: 'white',
                    padding: 'var(--space-2) var(--space-4)',
                    borderRadius: 'var(--border-radius-lg)',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: !textInput.trim() ? 0.5 : 1
                  }}
                >
                  전송
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTextInput(false);
                    setTextInput('');
                  }}
                  style={{
                    padding: 'var(--space-2) var(--space-4)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--border-radius-lg)',
                    backgroundColor: 'var(--color-surface)',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        )}

        {/* 대화 종료 버튼 (대화 중에만 표시) */}
        {session.isActive && (
          <div style={{ marginTop: 'var(--space-8)' }}>
            <button
              onClick={endSession}
              style={{
                fontSize: 'var(--text-sm)',
                color: 'var(--color-text-muted)',
                background: 'none',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              대화 종료하고 돌아가기
            </button>
          </div>
        )}
      </div>
    </main>
  );
};

export default ConversationPage;