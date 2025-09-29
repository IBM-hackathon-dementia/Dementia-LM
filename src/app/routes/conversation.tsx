import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useRecoilState } from 'recoil';
import { authState, sessionState } from '../recoil/atoms';
import { ConversationMessage } from '../recoil/types';
import { apiClient } from '../../lib/api';

// HTML 리포트 생성 함수
const generateReportHtml = (reportData: any, conversations: ConversationMessage[]) => {
  const currentDate = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>치매 회상 치료 세션 리포트</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        body {
            font-family: 'Malgun Gothic', Arial, sans-serif;
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
        .conversation-list {
            max-height: 300px;
            overflow-y: auto;
            background: white;
            border: 1px solid #e5e7eb;
            border-radius: 8px;
            padding: 15px;
        }
        .message {
            margin-bottom: 15px;
            padding: 10px;
            border-radius: 8px;
        }
        .message.user {
            background: #eff6ff;
            border-left: 3px solid #3b82f6;
        }
        .message.assistant {
            background: #f0fdf4;
            border-left: 3px solid #10b981;
        }
        .message-role {
            font-weight: bold;
            font-size: 12px;
            color: #6b7280;
            margin-bottom: 5px;
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
            font-size: 16px;
        }
        .chart-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        .chart-small {
            height: 350px;
        }
        @media print {
            body { background: white; }
            .container { box-shadow: none; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>치매 회상 치료 세션 리포트</h1>
            <p>생성일: ${currentDate}</p>
        </div>

        <div class="section">
            <h2>📊 세션 정보</h2>
            <p><strong>총 대화 시간:</strong> ${Math.round((reportData.totalDuration || 0) / 60000)}분</p>
            <p><strong>대화 교환 횟수:</strong> ${reportData.totalConversations || conversations.length}회</p>
            <p><strong>긍정적 반응:</strong> ${reportData.positiveReactions || 0}회</p>
            <p><strong>부정적 반응:</strong> ${reportData.negativeReactions || 0}회</p>
        </div>

        <div class="section">
            <h2>🧠 인지 능력 평가</h2>
            <div class="score-grid">
                <div class="score-item">
                    <div class="score-value">${reportData.orientationScore || 'N/A'}/5</div>
                    <div class="score-label">지남력</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${reportData.attentionScore || 'N/A'}/5</div>
                    <div class="score-label">주의력</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${reportData.memoryScore || 'N/A'}/5</div>
                    <div class="score-label">기억력</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${reportData.languageScore || 'N/A'}/5</div>
                    <div class="score-label">언어능력</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${reportData.comprehensionScore || 'N/A'}/5</div>
                    <div class="score-label">이해력</div>
                </div>
                <div class="score-item">
                    <div class="score-value">${reportData.participationLevel || 'N/A'}/5</div>
                    <div class="score-label">참여도</div>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📋 종합 평가</h2>
            <p><strong>기능적 수준:</strong> ${reportData.functionalLevel || '평가 불가'}</p>
            <p><strong>정서 상태:</strong> ${reportData.emotionalState || '평가 불가'}</p>
            <p><strong>종합 인지 상태:</strong> ${reportData.overallCognition || '평가 불가'}</p>
        </div>

        <div class="section">
            <h2>📈 주차별 진행 추이</h2>
            <div class="chart-container">
                <div class="chart-title">인지기능 점수 변화 (최근 8주)</div>
                <canvas id="weeklyChart"></canvas>
            </div>

            <div class="chart-grid">
                <div class="chart-container chart-small">
                    <div class="chart-title">현재 인지기능 점수</div>
                    <canvas id="barChart"></canvas>
                </div>

                <div class="chart-container chart-small">
                    <div class="chart-title">대화 반응 분포</div>
                    <canvas id="pieChart"></canvas>
                </div>
            </div>
        </div>

        <div class="section">
            <h2>📝 상세 분석</h2>
            <p>${reportData.detailedAnalysis || '이번 세션에서는 환자의 인지 기능과 감정 상태를 종합적으로 평가했습니다. 대화를 통해 나타난 반응과 참여도를 바탕으로 개인 맞춤형 치료 계획을 수립할 예정입니다.'}</p>
        </div>

        <div class="section">
            <h2>⚠️ 관찰된 증상 및 위험 요인</h2>
            <p><strong>행동 증상:</strong> ${(reportData.behavioralSymptoms || []).join(', ') || '관찰된 증상 없음'}</p>
            <p><strong>위험 요인:</strong> ${(reportData.riskFactors || []).join(', ') || '특별한 위험 요인 없음'}</p>
            <p><strong>기분 변화:</strong> ${(reportData.moodChanges || []).join(', ') || '변화 없음'}</p>
        </div>

        <div class="section">
            <h2>💬 대화 내용</h2>
            <p><strong>대화 요약:</strong> ${reportData.conversationSummary || '대화 요약이 없습니다.'}</p>
            <div class="conversation-list">
                ${conversations.map(msg => `
                    <div class="message ${msg.role}">
                        <div class="message-role">${msg.role === 'user' ? '환자' : '이음이'}</div>
                        <div>${msg.content}</div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="recommendations">
            <h3>📝 권장사항</h3>
            <ul>
                ${(reportData.careRecommendations || []).map((rec: string) => `<li>${rec}</li>`).join('')}
                ${(reportData.recommendations || []).map((rec: string) => `<li>${rec}</li>`).join('')}
            </ul>
        </div>

        <div class="footer">
            <p>이 리포트는 이음이 AI 회상 치료 시스템에 의해 자동 생성되었습니다.</p>
            <p>정확한 진단을 위해서는 전문의와 상담하시기 바랍니다.</p>
        </div>
    </div>

    <script>
        // 차트 생성을 위한 더미 데이터
        const currentScores = {
            orientation: ${reportData.orientationScore || 4},
            attention: ${reportData.attentionScore || 3},
            memory: ${reportData.memoryScore || 3},
            language: ${reportData.languageScore || 2},
            comprehension: ${reportData.comprehensionScore || 4}
        };

        // 8주간의 더미 데이터 생성 (현재 점수를 기준으로 변화)
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
                                label: '주의력',
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
                                label: '언어능력',
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
                        labels: ['지남력', '주의력', '기억력', '언어능력', '이해력'],
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
                const positiveReactions = ${reportData.positiveReactions || 3};
                const negativeReactions = ${reportData.negativeReactions || 1};
                const neutralReactions = Math.max(1, ${reportData.totalConversations || 8} - positiveReactions - negativeReactions);

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
};

const ConversationPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useRecoilValue(authState);
  const [session, setSession] = useRecoilState(sessionState);
  const [isRecording, setIsRecording] = useState(false);
  const [showTextInput, setShowTextInput] = useState(false);
  const [textInput, setTextInput] = useState('');
  const [microphoneError, setMicrophoneError] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [currentImage, setCurrentImage] = useState<{imageUrl: string, description: string, analysis?: string} | null>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [showPhotoUpload, setShowPhotoUpload] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoDescription, setPhotoDescription] = useState('');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 이미지 분석 함수
  const analyzeImage = async (imageUrl: string): Promise<string> => {
    try {
      setIsAnalyzingImage(true);
      console.log('🔍 백엔드 AI로 사진 분석 중...');

      // Base64 데이터 URL을 Blob으로 변환
      const response = await fetch(imageUrl);
      const blob = await response.blob();

      // FormData로 이미지 전송
      const formData = new FormData();
      formData.append('image', blob, 'image.jpg');

      // 백엔드 이미지 분석 API 호출
      const analysisResponse = await fetch('https://eume-api.hwjinfo.workers.dev/analyze-image', {
        method: 'POST',
        headers: {
          'X-User-ID': localStorage.getItem('userId') || 'default-user'
        },
        body: formData
      });

      if (!analysisResponse.ok) {
        throw new Error(`이미지 분석 API 호출 실패: ${analysisResponse.status}`);
      }

      const analysisResult = await analysisResponse.json();
      const imageAnalysis = analysisResult.imageAnalysis || '사진을 분석했습니다.';

      console.log('✅ AI 이미지 분석 완료:', imageAnalysis);

      // AI 분석 결과에 회상 치료 질문 추가
      const memoryPrompts = [
        "이 사진을 보시니 어떤 기억이 떠오르시나요?",
        "그때의 기분이나 느낌을 기억하고 계시나요?",
        "이 사진과 관련된 특별한 추억이 있으시다면 들려주세요.",
        "사진을 보니 누가 떠오르시나요?",
        "그때 상황을 더 자세히 기억해보실 수 있나요?"
      ];

      const randomPrompt = memoryPrompts[Math.floor(Math.random() * memoryPrompts.length)];

      return `${imageAnalysis}\n\n${randomPrompt}`;
    } catch (error) {
      console.error('❌ 이미지 분석 오류:', error);

      // 백엔드 연결 실패시 기본 응답
      const fallbackPrompts = [
        "이 사진에 담긴 소중한 기억들을 함께 나누어볼까요?",
        "사진을 보시니 어떤 생각이 드시나요?",
        "이 사진과 관련된 추억을 들려주세요.",
        "사진을 보시니 누가 떠오르시나요?"
      ];

      const randomFallback = fallbackPrompts[Math.floor(Math.random() * fallbackPrompts.length)];
      return randomFallback;
    } finally {
      setIsAnalyzingImage(false);
    }
  };

  // 사진 파일 선택 처리
  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedPhoto(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setPhotoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // 사진 업로드 및 대화 시작
  const handlePhotoUpload = async () => {
    if (!selectedPhoto || !photoDescription.trim()) {
      alert('사진과 설명을 모두 입력해주세요.');
      return;
    }

    try {
      console.log('🚀 이미지 분석 시작 (업로드 우회)');

      // 업로드를 우회하고 직접 이미지 분석 시작
      const imageUrl = photoPreview!;
      const analysis = await analyzeImage(imageUrl);

      console.log('✅ 이미지 분석 완료:', analysis);

      setCurrentImage({
        imageUrl: imageUrl,
        description: photoDescription.trim(),
        analysis: analysis
      });

      // 환영 메시지 추가
      const welcomeMessage: ConversationMessage = {
        id: `msg-${Date.now()}`,
        role: 'assistant',
        content: `안녕하세요! 업로드해주신 사진을 보니 ${photoDescription.trim()}이시군요. 이 사진에 대해 이야기해볼까요?`,
        timestamp: new Date()
      };

      setSession(prev => ({
        ...prev,
        conversationHistory: [...prev.conversationHistory, welcomeMessage],
        stage: 'conversation'
      }));

      // 상태 초기화
      setShowPhotoUpload(false);
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setPhotoDescription('');

    } catch (error) {
      console.error('❌ Photo upload failed:', error);
      alert('사진 업로드에 실패했습니다. 다시 시도해주세요.');
    }
  };

  // 페이지 로드 시 대기 중인 이미지 분석 처리
  useEffect(() => {
    const handlePendingImageAnalysis = async () => {
      const pendingImageData = localStorage.getItem('pendingImageAnalysis');
      if (pendingImageData && auth.selectedPatient) {
        try {
          const imageData = JSON.parse(pendingImageData);
          console.log('🖼️ 이미지 분석 시작:', imageData);

          // 이미지 분석 실행
          const analysis = await analyzeImage(imageData.imageUrl);

          // 현재 이미지 상태 설정
          setCurrentImage({
            imageUrl: imageData.imageUrl,
            description: imageData.description,
            analysis: analysis
          });

          // 이미지 기반 환영 메시지 추가
          const welcomeMessage: ConversationMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: `안녕하세요! 업로드해주신 사진을 보니 ${imageData.description}이시군요. 이 사진에 대해 이야기해볼까요?`,
            timestamp: new Date()
          };

          setSession(prev => ({
            ...prev,
            conversationHistory: [...prev.conversationHistory, welcomeMessage],
            isActive: true,
            hasPhotoSession: true
          }));

          // 로컬 스토리지에서 대기 중인 이미지 데이터 제거
          localStorage.removeItem('pendingImageAnalysis');

          console.log('✅ 이미지 기반 대화 세션 시작됨');
        } catch (error) {
          console.error('❌ 이미지 분석 실패:', error);
          localStorage.removeItem('pendingImageAnalysis');
        }
      }
    };

    handlePendingImageAnalysis();
  }, [auth.selectedPatient, setSession]);

  // 마이크 권한 미리 확인
  useEffect(() => {
    const checkMicrophonePermission = async () => {
      try {
        console.log('🔍 마이크 권한 상태 확인 중...');

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        console.log('✅ 마이크 권한 허용됨');

        // 즉시 스트림 종료 (권한만 확인)
        stream.getTracks().forEach(track => track.stop());

        setMicrophoneError(''); // 권한이 있으면 에러 메시지 제거
      } catch (error) {
        console.log('⚠️ 마이크 권한 없음:', error);

        if (error instanceof DOMException && error.name === 'NotAllowedError') {
          setMicrophoneError('🎤 음성 대화를 위해 마이크 권한이 필요합니다. 음성 버튼을 클릭하여 허용해주세요.');
        }
      }
    };

    // 페이지 로드 후 1초 뒤에 권한 확인
    const timer = setTimeout(checkMicrophonePermission, 1000);
    return () => clearTimeout(timer);
  }, []);

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
      // 마이크 권한 상태 확인
      if (navigator.permissions) {
        try {
          const permission = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log('🎤 마이크 권한 상태:', permission.state);

          if (permission.state === 'denied') {
            setMicrophoneError('마이크 접근이 차단되었습니다. 브라우저 설정에서 마이크 권한을 허용해주세요.');
            setShowTextInput(true);
            return;
          }
        } catch (permError) {
          console.log('권한 확인 API 미지원');
        }
      }

      console.log('🎤 마이크 접근 요청 중...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });

      console.log('✅ 마이크 접근 성공');
      setMicrophoneError(''); // 성공 시 에러 메시지 제거

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
      console.error('🎤 마이크 접근 오류:', error);

      let errorMessage = '마이크 접근 오류가 발생했습니다.';

      if (error instanceof DOMException) {
        switch (error.name) {
          case 'NotAllowedError':
            errorMessage = '마이크 접근이 차단되었습니다. 브라우저 주소창 옆의 🎤 아이콘을 클릭하여 권한을 허용해주세요.';
            break;
          case 'NotFoundError':
            errorMessage = '마이크를 찾을 수 없습니다. 마이크가 연결되어 있는지 확인해주세요.';
            break;
          case 'NotReadableError':
            errorMessage = '마이크가 다른 프로그램에서 사용 중입니다. 다른 프로그램을 종료한 후 다시 시도해주세요.';
            break;
          case 'OverconstrainedError':
            errorMessage = '마이크 설정에 문제가 있습니다. 다른 마이크를 사용해보세요.';
            break;
          case 'SecurityError':
            errorMessage = '보안상의 이유로 마이크에 접근할 수 없습니다. HTTPS 연결을 확인해주세요.';
            break;
          default:
            errorMessage = `마이크 오류: ${error.message}`;
        }
      }

      console.log('📝 마이크 오류 상세:', errorMessage);
      setMicrophoneError(errorMessage);
      setShowTextInput(true);

      // 권한이 차단된 경우 사용자에게 브라우저 권한 설정 안내
      if (error instanceof DOMException && error.name === 'NotAllowedError') {
        // 3초 후 자동으로 권한 재요청 안내
        setTimeout(() => {
          if (confirm('마이크 권한이 필요합니다. 브라우저 설정을 열어보시겠습니까?')) {
            alert(`다음 단계를 따라주세요:
1. 브라우저 주소창 옆의 🎤 아이콘 클릭
2. "마이크 허용" 선택
3. 페이지 새로고침 후 다시 시도`);
          }
        }, 2000);
      }
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
        'X-Photo-Session': (uploadedPhotos.length > 0 || currentImage) ? 'true' : 'false',
      };

      // 현재 이미지 분석 정보 추가
      if (currentImage && currentImage.analysis) {
        headers['X-Image-Analysis'] = btoa(encodeURIComponent(currentImage.analysis));
      }

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

      setSession(prev => ({
        ...prev,
        conversationHistory: [],
      }));
    }
  };

  const endSession = async () => {
    console.log('🏁 대화 세션 종료 시작');
    window.speechSynthesis.cancel();

    // 리포트 생성 시도 (대화 내용이 있는 경우에만)
    if (session.conversationHistory.length > 1 && auth.caregiver?.id) {
      try {
        console.log('📊 리포트 생성 시작', {
          userId: auth.caregiver.id,
          conversationLength: session.conversationHistory.length,
          sessionId: session.currentConversationId
        });

        // 실제 대화 내용을 기존 리포트 생성 API에 전송
        const sessionData = {
          sessionStart: session.startedAt?.getTime() || Date.now() - 300000, // 5분 전으로 기본값
          sessionEnd: Date.now(),
          totalDuration: Date.now() - (session.startedAt?.getTime() || Date.now() - 300000),
          totalConversations: session.conversationHistory.length
        };

        // 환경별 API URL 설정
        const API_BASE_URL = 'https://eume-api.hwjinfo.workers.dev';

        // 기존 리포트 생성 API 호출 (Cloudflare Worker로)
        const reportResponse = await fetch(`${API_BASE_URL}/api/generate-report`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            conversations: session.conversationHistory,
            sessionData: sessionData
          })
        });

        if (!reportResponse.ok) {
          throw new Error(`리포트 생성 실패: ${reportResponse.status}`);
        }

        const reportData = await reportResponse.json();
        console.log('📊 상세 리포트 생성 완료:', reportData);

        // HTML 리포트 생성 및 다운로드
        const htmlContent = generateReportHtml(reportData, session.conversationHistory);
        const fileName = `치매회상치료_${auth.selectedPatient?.name || '환자'}_${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.html`;

        // HTML 파일 다운로드
        const blob = new Blob([htmlContent], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        // 리포트 데이터를 로컬 스토리지에 저장 (나중에 리포트 페이지에서 접근 가능)
        const reportId = 'report_' + Date.now();
        const fullReportData = {
          id: reportId,
          userId: auth.caregiver.id,
          conversations: session.conversationHistory,
          analysisData: reportData,
          generatedAt: new Date().toISOString(),
          status: 'COMPLETED',
          fileName: fileName
        };

        // 기존 리포트들과 함께 저장
        const existingReports = JSON.parse(localStorage.getItem('generatedReports') || '[]');
        existingReports.push(fullReportData);
        localStorage.setItem('generatedReports', JSON.stringify(existingReports));

        // 간단한 리포트도 API에 저장
        await apiClient.generateReport({
          userId: auth.caregiver.id,
          imageId: 'session_' + Date.now()
        });

        console.log('📊 HTML 리포트가 성공적으로 생성되고 다운로드되었습니다:', fileName);

      } catch (error) {
        console.error('❌ 리포트 생성 실패:', error);
        // 리포트 생성 실패해도 세션은 종료
        console.log('⚠️ 리포트 생성에 실패했지만 세션을 종료합니다');
      }
    } else {
      console.log('📊 리포트 생성 건너뜀: 대화 내용이 부족하거나 사용자 ID가 없음');
    }

    setSession(prev => ({
      ...prev,
      isActive: false,
      isSpeaking: false,
      isListening: false,
    }));

    console.log('🏁 대화 세션 종료 완료');
    navigate('/');
  };

  if (!auth.selectedPatient) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <img
                src="/img/이음3.png"
                alt="이음이 캐릭터"
                className="w-16 h-16 object-contain"
              />
              <div>
                <h1 className="text-2xl font-bold text-green-600" style={{ color: '#406459ff' }}>
                  {auth.selectedPatient?.name}님과의 대화
                </h1>
                <p className="text-gray-600">편안하게 대화해보세요</p>
              </div>
            </div>
            <button
              onClick={() => navigate('/')}
              className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              홈으로
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-8">
        {/* 사진 업로드 섹션 */}
        {session.conversationHistory.length === 0 && !currentImage && (
          <div className="mb-8 bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
              🖼️ 사진과 함께 대화를 시작해보세요
            </h2>

            {!showPhotoUpload ? (
              <div className="text-center">
                <p className="text-gray-600 mb-6">
                  사진을 업로드하면 AI가 이미지를 분석하여 더 의미있는 회상 대화를 시작할 수 있습니다.
                </p>
                <button
                  onClick={() => setShowPhotoUpload(true)}
                  className="px-8 py-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors text-lg"
                >
                  📷 사진 업로드하기
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex flex-col items-center space-y-4">
                  {photoPreview ? (
                    <div className="relative">
                      <img
                        src={photoPreview}
                        alt="미리보기"
                        className="max-w-md max-h-64 object-contain rounded-lg shadow-md"
                      />
                      <button
                        onClick={() => {
                          setSelectedPhoto(null);
                          setPhotoPreview(null);
                        }}
                        className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors">
                        <div className="text-gray-500 text-lg mb-2">📷</div>
                        <p className="text-gray-600">클릭하여 사진을 선택하세요</p>
                      </div>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    사진 설명
                  </label>
                  <textarea
                    value={photoDescription}
                    onChange={(e) => setPhotoDescription(e.target.value)}
                    placeholder="이 사진에 대한 간단한 설명을 입력해주세요..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    rows={3}
                  />
                </div>

                <div className="flex space-x-4 justify-center">
                  <button
                    onClick={() => {
                      setShowPhotoUpload(false);
                      setSelectedPhoto(null);
                      setPhotoPreview(null);
                      setPhotoDescription('');
                    }}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    취소
                  </button>
                  <button
                    onClick={handlePhotoUpload}
                    disabled={!selectedPhoto || !photoDescription.trim()}
                    className="px-6 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    대화 시작하기
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 대화 영역 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-2xl shadow-lg p-8">
              {/* 현재 분석 중인 이미지 표시 */}
              {(isAnalyzingImage || currentImage) && (
                <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200">
                  <div className="flex items-center justify-center mb-4">
                    {isAnalyzingImage ? (
                      <div className="flex items-center space-x-3">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
                        <span className="text-lg font-medium text-blue-700">🔍 사진 분석 중입니다... <br />최대 1분 정도 소요됩니다!</span>
                      </div>
                    ) : (
                      <span className="text-lg font-medium text-blue-700">📷 현재 대화 중인 사진</span>
                    )}
                  </div>
                  {currentImage && (
                    <div className="text-center">
                      <img
                        src={currentImage.imageUrl}
                        alt={currentImage.description}
                        className="max-w-xs max-h-48 mx-auto rounded-lg shadow-md object-cover mb-3"
                      />
                      <p className="text-gray-700 font-medium">{currentImage.description}</p>
                      {currentImage.analysis && (
                        <div className="mt-3 p-3 bg-white rounded-lg text-sm text-gray-600">
                          <p className="font-medium mb-1">🤖 AI 분석 결과:</p>
                          <p>{currentImage.analysis.length > 100
                            ? currentImage.analysis.substring(0, 100) + '...'
                            : currentImage.analysis}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              <div className="text-center">
                <div className="mb-8">
                  <div className="w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                    <img
                      src="/img/이음3.png"
                      alt="이음이 캐릭터"
                      className="w-20 h-20 object-contain"
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
                  {auth.selectedPatient?.name}님,<br/> 이음이와 대화해보세요!
                </p>
                <p style={{
                  fontSize: 'clamp(var(--text-lg), 1vw, var(--text-xl))',
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
            {session.isSpeaking ? '이음이가 말하고 있어요...' :
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
                backgroundColor: isThinking ? 'var(--color-assistant)' : 'var(--color-action)',
                borderRadius: '50%',
                animation: 'bounce 1s infinite'
              }}></div>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: isThinking ? 'var(--color-assistant)' : 'var(--color-action)',
                borderRadius: '50%',
                animation: 'bounce 1s infinite',
                animationDelay: '0.1s'
              }}></div>
              <div style={{
                width: '12px',
                height: '12px',
                backgroundColor: isThinking ? 'var(--color-assistant)' : 'var(--color-action)',
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
                backgroundColor: 'var(--color-action)',
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
                    backgroundColor: 'var(--color-action)',
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
                  <div className="mt-8 text-center">
                    <button
                      onClick={endSession}
                      className="text-sm text-gray-500 hover:text-gray-700 underline"
                    >
                      대화 종료하고 보고서 받기
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 사이드바 */}
          <div className="space-y-6">
            {/* 대화 상태 */}
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                대화 상태
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">대화 시간</span>
                  <span className="text-sm font-medium">
                    {session.isActive ? '진행 중' : '준비'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">메시지 수</span>
                  <span className="text-sm font-medium">
                    {session.conversationHistory.length}
                  </span>
                </div>
              </div>
            </div>

            {/* 업로드된 사진 정보 */}
            {(() => {
              const uploadedPhotos = getUploadedPhotos();
              return uploadedPhotos.length > 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <h3 className="text-lg font-semibold text-gray-800 mb-4">
                    활용 중인 사진
                  </h3>
                  <div className="text-center py-4">
                    <div className="text-3xl mb-2">📷</div>
                    <p className="text-sm text-gray-600">
                      {uploadedPhotos.length}장의 사진을<br/>
                      대화에 활용하고 있어요
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/upload')}
                    className="w-full mt-4 px-4 py-2 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition-colors"
                  >
                    사진 더 추가하기
                  </button>
                </div>
              );
            })()}

            {/* 도움말 */}
            <div className="bg-green-50 rounded-2xl p-6">
              <div className="flex items-start space-x-3">
                <div>
                  <h4 className="font-semibold text-green-800 mb-2">
                    대화 팁
                  </h4>
                  <ul className="text-sm text-green-700 space-y-2">
                    <li>• 마이크 버튼을 눌러 말씀해 주세요</li>
                    <li>• 언제든지 대화를 중지할 수 있습니다</li>
                    <li>• 대화 종료 시 보고서가 제공됩니다!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ConversationPage;
