# 이음이 (E-umm) 🧠💙

> 치매 어르신을 위한 사진 기반 AI 회상치료 플랫폼

## 🌐 서비스 URL

- **메인 서비스**: https://aa24b61b.e-umm-frontend.pages.dev
- **테스트 환경**: https://test.e-umm-frontend.pages.dev
- **API 서버**: https://eume-api.hwjinfo.workers.dev

## 🚀 빠른 시작

1. 서비스 URL 접속
2. 회원가입 또는 로그인
3. 환자 정보 등록
4. 음성으로 AI와 자연스러운 대화 시작

## 팀 구성

| 이름 | 소속 | 전공 | 역할 |
|------|------|------|------|
| 홍우진 | 경기과학기술대학교 | 인공지능학과 | 팀장, LLM 튜닝 |
| 김정민 | 서울시립대학교 | 수학과, 인공지능학과 | 백엔드 개발 |
| 김예인 | 숙명여자대학교 | 통계학과, IT공학전공 | 백엔드 개발 |
| 김영언 | 경상국립대학교 | 컴퓨터공학과 | 프론트엔드 개발 |
| 김수인 | 경상국립대학교 | 컴퓨터공학과 | 프론트엔드 개발 |

## 프로젝트 개요

"이음이"는 치매 환자와 보호자가 가정에서 쉽고 효과적으로 회상치료를 할 수 있도록 돕는 초개인화 회상-대화 인지훈련 앱입니다. LLM을 활용하여 환자의 사진을 기반으로 환자와 자연스러운 대화를 나누며, 개인의 기억과 관련된 정보를 유도하여 회상치료를 진행합니다.

## 주요 기능

### 🧠 개인 기억 지도 (Memory Map)
- 보호자가 업로드한 가족 사진, 영상, 키워드를 기반으로 환자 개인의 기억을 시각화
- 구축된 데이터베이스를 통해 맞춤형 대화 생성

### 🎯 예측형 질문 (Next Best Question, NBQ)
- 이전 대화의 반응과 기억 지도 맥락을 분석하여 성공 확률이 높은 질문 추천
- 개인화 기술(JITAI, 컨텍스트 밴딧) 적용

### 📊 반응 기반 리포팅
- 세션별 긍정 반응 비율, 회상 성공률, 선호 주제/감각, 답변 정확성 분석
- 주간/월간 차트로 객관적 효과 확인 가능

### 🎮 개인화된 미션
- "어릴 적 친구 사진 보며 이야기하기"와 같은 성공하기 쉬운 미션 제공
- 환자의 동기와 자존감 유지 지원

## 🛠️ 기술 스택 (100% Cloudflare)

### Frontend (Cloudflare Pages)
- **Framework**: Vite + React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS v3
- **State Management**: Recoil
- **Voice Interface**:
  - MediaRecorder API (음성 인식)
  - SpeechSynthesis API (음성 출력)
- **Build Tool**: Vite with Turbopack

### Backend (Cloudflare Workers)
- **Runtime**: Cloudflare Workers
- **Database**: Cloudflare D1 (SQL)
- **Session Storage**: Cloudflare KV
- **AI Services**:
  - STT: @cf/openai/whisper
  - LLM: @cf/google/gemma-3-12b-it
  - Vision: @cf/llava-hf/llava-1.5-7b-hf
- **Language**: TypeScript

### Infrastructure
- **Hosting**: Cloudflare Pages (Frontend)
- **API**: Cloudflare Workers (Backend)
- **Database**: Cloudflare D1
- **CDN**: Cloudflare Global Network
- **Security**: Cloudflare SSL/TLS

## 🏗️ 시스템 아키텍처

```
┌─────────────────────┐    ┌─────────────────────┐    ┌─────────────────────┐
│   Cloudflare Pages  │    │  Cloudflare Workers │    │   Cloudflare AI     │
│   (Frontend/React)  │◄──►│     (Backend)       │◄──►│   (LLM/STT/Vision)  │
│  - Speech I/O       │    │  - Auth & Session   │    │  - Gemma-3-12B      │
│  - Voice Recording  │    │  - API Endpoints    │    │  - Whisper STT      │
│  - Real-time Chat   │    │  - Business Logic   │    │  - LLaVA Vision     │
└─────────────────────┘    └─────────────────────┘    └─────────────────────┘
         │                            │
         │                            │
         ▼                            ▼
┌─────────────────────┐    ┌─────────────────────┐
│   Browser Storage   │    │  Cloudflare Storage │
│   - Auth Tokens     │    │  - D1 Database      │
│   - User Session    │    │  - KV Cache         │
│   - Temp Audio      │    │  - Chat History     │
└─────────────────────┘    └─────────────────────┘
```

### 🔄 데이터 흐름
1. 사용자 음성 → MediaRecorder → WebM 파일
2. WebM → Cloudflare Workers → Whisper STT → 텍스트
3. 텍스트 + 컨텍스트 → Gemma LLM → 응답 생성
4. 응답 → Frontend → SpeechSynthesis → 음성 출력
5. 대화 기록 → D1 Database 저장


## 타겟 사용자

1. **이음 - 보호자용**: 경증 및 중증 치매 환자와 그들을 돌보는 보호자
2. **이음 - 예방용**: 스마트폰 사용에 익숙한 50대 이상 액티브 시니어 및 경도인지장애(MCI) 환자

## 💡 사회적 가치

- **접근성**: 가정에서 편리하게 이용 가능한 24/7 서비스
- **객관화**: 주관적이었던 회상 활동의 효과를 데이터로 객관화
- **비용 효율성**: 기관 방문 대비 낮은 비용 부담
- **개인화**: AI 기반 맞춤형 치료 프로그램
- **안전성**: Cloudflare 보안으로 개인정보 보호

## 🎯 임상 검증 목표

- **H1**: NBQ 기반 질문의 높은 회상 성공률 검증
- **H2**: 개인화 음악/사진 세션의 정서/행동 개선 효과
- **H3**: 데이터 기반 리포트의 보호자 효능감 증대

---

**🧠💙 치매 환자를 위한, 사진 기반 초개인화 회상치료 LLM 서비스 "이음"**
