  // 配置归一化、日期、布局坐标、标尺与选中索引等纯函数。
  export function normalizeConfig(cfg) {
    cfg = cfg || {};
    cfg.layout = cfg.layout === "v" ? "v" : "h";
    cfg.start = parseInt(cfg.start, 10);
    if (!isFinite(cfg.start)) cfg.start = 0;
    cfg.zoom = Number(cfg.zoom);
    if (!isFinite(cfg.zoom) || cfg.zoom <= 0) cfg.zoom = 1;

    cfg.o = cfg.o || {};
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
    const axis = config.o || {};
    const primaryMajor = layout === "v" ? axis.vs : axis.hs;
    const fallbackMajor = layout === "v" ? axis.hs : axis.vs;
    const primaryMinor = layout === "v" ? axis.vm : axis.hm;
    const fallbackMinor = layout === "v" ? axis.hm : axis.vm;
    const major = Number(primaryMajor || fallbackMajor) || 1;
    const zoom = Number(config.zoom) > 0 ? Number(config.zoom) : 1;
    const minSpace = layout === "v" ? 20 : 25;
    const minor = getRulerInterval(
      major,
      zoom,
      minSpace,
      primaryMinor || fallbackMinor
    );

    // 在首个数据点前保留约一个文字间距，再对齐到小刻度，避免内容紧贴标尺起点。
    const earliestContent = Math.min(...contentCandidates.map(function(candidate) {
      return candidate.year;
    }));
    const earliestIsGrouped = contentCandidates.some(function(candidate) {
      return candidate.year === earliestContent && candidate.grouped;
    });
    // group 的边框和标题会沿时间轴超出 item，显示分组时额外预留 20px。
    const groupPadding = earliestIsGrouped && config.g && config.g.show ? 20 : 0;
    const padding = (minSpace + groupPadding) / zoom;
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

  export function getDatePosition(date, zoom, start) {
    if (!date) return 0;

    try {
      var year = parseInt(date.year, 10) || 0;
      var month = parseInt(date.month, 10) || 0;
      var day = parseInt(date.day, 10) || 1;
      start = parseInt(start, 10) || 0;

      var yearOffset = year - start;
      var monthFraction = month / 12;
      var dayFraction = (day - 1) / (12 * 30);
      var position = (yearOffset + monthFraction + dayFraction) * zoom;

      return isFinite(position) ? position : 0;
    } catch (e) {
      console.error('Position calculation error:', date, e);
      return 0;
    }
  }

  export function getRulerInterval(mainInterval, zoom, minSpace, configuredInterval) {
    var configured = Number(configuredInterval);
    if (isFinite(configured) && configured > 0) return configured;

    var interval = Number(mainInterval);
    var scale = Number(zoom);
    var minimum = Number(minSpace);
    if (!isFinite(interval) || interval <= 0) return 1;
    if (!isFinite(scale) || scale <= 0) scale = 1;
    if (!isFinite(minimum) || minimum <= 0) minimum = 25;

    var divisions = Math.max(1, Math.floor(interval * scale / minimum));
    return Math.max(1, Math.floor(interval / divisions));
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
      return Math.max(0, Math.min(pointCount - 1, currentIndex - 1));
    }
    if (key === "ArrowRight" || key === "ArrowDown") {
      return Math.max(0, Math.min(pointCount - 1, currentIndex + 1));
    }
    return currentIndex;
  }
