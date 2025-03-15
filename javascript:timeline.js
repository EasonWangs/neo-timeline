  // 添加标题
  let desc = evts[i].time;
  if (evts[i].desc) {
    desc += " - " + evts[i].desc;
  } else {
    desc += " - " + evts[i].name;
  }
  let title = Snap.parse('<title>'+ desc +'</title>');
  text.append(title); 