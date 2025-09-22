import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue, useRecoilState, useSetRecoilState } from 'recoil';
import { authState, patientsState } from '../recoil/atoms';
import { Patient } from '../recoil/types';
import { apiClient, PatientCreateRequest, PatientUpdateRequest } from '../../lib/api';

interface PatientFormData {
    name: string;
    age: string;
    gender: 'MALE' | 'FEMALE';
    dementiaLevel: string;
    triggerElements: string;
    relationship: string;
    memo: string;
}

const initialFormData: PatientFormData = {
    name: '',
    age: '',
    gender: 'FEMALE',
    dementiaLevel: '경증',
    triggerElements: '',
    relationship: '',
    memo: '',
};

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const auth = useRecoilValue(authState);
    const [patients, setPatients] = useRecoilState(patientsState);
    const setAuth = useSetRecoilState(authState);

    const [showModal, setShowModal] = useState(false);
    const [editingPatient, setEditingPatient] = useState<Patient | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState<PatientFormData>(initialFormData);

    const isEditMode = !!editingPatient;

    const resetForm = () => {
        setFormData(initialFormData);
        setEditingPatient(null);
        setShowModal(false);
    };

    const openAddModal = () => {
        resetForm();
        setShowModal(true);
    };

    const openEditModal = (patient: Patient) => {
        setEditingPatient(patient);
        setFormData({
            name: patient.name,
            age: patient.age.toString(),
            gender: patient.gender === 'male' ? 'MALE' : 'FEMALE',
            dementiaLevel: patient.dementiaStage === 'mild' ? '경증' : patient.dementiaStage === 'moderate' ? '중등도' : '중증',
            triggerElements: patient.preferences?.topics?.join(', ') || '',
            relationship: patient.relationshipToCaregiver,
            memo: '',
        });
        setShowModal(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!auth.caregiver || !formData.name || !formData.age || !formData.relationship) return;

        setIsSubmitting(true);
        try {
            const patientData = {
                name: formData.name,
                age: parseInt(formData.age),
                gender: formData.gender,
                dementiaLevel: formData.dementiaLevel,
                triggerElements: formData.triggerElements,
                relationship: formData.relationship,
                memo: formData.memo,
            };

            if (isEditMode) {
                const response = await apiClient.updatePatient(auth.caregiver.id, editingPatient.id, patientData);
                const updatedPatient: Patient = {
                    ...editingPatient,
                    name: response.name,
                    age: response.age,
                    gender: response.gender === 'MALE' ? 'male' : 'female',
                    dementiaStage: response.dementiaLevel === '경증' ? 'mild' : response.dementiaLevel === '중등도' ? 'moderate' : 'severe',
                    relationshipToCaregiver: response.relationship,
                    preferences: {
                        ...editingPatient.preferences,
                        topics: response.triggerElements.split(',').map(t => t.trim()).filter(t => t),
                        voiceSettings: editingPatient.preferences?.voiceSettings || { speed: 0.8, pitch: 1, volume: 0.8 }
                    },
                };
                setPatients(patients.map(p => p.id === editingPatient.id ? updatedPatient : p));
            } else {
                const response = await apiClient.createPatient(auth.caregiver.id, patientData);
                const newPatient: Patient = {
                    id: response.id,
                    name: response.name,
                    caregiverId: auth.caregiver.id,
                    age: response.age,
                    gender: response.gender === 'MALE' ? 'male' : 'female',
                    dementiaStage: response.dementiaLevel === '경증' ? 'mild' : response.dementiaLevel === '중등증' ? 'moderate' : 'severe',
                    hasTrauma: false,
                    relationshipToCaregiver: response.relationship,
                    preferences: {
                        topics: response.triggerElements.split(',').map(t => t.trim()).filter(t => t),
                        voiceSettings: { speed: 1, pitch: 1, volume: 0.8 },
                    },
                    createdAt: new Date(response.createdAt),
                };
                setPatients([...patients, newPatient]);
            }
            resetForm();
        } catch (error) {
            console.error('환자 처리 실패:', error);
            alert(`환자 ${isEditMode ? '수정' : '등록'} 중 오류가 발생했습니다.`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSelectPatient = (patient: Patient) => {
        setAuth(prev => ({ ...prev, selectedPatient: patient }));
        navigate('/');
    };

    const handleDeletePatient = async (patient: Patient) => {
        if (!confirm('정말로 이 환자를 삭제하시겠습니까?') || !auth.caregiver) return;

        try {
            await apiClient.deletePatient(auth.caregiver.id, patient.id);
            setPatients(patients.filter(p => p.id !== patient.id));
        } catch (error) {
            console.error('환자 삭제 실패:', error);
            alert('환자 삭제 중 오류가 발생했습니다.');
        }
    };

    const handleLogout = () => {
        setAuth({ isAuthenticated: false, caregiver: null, selectedPatient: null });
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
                            <img src="/img/이음3.png" alt="이음이 캐릭터" className="w-16 h-16 object-contain" />
                            <div>
                                <h1 className="text-2xl font-bold" style={{ color: '#406459ff' }}>이음이 대시보드</h1>
                                <p className="text-gray-600">안녕하세요! 반가워요!</p>
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
                            <img src="/img/이음4.png" alt="이음이 환영" className="w-24 h-24 object-contain mx-auto mb-6" />
                            <h2 className="text-3xl font-bold text-gray-800 mb-4">첫 번째 환자를 등록해주세요</h2>

                            <p className="text-lg text-gray-600 mb-8">
                                <br /> 환자 정보를 입력하여 맞춤형 치료를 시작해보세요.<br />개인화된 치료 경험을 제공해드립니다. <br />
                            </p>
                            <button
                                className="bg-orange-400 text-white py-4 px-8 rounded-xl text-lg font-semibold hover:bg-orange-500 transition-colors shadow-lg"
                                onClick={openAddModal}
                            >
                                환자 추가하기
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center space-x-3">
                                <img src="/img/이음3.png" alt="이음이 환자관리" className="w-12 h-12 object-contain" />
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-800">등록된 환자 ({patients.length}명)</h2>
                                    <p className="text-gray-600">환자를 선택하여 대화를 시작하세요</p>
                                </div>
                            </div>
                            <button
                                className="bg-orange-400 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-500 transition-colors"
                                onClick={openAddModal}
                            >
                                + 환자 추가
                            </button>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {patients.map(patient => (
                                <div
                                    key={patient.id}
                                    className="bg-gray-50 rounded-xl p-6 border-2 border-transparent hover:border-green-300 hover:shadow-lg transition-all duration-300 cursor-pointer transform hover:-translate-y-1"
                                    onClick={() => handleSelectPatient(patient)}
                                >
                                    <div className="text-center">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <span className="text-2xl">👤</span>
                                        </div>
                                        <h3 className="text-xl font-bold text-gray-800 mb-2">{patient.name}</h3>
                                        <p className="text-gray-600 mb-4">{patient.age}세</p>

                                        <div className="space-y-3">
                                            <div className="bg-orange-400 text-white py-3 px-4 rounded-lg font-semibold">
                                                이음이와 대화하기
                                            </div>
                                            <div className="flex space-x-2">
                                                <button
                                                    className="flex-1 py-2 px-3 text-sm bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                                                    onClick={e => { e.stopPropagation(); openEditModal(patient); }}
                                                >
                                                    수정
                                                </button>
                                                <button
                                                    className="flex-1 py-2 px-3 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                                                    onClick={e => { e.stopPropagation(); handleDeletePatient(patient); }}
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
                )}

                {/* Patient Modal */}
                {showModal && (
                    <div
                        className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
                        onClick={e => { if (e.target === e.currentTarget) resetForm(); }}
                    >
                        <form
                            onSubmit={handleSubmit}
                            className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[85vh] overflow-y-auto shadow-2xl"
                        >
                            <div className="flex items-center justify-between mb-6">
                                <h3 className="text-2xl font-bold" style={{ color: '#406459ff' }}>
                                    {isEditMode ? '환자 정보 수정' : '새 환자 등록'}
                                </h3>
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="text-2xl text-gray-500 hover:text-gray-700 p-1 rounded transition-colors"
                                >
                                    ✕
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">환자 이름 *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        required
                                        placeholder="환자의 성함을 입력해주세요"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">나이 *</label>
                                    <input
                                        type="number"
                                        value={formData.age}
                                        onChange={e => setFormData(prev => ({ ...prev, age: e.target.value }))}
                                        required
                                        placeholder="나이를 입력해주세요"
                                        min="1"
                                        max="120"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">성별 *</label>
                                    <div className="flex gap-4">
                                        {[{ value: 'MALE', label: '남자' }, { value: 'FEMALE', label: '여자' }].map(option => (
                                            <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="gender"
                                                    value={option.value}
                                                    checked={formData.gender === option.value}
                                                    onChange={e => setFormData(prev => ({ ...prev, gender: e.target.value as 'MALE' | 'FEMALE' }))}
                                                    required
                                                    className="w-4 h-4"
                                                />
                                                {option.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">치매 정도 *</label>
                                    <select
                                        value={formData.dementiaLevel}
                                        onChange={e => setFormData(prev => ({ ...prev, dementiaLevel: e.target.value }))}
                                        required
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    >
                                        <option value="경도인지장애">경도인지장애</option>
                                        <option value="경도">경도</option>
                                        <option value="중등도">중등도(중기)</option>
                                        <option value="중증">중증</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">트라우마 요소 *</label>
                                    <input
                                        type="text"
                                        value={formData.triggerElements}
                                        onChange={e => setFormData(prev => ({ ...prev, triggerElements: e.target.value }))}
                                        required
                                        placeholder="예: 손주 사망, 음악, 자동차 사고"
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    />
                                    <p className="text-xs text-gray-500 mt-1">이음이가 해당 주제를 제외하고 대화합니다.</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">본인과 환자와의 관계 *</label>
                                    <select
                                        value={formData.relationship}
                                        onChange={e => setFormData(prev => ({ ...prev, relationship: e.target.value }))}
                                        required
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                                    >
                                        <option value="">관계를 선택해주세요</option>
                                        {['할머니','할아버지','어머니', '아버지', '배우자', '기타'].map(rel => (
                                            <option key={rel} value={rel}>{rel}</option>
                                        ))}
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">메모 (선택)</label>
                                    <textarea
                                        value={formData.memo}
                                        onChange={e => setFormData(prev => ({ ...prev, memo: e.target.value }))}
                                        placeholder="환자에 대한 추가 정보나 특이사항을 입력해주세요"
                                        rows={3}
                                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent resize-vertical"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={resetForm}
                                    className="flex-1 py-3 px-4 border border-gray-300 bg-white text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 px-4 bg-orange-400 text-white rounded-lg hover:bg-orange-500 transition-colors disabled:opacity-60"
                                >
                                    {isSubmitting ? '처리 중...' : (isEditMode ? '수정하기' : '등록하기')}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </main>
        </div>
    );
};

export default DashboardPage;
