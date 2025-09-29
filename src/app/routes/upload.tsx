import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authState } from '../recoil/atoms';
import { apiClient } from '../../lib/api';
import type { UserImage } from '../../lib/api';

interface UploadedPhoto {
  id: string;
  file: File;
  preview: string;
  description: string;
  tags: string[];
}

const UploadPage: React.FC = () => {
  const navigate = useNavigate();
  const auth = useRecoilValue(authState);
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<UploadedPhoto | null>(null);
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [savedPhotos, setSavedPhotos] = useState<UserImage[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    Array.from(files).forEach((file) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const preview = e.target?.result as string;
          const newPhoto: UploadedPhoto = {
            id: Date.now().toString() + Math.random(),
            file,
            preview,
            description: '',
            tags: []
          };
          setPhotos(prev => [...prev, newPhoto]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const handlePhotoSave = async () => {
    if (!selectedPhoto || !auth.selectedPatient) return;

    setUploading(true);
    try {
      console.log('🔄 Starting image upload...', {
        userId: auth.selectedPatient.id,
        fileName: selectedPhoto.file.name,
        description,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      });

      // 이미지 업로드 API 호출
      const uploadData = {
        userId: auth.selectedPatient.id,
        imageUrl: selectedPhoto.preview, // Base64 data URL
        description,
        scheduledDate: new Date().toISOString()
      };

      const uploadResult = await apiClient.uploadImage(uploadData);
      console.log('✅ Image upload successful:', uploadResult);

      // 사진 목록에서 제거하고 선택 해제
      setPhotos(prev => prev.filter(p => p.id !== selectedPhoto.id));
      setSelectedPhoto(null);
      setDescription('');
      setTags('');

      // 저장된 사진 목록 새로고침
      await loadSavedPhotos();

      // 이미지 분석 및 회상 대화 시작 제안
      if (confirm('사진이 성공적으로 저장되었습니다!\n\n이 사진으로 AI와 회상 대화를 시작하시겠습니까?')) {
        // 이미지를 로컬스토리지에 저장하고 대화 페이지로 이동
        const imageData = {
          imageUrl: selectedPhoto.preview,
          description: description,
          uploadedAt: new Date().toISOString()
        };

        localStorage.setItem('pendingImageAnalysis', JSON.stringify(imageData));
        navigate('/conversation');
      }
    } catch (error) {
      console.error('❌ Image upload failed:', error);
      alert('사진 저장에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (photoId: string) => {
    setPhotos(prev => prev.filter(p => p.id !== photoId));
    if (selectedPhoto?.id === photoId) {
      setSelectedPhoto(null);
      setDescription('');
      setTags('');
    }
  };

  const loadSavedPhotos = async () => {
    if (!auth.selectedPatient) return;

    try {
      setLoadingPhotos(true);
      console.log('🔄 Loading saved photos for user:', auth.selectedPatient.id);

      const response = await apiClient.getUserImages(auth.selectedPatient.id);
      console.log('✅ Saved photos loaded:', response);

      setSavedPhotos(response.images);
    } catch (error) {
      console.error('❌ Failed to load saved photos:', error);
      setSavedPhotos([]);
    } finally {
      setLoadingPhotos(false);
    }
  };

  useEffect(() => {
    loadSavedPhotos();
  }, [auth.selectedPatient]);

  if (!auth.selectedPatient) {
    navigate('/dashboard');
    return null;
  }

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
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-800 mb-2">
            📷 사진 추가
          </h2>
          <p className="text-lg text-gray-600">
            {auth.selectedPatient?.name}님의 소중한 추억을 공유해주세요
          </p>
        </div>

        <div className="space-y-8">
          {/* 사진 업로드 영역 */}
          <section className="card-elevated">
            <h2 className="text-2xl" style={{ marginBottom: 'var(--space-6)' }}>
              새 사진 업로드
            </h2>

            <div
              style={{
                border: '3px dashed var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-10)',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                marginBottom: 'var(--space-6)'
              }}
              onClick={() => fileInputRef.current?.click()}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-primary)';
                e.currentTarget.style.backgroundColor = 'var(--color-primary-light)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <div style={{ fontSize: '4rem', marginBottom: 'var(--space-4)' }}>📷</div>
              <p className="text-xl" style={{ marginBottom: 'var(--space-2)' }}>
                사진을 선택하거나 여기에 드래그하세요
              </p>
              <p className="text-base text-muted">
                JPG, PNG, GIF 파일을 지원합니다
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />

            {/* 업로드된 사진 미리보기 */}
            {photos.length > 0 && (
              <div style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                  <h3 className="text-lg">
                    업로드할 사진들 ({photos.length}개)
                  </h3>
                  <button
                    onClick={() => {
                      if (photos.length > 0) {
                        setSelectedPhoto(photos[0]);
                      }
                    }}
                    className="btn btn-primary"
                    disabled={photos.length === 0}
                  >
                    📷 사진 업로드 시작
                  </button>
                </div>
                <div className="grid grid-auto" style={{ gap: 'var(--space-4)' }}>
                  {photos.map((photo) => (
                    <div
                      key={photo.id}
                      className="card"
                      style={{
                        cursor: 'pointer',
                        border: selectedPhoto?.id === photo.id ? '3px solid var(--color-primary)' : '1px solid var(--color-border)',
                        transition: 'all 0.3s ease'
                      }}
                      onClick={() => setSelectedPhoto(photo)}
                    >
                      <img
                        src={photo.preview}
                        alt="업로드된 사진"
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: 'var(--radius-md)',
                          marginBottom: 'var(--space-3)'
                        }}
                      />
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="text-sm text-muted">{photo.file.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            removePhoto(photo.id);
                          }}
                          style={{
                            background: 'var(--color-danger)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '50%',
                            width: '30px',
                            height: '30px',
                            cursor: 'pointer',
                            fontSize: '18px'
                          }}
                          title="사진 삭제"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* 업로드 안내 메시지 */}
                <div style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  backgroundColor: 'var(--color-info-light)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-info)'
                }}>
                  <p className="text-base" style={{ margin: 0, color: 'var(--color-info-dark)' }}>
                    💡 사진을 클릭하여 설명을 입력하고 업로드하세요. 각 사진마다 개별적으로 업로드됩니다.
                  </p>
                </div>
              </div>
            )}

            {/* 사진 설명 입력 */}
            {selectedPhoto && (
              <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                <h3 className="text-lg" style={{ marginBottom: 'var(--space-4)' }}>
                  선택된 사진에 대한 설명
                </h3>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <img
                    src={selectedPhoto.preview}
                    alt="선택된 사진"
                    style={{
                      width: '200px',
                      height: '150px',
                      objectFit: 'cover',
                      borderRadius: 'var(--radius-md)',
                      marginBottom: 'var(--space-4)'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 'var(--space-4)' }}>
                  <label className="text-lg" style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: '500'
                  }}>
                    간단한 사진 설명
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="이 사진에 대한 설명을 입력해주세요 (예: 가족 여행, 생일파티, 손자와 함께 등)"
                    rows={4}
                    style={{
                      width: '100%',
                      padding: 'var(--space-4)',
                      fontSize: 'var(--text-lg)',
                      border: '2px solid var(--color-border)',
                      borderRadius: 'var(--radius-lg)',
                      resize: 'vertical',
                      fontFamily: 'var(--font-family-primary)',
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                <div style={{ marginBottom: 'var(--space-6)' }}>
                  <label className="text-lg" style={{
                    display: 'block',
                    marginBottom: 'var(--space-2)',
                    fontWeight: '500'
                  }}>
                    태그 (쉼표로 구분)
                  </label>
                  <input
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    placeholder="가족, 여행, 생일, 추억 등 (쉼표로 구분)"
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

                <div style={{ display: 'flex', gap: 'var(--space-4)' }}>
                  <button
                    onClick={() => setSelectedPhoto(null)}
                    className="btn btn-secondary btn-lg"
                    style={{ flex: 1 }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handlePhotoSave}
                    disabled={uploading || !description.trim()}
                    className="btn btn-primary btn-lg"
                    style={{
                      flex: 1,
                      opacity: uploading || !description.trim() ? 0.5 : 1
                    }}
                  >
                    {uploading ? '저장 중...' : '사진 저장'}
                  </button>
                </div>
              </div>
            )}
          </section>

          {/* 저장된 사진들 */}
          <section className="card-elevated">
            <h2 className="text-2xl" style={{ marginBottom: 'var(--space-6)' }}>
              저장된 사진들 {loadingPhotos ? '(로딩 중...)' : `(${savedPhotos.length}개)`}
            </h2>

            {loadingPhotos ? (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <p className="text-lg text-muted">사진을 불러오는 중...</p>
              </div>
            ) : savedPhotos.length > 0 ? (
              <div className="grid grid-auto" style={{ gap: 'var(--space-4)' }}>
                {savedPhotos.map((photo) => (
                  <div key={photo.id} className="card">
                    <img
                      src={photo.imageUrl}
                      alt={photo.description}
                      style={{
                        width: '100%',
                        height: '200px',
                        objectFit: 'cover',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-3)'
                      }}
                    />
                    <h4 className="text-base" style={{ marginBottom: 'var(--space-2)' }}>
                      {photo.description}
                    </h4>
                    <div style={{ marginBottom: 'var(--space-2)' }}>
                      <p className="text-sm text-muted">
                        업로드: {new Date(photo.uploadedAt).toLocaleDateString('ko-KR')}
                      </p>
                      {photo.lastUsedAt && (
                        <p className="text-sm text-muted">
                          마지막 사용: {new Date(photo.lastUsedAt).toLocaleDateString('ko-KR')}
                        </p>
                      )}
                      <p className="text-sm text-muted">
                        사용 횟수: {photo.usageCount}회
                      </p>
                    </div>
                    <div style={{ marginBottom: 'var(--space-3)' }}>
                      <div style={{
                        padding: '4px 8px',
                        background: photo.status === 'ACTIVE' ? 'var(--color-success-light)' : 'var(--color-warning-light)',
                        color: photo.status === 'ACTIVE' ? 'var(--color-success-dark)' : 'var(--color-warning-dark)',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: 'var(--text-sm)',
                        textAlign: 'center'
                      }}>
                        {photo.status === 'ACTIVE' ? '활성' : '비활성'}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        const imageData = {
                          imageUrl: photo.imageUrl,
                          description: photo.description,
                          uploadedAt: photo.uploadedAt
                        };
                        localStorage.setItem('pendingImageAnalysis', JSON.stringify(imageData));
                        navigate('/conversation');
                      }}
                      className="btn btn-primary btn-sm"
                      style={{ width: '100%', fontSize: 'var(--text-sm)' }}
                    >
                      💬 이 사진으로 대화하기
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                <p className="text-lg text-muted">저장된 사진이 없습니다.</p>
                <p className="text-base text-muted">위에서 새 사진을 업로드해보세요!</p>
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
};

export default UploadPage;
