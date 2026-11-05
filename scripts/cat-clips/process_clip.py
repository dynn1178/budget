#!/usr/bin/env python3
"""
AI 고양이 클립 → 웹용 "투명 배경" 클립 변환기

입력: 초록(또는 단색) 배경에서 생성한 영상 (mp4/mov/webm)
출력: 위쪽 절반 = 색상, 아래쪽 절반 = 투명도(알파) 를 세로로 붙인 H.264 MP4
      → 모든 브라우저(사파리 포함)에서 ClipCat 플레이어가 투명하게 합성

주요 옵션
  --key auto|#00ff00     배경색 (auto = 첫 프레임 네 모서리 평균)
  --sim 0.16 --blend 0.08 크로마키 강도/경계 부드러움
  --width 420            출력 가로 픽셀 (세로는 비율 유지, 짝수)
  --trim 0.2:3.8         앞뒤 자르기 (초)
  --start-match IMG      시작 0.3초를 기준 프레임(IMG)에서 부드럽게 이어지게
  --end-match first|IMG  끝 0.3초를 첫 프레임(first) 또는 IMG로 수렴 → 이음새 없는 연결
  --match-dur 0.35       위 두 블렌딩 길이(초)

예)
  python3 process_clip.py raw/sit_idle.mp4 public/cat/clips/sit_idle.mp4 --end-match first
  python3 process_clip.py raw/sit_to_sleep.mp4 public/cat/clips/sit_to_sleep.mp4 \
      --start-match hubs/sit.png --end-match hubs/sleep.png
"""
import argparse, json, os, subprocess, sys, tempfile


def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        sys.stderr.write(r.stderr[-3000:])
        raise SystemExit(f"ffmpeg 실패: {' '.join(cmd[:6])} ...")
    return r.stdout


def probe(path):
    out = run(['ffprobe', '-v', 'error', '-select_streams', 'v:0', '-show_entries',
               'stream=width,height,r_frame_rate:format=duration', '-of', 'json', path])
    j = json.loads(out)
    s = j['streams'][0]
    num, den = s['r_frame_rate'].split('/')
    return int(s['width']), int(s['height']), float(num) / float(den), float(j['format']['duration'])


def auto_key(path, w, h):
    """첫 프레임 네 모서리(각 12x12)의 평균색을 배경색으로 사용"""
    raw = subprocess.run(['ffmpeg', '-v', 'error', '-i', path, '-frames:v', '1', '-f', 'rawvideo',
                          '-pix_fmt', 'rgb24', '-'], capture_output=True).stdout
    px = []
    for (x0, y0) in [(2, 2), (w - 14, 2), (2, h - 14), (w - 14, h - 14)]:
        for y in range(y0, y0 + 12):
            for x in range(x0, x0 + 12):
                i = (y * w + x) * 3
                px.append(raw[i:i + 3])
    r = sum(p[0] for p in px) // len(px)
    g = sum(p[1] for p in px) // len(px)
    b = sum(p[2] for p in px) // len(px)
    return f'0x{r:02x}{g:02x}{b:02x}'


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('input'); ap.add_argument('output')
    ap.add_argument('--key', default='auto')
    ap.add_argument('--sim', type=float, default=0.16)
    ap.add_argument('--blend', type=float, default=0.08)
    ap.add_argument('--width', type=int, default=420)
    ap.add_argument('--fps', type=int, default=30)
    ap.add_argument('--trim', default=None, help='start:end (초)')
    ap.add_argument('--start-match', default=None)
    ap.add_argument('--end-match', default=None, help="'first' 또는 이미지 경로")
    ap.add_argument('--match-dur', type=float, default=0.35)
    ap.add_argument('--crf', type=int, default=22)
    a = ap.parse_args()

    w, h, fps, dur = probe(a.input)
    key = auto_key(a.input, w, h) if a.key == 'auto' else '0x' + a.key.lstrip('#')
    t0, t1 = 0.0, dur
    if a.trim:
        s, e = a.trim.split(':')
        t0 = float(s or 0); t1 = float(e) if e else dur
    L = t1 - t0
    W = a.width - a.width % 2
    md = min(a.match_dur, L / 3)

    with tempfile.TemporaryDirectory() as td:
        # 1) 정규화 (fps, 크기, 자르기) → 무손실 중간 파일
        base = os.path.join(td, 'base.mkv')
        run(['ffmpeg', '-y', '-v', 'error', '-ss', str(t0), '-t', str(L), '-i', a.input,
             '-vf', f'fps={a.fps},scale={W}:-2:flags=lanczos', '-an', '-c:v', 'ffv1', base])

        def still(img_or_first, out):
            if img_or_first == 'first':
                run(['ffmpeg', '-y', '-v', 'error', '-i', base, '-frames:v', '1', out])
            else:
                run(['ffmpeg', '-y', '-v', 'error', '-i', img_or_first, '-vf', f'scale={W}:-2:flags=lanczos', '-frames:v', '1', out])

        cur = base
        # 2) 끝 프레임 맞추기: 마지막 md초를 기준 프레임으로 크로스페이드
        if a.end_match:
            img = os.path.join(td, 'end.png'); still(a.end_match, img)
            out = os.path.join(td, 'endm.mkv')
            run(['ffmpeg', '-y', '-v', 'error', '-i', cur, '-loop', '1', '-t', str(md + 0.2), '-framerate', str(a.fps), '-i', img,
                 '-filter_complex', f'[1]scale={W}:-2,format=yuv420p,setsar=1,fps={a.fps},settb=1/{a.fps}[s];[0]format=yuv420p,setsar=1,fps={a.fps},settb=1/{a.fps}[v];'
                 f'[v][s]xfade=transition=fade:duration={md}:offset={L - md:.3f},trim=duration={L:.3f}',
                 '-an', '-c:v', 'ffv1', out])
            cur = out
        # 3) 시작 프레임 맞추기: 처음 md초를 기준 프레임에서 크로스페이드로 시작
        if a.start_match:
            img = os.path.join(td, 'start.png'); still(a.start_match, img)
            out = os.path.join(td, 'startm.mkv')
            run(['ffmpeg', '-y', '-v', 'error', '-loop', '1', '-t', str(md), '-framerate', str(a.fps), '-i', img, '-i', cur,
                 '-filter_complex', f'[0]scale={W}:-2,format=yuv420p,setsar=1,fps={a.fps},settb=1/{a.fps}[s];[1]format=yuv420p,setsar=1,fps={a.fps},settb=1/{a.fps}[v];'
                 f'[s][v]xfade=transition=fade:duration={md}:offset=0,trim=duration={L:.3f}',
                 '-an', '-c:v', 'ffv1', out])
            cur = out

        # 4) 크로마키 → 색상(초록 번짐 제거) + 알파 → 세로로 붙이기
        os.makedirs(os.path.dirname(os.path.abspath(a.output)), exist_ok=True)
        fc = (f'[0]format=rgb24,split[c][k];'
              f'[k]chromakey={key}:{a.sim}:{a.blend},format=yuva420p,alphaextract,'
              f'erosion,boxblur=1:1[al];'
              f'[c]despill=type=green:mix=0.6:expand=0.2,format=yuv420p[col];'
              f'[al]format=yuv420p[alp];[col][alp]vstack')
        run(['ffmpeg', '-y', '-v', 'error', '-i', cur, '-filter_complex', fc,
             '-c:v', 'libx264', '-preset', 'slow', '-crf', str(a.crf), '-pix_fmt', 'yuv420p',
             '-movflags', '+faststart', '-an', a.output])
        # 5) 포스터(첫 프레임, 색상 절반)
        run(['ffmpeg', '-y', '-v', 'error', '-i', a.output, '-frames:v', '1', '-vf', 'crop=iw:ih/2:0:0',
             os.path.splitext(a.output)[0] + '.jpg'])

    ow, oh, _, od = probe(a.output)
    print(f'✓ {a.output}  {ow}x{oh // 2} (+알파)  {od:.2f}s  key={key}  {os.path.getsize(a.output) // 1024}KB')


if __name__ == '__main__':
    main()
