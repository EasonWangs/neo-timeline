  // 配置归一化、日期、布局坐标、标尺与选中索引等纯函数。
  export function normalizeConfig(cfg) {
    cfg = cfg || {};
    cfg.layout = cfg.layout === "v" ? "v" : "h";
    cfg.start = parseInt(cfg.start, 10);
    if (!isFinite(cfg.start)) cfg.start = 0;

    cfg.axes = cfg.axes && typeof cfg.axes === "object" ? cfg.axes : {};
    cfg.axes.time = cfg.axes.time && typeof cfg.axes.time === "object"
      ? cfg.axes.time
      : {};
    cfg.axes.cross = cfg.axes.cross && typeof cfg.axes.cross === "object"
      ? cfg.axes.cross
      : {};
    cfg.axes.time.px = Number(cfg.axes.time.px);
    if (!isFinite(cfg.axes.time.px) || cfg.axes.time.px <= 0) cfg.axes.time.px = 1;

    cfg.items = cfg.items && typeof cfg.items === "object" ? cfg.items : {};
    cfg.items.gap = Number(cfg.items.gap);
    if (!isFinite(cfg.items.gap) || cfg.items.gap <= 0) cfg.items.gap = 20;

    cfg.p = cfg.p || {};
    cfg.e = cfg.e || {};
    cfg.g = cfg.g || {};

    cfg.p.textAnchor = cfg.p.textAnchor || "start";
    cfg.e.textAnchor = cfg.e.textAnchor || "start";
    if (!Array.isArray(cfg.p.colors) || cfg.p.colors.length === 0) {
      cfg.p.colors = ['#c23531','#2f4554','#d48265','#61a0a8','#ca8622','#91c7ae','#bda29a','#6e7074','#749f83','#546570','#c4ccd3'];
    }
    if (typeof cfg.g.colors !== "object" || cfg.g.colors === null) cfg.g.colors = {};
    if (typeof cfg.g.show !== "boolean") cfg.g.show = Object.keys(cfg.g.colors).length > 0;
    return cfg;
  }

  function getTimelineYear(value) {
    if (Number.isFinite(value)) return value;
    if (typeof value !== "string") return null;

    const normalized = value.trim().replace(/^~/, "").trim();
    if (!normalized) return null;
    const match = normalized.match(/^-?\d+/);
    if (!match) return null;
    const year = Number(match[0]);
    return Number.isFinite(year) ? year : null;
  }

  export function inferTimelineStart(data, config) {
    data = data || {};
    config = config || {};
    const contentCandidates = [];
    const periodYears = [];
    const addContent = function(value, grouped = false) {
      const year = getTimelineYear(value);
      if (year !== null) contentCandidates.push({ year, grouped });
    };

    for (const period of data.periods || []) {
      const startYear = getTimelineYear(period.start);
      const endYear = getTimelineYear(period.end);
      const periodYear = startYear !== null ? startYear : endYear;
      if (periodYear !== null) periodYears.push(periodYear);
    }
    for (const event of data.events || []) addContent(event.time);
    for (const role of data.roles || []) {
      const startYear = getTimelineYear(role.start);
      const endYear = getTimelineYear(role.end);
      const grouped = Array.isArray(role.groups) && role.groups.length > 0;
      if (startYear !== null) {
        contentCandidates.push({ year: startYear, grouped });
      } else if (endYear !== null) {
        // 与渲染器保持一致：只有结束日期的人物默认展示此前 60 年。
        contentCandidates.push({ year: endYear - 60, grouped });
      }
      for (const point of role.keypoints || []) addContent(point.t, grouped);
    }

    if (periodYears.length === 0 && contentCandidates.length === 0) return 0;

    const earliestPeriod = periodYears.length > 0 ? Math.min(...periodYears) : null;
    // 没有其他内容时，时期色块直接从区域起点绘制，不额外留白。
    if (contentCandidates.length === 0) return earliestPeriod;

    const layout = config.layout === "v" ? "v" : "h";
    const timeAxis = config.axes && config.axes.time || {};
    const unitPx = Number(timeAxis.px) > 0 ? Number(timeAxis.px) : 1;
    const leadingSpace = layout === "v" ? 20 : 25;
    const minorSpace = 10;
    const intervals = getRulerIntervals(
      unitPx,
      60,
      minorSpace,
      timeAxis.major,
      timeAxis.minor
    );
    const minor = intervals.minor;

    // 在首个数据点前保留约一个文字间距，再对齐到小刻度，避免内容紧贴标尺起点。
    const earliestContent = Math.min(...contentCandidates.map(function(candidate) {
      return candidate.year;
    }));
    const earliestIsGrouped = contentCandidates.some(function(candidate) {
      return candidate.year === earliestContent && candidate.grouped;
    });
    // group 的边框和标题会沿时间轴超出 item，显示分组时额外预留 20px。
    const groupPadding = earliestIsGrouped && config.g && config.g.show ? 20 : 0;
    const padding = (leadingSpace + groupPadding) / unitPx;
    const alignedContent = Math.floor((earliestContent - padding) / minor) * minor;
    const contentStart = Number(alignedContent.toFixed(10));

    // 比较时期边界与包含预留空间的内容起点，采用真正更早的候选值。
    return earliestPeriod === null ? contentStart : Math.min(earliestPeriod, contentStart);
  }

  export function buildRangeDesc(startDate, endDate) {
    if (startDate && endDate) return `(${startDate.original}-${endDate.original})`;
    if (startDate) return `(${startDate.original}-)`;
    if (endDate) return `(-${endDate.original})`;
    return "";
  }

  export function prependLabelToValue(prefix, value) {
    if (value === undefined || value === null || value === "") return prefix;
    if (typeof value === "string") return prefix + value;
    if (Array.isArray(value)) {
      var cloned = value.slice();
      if (cloned.length === 0) return prefix;
      cloned[0] = prefix + cloned[0];
      return cloned;
    }
    return prefix + String(value);
  }

  export function toPlainText(value) {
    if (Array.isArray(value)) return value.join(" ");
    return value === undefined || value === null ? "" : String(value);
  }

  export function toLines(value) {
    if (value === undefined || value === null || value === "") return [];
    if (Array.isArray(value)) return value.map(function(v) { return String(v); });
    return [String(value)];
  }

  export function buildPopupContent(options) {
    options = options || {};
    return {
      title: options.title ? String(options.title) : "",
      lines: Array.isArray(options.lines) ? options.lines.map(function(line) { return String(line); }) : [],
      meta: options.meta ? String(options.meta) : ""
    };
  }

  export function isApproxDate(date) {
    return typeof date === 'string' && date.startsWith('~');
  }

  export function parseApproxDate(date) {
    if (isApproxDate(date)) {
      return date.substring(1).trim();
    }
    return date;
  }

  export function parseDate(dateStr) {
    if (!dateStr) return null;

    try {
      dateStr = String(dateStr).trim();
      var isApprox = isApproxDate(dateStr);
      if (isApprox) {
        dateStr = parseApproxDate(dateStr);
        if (!dateStr) return null;
      }

      if (dateStr.includes('/')) {
        var parts = dateStr.split('/');
        var year = parseInt(parts[0], 10);
        if (isNaN(year)) {
          console.error('Invalid year:', dateStr);
          return null;
        }

        var month = parts.length > 1 ? parseInt(parts[1], 10) : 1;
        if (isNaN(month) || month < 1 || month > 12) {
          console.error('Invalid month:', dateStr);
          return null;
        }

        var day = parts.length > 2 ? parseInt(parts[2], 10) : 1;
        if (isNaN(day) || day < 1 || day > 31) {
          console.error('Invalid day:', dateStr);
          return null;
        }

        var formattedDate = `${year}/${month.toString().padStart(2, '0')}`;
        if (parts.length > 2) {
          formattedDate += `/${day.toString().padStart(2, '0')}`;
        }

        return {
          year: year,
          month: month - 1,
          day: day,
          isApprox: isApprox,
          original: isApprox ? '~' + formattedDate : formattedDate
        };
      }

      var parsedYear = parseInt(dateStr, 10);
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
  }

  export function getDatePosition(date, unitPx, start) {
    if (!date) return 0;

    try {
      var year = parseInt(date.year, 10) || 0;
      var month = parseInt(date.month, 10) || 0;
      var day = parseInt(date.day, 10) || 1;
      start = parseInt(start, 10) || 0;

      var yearOffset = year - start;
      var monthFraction = month / 12;
      var dayFraction = (day - 1) / (12 * 30);
      var position = (yearOffset + monthFraction + dayFraction) * unitPx;

      return isFinite(position) ? position : 0;
    } catch (e) {
      console.error('Position calculation error:', date, e);
      return 0;
    }
  }

  // 将当前滚动位置换算为视口起始边缘对应的时间值，供重绘前保存阅读位置。
  export function getViewportStartTime(start, unitPx, scrollOffset) {
    var origin = Number(start);
    var pixels = Number(unitPx);
    var scroll = Number(scrollOffset);
    if (!isFinite(origin)) origin = 0;
    if (!isFinite(pixels) || pixels <= 0) pixels = 1;
    if (!isFinite(scroll) || scroll < 0) scroll = 0;
    return origin + scroll / pixels;
  }

  // 根据目标时间值计算重绘后的滚动位置，使同一年份继续贴住视口起始边缘。
  export function getScrollOffsetForTime(time, start, unitPx) {
    var target = Number(time);
    var origin = Number(start);
    var pixels = Number(unitPx);
    if (!isFinite(target)) target = 0;
    if (!isFinite(origin)) origin = 0;
    if (!isFinite(pixels) || pixels <= 0) pixels = 1;
    return Math.max(0, (target - origin) * pixels);
  }

  export function getRulerInterval(mainInterval, unitPx, minSpace, configuredInterval) {
    var configured = Number(configuredInterval);
    if (Number.isInteger(configured) && configured > 0) return configured;

    var interval = Number(mainInterval);
    var scale = Number(unitPx);
    var minimum = Number(minSpace);
    if (!Number.isInteger(interval) || interval <= 0) return 1;
    if (!isFinite(scale) || scale <= 0) scale = 1;
    if (!isFinite(minimum) || minimum <= 0) minimum = 25;

    // 自动次刻度既要达到最小像素间距，也必须整除主刻度，否则逐次累加时会跳过主刻度线。
    var targetInterval = Math.max(1, minimum / scale);
    var magnitude = Math.pow(10, Math.floor(Math.log10(targetInterval)));
    var factors = [1, 2, 2.5, 5, 10];
    var maxMagnitude = Math.pow(10, Math.ceil(Math.log10(interval)) + 1);

    for (; magnitude <= maxMagnitude; magnitude *= 10) {
      for (var i = 0; i < factors.length; i += 1) {
        var candidate = factors[i] * magnitude;
        if (!Number.isInteger(candidate) || candidate < targetInterval || candidate > interval) continue;
        var divisions = interval / candidate;
        if (Math.abs(divisions - Math.round(divisions)) < 1e-9) return candidate;
      }
    }
    return interval;
  }

  /**
   * 根据时间轴的像素密度生成一组可读刻度。
   *
   * 主刻度会向上归整为 1、2、5 × 10ⁿ，避免出现 3、7、13 这类不自然的年份间隔；
   * 次刻度继续复用 getRulerInterval()，保证主刻度之间的网格不会过密且能整除主刻度。
   * axes.time.major/minor 始终优先，因而特殊数据仍可手动覆盖。
   */
  export function getRulerIntervals(
    unitPx,
    minMajorSpace = 60,
    minMinorSpace = 25,
    configuredMajor,
    configuredMinor
  ) {
    var scale = Number(unitPx);
    if (!isFinite(scale) || scale <= 0) scale = 1;

    var configured = Number(configuredMajor);
    var major;
    if (Number.isInteger(configured) && configured > 0) {
      major = configured;
    } else {
      var minimum = Number(minMajorSpace);
      if (!isFinite(minimum) || minimum <= 0) minimum = 60;

      // 先计算满足最小像素间距所需的年份跨度，再向上取整到易读刻度。
      var rawInterval = Math.max(1, minimum / scale);
      var magnitude = Math.pow(10, Math.floor(Math.log10(rawInterval)));
      var normalized = rawInterval / magnitude;
      var factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
      major = Math.max(1, factor * magnitude);
    }

    return {
      major: major,
      minor: getRulerInterval(major, scale, minMinorSpace, configuredMinor)
    };
  }

  // 用绝对时间值判断主刻度，避免自动起点（如 1295）被误当成整十、整百刻度。
  export function isRulerMajor(value, interval) {
    var numericValue = Number(value);
    var numericInterval = Number(interval);
    if (!isFinite(numericValue) || !isFinite(numericInterval) || numericInterval <= 0) {
      return false;
    }
    var quotient = numericValue / numericInterval;
    return Math.abs(quotient - Math.round(quotient)) < 1e-9;
  }

  export function orientPoint(timePosition, crossPosition, layout) {
    return layout === "v"
      ? { x: crossPosition, y: timePosition }
      : { x: timePosition, y: crossPosition };
  }

  export function orientRect(timePosition, crossPosition, timeLength, crossLength, layout) {
    var point = orientPoint(timePosition, crossPosition, layout);
    return {
      x: point.x,
      y: point.y,
      w: layout === "v" ? crossLength : timeLength,
      h: layout === "v" ? timeLength : crossLength
    };
  }

  export function getNextSelectionIndex(currentIndex, pointCount, key) {
    if (!Number.isInteger(currentIndex) || !Number.isInteger(pointCount) || pointCount <= 0) {
      return currentIndex;
    }

    if (key === "ArrowLeft" || key === "ArrowUp") {
      if (currentIndex < 0) return pointCount - 1;
      return (currentIndex - 1 + pointCount) % pointCount;
    }
    if (key === "ArrowRight" || key === "ArrowDown") {
      if (currentIndex < 0) return 0;
      return (currentIndex + 1) % pointCount;
    }
    return currentIndex;
  }
