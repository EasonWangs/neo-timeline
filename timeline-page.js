import JSON5 from "json5";
import { getParams } from "./utils.js";
import { initializeTimeline, syncTimelineScroll } from "./timeline.js";
import { saveTimeline, zoomTimeline } from "./timeline-actions.js";
import "./timeline.css";

const datasetLoaders = import.meta.glob("./data/*.json5", {
  query: "?raw",
  import: "default"
});
const params = getParams();
document.title = params.title || "时间线";
const timelineTools = document.querySelector(".timeline-tools");
const dragHandle = document.getElementById("timeline-tool-drag");
const zoomOutButton = document.getElementById("zoom-out");
const zoomResetButton = document.getElementById("zoom-reset");
const zoomInButton = document.getElementById("zoom-in");
const zoomValue = document.getElementById("zoom-value");
const saveButton = document.getElementById("timeline-save");
const toolStatus = document.getElementById("timeline-tool-status");
const MIN_ZOOM = 0.5;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.25;
const TOOL_MARGIN = 6;
let zoomLevel = 1;
let timelineReady = false;
let timeline = null;
let statusTimer = null;
let activeDrag = null;

function renderZoomControls() {
  const percentage = `${Math.round(zoomLevel * 100)}%`;
  zoomValue.value = percentage;
  zoomValue.textContent = percentage;
  zoomOutButton.disabled = !timelineReady || zoomLevel <= MIN_ZOOM;
  zoomResetButton.disabled = !timelineReady || zoomLevel === 1;
  zoomInButton.disabled = !timelineReady || zoomLevel >= MAX_ZOOM;
}

function setZoom(nextZoom) {
  zoomLevel = Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, nextZoom));
  zoomLevel = Math.round(zoomLevel * 100) / 100;
  zoomTimeline(timeline, zoomLevel);
  renderZoomControls();
}

function setToolStatus(message, isError = false) {
  clearTimeout(statusTimer);
  toolStatus.textContent = message;
  toolStatus.classList.toggle("is-error", isError);
  if (message) {
    statusTimer = setTimeout(function() {
      toolStatus.textContent = "";
      toolStatus.classList.remove("is-error");
    }, 2800);
  }
}

function enableTimelineTools() {
  timelineReady = true;
  timelineTools.hidden = false;
  saveButton.disabled = false;
  setZoom(1);
}

function moveTimelineTools(left, top) {
  const rect = timelineTools.getBoundingClientRect();
  const maxLeft = Math.max(TOOL_MARGIN, window.innerWidth - rect.width - TOOL_MARGIN);
  const maxTop = Math.max(TOOL_MARGIN, window.innerHeight - rect.height - TOOL_MARGIN);
  const constrainedTop = Math.min(maxTop, Math.max(TOOL_MARGIN, top));
  timelineTools.style.right = "auto";
  timelineTools.style.bottom = "auto";
  timelineTools.style.left = `${Math.min(maxLeft, Math.max(TOOL_MARGIN, left))}px`;
  timelineTools.style.top = `${constrainedTop}px`;
  timelineTools.classList.toggle("is-near-top", constrainedTop < 56);
}

function startToolDrag(event) {
  if (event.pointerType === "mouse" && event.button !== 0) return;
  const rect = timelineTools.getBoundingClientRect();
  activeDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    left: rect.left,
    top: rect.top
  };
  moveTimelineTools(rect.left, rect.top);
  timelineTools.classList.add("is-dragging");
  dragHandle.focus({ preventScroll: true });
  dragHandle.setPointerCapture(event.pointerId);
  event.preventDefault();
}

function dragTimelineTools(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
  moveTimelineTools(
    activeDrag.left + event.clientX - activeDrag.startX,
    activeDrag.top + event.clientY - activeDrag.startY
  );
  event.preventDefault();
}

function stopToolDrag(event) {
  if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
  activeDrag = null;
  timelineTools.classList.remove("is-dragging");
  if (dragHandle.hasPointerCapture(event.pointerId)) {
    dragHandle.releasePointerCapture(event.pointerId);
  }
}

timelineTools.addEventListener("click", function(event) {
  event.stopPropagation();
});

dragHandle.addEventListener("pointerdown", startToolDrag);
dragHandle.addEventListener("pointermove", dragTimelineTools);
dragHandle.addEventListener("pointerup", stopToolDrag);
dragHandle.addEventListener("pointercancel", stopToolDrag);
dragHandle.addEventListener("keydown", function(event) {
  const directions = {
    ArrowLeft: [-1, 0],
    ArrowRight: [1, 0],
    ArrowUp: [0, -1],
    ArrowDown: [0, 1]
  };
  const direction = directions[event.key];
  if (!direction) return;
  const rect = timelineTools.getBoundingClientRect();
  const distance = event.shiftKey ? 30 : 10;
  moveTimelineTools(
    rect.left + direction[0] * distance,
    rect.top + direction[1] * distance
  );
  event.preventDefault();
});

window.addEventListener("resize", function() {
  if (!timelineTools.style.left) return;
  const rect = timelineTools.getBoundingClientRect();
  moveTimelineTools(rect.left, rect.top);
});

zoomOutButton.addEventListener("click", function() {
  setZoom(zoomLevel - ZOOM_STEP);
});

zoomResetButton.addEventListener("click", function() {
  setZoom(1);
});

zoomInButton.addEventListener("click", function() {
  setZoom(zoomLevel + ZOOM_STEP);
});

saveButton.addEventListener("click", async function() {
  if (!timelineReady || saveButton.getAttribute("aria-busy") === "true") return;
  saveButton.disabled = true;
  saveButton.setAttribute("aria-busy", "true");
  setToolStatus("正在生成图片…");

  const saved = await saveTimeline(timeline, params.name || "timeline");
  saveButton.removeAttribute("aria-busy");
  saveButton.disabled = false;
  setToolStatus(
    saved ? `已保存 ${params.name || "timeline"}.png` : "图片生成失败，请重试",
    !saved
  );
});

window.addEventListener("keydown", function(event) {
  if (!timelineReady || (!event.ctrlKey && !event.metaKey)) return;
  if (event.key === "+" || event.key === "=") {
    event.preventDefault();
    setZoom(zoomLevel + ZOOM_STEP);
  } else if (event.key === "-") {
    event.preventDefault();
    setZoom(zoomLevel - ZOOM_STEP);
  } else if (event.key === "0") {
    event.preventDefault();
    setZoom(1);
  }
});

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
    timeline = initializeTimeline(JSON5.parse(source));
    enableTimelineTools();
  } catch (error) {
    console.error("Failed to load timeline data:", error);
    showLoadError(`数据加载失败：${datasetPath}\n错误信息：${error.message}`);
  }
}

window.addEventListener("scroll", syncTimelineScroll);
loadTimeline();
