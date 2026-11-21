// A faster csv-reader 1.0.0: run(input) answers {columns, rows, errors} for {text, header}, exactly as the reference does.
// Fields are cut out of the text with slice() instead of being built a character at a time.

const COMMA = 0;
const LINE_BREAK = 1;
const END = 2;

export function run(input) {
  const text = String(input.text);
  const n = text.length;
  const header = input.header === true;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  let recordLine = 1;
  let recordRow = null;
  let ended = END;
  let added = 0;

  // Reads unquoted characters, starting from `val`, up to the next comma or line break. Sets `ended` and `added`.
  function unquoted(val) {
    let seg = pos;
    let kept = 0;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 44) {
        kept += pos - seg;
        val += text.slice(seg, pos);
        pos += 1;
        ended = COMMA;
        added = kept;
        return val;
      }
      if (c === 10) {
        kept += pos - seg;
        val += text.slice(seg, pos);
        pos += 1;
        line += 1;
        ended = LINE_BREAK;
        added = kept;
        return val;
      }
      if (c === 13) {
        kept += pos - seg;
        val += text.slice(seg, pos);
        if (text.charCodeAt(pos + 1) === 10) {
          pos += 2;
          line += 1;
          ended = LINE_BREAK;
          added = kept;
          return val;
        }
        errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
        pos += 1;
        seg = pos;
        continue;
      }
      pos += 1;
    }
    kept += n - seg;
    val += text.slice(seg, n);
    ended = END;
    added = kept;
    return val;
  }

  // Reads a quoted field whose opening quote is at pos.
  function quoted() {
    const open = pos;
    const openLine = line;
    let val = '';
    pos += 1;
    let seg = pos;
    let closed = false;
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 34) {
        if (text.charCodeAt(pos + 1) === 34) {
          val += text.slice(seg, pos + 1);
          pos += 2;
          seg = pos;
          continue;
        }
        val += text.slice(seg, pos);
        pos += 1;
        closed = true;
        break;
      }
      if (c === 13) {
        val += text.slice(seg, pos) + '\n';
        line += 1;
        pos += text.charCodeAt(pos + 1) === 10 ? 2 : 1;
        seg = pos;
        continue;
      }
      if (c === 10) line += 1;
      pos += 1;
    }
    if (!closed) {
      pos = open + 1;
      line = openLine;
      errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
      return unquoted('"');
    }
    if (pos >= n) {
      ended = END;
      return val;
    }
    const c = text.charCodeAt(pos);
    if (c === 44) {
      pos += 1;
      ended = COMMA;
      return val;
    }
    if (c === 10) {
      pos += 1;
      line += 1;
      ended = LINE_BREAK;
      return val;
    }
    if (c === 13 && text.charCodeAt(pos + 1) === 10) {
      pos += 2;
      line += 1;
      ended = LINE_BREAK;
      return val;
    }
    val = unquoted(val);
    if (added > 0) errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
    return val;
  }

  for (;;) {
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    recordLine = line;
    recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let isQuoted;
    let value;
    do {
      isQuoted = text.charCodeAt(pos) === 34;
      value = isQuoted ? quoted() : unquoted('');
      fields.push(value);
    } while (ended === COMMA);

    if (fields.length === 1 && value === '' && !isQuoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
