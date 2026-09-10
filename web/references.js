import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";

export function referenceLabels(values) {
    let count = 0;
    return values.map(value => value.trim() ? `<Picture ${++count}>` : "Empty");
}

app.registerExtension({
    name: "ZEM.H3ReferenceUploads",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name !== "ZEMH3ReferenceUploads") return;
        const original = nodeType.prototype.onNodeCreated;
        nodeType.prototype.onNodeCreated = function () {
            original?.apply(this, arguments);
            const node = this;
            const widgets = Array.from({ length: 9 }, (_, i) => node.widgets.find(w => w.name === `image_${i + 1}`));
            // Keep filename widgets serialized for API runs and workflow reloads.
            widgets.forEach(w => { w.type = "hidden"; w.computeSize = () => [0, -4]; });
            const panel = document.createElement("div");
            Object.assign(panel.style, { padding: "10px", boxSizing: "border-box", background: "#20252d", color: "#eef2f7", font: "12px sans-serif", overflow: "auto", height: "100%" });
            const status = document.createElement("div");
            status.style.cssText = "padding:4px 0 10px;white-space:pre-wrap";
            panel.append(status);
            const grid = document.createElement("div");
            grid.style.cssText = "display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px";
            panel.append(grid);
            const cards = [];
            let busy = false;
            const refresh = (message = "") => {
                const values = widgets.map(w => String(w.value || ""));
                const labels = referenceLabels(values);
                status.textContent = `${values.filter(v => v.trim()).length}/9 references — click a tag to copy.\n${message || "Removing an image renumbers later tags. Check your prompt."}`;
                cards.forEach((card, i) => {
                    card.tag.textContent = labels[i];
                    card.tag.disabled = !values[i];
                    card.name.textContent = values[i] || `Slot ${i + 1}`;
                    card.name.title = values[i];
                    card.preview.style.display = values[i] ? "block" : "none";
                    if (values[i]) {
                        const parts = values[i].replaceAll("\\", "/").split("/");
                        const filename = parts.pop();
                        const url = api.apiURL(`/view?${new URLSearchParams({ filename, subfolder: parts.join("/"), type: "input" })}`);
                        if (card.preview.getAttribute("src") !== url) card.preview.src = url;
                    } else card.preview.removeAttribute("src");
                });
                node.setDirtyCanvas(true, true);
            };
            const setValue = (i, value) => {
                widgets[i].value = value;
                widgets[i].callback?.(value);
                app.graph?.change?.();
                refresh();
            };
            for (let i = 0; i < 9; i++) {
                const card = document.createElement("div");
                card.style.cssText = "border:1px solid #485568;border-radius:8px;padding:8px;min-width:0";
                const tag = document.createElement("button");
                tag.style.cssText = "width:100%;color:#97d9ff;background:#263849;border:0;padding:6px;cursor:pointer";
                tag.onclick = async () => {
                    try { await navigator.clipboard.writeText(tag.textContent); refresh(`Copied ${tag.textContent}`); }
                    catch { refresh(`Copy this tag: ${tag.textContent}`); }
                };
                const preview = document.createElement("img");
                preview.style.cssText = "width:100%;height:92px;object-fit:contain;margin-top:6px";
                const name = document.createElement("div");
                name.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;margin:6px 0";
                const upload = document.createElement("button");
                upload.textContent = "Upload";
                const clear = document.createElement("button");
                clear.textContent = "Clear";
                clear.style.marginLeft = "4px";
                clear.onclick = () => { if (!busy) setValue(i, ""); };
                upload.onclick = () => {
                    if (busy) return;
                    const picker = document.createElement("input");
                    picker.type = "file";
                    picker.accept = "image/png,image/jpeg,image/webp,image/bmp";
                    picker.onchange = async () => {
                        const file = picker.files?.[0];
                        if (!file) return;
                        busy = true;
                        refresh(`Uploading slot ${i + 1}… Wait before running.`);
                        try {
                            const body = new FormData();
                            body.append("image", file);
                            body.append("type", "input");
                            body.append("subfolder", "zem_h3_references");
                            body.append("overwrite", "false");
                            const response = await api.fetchApi("/upload/image", { method: "POST", body });
                            if (!response.ok) throw new Error(`Upload failed (${response.status})`);
                            const result = await response.json();
                            setValue(i, result.subfolder ? `${result.subfolder}/${result.name}` : result.name);
                        } catch (error) { refresh(error.message); }
                        finally { busy = false; }
                    };
                    picker.click();
                };
                card.append(tag, preview, name, upload, clear);
                grid.append(card);
                cards.push({ tag, preview, name });
            }
            node.addDOMWidget("reference_uploads", "zem_h3_uploads", panel, {
                serialize: false, getMinHeight: () => 600, getMaxHeight: () => 900,
            });
            node.setSize([560, 800]);
            const configured = node.onConfigure;
            node.onConfigure = function () { configured?.apply(this, arguments); refresh(); };
            refresh();
        };
    },
});
