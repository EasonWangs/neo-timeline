(function(global) {
  function getParams() {
    var params = {};
    var searchParams = new URLSearchParams(window.location.search || "");
    searchParams.forEach(function(value, key) {
      params[key] = value;
    });
    return params;
  }

  function normalizeConfig(cfg) {
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
    if (!cfg.iconPath) cfg.iconPath = "";

    return cfg;
  }

  function buildRangeDesc(startDate, endDate) {
    if (startDate && endDate) return `(${startDate.original}-${endDate.original})`;
    if (startDate) return `(${startDate.original}-)`;
    if (endDate) return `(-${endDate.original})`;
    return "";
  }

  function prependLabelToValue(prefix, value) {
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

  function toPlainText(value) {
    if (Array.isArray(value)) return value.join(" ");
    return value === undefined || value === null ? "" : String(value);
  }

  function toLines(value) {
    if (value === undefined || value === null || value === "") return [];
    if (Array.isArray(value)) return value.map(function(v) { return String(v); });
    return [String(value)];
  }

  function buildPopupContent(options) {
    options = options || {};
    return {
      title: options.title ? String(options.title) : "",
      lines: Array.isArray(options.lines) ? options.lines.map(function(line) { return String(line); }) : [],
      meta: options.meta ? String(options.meta) : ""
    };
  }

  function isApproxDate(date) {
    return typeof date === 'string' && date.startsWith('~');
  }

  function parseApproxDate(date) {
    if (isApproxDate(date)) {
      return date.substring(1).trim();
    }
    return date;
  }

  function parseDate(dateStr) {
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

  function getDatePosition(date, zoom) {
    if (!date) return 0;

    try {
      var year = parseInt(date.year, 10) || 0;
      var month = parseInt(date.month, 10) || 0;
      var day = parseInt(date.day, 10) || 1;
      var start = parseInt((global.Cfg || {}).start, 10) || 0;

      var yearOffset = year - start;
      var monthFraction = month / 12;
      var dayFraction = day / (12 * 30);
      var position = (yearOffset + monthFraction + dayFraction) * zoom;

      return isFinite(position) ? position : 0;
    } catch (e) {
      console.error('Position calculation error:', date, e);
      return 0;
    }
  }

  global.TimelineUtils = {
    getParams: getParams,
    normalizeConfig: normalizeConfig,
    buildRangeDesc: buildRangeDesc,
    prependLabelToValue: prependLabelToValue,
    toPlainText: toPlainText,
    toLines: toLines,
    buildPopupContent: buildPopupContent,
    isApproxDate: isApproxDate,
    parseApproxDate: parseApproxDate,
    parseDate: parseDate,
    getDatePosition: getDatePosition
  };
})(window);
