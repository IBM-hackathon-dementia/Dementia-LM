import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authState } from '../recoil/atoms';
import { apiClient, UserReport, UserReportsResponse } from '../../lib/api';

// HTML 리포트 생성 함수 (conversation.tsx에서 복사)
const generateReportHtml = (reportData: any, conversations: any[]) => {
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
            <p><strong>상세 분석:</strong> ${reportData.detailedAnalysis || '분석 정보가 없습니다.'}</p>
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
                ${conversations.map((msg) => `
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
</body>
</html>
  `;
};

// HTML을 PDF로 변환하여 다운로드하는 함수
const convertHtmlToPdfAndDownload = (htmlContent: string, _reportId: string) => {
  try {
    // 간단한 방법: window.print()를 사용하여 PDF 생성
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert('팝업이 차단되었습니다. 팝업을 허용하고 다시 시도해주세요.');
      return;
    }

    // 인쇄용 스타일을 추가한 HTML 작성
    const printableHtml = htmlContent.replace(
      '</head>',
      `<style>
        @media print {
          body { margin: 0; padding: 20px; }
          .container { box-shadow: none; margin: 0; }
          .no-print { display: none !important; }
        }
        @page {
          size: A4;
          margin: 20mm;
        }
      </style>
      <script>
        window.onload = function() {
          setTimeout(function() {
            window.print();
            setTimeout(function() {
              window.close();
            }, 100);
          }, 500);
        };
      </script>
      </head>`
    );

    // 새 창에 HTML 작성
    printWindow.document.write(printableHtml);
    printWindow.document.close();

    console.log('📄 PDF 인쇄 다이얼로그 열림');
  } catch (error) {
    console.error('❌ PDF 생성 실패:', error);
    alert('PDF 생성에 실패했습니다.');
  }
};

const ReportsPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useRecoilValue(authState);
  const [reports, setReports] = useState<UserReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generatingPdf, setGeneratingPdf] = useState<string | null>(null);

  useEffect(() => {
    if (auth.isAuthenticated && auth.caregiver?.id) {
      loadReports();
    }
  }, [auth]);

  const loadReports = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('📊 리포트 조회 시작, userId:', auth.caregiver?.id);

      // 로컬 스토리지에서 상세 리포트들 불러오기
      const localReports = JSON.parse(localStorage.getItem('generatedReports') || '[]');
      const userReports = localReports
        .filter((report: any) => report.userId === auth.caregiver?.id)
        .map((report: any) => ({
          id: report.id,
          userId: report.userId,
          imageId: 'session_image',
          summary: report.analysisData?.conversationSummary || '대화 세션 리포트',
          memo: report.analysisData?.detailedAnalysis || '상세 분석 완료',
          generatedAt: report.generatedAt,
          status: report.status,
          imageThumbnail: null,
          imageDescription: '대화 세션'
        }));

      console.log('📊 로컬 리포트 조회 완료, 개수:', userReports.length);
      setReports(userReports);

      // API에서도 추가 리포트 조회 (필요시)
      try {
        const response: UserReportsResponse = await apiClient.getUserReports(auth.caregiver!.id);
        const apiReports = response.reports || [];

        // 중복 제거하여 병합
        const allReports = [...userReports];
        apiReports.forEach(apiReport => {
          if (!allReports.find(localReport => localReport.id === apiReport.id)) {
            allReports.push(apiReport);
          }
        });

        setReports(allReports);
      } catch (apiError) {
        console.log('⚠️ API 리포트 조회 실패, 로컬 리포트만 표시:', apiError);
      }

    } catch (err) {
      console.error('❌ 리포트 조회 오류:', err);
      setError(err instanceof Error ? err.message : '리포트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewReport = (reportId: string) => {
    try {
      console.log('📊 리포트 상세 보기, reportId:', reportId);

      // 로컬 스토리지에서 상세 리포트 데이터 찾기
      const localReports = JSON.parse(localStorage.getItem('generatedReports') || '[]');
      const fullReport = localReports.find((report: any) => report.id === reportId);

      if (fullReport && fullReport.analysisData) {
        // HTML 리포트 생성 및 새 창에서 열기
        const reportHtml = generateReportHtml(fullReport.analysisData, fullReport.conversations || []);
        const newWindow = window.open('', '_blank');
        if (newWindow) {
          newWindow.document.write(reportHtml);
          newWindow.document.close();
        }
      } else {
        alert('상세 리포트 데이터를 찾을 수 없습니다.');
      }
    } catch (err) {
      console.error('❌ 리포트 보기 오류:', err);
      alert('리포트를 열 수 없습니다: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    }
  };

  const handleGeneratePdf = async (reportId: string) => {
    try {
      setGeneratingPdf(reportId);
      console.log('📄 PDF 생성 시작, reportId:', reportId);

      const response = await apiClient.generateReportPdf({
        reportId,
        userId: auth.caregiver!.id,
        includeImages: true
      });
      console.log('📄 PDF 생성 응답:', response);

      // Handle PDF download
      if (response.downloadUrl) {
        // HTML 콘텐츠를 클라이언트에서 PDF로 변환하여 다운로드
        const htmlContent = response.downloadUrl.startsWith('data:text/html')
          ? decodeURIComponent(escape(atob(response.downloadUrl.split(',')[1])))
          : null;

        if (htmlContent) {
          // HTML을 PDF로 변환하여 다운로드
          convertHtmlToPdfAndDownload(htmlContent, reportId);
        } else if (response.downloadUrl.startsWith('data:application/pdf')) {
          // PDF Data URL인 경우 직접 다운로드
          const link = document.createElement('a');
          link.href = response.downloadUrl;
          link.download = `치매케어_리포트_${reportId}_${new Date().toLocaleDateString('ko-KR').replace(/\./g, '')}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } else {
          // 일반 URL인 경우 새 탭에서 열기
          window.open(response.downloadUrl, '_blank');
        }
      }
    } catch (err) {
      console.error('❌ PDF 생성 오류:', err);
      alert('PDF 생성에 실패했습니다: ' + (err instanceof Error ? err.message : '알 수 없는 오류'));
    } finally {
      setGeneratingPdf(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!auth.isAuthenticated) {
    return (
      <div className="page-container">
        <div className="content-wrapper">
          <div className="card-elevated text-center">
            <h1 className="text-3xl" style={{ marginBottom: 'var(--space-6)' }}>
              로그인이 필요합니다
            </h1>
            <button
              onClick={() => navigate('/auth')}
              className="btn btn-primary btn-lg"
            >
              로그인하기
            </button>
          </div>
        </div>
      </div>
    );
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
                  활동 보고서
                </h1>
                <p className="text-gray-600">대화 세션 리포트를 확인해보세요</p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={loadReports}
                disabled={loading}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {loading ? '새로고침 중...' : '새로고침'}
              </button>
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                홈으로
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8">

          {error && (
            <div className="bg-red-50 text-red-700 p-4 rounded-lg" style={{ marginBottom: 'var(--space-4)' }}>
              {error}
            </div>
          )}

          {loading ? (
            <div className="text-center py-8">
              <div className="text-lg">리포트를 불러오는 중...</div>
            </div>
          ) : reports.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-lg text-muted" style={{ marginBottom: 'var(--space-4)' }}>
                아직 생성된 리포트가 없습니다.
              </div>
              <p className="text-sm text-muted">
                대화 세션을 완료하면 자동으로 리포트가 생성됩니다.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {reports.map((report) => (
                <div key={report.id} className="border rounded-lg p-4 bg-white shadow-sm">
                  <div className="flex justify-between items-start" style={{ marginBottom: 'var(--space-3)' }}>
                    <div>
                      <h3 className="text-lg font-semibold" style={{ marginBottom: 'var(--space-1)' }}>
                        리포트 #{report.id.slice(-6)}
                      </h3>
                      <p className="text-sm text-muted">
                        생성일: {formatDate(report.generatedAt)}
                      </p>
                      <p className="text-sm text-muted">
                        상태: <span className={`px-2 py-1 rounded text-xs ${
                          report.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                          report.status === 'PROCESSING' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {report.status === 'COMPLETED' ? '완료' :
                           report.status === 'PROCESSING' ? '처리중' : '대기중'}
                        </span>
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleViewReport(report.id)}
                        className="btn btn-primary btn-sm"
                      >
                        상세 보기
                      </button>
                      <button
                        onClick={() => handleGeneratePdf(report.id)}
                        disabled={generatingPdf === report.id || report.status !== 'COMPLETED'}
                        className="btn btn-secondary btn-sm"
                      >
                        {generatingPdf === report.id ? 'PDF 생성 중...' : 'PDF 다운로드'}
                      </button>
                    </div>
                  </div>

                  {report.imageThumbnail && (
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                      <img
                        src={report.imageThumbnail}
                        alt="세션 이미지"
                        className="w-20 h-20 object-cover rounded"
                      />
                      {report.imageDescription && (
                        <p className="text-sm text-muted mt-1">{report.imageDescription}</p>
                      )}
                    </div>
                  )}

                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <h4 className="font-medium" style={{ marginBottom: 'var(--space-2)' }}>요약</h4>
                    <p className="text-sm">{report.summary}</p>
                  </div>

                  {report.memo && (
                    <div>
                      <h4 className="font-medium" style={{ marginBottom: 'var(--space-2)' }}>메모</h4>
                      <p className="text-sm text-muted">{report.memo}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="text-center" style={{ marginTop: 'var(--space-8)' }}>
            <button
              onClick={() => navigate('/')}
              className="btn btn-primary"
            >
              홈으로 돌아가기
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default ReportsPage;