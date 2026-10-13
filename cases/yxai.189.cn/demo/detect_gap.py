import argparse
from pathlib import Path

import cv2 as cv
import numpy as np


def load_image(path: Path) -> np.ndarray:
    image = cv.imread(str(path), cv.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"无法读取图片: {path}")
    return image


def find_gap_rect(clean: np.ndarray, target: np.ndarray) -> tuple[int, int, int, int]:
    if clean.shape != target.shape:
        raise ValueError("两张图片尺寸不一致，无法比对")

    gray_clean = cv.cvtColor(clean, cv.COLOR_BGR2GRAY)
    gray_target = cv.cvtColor(target, cv.COLOR_BGR2GRAY)
    diff = cv.absdiff(gray_clean, gray_target)
    diff = cv.GaussianBlur(diff, (5, 5), 0)
    _, binary = cv.threshold(diff, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
    kernel = cv.getStructuringElement(cv.MORPH_RECT, (5, 5))
    binary = cv.morphologyEx(binary, cv.MORPH_CLOSE, kernel, iterations=2)

    contours, _ = cv.findContours(binary, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE)
    if not contours:
        raise RuntimeError("未找到缺口轮廓")

    largest = max(contours, key=cv.contourArea)
    x, y, w, h = cv.boundingRect(largest)
    return x, y, w, h


def draw_square(image: np.ndarray, rect: tuple[int, int, int, int]) -> np.ndarray:
    x, y, w, h = rect
    size = max(w, h)
    cx = x + w // 2
    cy = y + h // 2
    x1 = max(0, cx - size // 2)
    y1 = max(0, cy - size // 2)
    x2 = min(image.shape[1] - 1, x1 + size)
    y2 = min(image.shape[0] - 1, y1 + size)
    result = image.copy()
    cv.rectangle(result, (x1, y1), (x2, y2), (0, 0, 255), 2)
    return result


def show_gap_window(clean_path: Path, target_path: Path) -> None:
    clean = load_image(clean_path)
    target = load_image(target_path)
    rect = find_gap_rect(clean, target)
    marked = draw_square(target, rect)
    cv.imshow(target_path.name, marked)
    cv.waitKey(0)
    cv.destroyAllWindows()


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "target",
        type=Path,
        help="缺口背景图路径",
    )
    parser.add_argument(
        "--clean",
        type=Path,
        default=Path("/Users/mingmoo/Reverse/yxai.189.cn/demo/滑块背景图/background_clean.png"),
    )
    args = parser.parse_args()
    show_gap_window(args.clean, args.target)


if __name__ == "__main__":
    main()

# python3 /Users/mingmoo/Reverse/yxai.189.cn/demo/detect_gap.py /Users/mingmoo/Reverse/yxai.189.cn/demo/滑块背景图/background1.png