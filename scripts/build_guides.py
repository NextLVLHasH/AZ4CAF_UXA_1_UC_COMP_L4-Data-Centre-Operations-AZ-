"""Build browsable static HTML guides from the maintained Markdown sources."""
import argparse
import re
import json
from html.parser import HTMLParser
from html import escape
from pathlib import Path

import markdown

ROOT = Path(__file__).resolve().parents[1]
GUIDES = {
    "study-guide": "Study and revision guide",
    "labs": "Practical lab workbook",
    "network-labs": "Switches, firewalls and complex networks",
    "data-tools": "Access, MongoDB, Python and Node.js",
    "ai-guide": "Using AI and understanding AI firewalls",
    "research": "Research sources and verification",
    "facilities-guide": "Hardware, power, cooling and resilience",
}

UNIT_SCOPES = {
    "study-guide": ["fundamentals", "architecture", "core-networking", "applied-networking", "operating-systems", "core-ai", "work-based-learning", "professional-practice", "computing-project"],
    "labs": ["fundamentals", "architecture", "core-networking", "applied-networking", "operating-systems", "core-ai", "work-based-learning", "professional-practice", "computing-project"],
    "network-labs": ["core-networking", "applied-networking", "operating-systems"],
    "data-tools": ["fundamentals", "operating-systems"],
    "ai-guide": ["core-ai", "professional-practice"],
    "research": ["fundamentals", "architecture", "core-networking", "applied-networking", "operating-systems", "core-ai", "work-based-learning", "professional-practice", "computing-project"],
    "facilities-guide": ["architecture", "work-based-learning"],
}


class SectionIndex(HTMLParser):
    """Index actual generated heading IDs, so results never guess anchor spelling."""
    def __init__(self, slug, title):
        super().__init__()
        self.slug, self.guide_title = slug, title
        self.entries, self.current, self.heading, self.heading_parts = [], None, False, []

    def handle_starttag(self, tag, attrs):
        if tag == "h2":
            self.flush()
            anchor = dict(attrs).get("id")
            self.current = {"id": f"guide-{self.slug}-{anchor}", "type": "guide",
                            "guide_title": self.guide_title, "url": f"./guides/{self.slug}.html#{anchor}",
                            "unit_ids": UNIT_SCOPES[self.slug], "title": "", "text": "", "vendors": []}
            self.heading, self.heading_parts = True, []

    def handle_endtag(self, tag):
        if tag == "h2" and self.current:
            self.current["title"] = " ".join(self.heading_parts).replace("¶", "").strip()
            self.heading = False
        if tag in ("p", "li", "pre", "td", "h3", "h4") and self.current:
            self.current["text"] += " "

    def handle_data(self, data):
        if self.heading:
            self.heading_parts.append(data)
        if self.current:
            self.current["text"] += data

    def flush(self):
        if self.current:
            self.current["text"] = " ".join(self.current["text"].split())
            self.current["vendors"] = [vendor for vendor in ("Cisco", "Netgear", "Fortinet", "Microsoft", "MongoDB", "Python", "Node.js", "CompTIA") if vendor.casefold() in self.current["text"].casefold()]
            self.entries.append(self.current)
            self.current = None


def search_entries(source, slug, title):
    body = markdown.markdown(source, extensions=["tables", "fenced_code", "toc", "sane_lists"])
    index = SectionIndex(slug, title)
    index.feed(body)
    index.flush()
    return index.entries

STYLE = """
:root { color-scheme: light; font-family: system-ui, sans-serif; color: #182b3a; background: #f4f6f7; }
body { margin: 0; line-height: 1.75; }
nav, main { max-width: 1000px; margin: auto; padding: 1.5rem; }
nav { display: flex; flex-wrap: wrap; gap: .75rem 1.5rem; }
main { background: white; border-top: 4px solid #1e5cc4; padding-bottom: 4rem; overflow-wrap: anywhere; }
a { color: #145e80; text-underline-offset: .2em; }
a:focus-visible, summary:focus-visible { outline: 3px solid #ca691b; outline-offset: 3px; }
h1,h2,h3,h4 { line-height: 1.25; color: #163d6e; scroll-margin-top: 1rem; }
h1 { font-size: clamp(1.8rem, 4vw, 2.7rem); }
h2 { margin-top: 2.5rem; border-bottom: 1px solid #d6e1ef; padding-bottom: .6rem; }
pre { padding: 1rem; border-radius: .4rem; background: #102c52; color: #eef5ff; overflow: auto; line-height: 1.6; font-size: .9rem; }
code { font-family: ui-monospace, monospace; } p code, li code { background: #edf2f2; padding: .1rem .25rem; }
table { display: block; overflow: auto; border-collapse: collapse; font-size: .9rem; }
th,td { padding: .6rem; border: 1px solid #d2dfdc; text-align: left; min-width: 5rem; }
th { background: #edf3ff; } blockquote { border-left: 3px solid #c18c40; margin-left: 0; padding-left: 1rem; }
details { margin: 1rem 0; padding: 1rem; background: #edf3ff; } summary { cursor: pointer; font-weight: 600; }
@media print { nav, .toc { display: none; } :root { background: white; } main { max-width: none; padding: 0; } pre { white-space: pre-wrap; color: black; background: #eee; } a { color: black; } }
"""


def render(source, title):
    parser = markdown.Markdown(extensions=["tables", "fenced_code", "toc", "sane_lists"])
    body = parser.convert(source)
    body = body.replace('href="../README.md"', 'href="https://github.com/NextLVLHasH/AZ4CAF_UXA_1_UC_COMP_L4-Data-Centre-Operations-AZ-/blob/main/README.md"')
    slugs = "|".join(re.escape(slug) for slug in GUIDES)
    body = re.sub(r'href="(' + slugs + r')\.md(?=[#"])', r'href="\1.html', body)
    nav = '<a href="../index.html">← Study notebook</a>' + ''.join(
        f'<a href="{slug}.html">{escape(label)}</a>' for slug, label in GUIDES.items()
    )
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>{escape(title)} · AZ4CAF</title><style>{STYLE}</style></head>
<body><nav aria-label="Study resources">{nav}</nav><main>
<details class="toc"><summary>On this page</summary>{parser.toc}</details>
{body}
</main></body></html>
'''


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    output = ROOT / "docs/guides"
    if not args.check:
        output.mkdir(exist_ok=True)
    stale = []
    entries = []
    for slug, title in GUIDES.items():
        source = (ROOT / "docs" / f"{slug}.md").read_text(encoding="utf-8")
        html = render(source, title)
        entries.extend(search_entries(source, slug, title))
        path = output / f"{slug}.html"
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != html:
                stale.append(str(path.relative_to(ROOT)))
        else:
            path.write_text(html, encoding="utf-8")
    index_path = ROOT / "docs/data/search-index.json"
    search_json = json.dumps({"schema_version": 1, "entries": entries}, ensure_ascii=False, indent=2) + "\n"
    if args.check:
        if not index_path.exists() or index_path.read_text(encoding="utf-8") != search_json:
            stale.append(str(index_path.relative_to(ROOT)))
    else:
        index_path.write_text(search_json, encoding="utf-8")
    if stale:
        parser.exit(1, "Stale guides: " + ", ".join(stale) + "; run python scripts/build_guides.py\n")
    print("Guide HTML is current." if args.check else "Built seven browsable guides and the section search index.")


if __name__ == "__main__":
    main()
