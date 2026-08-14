import Snap from "snapsvg-cjs";
import * as U from "./timeline-utils.js";

const $id = function(e){
  return document.getElementById(e)
}
const RULER_THICKNESS = 26;
// 标尺和时期标签占据顶部区域，item 从 64px 开始可避免首行文字贴住标尺。
const ITEM_CROSS_START = 64;
const state = {
  config: null,
  rh: null,
  rv: null,
  svgBg: null,
  period: null,
  events: null,
  board: null,
  area: {},
  offset: 0,
  size: null,
  hideAllBound: false,
  popupCloseHandler: null,
  popupMode: null,
  popupSource: null,
  itemTitlePopup: null,
  sourceData: null,
  itemCrossOffsets: {},
  itemBoxes: {},
  itemBaseCross: {},
  itemDrag: null,
  suppressItemClick: null,
  eventTextOffsets: {},
  eventTextDrag: null,
  currentSelection: {
    item: null,
    points: [],
    currentIndex: -1
  },
  drag: {
    active: false,
    initialMouseX: 0,
    initialMouseY: 0,
    initialScrollLeft: 0,
    initialScrollTop: 0,
    bound: false,
    touchActive: false
  }
};
function removePopup() {
  const popup = document.querySelector('.connection-popup');
  if (popup) popup.remove();
  if (state.popupCloseHandler) {
    document.removeEventListener('click', state.popupCloseHandler);
    state.popupCloseHandler = null;
  }
  state.popupMode = null;
  state.popupSource = null;
}

function removeHoverPopup(source) {
  if (state.popupMode !== 'hover' || state.popupSource !== source) return;
  removePopup();
}

function bindHideAllListener() {
  if (state.hideAllBound) return;
  document.addEventListener('click', hideAll);
  state.hideAllBound = true;
}

function drawOrientedLine(board, timePosition, crossStart, crossEnd, layout) {
  const start = U.orientPoint(timePosition, crossStart, layout);
  const end = U.orientPoint(timePosition, crossEnd, layout);
  return board.line(start.x, start.y, end.x, end.y);
}

function getTimePosition(value, unitPx) {
  const date = U.parseDate(value);
  if (!date) return null;
  return U.getDatePosition(date, unitPx, state.config.start);
}

function getElapsedDateLabel(startDate, endDate) {
  const elapsed = U.getDateValue(endDate) - U.getDateValue(startDate);
  if (!isFinite(elapsed)) return "";
  return String(Math.round(elapsed * 100) / 100);
}

/**
 * 绘制单个方向的时间标尺。
 *
 * 内部统一使用“时间轴 + 交叉轴”坐标：横向布局的时间轴是 x，纵向布局的
 * 时间轴是 y，再通过 orientPoint/orientRect 转成实际 SVG 坐标。这样主刻度、
 * 次刻度、月份刻度和文字定位只需维护一套逻辑。
 *
 * options.layout   标尺方向："h" 为横向，"v" 为纵向。
 * options.length   标尺沿时间轴方向的像素长度。
 * options.major    主刻度间隔，对应 axes.time.major。
 * options.minor    可选的次刻度间隔，对应 axes.time.minor。
 * options.minSpace 自动计算次刻度时允许的最小文字间距。
 *
 * 返回创建好的 Snap.svg 标尺对象，以及最终采用的次刻度间隔。
 */
function drawAxisRuler(options) {
  // 标尺固定为 26px 厚；layout 只决定厚度落在宽度还是高度上。
  const thickness = RULER_THICKNESS;
  const isVertical = options.layout === "v";
  const unitPx = state.config.axes.time.px;

  // 根据主刻度的像素宽度和最小文字间距，计算最终采用的次刻度间隔。
  // 如果数据中显式配置了 axes.time.minor，getRulerInterval 会优先使用配置值。
  const minor = U.getRulerInterval(
    options.major,
    unitPx,
    options.minSpace,
    options.minor
  );
  // 次刻度只有在自身间距足以容纳年份文字时才显示数字，避免密集标签互相覆盖。
  const showMinorLabels = minor * unitPx >= 50;

  // 月份短刻度和月份数字采用不同密度，并且横纵布局共用相同的间隔。
  // 主刻度不是 1 年时不绘制月份，避免年份跨度较大时产生无意义的细分。
  const monthSteps = options.major === 1
    ? U.getMonthRulerSteps(unitPx)
    : null;

  // 将“时间轴长度 × 标尺厚度”转换成横向或纵向布局对应的实际 SVG 宽高。
  const size = U.orientRect(0, 0, options.length, thickness, options.layout);

  // 创建当前方向的标尺画布，并保留既有 id 供样式和导出逻辑定位。
  const ruler = Snap(size.w, size.h).attr({
    id: isVertical ? "ruler-v" : "ruler-h",
    class: "ruler"
  });

  // 添加覆盖整个标尺的半透明背景。
  ruler.rect(0, 0, size.w, size.h).attr({
    fill: state.config.rulerBg || "#383838",
    fillOpacity: 0.8
  });

  function drawMonthLabel(monthPosition, monthNumber, year) {
    // 横轴靠近末端时向左绘制；纵轴通常放在刻度下方，末端空间不足时改放上方。
    const alignLabelToEnd = isVertical || monthPosition + 14 >= options.length;
    const timeOffset = isVertical
      ? (monthPosition + 8 < options.length ? 8 : -2)
      : (alignLabelToEnd ? -2 : 2);
    const labelPosition = U.orientPoint(
      monthPosition + timeOffset,
      thickness - 2,
      options.layout
    );
    ruler.text(labelPosition.x, labelPosition.y, monthNumber).attr({
      class: "month-label",
      "data-year": year,
      "data-month": monthNumber,
      fill: "#b1b4b4",
      fontSize: "0.7em",
      textAnchor: alignLabelToEnd ? "end" : "start"
    });
  }

  // 先把第一个刻度对齐到绝对时间值，再换算成相对起点的像素位置。
  // 例如起点为 -475、次刻度为 10 时，应绘制 -470、-460……，从而经过 -400 主刻度。
  const firstTick = U.getFirstRulerTick(state.config.start, minor);
  for (let tickIndex = 0; ; tickIndex += 1) {
    const timeValue = firstTick + tickIndex * minor;
    const timePosition = (timeValue - state.config.start) * unitPx;
    if (timePosition >= options.length) break;

    // 能被 major 整除的是主刻度：主刻度贯穿标尺，次刻度只画末端 12px。
    // 按绝对年份而不是相对起点判断，确保 1300、1320 这类整值成为主刻度。
    const isMajor = U.isRulerMajor(timeValue, options.major);
    const tickStart = isMajor ? 0 : 18;
    drawOrientedLine(ruler, timePosition, tickStart, thickness, options.layout).attr({
      stroke: "#8f9292",
      strokeWidth: 1
    });

    // 主刻度始终显示文字；次刻度是否显示取决于它自己的实际像素间距。
    if (isMajor || showMinorLabels) {
      // 横标尺文字向右偏 2px，纵标尺文字向上偏 2px，避免压住刻度线。
      const labelPosition = U.orientPoint(
        timePosition + (isVertical ? -2 : 2),
        isVertical ? 0 : 15,
        options.layout
      );
      const labelAttrs = { fill: "#b1b4b4" };

      // 次刻度文字比主刻度略小，用字号进一步区分层级。
      if (!isMajor) labelAttrs.fontSize = "0.8em";
      ruler.text(
        labelPosition.x,
        labelPosition.y,
        String(timeValue)
      ).attr(labelAttrs);
    }

    // 1 月与年份主刻度共用刻度线，但在月份文字行仍明确显示“1”。
    if (monthSteps) {
      drawMonthLabel(timePosition, 1, timeValue);

      // monthIndex 是零基月份索引；内部月份从 tickStep 开始绘制额外短刻度。
      for (
        let monthIndex = monthSteps.tickStep;
        monthIndex < 12;
        monthIndex += monthSteps.tickStep
      ) {
        const monthPosition = timePosition + monthIndex / 12 * unitPx;
        // 最后一个不完整年份可能贴近 SVG 末端，不再创建超出标尺范围的节点。
        if (monthPosition >= options.length) break;

        const showMonthLabel = monthIndex % monthSteps.labelStep === 0;
        drawOrientedLine(
          ruler,
          monthPosition,
          showMonthLabel ? 18 : 21,
          thickness,
          options.layout
        ).attr({
          class: "month-tick",
          "data-year": timeValue,
          "data-month": monthIndex + 1,
          stroke: "#8f9292",
          strokeWidth: 1
        });

        if (!showMonthLabel) continue;

        drawMonthLabel(monthPosition, monthIndex + 1, timeValue);
      }
    }
  }

  // 将 minor 一并返回，调用方会回写到 axes.time，保证背景网格使用相同间隔。
  return { ruler, minor };
}

function drawRuler(w, h) {
  const wrapper = $id("wapper");
  if (!wrapper) return;
  const oldRh = $id("ruler-h");
  const oldRv = $id("ruler-v");
  if (oldRh) oldRh.remove();
  if (oldRv) oldRv.remove();
  if (state.svgBg && state.svgBg.node && state.svgBg.node.parentNode) {
    state.svgBg.node.parentNode.removeChild(state.svgBg.node);
  }

  const timeAxis = state.config.axes.time;
  const layout = state.config.layout;
  // 刻度间隔仍按时间轴密度计算；视觉放大不改变数据刻度的疏密。
  const minMinorSpace = 10;
  // 数据未指定刻度时，按 time.px 自动选择易读的主、次刻度；显式配置仍会覆盖自动值。
  const intervals = U.getRulerIntervals(
    timeAxis.px,
    60,
    minMinorSpace,
    timeAxis.major,
    timeAxis.minor
  );
  timeAxis.major = intervals.major;
  timeAxis.minor = intervals.minor;

  let rulerH = null;
  let rulerV = null;
  if (layout === "h") {
    const result = drawAxisRuler({
      layout: "h",
      length: w,
      major: timeAxis.major,
      minor: timeAxis.minor,
      minSpace: 25
    });
    rulerH = result.ruler;
    timeAxis.minor = result.minor;
    wrapper.appendChild(rulerH.node);
  }
  if (layout === "v") {
    const result = drawAxisRuler({
      layout: "v",
      length: h,
      major: timeAxis.major,
      minor: timeAxis.minor,
      minSpace: 20
    });
    rulerV = result.ruler;
    timeAxis.minor = result.minor;
    wrapper.appendChild(rulerV.node);
  }

  const bgGrid = Snap(w, h).attr({ class: "svgBg" });
  bgGrid.rect(0, 0, w, h).attr({
    fill: state.config.svgBg || "#faf7ec"
  });

  // 背景网格的横纵线共用当前时间轴间隔，但不能把间隔写入另一轴配置。
  // 否则 resize 后下一次 drawRuler() 会误以为两个方向都需要标尺。
  const gridMajor = timeAxis.major;
  const gridMinor = timeAxis.minor;
  const unitPx = timeAxis.px;
  const firstTimeGridOffset = U.getFirstRulerTick(state.config.start, gridMinor) -
    state.config.start;

  // 时间轴方向的粗网格按绝对年份对齐；交叉轴仍从画布原点按相对距离对齐。
  const isMajorGridLine = function(offset, isTimeAxis) {
    const value = isTimeAxis ? state.config.start + offset : offset;
    return U.isRulerMajor(value, gridMajor);
  };

  const horizontalGridStart = layout === "h" ? firstTimeGridOffset : 0;
  for (let i = horizontalGridStart; i < w / unitPx; i += gridMinor) {
    const isMajor = isMajorGridLine(i, layout === "h");
    drawOrientedLine(bgGrid, i * unitPx, 0, "100%", "h").attr({
      stroke: isMajor ? "#f0ebdc" : "#f5f0e0",
      class: isMajor ? "thickLine" : "thinLine"
    });
  }
  const verticalGridStart = layout === "v" ? firstTimeGridOffset : 0;
  for (let i = verticalGridStart; i < h / unitPx; i += gridMinor) {
    const isMajor = isMajorGridLine(i, layout === "v");
    drawOrientedLine(bgGrid, i * unitPx, 0, "100%", "v").attr({
      stroke: isMajor ? "#f0ebdc" : "#f5f0e0",
      class: isMajor ? "thickLine" : "thinLine"
    });
  }

  wrapper.appendChild(bgGrid.node);
  state.rh = rulerH;
  state.rv = rulerV;
  state.svgBg = bgGrid;
}

function collectPeriodGroupTargets(pers) {
  const targets = new Map();
  for (const period of pers || []) {
    const groupName = typeof period.group === "string" ? period.group.trim() : "";
    if (!groupName || targets.has(groupName) || !state.area[groupName]) continue;
    const area = state.area[groupName];
    const box = area.getBBox();
    const crossPosition = state.config.layout === "v" ? Number(box.x) : Number(box.y);
    const crossLength = state.config.layout === "v"
      ? Number(box.width ?? box.w)
      : Number(box.height ?? box.h);
    if (!Number.isFinite(crossPosition) || !Number.isFinite(crossLength) || crossLength <= 0) continue;
    targets.set(groupName, { area, crossPosition, crossLength });
  }

  // group 之间通常会保留 item 行距。period 色带不需要这段空白，
  // 因此以间隙中点作为相邻色带的共同边界，既连续又不会重叠。
  const orderedTargets = Array.from(targets.values()).sort(function(a, b) {
    return a.crossPosition - b.crossPosition;
  });
  if (orderedTargets.length > 0) {
    const first = orderedTargets[0];
    const firstEnd = first.crossPosition + first.crossLength;
    // 第一层从标尺外沿开始，消除标尺与首个 group 之间的顶部（竖版为左侧）空白。
    if (first.crossPosition > RULER_THICKNESS) {
      first.crossPosition = RULER_THICKNESS;
      first.crossLength = firstEnd - RULER_THICKNESS;
    }
  }
  for (let i = 1; i < orderedTargets.length; i++) {
    const previous = orderedTargets[i - 1];
    const current = orderedTargets[i];
    const previousEnd = previous.crossPosition + previous.crossLength;
    const currentEnd = current.crossPosition + current.crossLength;
    const gap = current.crossPosition - previousEnd;
    if (gap <= 0) continue;

    const boundary = previousEnd + gap / 2;
    previous.crossLength = boundary - previous.crossPosition;
    current.crossPosition = boundary;
    current.crossLength = currentEnd - boundary;
  }
  return targets;
}

// 时期范围
function drawPeriod(pers){
	const periodBoard = Snap("#period");
  state.period = periodBoard;
	if(state.config.p.position) periodBoard.node.style.position = state.config.p.position;
  const unitPx = state.config.axes.time.px;
  const p = (state.config.p.padding || 50) * unitPx;
  // 在绘制任何 period 前固定 group 包围盒，避免第一个 period 加入 group 后影响后续测量。
  const groupTargets = collectPeriodGroupTargets(pers);
  
  for (var i = 0; i < pers.length; i++) {
    const startDate = U.parseDate(pers[i].start);
    const endDate = U.parseDate(pers[i].end);
    if (!startDate || !endDate) continue;
    const level = pers[i].level || 1;
    const timePosition = U.getDatePosition(startDate, unitPx, state.config.start);
    const endPosition = U.getDatePosition(endDate, unitPx, state.config.start);
    const groupName = typeof pers[i].group === "string" ? pers[i].group.trim() : "";
    const groupTarget = groupTargets.get(groupName);
    const renderBoard = groupTarget ? state.board : periodBoard;
    const crossPosition = groupTarget
      ? groupTarget.crossPosition
      : 25 + (level - 1) * p;
    const timeLength = endPosition - timePosition;
    const crossLength = groupTarget
      ? groupTarget.crossLength
      : state.config.p.type == "part"
        ? p
        : "calc(100% - "+ crossPosition +"px)";
    const geometry = U.orientRect(
      timePosition,
      crossPosition,
      timeLength,
      crossLength,
      state.config.layout
    );
    let textTime = timePosition;
    const textCross = groupTarget
      ? crossPosition + Math.min(13, crossLength / 2)
      : 38 + (level - 1) * p;
    let writingMode = "lr";

    switch(state.config.p.textAnchor){
      case 'middle': 
        textTime = timePosition + timeLength / 2;
        break;
      case 'end':
        textTime = timePosition + timeLength;
        break;
      case 'start':
      default:
        textTime = timePosition;
        break;
    }

    const textPosition = U.orientPoint(textTime, textCross, state.config.layout);
    if(state.config.layout == "v"){
      writingMode = "tb";
      textPosition.x -= 2;
      textPosition.y += 2;
    }
     
    // 创建时期组
    const periodGroupAttrs = {
      class: groupTarget ? "period-item group-period" : "period-item"
    };
    if (groupTarget) periodGroupAttrs["data-group"] = groupName;
    var periodGroup = renderBoard.g().attr(periodGroupAttrs);
    
    //时期矩形
    var rect = renderBoard.rect(
      geometry.x,
      geometry.y,
      geometry.w,
      geometry.h
    ).attr({
      fill: state.config.p.colors[i % state.config.p.colors.length],
      fillOpacity: 0.2,
    }).hover(function() {
        this.animate({
           fillOpacity: 0.6    
        }, 300); 
    }, function() {
        this.animate({
           fillOpacity: 0.2    
        }, 300); 
    }); 
    
    // 添加矩形到组
    periodGroup.add(rect);
 
    //时期文字
    var text = renderBoard.text(textPosition.x, textPosition.y, pers[i].name).attr({
          class: 'text',
          writingMode: writingMode,
          textAnchor: state.config.p.textAnchor,
        });

    let textBox = text.getBBox(),
        angle = 0;
        if(textBox.h > geometry.h-2){
          angle = -45;
        }
        if(textBox.w > geometry.w-2){
          angle = 45;
        }
    let matrix = new Snap.Matrix();
        matrix.rotate(angle, textPosition.x, textPosition.y); // 旋转文字
        text.transform(matrix);

    let desc = "";
    // 使用原始日期字符串显示
    desc = U.buildRangeDesc(startDate, endDate);

    if(pers[i].desc) {
      desc = U.prependLabelToValue(desc, pers[i].desc);
    }

    let title = Snap.parse('<title>'+ U.toPlainText(desc) +'</title>');
    text.append(title);
    
    // 添加文本到组
    periodGroup.add(text);

    // 处理关键点
    var points = pers[i].keypoints;
    if(points){
      // 创建关键点组
      var pointsGroup = renderBoard.g().attr({
        class: 'points'
      });
      
      for(var n = 0; n < points.length; n++){
        const pointDate = U.parseDate(points[n].t);
        if (!pointDate) continue;
        // 为每个点创建一个组
        let pointGroup = renderBoard.g().attr({
          class: 'point'
        });
        
        const pointPosition = U.orientPoint(
          U.getDatePosition(pointDate, unitPx, state.config.start),
          groupTarget ? crossPosition + crossLength / 2 : crossPosition + 35,
          state.config.layout
        );
        let pointSVG = renderBoard.circle(pointPosition.x, pointPosition.y, 3).attr({
          stroke: "#f00",
          strokeWidth: 1,
        });
        
        let title = Snap.parse('<title>'+ points[n].t + "-" + points[n].w +'</title>');
        pointSVG.append(title);
        
        // 添加点到点组
        pointGroup.add(pointSVG);
        
        // 添加点组到关键点组
        pointsGroup.add(pointGroup);
      }
      
      // 添加关键点组到时期组
      periodGroup.add(pointsGroup);
    }

    // 关联 period 放到 group 内容底层，因此会随 group 拖动，同时不遮挡 item。
    if (groupTarget) groupTarget.area.prepend(periodGroup);
  }
}


// 事件清单
function drawEvents(evts, roles){
  if (!evts) {
    console.error('Missing events for drawing');
    return;
  }
 
  // 创建普通事件和关联事件的SVG容器
  const eventsBoard = Snap("#events");
  state.events = eventsBoard;
  const unitPx = state.config.axes.time.px;
  
  // 只处理普通事件
  for (var i = 0; i < evts.length; i++) {
    // 处理普通事件
    if (evts[i].time !== undefined && evts[i].time !== null && evts[i].time !== "") {
      const timePosition = getTimePosition(evts[i].time, unitPx);
      if (timePosition === null) continue;
      // 为每个事件创建一个组
      var eventGroup = eventsBoard.g().attr({
        class: 'events common'
      });
      
      let textCross = 40;

      switch(state.config.e.textAnchor){
        case 'middle': 
          textCross = "50%";
          break;
        case 'end':
          textCross = "100%";
          break;
        case 'start':
        default:
          textCross = 40;
          break;
      }
      const lineStart = U.orientPoint(timePosition, 0, state.config.layout);
      const lineEnd = U.orientPoint(timePosition, "100%", state.config.layout);
      const textPosition = U.orientPoint(timePosition, textCross, state.config.layout);
    
      // 创建事件线
      var line = eventsBoard.line(
        lineStart.x,
        lineStart.y,
        lineEnd.x,
        lineEnd.y
      ).attr({
        strokeWidth: 1,
        stroke: "#aaa",
        strokeDasharray: "5,5",
      });
      
      // 添加线到组
      eventGroup.add(line);

      // 创建事件文本
      var text = eventsBoard.text(textPosition.x, textPosition.y, evts[i].name).attr({
        class: 'text',
        textAnchor: state.config.e.textAnchor,
        "data-event-index": i,
      });
      
      // 添加标题
      let desc = evts[i].time + (evts[i].desc ? evts[i].desc : "");
      let title = Snap.parse('<title>'+ desc +'</title>');
      text.append(title);

      applyEventTextCrossOffset(text, i);
      bindEventTextCrossDrag(text, i);
      
      // 添加文本到组
      eventGroup.add(text);
    }
  }
  
  // 处理关联事件（从角色的关键点中获取）
  if (roles) {
    drawConnectionEvents(roles);
  }
}

function applyEventTextCrossOffset(text, eventIndex) {
  const offset = Number(state.eventTextOffsets[eventIndex]) || 0;
  const x = state.config.layout === "v" ? offset : 0;
  const y = state.config.layout === "h" ? offset : 0;
  text.node.setAttribute("transform", `translate(${x} ${y})`);
}

function bindEventTextCrossDrag(text, eventIndex) {
  const node = text.node;

  node.addEventListener("pointerdown", function(event) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    state.eventTextDrag = {
      text,
      eventIndex,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      startOffset: Number(state.eventTextOffsets[eventIndex]) || 0,
      moved: false
    };
    node.setPointerCapture(event.pointerId);
  });

  node.addEventListener("pointermove", function(event) {
    const drag = state.eventTextDrag;
    if (!drag || drag.text !== text || drag.pointerId !== event.pointerId) return;
    const crossDelta = state.config.layout === "v"
      ? event.clientX - drag.startX
      : event.clientY - drag.startY;
    if (!drag.moved && Math.abs(crossDelta) < 4) return;

    drag.moved = true;
    state.eventTextOffsets[eventIndex] = Math.round((drag.startOffset + crossDelta) * 10) / 10;
    text.addClass("is-dragging");
    applyEventTextCrossOffset(text, eventIndex);
    event.preventDefault();
  });

  function finishEventTextDrag(event) {
    const drag = state.eventTextDrag;
    if (!drag || drag.text !== text || drag.pointerId !== event.pointerId) return;
    state.eventTextDrag = null;
    text.removeClass("is-dragging");
    if (node.hasPointerCapture(event.pointerId)) {
      node.releasePointerCapture(event.pointerId);
    }
    if (drag.moved) event.preventDefault();
  }

  node.addEventListener("pointerup", finishEventTextDrag);
  node.addEventListener("pointercancel", finishEventTextDrag);
}

// 从角色的关键点中绘制关联事件
function drawConnectionEvents(roles) {
  if (!roles || !roles.length) {
    console.warn('没有提供角色数据用于绘制关联事件');
    return;
  }

  
  // 创建关键点映射（只需遍历一次）
  const keypointMap = createKeypointMap(roles);
  
  // 跟踪已处理的连接，避免重复
  const processedConnections = new Set();
  let connectionCount = 0;
  
  // 遍历所有角色和关键点，查找带有 to 字段的关键点
  for (let r = 0; r < roles.length; r++) {
    const role = roles[r];
    if (!role.keypoints || !role.keypoints.length) continue;
    
    for (let k = 0; k < role.keypoints.length; k++) {
      const kp = role.keypoints[k];
      if (!kp.to) continue;
      
      // 创建连接标识符（确保每个连接只处理一次）
      const connectionId = `${r}-${kp.t}-${kp.to}`;
      if (processedConnections.has(connectionId)) continue;
      processedConnections.add(connectionId);
      
      // 查找目标关键点
      const toPoint = keypointMap[kp.to];
      if (!toPoint) {
        console.warn(`未找到目标关键点: ${kp.to} (来自 ${role.name}, 时间 ${kp.t})`);
        continue;
      }
      
      // 准备源点和目标点数据
      const fromPoint = {
        roleIndex: r,
        keypoint: kp,
        roleName: role.name
      };
      
      // 绘制连接
      drawConnection(state.board, fromPoint, toPoint, connectionCount, kp.w);
      connectionCount++;
    }
  }
}

// 创建关键点映射（辅助函数）
function createKeypointMap(roles) {
  const map = {};
  
  for (let r = 0; r < roles.length; r++) {
    const role = roles[r];
    if (!role.keypoints) continue;
    
    for (let k = 0; k < role.keypoints.length; k++) {
      const kp = role.keypoints[k];
      if (kp.id) {
        // 存储完整信息，避免后续重复查找
        map[kp.id] = {
          roleIndex: r,
          keypoint: kp,
          roleName: role.name
        };
      }
    }
  }
  
  return map;
}

// 绘制两个关键点之间的连接
function drawConnection(board, fromPoint, toPoint, index, name) {
  // 输入: 两个关键点信息与连接序号
  // 处理: 计算路径、箭头与标题并绑定交互
  // 输出: 在传入 board 上生成连接图元
  // 通过id查找起点和终点的dot元素
  const fromDot = board.select(`#${fromPoint.keypoint.id}`);
  const toDot = board.select(`#${toPoint.keypoint.id}`);
  
  if (!fromDot || !toDot) {
    console.warn('找不到连接点:', fromPoint.keypoint.id, toPoint.keypoint.id);
    return;
  }
  
  // 关键点可能随 item 在交叉轴上移动，必须把局部坐标换算到 SVG 画布坐标。
  const getRenderedPoint = function(dot) {
    const point = dot.node.ownerSVGElement.createSVGPoint();
    point.x = parseFloat(dot.attr('cx')) || 0;
    point.y = parseFloat(dot.attr('cy')) || 0;
    const matrix = dot.node.getCTM();
    const rendered = matrix ? point.matrixTransform(matrix) : point;
    return { x: rendered.x, y: rendered.y };
  };
  const fp = getRenderedPoint(fromDot);
  const tp = getRenderedPoint(toDot);

  // 添加偏移量
  const offset = 2; // 设置偏移距离
  if (state.config.layout == "v") {
    // 垂直布局时，水平方向偏移
    fp.x -= offset;
    tp.x += offset;
  } else {
    // 水平布局时，垂直方向偏移
    fp.y += offset;
    tp.y -= offset;
  }
  
  // 计算水平和垂直距离
  const dx_dist = Math.abs(tp.x - fp.x);
  const dy_dist = Math.abs(tp.y - fp.y);
  
  // 创建曲线路径
  let pathStr;
  let textPathId = `text-path-${index}`;
  let arrowAngle = 0;
  
  // 辅助函数：确保坐标是有效数字
  const ensureNumber = (value) => {
    const num = parseFloat(value);
    return isFinite(num) ? num : 0;
  };
  
  // 辅助函数：格式化路径坐标
  const formatPoint = (x, y) => `${ensureNumber(x)},${ensureNumber(y)}`;
  
  // 使用30度角偏移计算控制点（π/6 = 30度）
  // 方向系数，根据索引交替，使相邻曲线不会重叠
  const direction = (index % 2 === 0) ? 1 : -1;
  
  if (state.config.layout == "v") {
    if (Math.abs(fp.y - tp.y) < 1) {
      // 当两点在同一水平线上时，使用S形曲线
      const offsetY = 30 * direction; // 垂直偏移量
      
      pathStr = `M${formatPoint(fp.x, fp.y)} ` +
                `C${formatPoint(fp.x + dx_dist/4, fp.y + offsetY)} ` +
                `${formatPoint(tp.x - dx_dist/4, tp.y + offsetY)} ` +
                `${formatPoint(tp.x, tp.y)}`;
      
      // 计算箭头角度
      arrowAngle = Math.atan2(-offsetY, dx_dist/4) * 180 / Math.PI;
    } else {
      // 使用30度角偏移计算控制点
      // 计算总距离的一部分作为偏移基础
      const dist = Math.sqrt(dx_dist*dx_dist + dy_dist*dy_dist);
      const offsetBase = Math.min(Math.max(40, dist * 0.3), 80) * direction;
      
      // 计算30度角的偏移量
      const offsetX = offsetBase * Math.cos(Math.PI/6); // cos(30°) ≈ 0.866
      const offsetY = offsetBase * Math.sin(Math.PI/6); // sin(30°) = 0.5
      
      // 确定控制点的方向：如果终点在起点上方，调整Y偏移方向
      const yDirection = tp.y < fp.y ? -1 : 1;
      
      // 创建控制点 
      const cp1x = fp.x + offsetX;
      const cp1y = fp.y + offsetY * yDirection;
      const cp2x = tp.x + offsetX;
      const cp2y = tp.y + offsetY * yDirection;
      
      // 生成贝塞尔曲线路径
      pathStr = `M${formatPoint(fp.x, fp.y)} ` +
                `C${formatPoint(cp1x, cp1y)} ` +
                `${formatPoint(cp2x, cp2y)} ` +
                `${formatPoint(tp.x, tp.y)}`;
      
      // 计算箭头角度
      const dx_tangent = tp.x - cp2x;
      const dy_tangent = tp.y - cp2y;
      arrowAngle = Math.atan2(dy_tangent, dx_tangent) * 180 / Math.PI;
    }
  } else {
    if (Math.abs(fp.x - tp.x) < 1) {
      // 当两点在同一垂直线上时，使用S形曲线
      const offsetX = 30 * direction; // 水平偏移量
      
      pathStr = `M${formatPoint(fp.x, fp.y)} ` +
                `C${formatPoint(fp.x + offsetX, fp.y + dy_dist/4)} ` +
                `${formatPoint(tp.x + offsetX, tp.y - dy_dist/4)} ` +
                `${formatPoint(tp.x, tp.y)}`;
      
      // 计算箭头角度
      arrowAngle = Math.atan2(dy_dist/4, -offsetX) * 180 / Math.PI;
    } else {
      // 使用30度角偏移计算控制点
      // 计算总距离的一部分作为偏移基础
      const dist = Math.sqrt(dx_dist*dx_dist + dy_dist*dy_dist);
      const offsetBase = Math.min(Math.max(40, dist * 0.3), 80) * direction;
      
      // 计算30度角的偏移量
      const offsetX = offsetBase * Math.sin(Math.PI/6); // sin(30°) = 0.5
      const offsetY = offsetBase * Math.cos(Math.PI/6); // cos(30°) ≈ 0.866
      
      // 确定控制点的方向：如果终点在起点右侧，调整X偏移方向
      const xDirection = tp.x > fp.x ? 1 : -1;
      
      // 创建控制点 
      const cp1x = fp.x + offsetX * xDirection;
      const cp1y = fp.y + offsetY;
      const cp2x = tp.x + offsetX * xDirection;
      const cp2y = tp.y + offsetY;
      
      // 生成贝塞尔曲线路径
      pathStr = `M${formatPoint(fp.x, fp.y)} ` +
                `C${formatPoint(cp1x, cp1y)} ` +
                `${formatPoint(cp2x, cp2y)} ` +
                `${formatPoint(tp.x, tp.y)}`;
      
      // 计算箭头角度
      const dx_tangent = tp.x - cp2x;
      const dy_tangent = tp.y - cp2y;
      arrowAngle = Math.atan2(dy_tangent, dx_tangent) * 180 / Math.PI;
    }
  }
  
  // 使用Snap.svg创建路径
  // 透明宽路径只负责命中，视觉路径仍保持纤细，方便手指点击关系线。
  var connHitPath = board.path(pathStr).attr({
    class: "connection-hit",
    fill: "none",
    stroke: "transparent",
    strokeWidth: 14
  });
  var connPath = board.path(pathStr).attr({
    class: "connection-line",
    fill: "none",
    stroke: "#aaa",
    strokeWidth: 1,
    strokeDasharray: "2,2",
    id: textPathId
  });
  

  // 创建箭头
  let arrowSize = 6; // 箭头大小
  let arrowPath = createArrow(tp.x, tp.y, arrowSize, arrowAngle);
  var endArrow = board.path(arrowPath).attr({
    fill: "#666",
    stroke: "none"
  });
  
  // 使用封装的函数创建文本路径
  const titleText = name || `${fromPoint.roleName} → ${toPoint.roleName}`;
  const connText = createTextPath(board, textPathId, titleText, {
    startOffset: "50%",
    title: titleText
  });
  
  // 使用Snap.svg创建组
  var g = board.g(connHitPath, connPath, endArrow, connText).attr({
    class: 'connection',
    'data-from-role': fromPoint.roleName,
    'data-to-role': toPoint.roleName,
    'data-from-event': fromPoint.keypoint.id,
    'data-to-event': toPoint.keypoint.id
  });
  
  // 为连接线组添加点击事件
  g.click(function(e) {
    // 阻止事件冒泡
    e.stopPropagation();
    const wasActive = g.hasClass('active');
    hideAll();
    if (wasActive) return;

    g.addClass('active');
    state.board.addClass('focus');
    state.board.addClass('focus-item');
    showConnectionEndpoint(fromDot);
    showConnectionEndpoint(toDot);
  });
}

// 创建箭头路径
function createArrow(x, y, size, angle) {
  // 调整箭头形状参数
  const arrowWidth = size * 0.6; // 减小箭头宽度，使其更窄
  const arrowLength = size * 1.2; // 增加箭头长度，使其更尖锐
  
  // 计算箭头的三个点坐标
  let points = [
    {x: x, y: y}, // 箭头尖端
    {x: x - arrowLength, y: y - arrowWidth/2}, // 左侧点
    {x: x - arrowLength, y: y + arrowWidth/2}  // 右侧点
  ];
  
  // 如果需要旋转箭头
  if (angle !== 0) {
    // 将角度转换为弧度
    const rad = angle * Math.PI / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    // 旋转除了尖端以外的点
    for (let i = 1; i < points.length; i++) {
      // 计算相对于尖端的偏移
      const dx = points[i].x - x;
      const dy = points[i].y - y;
      
      // 应用旋转变换
      points[i].x = x + dx * cos - dy * sin;
      points[i].y = y + dx * sin + dy * cos;
    }
  }
  
  // 生成SVG路径
  return `M${points[0].x},${points[0].y} L${points[1].x},${points[1].y} L${points[2].x},${points[2].y} Z`;
}

// 创建文本路径的辅助函数
function createTextPath(board, pathId, text, options = {}) {
  // 创建文本元素
  const textElement = board.text(0, 0, text).attr({
    class: 'text',
    fill: options.fill || "#f55"
  });

  // 创建 textPath 元素
  const textPath = board.el('textPath', {
    'xlink:href': `#${pathId}`,
    startOffset: options.startOffset || "0",
    'text-anchor': options.textAnchor || "middle"
  });

  // 设置文本内容
  textPath.node.textContent = text;

  // 将 textPath 添加到文本元素
  textElement.node.textContent = '';  // 清除原有文本
  textElement.node.appendChild(textPath.node);

  // 如果提供了title，添加title元素
  if (options.title) {
    textElement.append(Snap.parse('<title>'+ options.title +'</title>'));
  }

  return textElement;
}

//绘制列表
function drawList(data, config){
  state.config = config;
  const board = Snap("#content");
  state.board = board;
  bindHideAllListener();
  state.area = {};
  state.offset = 0;
  var roles = Array.isArray(data.roles) ? data.roles : [];
  for (var i = 0; i < roles.length; i++) {
    let item = roles[i],
        color = "#fff";
    if(!!item.groups && state.config.g.colors[item.groups[0]]){
      color = state.config.g.colors[item.groups[0]];
    }
    drawItem(board, item, i, color, item.keypoints)
  }

  //画分组框
  if(state.config.g.show) drawItemGroup(state.config.g.colors)
  
  //画区域框
  var periods = data.periods;
  if(periods) drawPeriod(periods);

  //画事件线
  var events = data.events;
  if(events) drawEvents(events, roles);
}


// 修改键盘导航处理函数
function handleKeyNavigation(e) {
  if (!state.currentSelection.item || !state.currentSelection.points.length) return;

  const { points, currentIndex } = state.currentSelection;
  if (!Number.isInteger(currentIndex)) return;
  const navigationKeys = ['ArrowLeft', 'ArrowUp', 'ArrowRight', 'ArrowDown'];
  if (!navigationKeys.includes(e.key)) return;
  const newIndex = U.getNextSelectionIndex(currentIndex, points.length, e.key);
  e.preventDefault();
  if (newIndex === currentIndex) return;

  // 获取当前点并触发点击事件
  const currentDot = points.find(dot => Number(dot.attr('data-index')) === newIndex);
  if (!currentDot) return;

  // 创建并触发点击事件
  const pt = currentDot.node.ownerSVGElement.createSVGPoint();
  pt.x = currentDot.attr('cx');
  pt.y = currentDot.attr('cy');

  // 转换为页面坐标
  const ctm = currentDot.node.getScreenCTM();
  const globalPt = pt.matrixTransform(ctm);

  // 创建自定义事件，包含转换后的坐标
  const clickEvent = new MouseEvent('click', {
    bubbles: true,
    cancelable: true,
    view: window,
    clientX: globalPt.x,
    clientY: globalPt.y
  });

  currentDot.node.dispatchEvent(clickEvent);
}

function computeItemGeometry(item, index, itemSpacing) {
  const unitPx = state.config.axes.time.px;
  let w;
  let h = 2;
  let x = 0;
  let y = (index - state.offset) * itemSpacing + ITEM_CROSS_START;
  const startDate = U.parseDate(item.start);
  const endDate = U.parseDate(item.end);

  if (startDate) {
    x = U.getDatePosition(startDate, unitPx, state.config.start);
  } else if (endDate) {
    x = U.getDatePosition(endDate, unitPx, state.config.start) - (60 * unitPx);
  } else {
    x = 0;
  }

  if (endDate) {
    w = U.getDatePosition(endDate, unitPx, state.config.start) - x;
  } else if (startDate) {
    w = 90 * unitPx;
  } else {
    w = unitPx;
  }

  x = isFinite(x) ? x : 0;
  w = isFinite(w) ? Math.max(w, 1) : unitPx;

  const geometry = U.orientRect(x, y, w, h, state.config.layout);
  x = geometry.x;
  y = geometry.y;
  w = geometry.w;
  h = geometry.h;

  if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h)) {
    console.error('Invalid dimensions:', {x, y, w, h}, 'for item:', item);
    return null;
  }

  let fill;
  if (startDate && startDate.isApprox && endDate && endDate.isApprox) {
    fill = (state.config.layout == "v") ? "url(#gradTB)" : "url(#gradLR)";
  } else if (startDate && startDate.isApprox) {
    fill = (state.config.layout == "v") ? "url(#gradT)" : "url(#gradL)";
  } else if (endDate && endDate.isApprox) {
    fill = (state.config.layout == "v") ? "url(#gradB)" : "url(#gradR)";
  } else if (startDate && !endDate) {
    fill = (state.config.layout == "v") ? "url(#gradB)" : "url(#gradR)";
  } else if (!startDate && endDate) {
    fill = (state.config.layout == "v") ? "url(#gradT)" : "url(#gradL)";
  } else {
    fill = "#000";
  }

  return { x, y, w, h, fill, startDate, endDate };
}

const COUNTRY_CODE_ALIASES = {
  hl: "nl",
  ne: "nl"
};

function getFlagEmoji(code) {
  code = String(code || "").toLowerCase();
  code = COUNTRY_CODE_ALIASES[code] || code;
  if (!/^[a-z]{2}$/.test(code)) return "";

  return code.toUpperCase().replace(/./g, function(char) {
    return String.fromCodePoint(127397 + char.charCodeAt());
  });
}

function appendSvgTitle(element, label) {
  if (!element || !element.node || !label) return;
  const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
  title.textContent = label;
  element.node.appendChild(title);
}

function removeItemTitlePopup() {
  if (!state.itemTitlePopup) return;
  state.itemTitlePopup.remove();
  state.itemTitlePopup = null;
}

function positionItemTitlePopup(event) {
  const popup = state.itemTitlePopup;
  if (!popup) return;
  const inset = 8;
  const gap = 10;
  const rect = popup.getBoundingClientRect();
  const maxLeft = Math.max(inset, window.innerWidth - rect.width - inset);
  const maxTop = Math.max(inset, window.innerHeight - rect.height - inset);
  popup.style.left = `${Math.min(maxLeft, Math.max(inset, event.clientX + gap))}px`;
  popup.style.top = `${Math.min(maxTop, Math.max(inset, event.clientY + gap))}px`;
}

function bindItemTitleTooltip(itemBox, label) {
  if (!itemBox || !itemBox.node || !label) return;
  itemBox.node.addEventListener('mouseenter', function(event) {
    removeItemTitlePopup();
    const popup = document.createElement('div');
    popup.className = 'item-title-popup';
    popup.textContent = label;
    document.body.appendChild(popup);
    state.itemTitlePopup = popup;
    positionItemTitlePopup(event);
  });
  itemBox.node.addEventListener('mousemove', positionItemTitlePopup);
  itemBox.node.addEventListener('mouseleave', removeItemTitlePopup);
  // 捕获阶段先关闭提示，避免子元素 stopPropagation 后提示仍停留在画面上。
  itemBox.node.addEventListener('click', removeItemTitlePopup, true);
}

function renderItemIcon(board, item, geometry) {
  const legacyIcon = item.icon === undefined || item.icon === null
    ? ""
    : String(item.icon);
  const countryCode = item.country || (/^[a-z]{2}$/i.test(legacyIcon) ? legacyIcon : "");
  const badgeValue = item.badge !== undefined && item.badge !== null
    ? String(item.badge)
    : (/^\d+$/.test(legacyIcon) ? legacyIcon : "");
  const countryLabel = item.countryText || item.iconText || String(countryCode).toUpperCase();

  let x = geometry.x - 16;
  let y = geometry.y - 13;
  if (state.config.layout == "v") {
    x = geometry.x + 2;
  }

  const flag = getFlagEmoji(countryCode);
  if (flag) {
    const icon = board.text(x, y + 11, flag).attr({
      class: "item-icon country-icon",
      role: "img",
      "aria-label": countryLabel
    });
    appendSvgTitle(icon, countryLabel);
    return icon;
  }

  if (badgeValue) {
    const badge = board.g().attr({
      class: "item-icon number-badge",
      role: "img",
      "aria-label": item.iconText || `编号 ${badgeValue}`
    });
    badge.add(board.rect(x, y, 15, 12, 3));
    badge.add(board.text(x + 7.5, y + 9, badgeValue));
    appendSvgTitle(badge, item.iconText || `编号 ${badgeValue}`);
    return badge;
  }

  return null;
}

function toggleItemDetails(itemBox, event) {
  if (state.suppressItemClick === itemBox.node) {
    state.suppressItemClick = null;
    event.stopPropagation();
    return;
  }
  const wasShown = itemBox.hasClass("show");
  // item 展开与关键点 tooltip 是互斥模式，切换前先清理旧选择和弹窗。
  hideAll();
  if (!wasShown) showItemDetails(itemBox);
  event.stopPropagation();
}

function applyItemCrossOffset(itemBox, itemIndex) {
  const offset = Number(state.itemCrossOffsets[itemIndex]) || 0;
  const x = state.config.layout === "v" ? offset : 0;
  const y = state.config.layout === "h" ? offset : 0;
  itemBox.node.setAttribute("transform", `translate(${x} ${y})`);
}

function getGroupedItemIndexes(groupName) {
  const roles = state.sourceData && Array.isArray(state.sourceData.roles)
    ? state.sourceData.roles
    : [];
  return roles.reduce(function(indexes, role, index) {
    if (Array.isArray(role.groups) && role.groups[0] === groupName) indexes.push(index);
    return indexes;
  }, []);
}

function redrawCurrentTimeline() {
  if (!state.sourceData || !state.config) return;
  const data = state.sourceData;
  const config = state.config;
  // 重绘会替换 SVG 内容和标尺，浏览器可能随布局变化调整视窗位置。
  // 提前保存两个方向，最终尺寸写入后再原样恢复。
  const scrollLeft = getScrollLeft();
  const scrollTop = getScrollTop();
  resetTimeline();
  // 竖排文字的 getBBox() 依赖布局类，必须先更新类名再重建 SVG。
  $id("wapper").className = config.layout === "v" ? "wapper vertical" : "wapper";
  drawList(data, config);
  resize();
  initDragPan();
  setScroll(scrollLeft, scrollTop);
  syncTimelineScroll();
}

function bindItemCrossDrag(itemBox, itemIndex) {
  const node = itemBox.node;

  node.addEventListener("pointerdown", function(event) {
    // 鼠标交互由下方的 Mouse Events 处理。Playwright 在 Linux SVG 上对
    // Pointer Events 的 move 分发并不稳定，触控输入仍使用 Pointer Events。
    if (event.pointerType === "mouse") return;
    startItemDrag(event, "pointer");
  });

  node.addEventListener("mousedown", function(event) {
    startItemDrag(event, "mouse");
  });

  function startItemDrag(event, input) {
    if (event.button !== undefined && event.button !== 0) return;
    if (event.target.closest(".dotBox, .contBox")) return;

    const itemIndexes = [itemIndex];
    const startOffsets = {};
    let minDelta = -Infinity;
    itemIndexes.forEach(function(index) {
      const startOffset = Number(state.itemCrossOffsets[index]) || 0;
      startOffsets[index] = startOffset;
      minDelta = Math.max(
        minDelta,
        ITEM_CROSS_START - (Number(state.itemBaseCross[index]) || 0) - startOffset
      );
    });
    state.itemDrag = {
      itemBox,
      itemIndex,
      itemIndexes,
      input,
      pointerId: input === "pointer" ? event.pointerId : null,
      startX: event.clientX,
      startY: event.clientY,
      startOffsets,
      minDelta,
      moved: false,
      onMove: moveItemDrag,
      onEnd: finishItemDrag
    };
    removeItemTitlePopup();
    event.preventDefault();
  }

  function moveItemDrag(event) {
    const drag = state.itemDrag;
    if (!drag || drag.itemBox !== itemBox ||
      (drag.input === "pointer" && drag.pointerId !== event.pointerId)) return;
    const crossDelta = state.config.layout === "v"
      ? event.clientX - drag.startX
      : event.clientY - drag.startY;
    if (!drag.moved && Math.abs(crossDelta) < 4) return;

    drag.moved = true;
    const appliedDelta = Math.max(drag.minDelta, crossDelta);
    drag.itemIndexes.forEach(function(index) {
      const memberBox = state.itemBoxes[index];
      if (!memberBox) return;
      memberBox.addClass("is-dragging");
      const offset = drag.startOffsets[index] + appliedDelta;
      state.itemCrossOffsets[index] = Math.round(offset * 10) / 10;
      applyItemCrossOffset(memberBox, index);
    });
    event.preventDefault();
  }

  function finishItemDrag(event) {
    const drag = state.itemDrag;
    if (!drag || drag.itemBox !== itemBox ||
      (drag.input === "pointer" && drag.pointerId !== event.pointerId)) return;
    const moved = drag.moved;
    state.itemDrag = null;
    drag.itemIndexes.forEach(function(index) {
      const memberBox = state.itemBoxes[index];
      if (memberBox) memberBox.removeClass("is-dragging");
    });
    if (!moved) return;

    redrawCurrentTimeline();
    state.suppressItemClick = node;
    setTimeout(function() {
      if (state.suppressItemClick === node) state.suppressItemClick = null;
    }, 0);
    event.preventDefault();
  }
}

function bindGroupCrossDrag(groupBox, title, groupName) {
  const node = title.node;

  node.addEventListener("pointerdown", function(event) {
    if (event.pointerType === "mouse") return;
    startGroupDrag(event, "pointer");
  });

  node.addEventListener("mousedown", function(event) {
    startGroupDrag(event, "mouse");
  });

  function startGroupDrag(event, input) {
    if (event.button !== undefined && event.button !== 0) return;

    const itemIndexes = getGroupedItemIndexes(groupName);
    if (!itemIndexes.length) return;

    const startOffsets = {};
    let minDelta = -Infinity;
    itemIndexes.forEach(function(index) {
      const startOffset = Number(state.itemCrossOffsets[index]) || 0;
      startOffsets[index] = startOffset;
      minDelta = Math.max(
        minDelta,
        ITEM_CROSS_START - (Number(state.itemBaseCross[index]) || 0) - startOffset
      );
    });
    state.itemDrag = {
      itemBox: groupBox,
      itemIndexes,
      input,
      pointerId: input === "pointer" ? event.pointerId : null,
      startX: event.clientX,
      startY: event.clientY,
      startOffsets,
      minDelta,
      moved: false,
      onMove: moveGroupDrag,
      onEnd: finishGroupDrag
    };
    removeItemTitlePopup();
    event.preventDefault();
  }

  function moveGroupDrag(event) {
    const drag = state.itemDrag;
    if (!drag || drag.itemBox !== groupBox ||
      (drag.input === "pointer" && drag.pointerId !== event.pointerId)) return;
    const crossDelta = state.config.layout === "v"
      ? event.clientX - drag.startX
      : event.clientY - drag.startY;
    if (!drag.moved && Math.abs(crossDelta) < 4) return;

    drag.moved = true;
    const appliedDelta = Math.max(drag.minDelta, crossDelta);
    drag.itemIndexes.forEach(function(index) {
      const offset = drag.startOffsets[index] + appliedDelta;
      state.itemCrossOffsets[index] = Math.round(offset * 10) / 10;
    });

    // 拖动期间先移动完整 group，保证标题、边框和成员保持一个整体；
    // 松手后再按各成员的新偏移重绘 group 与 connection。
    const x = state.config.layout === "v" ? appliedDelta : 0;
    const y = state.config.layout === "h" ? appliedDelta : 0;
    groupBox.node.setAttribute("transform", `translate(${x} ${y})`);
    groupBox.addClass("is-dragging");
    event.preventDefault();
  }

  function finishGroupDrag(event) {
    const drag = state.itemDrag;
    if (!drag || drag.itemBox !== groupBox ||
      (drag.input === "pointer" && drag.pointerId !== event.pointerId)) return;
    const moved = drag.moved;
    state.itemDrag = null;
    groupBox.removeClass("is-dragging");
    if (!moved) return;

    redrawCurrentTimeline();
    event.preventDefault();
  }
}

function renderItemHeader(board, item, itemBox, color, geometry) {
  let x1 = geometry.x;
  let y1 = geometry.y - 3;
  if(state.config.layout == "v"){
    x1 = geometry.x + 10;
    y1 = geometry.y;
  }
  var name = board.text(x1, y1, item.name).attr({
    class: "name",
    style: "text-shadow: 1px 1px "+ color + ", -1px -1px "+ color
  });
  itemBox.add(name);

  var icon = renderItemIcon(board, item, geometry);
  if(icon){
    itemBox.add(icon);
  }

  return name;
}

function renderItemDesc(board, item, itemBox, geometry, name) {
  let desc = U.buildRangeDesc(geometry.startDate, geometry.endDate);
  const countryText = item.countryText || item.iconText;
  if(countryText){
    desc += "["+countryText+"]";
  }
  if(item.desc) {
    desc = U.prependLabelToValue(desc, item.desc);
  }

  let x3;
  let y3;
  if(state.config.layout == "v"){
    x3 = geometry.x + 10;
    y3 = geometry.y + name.getBBox().width + 3;
  }else{
    x3 = geometry.x + name.getBBox().width + 3;
    y3 = geometry.y - 3;
  }

  const descLayer = board.g().attr({
    class: "desc-layer"
  });
  let descText = board.text(x3, y3, desc).attr({
    class: "descBox",
    fill:"#000",
  });
  let tspan = descText.selectAll('tspan').items;
  if(tspan.length > 0){
    for(let i = 0; i < tspan.length; i++){
      // Snap 按数组顺序生成 tspan；用反向的视觉位置，
      // 让横版从上到下、竖版从右到左都与 desc 数组顺序一致。
      const visualIndex = tspan.length - i - 1;
      if(state.config.layout == "v"){
        tspan[i].attr({
          x: x3 + 16 * visualIndex,
          y: y3
        });
      }else{
        tspan[i].attr({
          x: x3,
          y: geometry.y - visualIndex * 16 - 3
        });
      }
    }
  }
  const descBounds = descText.getBBox();
  if (descBounds.height > 0) {
    // SVG text 不支持 CSS border，只用 getBBox() 提供几何，外观交给 CSS。
    const descBorder = board.rect(
      descBounds.x - 5,
      descBounds.y - 4,
      descBounds.width + 10,
      descBounds.height + 5
    ).attr({
      class: "desc-border"
    });
    descLayer.add(descBorder);
  }
  descLayer.add(descText);
  itemBox.add(descLayer);
}

function renderKeypoints(board, item, itemBox, points, itemSpacing, geometry) {
  if(!points) return;
  const unitPx = state.config.axes.time.px;
  const itemStartDate = U.parseDate(item.start);

  let dotBox = board.g().attr({
    class:'dotBox'
  });
  let contBox = board.g().attr({
    class:'contBox'
  });

  let [x4,y4,x5,y5] = [geometry.x,geometry.y,geometry.x,geometry.y];
  for(let i = points.length - 1; i >= 0; i--){
    let point = points[i];
    const pointDate = U.parseDate(point.t);
    if (!pointDate) continue;
    const timePosition = U.getDatePosition(pointDate, unitPx, state.config.start);
    const dotCross = state.config.layout == "v" ? geometry.x : geometry.y;
    const textCross = state.config.layout == "v" ? x5 : y5;
    const dotPosition = U.orientPoint(timePosition, dotCross, state.config.layout);
    const textPosition = U.orientPoint(timePosition, textCross, state.config.layout);
    x4 = dotPosition.x;
    y4 = dotPosition.y;
    x5 = textPosition.x;
    y5 = textPosition.y;

    let desc = String(point.t);
    const elapsedLabel = getElapsedDateLabel(itemStartDate, pointDate);
    if (elapsedLabel) {
      desc += "[" + elapsedLabel + "]";
    }
    let keypointText = point.w ? U.prependLabelToValue(desc, point.w) : desc;
    let displayLines = point.w ? U.toLines(point.w) : [];

    // 关键点本身保持 4px 大小，用透明圆将触控命中区扩展到 20px。
    let hitDot = board.circle(x4, y4, 10).attr({
      class: "keypoint-hit"
    });
    let dot = board.circle(x4, y4, 2).attr({
      stroke:"#f00",
      fill:"#fff",
      strokeWidth: 1,
      id: point.id || '',
      'data-index': i,
      'data-time': point.t,
      'aria-label': U.toPlainText(keypointText)
    });

    const pointTitle = elapsedLabel ? `${point.t}[${elapsedLabel}]` : String(point.t);
    const popupContent = U.buildPopupContent({
      title: pointTitle,
      lines: displayLines,
      meta: point.id ? `ID: ${point.id}` : ""
    });

    function showKeypointPopup(mode) {
      removeItemTitlePopup();
      const pt = dot.node.ownerSVGElement.createSVGPoint();
      pt.x = dot.attr('cx');
      pt.y = dot.attr('cy');
      const ctm = dot.node.getScreenCTM();
      const globalPt = pt.matrixTransform(ctm);
      createPopup(globalPt.x, globalPt.y, popupContent, {
        mode,
        source: dot.node
      });
    }

    function hoverKeypoint() {
      // 点击产生的固定 tooltip 优先级更高；鼠标经过其他关键点时不能将其
      // 替换成临时 tooltip，否则移出关键点后固定内容也会一起消失。
      if (state.popupMode === 'pinned') return;
      showKeypointPopup('hover');
    }

    function leaveKeypoint(event) {
      if (event.relatedTarget === hitDot.node || event.relatedTarget === dot.node) return;
      removeHoverPopup(dot.node);
    }

    function selectKeypoint(e) {
      // 关键点只负责 tooltip 与键盘导航，不展开 item 内的 contGroup。
      hideAll();
      const dots = itemBox.selectAll(".dotBox circle[data-index]").items;
      state.currentSelection = {
        item: itemBox,
        points: dots,
        currentIndex: i
      };
      document.addEventListener('keydown', handleKeyNavigation);
      showKeypointPopup('pinned');
      e.stopPropagation();
    }

    [hitDot.node, dot.node].forEach(function(node) {
      node.addEventListener('mouseenter', hoverKeypoint);
      node.addEventListener('mouseleave', leaveKeypoint);
    });
    hitDot.click(selectKeypoint);
    dot.click(selectKeypoint);
    dotBox.add(hitDot);
    dotBox.add(dot);
    if(state.config.layout == "v"){
      x5 -= itemSpacing - 2;
    }else if(state.config.layout == "h"){
      y5 += itemSpacing - 2;
    }

    let lineTextGroup = board.g().attr({
      class: 'contGroup'
    });

    // 引导线在文字前留出小间隙，避免线头与字形粘连。
    const guideGap = 5;
    const guideEndX = state.config.layout == "v"
      ? x5 + Math.sign(x4 - x5) * guideGap
      : x5;
    const guideEndY = state.config.layout == "h"
      ? y5 + Math.sign(y4 - y5) * guideGap
      : y5;
    let line = board.line(x4, y4, guideEndX, guideEndY).attr({
      class: "keypoint-guide"
    });

    let text = board.text(x5, y5, keypointText).attr({
      class:"dotText",
    });

    let tspan = text.selectAll('tspan').items;
    if(tspan.length > 0){
      for(let i in tspan){
        tspan[i].attr({
          x: x5,
          y: y5
        });
        if(state.config.layout == "v"){
          x5 -= itemSpacing - 4;
          y5 -= itemSpacing * 6.8;
        }else if(state.config.layout == "h"){
          y5 += itemSpacing - 4;
        }
      }
    }

    lineTextGroup.add(line);
    lineTextGroup.add(text);
    contBox.add(lineTextGroup);
  }
  itemBox.add(dotBox);
  itemBox.add(contBox);
}

//绘制个体
function drawItem(board, item, i, color, points) {
  if (!item) return;

  const itemSpacing = state.config.items.gap;
  var itemBox = board.g().attr({
    class:"item",
    id: item.id || item.name,
    "data-item-index": i
  });
  const itemDescription = [item.name, ...U.toLines(item.desc)].filter(Boolean).join("\n");
  bindItemTitleTooltip(itemBox, itemDescription);

  if(item.offset) {
    state.offset += item.offset;
  }

  const geometry = computeItemGeometry(item, i, itemSpacing);
  if (!geometry) return;
  state.itemBoxes[i] = itemBox;
  state.itemBaseCross[i] = state.config.layout === "v" ? geometry.x : geometry.y;

  let rect = board.rect(geometry.x, geometry.y, geometry.w, geometry.h, 2).attr({
    fill: geometry.fill
  });
  itemBox.add(rect);

  var name = renderItemHeader(board, item, itemBox, color, geometry);
  renderItemDesc(board, item, itemBox, geometry, name);
  renderKeypoints(board, item, itemBox, points, itemSpacing, geometry);
  itemBox.click(function(e) {
    if (e.target.closest(".dotBox, .contBox")) return;
    toggleItemDetails(itemBox, e);
  });
  applyItemCrossOffset(itemBox, i);
  bindItemCrossDrag(itemBox, i);

  if(!!item.groups){
    var gp = item.groups[0];
    if(!(gp in state.area)) {
       state.area[gp] = board.g().attr({
        class:"group "+ gp,
      });
    }
    state.area[gp].add(itemBox);
  } else {
    board.add(itemBox);
  }
}

//绘制group
function drawItemGroup(color){
  for(var i in state.area) {
    let itemBox = state.area[i].getBBox(),
        x = itemBox.x - 2,
        y = itemBox.y + 1,
        w = itemBox.width + 4,
        h = itemBox.height - 1;
    
    // 创建组框矩形
    let rect = state.board.rect(x, y, w, h, 5).attr({
        class: "block",
        stroke: "#fff",
        fill: color[i],
        strokeWidth: 0.8,
        fillOpacity: 0.2,
        "pointer-events": "none"
    });

    // 分组title
    let x1 = x - 8, y1 = y + h/2;
    if(state.config.layout == "v"){
      x1 = x + w/2;
      y1 = y - 2;
    }
    
    // 创建标题文本
    var name = state.board.text(x1, y1, i).attr({
      class: "title",
      fill: "#000",
      style: "text-shadow: 1px 1px "+ color[i] + ", -1px -1px "+ color[i]
    });

    // SVG 竖排文本的实际命中框在不同 Chromium 平台上并不一致。
    // 标题旁使用固定的透明区域承接拖动，保留文字外观且让交互不依赖字形布局。
    const titleHit = state.config.layout === "v"
      ? state.board.rect(x - 6, y - 22, w + 12, 22)
      : state.board.rect(x - 26, y - 6, 26, h + 12);
    titleHit.attr({ class: "group-title-hit" });
    
    // 使用prepend方法将元素添加到组的开头，确保它们在视觉上位于组的底层
    // 命中区必须在成员元素下方；否则竖排时会覆盖位于 group 起点的成员名称。
    state.area[i].prepend(titleHit);
    state.area[i].prepend(name);
    state.area[i].prepend(rect);
    bindGroupCrossDrag(state.area[i], titleHit, i);
  }
}

function getLayerBounds(layer) {
  if (!layer || typeof layer.getBBox !== "function") return null;
  try {
    const box = layer.getBBox();
    const x = Number(box.x);
    const y = Number(box.y);
    const width = Number(box.width ?? box.w);
    const height = Number(box.height ?? box.h);
    if (![x, y, width, height].every(Number.isFinite)) return null;
    return { x, y, width, height };
  } catch (error) {
    console.warn("无法读取时间线图层尺寸:", error);
    return null;
  }
}

function resize(){
  if (!state.board) return;
  // 页面尺寸必须覆盖所有独立 SVG 图层。只使用 content 会让 roles 为空的
  // events-only 数据集保持一屏大小，远处事件虽然已绘制却无法滚动到达。
  const contentBounds = [state.board, state.period]
    .map(getLayerBounds)
    .filter(Boolean);
  let contentWidth = contentBounds.reduce(function(max, box) {
    return Math.max(max, box.x + box.width);
  }, 0);
  let contentHeight = contentBounds.reduce(function(max, box) {
    return Math.max(max, box.y + box.height);
  }, 0);
  const eventBounds = getLayerBounds(state.events);
  if (eventBounds && state.config.layout === "h") {
    contentWidth = Math.max(contentWidth, eventBounds.x + eventBounds.width);
  } else if (eventBounds) {
    contentHeight = Math.max(contentHeight, eventBounds.y + eventBounds.height);
  }
  state.size = { x: 0, y: 0, w: contentWidth, h: contentHeight };
  const viewportWidth = Math.max(0, window.innerWidth - 16);
  const viewportHeight = Math.max(0, window.innerHeight - 16);
  var w = Math.max(contentWidth + 100, viewportWidth),
      h = Math.max(contentHeight + 100, viewportHeight);
  drawRuler(w,h);

  state.board.attr({
    width : w,
    height : h,
  });
  if (state.events) {
    state.events.attr({
      width: w,
      height: h,
    });
  }
  if (state.period) {
    state.period.attr(state.config.layout === "v"
      ? { width: "100%", height: h }
      : { width: w, height: "100%" });
  }
}

// 悬浮窗渲染
function createPopup(x, y, content, options = {}) {
  // 输入: 鼠标坐标与结构化文本内容
  // 处理: 构建安全文本节点并绑定关闭行为
  // 输出: 页面上一个可关闭的悬浮窗
  removePopup();

  // 创建悬浮窗元素
  const popup = document.createElement('div');
  const mode = options.mode === 'hover' ? 'hover' : 'pinned';
  popup.className = mode === 'hover'
    ? 'connection-popup is-hover'
    : 'connection-popup';
  state.popupMode = mode;
  state.popupSource = options.source || null;
  
  popup.style.left = `${x + 5}px`;
  popup.style.top = `${y + 5}px`;

  if (content && typeof content === 'object') {
    if (content.title) {
      const titleNode = document.createElement('div');
      titleNode.className = 'connection-popup__title';
      const strong = document.createElement('strong');
      strong.textContent = content.title;
      titleNode.appendChild(strong);
      popup.appendChild(titleNode);
    }
    if (Array.isArray(content.lines)) {
      content.lines.forEach(function(line) {
        if (!line) return;
        const lineNode = document.createElement('div');
        lineNode.className = 'connection-popup__line';
        lineNode.textContent = line;
        popup.appendChild(lineNode);
      });
    }
    if (content.meta) {
      const metaNode = document.createElement('div');
      metaNode.className = 'connection-popup__meta';
      metaNode.textContent = content.meta;
      popup.appendChild(metaNode);
    }
  } else if (content !== undefined && content !== null) {
    const textNode = document.createElement('div');
    textNode.textContent = String(content);
    popup.appendChild(textNode);
  }

  if (mode === 'pinned') {
    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'connection-popup__close';
    closeBtn.setAttribute('aria-label', '关闭说明');
    closeBtn.textContent = '×';
    closeBtn.onclick = () => removePopup();
    popup.appendChild(closeBtn);
  }

  // 添加到文档中
  document.body.appendChild(popup);

  if (mode === 'pinned') {
    popup.addEventListener('click', function(e) {
      e.stopPropagation();
    });

    // 点击空白处关闭固定悬浮窗；临时悬浮窗由关键点 mouseleave 关闭。
    state.popupCloseHandler = function closePopup(e) {
      if (!popup.contains(e.target) && !e.target.closest('.connection')) {
        removePopup();
      }
    };
    document.addEventListener('click', state.popupCloseHandler);
  }

  // 同时限制四个方向，避免手机窄屏或长说明把弹窗推出可视区域。
  const rect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const inset = 10;
  const maxLeft = Math.max(inset, viewportWidth - rect.width - inset);
  const maxTop = Math.max(inset, viewportHeight - rect.height - inset);
  popup.style.left = `${Math.min(maxLeft, Math.max(inset, x + 5))}px`;
  popup.style.top = `${Math.min(maxTop, Math.max(inset, y + 5))}px`;
}



// 关联线只显示两个端点对应的说明，不展开其余关键点。
function showConnectionEndpoint(dot) {
  if (!dot) return;
  const item = dot.parent().parent();
  const pointIndex = Number(dot.attr('data-index'));
  const pointNodes = item.selectAll('.contGroup').items;
  const pointNode = Number.isInteger(pointIndex)
    ? pointNodes[pointNodes.length - pointIndex - 1]
    : null;

  item.addClass('show');
  if (pointNode) pointNode.addClass('connection-point');
}

// item 点击展开全部 contGroup；关键点交互不再经过这里。
function showItemDetails(that) {
  state.board.addClass("focus");
  state.board.removeClass("focus-item");
  that.addClass("show");
}

// 修改 hideAll 函数，清除选中状态
function hideAll() {
  if (!state.board) return;
  state.board.removeClass("focus focus-item");
  state.board.selectAll(".show").forEach(function(activeConn) {
    activeConn.removeClass('show');
  });
  state.board.selectAll(".connection-point").forEach(function(activeConn) {
    activeConn.removeClass('connection-point');
  });
  state.board.selectAll('.connection.active').forEach(function(activeConn) {
    activeConn.removeClass('active');
  });
  
  removePopup();

  // 清除当前选中状态
  state.currentSelection = {
    item: null,
    points: [],
    currentIndex: -1
  };
  
  // 移除键盘事件监听器
  document.removeEventListener('keydown', handleKeyNavigation);
}

function getScrollLeft() {
  return document.documentElement.scrollLeft || document.body.scrollLeft || 0;
}

function getScrollTop() {
  return document.documentElement.scrollTop || document.body.scrollTop || 0;
}

function setScroll(left, top) {
  document.documentElement.scrollLeft = left;
  document.body.scrollLeft = left;
  document.documentElement.scrollTop = top;
  document.body.scrollTop = top;
}

function startDrag(e) {
  if (e.button === 2) {
    state.drag.active = true;
    state.drag.initialMouseX = e.clientX;
    state.drag.initialMouseY = e.clientY;
    state.drag.initialScrollLeft = getScrollLeft();
    state.drag.initialScrollTop = getScrollTop();
  }
}

function stopDrag() {
  state.drag.active = false;
}

function dragScroll(e) {
  if (!state.drag.active || state.drag.touchActive) return;
  var deltaX = e.clientX - state.drag.initialMouseX;
  var deltaY = e.clientY - state.drag.initialMouseY;
  setScroll(state.drag.initialScrollLeft - deltaX, state.drag.initialScrollTop - deltaY);
}

function getTouchCenter(touches) {
  var x = (touches[0].clientX + touches[1].clientX) / 2;
  var y = (touches[0].clientY + touches[1].clientY) / 2;
  return { x: x, y: y };
}

function startTouchDrag(e) {
  if (e.touches.length !== 2) return;
  state.drag.touchActive = true;
  state.drag.active = true;
  var center = getTouchCenter(e.touches);
  state.drag.initialMouseX = center.x;
  state.drag.initialMouseY = center.y;
  state.drag.initialScrollLeft = getScrollLeft();
  state.drag.initialScrollTop = getScrollTop();
}

function dragTouchScroll(e) {
  if (!state.drag.touchActive || e.touches.length !== 2) return;
  e.preventDefault();
  var center = getTouchCenter(e.touches);
  var deltaX = center.x - state.drag.initialMouseX;
  var deltaY = center.y - state.drag.initialMouseY;
  setScroll(state.drag.initialScrollLeft - deltaX, state.drag.initialScrollTop - deltaY);
}

function stopTouchDrag(e) {
  if (e && e.touches && e.touches.length >= 2) return;
  state.drag.touchActive = false;
  state.drag.active = false;
}

function initDragPan() {
  if (state.drag.bound) return;
  state.drag.bound = true;
  document.addEventListener('mousedown', startDrag);
  document.addEventListener('mouseup', function(event) {
    if (state.itemDrag && state.itemDrag.input === "mouse" && state.itemDrag.onEnd) {
      state.itemDrag.onEnd(event);
    }
    stopDrag();
  });
  document.addEventListener('mouseleave', stopDrag);
  document.addEventListener('mousemove', function(event) {
    if (state.itemDrag && state.itemDrag.input === "mouse" && state.itemDrag.onMove) {
      state.itemDrag.onMove(event);
    }
    dragScroll(event);
  });
  document.addEventListener('pointermove', function(event) {
    if (state.itemDrag && state.itemDrag.input === "pointer" && state.itemDrag.onMove) {
      state.itemDrag.onMove(event);
    }
  });
  document.addEventListener('pointerup', function(event) {
    if (state.itemDrag && state.itemDrag.input === "pointer" && state.itemDrag.onEnd) {
      state.itemDrag.onEnd(event);
    }
  });
  document.addEventListener('pointercancel', function(event) {
    if (state.itemDrag && state.itemDrag.input === "pointer" && state.itemDrag.onEnd) {
      state.itemDrag.onEnd(event);
    }
  });
  document.addEventListener('touchstart', startTouchDrag, { passive: true });
  document.addEventListener('touchmove', dragTouchScroll, { passive: false });
  document.addEventListener('touchend', stopTouchDrag, { passive: true });
  document.addEventListener('touchcancel', stopTouchDrag, { passive: true });
}

function createTimelineConfig(data, options = {}) {
  const sourceConfig = data && data.config;
  const source = sourceConfig || {};
  const sourceAxes = source.axes || {};
  const configuredStart = parseInt(source.start, 10);
  const config = {
    ...source,
    axes: {
      ...sourceAxes,
      time: { ...(sourceAxes.time || {}) },
      cross: { ...(sourceAxes.cross || {}) }
    },
    items: { ...(source.items || {}) },
    p: { ...(source.p || {}) },
    e: { ...(source.e || {}) },
    g: {
      ...(source.g || {}),
      colors: { ...((source.g && source.g.colors) || {}) }
    }
  };

  if (options.layout === "h" || options.layout === "v") {
    config.layout = options.layout;
  }
  const timePx = Number(options.timePx);
  if (isFinite(timePx) && timePx > 0) {
    config.axes.time.px = timePx;
  }

  const normalized = U.normalizeConfig(config);
  if (!isFinite(configuredStart)) {
    normalized.start = U.inferTimelineStart(data, normalized);
  }
  return normalized;
}

function resetTimeline() {
  removePopup();
  removeItemTitlePopup();
  document.removeEventListener('keydown', handleKeyNavigation);

  const wrapper = $id("wapper");
  ["ruler-h", "ruler-v"].forEach(function(id) {
    const ruler = $id(id);
    if (ruler) ruler.remove();
  });
  if (state.svgBg && state.svgBg.node && state.svgBg.node.parentNode) {
    state.svgBg.node.parentNode.removeChild(state.svgBg.node);
  }

  ["period", "events", "content"].forEach(function(id) {
    const svg = $id(id);
    if (!svg) return;
    Array.from(svg.children).forEach(function(child) {
      if (id === "content" && child.tagName.toLowerCase() === "defs") return;
      child.remove();
    });
    svg.removeAttribute("style");
    svg.setAttribute("class", id);
    // 保留上一帧的 SVG viewport，避免清空到 resize() 之间画布临时缩回一屏，
    // 进而让浏览器把当前滚动位置不可逆地钳制为 0。最终尺寸由 resize() 覆盖。
  });

  if (wrapper) {
    wrapper.className = "wapper";
    wrapper.style.width = "";
    wrapper.style.height = "";
  }

  state.config = null;
  state.rh = null;
  state.rv = null;
  state.svgBg = null;
  state.period = null;
  state.events = null;
  state.board = null;
  state.area = {};
  state.itemBoxes = {};
  state.itemBaseCross = {};
  state.offset = 0;
  state.size = null;
  state.currentSelection = {
    item: null,
    points: [],
    currentIndex: -1
  };
  state.itemDrag = null;
  state.suppressItemClick = null;
  state.eventTextDrag = null;
  state.drag.active = false;
  state.drag.touchActive = false;
}

export function initializeTimeline(data, options = {}) {
  if (state.sourceData !== data) {
    state.sourceData = data;
    state.itemCrossOffsets = {};
    state.eventTextOffsets = {};
  }
  resetTimeline();
  const config = createTimelineConfig(data, options);
  // 文字的 writing-mode 会影响 SVG getBBox()，必须在绘制前先切换布局类。
  $id("wapper").className = config.layout == "v" ? "wapper vertical" : "wapper";
  drawList(data, config);
  resize();
  initDragPan();

  return Object.freeze({
    getSnapshot: function() {
      return {
        wrapper: $id("wapper"),
        board: state.board,
        timeAxis: {
          layout: state.config.layout,
          start: state.config.start,
          px: state.config.axes.time.px
        },
        layers: {
          horizontalRuler: state.rh,
          verticalRuler: state.rv,
          background: state.svgBg,
          period: state.period,
          events: state.events,
          content: state.board
        }
      };
    },
    reflow: function() {
      resize();
    }
  });
}

export function syncTimelineScroll() {
  if (!state.config) return;
  const sh = -Math.max(document.body.scrollLeft, document.documentElement.scrollLeft);
  const sv = -Math.max(document.body.scrollTop, document.documentElement.scrollTop);
  if ($id("ruler-v")) $id("ruler-v").style.top = sv + "px";
  if ($id("ruler-h")) $id("ruler-h").style.left = sh + "px";

  if (state.config.layout == "h") {
    if (state.config.p.position != "absolute" && $id("period")) $id("period").style.left = sh + "px";
    if ($id("events")) $id("events").style.left = sh + "px";
  } else {
    if (state.config.p.position != "absolute" && $id("period")) $id("period").style.top = sv + "px";
    if ($id("events")) $id("events").style.top = sv + "px";
  }
}
