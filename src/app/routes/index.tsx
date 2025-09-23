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
                        <button
                            onClick={handleLogout}
                            className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                            로그아웃
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-6xl mx-auto px-6 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* 메인 대화 섹션 */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                            <div className="flex items-center justify-center mb-6">
                                <img
                                    src="/img/이음1.png"
                                    alt="이음이 대화"
                                    className="w-24 h-24 object-contain mr-4"
                                />
                                <div className="text-left">
                                    <h3 className="text-2xl font-bold text-gray-800 mb-4" style={{ color: '#fba45f' }}>
                                        함께 대화해요!
                                    </h3>
                                    <p className="text-gray-600">
                                        편안한 대화를 통해 소중한 추억을 되새겨보세요
                                    </p>
                                </div>
                            </div>
                            <button
                                className="w-full bg-orange-400 text-white py-2 px-6 rounded-xl text-lg font-semibold hover:bg-orange-500 transition-colors shadow-lg"
                                onClick={() => navigate('/conversation')}
                            >
                                🎤 대화 시작하기
                            </button>
                        </div>

                        {/* 최근 활동 */}
                        <div className="bg-white rounded-2xl shadow-lg p-6 mt-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                최근 활동
                            </h3>
                            {(() => {
                                // 로컬 스토리지에서 최근 리포트들 가져오기
                                const savedReports = JSON.parse(localStorage.getItem('generatedReports') || '[]');
                                const recentReports = savedReports.slice(-3).reverse(); // 최신 3개만

                                if (recentReports.length === 0) {
                                    return (
                                        <div className="text-center py-8">
                                            <img
                                                src="/img/이음4.png"
                                                alt="이음이 활동"
                                                className="w-16 h-16 object-contain mx-auto mb-4 opacity-60"
                                            />
                                            <p className="text-gray-500">
                                                첫 번째 회상을 시작해보세요!
                                            </p>
                                        </div>
                                    );
                                }

                                return (
                                    <div className="space-y-3">
                                        {recentReports.map((report: any) => (
                                            <div
                                                key={report.id}
                                                className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg hover:bg-green-100 transition-colors cursor-pointer"
                                                onClick={() => navigate('/reports')}
                                            >
                                                <div className="flex-shrink-0">
                                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
                                                        <span className="text-orange-600 text-lg">💬</span>
                                                    </div>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                        대화 세션 리포트
                                                    </p>
                                                    <p className="text-xs text-gray-500">
                                                        {new Date(report.generatedAt).toLocaleDateString('ko-KR', {
                                                            month: 'short',
                                                            day: 'numeric',
                                                            hour: '2-digit',
                                                            minute: '2-digit'
                                                        })}
                                                    </p>
                                                </div>
                                                <div className="flex-shrink-0">
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800">
                                                        완료
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                        <div className="text-center pt-2">
                                            <button
                                                onClick={() => navigate('/reports')}
                                                className="text-sm text-green-600 hover:text-green-800 underline"
                                            >
                                                모든 활동 보기
                                            </button>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* 사이드바 */}
                    <div className="space-y-6">
                        {/* 빠른 메뉴 */}
                        <div className="bg-white rounded-2xl shadow-lg p-6">
                            <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                빠른 메뉴
                            </h3>
                            <div className="space-y-3">
                                <button
                                    className="w-full flex items-center justify-center space-x-3 bg-green-50 text-green-700 py-4 px-4 rounded-lg hover:bg-green-100 transition-colors"
                                    onClick={() => navigate('/upload')}
                                >
                                    <span className="text-2xl">📷</span>
                                    <span className="font-medium">사진 추가</span>
                                </button>
                                <button
                                    className="w-full flex items-center justify-center space-x-3 bg-green-50 text-green-700 py-4 px-4 rounded-lg hover:bg-green-100 transition-colors"
                                    onClick={() => navigate('/reports')}
                                >
                                    <span className="text-2xl">📊</span>
                                    <span className="font-medium">활동 보기</span>
                                </button>
                                <button
                                    className="w-full flex items-center justify-center space-x-3 bg-purple-50 text-purple-700 py-4 px-4 rounded-lg hover:bg-purple-100 transition-colors"
                                    onClick={() => navigate('/dashboard')}
                                >
                                    <span className="text-2xl">🏠</span>
                                    <span className="font-medium">환자목록</span>
                                </button>
                            </div>
                        </div>

                        {/* 도움말 섹션 */}
                        <div className="bg-green-50 rounded-2xl p-6">
                            <div className="flex items-start space-x-3">
                                <div>
                                    <h4 className="font-semibold text-green-800 mb-2">
                                        이음이 팁
                                    </h4>
                                    <p className="text-sm text-green-700">
                                        대화할 때는 편안한 마음가짐으로 천천히 말씀해 주세요.<br />
                                        언제든지 중간에 멈추시거나 다시 시작할 수 있어요.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default HomePage;
