from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageFilter, ImageOps


def _resize_cover(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(im, size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def _resize_contain(im: Image.Image, size: tuple[int, int]) -> Image.Image:
    im_copy = im.copy()
    im_copy.thumbnail(size, Image.Resampling.LANCZOS)
    return im_copy


def main() -> None:
    repo_root = Path(__file__).resolve().parents[1]

    src = repo_root / "public" / "assets" / "welcome" / "header_2026_newyear.png"
    if not src.exists():
        raise SystemExit(f"Missing source image: {src}")

    out_dir = repo_root / "public" / "assets" / "story"
    out_dir.mkdir(parents=True, exist_ok=True)

    out = out_dir / "ccjm_story_1080x1920.png"

    target_size = (1080, 1920)

    im = Image.open(src).convert("RGBA")

    # Background: cover + blur (keeps design consistent without introducing new colors)
    bg = _resize_cover(im, target_size).filter(ImageFilter.GaussianBlur(radius=18))

    # Foreground: contain (preserve original aspect), centered vertically
    fg = _resize_contain(im, (1080, 1920))
    canvas = Image.new("RGBA", target_size, (0, 0, 0, 255))
    canvas.paste(bg, (0, 0))

    x = (target_size[0] - fg.size[0]) // 2
    y = (target_size[1] - fg.size[1]) // 2
    canvas.paste(fg, (x, y), fg)

    canvas.convert("RGB").save(out, format="PNG", optimize=True)
    print(f"Wrote: {out} ({target_size[0]}x{target_size[1]})")


if __name__ == "__main__":
    main()
