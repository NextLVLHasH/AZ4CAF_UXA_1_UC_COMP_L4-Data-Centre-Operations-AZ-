"""Build browsable static HTML guides from the maintained Markdown sources."""
import argparse
import re
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
}
STYLE = """
:root { color-scheme: light; font-family: system-ui, sans-serif; color: #182b3a; background: #f4f6f7; }
body { margin: 0; line-height: 1.75; }
nav, main { max-width: 1000px; margin: auto; padding: 1.5rem; }
nav { display: flex; flex-wrap: wrap; gap: .75rem 1.5rem; }
main { background: white; border-top: 4px solid #237b69; padding-bottom: 4rem; overflow-wrap: anywhere; }
a { color: #145e80; text-underline-offset: .2em; }
a:focus-visible, summary:focus-visible { outline: 3px solid #ca691b; outline-offset: 3px; }
h1,h2,h3,h4 { line-height: 1.25; color: #143c38; scroll-margin-top: 1rem; }
h1 { font-size: clamp(1.8rem, 4vw, 2.7rem); }
h2 { margin-top: 2.5rem; border-bottom: 1px solid #dce7e4; padding-bottom: .6rem; }
pre { padding: 1rem; border-radius: .4rem; background: #152a32; color: #e7f3ed; overflow: auto; line-height: 1.6; font-size: .9rem; }
code { font-family: ui-monospace, monospace; } p code, li code { background: #edf2f2; padding: .1rem .25rem; }
table { display: block; overflow: auto; border-collapse: collapse; font-size: .9rem; }
th,td { padding: .6rem; border: 1px solid #d2dfdc; text-align: left; min-width: 5rem; }
th { background: #edf4f0; } blockquote { border-left: 3px solid #c18c40; margin-left: 0; padding-left: 1rem; }
details { margin: 1rem 0; padding: 1rem; background: #f0f5f2; } summary { cursor: pointer; font-weight: 600; }
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
    for slug, title in GUIDES.items():
        source = (ROOT / "docs" / f"{slug}.md").read_text(encoding="utf-8")
        html = render(source, title)
        path = output / f"{slug}.html"
        if args.check:
            if not path.exists() or path.read_text(encoding="utf-8") != html:
                stale.append(str(path.relative_to(ROOT)))
        else:
            path.write_text(html, encoding="utf-8")
    if stale:
        parser.exit(1, "Stale guides: " + ", ".join(stale) + "; run python scripts/build_guides.py\n")
    print("Guide HTML is current." if args.check else "Built six browsable study guides.")


if __name__ == "__main__":
    main()
