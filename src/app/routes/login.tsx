import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { authState } from '../recoil/atoms';
import { apiClient, LoginRequest } from '../../lib/api';
import { AuthTokenManager, getUserInfoFromToken } from '../../lib/auth';
import { Caregiver } from '../recoil/types';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useSetRecoilState(authState);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.email || !formData.password) {
      setError('이메일과 비밀번호를 입력해주세요.');
      return;
    }

    setIsLoading(true);

    try {
      const loginData: LoginRequest = {
        username: formData.email,
        password: formData.password,
      };

      const response = await apiClient.login(loginData);

      // Store tokens using AuthTokenManager
      AuthTokenManager.setTokens(response);

      // Get user info from JWT token
      const userInfo = getUserInfoFromToken(response.accessToken);

      // Create caregiver object - use token info if available, otherwise create default
      const caregiver: Caregiver = {
        id: userInfo?.uid || 'temp-user-id',
        name: userInfo?.sub || formData.email.split('@')[0] || '사용자',
        email: userInfo?.sub || formData.email,
        createdAt: userInfo ? new Date(userInfo.iat * 1000) : new Date(),
      };

      // Set authenticated state
      setAuth({
        isAuthenticated: true,
        caregiver,
        selectedPatient: null,
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Login error:', err);

      // Parse error message for better user experience
      let errorMessage = '로그인 중 오류가 발생했습니다.';

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        if (message.includes('401') || message.includes('unauthorized') ||
            message.includes('이메일 또는 비밀번호가 올바르지 않습니다')) {
          errorMessage = '🔐 이메일 또는 비밀번호가 올바르지 않습니다.\n입력하신 정보를 다시 확인해주세요.';
        } else if (message.includes('404') || message.includes('not found')) {
          errorMessage = '👤 존재하지 않는 사용자입니다.\n회원가입을 먼저 진행해주세요.';
        } else if (message.includes('403') || message.includes('forbidden')) {
          errorMessage = '🚫 계정이 비활성화되었습니다.\n관리자에게 문의해주세요.';
        } else if (message.includes('500') || message.includes('server')) {
          errorMessage = '⚠️ 서버에 일시적인 문제가 발생했습니다.\n잠시 후 다시 시도해주세요.';
        } else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = '🌐 네트워크 연결을 확인해주세요.\n인터넷 연결 상태를 점검해주세요.';
        } else if (err.message.includes('이메일 또는 비밀번호가 올바르지 않습니다')) {
          errorMessage = '🔐 이메일 또는 비밀번호가 올바르지 않습니다.\n• 이메일 주소를 정확히 입력했는지 확인해주세요\n• 비밀번호는 대소문자를 구분합니다\n• 비밀번호를 잊으셨다면 관리자에게 문의해주세요';
        } else {
          // Use the actual error message from backend if it's in Korean
          errorMessage = err.message.includes('한글') || /[ㄱ-ㅎ|ㅏ-ㅣ|가-힣]/.test(err.message)
            ? `❌ ${err.message}`
            : errorMessage;
        }
      }

      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <main style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '80vh'
        }}>
          <div className="card-elevated" style={{
            width: '100%',
            maxWidth: '500px',
            textAlign: 'center'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 'var(--space-6)'
            }}>
              <img
                src="/img/이음3.png"
                alt="이음이 캐릭터"
                style={{
                  width: '100px',
                  height: '100px',
                  objectFit: 'contain',
                  marginRight: 'var(--space-4)'
                }}
              />
              <div style={{ textAlign: 'left' }}>
                <h2 className="text-3xl" style={{
                  marginBottom: 'var(--space-2)',
                  color: 'var(--color-primary)'
                }}>
                  이음
                </h2>
                <h2 className="text-xl" style={{
                  margin: 0,
                  color: '#464646ff'
                }}>
                  기억을 잇는 AI
                </h2>
              </div>
            </div>


            {error && (
              <div style={{
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-4)',
                backgroundColor: '#fee2e2',
                border: '2px solid #f87171',
                borderRadius: 'var(--radius-lg)',
                color: '#dc2626',
                textAlign: 'left',
                fontSize: '15px',
                lineHeight: '1.5',
                boxShadow: '0 2px 8px rgba(220, 38, 38, 0.1)'
              }}>
                {error.split('\n').map((line, index) => (
                  <div key={index} style={{ marginBottom: index < error.split('\n').length - 1 ? '8px' : '0' }}>
                    {line}
                  </div>
                ))}
              </div>
            )}

            <form onSubmit={handleSubmit} className="stack-md">
              <div>
                <label htmlFor="email" className="text-lg" style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  textAlign: 'left'
                }}>
                  이메일 *
                </label>
                <input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  placeholder="이메일을 입력해주세요"
                  style={{
                    width: '100%',
                    padding: 'var(--space-4)',
                    fontSize: 'var(--text-lg)',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <div>
                <label htmlFor="password" className="text-lg" style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  textAlign: 'left'
                }}>
                  비밀번호 *
                </label>
                <input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                  placeholder="비밀번호를 입력해주세요"
                  style={{
                    width: '100%',
                    padding: 'var(--space-4)',
                    fontSize: 'var(--text-lg)',
                    border: '2px solid var(--color-border)',
                    borderRadius: 'var(--radius-lg)',
                    boxSizing: 'border-box'
                  }}
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary btn-lg btn-full"
                style={{ marginTop: 'var(--space-10)' }}
                disabled={isLoading}
              >
                {isLoading ? '로그인 중...' : '로그인'}
              </button>
            </form>

            <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
              <p className="text-muted">
                계정이 없으신가요?{' '}
                <Link
                  to="/signup"
                  style={{
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  회원가입
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;
