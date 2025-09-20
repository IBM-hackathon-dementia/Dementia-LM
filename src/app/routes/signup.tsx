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
      setError(err instanceof Error ? err.message : '회원가입 중 오류가 발생했습니다.');
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
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-lg)',
                color: '#dc2626'
              }}>
                {error}
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