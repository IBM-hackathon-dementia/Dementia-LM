import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authState } from '../recoil/atoms';

const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useRecoilValue(authState);

  const handleLogout = () => {
    // 로그아웃 로직은 필요시 추가
    navigate('/login');
  };

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
                  이음이와 기억 잇기
                </h1>
                <p className="text-gray-600">
                  {auth.selectedPatient?.name}님과 함께해요.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="px-4 py-2 text-white bg-orange-400 border border-orange-400 rounded-lg hover:bg-orange-500 transition-colors"
              >
                홈으로
              </button>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
          <h2 className="text-3xl font-bold text-gray-800 mb-6">
            설정
          </h2>
          <p className="text-lg text-gray-600 mb-8">
            이 페이지는 아직 구현되지 않았습니다.
          </p>
          <button
            onClick={() => navigate('/')}
            className="px-8 py-3 bg-orange-400 text-white rounded-lg text-lg font-semibold hover:bg-orange-500 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </main>
    </div>
  );
};

export default SettingsPage;