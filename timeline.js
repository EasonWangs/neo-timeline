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
    o.hm = o.hm || Math.ceil(o.hs/5);
    rh = Snap(w, 25).attr({
      id:"ruler-h",
      class:"ruler"
    });
    for(var i = 0; i < w / Cfg.zoom; i += o.hm){
      let x =  i * Cfg.zoom;
      if(i % o.hs == 0){
        //大标
        rh.line(x, 0, x, 25).attr({
          stroke: "#8f9292",
          strokeWidth: 1,
        });
        let text = (Cfg.start + i) + '';
        rh.text(x + 2, 12.5, text).attr({
          fill: "#b1b4b4"
        });
      }else{ //小标
        rh.line(x,15, x, 25).attr({
          stroke: "#8f9292",
          strokeWidth: 1,
        });
      }
    }
    $id("wapper").appendChild(rh.node);
   }

  //绘制标尺[竖]
  if(o.vs){
    o.vm = o.vm || Math.ceil(o.vs/5)
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
  for (var i = 0; i < h; i += o.hm) {
    let line = svgBg.line(i * Cfg.zoom, 0, i * Cfg.zoom, "100%").attr({
        stroke:  (i % o.hs == 0) ? "#f0ebdc" : "#f5f0e0",
        class : (i % o.hs == 0) ? "thickLine" : "thinLine"
     })
  }

  // 横向栅格线
  for (var i = 0; i < w; i+= o.vm) {
    let line = svgBg.line(0,  i * Cfg.zoom, "100%",  i * Cfg.zoom).attr({
        stroke:  (i % o.vs == 0) ? "#f0ebdc" : "#f5f0e0",
        class : (i % o.vs == 0) ? "thickLine" : "thinLine"
     });
  }
  $id("wapper").appendChild(svgBg.node);
}

// 区块
function drawPeriod(pers){
  period = Snap("#period");

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
     
    //区块
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
 
 
    //区块文字
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

    let desc = "(" + pers[i].start + "-"+ pers[i].end + ")" + (pers[i].desc? pers[i].desc : "");
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
function drawEvents(evts){
  eventsBox = Snap("#events");
  for (var i = 0; i < evts.length; i++) {
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
      [ x1, y1, x2, y2, tX, tY] = [y1, x1, y2,x2, tY, tX];
    }
  

    var line = eventsBox.paper.line(x1, y1, x2, y2).attr({
      strokeWidth: 1,
      stroke:"#aaa",
      strokeDasharray:"5,5",
    })

    var text = eventsBox.text(tX , tY,  evts[i].name).attr({
          class: 'text',
          textAnchor : Cfg.e.textAnchor,
        });;
    let desc = evts[i].time + (evts[i].desc? evts[i].desc : "");
    let title = Snap.parse('<title>'+ desc +'</title>');
        text.append(title);
    var g = eventsBox.paper.g( line,text);
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
  if(events) drawEvents(events)
}

//绘制个体
function drawItem(board,item,i,color,points){
 var itemBox = board.paper.g().attr({
    class:'item'
  }).click(function(e){
    show(this);
    e.stopPropagation(); 
  });

  if(item.offset) offset += item.offset;
  var y = (i - offset) * 20 + 45,
      x = ((item.start ? item.start : item.end - 60) - Cfg.start) * Cfg.zoom,
      w = ((item.end ? item.end : item.start + 90) - Cfg.start) * Cfg.zoom - x,
      h = 2;

   if(Cfg.layout == "v"){
      [x, y, w, h ] = [y, x, h, w ];
   }

   let fill = "#000";
   if(!item.start){
      fill = (Cfg.layout == "v") ?  "url(#gradT)" : "url(#gradL)"
   }
   if(!item.end){
      fill = (Cfg.layout == "v") ?  "url(#gradB)" : "url(#gradR)"
   }
  var rect = board.paper.rect(x, y, w, h, 2).attr({
    fill: fill,
  });
  itemBox.add(rect)

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
  let desc = "("+ item.start + "~"+ item.end +")";
  if(item.iconText){
    desc += "["+item.iconText+"]"
  }
  if(item.desc) {
    if(typeof(item.desc) == 'string'){
      desc += item.desc
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

      //点
      let dot = board.paper.circle(x4, y4, 2).attr({
        stroke:"#f00",
        fill:"#fff",
        strokeWidth: 1,
      });
      dotBox.append(dot);

      //线
       if(Cfg.layout == "v"){
         x5 -= 18 //x - (points.length - 1 - i) * 18 - 10;
       }else if(Cfg.layout == "h"){
         y5 += 18//y + (points.length - i) * 18;
       }

      let line = board.paper.line(x4, y4, x5, y5).attr({
        stroke:"#000",
        strokeWidth: 2,
      });

       //点内容
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
             }else if(Cfg.layout == "h"){
               y5 += 16
             }
          }
      }
      contBox.add(line,text);
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
        y = itemBox.y - 2,
        w = itemBox.width + 4,
        h = itemBox.height + 4;
    let rect = board.paper.rect(x,y,w,h,5).attr({
        class: "block",
        stroke: "#fff",
        fill: color[i],
        strokeWidth: 1,
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
  eventsBox.attr({
    style: "transform: scale("+ z + ")"
  });
  period.attr({
    style: "transform: scale("+ z + ")"
  });
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
      eventsBox.attr({
        height : h,
      });
   }else{
     period.attr({
        width : w,
      });
      eventsBox.attr({
        width : w,
      });
   }
}


function show(that){
  if(board.select(".show")) {
      board.select(".show").attr({
        class:"item"
      })
    };
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