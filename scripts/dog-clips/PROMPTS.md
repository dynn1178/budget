# 아기 말티즈 Kling 프롬프트 (영상 7개 · 묶음형)

## 시작·끝 프레임 이미지
| 이미지 | 내용 | 쓰는 곳 |
|---|---|---|
| 🐶 `hubs/dog_start_frame.png` | 왼쪽을 보고 앉은 아기 말티즈 (기본 자세) | 대부분의 영상 시작·끝 |
| 🟩 `hubs/dog_empty_frame.png` | 강아지가 없는 빈 초록 화면 (완전히 숨은 상태) | D6 나눠 만들기 |

## 영상별 시작 → 끝 프레임 한눈에 보기
| 라벨 | 영상 | 시작 프레임 | 끝 프레임 |
|---|---|---|---|
| D1 | 평소 모습 · 시선 따라보기 | 🐶 기본 자세 | 🐶 기본 자세 |
| D2 | 아기 강아지 습성 | 🐶 기본 자세 | 🐶 기본 자세 |
| D3 | 놀자! 장난 | 🐶 기본 자세 | 🐶 기본 자세 |
| D4 | 간식 반응 | 🐶 기본 자세 | 🐶 기본 자세 |
| D5 | 애교 · 쓰다듬기 반응 | 🐶 기본 자세 | 🐶 기본 자세 |
| D6 | 숨었다가 담벼락 넘듯 빼꼼 | 🐶 기본 자세 | 🐶 기본 자세 |
| D6-a (선택) | 쏙 숨기만 | 🐶 기본 자세 | 🟩 빈 화면 |
| D6-b (선택) | 빼꼼 → 올라오기만 | 🟩 빈 화면 | 🐶 기본 자세 |
| D7 | 꾸벅꾸벅 낮잠 | 🐶 기본 자세 | 🐶 기본 자세 |

> 시작과 끝이 같은 기본 자세라서, 잘라낸 클립들이 사이트에서 끊김 없이 이어집니다.
> D6 한 번에 결과가 어색하면(숨는 순간이 흐릿하거나 너무 빨리 올라오는 등) D6-a + D6-b 로 나눠 만드세요.

## 공통 설정
| 항목 | 값 |
|---|---|
| 모드 | 이미지 → 영상, **시작·끝 프레임** (Omni reference 아님) |
| 시작 / 끝 프레임 | 위 표 참고 (대부분 둘 다 `dog_start_frame.png`) |
| 설정 | 720p · Standard · **10초** · 1개 |

**네거티브 프롬프트 (칸이 있으면)**
```
camera movement, zoom, scene cut, background change, extra dogs, human, hands, collar, text, watermark, green objects, morphing, deformed, blurry, flicker
```

> 모든 프롬프트에 "동작 사이마다 기본 앉은 자세로 잠깐 멈추기"가 들어 있어요. 그 멈춤 지점에서 잘라 클립으로 씁니다.

---

## [D1] 평소 모습 · 시선 따라보기 (idle)
잘라 쓸 클립: `look_around`(시선 방향 — 마우스 따라보기용) · `head_tilt`(갸우뚱) · `ear_perk`(귀 쫑긋)
```
The fluffy white baby Maltese puppy does a series of calm idle actions, briefly returning to its calm sitting pose between each one: first, keeping its body completely still, it slowly moves only its head and eyes to look in different directions, pausing briefly at each: far left, up-left, straight up, up-right, right, down at its paws, and back to the viewer; next it hears a sound and does the classic puppy head tilt, tilting its head to one side, then the other side; finally its little ears perk up and twitch curiously, then relax. Static locked-off camera, no camera movement, no zoom, no cuts. The puppy stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic baby puppy motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

## [D2] 아기 강아지 습성 (habit)
잘라 쓸 클립: `yawn`(하품) · `scratch`(뒷발 긁기, 휘청) · `shake`(몸 털기)
```
The fluffy white baby Maltese puppy shows typical baby puppy habits, briefly returning to its calm sitting pose between each one: first it does a big sleepy yawn with its tiny pink tongue curling up and eyes squeezed shut, then smacks its lips; next it lifts a hind leg and clumsily scratches behind its ear, wobbling a little and almost tipping over like a baby, then catches its balance; finally it does a full-body fluffy shake from head to tail, its fur and floppy ears flying, then sits back down neatly looking a bit fluffed up. Static locked-off camera, no camera movement, no zoom, no cuts. The puppy stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic baby puppy motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

## [D3] 놀자! 장난 (play)
잘라 쓸 클립: `play_bow`(놀자 자세) · `pounce`(콩콩 점프) · `spin`(제자리 한 바퀴)
```
The fluffy white baby Maltese puppy gets playful, briefly returning to its calm sitting pose between each action: first it does a play bow with its front legs stretched down and its little bottom up, tail wagging fast, and gives a tiny happy bark; next it does two small excited bouncy hops in place, front paws lifting off the ground; finally it spins around once in place chasing its own fluffy tail, then plops back down into its sitting pose. Static locked-off camera, no camera movement, no zoom, no cuts. The puppy stays in the same spot and ends facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic baby puppy motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

## [D4] 간식 반응 ⭐ (treat)
잘라 쓸 클립: `treat_notice`(간식 발견, 눈 반짝) · `treat_eat`(냠냠) · `treat_happy`(꼬리 살랑 + 혀 내밀기)
```
A small light-brown bone-shaped dog treat drops from above and lands right in front of the fluffy white baby Maltese puppy's paws. The puppy's ears perk up and its big eyes sparkle, it wags its fluffy tail excitedly, sniffs the treat with its little nose, then happily eats it, chewing with a delighted face; after finishing it licks its lips, then looks up at the viewer with its tiny pink tongue sticking out in a happy smile, panting softly while its tail wags fast and its whole little body wiggles with joy, then it settles back into its calm sitting pose. Static locked-off camera, no camera movement, no zoom, no cuts. The puppy stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no other props except the treat, no text. Smooth, natural, realistic baby puppy motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

## [D5] 애교 · 쓰다듬기 반응 ⭐ (affection)
잘라 쓸 클립: `pet_happy`(쓰다듬 반응, 혀 내밀고 꼬리 살랑) · `beg`(두 발 들고 주세요) · `paw`(손!)
```
The fluffy white baby Maltese puppy is being sweet and affectionate, briefly returning to its calm sitting pose between each action: first it closes its eyes happily and leans its head up and to the side as if an invisible hand is gently stroking it, tiny pink tongue peeking out in a blissful smile, fluffy tail wagging side to side; next it sits up on its hind legs in a cute begging pose with both little front paws held together in front of its chest, looking up at the viewer pleadingly, then lowers back down; finally it lifts one tiny front paw forward as if offering a handshake, holds it up for a moment, then puts it down and wags its tail. Static locked-off camera, no camera movement, no zoom, no cuts. The puppy stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic baby puppy motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

## [D6] 숨었다가 담벼락 넘듯 빼꼼 ⭐ (hide & peek)
잘라 쓸 클립: `hide`(쏙 숨기) · `peek_paws`(앞발 걸치기) · `peek_eyes`(요리조리 눈치) · `climb_up`(영차 올라오기)
> 화면 **아래쪽 끝 = 담벼락(바닥선)** 입니다.
```
The fluffy white baby Maltese puppy suddenly ducks and slides straight down below the bottom edge of the frame until it is completely hidden, leaving only the empty background for a moment. Then, as if peeking over a low wall, its two tiny front paws appear and hook over the bottom edge of the frame, the tips of its floppy ears rise up, and its big eyes peek over the edge, glancing cautiously left and right; it quickly ducks back down, then peeks up again a little further to the side, looking around nervously; finally, deciding it is safe, it scrambles up and climbs over the edge with its little paws, tail wagging, and plops back into its calm sitting pose. Static locked-off camera, no camera movement, no zoom, no cuts. The puppy faces left as in the first frame. Plain flat chroma-green background the whole time, no visible wall, no floor, no hole, no props, no text. Smooth, natural, realistic baby puppy motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

### [D6-a] 쏙 숨기 (선택) — 시작 🐶 기본 자세 → 끝 🟩 빈 화면
```
The fluffy white baby Maltese puppy suddenly perks up, crouches low with its ears back, and quickly slides straight down below the bottom edge of the frame until it is completely hidden, leaving only the empty green background. Static locked-off camera, no camera movement, no zoom, no cuts. The puppy moves only straight down at the same horizontal position, facing left. Plain flat chroma-green background the whole time, no visible wall, no floor, no hole, no props, no text. Smooth, natural, realistic baby puppy motion, Pixar-style 3D. It ends with the empty background exactly like the last frame.
```

### [D6-b] 담벼락 넘듯 빼꼼 → 올라오기 (선택) — 시작 🟩 빈 화면 → 끝 🐶 기본 자세
```
From below the bottom edge of the frame, as if peeking over a low wall, the fluffy white baby Maltese puppy's two tiny front paws appear and hook over the bottom edge, then the tips of its floppy ears rise up and its big eyes peek over, glancing cautiously left and right; it quickly ducks back down, then peeks up again a little further to the side, looking around nervously; finally it scrambles up and climbs over the edge with its little paws, tail wagging, and plops into its calm sitting pose facing left. Static locked-off camera, no camera movement, no zoom, no cuts. Plain flat chroma-green background the whole time, no visible wall, no floor, no hole, no props, no text. Smooth, natural, realistic baby puppy motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

## [D7] 꾸벅꾸벅 낮잠 (nap)
잘라 쓸 클립: `doze`(꾸벅꾸벅) · `sleep_loop`(쌔근쌔근) · `wake_stretch`(기지개)
```
The fluffy white baby Maltese puppy gets very sleepy: its eyes slowly droop and its little head nods and bobs a few times as it fights sleep, then it flops down onto its tummy with its chin resting on its front paws and falls asleep, its fluffy body rising and falling with slow breaths and its paws twitching slightly as if dreaming; then it wakes up, blinks, stretches with its front legs out and bottom up in a long puppy stretch, gives a tiny yawn, and sits back up in its calm sitting pose. Static locked-off camera, no camera movement, no zoom, no cuts. The puppy stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic baby puppy motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

---

## 추천 제작 순서
1. **D4 간식** · **D5 애교** — 사이트 인터랙션(간식 주기, 쓰다듬기)에 바로 쓰여요
2. **D1 평소 모습** — 가장 자주 보이는 기본 동작 + 마우스 시선 따라보기
3. **D6 숨기·빼꼼** — 담벼락 연출
4. D2 · D3 · D7

## 만든 뒤에는
영상을 **라벨(D1~D7)과 함께** 채팅에 올려주세요. 멈춤 지점에서 잘라 배경을 지우고 사이트에 연결합니다.
