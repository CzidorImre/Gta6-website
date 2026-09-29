import { describe, expect, it } from 'vitest';
import en from '../../messages/en.json';
import nl from '../../messages/nl-BE.json';

type Tree = { [key: string]: string | Tree };

function flatten(tree: Tree, prefix = ''): Record<string, string> {
  return Object.entries(tree).reduce<Record<string, string>>((acc, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') acc[path] = value;
    else Object.assign(acc, flatten(value, path));
    return acc;
  }, {});
}

/** ICU arguments and rich-text tags used in a message, e.g. {count}, <terms>. */
function placeholders(message: string): string[] {
  // Skip plural/select branch bodies like `=0 {Full}` or `other {# spots}`.
  const args = [...message.matchAll(/(?<!(?:=\d+|zero|one|two|few|many|other)\s*)\{\s*([a-zA-Z0-9_]+)\s*[,}]/g)].map((m) => `{${m[1]}}`);
  const tags = [...message.matchAll(/<([a-zA-Z]+)>/g)].map((m) => `<${m[1]}>`);
  return [...new Set([...args, ...tags])].sort();
}

describe('translations', () => {
  const flatEn = flatten(en as Tree);
  const flatNl = flatten(nl as Tree);

  it('English and Dutch have exactly the same keys', () => {
    expect(Object.keys(flatNl).sort()).toEqual(Object.keys(flatEn).sort());
  });

  it('use the same placeholders in both languages', () => {
    for (const key of Object.keys(flatEn)) {
      expect({ key, placeholders: placeholders(flatNl[key] ?? '') }).toEqual({ key, placeholders: placeholders(flatEn[key] ?? '') });
    }
  });

  it('has no empty messages', () => {
    for (const [key, value] of [...Object.entries(flatEn), ...Object.entries(flatNl)]) {
      expect({ key, empty: value.trim() === '' }).toEqual({ key, empty: false });
    }
  });

  it("doesn't use game brand names beyond the descriptive 'GTA 6'", () => {
    const banned = /grand theft auto|vice city|leonida|lucia|rockstar games presents/i;
    for (const [key, value] of [...Object.entries(flatEn), ...Object.entries(flatNl)]) {
      expect({ key, hit: banned.test(value) }).toEqual({ key, hit: false });
    }
  });
});
