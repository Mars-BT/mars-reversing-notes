import argparse
import json
from pathlib import Path

import cv2 as cv
import numpy as np


def load_background(path: Path) -> np.ndarray:
    image = cv.imread(str(path), cv.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"无法读取背景图: {path}")
    return image


def load_slider(path: Path) -> tuple[np.ndarray, np.ndarray]:
    image = cv.imread(str(path), cv.IMREAD_UNCHANGED)
    if image is None:
        raise FileNotFoundError(f"无法读取滑块图: {path}")
    if image.ndim == 2:
        image = cv.cvtColor(image, cv.COLOR_GRAY2BGRA)
    if image.shape[2] == 4:
        bgr = image[:, :, :3]
        alpha = image[:, :, 3]
    else:
        bgr = image
        gray = cv.cvtColor(bgr, cv.COLOR_BGR2GRAY)
        _, alpha = cv.threshold(gray, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
    return bgr, alpha


def resize_background(image: np.ndarray, size: tuple[int, int]) -> np.ndarray:
    width, height = size
    return cv.resize(image, (width, height), interpolation=cv.INTER_AREA)


def resize_slider(
    slider: np.ndarray,
    mask: np.ndarray,
    target_height: int,
    scale_x: float,
) -> tuple[np.ndarray, np.ndarray]:
    height, width = slider.shape[:2]
    new_height = target_height
    new_width = max(1, int(round(width * scale_x)))
    slider_resized = cv.resize(slider, (new_width, new_height), interpolation=cv.INTER_AREA)
    mask_resized = cv.resize(mask, (new_width, new_height), interpolation=cv.INTER_NEAREST)
    return slider_resized, mask_resized


def find_best_match(background: np.ndarray, slider: np.ndarray, mask: np.ndarray) -> tuple[int, int]:
    try:
        result = cv.matchTemplate(background, slider, cv.TM_CCORR_NORMED, mask=mask)
        _, _, _, max_loc = cv.minMaxLoc(result)
        return max_loc
    except cv.error:
        bg_gray = cv.cvtColor(background, cv.COLOR_BGR2GRAY)
        slider_gray = cv.cvtColor(slider, cv.COLOR_BGR2GRAY)
        bg_edges = cv.Canny(bg_gray, 60, 180)
        slider_edges = cv.Canny(slider_gray, 60, 180)
        result = cv.matchTemplate(bg_edges, slider_edges, cv.TM_CCOEFF_NORMED)
        _, _, _, max_loc = cv.minMaxLoc(result)
        return max_loc


def overlay_slider(background: np.ndarray, slider: np.ndarray, mask: np.ndarray, x: int, y: int) -> np.ndarray:
    h, w = slider.shape[:2]
    result = background.copy()
    roi = result[y : y + h, x : x + w]
    alpha = (mask.astype(np.float32) / 255.0)[:, :, None]
    blended = roi.astype(np.float32) * (1.0 - alpha) + slider.astype(np.float32) * alpha
    result[y : y + h, x : x + w] = blended.astype(np.uint8)
    return result


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


def find_gap_rect(clean: np.ndarray, target: np.ndarray) -> tuple[int, int, int, int]:
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
    return cv.boundingRect(largest)


def find_background_path(folder: Path) -> Path:
    for name in ("background.png", "backrgound.png"):
        candidate = folder / name
        if candidate.exists():
            return candidate
    raise FileNotFoundError(f"未找到背景图: {folder}")


def process_folder(folder: Path, clean: np.ndarray) -> None:
    background_path = find_background_path(folder)
    slider_path = folder / "slider.png"
    background = load_background(background_path)
    slider, mask = load_slider(slider_path)
    target_width, target_height = 260, 159
    scale_x = target_width / background.shape[1]
    background = resize_background(background, (target_width, target_height))
    clean_resized = resize_background(clean, (target_width, target_height))
    slider, mask = resize_slider(slider, mask, target_height, scale_x)
    if background.shape[0] != slider.shape[0]:
        raise ValueError(f"高度不一致: {folder}")
    if slider.shape[1] > background.shape[1]:
        raise ValueError(f"滑块宽度超过背景: {folder}")
    mask_rect = cv.boundingRect(mask)
    gap_rect = find_gap_rect(clean_resized, background)
    adjusted_x = gap_rect[0] - mask_rect[0]
    adjusted_x = max(0, min(adjusted_x, background.shape[1] - slider.shape[1]))
    merged = overlay_slider(background, slider, mask, adjusted_x, 0)
    merged = draw_square(merged, gap_rect)
    output_image = folder / "merged.png"
    if not cv.imwrite(str(output_image), merged):
        raise RuntimeError(f"保存失败: {output_image}")
    output_json = folder / "result.json"
    output_json.write_text(json.dumps({"x": int(adjusted_x)}, ensure_ascii=False), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--dir",
        type=Path,
        default=Path("/Users/mingmoo/Reverse/yxai.189.cn/demo/验证"),
    )
    parser.add_argument(
        "--clean",
        type=Path,
        default=Path("/Users/mingmoo/Reverse/yxai.189.cn/demo/滑块背景图/background_clean.png"),
    )
    args = parser.parse_args()
    clean = load_background(args.clean)
    folders = sorted([p for p in args.dir.iterdir() if p.is_dir()])
    if not folders:
        raise FileNotFoundError("未找到验证文件夹")
    for folder in folders:
        process_folder(folder, clean)


if __name__ == "__main__":
    main()
