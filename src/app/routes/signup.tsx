import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { authState } from '../recoil/atoms';
import { Caregiver } from '../recoil/types';
import { apiClient, SignupRequest } from '../../lib/api';

const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useSetRecoilState(authState);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.name || !formData.email || !formData.password) {
      setError('모든 필수 항목을 입력해주세요.');
      return;
    }

    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.');
      return;
    }

    setIsLoading(true);

    try {
      const signupData: SignupRequest = {
        username: formData.email,
        password: formData.password,
        name: formData.name,
      };

      const response = await apiClient.signup(signupData);

      // Create caregiver object from API response
      const caregiver: Caregiver = {
        id: response.id,
        name: response.name,
        email: response.username,
        phone: formData.phone || undefined,
        createdAt: new Date(response.createdAt),
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
      console.error('Signup error:', err);

      // Parse error message for better user experience
      let errorMessage = '회원가입 중 오류가 발생했습니다.';

      if (err instanceof Error) {
        const message = err.message.toLowerCase();

        if (message.includes('409') || message.includes('conflict') ||
            message.includes('이미 존재하는 사용자입니다')) {
          errorMessage = '👤 이미 가입된 이메일입니다.\n• 다른 이메일 주소를 사용해주세요\n• 이미 가입하셨다면 로그인을 시도해주세요';
        } else if (message.includes('400') || message.includes('bad request')) {
          errorMessage = '📝 입력 정보를 확인해주세요.\n• 이메일 형식이 올바른지 확인해주세요\n• 비밀번호는 8자 이상이어야 합니다';
        } else if (message.includes('500') || message.includes('server')) {
          errorMessage = '⚠️ 서버에 일시적인 문제가 발생했습니다.\n잠시 후 다시 시도해주세요.';
        } else if (message.includes('network') || message.includes('fetch')) {
          errorMessage = '🌐 네트워크 연결을 확인해주세요.\n인터넷 연결 상태를 점검해주세요.';
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
            <h1 className="text-3xl" style={{
              marginBottom: 'var(--space-4)',
              color: 'var(--color-primary)'
            }}>
              이음이 - AI 회상 치료
            </h1>

            <p className="text-lg text-muted" style={{
              marginBottom: 'var(--space-8)'
            }}>
              보호자 정보를 입력해주세요
            </p>

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
                <label htmlFor="name" className="text-lg" style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  textAlign: 'left'
                }}>
                  이름 *
                </label>
                <input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="보호자 성함을 입력해주세요"
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
                  placeholder="비밀번호를 입력해주세요 (8자 이상)"
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
                <label htmlFor="phone" className="text-lg" style={{
                  display: 'block',
                  marginBottom: 'var(--space-2)',
                  textAlign: 'left'
                }}>
                  전화번호 (선택)
                </label>
                <input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="전화번호를 입력해주세요"
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
                className="btn btn-primary btn-xl btn-full"
                style={{ marginTop: 'var(--space-6)' }}
                disabled={isLoading}
              >
                {isLoading ? '회원가입 중...' : '회원가입'}
              </button>
            </form>

            <div style={{ marginTop: 'var(--space-6)', textAlign: 'center' }}>
              <p className="text-muted">
                이미 계정이 있으신가요?{' '}
                <Link
                  to="/login"
                  style={{
                    color: 'var(--color-primary)',
                    textDecoration: 'none',
                    fontWeight: '500'
                  }}
                >
                  로그인
                </Link>
              </p>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default SignupPage;