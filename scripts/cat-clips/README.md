# 검은 아기고양이 AI 클립 제작 가이드

푸터 고양이(`ClipCat`)는 짧은 동작 영상 여러 개를 이어 붙여 살아있는 것처럼 보여줍니다.
**모든 클립이 같은 "기본 자세" 프레임에서 시작하고 끝나기 때문에** 클립이 바뀌어도 이음새가 보이지 않아요.

```
            ┌── sit_idle / sit_look / sit_wash / sit_groom / sit_yawn / pet ──┐
            │                       (앉은 자세 → 앉은 자세)                      │
  [sit 앉은 자세] ◀───────────────────────────────────────────────────────────┘
       │  ▲
 sit_to_sleep  sleep_to_sit
       ▼  │
  [sleep 자는 자세] ◀── sleep_loop (자는 자세 → 자는 자세)
```

---

## 1단계. 기본 자세 이미지 2장 만들기 (가장 중요)

레퍼런스 이미지를 첨부해서 이미지 AI(ChatGPT 이미지, Nano Banana, Midjourney 등)로 만듭니다.
**두 장 모두 같은 구도·크기·배경**이어야 해요.

| 파일 | 프롬프트 |
|---|---|
| `hubs/sit.png` | Use the attached kitten as the exact character reference: same black fluffy kitten, big yellow eyes, pink-red collar with a gold bell. Full body, **sitting**, body at a 3/4 angle facing left, head turned toward the viewer, tail curled up behind. Centered, whole body visible with small margins, kitten fills about 75% of the frame height. **Plain flat chroma-green background (#00FF00), no floor, no shadow, no text.** Soft even studio lighting, Pixar-style 3D render. 4:3 aspect ratio. |
| `hubs/sleep.png` | (위와 같은 고양이·카메라·배경) The same kitten **curled up asleep** on the same spot, eyes closed, head resting on its front paws, tail wrapped around its body. Same camera, framing and lighting as the sitting image. Plain flat chroma-green background (#00FF00), no floor, no shadow. 4:3. |

> 팁: 이마의 흰 무늬는 넣지 않아도 됩니다. 초록 배경에 초록색 소품이 없도록 주의하세요.

---

## 2단계. 동작 클립 만들기 (이미지 → 영상 AI)

**시작 프레임 + 끝 프레임**을 지정할 수 있는 영상 AI를 쓰세요.
(Kling의 Start/End frame, Veo 3.1의 first/last frame, Runway·Luma의 keyframe 기능 등)

- 시작 프레임과 끝 프레임 = 아래 표의 허브 이미지
- 길이 4~6초, 16:9가 아니라 **허브 이미지와 같은 비율**
- 모든 프롬프트 끝에 **공통 문구**를 붙이세요:

> *Static locked-off camera, no camera movement, no zoom. The kitten stays in the same spot. Plain flat chroma-green background (#00FF00) the whole time, no shadow, no floor. Smooth, natural, realistic cat motion. Ends in exactly the same pose as the final frame.*

| 클립 id (파일명) | 시작 → 끝 | 프롬프트 (공통 문구 앞에) |
|---|---|---|
| `sit_idle` | sit → sit | The kitten sits calmly, breathing softly, slowly blinks once, one ear twitches, the tip of its tail sways gently. |
| `sit_look` | sit → sit | The kitten curiously looks to the left, then to the right, tilts its head cutely, then looks back at the viewer. |
| `sit_wash` | sit → sit | The kitten lifts one front paw, licks it twice, then wipes the paw over its face and behind its ear like washing its face, then puts the paw back down. |
| `sit_groom` | sit → sit | The kitten turns its head and licks the fur on its chest and shoulder a few times, then looks back at the viewer. |
| `sit_yawn` (선택) | sit → sit | The kitten opens its mouth in a big cute yawn showing its pink tongue, squints its eyes, then blinks contentedly. |
| `pet` | sit → sit | The kitten closes its eyes happily and leans its head up and to the side as if an invisible hand is gently stroking it, purring blissfully, then opens its eyes again. |
| `sit_to_sleep` | sit → sleep | The kitten slowly lies down, curls up, tucks its paws, rests its head on its front paws and closes its eyes. |
| `sleep_loop` | sleep → sleep | The kitten sleeps peacefully, its body gently rising and falling with slow breaths, one ear twitches slightly. |
| `sleep_to_sit` | sleep → sit | The kitten wakes up, opens its eyes, stretches its front paws forward with a little yawn, then sits up. |

> 팁
> - 각 클립을 2~3번 생성해서 가장 자연스럽고 생김새가 일정한 것을 고르세요.
> - 끝 프레임이 허브와 조금 달라도 괜찮아요. 변환 스크립트가 마지막 0.35초를 허브 이미지로 부드럽게 맞춰 줍니다.
> - 앞뒤에 불필요한 부분이 있으면 `--trim 0.3:4.5` 처럼 잘라낼 수 있어요.

---

## 3단계. 변환 (초록 배경 제거 → 웹용 투명 클립)

```
scripts/cat-clips/
├── raw/      ← 생성한 영상을 "클립id.mp4" 이름으로 넣기 (git 제외)
│   ├── sit_idle.mp4
│   └── ...
└── hubs/
    ├── sit.png
    └── sleep.png
```

```bash
python3 scripts/cat-clips/build_all.py --width 420
```

- 결과: `public/cat/clips/<클립id>.mp4` (위 절반 색상 + 아래 절반 투명도) 와 `.jpg` 포스터
- 출력된 크기(예: `420x316`)를 `src/components/cat-clips/manifest.ts`의 `frame`에 적어 주세요.
- 배경이 덜 지워지면 `--sim 0.2`, 고양이 털이 깎이면 `--sim 0.12` 로 조절
- 클립 하나만 다시 만들 때는 `process_clip.py` 를 직접 실행 (`--help` 참고)

## 4단계. 사이트에 넣기

```tsx
import ClipCat from '@/components/cat-clips/ClipCat'

<footer className="relative">
  <ClipCat align="right" width={200} />
</footer>
```

- `sit_yawn` 등 클립을 추가했다면 `manifest.ts`의 `clips`에 한 줄 추가
- 쓰다듬기 영역이 고양이와 안 맞으면 `manifest.ts`의 `hit`(0~1 비율 타원)을 조정

---

## 참고: 영상 1개에서 여러 클립 잘라 쓰기 (현재 적용된 방식)

Kling 영상 1개(앉기 → 두리번 → 앞발 핥기 → 하품 → 엎드려 잠들기)를 잘라 6개 클립을 만들었습니다.

| 클립 | 구간 | 만드는 법 |
|---|---|---|
| `sit_idle` | 0.0–0.9초 | 정방향 + 역방향(핑퐁) → 끊김 없는 루프 |
| `sit_wash` | 0.0–2.25초 | 정방향, 끝은 재생 중 크로스페이드(`fadeOut`) |
| `pet` | 2.2–3.05초 | 핑퐁, 들어갈 때·나올 때 크로스페이드 |
| `sit_to_sleep` | 0.0–3.6초 | 정방향 (끝 프레임 = 자는 자세 허브) |
| `sleep_loop` | 3.6–4.45초 | 핑퐁 |
| `sleep_to_sit` | 3.6→2.3초 | 역재생(일어나기) + `fadeOut` |

```bash
CROP="crop=1000:672:128:0"   # 고양이 전체 포함 + 오른쪽 아래 Kling 워터마크 제외
# 핑퐁 예시
ffmpeg -ss 0 -t 0.9 -i clip.mp4 -an -filter_complex "[0]$CROP,split[a][b];[b]reverse[r];[a][r]concat=n=2:v=1" sit_idle.mp4
python3 scripts/cat-clips/process_clip.py sit_idle.mp4 public/cat/clips/sit_idle.mp4 --key 4ea252 --width 420
```

- 배경 제거는 기본값(`--keyer excess`, 초록이 빨강·파랑보다 얼마나 강한지로 판단)을 쓰세요. 검은 털이 지워지지 않습니다.
- 자세 차이가 큰 클립에 `--start-match/--end-match`를 쓰면 배경과 섞인 얼룩이 생길 수 있어요 → 대신 `manifest.ts`의 `fadeIn/fadeOut` 사용.
