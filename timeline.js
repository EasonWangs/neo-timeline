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
  
  // 获取点的坐标并确保是数值类型
  const fp = {
    x: parseFloat(fromDot.attr('cx')) || 0,
    y: parseFloat(fromDot.attr('cy')) || 0
  };
  
  const tp = {
    x: parseFloat(toDot.attr('cx')) || 0,
    y: parseFloat(toDot.attr('cy')) || 0
  };
  
  // 确保点的顺序是从上到下或从左到右
  if (Cfg.layout == "v" && fp.y > tp.y) {
    // 垂直布局中，确保从上到下
    [fp, tp] = [tp, fp];
  } else if (Cfg.layout != "v" && fp.x > tp.x) {
    // 水平布局中，确保从左到右
    [fp, tp] = [tp, fp];
  }
  
  // 计算水平和垂直距离
  const dx_dist = Math.abs(tp.x - fp.x);
  const dy_dist = Math.abs(tp.y - fp.y);
  
  // 创建曲线路径
  let pathStr;
  let textPathStr;
  let textPathId = `text-path-${index}`;
  let arrowAngle = 0;
  
  // 辅助函数：确保坐标是有效数字
  const ensureNumber = (value) => {
    const num = parseFloat(value);
    return isFinite(num) ? num : 0;
  };
  
  // 辅助函数：格式化路径坐标
  const formatPoint = (x, y) => `${ensureNumber(x)},${ensureNumber(y)}`;
  
  if (Cfg.layout == "v") {
    if (Math.abs(fp.y - tp.y) < 1) {
      // S形曲线，水平方向
      const direction = (index % 2 === 0) ? 1 : -1;
      const offset = 30; // 垂直偏移量
      
      // 计算控制点坐标
      const cp1x = ensureNumber(fp.x + dx_dist/4);
      const cp1y = ensureNumber(fp.y + offset * direction);
      const cp2x = ensureNumber(tp.x - dx_dist/4);
      const cp2y = ensureNumber(tp.y + offset * direction);
      
      // 创建 S 形曲线
      pathStr = `M${formatPoint(fp.x, fp.y)} ` +
                `C${formatPoint(cp1x, cp1y)} ` +
                `${formatPoint(cp2x, cp2y)} ` +
                `${formatPoint(tp.x, tp.y)}`;
      
      // 为文本创建平滑的曲线路径
      textPathStr = pathStr;
      
      // 计算终点处的切线方向
      const dx_tangent = ensureNumber(tp.x - (tp.x - dx_dist/4));
      const dy_tangent = ensureNumber(tp.y - (tp.y + offset * direction));
      arrowAngle = Math.atan2(dy_tangent, dx_tangent) * 180 / Math.PI;
    } else {
      // 正常曲线
      const direction = (index % 2 === 0) ? -1 : 1;
      const ctrlOffset = Math.min(dx_dist * 0.8, 40); // 最大偏移40px
      
      // 计算控制点坐标
      const cp1y = ensureNumber(fp.y + ctrlOffset * direction);
      const cp2y = ensureNumber(tp.y + ctrlOffset * direction);
      
      // 创建三次贝塞尔曲线
      pathStr = `M${formatPoint(fp.x, fp.y)} ` +
                `C${formatPoint(fp.x, cp1y)} ` +
                `${formatPoint(tp.x, cp2y)} ` +
                `${formatPoint(tp.x, tp.y)}`;
      
      // 为文本创建平滑的曲线路径
      textPathStr = pathStr;
      
      // 计算终点处的切线方向
      const dx_tangent = ensureNumber(tp.x - (tp.x + ctrlOffset * direction));
      const dy_tangent = ensureNumber(tp.y - tp.y);
      arrowAngle = Math.atan2(dy_tangent, dx_tangent) * 180 / Math.PI;
    }
  } else {
    if (Math.abs(fp.x - tp.x) < 1) {
      // S形曲线，垂直方向
      const direction = (index % 2 === 0) ? -1 : 1;
      const offset = 30; // 水平偏移量
      
      // 计算控制点坐标
      const cp1x = ensureNumber(fp.x + offset * direction);
      const cp1y = ensureNumber(fp.y + dy_dist/4);
      const cp2x = ensureNumber(tp.x + offset * direction);
      const cp2y = ensureNumber(tp.y - dy_dist/4);
      
      // 创建 S 形曲线
      pathStr = `M${formatPoint(fp.x, fp.y)} ` +
                `C${formatPoint(cp1x, cp1y)} ` +
                `${formatPoint(cp2x, cp2y)} ` +
                `${formatPoint(tp.x, tp.y)}`;
      
      // 为文本创建平滑的曲线路径
      textPathStr = pathStr;
      
      // 计算终点处的切线方向
      const dx_tangent = ensureNumber(tp.x - (tp.x + offset * direction));
      const dy_tangent = ensureNumber(tp.y - (tp.y - dy_dist/4));
      arrowAngle = Math.atan2(dy_tangent, dx_tangent) * 180 / Math.PI;
    } else {
      // 正常曲线
      const direction = (index % 2 === 0) ? 1 : -1;
      const ctrlOffset = Math.min(dy_dist * 0.8, 40); // 最大偏移40px
      
      // 计算控制点坐标
      const cp1y = ensureNumber(fp.y + ctrlOffset * direction);
      const cp2y = ensureNumber(tp.y + ctrlOffset * direction);
      
      // 创建三次贝塞尔曲线
      pathStr = `M${formatPoint(fp.x, fp.y)} ` +
                `C${formatPoint(fp.x, cp1y)} ` +
                `${formatPoint(tp.x, cp2y)} ` +
                `${formatPoint(tp.x, tp.y)}`;
      
      // 为文本创建平滑的曲线路径
      textPathStr = pathStr;
      
      // 计算终点处的切线方向
      const dx_tangent = ensureNumber(tp.x - tp.x);
      const dy_tangent = ensureNumber(tp.y - (tp.y + ctrlOffset * direction));
      arrowAngle = Math.atan2(dy_tangent, dx_tangent) * 180 / Math.PI;
    }
  }
  
  // 使用Snap.svg创建路径
  var connPath = board.path(pathStr).attr({
    fill: "none",
    stroke: "#aaa",
    strokeWidth: 1,
    strokeDasharray: "2,2",
    id: `conn-path-${index}`
  });
  
  // 使用Snap.svg创建起点圆形
  var startCircle = board.circle(fp.x, fp.y, 2).attr({
    fill: "#666",
    stroke: "none"
  });
  
  // 创建箭头
  let arrowSize = 6; // 箭头大小
  let arrowPath = createArrow(tp.x, tp.y, arrowSize, arrowAngle);
  var endArrow = board.path(arrowPath).attr({
    fill: "#666",
    stroke: "none"
  });
  
  // 使用Snap.svg创建文本路径
  board.path(textPathStr).attr({
    id: textPathId,
    fill: "none",
    stroke: "none" // 不可见路径
  });
  
  // 使用Snap.svg创建文本
  var connText = board.text(0, 0, "").attr({
    class: 'text',
    fill: "#f55",
    opacity: 0
  });
  
  // 创建textPath元素
  var textPath = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
  textPath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${textPathId}`);
  textPath.textContent = name || `${fromPoint.roleName} → ${toPoint.roleName}`;
  textPath.setAttribute("startOffset", "50%");
  textPath.setAttribute("text-anchor", "middle");
  
  // 将textPath添加到文本元素
  connText.node.appendChild(textPath);
  
  // 添加title元素，内容使用w字段
  let titleText = name || `${fromPoint.roleName} → ${toPoint.roleName}`;
  let title = Snap.parse('<title>'+ titleText +'</title>');
  connText.append(title);
  
  // 使用Snap.svg创建组
  var g = board.g(connPath, startCircle, endArrow, connText).attr({
    class: 'connection',
    'data-from-role': fromPoint.roleName,
    'data-to-role': toPoint.roleName,
    'data-from-event': fromPoint.keypoint.id,
    'data-to-event': toPoint.keypoint.id
  });
  
 
  // 使用Snap.svg的hover方法添加悬停效果
  g.hover(
    function() {
      // 鼠标悬停时
      connPath.attr({
        stroke: "#f55",
        strokeWidth: 1.5,
        strokeDasharray: "3,3"
      });
      
      // 高亮相关联的两个元素
      let fromElement = board.select(`#${fromPoint.roleName}`);
      let toElement = board.select(`#${toPoint.roleName}`);
      
      if(fromElement) show(fromElement,-1);
      if(toElement) show(toElement,-1);
      
    },
    function() {
      // 鼠标离开时
      connPath.attr({
        stroke: "#aaa",
        strokeWidth: 1,
        strokeDasharray: "2,2"
      });
      hide();
    }
  );
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

//绘制列表
function drawList(data){
  board = Snap("#content");
  document.onclick = hide;
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
  } else {
    // 都不是近似值时
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
    show(this.parent());
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
	   if(point.w) {
	     if(typeof(point.w) == 'string'){
	       desc += point.w
	     }else{
	       point.w[0] = desc + point.w[0];
	       desc = point.w;
	     }
	   }
	   
	   //绘制点和线
	   let title = Snap.parse('<title>'+desc+'</title>');
	   let dot = board.circle(x4, y4, 2).attr({
	     stroke:"#f00",
	     fill:"#fff",
	     strokeWidth: 1,
       id: point.id || '', // 为每个点添加 id 属性
       'data-index': i // 添加索引属性
	   });
	   dot.append(title);
	   
	   // 将点击事件绑定到单个dot上，而不是整个dotBox
	   dot.click(function(e){
	     show(this.parent().parent(), this.attr('data-index'));
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


function show(that,i){
	let pointNode = that.selectAll(".contGroup").items;
  let len = pointNode.length;
  board.selectAll(".currPoint").attr({
    class:"contGroup"
  })
  let currPoint = pointNode[len - i - 1];
	if(currPoint){
    currPoint.attr({
      class:"contGroup currPoint"
    });
  }
  if(i != undefined){ // 只显示 item。不显示 point
    board.attr({
      class:"content focus focus-item"
    })
  }else{
    board.attr({
      class:"content focus"
    })
  }
  if(that.hasClass("show")) {
    //如果已经高亮了，则取消高亮
    that.attr({
      class:"item"
    });
  }else{
    that.attr({
      class:"item show"
    });
  }
  
}

function hide(){
	board.attr({
      class:"content"
    })
  board.selectAll(".show").attr({
    class:"item"
  })
}
