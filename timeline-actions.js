const SVG_EXPORT_STYLE_PROPERTIES = [
  "display",
  "visibility",
  "opacity",
  "overflow",
  "fill",
  "fill-opacity",
  "fill-rule",
  "stroke",
  "stroke-width",
  "stroke-opacity",
  "stroke-dasharray",
  "stroke-dashoffset",
  "stroke-linecap",
  "stroke-linejoin",
  "stop-color",
  "stop-opacity",
  "font-family",
  "font-size",
  "font-style",
  "font-weight",
  "letter-spacing",
  "text-anchor",
  "text-decoration",
  "text-shadow",
  "writing-mode",
  "dominant-baseline",
  "alignment-baseline",
  "paint-order",
  "shape-rendering",
  "text-rendering",
  "vector-effect"
];

function getBoardSize(board) {
  return {
    width: Number(board.attr("width")) || board.node.clientWidth,
    height: Number(board.attr("height")) || board.node.clientHeight
  };
}

function inlineSvgStyles(source, clone) {
  const sourceNodes = [source, ...source.querySelectorAll("*")];
  const clonedNodes = [clone, ...clone.querySelectorAll("*")];
  sourceNodes.forEach(function(node, index) {
    const computedStyle = window.getComputedStyle(node);
    SVG_EXPORT_STYLE_PROPERTIES.forEach(function(property) {
      const value = computedStyle.getPropertyValue(property);
      if (value) clonedNodes[index].style.setProperty(property, value);
    });
  });
}

function removeHiddenDetails(source, clone) {
  const selector = ".contGroup, .descBox";
  const sourceDetails = source.querySelectorAll(selector);
  const clonedDetails = clone.querySelectorAll(selector);
  sourceDetails.forEach(function(detail, index) {
    const style = window.getComputedStyle(detail);
    if (style.display === "none" || style.visibility === "hidden") {
      clonedDetails[index].remove();
    }
  });
}

function normalizeExportLayerSize(clone, boardSize) {
  function resolveDimension(attribute, fallback) {
    const value = clone.getAttribute(attribute);
    const parsed = Number(value);
    return value && !value.endsWith("%") && isFinite(parsed) && parsed > 0
      ? parsed
      : fallback;
  }

  const width = resolveDimension("width", boardSize.width);
  const height = resolveDimension("height", boardSize.height);
  clone.setAttribute("width", width);
  clone.setAttribute("height", height);
  return { width, height };
}

function loadSvgLayer(layer, boardSize) {
  return new Promise(function(resolve, reject) {
    const image = new Image();
    const layerName = layer.node.id || layer.node.getAttribute("class") || "unknown";
    const clone = layer.node.cloneNode(true);
    clone.setAttributeNS(
      "http://www.w3.org/2000/xmlns/",
      "xmlns:xlink",
      "http://www.w3.org/1999/xlink"
    );
    inlineSvgStyles(layer.node, clone);
    clone.style.transform = "";
    removeHiddenDetails(layer.node, clone);
    const dimensions = normalizeExportLayerSize(clone, boardSize);
    image.onload = function() {
      resolve({ image, ...dimensions });
    };
    image.onerror = function() {
      reject(new Error(`SVG 图层加载失败: ${layerName}`));
    };
    image.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(clone.outerHTML);
  });
}

export function zoomTimeline(timeline, value) {
  if (!timeline) return 1;

  const snapshot = timeline.getSnapshot();
  const scale = Number(value);
  if (!isFinite(scale) || scale <= 0) return snapshot.scale;

  timeline.setScale(scale);
  Object.values(snapshot.layers).filter(Boolean).forEach(function(layer) {
    layer.attr({ style: `transform: scale(${scale})` });
  });

  if (snapshot.wrapper && snapshot.board) {
    const boardSize = getBoardSize(snapshot.board);
    if (isFinite(boardSize.width)) {
      snapshot.wrapper.style.width = `${boardSize.width * scale}px`;
    }
    if (isFinite(boardSize.height)) {
      snapshot.wrapper.style.height = `${boardSize.height * scale}px`;
    }
  }
  return scale;
}

export async function saveTimeline(timeline, datasetName = "timeline") {
  if (!timeline) return false;

  const snapshot = timeline.getSnapshot();
  if (!snapshot.board || !snapshot.layers.background) return false;

  const layers = [
    snapshot.layers.background,
    snapshot.layers.period,
    snapshot.layers.events,
    snapshot.layers.content,
    snapshot.layers.horizontalRuler,
    snapshot.layers.verticalRuler
  ].filter(Boolean);

  try {
    const boardSize = getBoardSize(snapshot.board);
    const renderedLayers = await Promise.all(
      layers.map(function(layer) {
        return loadSvgLayer(layer, boardSize);
      })
    );
    const exportScale = snapshot.scale || 1;
    const canvas = document.createElement("canvas");
    canvas.width = Math.ceil(boardSize.width * exportScale);
    canvas.height = Math.ceil(boardSize.height * exportScale);
    const context = canvas.getContext("2d");
    renderedLayers.forEach(function(layer) {
      context.drawImage(
        layer.image,
        0,
        0,
        layer.width * exportScale,
        layer.height * exportScale
      );
    });

    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = datasetName.replace(/[\\/:*?"<>|]/g, "_") + ".png";
    document.body.appendChild(link);
    link.click();
    link.remove();
    return true;
  } catch (error) {
    console.error("时间线导出失败:", error);
    return false;
  }
}
