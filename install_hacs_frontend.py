#!/usr/bin/env python3
"""
Install Madelena-required HACS frontend repos via HACS UI automation (CDP).

Run while logged into Home Assistant in the browser MCP tab on HACS page.
Alternatively installs via repeated search — use build script after manual install.

Repos to install (search term → expected name fragment):
"""

REPOS = [
    ("Mushroom", "Mushroom"),
    ("button-card", "button-card"),
    ("card-mod", "card-mod"),
    ("layout-card", "layout-card"),
    ("auto-entities", "auto-entities"),
    ("decluttering-card", "decluttering"),
    ("mini-graph-card", "mini-graph"),
    ("ha-floorplan", "floorplan"),
]

# Manual install checklist for user if automation fails:
CHECKLIST = """
HACS → Frontend (or filter Type: Dashboard) → Search each → Download:

1. Mushroom Cards
2. button-card (custom-cards)
3. card-mod
4. layout-card
5. auto-entities
6. decluttering-card
7. mini-graph-card
8. HA Floorplan

Then run:
  python3 add_lovelace_resources.py
  python3 build_home_dashboard.py
  Copy www/* to /config/www/ via File editor
"""

if __name__ == "__main__":
    print(CHECKLIST)
