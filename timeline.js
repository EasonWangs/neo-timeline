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
      class:"ruler"
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

// 检查是否为近似值（包括纯~和~1992这样的形式）
function isApproxDate(date) {
  return typeof date === 'string' && date.startsWith('~');
}

// 处理近似值，提取~后面的数字
function parseApproxDate(date) {
  if (isApproxDate(date)) {
    let num = parseInt(date.substring(1));
    return isNaN(num) ? null : num;
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
    
    // 处理完整日期格式 "1904-02-12" 或年月格式 "1904-02"
    if (typeof dateStr === 'string' && dateStr.includes('-')) {
      const parts = dateStr.split('-');
      
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
     
    //时期
    var rect = period.paper.rect(x, y, w, h).attr({
      fill:  Cfg.p.colors[i % Cfg.p.colors.length], 
      fillOpacity: 0.2,
    }).hover(function() {
        this.animate({
           fillOpacity: 0.6    
        },300); 
    }, function() {
        this.animate({
           fillOpacity: 0.2    
        },300); 
    }); 
 
 
    //时期文字
    var text = period.text(tX , tY,  pers[i].name).attr({
          class: 'text',
          writingMode : wm,
          textAnchor : Cfg.p.textAnchor,
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
    var g = period.paper.g(rect, text);

    var points = pers[i].keypoints
    if(points){
      for(var n = 0; n < points.length; n++){
        let p = period.paper.g().attr({
          class:'point'
        });
        let x = (points[n].t - Cfg.start) * Cfg.zoom;
        let pointSVG = period.paper.circle(x, y + 35, 3).attr({
          stroke:"#f00",
          strokeWidth: 1,
        });
        let title = Snap.parse('<title>'+ points[n].t + "-" +points[n].w+'</title>');
        pointSVG.append(title);
        p.add(pointSVG);
        g.add(p)
      }
    }
  }
}


// 事件清单
function drawEvents(evts, roles){
  if (!evts) {
    console.error('Missing events for drawing');
    return;
  }
 
  for (var i = 0; i < evts.length; i++) {
    // 处理普通事件
    if (evts[i].time) {
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
          tY = 40 ;
          break;
      }

      if(Cfg.layout == "v"){
        [ x1, y1, x2, y2, tX, tY] = [y1, x1, y2, x2, tY, tX];
      }
    
      var line = board.paper.line(x1, y1, x2, y2).attr({
        strokeWidth: 1,
        stroke:"#aaa",
        strokeDasharray:"5,5",
      })

      var text = board.text(tX, tY, evts[i].name).attr({
            class: 'text',
            textAnchor : Cfg.e.textAnchor,
          });
      let desc = evts[i].time + (evts[i].desc ? evts[i].desc : "");
      let title = Snap.parse('<title>'+ desc +'</title>');
          text.append(title);
      var g = board.paper.g(line, text).attr({
        class: 'events common'
      });
    } 
    // 处理关联事件
    else if (evts[i].from && evts[i].to) {
      // 查找源点和目标点
      let fromPoint = null;
      let toPoint = null;
      
      // 遍历所有角色查找点
      if (roles) {
        for (let r = 0; r < roles.length; r++) {
          const role = roles[r];
          if (role.keypoints) {
            for (let k = 0; k < role.keypoints.length; k++) {
              const kp = role.keypoints[k];
              if (kp.id === evts[i].from) {
                if (Cfg.layout == "v") {
                  // 垂直布局时交换x和y坐标
                  fromPoint = {
                    x: (r - offset) * 20 + 45,
                    y: (kp.t - Cfg.start) * Cfg.zoom,
                    t: kp.t
                  };
                } else {
                  fromPoint = {
                    x: (kp.t - Cfg.start) * Cfg.zoom,
                    y: (r - offset) * 20 + 45,
                    t: kp.t
                  };
                }
              }
              if (kp.id === evts[i].to) {
                if (Cfg.layout == "v") {
                  // 垂直布局时交换x和y坐标
                  toPoint = {
                    x: (r - offset) * 20 + 45,
                    y: (kp.t - Cfg.start) * Cfg.zoom,
                    t: kp.t
                  };
                } else {
                  toPoint = {
                    x: (kp.t - Cfg.start) * Cfg.zoom,
                    y: (r - offset) * 20 + 45,
                    t: kp.t
                  };
                }
              }
            }
          }
        }
      }
      
      // 如果找到了两个点，绘制曲线连接
      if (fromPoint && toPoint) {
        // 创建曲线路径
        let pathStr;
        let textPathStr;
        let textPathId = `text-path-${i}`;
        
        // 确保点的顺序是从上到下或从左到右
        let fp = fromPoint;
        let tp = toPoint;
        
        if (Cfg.layout == "v" && fp.y > tp.y) {
          // 垂直布局中，确保从上到下
          fp = toPoint;
          tp = fromPoint;
        } else if (Cfg.layout != "v" && fp.x > tp.x) {
          // 水平布局中，确保从左到右
          fp = toPoint;
          tp = fromPoint;
        }
        
        if (Cfg.layout == "v") {
          // 垂直布局的曲线
          const dy = Math.abs(tp.y - fp.y);
          const dx = Math.abs(tp.x - fp.x);
          const textOffset = 15; // 文本额外偏移量
          
          // 处理 y 值相同的情况
          if (Math.abs(fp.y - tp.y) < 1) {
            // 如果 y 值几乎相同，强制添加垂直偏移
            const offset = 30; // 垂直偏移量
            
            // 确定偏移方向（向上或向下）- 反转方向
            const direction = (i % 2 === 0) ? 1 : -1; // 交替使用不同方向
            
            // 创建 S 形曲线
            pathStr = `M${fp.x},${fp.y} ` +
                      `C${fp.x + dx/4},${fp.y + offset * direction} ` +
                      `${tp.x - dx/4},${tp.y + offset * direction} ` +
                      `${tp.x},${tp.y}`;
            
            // 为文本创建平滑的曲线路径，增加额外偏移
            const steps = 10; // 路径分段数
            textPathStr = "M";
            
            for (let step = 0; step <= steps; step++) {
              const t = step / steps;
              // 三次贝塞尔曲线的参数方程，增加额外偏移
              const x = Math.pow(1-t, 3) * fp.x + 
                        3 * Math.pow(1-t, 2) * t * (fp.x + dx/4) + 
                        3 * (1-t) * Math.pow(t, 2) * (tp.x - dx/4) + 
                        Math.pow(t, 3) * tp.x;
              const y = Math.pow(1-t, 3) * fp.y + 
                        3 * Math.pow(1-t, 2) * t * (fp.y + (offset + textOffset) * direction) + 
                        3 * (1-t) * Math.pow(t, 2) * (tp.y + (offset + textOffset) * direction) + 
                        Math.pow(t, 3) * tp.y;
              
              textPathStr += (step === 0 ? "" : " L") + `${x},${y}`;
            }
          } else {
            // 正常情况下的控制点偏移量
            const ctrlOffset = Math.min(dx * 0.8, 40); // 最大偏移50px
            
            // 确定偏移方向（向左或向右）- 反转方向
            const direction = (i % 2 === 0) ? -1 : 1; // 交替使用不同方向
            
            // 创建三次贝塞尔曲线
            pathStr = `M${fp.x},${fp.y} ` +
                      `C${fp.x + ctrlOffset * direction},${fp.y} ` +
                      `${tp.x + ctrlOffset * direction},${tp.y} ` +
                      `${tp.x},${tp.y}`;
            
            // 为文本创建平滑的曲线路径，增加额外偏移
            const steps = 10; // 路径分段数
            textPathStr = "M";
            
            for (let step = 0; step <= steps; step++) {
              const t = step / steps;
              // 三次贝塞尔曲线的参数方程，增加额外偏移
              const x = Math.pow(1-t, 3) * fp.x + 
                        3 * Math.pow(1-t, 2) * t * (fp.x + (ctrlOffset + textOffset) * direction) + 
                        3 * (1-t) * Math.pow(t, 2) * (tp.x + (ctrlOffset + textOffset) * direction) + 
                        Math.pow(t, 3) * tp.x;
              const y = Math.pow(1-t, 3) * fp.y + 
                        3 * Math.pow(1-t, 2) * t * fp.y + 
                        3 * (1-t) * Math.pow(t, 2) * tp.y + 
                        Math.pow(t, 3) * tp.y;
              
              textPathStr += (step === 0 ? "" : " L") + `${x},${y}`;
            }
          }
        } else {
          // 水平布局的曲线
          const dx = Math.abs(tp.x - fp.x);
          const dy = Math.abs(tp.y - fp.y);
          const textOffset = 15; // 文本额外偏移量
          
          // 处理 x 值相同的情况
          if (Math.abs(fp.x - tp.x) < 1) {
            // 如果 x 值几乎相同，强制添加水平偏移
            const offset = 30; // 水平偏移量
            
            // 确定偏移方向（向左或向右）- 反转方向
            const direction = (i % 2 === 0) ? -1 : 1; // 交替使用不同方向
            
            // 创建 S 形曲线
            pathStr = `M${fp.x},${fp.y} ` +
                      `C${fp.x + offset * direction},${fp.y + dy/4} ` +
                      `${tp.x + offset * direction},${tp.y - dy/4} ` +
                      `${tp.x},${tp.y}`;
            
            // 为文本创建平滑的曲线路径，增加额外偏移
            const steps = 10; // 路径分段数
            textPathStr = "M";
            
            for (let step = 0; step <= steps; step++) {
              const t = step / steps;
              // 三次贝塞尔曲线的参数方程，增加额外偏移
              const x = Math.pow(1-t, 3) * fp.x + 
                        3 * Math.pow(1-t, 2) * t * (fp.x + (offset + textOffset) * direction) + 
                        3 * (1-t) * Math.pow(t, 2) * (tp.x + (offset + textOffset) * direction) + 
                        Math.pow(t, 3) * tp.x;
              const y = Math.pow(1-t, 3) * fp.y + 
                        3 * Math.pow(1-t, 2) * t * (fp.y + dy/4) + 
                        3 * (1-t) * Math.pow(t, 2) * (tp.y - dy/4) + 
                        Math.pow(t, 3) * tp.y;
              
              textPathStr += (step === 0 ? "" : " L") + `${x},${y}`;
            }
          } else {
            // 正常情况下的控制点偏移量
            const ctrlOffset = Math.min(dy * 0.8, 40); // 最大偏移50px
            
            // 确定偏移方向（向上或向下）- 反转方向
            const direction = (i % 2 === 0) ? 1 : -1; // 交替使用不同方向
            
            // 创建三次贝塞尔曲线
            pathStr = `M${fp.x},${fp.y} ` +
                      `C${fp.x},${fp.y + ctrlOffset * direction} ` +
                      `${tp.x},${tp.y + ctrlOffset * direction} ` +
                      `${tp.x},${tp.y}`;
            
            // 为文本创建平滑的曲线路径，增加额外偏移
            const steps = 10; // 路径分段数
            textPathStr = "M";
            
            for (let step = 0; step <= steps; step++) {
              const t = step / steps;
              // 三次贝塞尔曲线的参数方程，增加额外偏移
              const x = Math.pow(1-t, 3) * fp.x + 
                        3 * Math.pow(1-t, 2) * t * fp.x + 
                        3 * (1-t) * Math.pow(t, 2) * tp.x + 
                        Math.pow(t, 3) * tp.x;
              const y = Math.pow(1-t, 3) * fp.y + 
                        3 * Math.pow(1-t, 2) * t * (fp.y + (ctrlOffset + textOffset) * direction) + 
                        3 * (1-t) * Math.pow(t, 2) * (tp.y + (ctrlOffset + textOffset) * direction) + 
                        Math.pow(t, 3) * tp.y;
              
              textPathStr += (step === 0 ? "" : " L") + `${x},${y}`;
            }
          }
        }
        
        // 确保文本路径足够长
        const pathLength = Math.sqrt(Math.pow(tp.x - fp.x, 2) + Math.pow(tp.y - fp.y, 2));
        const minPathLength = 100;
        
        if (pathLength < minPathLength) {
          // 如果路径太短，使用直线延长路径
          const angle = Math.atan2(tp.y - fp.y, tp.x - fp.x);
          const extraLength = (minPathLength - pathLength) / 2;
          
          const startX = fp.x - extraLength * Math.cos(angle);
          const startY = fp.y - extraLength * Math.sin(angle);
          const endX = tp.x + extraLength * Math.cos(angle);
          const endY = tp.y + extraLength * Math.sin(angle);
          
          textPathStr = `M${startX},${startY} ` + textPathStr.substring(1) + ` L${endX},${endY}`;
        }
        
        // 创建路径
        var connPath = board.paper.path(pathStr).attr({
          fill: "none",
          stroke: "#aaa",
          strokeWidth: 1,
          strokeDasharray: "2,2",
          id: `conn-path-${i}`
        });
        
        // 创建文本路径
        board.paper.path(textPathStr).attr({
          id: textPathId,
          fill: "none",
          stroke: "none" // 不可见路径
        });
        
        // 创建文本
        var connText = board.paper.text(0, 0, "").attr({
          class: 'text',
          fill: "#f55",
          dy: "-5" // 文本垂直偏移
        });
        
        // 创建textPath元素
        var textPath = document.createElementNS("http://www.w3.org/2000/svg", "textPath");
        textPath.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `#${textPathId}`);
        textPath.textContent = evts[i].name;
        textPath.setAttribute("startOffset", "50%");
        textPath.setAttribute("text-anchor", "middle");
        
        // 将textPath添加到文本元素
        connText.node.appendChild(textPath);
        
        // 添加描述
        if (evts[i].desc) {
          let title = Snap.parse('<title>'+ evts[i].desc +'</title>');
          connText.append(title);
        };
        
        // 创建组
        var g = board.paper.g(connPath, connText).attr({
          class: 'events connection'
        });
      }
    }
  }
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
  if(Cfg.g.show ) drawItemGroup(Cfg.g.colors)
  
  //画区域框
  var periods = data.periods;
  if(periods) drawPeriod(periods);

  //画事件线
  var events = data.events;
  if(events) drawEvents(events, data.roles);
}

//绘制个体
function drawItem(board, item, i, color, points) {
  if (!item || !board) {
    console.error('Invalid parameters:', {board, item, i, color});
    return;
  }

  var itemBox = board.paper.g().attr({
    class: 'item'
  });
  
  if(item.offset) offset += item.offset;
  var y = (i - offset) * 20 + 45;

  // 解析日期并获取位置
  const startDate = parseDate(item.start);
  const endDate = parseDate(item.end);
  
  // 计算x坐标和宽度
  let x, w, h = 2;
  
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
  var rect;
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
  rect = board.paper.rect(x, y, w, h, 2).attr({
    fill: fill
  });
  itemBox.add(rect);

  //绘制name
  let x1 = x, y1 = y - 3;
  if(Cfg.layout == "v"){
      x1 = x + 10;
      y1 = y;
   }
  var name = board.paper.text(x1, y1, item.name).attr({
    class: "name",
    style: "text-shadow: 1px 1px "+ color + ", -1px -1px "+ color
  });
  name.click(function(e){
    show(this.parent());
    e.stopPropagation(); 
  })
  itemBox.add(name)

   //图标
  let x2 = x - 15, y2 = y - 13;
  if(Cfg.layout == "v"){
      x2 = x + 2;
      y2 = y - 13;
   }
  if(item.icon){
    var url = Cfg.iconPath + item.icon + '.svg'
    var icon = board.paper.image(url, x2, y2, 15, 12).attr({
      class:"icon",
      title:item.iconText
    });
    let title = Snap.parse('<title>'+item.iconText+'</title>');
    icon.append(title);
    itemBox.add(icon)
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

  let descText = board.paper.text(x3 , y3, desc).attr({
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
  itemBox.add(descText)

  //keypoints
  if(points){
    let dotBox = board.paper.g().attr({
        class:'dotBox'
      });
    let contBox = board.paper.g().attr({
        class:'contBox'
      });

    let [x4,y4,x5,y5] = [x,y,x,y];
    for(let i =  points.length - 1; i >= 0 ; i--){
      let point = points[i];
      if(Cfg.layout == "v"){
         y4 = (point.t - Cfg.start) * Cfg.zoom;
         y5 = y4;
       }else if(Cfg.layout == "h"){
         x4 = (point.t - Cfg.start) * Cfg.zoom;
         x5 = x4
       }
	   
	   //keypoints信息
	   let desc = point.t ;
	       desc += item.start ? "[" + (point.t - item.start)+ "]" : "";
	   if(point.w) {
	     if(typeof(point.w) == 'string'){
	       desc += point.w
	     }else{
	       point.w[0] = desc + point.w[0];
	       desc = point.w;
	     }
	   }
	   
	   //绘制点
	   let title = Snap.parse('<title>'+desc+'</title>');
	   let dot = board.paper.circle(x4, y4, 2).attr({
	     stroke:"#f00",
	     fill:"#fff",
	     strokeWidth: 1,
	   });
	   dot.append(title);
	   dotBox.append(dot);
	   dotBox.click(function(e){
	     show(this.parent());
	     e.stopPropagation(); 
	   })
	   
	   //绘制线
	    if(Cfg.layout == "v"){
	      x5 -= 18 //x - (points.length - 1 - i) * 18 - 10;
	    }else if(Cfg.layout == "h"){
	      y5 += 18//y + (points.length - i) * 18;
	    }
	   
	   let line = board.paper.line(x4, y4, x5, y5).attr({
	     stroke:"#000",
	     strokeWidth: 2,
	   });
	   contBox.add(line);

      //显示信息
      let text = board.paper.text(x5, y5, desc).attr({
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
               x5 -= 16
			   y5 -= 136
             }else if(Cfg.layout == "h"){
               y5 += 16
             }
          }
      }
      contBox.add(text);
    }
    itemBox.add(dotBox);
    itemBox.add(contBox)
  }

  //groups
  if(!!item.groups){
    var gp = item.groups[0];
    if(!(gp in area)) {
       area[gp] = board.paper.g().attr({
        class:"group "+ gp,
      })
    }
    area[gp].add(itemBox);
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
    let rect = board.paper.rect(x,y,w,h,5).attr({
        class: "block",
        stroke: "#fff",
        fill: color[i],
        strokeWidth: 0.8,
        fillOpacity: 0.2
    }).hover(function() {
        this.animate({
           fillOpacity: 0.5    
        },300); 
    }, function() {
        this.animate({
            fillOpacity: 0.2    
        },300); 
    });

    // 分组title
    let x1 = x - 8, y1 = y + h/2;
    if(Cfg.layout == "v"){
      x1 = x + w/2;
      y1 = y - 2;
   }
    var name = board.paper.text( x1 , y1, i).attr({
      class: "title",
      fill:"#000",
      style: "text-shadow: 1px 1px "+ color[i] + ", -1px -1px "+ color[i]
    });
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
  if(board.select(".show")) {
      board.select(".show").attr({
        class:"item"
      })
    };
	let pointNode = that.selectAll(".dotText").items;
	console.log(pointNode[2])
	// that.select(".dotText")[i].attr({
	//   class:"currPoint"
	// });
    that.attr({
      class:"item show"
    });
    board.attr({
      class:"content focus"
    })
}

function hide(){
	board.attr({
      class:"content"
    })
    if(board.select(".show")) {
      board.select(".show").attr({
        class:"item"
      })
    };
}

// 格式化日期显示
const formatDate = (dateStr) => {
  if (!dateStr) return '';
  // 将所有的'-'替换为'/'
  return dateStr.replace(/-/g, '/');
};