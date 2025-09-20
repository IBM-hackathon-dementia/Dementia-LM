import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useSetRecoilState } from 'recoil';
import { authState } from '../recoil/atoms';

const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useRecoilValue(authState);
  const setAuth = useSetRecoilState(authState);

  const handleLogout = () => {
    setAuth({
      isAuthenticated: false,
      caregiver: null,
      selectedPatient: null,
    });
    navigate('/login');
  };

  // 인증되지 않았거나 환자가 선택되지 않았으면 적절한 페이지로 리다이렉트
  React.useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate('/login');
      return;
    }
    if (!auth.selectedPatient) {
      navigate('/dashboard');
      return;
    }
  }, [auth.isAuthenticated, auth.selectedPatient, navigate]);

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="flex-between" style={{ marginBottom: 'var(--space-8)' }}>
          <div>
            <h1 className="text-4xl" style={{
              color: 'var(--color-primary)',
              marginBottom: 'var(--space-2)'
            }}>
              AI 회상 치료
            </h1>
            <p className="text-xl text-muted">
              {auth.selectedPatient?.name}님, 오늘도 좋은 추억을 함께 나눠요
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-outline btn-lg"
          >
            로그아웃
          </button>
        </div>

        <main className="stack-md">
          {/* 메인 대화 버튼 */}
          <section className="card-elevated text-center">
            <button
              className="btn btn-primary btn-xl btn-full"
              onClick={() => navigate('/conversation')}
              style={{ marginBottom: 'var(--space-4)' }}
            >
              🎤 AI와 대화하기
            </button>
            <p className="text-base text-muted">
              AI와 함께 편안한 대화를 나누며 소중한 추억들을 되새겨보세요
            </p>
          </section>

          {/* 빠른 메뉴 */}
          <section className="card">
            <h3 className="text-lg" style={{
              marginBottom: 'var(--space-4)',
              textAlign: 'center'
            }}>
              빠른 메뉴
            </h3>
            <div className="grid grid-2" style={{ gap: 'var(--space-3)' }}>
              <button
                className="btn btn-secondary btn-md btn-full"
                onClick={() => navigate('/upload')}
                style={{ height: '60px', display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                📷 <span style={{ fontSize: '14px' }}>사진 추가</span>
              </button>
              <button
                className="btn btn-secondary btn-md btn-full"
                onClick={() => navigate('/voice-settings')}
                style={{ height: '60px', display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                🔊 <span style={{ fontSize: '14px' }}>음성 설정</span>
              </button>
              <button
                className="btn btn-secondary btn-md btn-full"
                onClick={() => navigate('/reports')}
                style={{ height: '60px', display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                📊 <span style={{ fontSize: '14px' }}>활동 보기</span>
              </button>
              <button
                className="btn btn-secondary btn-md btn-full"
                onClick={() => navigate('/dashboard')}
                style={{ height: '60px', display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                👤 <span style={{ fontSize: '14px' }}>환자 변경</span>
              </button>
            </div>
          </section>

          {/* 최근 활동 - 컴팩트 */}
          <section className="card text-center">
            <h3 className="text-base text-muted" style={{ marginBottom: 'var(--space-2)' }}>
              최근 활동
            </h3>
            <p className="text-sm text-muted">
              첫 번째 회상을 시작해보세요!
            </p>
          </section>
        </main>
      </div>
    </div>
  );
};

export default HomePage;