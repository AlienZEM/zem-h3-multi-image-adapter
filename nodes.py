"""Optional uploads for the stock LOCAL MiniMaxH3ReferenceToVideo node."""
import hashlib
from pathlib import Path

import folder_paths
from nodes import LoadImage


def selected_files(values):
    return [(i, str(values.get(f"image_{i}") or "").strip())
            for i in range(1, 10)
            if str(values.get(f"image_{i}") or "").strip()]


def checked_path(name):
    # Only input-directory uploads; do not permit arbitrary host file reads.
    root = Path(folder_paths.get_input_directory()).resolve()
    path = (root / name).resolve()
    if not path.is_relative_to(root) or not path.is_file():
        raise ValueError(f"Reference image is missing or outside the input folder: {name}")
    return path


class ZEMH3ReferenceUploads:
    CATEGORY = "ZEM/MiniMax H3"
    FUNCTION = "load"
    RETURN_TYPES = ("IMAGE",) * 9 + ("INT", "STRING")
    RETURN_NAMES = tuple(f"picture_{i}" for i in range(1, 10)) + ("image_count", "reference_tags")
    DESCRIPTION = "Upload 1–9 references. Empty outputs are None; connect only to the local H3 reference node, which skips them."

    @classmethod
    def INPUT_TYPES(cls):
        return {"required": {f"image_{i}": ("STRING", {"default": "", "tooltip": "ComfyUI input-relative filename; blank means unused."})
                             for i in range(1, 10)}}

    @classmethod
    def VALIDATE_INPUTS(cls, **kwargs):
        try:
            selected = selected_files(kwargs)
            if not selected:
                return "Upload at least one reference image."
            for _, name in selected:
                checked_path(name)
            return True
        except ValueError as exc:
            return str(exc)

    @classmethod
    def IS_CHANGED(cls, **kwargs):
        digest = hashlib.sha256()
        for slot, name in selected_files(kwargs):
            digest.update(f"{slot}:{name}\0".encode())
            try:
                with checked_path(name).open("rb") as stream:
                    for block in iter(lambda: stream.read(1024 * 1024), b""):
                        digest.update(block)
            except ValueError:
                return float("nan")
        return digest.hexdigest()

    def load(self, **kwargs):
        selected = selected_files(kwargs)
        if not selected:
            raise ValueError("Upload at least one reference image.")
        images, tags = [], []
        for index, (slot, name) in enumerate(selected, 1):
            checked_path(name)
            try:
                image, _ = LoadImage().load_image(name)
            except Exception as exc:
                raise ValueError(f"Could not load reference in slot {slot}: {name}") from exc
            if image.shape[0] != 1:
                raise ValueError(f"Slot {slot}: use a still image, not an animated image.")
            images.append(image)
            tags.append(f"<Picture {index}> = slot {slot}: {name}")
        return tuple(images + [None] * (9 - len(images))) + (len(images), "\n".join(tags))
