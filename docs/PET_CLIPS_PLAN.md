# 푸터 펫(검은 고양이 · 아기 말티즈) 클립 & 상호작용 계획서

> 이 문서만 보고 다른 사이트에 펫을 적용할 수 있도록 정리한 명세입니다.
> 기준 구현: `dynn1178/budget` 저장소 `src/components/cat-clips/` (플레이어) · `public/cat/clips/`, `public/dog/clips/` (클립)

---

## 1. 개요

- 홈페이지 **하단(푸터) 바닥선 위에 앉아 있는 펫**이 AI로 만든 짧은 동작 영상(클립)을 이어 재생해 살아 있는 것처럼 움직입니다.
- 펫 2종: **까망이(검은 아기고양이)**, **아기 말티즈**. 둘 다 **왼쪽을 바라봄**.
- 모든 클립은 **같은 "기준 자세(허브)" 프레임에서 시작·끝**나도록 만들어져 있어 클립이 바뀌어도 끊김이 보이지 않습니다.
- 사용자 상호작용: **쓰다듬기**(마우스/손가락으로 문지르기), **간식 주기**(버튼), (선택) 클릭, 숨바꼭질 중 마우스 가까이 대기.

---

## 2. 파일 형식 (중요)

| 항목 | 값 |
|---|---|
| 형식 | H.264 MP4, 30fps, 무음 |
| 레이아웃 | **"색상(위 절반) + 알파(아래 절반)" 세로 합본** — 투명 배경을 모든 브라우저(사파리 포함)에서 쓰기 위한 방식 |
| 고양이 프레임 | 420 × 282 (파일은 420 × 564) |
| 강아지 프레임 | 420 × 314 (파일은 420 × 628) |
| 위치 기준 | 같은 펫의 모든 클립은 **동일한 위치·크기**로 잘려 있음 (클립 교체 시 펫이 움찔하지 않음) |
| 바닥선 | 프레임의 **아래쪽 끝 = 푸터 바닥선** (숨기·빼꼼 연출의 기준) |

일반 동영상 플레이어로 열면 위아래로 두 장면이 붙어 보이는 게 정상입니다. **WebGL로 합성해야** 투명하게 보입니다(7장 참고).

```
public/
├── cat/clips/   ← 고양이 클립 23개 (.mp4)
└── dog/clips/   ← 강아지 클립 26개 (.mp4, 21개 자동 재생 + 5개 라이브러리)
```

---

## 3. 용어

| 용어 | 뜻 |
|---|---|
| **허브(hub)** | 클립이 시작·끝나는 기준 자세. `sit`(앉음), `sleep`/`nap`(잠) |
| **종류(kind)** | `idle` 평소 대기 · `action` 가끔 하는 행동 · `pet` 쓰다듬기 반응 · `treat` 간식 반응 · `sleep` 잠 반복 · `transition` 허브 이동(앉음↔잠) |
| **가중치(weight)** | 자동 선택 확률 (클수록 자주) |
| **fadeIn / fadeOut** | 영상 중간에서 잘라 허브와 자세가 다른 클립 → 들어올 때/나갈 때 0.3~0.4초 크로스페이드 |
| **왕복(ping-pong)** | 정방향 + 역방향으로 붙여 시작=끝이 되는 루프 클립 |

---

## 4. 고양이(까망이) 클립 목록 — `public/cat/clips/`

허브: `sit` 앉은 자세 · `sleep` 옆으로 누워 잠 · `nap` 엎드려 낮잠

### 4-1. 평소 모습 (idle)
| 클립 id | 동작 설명 | 허브 | 가중치 | 페이드 |
|---|---|---|---|---|
| `sit_idle` | 앉아서 위를 보며 두리번 (왕복) — **기본 대기** | sit→sit | 2 | – |
| `cat_look_up` | 고개를 들어 위를 올려다보며 두리번 (왕복) | sit→sit | 2 | – |
| `cat_gaze` | 시선을 이리저리 옮기기 (왕복) · 마우스 시선 따라보기 후보 | sit→sit | 2 | – |
| `cat_stare` | 동그란 눈으로 정면 응시 (왕복) | sit→sit | 1 | in/out 0.3 |
| `cat_head_tilt` | 갸우뚱하며 이리저리 보다가 눈 가늘게 | sit→sit | 1 | in/out 0.3 |

### 4-2. 행동 (action)
| 클립 id | 동작 설명 | 허브 | 가중치 | 페이드 |
|---|---|---|---|---|
| `sit_wash` | 앞발 핥고 혀 내밀며 그루밍 | sit→sit | 0.6 | out 0.4 |
| `cat_yawn` | 고개 숙였다가 크게 하품하고 다시 앉기 | sit→sit | 1 | in 0.3 |
| `cat_paw_lick` | 앞발을 들어 핥기 (혀 쏙) | sit→sit | 1 | out 0.3 |
| `cat_face_wash` | 앞발로 얼굴·귀를 쓸며 세수 | sit→sit | 1 | in/out 0.3 |
| `cat_content` | 눈 감고 고개 숙인 기분 좋은 표정 (꾹꾹 느낌) | sit→sit | 0.8 | in/out 0.3 |
| `cat_sneeze` | 재채기 후 고개 털고 앉기 | sit→sit | 0.8 | in 0.3 |
| `cat_meow` | 정면 보며 "야옹" | sit→sit | 1 | in/out 0.3 |
| `cat_startle` | 깜짝 놀라 폴짝 뛰었다가 앉기 | sit→sit | 0.6 | in 0.3 |
| `cat_hide_peek` | 살포시 바닥선 아래로 숨었다가 귀·눈만 빼꼼 → 올라와 앉기 | sit→sit | 0.5 | – |

### 4-3. 쓰다듬기 · 간식
| 클립 id | 동작 설명 | 종류 | 허브 | 페이드 |
|---|---|---|---|---|
| `pet` | 눈 감고 입 벌려 활짝 웃는 행복한 표정 (왕복) | pet | sit→sit | in/out 0.35 |
| `cat_pet_bliss` | 눈 감고 고개를 들어 손에 기대는 표정 | pet | sit→sit | out 0.3 |
| `cat_treat` | 생선 간식이 떨어짐 → 발견 → 냠냠 → 혀로 입맛 | treat | sit→sit | in 0.3 |

### 4-4. 잠
| 클립 id | 동작 설명 | 종류 | 허브 | 페이드 |
|---|---|---|---|---|
| `sit_to_sleep` | 두리번·그루밍·하품하다가 옆으로 누워 잠들기 | transition | sit→sleep | – |
| `sleep_loop` | 옆으로 누워 쿨쿨 (왕복) | sleep | sleep→sleep | – |
| `sleep_to_sit` | 일어나 앉기 | transition | sleep→sit | out 0.4 |
| `cat_doze_off` | 꾸벅꾸벅 졸다가 엎드리기 | transition | sit→nap | – |
| `cat_nap_loop` | 엎드려 쌔근쌔근 (왕복) | sleep | nap→nap | – |
| `cat_wake_yawn` | 하품하며 깨서 앉기 | transition | nap→sit | in 0.3 |

---

## 5. 강아지(아기 말티즈) 클립 목록 — `public/dog/clips/`

허브: `sit` 앉은 자세 · `nap` 엎드려 낮잠

### 5-1. 평소 모습 (idle)
| 클립 id | 동작 설명 | 허브 | 가중치 | 페이드 |
|---|---|---|---|---|
| `dog_look_around` | 두리번두리번 (왕복) — **기본 대기** | sit→sit | 3 | – |
| `dog_head_tilt` | 갸우뚱 + 귀 쫑긋 | sit→sit | 1.5 | in/out 0.3 |
| `dog_tongue_blep` | 혀끝 쏙 내밀었다 넣기 | sit→sit | 1.5 | in/out 0.3 |
| `dog_look_down` | 천천히 눈 깜빡이고 앞발 내려다보기 | sit→sit | 1 | in 0.3 |

### 5-2. 행동 (action)
| 클립 id | 동작 설명 | 허브 | 가중치 | 페이드 |
|---|---|---|---|---|
| `dog_yawn` | 크게 하품 + 고개 끄덕 재채기 | sit→sit | 1 | out 0.3 |
| `dog_scratch` | 뒷발로 귀 긁다가 휘청 | sit→sit | 1 | in/out 0.3 |
| `dog_paw_lick` | 고개 숙여 앞발 핥기 | sit→sit | 0.8 | in/out 0.3 |
| `dog_shake` | 꼬리 깨물려 빙글 + 온몸 털기 후 앉기 | sit→sit | 0.8 | in 0.3 |
| `dog_play_bow` | 엉덩이 들고 "놀자" 자세 + 멍! | sit→sit | 1 | out 0.3 |
| `dog_hop` | 두 발로 서서 콩콩 | sit→sit | 0.8 | in/out 0.3 |
| `dog_spin` | 꼬리 쫓아 제자리 한 바퀴 | sit→sit | 0.6 | in/out 0.3 |
| `dog_happy_pant` | 혀 내밀고 헥헥, 신나서 앉기 | sit→sit | 1 | in 0.3 |
| `dog_lick_lips` | 혀로 입맛 다시기 | sit→sit | 0.6 | in/out 0.3 |
| `dog_thank_paw` | 앞발 들고 활짝 웃기 ("고마워") | sit→sit | 0.6 | in 0.3 |
| `dog_paw_shake` | 앞발 내밀기 ("손!") | sit→sit | 0.8 | in/out 0.3 |
| `dog_hide_peek` | 쏙 숨었다가 담벼락 넘듯 앞발 걸치고 빼꼼 → 영차 넘어와 앉기 | sit→sit | 0.5 | – |

### 5-3. 쓰다듬기 · 간식
| 클립 id | 동작 설명 | 종류 | 허브 | 페이드 |
|---|---|---|---|---|
| `dog_pet_happy` | 눈 감고 혀 쏙, 손에 기대는 행복한 표정 | pet | sit→sit | in 0.35 / out 0.3 |
| `dog_treat` | 두 발 들고 "주세요" → 간식 떨어짐 → 냠냠 → 입맛 → 앞발 들고 "고마워" (전체 5초) | treat | sit→sit | in 0.3 |

### 5-4. 낮잠
| 클립 id | 동작 설명 | 종류 | 허브 | 페이드 |
|---|---|---|---|---|
| `dog_doze_off` | 꾸벅꾸벅하다 엎드리기 | transition | sit→nap | in 0.3 |
| `dog_nap_loop` | 엎드려 쌔근쌔근 (왕복) | sleep | nap→nap | – |
| `dog_wake_stretch` | 엉덩이 들고 기지개 + 하품 후 앉기 | transition | nap→sit | in 0.3 |

### 5-5. 라이브러리 전용 (자동 재생에 쓰지 않음, 필요 시 활용)
| 클립 id | 동작 설명 |
|---|---|
| `dog_beg` | 두 발 들고 "주세요" + 간식이 떨어지는 순간 |
| `dog_treat_eat` | 간식 냠냠 먹는 부분만 |
| `dog_hide` | 앉음 → 바닥선 아래로 쏙 사라지기 (끝 = 빈 화면) |
| `dog_peek` | 빈 화면 → 앞발 걸치고 빼꼼, 요리조리 눈치 |
| `dog_climb_up` | 영차 넘어와서 털고 앉기 |

---

## 6. 상호작용 계획 (어떤 상황에 어떤 클립을 보여줄지)

### 6-1. 한눈에 보기
| 상황 / 사용자 행동 | 고양이 클립 | 강아지 클립 | 비고 |
|---|---|---|---|
| 페이지 로드 | `sit_idle` | `dog_look_around` | 첫 프레임 준비되면 0.4초 페이드인 |
| 아무것도 안 함 (기본) | idle 5종 + action 9종 랜덤 | idle 4종 + action 12종 랜덤 | 7장 선택 규칙 |
| **쓰다듬기** (펫 위에서 문지르기) | `pet`, `cat_pet_bliss` 중 랜덤 | `dog_pet_happy` | 즉시 0.35초 크로스페이드로 전환 · 하트 💗 0.45~0.9초마다 |
| 쓰다듬기 계속 | pet 클립 반복 | pet 클립 반복 | 문지르기 멈추고 약 0.9초 지나면 평소 동작으로 |
| 펫 클릭/탭 | (선택) `cat_meow` | (선택) `dog_happy_pant` | 큰 하트 1개 + 쓰다듬기 에너지 약간 |
| **간식 주기** (버튼) | `cat_treat` | `dog_treat` | 앉아 있을 때만 · 1.8초 후 하트 · 권장 쿨다운 15~20초 |
| 깨어 있은 지 35초 이상 | `sit_to_sleep` 또는 `cat_doze_off` (확률 점점 증가) | `dog_doze_off` | 잠 클립 5~10회 반복 후 깨기 |
| 자는 중 | `sleep_loop` / `cat_nap_loop` 반복 | `dog_nap_loop` 반복 | |
| 자는 중 쓰다듬기 | 깨기 클립(`sleep_to_sit`/`cat_wake_yawn`) → 쓰다듬기 반응 | `dog_wake_stretch` → `dog_pet_happy` | 자는 중엔 간식 불가 |
| 가끔 숨바꼭질 | `cat_hide_peek` (가중치 0.5) | `dog_hide_peek` (가중치 0.5) | 영상 버전 |
| 숨은 동안 마우스 가까이 | (코드 연출 사용 시) 빨리 빼꼼 | – | 7-5 참고 |
| 화면 밖으로 스크롤 / 탭 비활성 | 재생 일시정지 | 재생 일시정지 | 성능 |

### 6-2. 자동 선택 규칙 (앉은 자세에서 클립이 끝날 때마다)
1. 지금 **쓰다듬는 중**이면 → `pet` 종류 클립
2. **자는 중**이면 → `sleep` 클립을 남은 횟수만큼 반복, 다 하면(또는 쓰다듬으면) `transition`으로 깨기
3. 그 외에는 같은 허브에서 출발하는 클립 중 **가중치 랜덤**
   - `pet`, `treat` 종류는 자동 선택에서 **제외** (상호작용으로만)
   - 잠들기(`transition`)는 **깨어 있은 지 35초 이후**에만, 시간이 지날수록 확률 증가 (최대 1.5배)
   - 같은 `action`이 **두 번 연속 나오지 않게**
4. 다음 클립의 `fadeIn`과 현재 클립의 `fadeOut` 중 큰 값으로 크로스페이드 (0이면 이음새 없이 바로 이어 붙임)

### 6-3. 쓰다듬기 판정
- 펫 몸 위의 **타원 영역**(프레임 비율: 고양이 `cx .47 cy .54 rx .27 ry .42`, 강아지 `cx .5 cy .56 rx .3 ry .4`)에서만 포인터 이벤트를 받음 → 푸터의 다른 링크 클릭을 막지 않음
- 포인터 이동 거리 × 0.012 만큼 "에너지" 누적 (최대 3), 초당 0.45씩 감소
- **에너지 > 0.5 또는 마지막 움직임 0.9초 이내 = 쓰다듬는 중**
- 누르기(pointerdown) = 에너지 +0.3, 큰 하트
- 모바일: `touch-action: none` 으로 문지르는 동안 스크롤되지 않게

---

## 7. 다른 사이트에 적용하는 방법

### 7-1. 가장 쉬운 방법 (React / Next.js)
1. 복사: `src/components/cat-clips/` 폴더 (`clip-player.ts`, `manifest.ts`, `manifest-dog.ts`, `ClipCat.tsx`) + `public/cat/`, `public/dog/` 폴더
2. 사용:
```tsx
import ClipCat from '@/components/cat-clips/ClipCat'
import { dogManifest } from '@/components/cat-clips/manifest-dog'

<footer style={{ position: 'relative' }}>
  <ClipCat align="right" width={220} />                         {/* 고양이 */}
  {/* <ClipCat manifest={dogManifest} align="left" width={220} /> 강아지 */}
</footer>
```
3. 간식 버튼: `onReady={(cat) => (petRef.current = cat)}` 후 `petRef.current.feed()`

### 7-2. 일반 HTML 사이트
`clip-player.ts`를 JS로 빌드(`tsc --target es2019 --module esnext`)해 올린 뒤:
```html
<div id="pet" style="position:absolute;right:24px;bottom:0"></div>
<script type="module">
  import { createClipCat } from '/pet/clip-player.js'
  import { defaultCatManifest } from '/pet/manifest.js'
  const pet = createClipCat(document.getElementById('pet'), defaultCatManifest, { width: 220 })
  document.querySelector('#feed-btn').onclick = () => pet.feed()
</script>
```
> 클립을 다른 도메인(CDN)에 두면 CORS 허용 + `video.crossOrigin = 'anonymous'` 필요.

### 7-3. 직접 구현할 때 꼭 지킬 것 (플레이어 핵심 규칙)
1. **WebGL 합성**: 텍스처 위 절반에서 색, 아래 절반에서 알파를 읽어 premultiplied로 출력
```glsl
vec3 c = texture2D(t, vec2(v.x, v.y * 0.5)).rgb;
float a = texture2D(t, vec2(v.x, 0.5 + v.y * 0.5)).r;
a = smoothstep(0.06, 0.94, a);
gl_FragColor = vec4(c * a, a);
```
2. **이음새 없는 전환**: 현재 클립이 끝나기 0.06초 전에 다음 클립을 `currentTime=0`으로 재생 시작 → 다음 클립의 첫 프레임이 준비될 때까지 **이전 클립의 마지막 프레임을 계속 그림** (빈 프레임 금지)
3. **크로스페이드**: `fadeIn/fadeOut` 값이 있으면 두 텍스처를 `mix()`로 섞음
4. 다음에 이어질 수 있는 클립은 미리 `preload='auto'`
5. 비디오 속성: `muted`, `playsInline`(iOS 필수), 자동재생
6. 화면 밖(IntersectionObserver)·탭 비활성 시 일시정지

### 7-4. 클립 목록(manifest) 형식
```ts
{
  startHub: 'sit',
  frame: { w: 420, h: 282 },                       // 색상 절반 크기
  hit: { cx: 0.47, cy: 0.54, rx: 0.27, ry: 0.42 }, // 쓰다듬기 영역(0~1)
  heartAt: { x: 0.52, y: 0.1 },                    // 하트 위치(0~1)
  clips: [
    { id: 'sit_idle', src: '/cat/clips/sit_idle.mp4', from: 'sit', to: 'sit', kind: 'idle', weight: 2 },
    { id: 'pet', src: '/cat/clips/pet.mp4', from: 'sit', to: 'sit', kind: 'pet', fadeIn: 0.35, fadeOut: 0.35 },
    ...
  ]
}
```

### 7-5. (선택) 코드로 만든 숨바꼭질
영상 없이도 숨기·빼꼼을 연출할 수 있음: 셰이더에서 프레임을 아래로 밀어(`y = v.y - off`) 바닥선에서 잘리게 하고, `off`를 1.03(숨음) → 0.85(귀 끝) → 0.5(눈) → 0(앉음)으로 애니메이션. 고양이는 영상 버전이 있어 확률 0.06으로만 사용, 강아지는 끔.

---

## 8. 적용 체크리스트
- [ ] 클립 폴더 업로드 (고양이 약 4.6MB, 강아지 약 4.3MB)
- [ ] 푸터에 `position: relative`, 펫은 바닥선에 붙게 `bottom: 0`
- [ ] 펫 컨테이너 `pointer-events: none`, 쓰다듬기 영역만 `auto`
- [ ] 간식 버튼 연결 (`feed()`), 쿨다운
- [ ] iOS 사파리에서 자동재생(무음·playsInline) 확인
- [ ] 다크 테마 배경에서 펫 외곽이 잘 보이는지 확인 (필요 시 옅은 그림자/글로우)
- [ ] Kling 생성 영상의 상업적 이용 가능 여부(요금제 약관) 확인

## 9. 참고 파일
| 파일 | 내용 |
|---|---|
| `src/components/cat-clips/clip-player.ts` | 플레이어 (WebGL 합성, 상태 그래프, 쓰다듬기, 간식, 숨바꼭질) |
| `src/components/cat-clips/manifest.ts` | 고양이 클립 목록 |
| `src/components/cat-clips/manifest-dog.ts` | 강아지 클립 목록 |
| `scripts/cat-clips/process_clip.py` | 초록 배경 영상 → 투명 클립 변환 |
| `scripts/cat-clips/PROMPTS.md`, `scripts/dog-clips/PROMPTS.md` | Kling 제작 프롬프트 |
| `scripts/cat-clips/CLIPS.md` | 고양이 클립 원본 구간 |
