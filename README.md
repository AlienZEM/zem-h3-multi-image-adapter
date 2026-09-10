# ZEM Alien Adapter

Nine upload slots for the **local, stock `MiniMaxH3ReferenceToVideo`** node. Upload between one and nine still images; unused slots produce `None`, which the current stock H3 node skips. No blank images, duplication, API calls, or model changes.

## Install on your pod

Run these commands in your pod terminal (adjust the ComfyUI path):

```bash
cd /workspace/ComfyUI/custom_nodes
git clone https://github.com/AlienZEM/zem-alien-adapter.git
```

1. The installed folder should be `ComfyUI/custom_nodes/zem-alien-adapter`.
2. Restart ComfyUI and refresh its browser page.
3. Open `workflows/video_minimax_h3_r2v_9_uploads.json` from the extracted folder.
4. Upload at least one image in **ZEM H3 Reference Uploads (1–9)**. Wait for uploads to finish before queueing.
5. Write your prompt using the tags shown beside your images, then run normally.

To update later, run `git -C /workspace/ComfyUI/custom_nodes/zem-alien-adapter pull`, then restart ComfyUI.

Requires a current ComfyUI with local MiniMax H3 support and the models from your original workflow. No extra pip dependencies. Does not install or download model weights. Does not work with the MiniMax partner/API node or arbitrary IMAGE-consuming nodes.

## Behavior

- Nine upload/clear controls with previews and click-to-copy `<Picture n>` tags. Clipboard permissions depend on the browser; a manual-copy message appears if unavailable.
- Images pack left to right by slot: slots 1, 3, 9 become `<Picture 1>`, `<Picture 2>`, `<Picture 3>`.
- Clearing an image renumbers later references. The interface displays a reminder; prompt text is **not** automatically rewritten.
- All-empty input stops with a clear error. An invalid file in a populated slot also errors instead of silently changing your references.
- Files remain in `ComfyUI/input/zem_h3_references` after clearing a slot. Clearing only removes that run's reference; it does not delete uploaded files.
- The nine IMAGE outputs connect in order to `ref_images.ref_image_0` through `ref_images.ref_image_8`. Extra outputs provide an image count and a text tag map.
- Images retain their individual dimensions; the stock H3 node controls reference resizing. Animated files are rejected.

## Endpoint integration

The browser panel is only a convenience. A deployed endpoint must upload files into the pod's ComfyUI input directory, then set the node's `image_1` through `image_9` string inputs to the returned input-relative filenames. Send `""` for unused slots **on every request**, starting from a fresh workflow object, so previous uploads cannot leak into the next run. This plugin does not modify your deployed endpoint.

## Validation and limits

CPU tests cover counts 1–9, sparse slots, clearing between runs, missing/path-invalid files, changed-file cache invalidation, animated-file rejection, and workflow link consistency. A test executes the current upstream H3 method with model/GPU substitutes and confirms it skips empty outputs. JavaScript tests exercise upload controls, workflow reload, clearing, tag copying, and numbering with a simulated DOM.

No live ComfyUI browser session or GPU generation has been tested here. First pod check: upload one image and run; then upload two, clear one, and run again. If your installed H3 implementation does not skip `None` references, update ComfyUI before using this workflow.

The supplied workflow is based on your original JSON. It replaces the two hardcoded LoadImage nodes with the upload node and changes the sample prompt to remove references to absent images/audio. Model, sampler, resolution, and decode settings are preserved.

Upstream compatibility reference: https://github.com/Comfy-Org/ComfyUI/blob/master/comfy_extras/nodes_minimax_h3.py
