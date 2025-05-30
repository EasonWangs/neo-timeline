var $id = function(e){
  return document.getElementById(e)
}
function getParams() {
  var url = document.location,
    arr = url.search.substring(1).split("&"),
    arrHash = {};
  for (var i = 0; i < arr.length; i++) {
    arrHash[arr[i].split("=")[0]] = arr[i].split("=")[1];
  }
  return arrHash;
};
      
function drawRuler(w,h) {
   //绘制标尺[横]
  var o = Cfg.o;
  if(o.hs){
    // 动态计算合适的小标间隔
    const mainMarkWidth = o.hs * Cfg.zoom; // 主刻度之间的像素宽度
    const MIN_SPACE = 25; // 最小文字间隔
    const suggestedDivisions = Math.floor(mainMarkWidth / MIN_SPACE); // 建议划分次数
    o.hm = o.hm || Math.max(1, Math.floor(o.hs / suggestedDivisions));
    rh = Snap(w, 25).attr({
      id:"ruler-h",
      class:"ruler",
    });
    // 添加背景矩形
    rh.rect(0, 0, w, 25).attr({
      fill: Cfg.rulerBg || "#383838",
      fillOpacity: 0.8
    });
    for(var i = 0; i < w / Cfg.zoom; i += o.hm){
      let x =  i * Cfg.zoom;
      if(i % o.hs == 0){
        //此时是大标
        rh.line(x, 0, x, 25).attr({
          stroke: "#8f9292",
          strokeWidth: 1,
        });
        let text = (Cfg.start + i) + '';
        rh.text(x + 2, 12.5, text).attr({
          fill: "#b1b4b4"
        });
      }else{ 
        //其他情况是小标
        rh.line(x,15, x, 25).attr({
          stroke: "#8f9292",
          strokeWidth: 1,
        });
        // 检查相邻大标之间的空间
        let spaceToNextMark = o.hs * Cfg.zoom;
        if(spaceToNextMark >= 100) { // 如果空间大于100px，显示小标值
          let text = (Cfg.start + i) + '';
          rh.text(x + 2, 12.5, text).attr({
            fill: "#b1b4b4",
            fontSize: "0.8em" // 小标文字稍小
          });
        }
      }
      if(o.hs == 1){
        // 当 hs：1 时。额外绘制月标
        let len =[12, 6, 4, 3, 2, 1].find(m => m <= Math.max(suggestedDivisions, 1))
        for(var j = 1; j < len; j ++) { // 每个小标之间最多绘制12个下标,作为月标
          let posx = x + j/len * Cfg.zoom;
          // 月份标记
          rh.line(posx, 16, posx, 25).attr({
            stroke: "#8f9292",
            strokeWidth: 1,
          });
    
          // 计算月份
          let monthNum = j*(12/len) + 1; // 计算月份
          rh.text(posx + 2, 20, monthNum).attr({
            fill: "#b1b4b4",
            fontSize: "0.7em" // 月份标记文字稍小
          });
        }
      }
    }
    $id("wapper").appendChild(rh.node);
   }

  //绘制标尺[竖]
  if(o.vs){
    // 同样应用动态计算逻辑到垂直标尺
    const mainMarkWidth = o.vs * Cfg.zoom; // 主刻度之间的像素宽度
    let MIN_SPACE = 20;// 最小文字间v
    let suggestedDivisions = Math.floor((mainMarkWidth) / MIN_SPACE);
    o.vm = o.vm || Math.max(1, Math.floor(o.vs / suggestedDivisions));
    
    rv = Snap(25, h).attr({
      id:"ruler-v",
      class:"ruler"
    });
    // 添加背景矩形
    rv.rect(0, 0, 25, h).attr({
      fill: Cfg.rulerBg || "#383838",
      fillOpacity: 0.8
    });
    for (var i = 0; i < h / Cfg.zoom; i += o.vm) {
      let y = i * Cfg.zoom;
      if(i % o.vs == 0){ 
        //大标
        rv.line(0, y, 25, y).attr({
          stroke: "#8f9292",
          strokeWidth: 1,
        });
        let text = (Cfg.start + i) + '';
        let ruletext = rv.text(0,  y - 2,  text).attr({
          fill: "#b1b4b4"
        });
        // let matrix = new Snap.Matrix();
        // matrix.rotate(270, 0, y); // 旋转文字
        // ruletext.transform(matrix);
      }else{ //小标
        rv.line(15, y, 25, y).attr({
          stroke: "#8f9292",
          strokeWidth: 1,
        });
        // 检查相邻大标之间的空间
        let spaceToNextMark = o.vs * Cfg.zoom;
        if(spaceToNextMark >= 100) { // 如果空间大于100px，显示小标值
          let text = (Cfg.start + i) + '';
          rv.text(0, y - 2, text).attr({
            fill: "#b1b4b4",
            fontSize: "0.8em" // 小标文字稍小
          });
        }
      }
      if(o.vs == 1){
        // 当 vs：1 时。额外绘制月标
        let len =[12, 6, 4, 3, 2, 1].find(m => m <= Math.max(suggestedDivisions, 1))
        for(var j = 1; j < len; j ++) { // 每个小标之间最多绘制12个下标,作为月标
          let posy = y + j/len * Cfg.zoom;
          // 月份标记
          rv.line(16, posy, 25, posy).attr({
            stroke: "#8f9292",
            strokeWidth: 1,
          });
          // 计算月份
          let monthNum = j*(12/len) + 1; // 计算月份
          rv.text(16, posy-2, monthNum).attr({
            fill: "#b1b4b4",
            fontSize: "0.7em" // 月份标记文字稍小
          });
        }
      }
    }
    $id("wapper").appendChild(rv.node);
  }

   // svg绘制背景网格
  svgBg = Snap(w,h).attr({
    class:"svgBg"
  });
  
  // 添加背景矩形
  svgBg.rect(0, 0, w, h).attr({
    fill: Cfg.svgBg || "#faf7ec"
  });

  if(!o.hm){
    o.hm = o.vm;
    o.hs = o.vs;
  }
  if(!o.vm){
    o.vm = o.hm;
    o.vs = o.hs;
  }
  
  // 纵向栅格线
  for (var i = 0; i < w/Cfg.zoom; i += o.hm) {
    let line = svgBg.line(i * Cfg.zoom, 0, i * Cfg.zoom, "100%").attr({
        stroke:  (i % o.hs == 0) ? "#f0ebdc" : "#f5f0e0",
        class : (i % o.hs == 0) ? "thickLine" : "thinLine"
     })
  }

  // 横向栅格线
  for (var i = 0; i < h/Cfg.zoom; i+= o.vm) {
    let line = svgBg.line(0,  i * Cfg.zoom, "100%",  i * Cfg.zoom).attr({
        stroke:  (i % o.vs == 0) ? "#f0ebdc" : "#f5f0e0",
        class : (i % o.vs == 0) ? "thickLine" : "thinLine"
     });
  }
  $id("wapper").appendChild(svgBg.node);
}

// 检查是否为近似值
function isApproxDate(date) {
  return typeof date === 'string' && date.startsWith('~');
}

// 处理近似值，提取~后面的内容
function parseApproxDate(date) {
  if (isApproxDate(date)) {
    return date.substring(1).trim();
  }
  return date;
}

// 日期解析函数增强
const parseDate = (dateStr) => {
  if (!dateStr) return null;
  
  try {
    // 确保输入是字符串类型
    dateStr = String(dateStr);
    dateStr = dateStr.trim();
    
    // 处理近似值
    const isApprox = isApproxDate(dateStr);
    if (isApprox) {
      dateStr = parseApproxDate(dateStr);
      if (!dateStr) return null;
    }
    
   
    // 检查是否包含日期分隔符
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      
      // 解析年份（必需）
      const year = parseInt(parts[0]);
      if (isNaN(year)) {
        console.error('Invalid year:', dateStr);
        return null;
      }
      
      // 解析月份（可选）
      const month = parts.length > 1 ? parseInt(parts[1]) : 1;
      if (isNaN(month) || month < 1 || month > 12) {
        console.error('Invalid month:', dateStr);
        return null;
      }
      
      // 解析日期（可选）
      const day = parts.length > 2 ? parseInt(parts[2]) : 1;
      if (isNaN(day) || day < 1 || day > 31) {
        console.error('Invalid day:', dateStr);
        return null;
      }
      
      // 构建格式化的日期字符串
      let formattedDate = `${year}/${month.toString().padStart(2, '0')}`;
      if (parts.length > 2) {
        formattedDate += `/${day.toString().padStart(2, '0')}`;
      }
      
      return {
        year: year,
        month: month - 1,  // 转换为0-11
        day: day,
        isApprox: isApprox,
        original: isApprox ? '~' + formattedDate : formattedDate
      };
    }
    
    // 处理纯年份格式
    const parsedYear = parseInt(dateStr);
    if (isNaN(parsedYear)) {
      console.error('Invalid year:', dateStr);
      return null;
    }
    
    return {
      year: parsedYear,
      month: 0,
      day: 1,
      isApprox: isApprox,
      original: isApprox ? '~' + parsedYear : String(parsedYear)
    };
    
  } catch (e) {
    console.error('Date parse error:', dateStr, e);
    return null;
  }
};

// 计算日期在时间轴上的位置
const getDatePosition = (date, zoom) => {
  if (!date) return 0;
  
  try {
    // 确保所有输入都是有效数字
    const year = parseInt(date.year) || 0;
    const month = parseInt(date.month) || 0;
    const day = parseInt(date.day) || 1;
    const start = parseInt(Cfg.start) || 0;
    
    // 计算年份偏移
    const yearOffset = year - start;
    
    // 计算月份和日期的小数部分
    const monthFraction = month / 12;
    const dayFraction = day / (12 * 30); // 简化为每月30天
    
    const position = (yearOffset + monthFraction + dayFraction) * zoom;
    
    // 确保返回有效数字
    return isFinite(position) ? position : 0;
  } catch (e) {
    console.error('Position calculation error:', date, e);
    return 0;
  }
};

// 时期范围
function drawPeriod(pers){
	period = Snap("#period");
	if(Cfg.p.position) period.node.style.position = Cfg.p.position;
  let p = (Cfg.p.padding || 50) * Cfg.zoom;
  
  for (var i = 0; i < pers.length; i++) {
      var l = pers[i].level || 1,
        x = (pers[i].start - Cfg.start) * Cfg.zoom,
        y = 25 + (l - 1) * p,
        w = (pers[i].end - pers[i].start) * Cfg.zoom,
        h = Cfg.p.type == "part" ? p : "calc(100% - "+ y +"px)",
        tX = x,
        tY = 38 + (l - 1) * p,
        wm = "lr";

    switch(Cfg.p.textAnchor){
      case 'middle': 
        tX = x + w/2;
        break;
      case 'end':
        tX = x + w;
        break;
      case 'start':
      default:
        tX = x;
        break;
    }
   
    if(Cfg.layout == "v"){
      wm = "tb";
      [x, y, w, h] = [y, x, h, w];
      [tX, tY] =  [tY, tX];
      tX -= 2;
      tY += 2;
    }
     
    // 创建时期组
    var periodGroup = period.g();
    
    //时期矩形
    var rect = period.rect(x, y, w, h).attr({
      fill: Cfg.p.colors[i % Cfg.p.colors.length], 
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
    var text = period.text(tX, tY, pers[i].name).attr({
          class: 'text',
          writingMode: wm,
          textAnchor: Cfg.p.textAnchor,
        });

    let textBox = text.getBBox(),
        angle = 0;
        if(textBox.h > h-2){
          angle = -45;
        }
        if(textBox.w > w-2){
          angle = 45;
        }
    let matrix = new Snap.Matrix();
        matrix.rotate(angle, tX, tY); // 旋转文字
        text.transform(matrix);

    let desc = "";
    // 解析日期
    const startDate = parseDate(pers[i].start);
    const endDate = parseDate(pers[i].end);
    
    // 使用原始日期字符串显示
    if (startDate && endDate) {
      desc = `(${startDate.original}-${endDate.original})`;
    } else if (startDate) {
      desc = `(${startDate.original}-)`;
    } else if (endDate) {
      desc = `(-${endDate.original})`;
    }

    if(pers[i].desc) {
      if(typeof(pers[i].desc) == 'string'){
        desc += pers[i].desc;
      }else{
        pers[i].desc[0] = desc + pers[i].desc[0];
        desc = pers[i].desc;
      }
    }

    let title = Snap.parse('<title>'+ desc +'</title>');
    text.append(title);
    
    // 添加文本到组
    periodGroup.add(text);

    // 处理关键点
    var points = pers[i].keypoints;
    if(points){
      // 创建关键点组
      var pointsGroup = period.g().attr({
        class: 'points'
      });
      
      for(var n = 0; n < points.length; n++){
        // 为每个点创建一个组
        let pointGroup = period.g().attr({
          class: 'point'
        });
        
        let x = (points[n].t - Cfg.start) * Cfg.zoom;
        let pointSVG = period.circle(x, y + 35, 3).attr({
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
  
  // 只处理普通事件
  for (var i = 0; i < evts.length; i++) {
    // 处理普通事件
    if (evts[i].time) {
      // 为每个事件创建一个组
      var eventGroup = eventsBoard.g().attr({
        class: 'events common'
      });
      
      var x1 = (evts[i].time - Cfg.start) * Cfg.zoom,
          y1 = 0,
          x2 = x1,
          y2 = "100%",
          tX = x1,
          tY = 40;

      switch(Cfg.e.textAnchor){
        case 'middle': 
          tY = "50%";
          break;
        case 'end':
          tY = "100%";
          break;
        case 'start':
        default:
          tY = 40;
          break;
      }

      if(Cfg.layout == "v"){
        [x1, y1, x2, y2, tX, tY] = [y1, x1, y2, x2, tY, tX];
      }
    
      // 创建事件线
      var line = eventsBoard.line(x1, y1, x2, y2).attr({
        strokeWidth: 1,
        stroke: "#aaa",
        strokeDasharray: "5,5",
      });
      
      // 添加线到组
      eventGroup.add(line);

      // 创建事件文本
      var text = eventsBoard.text(tX, tY, evts[i].name).attr({
        class: 'text',
        textAnchor: Cfg.e.textAnchor,
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
      drawConnection(board, fromPoint, toPoint, connectionCount, kp.w);
      connectionCount++;
    }
  }
  
  if (connectionCount === 0) {
    console.info('在角色数据中未找到关联事件');
  } else {
    console.info(`已绘制 ${connectionCount} 个关联事件`);
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
  if (Cfg.layout == "v") {
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
  
  if (Cfg.layout == "v") {
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
  var connPath = board.path(pathStr).attr({
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
    opacity: 0,
    startOffset: "50%",
    title: titleText
  });
  
  // 使用Snap.svg创建组
  var g = board.g(connPath, endArrow, connText).attr({
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
    hideAll();
    
    // 检查是否已经处于高亮状态
    if (g.hasClass('active')) {
      g.removeClass('active');
    } else {
      g.addClass('active');
      // 高亮相关联的两个元素
      let fromElement = board.select(`#${fromPoint.roleName}`);
      let toElement = board.select(`#${toPoint.roleName}`);
      
      if(fromElement) show(fromElement,-1);
      if(toElement) show(toElement,-1);

      // 创建并显示悬浮窗
      const content = `
        <div style="margin-bottom: 5px;"><strong>${fromPoint.roleName} - ${toPoint.roleName} </strong></div>
        <div>时间: ${fromPoint.keypoint.t}-${toPoint.keypoint.t}</div>
        ${name ? `<div>${name}</div>` : ''}
      `;
      
      createPopup(e.clientX, e.clientY, content);
    }
  });
}

// 计算关键点的坐标
function calculatePointCoordinates(roleIndex, time) {
  const offset = window.offset || 0; // 确保offset变量可用
  
  if (Cfg.layout == "v") {
    return {
      x: (roleIndex - offset) * 20 + 45,
      y: (time - Cfg.start) * Cfg.zoom
    };
  } else {
    return {
      x: (time - Cfg.start) * Cfg.zoom,
      y: (roleIndex - offset) * 20 + 45
    };
  }
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
    fill: options.fill || "#f55",
    opacity: options.opacity || 0
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
function drawList(data){
  board = Snap("#content");
  document.onclick = hideAll;
  area = {};
  offset = 0;
  var roles = data.roles;
  for (var i = 0; i < roles.length; i++) {
    let item = roles[i],
        color = "#fff";
    if(!!item.groups){
      color = Cfg.g.colors[item.groups[0]]
    }
    drawItem(board, item, i, color, item.keypoints)
  }

  //画分组框
  if(Cfg.g.show) drawItemGroup(Cfg.g.colors)
  
  //画区域框
  var periods = data.periods;
  if(periods) drawPeriod(periods);

  //画事件线
  var events = data.events;
  if(events) drawEvents(events, data.roles);
}


// 修改键盘导航处理函数
function handleKeyNavigation(e) {
  if (!currentSelection.item || !currentSelection.points.length) return;

  const { points, currentIndex } = currentSelection;
  let newIndex = currentIndex;
  switch (e.key) {
    case 'ArrowLeft':
    case 'ArrowUp':
      // 向上/左移动时，index 减小（更早的事件）
      newIndex = Math.max(0, currentIndex - 1);
      break;
    case 'ArrowRight':
    case 'ArrowDown':
      // 向下/右移动时，index 增加（更新的事件）
      newIndex = Math.min(points.length - 1, currentIndex - 0 + 1);
      break;
    default:
      return;
  }
  if (newIndex !== currentIndex) {
    e.preventDefault();
    
    // 更新当前索引
    currentSelection.currentIndex = newIndex;
    
    // 获取当前点并触发点击事件
    const currentDot = points.find(dot => parseInt(dot.attr('data-index')) === newIndex);
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
}

//绘制个体
function drawItem(board, item, i, color, points) {
  if (!item) return;
  
  // 使用 Cfg.size 作为基础间距，默认值为 20
  const itemSpacing = Cfg.size || 20;
 
  var itemBox = board.g().attr({
    class:"item",
    id: item.id || item.name
  });

  if(item.offset) offset += item.offset;
  // 计算x坐标和宽度
  let w, h = 2;
  var x = (item.start - Cfg.start) * Cfg.zoom,
  y = (i - offset) * itemSpacing + 45; // 使用 itemSpacing 替换固定值

   // 解析日期并获取位置
   const startDate = parseDate(item.start);
   const endDate = parseDate(item.end);
   
  
  if (startDate) {
    x = getDatePosition(startDate, Cfg.zoom);
  } else if (endDate) {
    x = getDatePosition(endDate, Cfg.zoom) - (60 * Cfg.zoom);
  } else {
    x = 0;
  }

  if (endDate) {
    w = getDatePosition(endDate, Cfg.zoom) - x;
  } else if (startDate) {
    w = 90 * Cfg.zoom;
  } else {
    w = Cfg.zoom;
  }

  // 确保x和w是有效数值
  x = isFinite(x) ? x : 0;
  w = isFinite(w) ? Math.max(w, 1) : Cfg.zoom;

  // 布局转换
  if (Cfg.layout == "v") {
    const temp = h;
    h = w;
    w = temp;
    const tempX = x;
    x = y;
    y = tempX;
  }

  // 最终验证
  if (!isFinite(x) || !isFinite(y) || !isFinite(w) || !isFinite(h)) {
    console.error('Invalid dimensions:', {x, y, w, h}, 'for item:', item);
    return;
  }

  // 创建矩形，处理近似日期的渐变
  let fill;
  
  // 根据start和end的近似值状态设置填充样式
  if (startDate && startDate.isApprox && endDate && endDate.isApprox) {
    // 当两端都是近似值时
    fill = (Cfg.layout == "v") ? "url(#gradTB)" : "url(#gradLR)";
  } else if (startDate && startDate.isApprox) {
    // 只有start是近似值时
    fill = (Cfg.layout == "v") ? "url(#gradT)" : "url(#gradL)";
  } else if (endDate && endDate.isApprox) {
    // 只有end是近似值时
    fill = (Cfg.layout == "v") ? "url(#gradB)" : "url(#gradR)";
  } else if (startDate && !endDate) {
    // 没有结束日期，使用右侧渐变
    fill = (Cfg.layout == "v") ? "url(#gradB)" : "url(#gradR)";
  } else if (!startDate && endDate) {
    // 没有开始日期，使用左侧渐变
    fill = (Cfg.layout == "v") ? "url(#gradT)" : "url(#gradL)";
  } else {
    // 其他情况使用纯色
    fill = "#000";
  }

  // 创建矩形并应用填充样式
  let rect = board.rect(x, y, w, h, 2).attr({
    fill: fill
  });
  // 直接将矩形添加到组中
  itemBox.add(rect);

  //绘制name
  let x1 = x, y1 = y - 3;
  if(Cfg.layout == "v"){
      x1 = x + 10;
      y1 = y;
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
  })
  // 直接将文本添加到组中
  itemBox.add(name);


     //图标
  let x2 = x - 15, y2 = y - 13;
  if(Cfg.layout == "v"){
      x2 = x + 2;
      y2 = y - 13;
   }

  if(item.icon){
    var url = Cfg.iconPath + item.icon + '.svg'
    var icon = board.image(url, x2, y2, 15, 12).attr({
      class:"icon",
      title:item.iconText
    });
    let title = Snap.parse('<title>'+item.iconText+'</title>');
    icon.append(title);
    // 直接将图标添加到组中
    itemBox.add(icon);
  }

   //绘制name的desc
  let desc = "";
  if (startDate && endDate) {
    desc = `(${startDate.original}-${endDate.original})`;
  } else if (startDate) {
    desc = `(${startDate.original}-)`;
  } else if (endDate) {
    desc = `(-${endDate.original})`;
  }

  if(item.iconText){
    desc += "["+item.iconText+"]";
  }
  if(item.desc) {
    if(typeof(item.desc) == 'string'){
      desc += item.desc;
    }else{
      item.desc[0] = desc + item.desc[0];
      desc = item.desc;
    }
  }
  let x3, y3;
   if(Cfg.layout == "v"){
     x3 = x + 10;
     y3 = y + name.getBBox().width + 3;
   }else if(Cfg.layout == "h"){
     x3 = x + name.getBBox().width + 3;
     y3 = y - 3;
   }

  let descText = board.text(x3, y3, desc).attr({
      class: "descBox",
      fill:"#000",
    });
  let tspan = descText.selectAll('tspan').items;
  if(tspan.length > 0){
      for(let i in tspan){
        if(Cfg.layout == "v"){
           tspan[i].attr({
              x: x3 + 16*i,
              y: y3
            })
         }else if(Cfg.layout == "h"){
           tspan[i].attr({
              x: x3,
              y: y - i * 16 - 3
            })
         }
      }
  }
  // 直接将描述文本添加到组中
  itemBox.add(descText);

  //keypoints
  if(points){
    // 使用g()方法创建点和连接线的组
    let dotBox = board.g().attr({
        class:'dotBox'
    });
    let contBox = board.g().attr({
        class:'contBox'
    });

    let [x4,y4,x5,y5] = [x,y,x,y];
    for(let i = points.length - 1; i >= 0; i--){
      let point = points[i];
      if(Cfg.layout == "v"){
         y4 = (point.t - Cfg.start) * Cfg.zoom;
         y5 = y4;
       }else if(Cfg.layout == "h"){
         x4 = (point.t - Cfg.start) * Cfg.zoom;
         x5 = x4
       }
	   
	   //keypoints信息
	   let desc = point.t;
	       desc += item.start ? "[" + (point.t - item.start)+ "]" : "";
       let displayContent = "";
       if(point.w) {
         if(typeof(point.w) == 'string'){
           displayContent = point.w;
           desc += point.w;
         }else{
           point.w[0] = desc + point.w[0];
           desc = point.w;
           displayContent = point.w.join('<br>');
         }
       }
	   
	   //绘制点和线
	   let title = Snap.parse('<title>'+desc+'</title>');
	   let dot = board.circle(x4, y4, 2).attr({
	     stroke:"#f00",
	     fill:"#fff",
	     strokeWidth: 1,
       id: point.id || '',
       'data-index': i,
       'data-time': point.t // 添加时间属性
	   });
	   dot.append(title);
	   
	   // 修改点击事件处理
	   dot.click(function(e){
	     show(this.parent().parent(), this.attr('data-index'));
	     
	     // 获取点的坐标并转换为页面坐标
	     const pt = this.node.ownerSVGElement.createSVGPoint();
	     pt.x = this.attr('cx');
	     pt.y = this.attr('cy');
	     
	     // 转换为页面坐标
	     const ctm = this.node.getScreenCTM();
	     const globalPt = pt.matrixTransform(ctm);
	     
	     // 创建悬浮窗内容
	     const content = `
	       <div style="margin-bottom: 5px;">
	         <strong>${point.t}[${point.t - item.start}]</strong>
	       </div>
	       ${displayContent ? `<div style="margin-top: 5px;">${displayContent}</div>` : ''}
	       ${point.id ? `<div style="color: #666; font-size: 12px; margin-top: 5px;">ID: ${point.id}</div>` : ''}
	     `;
	     
	     // 使用点的实际坐标显示悬浮窗
	     createPopup(globalPt.x, globalPt.y, content);
	     
	     e.stopPropagation(); 
	   });
	   
	   dotBox.add(dot);
	   //绘制线和文本
	   if(Cfg.layout == "v"){
	     x5 -= itemSpacing - 2; // 使用 Cfg.size 计算线的长度
	   }else if(Cfg.layout == "h"){
	     y5 += itemSpacing - 2; // 使用 Cfg.size 计算线的长度
	   }
	   
	   // 为每组line和text创建一个组
	   let lineTextGroup = board.g().attr({
	     class: 'contGroup'
	   });
	   
	   // 绘制线
	   let line = board.line(x4, y4, x5, y5).attr({
	     stroke:"#000",
	     strokeWidth: 2,
	   });
	   
	   //显示信息
	   let text = board.text(x5, y5, desc).attr({
	     class:"dotText",
	   });
	   
	   let tspan = text.selectAll('tspan').items;
	   if(tspan.length > 0){
	     for(let i in tspan){
	       tspan[i].attr({
	         x: x5,
	         y: y5
	       })
	       if(Cfg.layout == "v"){
	         x5 -= itemSpacing - 4 // 使用 Cfg.size 计算文本间距
	         y5 -= itemSpacing * 6.8 // 使用 Cfg.size 计算文本垂直间距
	       }else if(Cfg.layout == "h"){
	         y5 += itemSpacing - 4 // 使用 Cfg.size 计算文本间距
	       }
	     }
	   }
	   
	   // 将line和text添加到组中
	   lineTextGroup.add(line);
	   lineTextGroup.add(text);
	   
	   // 将组添加到contBox中
	   contBox.add(lineTextGroup);
    }
    // 将dotBox和contBox组添加到itemBox组中
    itemBox.add(dotBox);
    itemBox.add(contBox);
  }

  //groups
  if(!!item.groups){
    var gp = item.groups[0];
    if(!(gp in area)) {
       // 使用g()方法创建组
       area[gp] = board.g().attr({
        class:"group "+ gp,
      });
    }
    // 将itemBox组添加到area[gp]组中
    area[gp].add(itemBox);
  } else {
    // 如果没有组，直接将itemBox添加到board
    board.add(itemBox);
  }
}

//绘制group
function drawItemGroup(color){
  for(var i in area) {
    let itemBox = area[i].getBBox(),
        x = itemBox.x - 2,
        y = itemBox.y + 1,
        w = itemBox.width + 4,
        h = itemBox.height - 1;
    
    // 创建组框矩形
    let rect = board.rect(x, y, w, h, 5).attr({
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
    if(Cfg.layout == "v"){
      x1 = x + w/2;
      y1 = y - 2;
    }
    
    // 创建标题文本
    var name = board.text(x1, y1, i).attr({
      class: "title",
      fill: "#000",
      style: "text-shadow: 1px 1px "+ color[i] + ", -1px -1px "+ color[i]
    });
    
    // 使用prepend方法将元素添加到组的开头，确保它们在视觉上位于组的底层
    area[i].prepend(name);
    area[i].prepend(rect);
  }
}

function zoom(z){
  rh.attr({
    style: " transform: scale("+ z + ")"
  });
  
  board.attr({
    style: " transform: scale("+ z + ")"
  });
  svgBg.attr({
    style: "transform: scale("+ z + ")"
  });
  period.attr({
    style: "transform: scale("+ z + ")"
  });
}

function save(){
	var svgStr = period.outerSVG();
	console.log(svgStr)
	var image1 = new Image();
	image1.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgStr)));
	var image2 = new Image();
	image2.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(board.outerSVG())));
	var image4 = new Image();
	image4.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(rh.outerSVG())));
	var image5 = new Image();
	image5.src = 'data:image/svg+xml;base64,' + window.btoa(unescape(encodeURIComponent(svgBg.outerSVG())));
	var canvas = document.createElement("canvas");
	canvas.width = board.node.clientWidth;
	canvas.height = board.node.clientHeight;
	setTimeout(function(){
		var ctx = canvas.getContext("2d");
		ctx.drawImage(image5, 0, 0);
		ctx.drawImage(image4, 0, 0);
		    ctx.drawImage(image1, 0, 0);
			ctx.drawImage(image2, 0, 0);
			ctx.drawImage(image3, 0, 0);
		    var a = document.createElement('a');
		    a.href = canvas.toDataURL('image/png'); // 转换Canvas为PNG图片数据
		    a.download = 'your-image-name.png'; // 定义下载文件名
		    a.click(); // 触发下载
	},1000)
}

function resize(){
  size = board.getBBox();
  var w = Math.max(size.w + size.x + 100, document.documentElement.offsetWidth - 16),
      h = Math.max(size.h + size.y + 100, document.documentElement.offsetHeight - 16);
  drawRuler(w,h);

  board.attr({
    width : w,
    height : h,
  });
  if(Cfg.layout == "v"){
      period.attr({
        height : h,
      });
   }else{
     period.attr({
        width : w,
      });
   }
}

// 添加一个全局变量来跟踪当前选中的状态
let currentSelection = {
  item: null,
  points: [],
  currentIndex: -1
};


// 在文件中添加新的函数来创建和显示悬浮窗
function createPopup(x, y, content) {
  // 移除已存在的悬浮窗
  const existingPopup = document.querySelector('.connection-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // 创建悬浮窗元素
  const popup = document.createElement('div');
  popup.className = 'connection-popup';
  popup.innerHTML = content;
  
  // 设置样式 - 在 x 和 y 坐标上分别减去 2 像素
  popup.style.cssText = `
    position: fixed;
    left: ${x + 5}px;
    top: ${y + 5}px;
    background: white;
    border: 1px solid #ccc;
    padding: 8px 12px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    z-index: 1000;
    font-size: 14px;
    max-width: 240px;
  `;

  // 添加关闭按钮
  const closeBtn = document.createElement('span');
  closeBtn.innerHTML = '×';
  closeBtn.style.cssText = `
    position: absolute;
    right: 5px;
    top: 2px;
    cursor: pointer;
    color: #999;
    font-size: 16px;
  `;
  closeBtn.onclick = () => popup.remove();
  popup.appendChild(closeBtn);

  // 添加到文档中
  document.body.appendChild(popup);

  // 点击空白处关闭悬浮窗
  document.addEventListener('click', function closePopup(e) {
    if (!popup.contains(e.target) && !e.target.closest('.connection')) {
      popup.remove();
      document.removeEventListener('click', closePopup);
    }
  });

  // 调整位置以确保在视窗内
  const rect = popup.getBoundingClientRect();
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (rect.right > viewportWidth) {
    popup.style.left = `${viewportWidth - rect.width - 10}px`;
  }
  if (rect.bottom > viewportHeight) {
    popup.style.top = `${viewportHeight - rect.height - 10}px`;
  }
}



// 修改 show 函数，记录选中状态
function show(that, i) {
  let pointNode = that.selectAll(".contGroup").items,
      len = pointNode.length,
      currPoint = pointNode[len - i - 1];
   
  board.addClass("focus");
  if(i != undefined) { // 只显示 item。不显示 point
    board.addClass("focus-item");
    if(currPoint) currPoint.addClass('currPoint');
  }
  that.addClass("show");

  // 记录当前选中的 item 和它的关键点
  const dots = that.selectAll(".dotBox circle").items;
  if (dots && dots.length > 0) {
    currentSelection.item = that;
    currentSelection.points = dots;
    currentSelection.currentIndex = i !== undefined ? i : -1;
    
    // 添加键盘事件监听器
    document.addEventListener('keydown', handleKeyNavigation);
  }
}

// 修改 hideAll 函数，清除选中状态
function hideAll() {
  board.removeClass("focus focus-item");
  board.selectAll(".show").forEach(function(activeConn) {
    activeConn.removeClass('show');
  });
  board.selectAll(".currPoint").forEach(function(activeConn) {
    activeConn.removeClass('currPoint');
  });
  board.selectAll('.connection.active').forEach(function(activeConn) {
    activeConn.removeClass('active');
  });
  
  // 移除悬浮窗
  const popup = document.querySelector('.connection-popup');
  if (popup) {
    popup.remove();
  }

  // 清除当前选中状态
  currentSelection = {
    item: null,
    points: [],
    currentIndex: -1
  };
  
  // 移除键盘事件监听器
  document.removeEventListener('keydown', handleKeyNavigation);
}