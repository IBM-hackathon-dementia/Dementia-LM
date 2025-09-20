import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSetRecoilState } from 'recoil';
import { authState } from '../recoil/atoms';
import { Caregiver } from '../recoil/types';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const setAuth = useSetRecoilState(authState);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.name && formData.email) {
      // Create a simple caregiver object
      const caregiver: Caregiver = {
        id: 'caregiver_' + Date.now(),
        name: formData.name,
        email: formData.email,
        phone: formData.phone || undefined,
        createdAt: new Date(),
      };

      // Set authenticated state
      setAuth({
        isAuthenticated: true,
        caregiver,
        selectedPatient: null,
      });

      // Navigate to dashboard
      navigate('/dashboard');
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
              >
                시작하기
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
};

export default LoginPage;