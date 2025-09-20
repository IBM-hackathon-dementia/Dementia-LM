import React from 'react';
import { useNavigate } from 'react-router-dom';

const VoiceSettingsPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="card-elevated text-center">
          <h1 className="text-3xl" style={{ marginBottom: 'var(--space-6)' }}>
            음성 설정
          </h1>
          <p className="text-lg text-muted" style={{ marginBottom: 'var(--space-8)' }}>
            이 페이지는 아직 구현되지 않았습니다.
          </p>
          <button
            onClick={() => navigate('/')}
            className="btn btn-primary btn-lg"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettingsPage;