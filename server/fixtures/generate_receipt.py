"""Generate the synthetic receipt fixture locally; requires Pillow, no network."""
from pathlib import Path
import os

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT / "synthetic-paid-receipt.png"


def font(size: int, bold: bool = False):
    windows = Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts"
    candidates = [
        "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf",
        str(windows / ("arialbd.ttf" if bold else "arial.ttf")),
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
    ]
    for candidate in candidates:
        try:
            return ImageFont.truetype(candidate, size)
        except OSError:
            pass
    return ImageFont.load_default(size=size)


def main():
    image = Image.new("RGB", (1000, 1140), "white")
    draw = ImageDraw.Draw(image)
    draw.rectangle((24, 24, 975, 1115), outline="black", width=3)

    def centered(text, y, size=36, bold=False):
        draw.text((500, y), text, font=font(size, bold), fill="black", anchor="mt")

    centered("SYNTHETIC RECEIPT", 65, 32, True)
    centered("NOT A REAL PURCHASE", 112, 26)
    centered("KES EFLY CAFE", 185, 58, True)
    centered("PAID", 280, 64, True)
    draw.line((75, 380, 925, 380), fill="black", width=3)
    draw.text((80, 425), "Coffee x 1", font=font(38), fill="black")
    draw.text((920, 425), "65,000 VND", font=font(38), fill="black", anchor="rt")
    draw.line((75, 520, 925, 520), fill="black", width=3)
    centered("TOTAL 65,000 VND", 570, 58, True)
    centered("Payment completed", 665, 36, True)
    centered("Date: 2026-11-14", 755, 38)
    centered("Time: 15:00:00 (UTC+07:00)", 820, 38)
    centered("Asia/Ho_Chi_Minh", 880, 30)
    centered("Fixture reference: DEMO-RECEIPT-001", 1000, 26)
    image.save(OUTPUT, format="PNG", optimize=True)
    if OUTPUT.stat().st_size > 2 * 1024 * 1024:
        raise RuntimeError("Synthetic receipt exceeds the callable image limit")
    print(f"Generated {OUTPUT.name}: {image.width}x{image.height}, {OUTPUT.stat().st_size} bytes")


if __name__ == "__main__":
    main()
