#!/usr/bin/env python3
"""
raw/ 폴더의 AI 클립을 한 번에 웹용 투명 클립으로 변환합니다.

폴더 구조
  scripts/cat-clips/raw/<클립id>.mp4     ← AI로 만든 원본 (초록 배경)
  scripts/cat-clips/hubs/sit.png         ← 앉은 기본 자세 이미지 (모든 sit 클립의 시작/끝 프레임)
  scripts/cat-clips/hubs/sleep.png       ← 자는 자세 이미지

실행
  python3 scripts/cat-clips/build_all.py            # raw/ 에 있는 것만 변환
  python3 scripts/cat-clips/build_all.py --width 420

결과는 public/cat/clips/<클립id>.mp4 (+ .jpg 포스터) 로 저장됩니다.
"""
import argparse, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))

# 클립id: (시작 허브, 끝 허브)  — manifest.ts 와 같은 이름
CLIPS = {
    'sit_idle': ('sit', 'sit'),
    'sit_look': ('sit', 'sit'),
    'sit_wash': ('sit', 'sit'),
    'sit_groom': ('sit', 'sit'),
    'sit_yawn': ('sit', 'sit'),
    'pet': ('sit', 'sit'),
    'sit_to_sleep': ('sit', 'sleep'),
    'sleep_loop': ('sleep', 'sleep'),
    'sleep_to_sit': ('sleep', 'sit'),
}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--raw', default=os.path.join(HERE, 'raw'))
    ap.add_argument('--hubs', default=os.path.join(HERE, 'hubs'))
    ap.add_argument('--out', default=os.path.join(ROOT, 'public', 'cat', 'clips'))
    ap.add_argument('--width', type=int, default=420)
    ap.add_argument('--sim', default='0.16')
    a = ap.parse_args()

    done = 0
    for cid, (h0, h1) in CLIPS.items():
        src = next((os.path.join(a.raw, cid + ext) for ext in ('.mp4', '.mov', '.webm') if os.path.exists(os.path.join(a.raw, cid + ext))), None)
        if not src:
            continue
        cmd = [sys.executable, os.path.join(HERE, 'process_clip.py'), src, os.path.join(a.out, cid + '.mp4'),
               '--width', str(a.width), '--sim', a.sim]
        for flag, hub in (('--start-match', h0), ('--end-match', h1)):
            img = os.path.join(a.hubs, hub + '.png')
            if os.path.exists(img):
                cmd += [flag, img]
            elif h0 == h1:
                cmd += ['--end-match', 'first'] if flag == '--end-match' else []
        subprocess.run(cmd, check=True)
        done += 1
    print(f'\n{done}개 클립 변환 완료 → {a.out}')
    print('※ manifest.ts 의 frame 크기를 위에 출력된 크기(가로x세로)로 맞춰 주세요.')


if __name__ == '__main__':
    main()
