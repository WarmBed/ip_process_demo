"""Record HTML animations as GIF using Playwright + Pillow"""
import os, glob, shutil, subprocess, sys

DIR = os.path.dirname(os.path.abspath(__file__))

PAGES = [
    {"file": "01_auto_filing.html",       "out": "01_auto_filing.gif",       "duration": 13, "fps": 8},
    {"file": "02_human_confirm_llm.html",  "out": "02_human_confirm_llm.gif", "duration": 15, "fps": 8},
    {"file": "03_control_center.html",     "out": "03_control_center.gif",    "duration": 13, "fps": 8},
]

def record_page(conf):
    from playwright.sync_api import sync_playwright
    from PIL import Image

    file_path = os.path.join(DIR, conf["file"])
    out_path = os.path.join(DIR, conf["out"])
    frames_dir = os.path.join(DIR, f"_frames_{conf['file'].replace('.html','')}")
    os.makedirs(frames_dir, exist_ok=True)

    interval_ms = int(1000 / conf["fps"])
    total_frames = conf["duration"] * conf["fps"]
    hold_frames = conf["fps"] * 3  # hold last 3 sec

    print(f"  Opening {conf['file']}...")

    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(viewport={"width": 1280, "height": 720})
        page = ctx.new_page()

        url = "file:///" + file_path.replace("\\", "/")
        page.goto(url)
        page.wait_for_timeout(800)  # wait for fonts

        print(f"  Recording {total_frames} frames @ {conf['fps']} fps...")

        for i in range(total_frames):
            frame_path = os.path.join(frames_dir, f"frame_{i:04d}.png")
            page.screenshot(path=frame_path)
            page.wait_for_timeout(interval_ms)

        # Hold last frame
        last_frame = os.path.join(frames_dir, f"frame_{total_frames-1:04d}.png")
        for i in range(total_frames, total_frames + hold_frames):
            frame_path = os.path.join(frames_dir, f"frame_{i:04d}.png")
            shutil.copy2(last_frame, frame_path)

        browser.close()

    # Convert to GIF
    print(f"  Converting {total_frames + hold_frames} frames to GIF...")
    frame_files = sorted(glob.glob(os.path.join(frames_dir, "frame_*.png")))
    frames = [Image.open(f).convert("RGB").quantize(256).convert("RGB") for f in frame_files]

    frames_p = [f.convert("P", palette=Image.ADAPTIVE, colors=256) for f in frames]
    frames_p[0].save(
        out_path,
        save_all=True,
        append_images=frames_p[1:],
        duration=interval_ms,
        loop=0,
        optimize=True,
    )

    # Cleanup
    shutil.rmtree(frames_dir)
    size_mb = os.path.getsize(out_path) / 1024 / 1024
    print(f"  Done: {conf['out']} ({size_mb:.1f} MB, {total_frames + hold_frames} frames)")


if __name__ == "__main__":
    # Check playwright installed
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        print("Installing playwright...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "playwright"])
        subprocess.check_call([sys.executable, "-m", "playwright", "install", "chromium"])

    from PIL import Image

    for conf in PAGES:
        print(f"\n{'='*50}")
        print(f"Recording: {conf['file']}")
        print(f"{'='*50}")
        record_page(conf)

    print(f"\nAll GIFs saved to: {DIR}")
