"""Render the Pages entrypoint from the Flask template; both share the same markup."""
import argparse
from pathlib import Path

from jinja2 import Environment, FileSystemLoader, select_autoescape

ROOT = Path(__file__).resolve().parents[1]


def render():
    environment = Environment(loader=FileSystemLoader(ROOT / "templates"),
                              autoescape=select_autoescape(["html"]))
    return environment.get_template("index.html").render(
        asset_base="./assets", content_url="./data/study_content.json",
        learning_url="./data/learning_content.json", search_url="./data/search-index.json",
    ) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--check", action="store_true")
    args = parser.parse_args()
    target = ROOT / "docs/index.html"
    html = render()
    if args.check:
        if target.read_text(encoding="utf-8") != html:
            parser.exit(1, "Pages entrypoint is stale; run python scripts/build_site.py\n")
        print("Shared site entrypoint is current.")
    else:
        target.write_text(html, encoding="utf-8")
        print("Built Pages entrypoint from the shared template.")


if __name__ == "__main__":
    main()
