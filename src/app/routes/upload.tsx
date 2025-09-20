import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRecoilValue } from 'recoil';
import { authState } from '../recoil/atoms';

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
      // 사진을 localStorage에 저장 (실제 프로덕션에서는 서버나 클라우드 스토리지 사용)
      const savedPhotos = JSON.parse(localStorage.getItem(`photos_${auth.selectedPatient.id}`) || '[]');

      const photoData = {
        id: selectedPhoto.id,
        preview: selectedPhoto.preview,
        description,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        uploadedAt: new Date().toISOString(),
        fileName: selectedPhoto.file.name
      };

      savedPhotos.push(photoData);
      localStorage.setItem(`photos_${auth.selectedPatient.id}`, JSON.stringify(savedPhotos));

      // 사진 목록에서 제거하고 선택 해제
      setPhotos(prev => prev.filter(p => p.id !== selectedPhoto.id));
      setSelectedPhoto(null);
      setDescription('');
      setTags('');

      alert('사진이 성공적으로 저장되었습니다!');
    } catch (error) {
      console.error('사진 저장 실패:', error);
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

  const getSavedPhotos = () => {
    if (!auth.selectedPatient) return [];
    return JSON.parse(localStorage.getItem(`photos_${auth.selectedPatient.id}`) || '[]');
  };

  const savedPhotos = getSavedPhotos();

  if (!auth.selectedPatient) {
    navigate('/dashboard');
    return null;
  }

  return (
    <div className="page-container">
      <div className="content-wrapper">
        <div className="flex-between" style={{ marginBottom: 'var(--space-8)' }}>
          <div>
            <h1 className="text-3xl" style={{ marginBottom: 'var(--space-2)' }}>
              📷 사진 추가
            </h1>
            <p className="text-lg text-muted">
              {auth.selectedPatient.name}님의 소중한 추억을 공유해주세요
            </p>
          </div>
          <button
            onClick={() => navigate('/')}
            className="btn btn-secondary btn-lg"
          >
            돌아가기
          </button>
        </div>

        <main className="stack-lg">
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
                <h3 className="text-lg" style={{ marginBottom: 'var(--space-4)' }}>
                  업로드할 사진들
                </h3>
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
                        >
                          ×
                        </button>
                      </div>
                    </div>
                  ))}
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
                    사진 설명
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
          {savedPhotos.length > 0 && (
            <section className="card-elevated">
              <h2 className="text-2xl" style={{ marginBottom: 'var(--space-6)' }}>
                저장된 사진들 ({savedPhotos.length}개)
              </h2>
              <div className="grid grid-auto" style={{ gap: 'var(--space-4)' }}>
                {savedPhotos.map((photo: any) => (
                  <div key={photo.id} className="card">
                    <img
                      src={photo.preview}
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
                    {photo.tags && photo.tags.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                        {photo.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            style={{
                              background: 'var(--color-primary-light)',
                              color: 'var(--color-primary-dark)',
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: 'var(--text-sm)'
                            }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
};

export default UploadPage;