# 강아지(아기 말티즈) 클립 원본 구간 (public/dog/clips)

원본: Kling 영상 M1~M6 (1124×840, 5초). 워터마크 영역(x 936~1108, y 782~826)을 배경색으로 칠한 뒤 전체 프레임 사용 → `process_clip.py --key 409341 --width 420` → 420×314

| 클립 id | 원본 | 구간(초) | 동작 |
|---|---|---|---|
| dog_look_around | M1 | 0.0–1.0 왕복 | 두리번두리번 |
| dog_head_tilt | M1 | 1.0–2.1 | 갸우뚱 + 귀 쫑긋 |
| dog_tongue_blep | M1 | 2.1–3.1 | 혀 쏙 |
| dog_look_down | M1 | 3.1–5.0 | 눈 깜빡 + 발 내려다보기 |
| dog_yawn | M2 | 0.0–1.3 | 하품 + 재채기 |
| dog_scratch | M2 | 1.3–2.0 | 뒷발로 귀 긁기 |
| dog_paw_lick | M2 | 2.0–2.6 | 앞발 핥기 |
| dog_shake | M2 | 2.6–5.0 | 꼬리 깨물기 + 온몸 털기 |
| dog_play_bow | M3 | 0.0–1.6 | 놀자 자세 + 멍 |
| dog_hop | M3 | 1.6–2.4 | 두 발로 콩콩 |
| dog_spin | M3 | 2.4–3.4 | 꼬리 쫓아 한 바퀴 |
| dog_happy_pant | M3 | 3.4–5.0 | 혀 내밀고 헥헥 |
| dog_treat | M4 | 0.0–5.0 | 간식 전체 (주세요→냠냠→입맛→고마워) |
| dog_beg | M4 | 0.0–1.15 | 주세요 + 간식 떨어짐 |
| dog_treat_eat | M4 | 1.15–2.15 | 냠냠 |
| dog_lick_lips | M4 | 2.15–3.1 | 입맛 다시기 |
| dog_thank_paw | M4 | 3.1–5.0 | 앞발 들고 웃기 |
| dog_pet_happy | M5 | 0.0–0.95 | 쓰다듬 반응 |
| dog_paw_shake | M5 | 0.95–1.9 | 손! |
| dog_doze_off | M5 | 1.9–2.6 | 꾸벅꾸벅 엎드리기 |
| dog_nap_loop | M5 | 2.6–3.35 왕복 | 쌔근쌔근 |
| dog_wake_stretch | M5 | 3.35–5.0 | 기지개 + 하품, 앉기 |
| dog_hide_peek | M6 | 0.0–5.0 | 숨바꼭질 전체 |
| dog_hide | M6 | 0.0–0.9 | 쏙 숨기 |
| dog_peek | M6 | 0.9–2.95 | 앞발 걸치고 빼꼼 |
| dog_climb_up | M6 | 2.95–5.0 | 영차 올라와 앉기 |
