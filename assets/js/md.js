/* ============================================================
   星记 · 迷你 Markdown 渲染器（工作台预览用，零依赖）
   支持：标题 / 粗体 / 斜体 / 删除线 / 行内代码 / 代码块 /
        链接 / 图片 / 引用（含 {:.tip} 提示块）/ 有序无序列表 /
        表格 / 分割线 / 段落
   ============================================================ */
(function () {
  'use strict';

  function esc(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /* ---------- 行内语法 ---------- */
  function inline(text) {
    var s = esc(text);
    // 行内代码（先抠出来占位，避免内部被二次处理）
    var codes = [];
    s = s.replace(/`([^`\n]+)`/g, function (m, c) {
      codes.push(c);
      return '\u0000C' + (codes.length - 1) + '\u0000';
    });
    // 图片 ![alt](src)
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
      function (m, alt, src) { return '<img src="' + src + '" alt="' + alt + '" loading="lazy">'; });
    // 链接 [text](href)
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g,
      function (m, t, href) {
        var ext = /^https?:\/\//i.test(href);
        return '<a href="' + href + '"' + (ext ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + t + '</a>';
      });
    s = s.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>');
    s = s.replace(/~~([^~]+)~~/g, '<del>$1</del>');
    s = s.replace(/==([^=]+)==/g, '<mark>$1</mark>');
    // 还原行内代码
    s = s.replace(/\u0000C(\d+)\u0000/g, function (m, i) {
      return '<code>' + codes[+i] + '</code>';
    });
    return s;
  }

  /* ---------- 代码块 ---------- */
  function renderCode(lang, code) {
    var label = lang ? '<span class="pv-code-lang">' + esc(lang) + '</span>' : '';
    return '<pre>' + label + '<code>' + esc(code) + '</code></pre>';
  }

  /* ---------- 主渲染 ---------- */
  function render(md) {
    var lines = String(md == null ? '' : md).replace(/\r\n?/g, '\n').split('\n');
    var out = [];
    var i = 0;

    while (i < lines.length) {
      var line = lines[i];

      // 代码块
      var fence = line.match(/^```(\w*)\s*$/);
      if (fence) {
        var buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++;
        out.push(renderCode(fence[1], buf.join('\n')));
        continue;
      }

      // 空行
      if (/^\s*$/.test(line)) { i++; continue; }

      // 分割线
      if (/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
        out.push('<hr>'); i++; continue;
      }

      // 标题
      var h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        var lv = h[1].length;
        out.push('<h' + lv + '>' + inline(h[2].replace(/\s*#+\s*$/, '')) + '</h' + lv + '>');
        i++; continue;
      }

      // 引用块（含 IAL 提示块）
      if (/^\s*>\s?/.test(line)) {
        var quote = [];
        while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
          quote.push(lines[i].replace(/^\s*>\s?/, ''));
          i++;
        }
        // IAL：{:.tip} 等（引用块结束后独立一行）
        var cls = '';
        if (i < lines.length) {
          var ial = lines[i].match(/^\s*\{:\.([\w-]+)\}\s*$/);
          if (ial) { cls = ial[1]; i++; }
        }
        out.push('<blockquote' + (cls ? ' class="' + cls + '"' : '') + '>' +
                 inline(quote.join(' ')) + '</blockquote>');
        continue;
      }

      // 表格
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|\s*$/.test(lines[i + 1])) {
        var head = splitRow(line);
        i += 2;
        var rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) {
          rows.push(splitRow(lines[i])); i++;
        }
        var t = '<table><thead><tr>' + head.map(function (c) { return '<th>' + inline(c) + '</th>'; }).join('') +
                '</tr></thead><tbody>';
        rows.forEach(function (r) {
          t += '<tr>' + r.map(function (c) { return '<td>' + inline(c) + '</td>'; }).join('') + '</tr>';
        });
        out.push(t + '</tbody></table>');
        continue;
      }

      // 无序列表
      if (/^\s*[-*+]\s+/.test(line)) {
        var ul = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          ul.push('<li>' + inline(lines[i].replace(/^\s*[-*+]\s+/, '')) + '</li>');
          i++;
        }
        out.push('<ul>' + ul.join('') + '</ul>');
        continue;
      }

      // 有序列表
      if (/^\s*\d+[.、]\s+/.test(line)) {
        var ol = [];
        while (i < lines.length && /^\s*\d+[.、]\s+/.test(lines[i])) {
          ol.push('<li>' + inline(lines[i].replace(/^\s*\d+[.、]\s+/, '')) + '</li>');
          i++;
        }
        out.push('<ol>' + ol.join('') + '</ol>');
        continue;
      }

      // 普通段落
      var para = [];
      while (i < lines.length && !/^\s*$/.test(lines[i]) &&
             !/^(#{1,4}\s|```|>|[-*+]\s|\d+[.、]\s|\s*\|)/.test(lines[i]) &&
             !/^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(lines[i])) {
        para.push(lines[i]); i++;
      }
      if (para.length) { out.push('<p>' + inline(para.join(' ')) + '</p>'); }
      else { i++; }
    }

    return out.join('\n');
  }

  function splitRow(line) {
    return line.trim().replace(/^\||\|$/g, '').split('|').map(function (c) { return c.trim(); });
  }

  /* ---------- 摘要 ---------- */
  function excerpt(md, n) {
    var text = String(md == null ? '' : md)
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
      .replace(/[#*>`~|-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    n = n || 96;
    return text.length > n ? text.slice(0, n) + '…' : text;
  }

  window.WBMD = { render: render, excerpt: excerpt, esc: esc };
})();
