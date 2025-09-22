import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil';
import { authState, patientsState } from '../recoil/atoms';
import { Patient } from '../recoil/types';
import { apiClient, PatientCreateRequest, PatientUpdateRequest } from '../../lib/api';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const auth = useRecoilValue(authState);
    const [patients, setPatients] = useRecoilState(patientsState);
    const setAuth = useSetRecoilState(authState);
    const [showAddPatient, setShowAddPatient] = useState(false);
    const [newPatient, setNewPatient] = useState({
        name: '',
        age: '',
        gender: 'FEMALE' as 'MALE' | 'FEMALE',
        dementiaLevel: '경증',
        triggerElements: '',
        relationship: '',
        memo: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showEditPatient, setShowEditPatient] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [editPatientData, setEditPatientData] = useState({
        name: '',
        age: '',
        gender: 'FEMALE' as 'MALE' | 'FEMALE',
        dementiaLevel: '경증',
        triggerElements: '',
        relationship: '',
        memo: '',
    });

    const handleAddPatient = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            if (
                newPatient.name &&
                newPatient.age &&
                newPatient.relationship &&
                auth.caregiver
            ) {
                const patientData: PatientCreateRequest = {
                    name: newPatient.name,
                    age: parseInt(newPatient.age),
                    gender: newPatient.gender,
                    dementiaLevel: newPatient.dementiaLevel,
                    triggerElements: newPatient.triggerElements,
                    relationship: newPatient.relationship,
                    memo: newPatient.memo,
                };

                const response = await apiClient.createPatient(auth.caregiver.id, patientData);

                // Create patient object for local state
                const patient: Patient = {
                    id: response.id,
                    name: response.name,
                    caregiverId: auth.caregiver.id,
                    age: response.age,
                    gender: response.gender === 'MALE' ? 'male' : 'female',
                    dementiaStage:
                        response.dementiaLevel === '경증'
                            ? 'mild'
                            : response.dementiaLevel === '중등증'
                              ? 'moderate'
                              : 'severe',
                    hasTrauma: false,
                    relationshipToCaregiver: response.relationship,
                    preferences: {
                        topics: response.triggerElements
                            .split(',')
                            .map((t) => t.trim())
                            .filter((t) => t),
                        voiceSettings: {
                            speed: 1,
                            pitch: 1,
                            volume: 0.8,
                        },
                    },
                    createdAt: new Date(response.createdAt),
                };

                setPatients([...patients, patient]);
                setNewPatient({
                    name: '',
                    age: '',
                    gender: 'FEMALE',
                    dementiaLevel: '경증',
                    triggerElements: '',
                    relationship: '',
                    memo: '',
                });
                setShowAddPatient(false);
            }
        } catch (error) {
            console.error('환자 생성 실패:', error);
            alert('환자 등록 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
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
        setEditingPatient(patient);
        setEditPatientData({
            name: patient.name,
            age: patient.age.toString(),
            gender: patient.gender === 'male' ? 'MALE' : 'FEMALE',
            dementiaLevel: patient.dementiaStage === 'mild' ? '경증' : patient.dementiaStage === 'moderate' ? '중등도' : '중증',
            triggerElements: patient.preferences?.topics?.join(', ') || '',
            relationship: patient.relationshipToCaregiver,
            memo: '',
        });
        setShowEditPatient(true);
    };

    const handleUpdatePatient = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingPatient || !auth.caregiver) return;

        setIsSubmitting(true);

        try {
            if (
                editPatientData.name &&
                editPatientData.age &&
                editPatientData.relationship
            ) {
                const updateData: PatientUpdateRequest = {
                    name: editPatientData.name,
                    age: parseInt(editPatientData.age),
                    gender: editPatientData.gender,
                    dementiaLevel: editPatientData.dementiaLevel,
                    triggerElements: editPatientData.triggerElements,
                    relationship: editPatientData.relationship,
                    memo: editPatientData.memo,
                };

                const response = await apiClient.updatePatient(
                    auth.caregiver.id,
                    editingPatient.id,
                    updateData
                );

                // Update patient in local state
                const updatedPatient: Patient = {
                    ...editingPatient,
                    name: response.name,
                    age: response.age,
                    gender: response.gender === 'MALE' ? 'male' : 'female',
                    dementiaStage:
                        response.dementiaLevel === '경증'
                            ? 'mild'
                            : response.dementiaLevel === '중등도'
                              ? 'moderate'
                              : 'severe',
                    relationshipToCaregiver: response.relationship,
                    preferences: {
                        ...editingPatient.preferences,
                        topics: response.triggerElements
                            .split(',')
                            .map((t) => t.trim())
                            .filter((t) => t),
                        voiceSettings: editingPatient.preferences?.voiceSettings || {
                            speed: 0.8,
                            pitch: 1,
                            volume: 0.8
                        }
                    },
                };

                setPatients(
                    patients.map((p) =>
                        p.id === editingPatient.id ? updatedPatient : p
                    )
                );
                setShowEditPatient(false);
                setEditingPatient(null);
            }
        } catch (error) {
            console.error('환자 수정 실패:', error);
            alert('환자 정보 수정 중 오류가 발생했습니다.');
        } finally {
            setIsSubmitting(false);
        }
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
                                    이음이 대시보드
                                </h1>
                                <p className="text-gray-600">
                                    안녕하세요, {auth.caregiver.name}님
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
            <main className="max-w-7xl mx-auto px-6 py-8">

                {patients.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="bg-white rounded-2xl shadow-lg p-12 max-w-2xl mx-auto">
                            <img
                                src="/img/이음4.png"
                                alt="이음이 환영"
                                className="w-24 h-24 object-contain mx-auto mb-6"
                            />
                            <h2 className="text-3xl font-bold text-gray-800 mb-4">
                                첫 번째 환자를 등록해주세요
                            </h2>
                            <p className="text-lg text-gray-600 mb-8">
                                환자 정보를 입력하여 맞춤형 치료를 시작해보세요.<br />
                                개인화된 치료 경험을 제공해드립니다.
                            </p>
                            <button
                                className="bg-orange-400 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:bg-orange-500 transition-colors shadow-lg"
                                onClick={() => setShowAddPatient(true)}
                            >
                                환자 추가하기
                            </button>
                        </div>
                    </div>
                ) : (
                    <div>
                        <div className="bg-white rounded-2xl shadow-lg p-8 mb-8">
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center space-x-3">
                                    <img
                                        src="/img/이음3.png"
                                        alt="이음이 환자관리"
                                        className="w-12 h-12 object-contain"
                                    />
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-800">
                                            등록된 환자 ({patients.length}명)
                                        </h2>
                                        <p className="text-gray-600">환자를 선택하여 대화를 시작하세요</p>
                                    </div>
                                </div>
                                <button
                                    className="bg-orange-400 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-500 transition-colors"
                                    onClick={() => setShowAddPatient(true)}
                                >
                                    + 환자 추가
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {patients.map((patient) => (
                                    <div
                                        key={patient.id}
                                        className="bg-gray-50 rounded-xl p-6 border-2 border-transparent hover:border-green-300 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                                        onClick={() => handleSelectPatient(patient)}
                                    >
                                        <div className="text-center">
                                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <span className="text-2xl">👤</span>
                                            </div>
                                            <h3 className="text-xl font-bold text-gray-800 mb-2">
                                                {patient.name}
                                            </h3>
                                            {patient.age && (
                                                <p className="text-gray-600 mb-4">
                                                    {patient.age}세
                                                </p>
                                            )}
                                            <div className="space-y-3">
                                                <div className="bg-orange-400 text-white py-3 px-4 rounded-lg font-semibold">
                                                    이음이와 대화하기
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        className="flex-1 py-2 px-3 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleEditPatient(patient);
                                                        }}
                                                    >
                                                        수정
                                                    </button>
                                                    <button
                                                        className="flex-1 py-2 px-3 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                            onClick={async (e) => {
                                                                e.stopPropagation();
                                                                if (
                                                                    confirm(
                                                                        '정말로 이 환자를 삭제하시겠습니까?'
                                                                    )
                                                                ) {
                                                                    console.log('🗑️ 환자 삭제 시작:', {
                                                                        patientId: patient.id,
                                                                        patientName: patient.name,
                                                                        caregiverId: auth.caregiver?.id
                                                                    });

                                                                    try {
                                                                        if (auth.caregiver) {
                                                                            const response = await apiClient.deletePatient(
                                                                                auth.caregiver.id,
                                                                                patient.id
                                                                            );
                                                                            console.log('✅ 환자 삭제 API 성공:', response);

                                                                            // 로컬 상태에서도 제거
                                                                            setPatients(
                                                                                patients.filter(
                                                                                    (p) => p.id !== patient.id
                                                                                )
                                                                            );
                                                                            console.log('✅ 로컬 상태에서 환자 제거 완료');
                                                                        }
                                                                    } catch (error) {
                                                                        console.error('❌ 환자 삭제 실패:', error);
                                                                        alert('환자 삭제 중 오류가 발생했습니다.');
                                                                    }
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
                            </div>
                        </div>
                    )}

                    {/* Edit Patient Modal */}
                    {showEditPatient && editingPatient && (
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
                                    setShowEditPatient(false);
                                    setEditingPatient(null);
                                }
                            }}
                        >
                            <form
                                onSubmit={handleUpdatePatient}
                                className="card-elevated"
                                style={{
                                    width: '100%',
                                    maxWidth: 'min(550px, 95vw)',
                                    maxHeight: '85vh',
                                    overflowY: 'auto',
                                    padding:
                                        'clamp(var(--space-4), 3vw, var(--space-6))',
                                    borderRadius: '16px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom:
                                            'clamp(var(--space-4), 2vw, var(--space-6))',
                                        flexWrap: 'wrap',
                                        gap: 'var(--space-2)',
                                    }}
                                >
                                    <h3
                                        className="text-2xl"
                                        style={{
                                            margin: 0,
                                            color: 'var(--color-primary)',
                                            fontWeight: '600',
                                        }}
                                    >
                                        환자 정보 수정
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setShowEditPatient(false);
                                            setEditingPatient(null);
                                        }}
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

                                <div
                                    className="stack"
                                    style={{
                                        gap: 'clamp(var(--space-4), 2vw, var(--space-6))',
                                    }}
                                >
                                    <div>
                                        <label
                                            htmlFor="editPatientName"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            환자 이름 *
                                        </label>
                                        <input
                                            id="editPatientName"
                                            type="text"
                                            value={editPatientData.name}
                                            onChange={(e) =>
                                                setEditPatientData({
                                                    ...editPatientData,
                                                    name: e.target.value,
                                                })
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
                                            htmlFor="editPatientAge"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            나이 *
                                        </label>
                                        <input
                                            id="editPatientAge"
                                            type="number"
                                            value={editPatientData.age}
                                            onChange={(e) =>
                                                setEditPatientData({
                                                    ...editPatientData,
                                                    age: e.target.value,
                                                })
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
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-3)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            성별 *
                                        </label>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 'var(--space-6)',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <label
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-2)',
                                                    cursor: 'pointer',
                                                    fontSize:
                                                        'var(--font-size-lg)',
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="editGender"
                                                    value="FEMALE"
                                                    checked={
                                                        editPatientData.gender ===
                                                        'FEMALE'
                                                    }
                                                    onChange={(e) =>
                                                        setEditPatientData({
                                                            ...editPatientData,
                                                            gender: e.target
                                                                .value as
                                                                | 'MALE'
                                                                | 'FEMALE',
                                                        })
                                                    }
                                                    required
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                                남자
                                            </label>
                                            <label
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-2)',
                                                    cursor: 'pointer',
                                                    fontSize:
                                                        'var(--font-size-lg)',
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="editGender"
                                                    value="MALE"
                                                    checked={
                                                        editPatientData.gender ===
                                                        'MALE'
                                                    }
                                                    onChange={(e) =>
                                                        setEditPatientData({
                                                            ...editPatientData,
                                                            gender: e.target
                                                                .value as
                                                                | 'MALE'
                                                                | 'FEMALE',
                                                        })
                                                    }
                                                    required
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                                여자
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="editDementiaLevel"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            치매 정도 *
                                        </label>
                                        <select
                                            id="editDementiaLevel"
                                            value={editPatientData.dementiaLevel}
                                            onChange={(e) =>
                                                setEditPatientData({
                                                    ...editPatientData,
                                                    dementiaLevel:
                                                        e.target.value,
                                                })
                                            }
                                            required
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-4)',
                                                fontSize: 'var(--font-size-lg)',
                                                border: '2px solid var(--color-border)',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                boxSizing: 'border-box',
                                                backgroundColor:
                                                    'var(--color-surface)',
                                            }}
                                        >
                                            <option value="경도인지장애">
                                                경도인지장애
                                            </option>
                                            <option value="경도">경도</option>
                                            <option value="중등도">
                                                중등도(중기)
                                            </option>
                                            <option value="중증">중증</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="editTriggerElements"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            트라우마 요소 *
                                        </label>
                                        <input
                                            id="editTriggerElements"
                                            type="text"
                                            value={editPatientData.triggerElements}
                                            onChange={(e) =>
                                                setEditPatientData({
                                                    ...editPatientData,
                                                    triggerElements:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="예: 옛날 사진, 손주 이름, 좋아하던 음악"
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
                                        <p
                                            style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--color-text-muted)',
                                                marginTop: 'var(--space-1)',
                                            }}
                                        >
                                            쉼표로 구분하여 여러 요소를
                                            입력하세요
                                        </p>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="editRelationship"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            환자와의 관계 *
                                        </label>
                                        <select
                                            id="editRelationship"
                                            value={editPatientData.relationship}
                                            onChange={(e) =>
                                                setEditPatientData({
                                                    ...editPatientData,
                                                    relationship:
                                                        e.target.value,
                                                })
                                            }
                                            required
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-4)',
                                                fontSize: 'var(--font-size-lg)',
                                                border: '2px solid var(--color-border)',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                boxSizing: 'border-box',
                                                backgroundColor:
                                                    'var(--color-surface)',
                                            }}
                                        >
                                            <option value="">
                                                관계를 선택해주세요
                                            </option>
                                            <option value="어머니">
                                                어머니
                                            </option>
                                            <option value="아버지">
                                                아버지
                                            </option>
                                            <option value="배우자">
                                                배우자
                                            </option>
                                            <option value="아들">아들</option>
                                            <option value="딸">딸</option>
                                            <option value="손자">손자</option>
                                            <option value="손녀">손녀</option>
                                            <option value="기타">기타</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="editMemo"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            메모 (선택)
                                        </label>
                                        <textarea
                                            id="editMemo"
                                            value={editPatientData.memo}
                                            onChange={(e) =>
                                                setEditPatientData({
                                                    ...editPatientData,
                                                    memo: e.target.value,
                                                })
                                            }
                                            placeholder="환자에 대한 추가 정보나 특이사항을 입력해주세요"
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-4)',
                                                fontSize: 'var(--font-size-lg)',
                                                border: '2px solid var(--color-border)',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                boxSizing: 'border-box',
                                                resize: 'vertical',
                                                fontFamily: 'inherit',
                                            }}
                                        />
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 'var(--space-4)',
                                            marginTop:
                                                'clamp(var(--space-4), 2vw, var(--space-6))',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowEditPatient(false);
                                                setEditingPatient(null);
                                            }}
                                            style={{
                                                flex: 1,
                                                padding:
                                                    'var(--space-4) var(--space-6)',
                                                fontSize: 'var(--font-size-lg)',
                                                fontWeight: '500',
                                                border: '2px solid var(--color-border)',
                                                backgroundColor:
                                                    'var(--color-surface)',
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
                                            disabled={isSubmitting}
                                            style={{
                                                flex: 1,
                                                padding:
                                                    'var(--space-4) var(--space-6)',
                                                fontSize: 'var(--font-size-lg)',
                                                fontWeight: '600',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                boxShadow:
                                                    '0 4px 12px rgba(var(--color-primary-rgb), 0.2)',
                                                opacity: isSubmitting ? 0.6 : 1,
                                            }}
                                        >
                                            {isSubmitting
                                                ? '수정 중...'
                                                : '수정하기'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
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
                                    padding:
                                        'clamp(var(--space-4), 3vw, var(--space-6))',
                                    borderRadius: '16px',
                                    boxShadow: '0 20px 40px rgba(0,0,0,0.15)',
                                    position: 'relative',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        marginBottom:
                                            'clamp(var(--space-4), 2vw, var(--space-6))',
                                        flexWrap: 'wrap',
                                        gap: 'var(--space-2)',
                                    }}
                                >
                                    <h3
                                        className="text-2xl"
                                        style={{
                                            margin: 0,
                                            color: 'var(--color-primary)',
                                            fontWeight: '600',
                                        }}
                                    >
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

                                <div
                                    className="stack"
                                    style={{
                                        gap: 'clamp(var(--space-4), 2vw, var(--space-6))',
                                    }}
                                >
                                    <div>
                                        <label
                                            htmlFor="patientName"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            환자 이름 *
                                        </label>
                                        <input
                                            id="patientName"
                                            type="text"
                                            value={newPatient.name}
                                            onChange={(e) =>
                                                setNewPatient({
                                                    ...newPatient,
                                                    name: e.target.value,
                                                })
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
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            나이 *
                                        </label>
                                        <input
                                            id="patientAge"
                                            type="number"
                                            value={newPatient.age}
                                            onChange={(e) =>
                                                setNewPatient({
                                                    ...newPatient,
                                                    age: e.target.value,
                                                })
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
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-3)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            성별 *
                                        </label>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: 'var(--space-6)',
                                                alignItems: 'center',
                                            }}
                                        >
                                            <label
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-2)',
                                                    cursor: 'pointer',
                                                    fontSize:
                                                        'var(--font-size-lg)',
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="gender"
                                                    value="FEMALE"
                                                    checked={
                                                        newPatient.gender ===
                                                        'FEMALE'
                                                    }
                                                    onChange={(e) =>
                                                        setNewPatient({
                                                            ...newPatient,
                                                            gender: e.target
                                                                .value as
                                                                | 'MALE'
                                                                | 'FEMALE',
                                                        })
                                                    }
                                                    required
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                                남자
                                            </label>
                                            <label
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 'var(--space-2)',
                                                    cursor: 'pointer',
                                                    fontSize:
                                                        'var(--font-size-lg)',
                                                }}
                                            >
                                                <input
                                                    type="radio"
                                                    name="gender"
                                                    value="MALE"
                                                    checked={
                                                        newPatient.gender ===
                                                        'MALE'
                                                    }
                                                    onChange={(e) =>
                                                        setNewPatient({
                                                            ...newPatient,
                                                            gender: e.target
                                                                .value as
                                                                | 'MALE'
                                                                | 'FEMALE',
                                                        })
                                                    }
                                                    required
                                                    style={{
                                                        width: '18px',
                                                        height: '18px',
                                                        cursor: 'pointer',
                                                    }}
                                                />
                                                여자
                                            </label>
                                        </div>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="dementiaLevel"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            치매 정도 *
                                        </label>
                                        <select
                                            id="dementiaLevel"
                                            value={newPatient.dementiaLevel}
                                            onChange={(e) =>
                                                setNewPatient({
                                                    ...newPatient,
                                                    dementiaLevel:
                                                        e.target.value,
                                                })
                                            }
                                            required
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-4)',
                                                fontSize: 'var(--font-size-lg)',
                                                border: '2px solid var(--color-border)',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                boxSizing: 'border-box',
                                                backgroundColor:
                                                    'var(--color-surface)',
                                            }}
                                        >
                                            <option value="경도인지장애">
                                                경도인지장애
                                            </option>
                                            <option value="경도">경도</option>
                                            <option value="중등도">
                                                중등도(중기)
                                            </option>
                                            <option value="중증">중증</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="triggerElements"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            트라우마 요소 *
                                        </label>
                                        <input
                                            id="triggerElements"
                                            type="text"
                                            value={newPatient.triggerElements}
                                            onChange={(e) =>
                                                setNewPatient({
                                                    ...newPatient,
                                                    triggerElements:
                                                        e.target.value,
                                                })
                                            }
                                            placeholder="예: 옛날 사진, 손주 이름, 좋아하던 음악"
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
                                        <p
                                            style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--color-text-muted)',
                                                marginTop: 'var(--space-1)',
                                            }}
                                        >
                                            쉼표로 구분하여 여러 요소를
                                            입력하세요
                                        </p>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="relationship"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            환자와의 관계 *
                                        </label>
                                        <select
                                            id="relationship"
                                            value={newPatient.relationship}
                                            onChange={(e) =>
                                                setNewPatient({
                                                    ...newPatient,
                                                    relationship:
                                                        e.target.value,
                                                })
                                            }
                                            required
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-4)',
                                                fontSize: 'var(--font-size-lg)',
                                                border: '2px solid var(--color-border)',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                boxSizing: 'border-box',
                                                backgroundColor:
                                                    'var(--color-surface)',
                                            }}
                                        >
                                            <option value="">
                                                관계를 선택해주세요
                                            </option>
                                            <option value="어머니">
                                                어머니
                                            </option>
                                            <option value="아버지">
                                                아버지
                                            </option>
                                            <option value="배우자">
                                                배우자
                                            </option>
                                            <option value="아들">아들</option>
                                            <option value="딸">딸</option>
                                            <option value="손자">손자</option>
                                            <option value="손녀">손녀</option>
                                            <option value="기타">기타</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label
                                            htmlFor="memo"
                                            className="text-lg"
                                            style={{
                                                display: 'block',
                                                marginBottom: 'var(--space-2)',
                                                fontWeight: '500',
                                                color: 'var(--color-text-primary)',
                                            }}
                                        >
                                            메모 (선택)
                                        </label>
                                        <textarea
                                            id="memo"
                                            value={newPatient.memo}
                                            onChange={(e) =>
                                                setNewPatient({
                                                    ...newPatient,
                                                    memo: e.target.value,
                                                })
                                            }
                                            placeholder="환자에 대한 추가 정보나 특이사항을 입력해주세요"
                                            rows={3}
                                            style={{
                                                width: '100%',
                                                padding: 'var(--space-4)',
                                                fontSize: 'var(--font-size-lg)',
                                                border: '2px solid var(--color-border)',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                boxSizing: 'border-box',
                                                resize: 'vertical',
                                                fontFamily: 'inherit',
                                            }}
                                        />
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            gap: 'var(--space-4)',
                                            marginTop:
                                                'clamp(var(--space-4), 2vw, var(--space-6))',
                                            flexWrap: 'wrap',
                                        }}
                                    >
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowAddPatient(false)
                                            }
                                            style={{
                                                flex: 1,
                                                padding:
                                                    'var(--space-4) var(--space-6)',
                                                fontSize: 'var(--font-size-lg)',
                                                fontWeight: '500',
                                                border: '2px solid var(--color-border)',
                                                backgroundColor:
                                                    'var(--color-surface)',
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
                                            disabled={isSubmitting}
                                            style={{
                                                flex: 1,
                                                padding:
                                                    'var(--space-4) var(--space-6)',
                                                fontSize: 'var(--font-size-lg)',
                                                fontWeight: '600',
                                                borderRadius: '8px',
                                                transition: 'all 0.2s ease',
                                                boxShadow:
                                                    '0 4px 12px rgba(var(--color-primary-rgb), 0.2)',
                                                opacity: isSubmitting ? 0.6 : 1,
                                            }}
                                        >
                                            {isSubmitting
                                                ? '등록 중...'
                                                : '등록하기'}
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}
            </main>
        </div>
    );
};

export default DashboardPage;
