# Kling 상황별 클립 프롬프트 모음 (왼쪽을 보는 까망이)

## Kling 설정 (모든 클립 공통)

| 항목 | 값 |
|---|---|
| 메뉴 | 이미지 → 영상 (Image to Video), **시작 및 끝 프레임** 켜기 |
| 시작 프레임 / 끝 프레임 | 아래 표의 이미지 (`hubs/` 폴더) |
| 모드 / 길이 | 고품질(Professional) / 5초 |
| 비율 | 16:9 (원본 시작 프레임과 같게) |

**허브(기준) 이미지**
- 🐈‍⬛ 앉은 자세 = `hubs/kling_start_frame.png`
- 💤 자는 자세 = `hubs/kling_sleep_frame.png`
- 🫥 숨은 상태(빈 화면) = `hubs/kling_empty_frame.png` — 화면 아래 끝 = 사이트 푸터의 바닥선

**모든 프롬프트 뒤에 붙일 공통 문구**
```
Static locked-off camera, no camera movement, no zoom, no cuts. The kitten stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic kitten motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

**네거티브 프롬프트 (공통)**
```
camera movement, zoom, scene cut, background change, extra cats, human, hands, text, watermark, morphing, deformed, blurry, flicker
```

---

---

## 💰 절약형: 영상 4개로 동작 대부분 만들기 (추천)

영상 1개(10초)에 동작 여러 개를 **사이사이 기본 앉은 자세로 잠깐 멈추며** 이어서 시키면, 그 멈춘 지점에서 잘라 클립 여러 개로 씁니다.
- 설정: 720p · Standard(또는 무료 크레딧) · **10초** · 시작/끝 프레임 = `kling_start_frame.png`
- 바닥 밑으로 숨기/빼꼼은 영상 없이 코드로 구현되어 있어 만들 필요 없음

**A. 평소 모습 (두리번 → 갸우뚱 → 눈인사 → 하품)**
```
The kitten does a series of small actions, briefly returning to its calm sitting pose between each one: first it hears a sound and looks further to the left, then glances up and back; next it tilts its head cutely to one side and the other; next it gives a slow loving blink at the viewer; finally it does a big cute yawn showing its pink tongue and blinks contentedly. Static locked-off camera, no camera movement, no zoom, no cuts. The kitten stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic kitten motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

**B. 행동 (앞발 세수 → 뒷발로 귀 긁기 → 꾹꾹이 → 재채기)**
```
The kitten does a series of small actions, briefly returning to its calm sitting pose between each one: first it licks one front paw and wipes it over its face like washing; next it lifts a hind leg and quickly scratches behind its ear so the little bell jingles; next it kneads the ground with its front paws, alternating softly with half-closed happy eyes; finally it scrunches its nose and does a tiny cute sneeze, then shakes its head. Static locked-off camera, no camera movement, no zoom, no cuts. The kitten stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic kitten motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

**C. 감정 · 쓰다듬기 반응 (행복한 표정 → 머리 비비기 → 야옹 → 깜짝)**
```
The kitten does a series of small reactions, briefly returning to its calm sitting pose between each one: first it closes its eyes happily and leans its head up as if an invisible hand is stroking it, purring blissfully; next it rubs its cheek and head against an invisible hand in front of it with eyes closed in delight; next it perks up its ears and does a cute small meow at the viewer; finally it is slightly startled, eyes wide and ears up with a tiny hop, then relaxes. Static locked-off camera, no camera movement, no zoom, no cuts. The kitten stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic kitten motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

**D. 낮잠 (졸다 잠들기 → 꿈꾸기 → 일어나 기지개)**
```
The kitten gets sleepy, its eyes slowly close and its head nods, then it lies down, curls up and sleeps with its head on its paws; while sleeping its paw and whiskers twitch as if dreaming and it breathes slowly; then it wakes up, stretches its front paws forward with a little yawn and sits back up in its calm sitting pose. Static locked-off camera, no camera movement, no zoom, no cuts. The kitten stays in the same spot and keeps facing left as in the first frame. Plain flat chroma-green background the whole time, no floor, no props, no text. Smooth, natural, realistic kitten motion, Pixar-style 3D. It ends in exactly the same pose as the last frame.
```

---

# 개별 클립 프롬프트 (크레딧 여유가 있을 때)

## 1. 평소 모습 (자주 나오는 대기 동작)

| 파일명 (클립 id) | 상황 | 시작 → 끝 | 프롬프트 |
|---|---|---|---|
| `sit_idle2` | 귀 쫑긋 + 꼬리 살랑 | 앉음 → 앉음 | The kitten sits calmly and breathes softly, its ears twitch one after the other, the tip of its fluffy tail sways slowly, then it slowly blinks. |
| `sit_look` | 소리 듣고 두리번 | 앉음 → 앉음 | The kitten hears a sound, turns its head to look further to the left, then glances up, then turns back with curious wide eyes. |
| `sit_tilt` | 갸우뚱 | 앉음 → 앉음 | The kitten looks at the viewer and tilts its head cutely to one side, pauses, then tilts to the other side and back to the center. |
| `sit_slowblink` | 눈인사 (천천히 깜빡) | 앉음 → 앉음 | The kitten looks at the viewer with soft eyes, slowly closes its eyes halfway in a loving slow blink, then opens them again gently. |

## 2. 행동 (가끔 나오는 동작)

| 파일명 | 상황 | 시작 → 끝 | 프롬프트 |
|---|---|---|---|
| `sit_yawn` | 하품 | 앉음 → 앉음 | The kitten opens its mouth in a big cute yawn showing its pink tongue and tiny teeth, squeezes its eyes shut, then smacks its lips and blinks contentedly. |
| `sit_wash` | 앞발 세수 | 앉음 → 앉음 | The kitten raises one front paw, licks it, then wipes the paw over its face and behind its ear twice like washing its face, then puts the paw back down. |
| `sit_scratch` | 뒷발로 귀 긁기 | 앉음 → 앉음 | The kitten lifts a hind leg and quickly scratches behind its ear, shakes its head so the little bell jingles, then sits back neatly. |
| `sit_stretch` | 기지개 | 앉음 → 앉음 | The kitten stretches its front legs forward into a long stretch with its rear up and tail raised, then sits back up neatly. |
| `sit_butterfly` | 나비 보고 톡톡 | 앉음 → 앉음 | The kitten notices a tiny butterfly fluttering in front of it on the left, follows it with its eyes and gently bats at the air with one front paw twice, then sits back calmly. (나비가 화면에 남으면 배경 제거가 안 되니, 결과에 나비가 보이면 "an invisible butterfly"로 바꿔 다시 생성) |
| `sit_knead` | 꾹꾹이 | 앉음 → 앉음 | The kitten kneads the ground with its front paws, alternating left and right softly, with half-closed happy eyes, then sits still again. |
| `sit_sneeze` | 재채기 | 앉음 → 앉음 | The kitten scrunches its little nose and does a tiny cute sneeze, blinks in surprise, then shakes its head. |
| `sit_groom` | 가슴털 그루밍 | 앉음 → 앉음 | The kitten turns its head down and licks the fluffy fur on its chest a few times, then looks back up. |

## 3. 감정 · 쓰다듬기 반응

| 파일명 | 상황 | 시작 → 끝 | 프롬프트 |
|---|---|---|---|
| `pet` | 쓰다듬 받는 중 (골골) | 앉음 → 앉음 | The kitten closes its eyes happily and leans its head up and to the side as if an invisible hand is gently stroking it, purring blissfully with a soft smile, then opens its eyes. |
| `pet_rub` | 머리 비비기 | 앉음 → 앉음 | The kitten rubs its cheek and the top of its head against an invisible hand in front of it, eyes closed in delight, then looks up happily. |
| `sit_meow` | 야옹 | 앉음 → 앉음 | The kitten looks at the viewer, perks up its ears and opens its mouth in a cute small meow, then closes its mouth and smiles. |
| `sit_startle` | 깜짝 놀람 | 앉음 → 앉음 | The kitten is slightly startled: its eyes go wide, ears perk up and it hops up a tiny bit in place, then relaxes and sits back down. |

## 4. 잠 (가끔 낮잠)

| 파일명 | 상황 | 시작 → 끝 | 프롬프트 |
|---|---|---|---|
| `sit_to_sleep` | 꾸벅꾸벅 졸다 잠들기 | 앉음 → 자는 자세 | The kitten gets sleepy, its eyes slowly close and its head nods, then it lies down, curls up and falls asleep with its head on its paws. |
| `sleep_dream` | 꿈꾸기 | 자는 자세 → 자는 자세 | The kitten sleeps curled up, breathing slowly; its paw and whiskers twitch slightly as if dreaming, and one ear flicks. |
| `sleep_wake_stretch` | 일어나 기지개 | 자는 자세 → 앉음 | The kitten wakes up, opens its eyes, stretches its front paws forward with a little yawn, then sits up neatly. |

## 5. 바닥 밑으로 숨기 · 눈치 보며 올라오기

> ✅ 지금은 **영상 없이 코드로 구현**되어 있어요(`manifest.ts`의 `hide`). 아래 프롬프트는 더 실감 나게 바꾸고 싶을 때만 사용하세요.

화면 **아래쪽 끝이 바닥**이에요. 사이트에서는 고양이가 푸터 바닥선 아래로 쏙 들어갔다가 다시 나오는 것처럼 보입니다.

| 파일명 | 상황 | 시작 → 끝 | 프롬프트 |
|---|---|---|---|
| `sit_hide` | 바닥 밑으로 쏙 숨기 | 앉음 → 빈 화면 | The kitten suddenly crouches low, flattens its ears, and quickly slides straight down below the bottom edge of the frame until it is completely hidden, with only the empty background left. |
| `hidden_peek_up` | 눈치 보며 조금씩 올라오기 | 빈 화면 → 앉음 | From below the bottom edge of the frame, the tips of the kitten's ears appear first, then its eyes peek up and nervously look left and right; it rises a little, pauses to check around cautiously, then slowly comes all the way up and sits in its usual pose. |
| `hidden_peek_duck` | 빼꼼 봤다가 다시 숨기 | 빈 화면 → 빈 화면 | From below the bottom edge of the frame, only the kitten's ears and big eyes peek up, glance around nervously, then quickly duck back down out of sight, leaving the empty background. |

---

## 만든 뒤에는

1. 영상을 **위 표의 파일명**으로 채팅에 올려 주시거나, `scripts/cat-clips/raw/` 에 넣기
2. 변환 (Kling 1280×720 기준 자르기·워터마크 제외·배경 제거가 기본값):
   ```bash
   python3 scripts/cat-clips/build_all.py
   ```
3. `src/components/cat-clips/manifest.ts`의 `clips`에 한 줄 추가
   - 평소 동작 = `kind: 'idle'`, 행동 = `'action'`, 쓰다듬기 = `'pet'`, 잠 루프 = `'sleep'`, 앉음↔잠 = `'transition'`
   - 시작·끝 프레임이 기준 자세와 달라 보이면 `fadeIn`/`fadeOut: 0.35` 추가

> 팁: 끝 프레임까지 같은 이미지를 넣어도 Kling이 마지막 0.3~0.5초에 "툭" 돌아오는 경우가 있어요. 그 부분은 제가 잘라내거나 부드럽게 이어 붙입니다.
