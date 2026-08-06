import JSON5 from "json5";
import { getParams } from "./utils.js";
import { initializeTimeline, syncTimelineScroll } from "./timeline.js";
import "./timeline.css";

const datasetLoaders = import.meta.glob("./data/*.json5", {
  query: "?raw",
  import: "default"
});
const params = getParams();
document.title = params.title || "时间线";

function showLoadError(message) {
  const wrapper = document.getElementById("wapper");
  if (!wrapper) return;
  wrapper.textContent = "";
  const node = document.createElement("div");
  node.style.cssText = "max-width:720px;margin:48px auto;padding:24px;color:#8a1f11;background:#fff8f2;border:1px solid #e2b8a7;font-family:sans-serif;line-height:1.7;white-space:pre-line;";
  node.textContent = message;
  wrapper.appendChild(node);
}

async function loadTimeline() {
  if (!params.name) {
    showLoadError("缺少 name 参数，请从 index.html 进入。");
    return;
  }

  const datasetPath = `./data/${params.name}.json5`;
  const loadDataset = datasetLoaders[datasetPath];
  if (!loadDataset) {
    showLoadError(`数据加载失败：${datasetPath}\n未找到对应的数据集。`);
    return;
  }

  try {
    const source = await loadDataset();
    initializeTimeline(JSON5.parse(source));
  } catch (error) {
    console.error("Failed to load timeline data:", error);
    showLoadError(`数据加载失败：${datasetPath}\n错误信息：${error.message}`);
  }
}

window.addEventListener("scroll", syncTimelineScroll);
loadTimeline();
