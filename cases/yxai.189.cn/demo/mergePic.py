'''
以中为界，合并两张图片，左边的图片合并到右边的图片的左边
'''
import argparse
from pathlib import Path

import cv2 as cv
import numpy as np


def load_image(path: Path) -> np.ndarray:
    image = cv.imread(str(path), cv.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"无法读取图片: {path}")
    return image


def merge_clean_background(image_left: np.ndarray, image_right: np.ndarray) -> np.ndarray:
    if image_left.shape != image_right.shape:
        raise ValueError("两张图片尺寸不一致，无法合成")

    height, width = image_left.shape[:2]
    mid = width // 2

    left_part = image_right[:, :mid]
    right_part = image_left[:, mid:]
    result = np.concatenate([left_part, right_part], axis=1)
    return result


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("image_left", type=Path)
    parser.add_argument("image_right", type=Path)
    parser.add_argument(
        "-o",
        "--output",
        type=Path,
        default=Path("/Users/mingmoo/Reverse/yxai.189.cn/demo/滑块背景图/background_clean.png"),
    )
    args = parser.parse_args()

    image_left = load_image(args.image_left)
    image_right = load_image(args.image_right)
    result = merge_clean_background(image_left, image_right)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    if not cv.imwrite(str(args.output), result):
        raise RuntimeError(f"保存失败: {args.output}")


if __name__ == "__main__":
    main()
