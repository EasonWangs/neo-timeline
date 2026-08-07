import Snap from "snapsvg-cjs";
import * as U from "./timeline-utils.js";

const $id = function(e){
  return document.getElementById(e)
}
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

/**
 * 绘制单个方向的时间标尺。
 *
 * 内部统一使用“时间轴 + 交叉轴”坐标：横向布局的时间轴是 x，纵向布局的
 * 时间轴是 y，再通过 orientPoint/orientRect 转成实际 SVG 坐标。这样主刻度、
 * 次刻度、月份刻度和文字定位只需维护一套逻辑。
 *
 * options.layout   标尺方向："h" 为横向，"v" 为纵向。
 * options.length   标尺沿时间轴方向的像素长度。
 * options.major    主刻度间隔，对应配置中的 hs/vs。
 * options.minor    可选的次刻度间隔，对应配置中的 hm/vm。
 * options.minSpace 自动计算次刻度时允许的最小文字间距。
 *
 * 返回创建好的 Snap.svg 标尺对象，以及最终采用的次刻度间隔。
 */
function drawAxisRuler(options) {
  // 标尺固定为 25px 厚；layout 只决定这 25px 落在宽度还是高度上。
  const thickness = 25;
  const isVertical = options.layout === "v";
  const zoom = state.config.zoom;

  // 根据主刻度的像素宽度和最小文字间距，计算最终采用的次刻度间隔。
  // 如果数据中显式配置了 hm/vm，getRulerInterval 会优先使用配置值。
  const minor = U.getRulerInterval(
    options.major,
    zoom,
    options.minSpace,
    options.minor
  );

  // 主刻度之间大致能容纳多少个分区；主刻度为 1 年时，用它决定月份细分密度。
  const divisions = Math.floor(options.major * zoom / options.minSpace);

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

  // i 是相对于 config.start 的时间偏移，每次按最终次刻度间隔向前推进。
  for (let i = 0; i < options.length / zoom; i += minor) {
    // 将时间偏移换算成时间轴上的像素位置。
    const timePosition = i * zoom;

    // 能被 major 整除的是主刻度：主刻度贯穿 25px，次刻度只画末端 10px。
    const isMajor = i % options.major === 0;
    const tickStart = isMajor ? 0 : 15;
    drawOrientedLine(ruler, timePosition, tickStart, thickness, options.layout).attr({
      stroke: "#8f9292",
      strokeWidth: 1
    });

    // 主刻度始终显示文字；主刻度间距足够宽时，次刻度也显示文字。
    if (isMajor || options.major * zoom >= 100) {
      // 横标尺文字向右偏 2px，纵标尺文字向上偏 2px，避免压住刻度线。
      const labelPosition = U.orientPoint(
        timePosition + (isVertical ? -2 : 2),
        isVertical ? 0 : 12.5,
        options.layout
      );
      const labelAttrs = { fill: "#b1b4b4" };

      // 次刻度文字比主刻度略小，用字号进一步区分层级。
      if (!isMajor) labelAttrs.fontSize = "0.8em";
      ruler.text(
        labelPosition.x,
        labelPosition.y,
        String(state.config.start + i)
      ).attr(labelAttrs);
    }

    // 主刻度单位为 1 年时，在当前空间允许的情况下补充年内月份刻度。
    if (options.major === 1) {
      // 从 12/6/4/3/2/1 中选择当前像素密度能容纳的最大分区数。
      const monthDivisions = [12, 6, 4, 3, 2, 1].find(function(value) {
        return value <= Math.max(divisions, 1);
      });

      // monthIndex 从 1 开始，跳过与年份主刻度重合的年初位置。
      for (let monthIndex = 1; monthIndex < monthDivisions; monthIndex++) {
        // 按该月份在一年内的比例，换算成时间轴上的像素位置。
        const monthPosition = timePosition + monthIndex / monthDivisions * zoom;
        drawOrientedLine(ruler, monthPosition, 16, thickness, options.layout).attr({
          stroke: "#8f9292",
          strokeWidth: 1
        });

        // 月份文字放在刻度线内侧，并使用更小字号，避免抢占年份标签空间。
        const labelPosition = U.orientPoint(
          monthPosition + (isVertical ? -2 : 2),
          isVertical ? 16 : 20,
          options.layout
        );
        ruler.text(
          labelPosition.x,
          labelPosition.y,
          monthIndex * (12 / monthDivisions) + 1
        ).attr({
          fill: "#b1b4b4",
          fontSize: "0.7em"
        });
      }
    }
  }

  // 将 minor 一并返回，调用方会回写到 o.hm/o.vm，保证背景网格使用相同间隔。
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

  const o = state.config.o;
  const layout = state.config.layout;
  let rulerH = null;
  let rulerV = null;
  if (layout === "h" && o.hs) {
    const result = drawAxisRuler({
      layout: "h",
      length: w,
      major: o.hs,
      minor: o.hm,
      minSpace: 25
    });
    rulerH = result.ruler;
    o.hm = result.minor;
    wrapper.appendChild(rulerH.node);
  }
  if (layout === "v" && o.vs) {
    const result = drawAxisRuler({
      layout: "v",
      length: h,
      major: o.vs,
      minor: o.vm,
      minSpace: 20
    });
    rulerV = result.ruler;
    o.vm = result.minor;
    wrapper.appendChild(rulerV.node);
  }

  const bgGrid = Snap(w, h).attr({ class: "svgBg" });
  bgGrid.rect(0, 0, w, h).attr({
    fill: state.config.svgBg || "#faf7ec"
  });

  // 背景网格的横纵线共用当前时间轴间隔，但不能把间隔写入另一轴配置。
  // 否则 resize 后下一次 drawRuler() 会误以为两个方向都需要标尺。
  const gridMajor = layout === "v" ? o.vs : o.hs;
  const gridMinor = layout === "v" ? o.vm : o.hm;

  for (let i = 0; i < w / state.config.zoom; i += gridMinor) {
    drawOrientedLine(bgGrid, i * state.config.zoom, 0, "100%", "h").attr({
      stroke: i % gridMajor === 0 ? "#f0ebdc" : "#f5f0e0",
      class: i % gridMajor === 0 ? "thickLine" : "thinLine"
    });
  }
  for (let i = 0; i < h / state.config.zoom; i += gridMinor) {
    drawOrientedLine(bgGrid, i * state.config.zoom, 0, "100%", "v").attr({
      stroke: i % gridMajor === 0 ? "#f0ebdc" : "#f5f0e0",
      class: i % gridMajor === 0 ? "thickLine" : "thinLine"
    });
  }

  wrapper.appendChild(bgGrid.node);
  state.rh = rulerH;
  state.rv = rulerV;
  state.svgBg = bgGrid;
}

// 时期范围
function drawPeriod(pers){
	const periodBoard = Snap("#period");
  state.period = periodBoard;
	if(state.config.p.position) periodBoard.node.style.position = state.config.p.position;
  let p = (state.config.p.padding || 50) * state.config.zoom;
  
  for (var i = 0; i < pers.length; i++) {
    const level = pers[i].level || 1;
    const timePosition = (pers[i].start - state.config.start) * state.config.zoom;
    const crossPosition = 25 + (level - 1) * p;
    const timeLength = (pers[i].end - pers[i].start) * state.config.zoom;
    const crossLength = state.config.p.type == "part"
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
    const textCross = 38 + (level - 1) * p;
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
    var periodGroup = periodBoard.g();
    
    //时期矩形
    var rect = periodBoard.rect(
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
    var text = periodBoard.text(textPosition.x, textPosition.y, pers[i].name).attr({
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
    // 解析日期
    const startDate = U.parseDate(pers[i].start);
    const endDate = U.parseDate(pers[i].end);
    
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
      var pointsGroup = periodBoard.g().attr({
        class: 'points'
      });
      
      for(var n = 0; n < points.length; n++){
        // 为每个点创建一个组
        let pointGroup = periodBoard.g().attr({
          class: 'point'
        });
        
        const pointPosition = U.orientPoint(
          (points[n].t - state.config.start) * state.config.zoom,
          crossPosition + 35,
          state.config.layout
        );
        let pointSVG = periodBoard.circle(pointPosition.x, pointPosition.y, 3).attr({
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
  
  // 只处理普通事件
  for (var i = 0; i < evts.length; i++) {
    // 处理普通事件
    if (evts[i].time) {
      // 为每个事件创建一个组
      var eventGroup = eventsBoard.g().attr({
        class: 'events common'
      });
      
      const timePosition = (evts[i].time - state.config.start) * state.config.zoom;
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
      });
      
      // 添加标题
      let desc = evts[i].time + (evts[i].desc ? evts[i].desc : "");
      let title = Snap.parse('<title>'+ desc +'</title>');
      text.append(title);
      
      // 添加文本到组
      eventGroup.add(text);
    }
  }
  
  // 处理关联事件（从角色的关键点中获取）
  if (roles) {
    drawConnectionEvents(roles);
  }
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
  
  // 获取点的坐标并确保是数值类型 - 不再添加偏移量
  const fp = {
    x: parseFloat(fromDot.attr('cx')) || 0,
    y: parseFloat(fromDot.attr('cy')) || 0
  };
  
  const tp = {
    x: parseFloat(toDot.attr('cx')) || 0,
    y: parseFloat(toDot.attr('cy')) || 0
  };

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

  state.currentSelection.currentIndex = newIndex;

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
  let w;
  let h = 2;
  let x = (item.start - state.config.start) * state.config.zoom;
  let y = (index - state.offset) * itemSpacing + 45;
  const startDate = U.parseDate(item.start);
  const endDate = U.parseDate(item.end);

  if (startDate) {
    x = U.getDatePosition(startDate, state.config.zoom, state.config.start);
  } else if (endDate) {
    x = U.getDatePosition(endDate, state.config.zoom, state.config.start) - (60 * state.config.zoom);
  } else {
    x = 0;
  }

  if (endDate) {
    w = U.getDatePosition(endDate, state.config.zoom, state.config.start) - x;
  } else if (startDate) {
    w = 90 * state.config.zoom;
  } else {
    w = state.config.zoom;
  }

  x = isFinite(x) ? x : 0;
  w = isFinite(w) ? Math.max(w, 1) : state.config.zoom;

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
  name.click(function(e){
    let parent = this.parent();
    if(parent.hasClass("show")){
      hide(parent);
    }else{
      show(parent);
    }
    e.stopPropagation();
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

  let descText = board.text(x3, y3, desc).attr({
    class: "descBox",
    fill:"#000",
  });
  let tspan = descText.selectAll('tspan').items;
  if(tspan.length > 0){
    for(let i in tspan){
      if(state.config.layout == "v"){
        tspan[i].attr({
          x: x3 + 16*i,
          y: y3
        });
      }else{
        tspan[i].attr({
          x: x3,
          y: geometry.y - i * 16 - 3
        });
      }
    }
  }
  itemBox.add(descText);
}

function renderKeypoints(board, item, itemBox, points, itemSpacing, geometry) {
  if(!points) return;

  let dotBox = board.g().attr({
    class:'dotBox'
  });
  let contBox = board.g().attr({
    class:'contBox'
  });

  let [x4,y4,x5,y5] = [geometry.x,geometry.y,geometry.x,geometry.y];
  for(let i = points.length - 1; i >= 0; i--){
    let point = points[i];
    const timePosition = (point.t - state.config.start) * state.config.zoom;
    const dotCross = state.config.layout == "v" ? geometry.x : geometry.y;
    const textCross = state.config.layout == "v" ? x5 : y5;
    const dotPosition = U.orientPoint(timePosition, dotCross, state.config.layout);
    const textPosition = U.orientPoint(timePosition, textCross, state.config.layout);
    x4 = dotPosition.x;
    y4 = dotPosition.y;
    x5 = textPosition.x;
    y5 = textPosition.y;

    let desc = String(point.t);
    if (item.start !== undefined && item.start !== null) {
      desc += "[" + (point.t - item.start)+ "]";
    }
    let keypointText = point.w ? U.prependLabelToValue(desc, point.w) : desc;
    let displayLines = point.w ? U.toLines(point.w) : [];

    let title = Snap.parse('<title>'+U.toPlainText(keypointText)+'</title>');
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
      'data-time': point.t
    });
    dot.append(title);

    function selectKeypoint(e) {
      show(dot.parent().parent(), i);

      const pt = dot.node.ownerSVGElement.createSVGPoint();
      pt.x = dot.attr('cx');
      pt.y = dot.attr('cy');
      const ctm = dot.node.getScreenCTM();
      const globalPt = pt.matrixTransform(ctm);

      const pointTitle = item.start !== undefined && item.start !== null
        ? `${point.t}[${point.t - item.start}]`
        : String(point.t);
      createPopup(globalPt.x, globalPt.y, U.buildPopupContent({
        title: pointTitle,
        lines: displayLines,
        meta: point.id ? `ID: ${point.id}` : ""
      }));

      e.stopPropagation();
    }

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

    let line = board.line(x4, y4, x5, y5).attr({
      stroke:"#000",
      strokeWidth: 2,
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

  const itemSpacing = state.config.size || 20;
  var itemBox = board.g().attr({
    class:"item",
    id: item.id || item.name
  });

  if(item.offset) {
    state.offset += item.offset;
  }

  const geometry = computeItemGeometry(item, i, itemSpacing);
  if (!geometry) return;

  let rect = board.rect(geometry.x, geometry.y, geometry.w, geometry.h, 2).attr({
    fill: geometry.fill
  });
  itemBox.add(rect);

  var name = renderItemHeader(board, item, itemBox, color, geometry);
  renderItemDesc(board, item, itemBox, geometry, name);
  renderKeypoints(board, item, itemBox, points, itemSpacing, geometry);

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
        fillOpacity: 0.2
    }).hover(function() {
        this.animate({
           fillOpacity: 0.5    
        }, 300); 
    }, function() {
        this.animate({
            fillOpacity: 0.2    
        }, 300); 
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
    
    // 使用prepend方法将元素添加到组的开头，确保它们在视觉上位于组的底层
    state.area[i].prepend(name);
    state.area[i].prepend(rect);
  }
}

function resize(viewScale = 1){
  if (!state.board) return;
  const size = state.board.getBBox();
  state.size = size;
  const scale = Number(viewScale) > 0 ? Number(viewScale) : 1;
  const viewportWidth = Math.max(0, window.innerWidth - 16) / scale;
  const viewportHeight = Math.max(0, window.innerHeight - 16) / scale;
  var w = Math.max(size.w + size.x + 100, viewportWidth),
      h = Math.max(size.h + size.y + 100, viewportHeight);
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
  if(state.config.layout == "v" && state.period){
      state.period.attr({
        height : h,
      });
   }else if (state.period){
     state.period.attr({
        width : w,
      });
   }
}

// 悬浮窗渲染
function createPopup(x, y, content) {
  // 输入: 鼠标坐标与结构化文本内容
  // 处理: 构建安全文本节点并绑定关闭行为
  // 输出: 页面上一个可关闭的悬浮窗
  removePopup();

  // 创建悬浮窗元素
  const popup = document.createElement('div');
  popup.className = 'connection-popup';
  
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

  // 添加关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'connection-popup__close';
  closeBtn.setAttribute('aria-label', '关闭说明');
  closeBtn.textContent = '×';
  closeBtn.onclick = () => removePopup();
  popup.appendChild(closeBtn);

  // 添加到文档中
  document.body.appendChild(popup);

  popup.addEventListener('click', function(e) {
    e.stopPropagation();
  });

  // 点击空白处关闭悬浮窗
  state.popupCloseHandler = function closePopup(e) {
    if (!popup.contains(e.target) && !e.target.closest('.connection')) {
      removePopup();
    }
  };
  document.addEventListener('click', state.popupCloseHandler);

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



// 修改 show 函数，记录选中状态
function show(that, i) {
  const pointIndex = i === undefined || i === null || i === "" ? -1 : Number(i);
  let pointNode = that.selectAll(".contGroup").items,
      len = pointNode.length;
  const hasPoint = Number.isInteger(pointIndex) && pointIndex >= 0 && pointIndex < len;
  const currPoint = hasPoint ? pointNode[len - pointIndex - 1] : null;

  state.board.selectAll(".currPoint").forEach(function(activePoint) {
    activePoint.removeClass("currPoint");
  });

  state.board.addClass("focus");
  if(hasPoint) { // 显示指定关键点
    state.board.addClass("focus-item");
    if(currPoint) currPoint.addClass('currPoint');
  }else{
    state.board.removeClass("focus-item");
  }
  that.addClass("show");

  // 记录当前选中的 item 和它的关键点
  const dots = that.selectAll(".dotBox circle").items;
  if (dots && dots.length > 0) {
    state.currentSelection.item = that;
    state.currentSelection.points = dots;
    state.currentSelection.currentIndex = hasPoint ? pointIndex : -1;
    
    // 添加键盘事件监听器
    document.addEventListener('keydown', handleKeyNavigation);
  }
}

function hide(node) {
  if (!node) return;
  node.removeClass("show");
  node.selectAll(".currPoint").forEach(function(activePoint) {
    activePoint.removeClass('currPoint');
  });
  removePopup();

  if (!state.board || state.board.selectAll(".show").items.length > 0) return;
  state.board.removeClass("focus focus-item");
  state.currentSelection = {
    item: null,
    points: [],
    currentIndex: -1
  };
  document.removeEventListener('keydown', handleKeyNavigation);
}

// 修改 hideAll 函数，清除选中状态
function hideAll() {
  if (!state.board) return;
  state.board.removeClass("focus focus-item");
  state.board.selectAll(".show").forEach(function(activeConn) {
    activeConn.removeClass('show');
  });
  state.board.selectAll(".currPoint").forEach(function(activeConn) {
    activeConn.removeClass('currPoint');
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
  document.addEventListener('mouseup', stopDrag);
  document.addEventListener('mouseleave', stopDrag);
  document.addEventListener('mousemove', dragScroll);
  document.addEventListener('touchstart', startTouchDrag, { passive: true });
  document.addEventListener('touchmove', dragTouchScroll, { passive: false });
  document.addEventListener('touchend', stopTouchDrag, { passive: true });
  document.addEventListener('touchcancel', stopTouchDrag, { passive: true });
}

function createTimelineConfig(data, layout) {
  const sourceConfig = data && data.config;
  const source = sourceConfig || {};
  const configuredStart = parseInt(source.start, 10);
  const config = {
    ...source,
    o: { ...(source.o || {}) },
    p: { ...(source.p || {}) },
    e: { ...(source.e || {}) },
    g: {
      ...(source.g || {}),
      colors: { ...((source.g && source.g.colors) || {}) }
    }
  };

  if (layout === "h" || layout === "v") {
    config.layout = layout;
    if (layout === "v") {
      config.o.vs = config.o.vs || config.o.hs;
      config.o.vm = config.o.vm || config.o.hm;
      delete config.o.hs;
      delete config.o.hm;
    } else {
      config.o.hs = config.o.hs || config.o.vs;
      config.o.hm = config.o.hm || config.o.vm;
      delete config.o.vs;
      delete config.o.vm;
    }
  }

  const normalized = U.normalizeConfig(config);
  if (!isFinite(configuredStart)) {
    normalized.start = U.inferTimelineStart(data, normalized);
  }
  return normalized;
}

function resetTimeline() {
  removePopup();
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
    svg.setAttribute("width", "100%");
    svg.setAttribute("height", "100%");
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
  state.offset = 0;
  state.size = null;
  state.currentSelection = {
    item: null,
    points: [],
    currentIndex: -1
  };
  state.drag.active = false;
  state.drag.touchActive = false;
}

export function initializeTimeline(data, options = {}) {
  resetTimeline();
  let scale = 1;
  const config = createTimelineConfig(data, options.layout);
  drawList(data, config);
  resize(scale);
  initDragPan();

  $id("wapper").className = config.layout == "v" ? "wapper vertical" : "wapper";

  return Object.freeze({
    getSnapshot: function() {
      return {
        wrapper: $id("wapper"),
        board: state.board,
        scale,
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
      resize(scale);
    },
    setScale: function(nextScale) {
      scale = nextScale;
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
