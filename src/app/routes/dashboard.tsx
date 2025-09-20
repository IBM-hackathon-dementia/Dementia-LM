import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil';
import { authState, patientsState } from '../recoil/atoms';
import { Patient } from '../recoil/types';

const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useRecoilValue(authState);
  const [patients, setPatients] = useRecoilState(patientsState);
  const setAuth = useSetRecoilState(authState);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: '',
    age: '',
    gender: 'female',
    dementiaStage: 'mild',
    hasTrauma: false,
    traumaDetails: '',
    relationshipToCaregiver: '',
  });


  const handleAddPatient = (e: React.FormEvent) => {
    e.preventDefault();

    if (newPatient.name && newPatient.age && newPatient.relationshipToCaregiver && auth.caregiver) {
      const patient: Patient = {
        id: 'patient_' + Date.now(),
        name: newPatient.name,
        caregiverId: auth.caregiver.id,
        age: newPatient.age ? parseInt(newPatient.age) : 18,
        gender: newPatient.gender as 'male' | 'female',
        dementiaStage: newPatient.dementiaStage as 'mild' | 'moderate' | 'severe',
        hasTrauma: newPatient.hasTrauma,
        traumaDetails: newPatient.traumaDetails || undefined,
        relationshipToCaregiver: newPatient.relationshipToCaregiver,
        preferences: {
          topics: [],
          voiceSettings: {
            speed: 1,
            pitch: 1,
            volume: 0.8,
          },
        },
        createdAt: new Date(),
      };

      setPatients([...patients, patient]);
      setNewPatient({
        name: '',
        age: '',
        gender: 'female',
        dementiaStage: 'mild',
        hasTrauma: false,
        traumaDetails: '',
        relationshipToCaregiver: '',
      });
      setShowAddPatient(false);
    }
  };

  const handleSelectPatient = (patient: Patient) => {
    setAuth((prev) => ({
      ...prev,
      selectedPatient: patient,
    }));
    navigate('/');
  };

  const handleEditPatient = (patient: Patient) => {
    console.log('Edit patient:', patient);
    // TODO: Implement edit functionality
  };

  const handleLogout = () => {
    setAuth({
      isAuthenticated: false,
      caregiver: null,
      selectedPatient: null,
    });
    navigate('/login');
  };

  if (!auth.isAuthenticated || !auth.caregiver) {
    navigate('/login');
    return null;
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <header
          className="flex-between flex-wrap"
          style={{
            marginBottom: 'clamp(var(--space-6), 3vw, var(--space-10))',
            gap: 'var(--space-4)'
          }}
        >
          <div>
            <h1 className="text-3xl" style={{ marginBottom: 'var(--space-2)' }}>
              안녕하세요, {auth.caregiver.name}님
            </h1>
            <p className="text-xl text-muted">
              관리할 환자를 선택하거나 새 환자를 추가해주세요
            </p>
          </div>
          <button onClick={handleLogout} className="btn btn-secondary btn-lg">
            로그아웃
          </button>
        </header>

        <main className="stack-lg">
          {patients.length === 0 ? (
            <section className="card-elevated text-center" style={{
              padding: 'clamp(var(--space-6), 4vw, var(--space-10))'
            }}>
              <h2
                className="text-2xl"
                style={{ marginBottom: 'var(--space-6)' }}
              >
                첫 번째 환자를 등록해주세요
              </h2>
              <p
                className="text-lg text-muted"
                style={{ marginBottom: 'var(--space-8)' }}
              >
                환자 정보를 입력하여 맞춤형 치료를 시작해보세요.
                <br />
                개인화된 치료 경험을 제공해드립니다.
              </p>
              <button
                className="btn btn-primary btn-xl"
                onClick={() => setShowAddPatient(true)}
              >
                환자 추가하기
              </button>
            </section>
          ) : (
            <>
              <section className="card-elevated" style={{
                padding: 'clamp(var(--space-6), 3vw, var(--space-8))'
              }}>
                <div
                  className="flex-between flex-wrap"
                  style={{ marginBottom: 'var(--space-8)' }}
                >
                  <h2 className="text-2xl">
                    등록된 환자 ({patients.length}명)
                  </h2>
                  <button
                    className="btn btn-secondary btn-lg"
                    onClick={() => setShowAddPatient(true)}
                  >
                    + 환자 추가
                  </button>
                </div>

                <div
                  className="grid grid-auto"
                  style={{ gap: 'var(--space-6)' }}
                >
                  {patients.map((patient) => (
                    <div
                      key={patient.id}
                      className="card"
                      style={{
                        cursor: 'pointer',
                        border: '3px solid transparent',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                      }}
                      onClick={() => handleSelectPatient(patient)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor =
                          'var(--color-primary)';
                        e.currentTarget.style.transform = 'translateY(-4px)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = 'transparent';
                        e.currentTarget.style.transform = 'translateY(0)';
                      }}
                    >
                      <div className="text-center">
                        <h3
                          className="text-xl"
                          style={{
                            marginBottom: 'var(--space-4)',
                            color: 'var(--color-text-primary)',
                          }}
                        >
                          {patient.name}
                        </h3>
                        {patient.age && (
                          <p
                            className="text-lg text-muted"
                            style={{ marginBottom: 'var(--space-6)' }}
                          >
                            {patient.age}세
                          </p>
                        )}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                          <div className="btn btn-primary btn-lg btn-full">
                            이음이와 대화하기
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                              className="btn btn-secondary btn-sm"
                              style={{ flex: 1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEditPatient(patient);
                              }}
                            >
                              수정
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              style={{ flex: 1 }}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm('정말로 이 환자를 삭제하시겠습니까?')) {
                                  setPatients(patients.filter(p => p.id !== patient.id));
                                }
                              }}
                            >
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Add Patient Modal - Simple version for now */}
          {showAddPatient && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(0,0,0,0.6)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: 'var(--space-4)',
                zIndex: 1000,
              }}
              onClick={(e) => {
                if (e.target === e.currentTarget) {
                  setShowAddPatient(false);
                }
              }}
            >
              <form
                onSubmit={handleAddPatient}
                className="card-elevated"
                style={{
                  width: '100%',
                  maxWidth: 'min(550px, 95vw)',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  padding: 'clamp(var(--space-4), 3vw, var(--space-6))',
                  borderRadius: '16px',
                  boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                  position: 'relative',
                }}
              >
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 'clamp(var(--space-4), 2vw, var(--space-6))',
                  flexWrap: 'wrap',
                  gap: 'var(--space-2)'
                }}>
                  <h3 className="text-2xl" style={{
                    margin: 0,
                    color: 'var(--color-primary)',
                    fontWeight: '600',
                  }}>
                    새 환자 등록
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowAddPatient(false)}
                    style={{
                      background: 'none',
                      border: 'none',
                      fontSize: '24px',
                      cursor: 'pointer',
                      color: 'var(--color-text-muted)',
                      padding: '4px',
                      borderRadius: '4px',
                      transition: 'all 0.2s ease',
                    }}
                  >
                    ✕
                  </button>
                </div>

                <div className="stack" style={{ gap: 'clamp(var(--space-4), 2vw, var(--space-6))' }}>
                  <div>
                    <label
                      htmlFor="patientName"
                      className="text-lg"
                      style={{
                        display: 'block',
                        marginBottom: 'var(--space-2)',
                        fontWeight: '500',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      환자 이름 *
                    </label>
                    <input
                      id="patientName"
                      type="text"
                      value={newPatient.name}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, name: e.target.value })
                      }
                      required
                      placeholder="환자의 성함을 입력해주세요"
                      style={{
                        width: '100%',
                        padding: 'var(--space-4)',
                        fontSize: 'var(--font-size-lg)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="patientAge"
                      className="text-lg"
                      style={{
                        display: 'block',
                        marginBottom: 'var(--space-2)',
                        fontWeight: '500',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      나이 *
                    </label>
                    <input
                      id="patientAge"
                      type="number"
                      value={newPatient.age}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, age: e.target.value })
                      }
                      placeholder="나이를 입력해주세요"
                      min="1"
                      max="120"
                      required
                      style={{
                        width: '100%',
                        padding: 'var(--space-4)',
                        fontSize: 'var(--font-size-lg)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div>
                    <label
                      htmlFor="relationshipToCaregiver"
                      className="text-lg"
                      style={{
                        display: 'block',
                        marginBottom: 'var(--space-2)',
                        fontWeight: '500',
                        color: 'var(--color-text-primary)'
                      }}
                    >
                      보호자와의 관계 *
                    </label>
                    <input
                      id="relationshipToCaregiver"
                      type="text"
                      value={newPatient.relationshipToCaregiver}
                      onChange={(e) =>
                        setNewPatient({ ...newPatient, relationshipToCaregiver: e.target.value })
                      }
                      placeholder="예: 아들, 딸, 배우자, 며느리 등"
                      required
                      style={{
                        width: '100%',
                        padding: 'var(--space-4)',
                        fontSize: 'var(--font-size-lg)',
                        border: '2px solid var(--color-border)',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      gap: 'var(--space-4)',
                      marginTop: 'clamp(var(--space-4), 2vw, var(--space-6))',
                      flexWrap: 'wrap'
                    }}
                  >
                    <button
                      type="button"
                      onClick={() => setShowAddPatient(false)}
                      style={{
                        flex: 1,
                        padding: 'var(--space-4) var(--space-6)',
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: '500',
                        border: '2px solid var(--color-border)',
                        backgroundColor: 'var(--color-surface)',
                        color: 'var(--color-text-primary)',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{
                        flex: 1,
                        padding: 'var(--space-4) var(--space-6)',
                        fontSize: 'var(--font-size-lg)',
                        fontWeight: '600',
                        borderRadius: '8px',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(var(--color-primary-rgb), 0.2)',
                      }}
                    >
                      등록하기
                    </button>
                  </div>
                </div>

              </form>
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;