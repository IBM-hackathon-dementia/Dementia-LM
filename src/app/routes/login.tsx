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

      if (userInfo) {
        // Create caregiver object from token info
        const caregiver: Caregiver = {
          id: userInfo.uid,
          name: '', // We'll need to get this from a separate API call or signup data
          email: userInfo.sub,
          createdAt: new Date(userInfo.iat * 1000),
        };

        // Set authenticated state
        setAuth({
          isAuthenticated: true,
          caregiver,
          selectedPatient: null,
        });
      } else {
        // Set minimal authenticated state
        setAuth({
          isAuthenticated: true,
          caregiver: null,
          selectedPatient: null,
        });
      }

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인 중 오류가 발생했습니다.');
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
                border: '1px solid #fecaca',
                borderRadius: 'var(--radius-lg)',
                color: '#dc2626'
              }}>
                {error}
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
