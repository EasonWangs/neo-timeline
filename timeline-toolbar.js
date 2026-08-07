const DEFAULT_ZOOM_LEVEL = 1;
const MIN_ZOOM_LEVEL = 0.5;
const MAX_ZOOM_LEVEL = 2;
const ZOOM_LEVEL_STEP = 0.25;
const TOOL_MARGIN = 6;

function requiredElement(root, selector) {
  const element = root.querySelector(selector);
  if (!element) throw new Error(`时间线工具栏缺少元素：${selector}`);
  return element;
}

export function createTimelineToolbar(options = {}) {
  const root = options.root || document.querySelector(".timeline-tools");
  if (!root) throw new Error("找不到时间线工具栏");

  const dragHandle = requiredElement(root, "#timeline-tool-drag");
  const zoomOutButton = requiredElement(root, "#zoom-out");
  const zoomResetButton = requiredElement(root, "#zoom-reset");
  const zoomInButton = requiredElement(root, "#zoom-in");
  const zoomValue = requiredElement(root, "#zoom-value");
  const layoutButton = requiredElement(root, "#timeline-layout");
  const layoutValue = requiredElement(root, "#layout-value");
  const saveButton = requiredElement(root, "#timeline-save");
  const status = requiredElement(root, "#timeline-tool-status");
  const onZoom = options.onZoom || function() {};
  const onToggleLayout = options.onToggleLayout || function() {};
  const onSave = options.onSave || function() { return false; };
  const fileName = options.fileName || "timeline";

  let ready = false;
  let zoomLevel = DEFAULT_ZOOM_LEVEL;
  let layout = "h";
  let statusTimer = null;
  let activeDrag = null;

  function renderZoomControls() {
    const percentage = `${Math.round(zoomLevel * 100)}%`;
    zoomValue.value = percentage;
    zoomValue.textContent = percentage;
    zoomResetButton.title = zoomLevel === DEFAULT_ZOOM_LEVEL
      ? "当前为默认 100%"
      : `当前 ${percentage}，点击恢复 100%`;
    zoomOutButton.disabled = !ready || zoomLevel <= MIN_ZOOM_LEVEL;
    zoomResetButton.disabled = !ready || zoomLevel === DEFAULT_ZOOM_LEVEL;
    zoomInButton.disabled = !ready || zoomLevel >= MAX_ZOOM_LEVEL;
  }

  function renderLayoutControl() {
    const isVertical = layout === "v";
    const targetLabel = isVertical ? "横向" : "纵向";
    layoutValue.textContent = isVertical ? "纵" : "横";
    layoutButton.disabled = !ready;
    layoutButton.setAttribute("aria-pressed", String(isVertical));
    layoutButton.setAttribute("aria-label", `切换为${targetLabel}时间线`);
    layoutButton.title = `切换为${targetLabel}`;
  }

  function setStatus(message, isError = false) {
    clearTimeout(statusTimer);
    status.textContent = message;
    status.classList.toggle("is-error", isError);
    if (!message) return;

    statusTimer = setTimeout(function() {
      status.textContent = "";
      status.classList.remove("is-error");
    }, 2800);
  }

  function setZoomLevel(nextLevel, showStatus = true) {
    if (!ready) return false;
    let normalizedLevel = Math.min(MAX_ZOOM_LEVEL, Math.max(MIN_ZOOM_LEVEL, nextLevel));
    normalizedLevel = Math.round(normalizedLevel * 100) / 100;
    if (onZoom(normalizedLevel) === false) return false;
    zoomLevel = normalizedLevel;
    renderZoomControls();
    if (showStatus) setStatus(`缩放 ${Math.round(zoomLevel * 100)}%`);
    return true;
  }

  function changeZoomLevel(nextLevel, showStatus = true) {
    try {
      return setZoomLevel(nextLevel, showStatus);
    } catch (error) {
      console.error("时间线缩放失败:", error);
      setStatus("缩放失败，请重试", true);
      return false;
    }
  }

  function move(left, top) {
    const rect = root.getBoundingClientRect();
    const maxLeft = Math.max(TOOL_MARGIN, window.innerWidth - rect.width - TOOL_MARGIN);
    const maxTop = Math.max(TOOL_MARGIN, window.innerHeight - rect.height - TOOL_MARGIN);
    const constrainedTop = Math.min(maxTop, Math.max(TOOL_MARGIN, top));
    root.style.right = "auto";
    root.style.bottom = "auto";
    root.style.left = `${Math.min(maxLeft, Math.max(TOOL_MARGIN, left))}px`;
    root.style.top = `${constrainedTop}px`;
    root.classList.toggle("is-near-top", constrainedTop < 56);
  }

  function startDrag(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const rect = root.getBoundingClientRect();
    activeDrag = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top
    };
    move(rect.left, rect.top);
    root.classList.add("is-dragging");
    dragHandle.focus({ preventScroll: true });
    dragHandle.setPointerCapture(event.pointerId);
    event.preventDefault();
  }

  function drag(event) {
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    move(
      activeDrag.left + event.clientX - activeDrag.startX,
      activeDrag.top + event.clientY - activeDrag.startY
    );
    event.preventDefault();
  }

  function stopDrag(event) {
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    activeDrag = null;
    root.classList.remove("is-dragging");
    if (dragHandle.hasPointerCapture(event.pointerId)) {
      dragHandle.releasePointerCapture(event.pointerId);
    }
  }

  root.addEventListener("click", function(event) {
    event.stopPropagation();
  });

  dragHandle.addEventListener("pointerdown", startDrag);
  dragHandle.addEventListener("pointermove", drag);
  dragHandle.addEventListener("pointerup", stopDrag);
  dragHandle.addEventListener("pointercancel", stopDrag);
  dragHandle.addEventListener("keydown", function(event) {
    const directions = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    };
    const direction = directions[event.key];
    if (!direction) return;
    const rect = root.getBoundingClientRect();
    const distance = event.shiftKey ? 30 : 10;
    move(rect.left + direction[0] * distance, rect.top + direction[1] * distance);
    event.preventDefault();
  });

  window.addEventListener("resize", function() {
    if (!root.style.left) return;
    const rect = root.getBoundingClientRect();
    move(rect.left, rect.top);
  });

  zoomOutButton.addEventListener("click", function() {
    changeZoomLevel(zoomLevel - ZOOM_LEVEL_STEP);
  });
  zoomResetButton.addEventListener("click", function() {
    changeZoomLevel(DEFAULT_ZOOM_LEVEL);
  });
  zoomInButton.addEventListener("click", function() {
    changeZoomLevel(zoomLevel + ZOOM_LEVEL_STEP);
  });

  layoutButton.addEventListener("click", function() {
    if (!ready) return;
    const nextLayout = layout === "h" ? "v" : "h";
    try {
      if (onToggleLayout(nextLayout, zoomLevel) === false) return;
      layout = nextLayout;
      renderLayoutControl();
      setStatus(`已切换为${layout === "v" ? "纵向" : "横向"}`);
    } catch (error) {
      console.error("时间线方向切换失败:", error);
      setStatus("方向切换失败，请重试", true);
    }
  });

  saveButton.addEventListener("click", async function() {
    if (!ready || saveButton.getAttribute("aria-busy") === "true") return;
    saveButton.disabled = true;
    saveButton.setAttribute("aria-busy", "true");
    setStatus("正在生成图片…");

    let saved = false;
    try {
      saved = await onSave();
    } catch (error) {
      console.error("时间线导出失败:", error);
    }
    saveButton.removeAttribute("aria-busy");
    saveButton.disabled = false;
    setStatus(saved ? `已保存 ${fileName}.png` : "图片生成失败，请重试", !saved);
  });

  function enable(initialLayout = "h") {
    ready = true;
    layout = initialLayout === "v" ? "v" : "h";
    root.hidden = false;
    saveButton.disabled = false;
    renderLayoutControl();
    changeZoomLevel(DEFAULT_ZOOM_LEVEL, false);
  }

  renderZoomControls();
  renderLayoutControl();
  return Object.freeze({ enable, setStatus });
}
