/** Minimal YAML helpers for accelerator params + manifest emit (no external yaml dep). */

export function stringifyYaml(doc: unknown, indent = 0): string {
  const pad = "  ".repeat(indent);
  if (doc === null || doc === undefined) return "null";
  if (typeof doc === "boolean" || typeof doc === "number") return String(doc);
  if (typeof doc === "string") {
    if (doc.includes("\n") || /[:#{}[\],&*?|>!%@`]/.test(doc)) {
      const lines = doc.split("\n");
      return `|\n${lines.map((l) => `${"  ".repeat(indent + 1)}${l}`).join("\n")}`;
    }
    // bare words without spaces stay unquoted for readable manifests
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
        return `${pad}- ${stringifyYaml(item, 0)}`;
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

/** Tiny subset parser for our params/cookbook YAML (scalars, lists, one-level maps). */
export function parseSimpleYaml(text: string): Record<string, unknown> {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const root: Record<string, unknown> = {};
  let i = 0;

  const parseValue = (raw: string): unknown => {
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
  };

  while (i < lines.length) {
    const line = lines[i];
    i++;
    if (!line.trim() || line.trim().startsWith("#")) continue;
    const m = /^([A-Za-z0-9_]+):\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    const rest = m[2];
    if (rest === "" || rest === "|" || rest === ">") {
      // list or nested block
      const items: unknown[] = [];
      let obj: Record<string, unknown> | null = null;
      while (i < lines.length) {
        const n = lines[i];
        if (!n.trim() || n.trim().startsWith("#")) {
          i++;
          continue;
        }
        if (/^[A-Za-z0-9_]+:/.test(n) && !n.startsWith(" ") && !n.startsWith("\t")) {
          break;
        }
        const listItem = /^\s+-\s+(.*)$/.exec(n);
        if (listItem) {
          items.push(parseValue(listItem[1]));
          i++;
          continue;
        }
        const nested = /^\s+([A-Za-z0-9_]+):\s*(.*)$/.exec(n);
        if (nested) {
          if (!obj) obj = {};
          obj[nested[1]] = parseValue(nested[2]);
          i++;
          continue;
        }
        break;
      }
      root[key] = items.length ? items : obj ?? (rest === "" ? null : parseValue(rest));
    } else {
      root[key] = parseValue(rest);
    }
  }
  return root;
}
