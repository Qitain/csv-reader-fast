/**
 * Read csv-reader 1.0.0's exact CSV dialect. The fast path splits clean physical
 * records natively. The flat slow path slices bare spans, jumps between quotes,
 * and normalizes quoted CR/LF and doubled quotes without per-character joining.
 * Quoted line changes commit only after closure, so failed scans can be reread
 * literally on the original line. The first real record sets width, and every
 * error retains record-start coordinates, including errors on skipped stray rows.
 */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  // Seed cold error/EOF feedback within this call; no results or input state
  // survive between calls. This avoids recompiling a large scan at a rare tail.
  const warmup = '\uFEFF\n\r\n"h"q,\ra\r\nx\nx,y,z\n\r\r\n"a""b\r\nc\rd\n"j\r,k\n"tail"';
  parseText(warmup, true);
  parseText(warmup + '"', false);
  return parseText(text, header);
}

function parseText(text, header) {
  const length = text.length;
  const rows = [];
  const errors = [];
  let columns = null;
  let width = -1;
  let pos = text.charCodeAt(0) === 0xfeff ? 1 : 0;
  let line = 1;
  let nextQuote = -2;
  let nextCR = -2;

  while (pos < length) {
    while (pos < length) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos++;
        line++;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line++;
      } else {
        break;
      }
    }
    if (pos >= length) break;
    const recordLine = line;
    const recordRow = header && columns === null ? null : rows.length;
    const lf = text.indexOf('\n', pos);
    const end = lf < 0 ? length : lf;
    const contentEnd = lf >= 0 && text.charCodeAt(end - 1) === 13 ? end - 1 : end;
    if (nextQuote !== -1 && nextQuote < pos) nextQuote = text.indexOf('"', pos);
    if (nextCR !== -1 && nextCR < pos) nextCR = text.indexOf('\r', pos);
    let fields;
    let count;

    if ((nextQuote < 0 || nextQuote >= contentEnd) && (nextCR < 0 || nextCR >= contentEnd)) {
      fields = text.slice(pos, contentEnd).split(',');
      count = fields.length;
      pos = lf < 0 ? length : end + 1;
      if (lf >= 0) line++;
    } else {
      fields = new Array(width < 0 ? 0 : width);
      count = 0;
      let ended;
      let wasQuoted;
      do {
        wasQuoted = text.charCodeAt(pos) === 34;
        let value = '';
        let closed = false;
        if (wasQuoted) {
          const open = pos;
          let start = pos + 1;
          let scan = start;
          while (true) {
            const quote = text.indexOf('"', scan);
            if (quote < 0) {
              value = '"';
              pos = open + 1;
              errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
              break;
            }
            if (text.charCodeAt(quote + 1) === 34) {
              value += text.slice(start, quote) + '"';
              start = scan = quote + 2;
            } else {
              value += text.slice(start, quote);
              pos = quote + 1;
              closed = true;
              if (value.indexOf('\r') >= 0) value = value.replace(/\r\n?/g, '\n');
              for (let nl = value.indexOf('\n'); nl >= 0; nl = value.indexOf('\n', nl + 1)) line++;
              break;
            }
          }
        }

        const initialLength = value.length;
        let start = pos;
        ended = 0;
        while (pos < length) {
          const c = text.charCodeAt(pos);
          if (c === 44) {
            value += text.slice(start, pos++);
            ended = 1;
            break;
          }
          if (c === 10 || (c === 13 && text.charCodeAt(pos + 1) === 10)) {
            value += text.slice(start, pos);
            pos += c === 13 ? 2 : 1;
            line++;
            ended = 2;
            break;
          }
          if (c === 13) {
            value += text.slice(start, pos);
            start = ++pos;
            errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
          } else {
            pos++;
          }
        }
        if (ended === 0) value += text.slice(start, pos);
        if (closed && value.length > initialLength) {
          errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
        }
        fields[count++] = value;
      } while (ended === 1);
      if (count === 1 && fields[0] === '' && !wasQuoted) continue;
    }

    if (width < 0) width = count;
    if (header && columns === null) {
      columns = fields;
    } else {
      if (count < width) {
        errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: count });
        while (count < width) fields[count++] = '';
      } else if (count > width) {
        errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
      }
      rows.push(fields);
    }
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
