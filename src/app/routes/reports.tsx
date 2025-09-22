import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authState } from '../recoil/atoms';
import { apiClient, UserReport, UserReportsResponse } from '../../lib/api';

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

      const response: UserReportsResponse = await apiClient.getUserReports(auth.caregiver!.id);
      console.log('📊 리포트 조회 응답:', response);

      setReports(response.reports || []);
    } catch (err) {
      console.error('❌ 리포트 조회 오류:', err);
      setError(err instanceof Error ? err.message : '리포트를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
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

      // Open PDF download URL in new tab
      if (response.downloadUrl) {
        window.open(response.downloadUrl, '_blank');
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
    <div className="page-container">
      <div className="content-wrapper">
        <div className="card-elevated">
          <div className="flex justify-between items-center" style={{ marginBottom: 'var(--space-6)' }}>
            <h1 className="text-3xl">활동 보고서</h1>
            <button
              onClick={loadReports}
              disabled={loading}
              className="btn btn-secondary"
            >
              {loading ? '새로고침 중...' : '새로고침'}
            </button>
          </div>

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
      </div>
    </div>
  );
};

export default ReportsPage;