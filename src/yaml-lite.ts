/** Minimal YAML helpers for accelerator params + manifest emit (no external yaml dep). */

export function stringifyYaml(doc: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (doc === null || doc === undefined) return "null";
  if (typeof doc === "boolean" || typeof doc === "number") return String(doc);
  if (typeof doc === "string") {
    // Prefer quoted scalars over "|" for single-line strings (avoids list indent bugs).
    if (doc.includes("\n")) {
      const lines = doc.split("\n");
      return `|\n${lines.map((l) => `${"  ".repeat(indent + 1)}${l}`).join("\n")}`;
    }
    if (/^[A-Za-z0-9_.-]+$/.test(doc)) return doc;
    return JSON.stringify(doc);
  }
  if (Array.isArray(doc)) {
    if (doc.length === 0) return "[]";
    return doc
      .map((item) => {
        if (item !== null && typeof item === "object" && !Array.isArray(item)) {
          const inner = stringifyYaml(item, indent + 1);
          return `${pad}- ${inner.replace(/^\s+/, "")}`;
        }
        // Pass array indent so block scalars (|) indent under "- |"
        const rendered = stringifyYaml(item, indent);
        if (rendered.startsWith("|")) {
          return `${pad}- ${rendered}`;
        }
        return `${pad}- ${rendered}`;
      })
      .join("\n");
  }
  if (typeof doc === "object") {
    const entries = Object.entries(doc as Record<string, unknown>);
    return entries
      .map(([k, v]) => {
        if (v !== null && typeof v === "object") {
          const nested = stringifyYaml(v, indent + 1);
          if (Array.isArray(v)) {
            if ((v as unknown[]).length === 0) return `${pad}${k}: []`;
            return `${pad}${k}:\n${nested}`;
          }
          return `${pad}${k}:\n${nested}`;
        }
        return `${pad}${k}: ${stringifyYaml(v, 0)}`;
      })
      .join("\n");
  }
  return JSON.stringify(doc);
}

function parseScalar(raw: string): unknown {
  const v = raw.trim();
  if (v === "true") return true;
  if (v === "false") return false;
  if (v === "null" || v === "") return null;
  if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    return v.slice(1, -1);
  }
  return v;
}

/**
 * Tiny subset parser for our params/cookbook YAML: scalars, block lists, and maps
 * nested up to a list value (`saes: { stage: [sae, ...] }`). Indentation-driven, so
 * items always attach to the key they sit under. No flow sequences, no block scalars,
 * no anchors — this is a params reader, not a YAML implementation.
 */
export function parseSimpleYaml(text: string): Record<string, unknown> {
  const rows: { indent: number; text: string }[] = [];
  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const trimmed = raw.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    rows.push({ indent: raw.length - raw.trimStart().length, text: trimmed });
  }

  let i = 0;

  const isListItem = (text: string): boolean => text === "-" || text.startsWith("- ");

  const parseList = (indent: number): unknown[] => {
    const items: unknown[] = [];
    while (i < rows.length && rows[i].indent === indent && isListItem(rows[i].text)) {
      items.push(parseScalar(rows[i].text.replace(/^-\s*/, "")));
      i++;
    }
    return items;
  };

  const parseMap = (indent: number): Record<string, unknown> => {
    const obj: Record<string, unknown> = {};
    while (i < rows.length && rows[i].indent === indent) {
      const m = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(rows[i].text);
      if (!m) break;
      const [, key, rest] = m;
      i++;
      if (rest !== "") {
        obj[key] = parseScalar(rest);
        continue;
      }
      if (i >= rows.length || rows[i].indent <= indent) {
        obj[key] = null;
        continue;
      }
      const childIndent = rows[i].indent;
      obj[key] = isListItem(rows[i].text)
        ? parseList(childIndent)
        : parseMap(childIndent);
    }
    return obj;
  };

  return rows.length ? parseMap(rows[0].indent) : {};
}
