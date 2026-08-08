import JSON5 from "json5";
import { exportTimelinePng } from "./timeline-actions.js";
import { createTimelineToolbar } from "./timeline-toolbar.js";
import { initializeTimeline, syncTimelineScroll } from "./timeline.js";
import { getScrollOffsetForTime, getViewportStartTime } from "./timeline-utils.js";
import "./timeline.css";

const datasetLoaders = import.meta.glob("./data/*.json5", {
  query: "?raw",
  import: "default"
});
const params = Object.fromEntries(new URLSearchParams(window.location.search));
let timeline = null;
let timelineData = null;
let reflowFrame = null;
let activeTimeDensity = 1;

document.title = params.title || "时间线";

function getDatasetTimePx() {
  const value = Number(timelineData && timelineData.config &&
    timelineData.config.axes && timelineData.config.axes.time &&
    timelineData.config.axes.time.px);
  return isFinite(value) && value > 0 ? value : 1;
}

function captureTimelinePosition() {
  if (!timeline) return null;
  const snapshot = timeline.getSnapshot();
  const axis = snapshot.timeAxis;
  const isVertical = axis.layout === "v";
  const scrollOffset = isVertical ? window.scrollY : window.scrollX;
  return {
    layout: axis.layout,
    crossOffset: isVertical ? window.scrollX : window.scrollY,
    time: getViewportStartTime(
      axis.start,
      axis.px,
      scrollOffset
    )
  };
}

function restoreTimelinePosition(position) {
  if (!timeline || !position) return;
  const snapshot = timeline.getSnapshot();
  const axis = snapshot.timeAxis;
  const isVertical = axis.layout === "v";
  const timeOffset = getScrollOffsetForTime(
    position.time,
    axis.start,
    axis.px
  );
  // 同方向重绘时保留交叉轴位置；横纵切换时交叉轴从起点开始，避免沿用旧时间滚动值。
  const crossOffset = position.layout === axis.layout ? position.crossOffset : 0;
  window.scrollTo(
    isVertical ? crossOffset : timeOffset,
    isVertical ? timeOffset : crossOffset
  );
}

function rebuildTimeline(layout, density) {
  if (!timelineData) return false;
  const position = captureTimelinePosition();
  const currentLayout = timeline && timeline.getSnapshot().timeAxis.layout;
  const targetLayout = layout === "h" || layout === "v" ? layout : currentLayout;
  const normalizedDensity = Number(density) > 0 ? Number(density) : 1;

  timeline = initializeTimeline(timelineData, {
    layout: targetLayout,
    timePx: getDatasetTimePx() * normalizedDensity
  });
  activeTimeDensity = normalizedDensity;
  restoreTimelinePosition(position);
  syncTimelineScroll();
  return true;
}

const toolbar = createTimelineToolbar({
  fileName: params.name || "timeline",
  onZoom(density) {
    return density === activeTimeDensity || rebuildTimeline(null, density);
  },
  onToggleLayout(layout, density) {
    return rebuildTimeline(layout, density);
  },
  onSave() {
    return exportTimelinePng(timeline, params.name || "timeline");
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
    timelineData = JSON5.parse(await loadDataset());
    timeline = initializeTimeline(timelineData);
    toolbar.enable(timelineData.config && timelineData.config.layout);
  } catch (error) {
    console.error("Failed to load timeline data:", error);
    showLoadError(`数据加载失败：${datasetPath}\n错误信息：${error.message}`);
  }
}

function scheduleTimelineReflow() {
  if (!timeline || reflowFrame != null) return;
  reflowFrame = window.requestAnimationFrame(function() {
    reflowFrame = null;
    timeline.reflow();
    syncTimelineScroll();
  });
}

window.addEventListener("scroll", syncTimelineScroll);
window.addEventListener("resize", scheduleTimelineReflow);
loadTimeline();
