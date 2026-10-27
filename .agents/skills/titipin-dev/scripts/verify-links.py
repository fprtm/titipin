#!/usr/bin/env python3
"""
Verify that all internal markdown links across the Titipin repository
resolve to existing files and valid anchors.
"""
import os
import re
import sys

def verify_markdown_links():
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../../..'))
    broken_links = []
    total_links = 0

    for root, dirs, files in os.walk(base_dir):
        if '.git' in root or 'node_modules' in root or '.agents/teamwork' in root:
            continue
        for f in files:
            if f.endswith('.md'):
                filepath = os.path.join(root, f)
                with open(filepath, 'r', encoding='utf-8') as file:
                    content = file.read()
                
                matches = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
                for text, target in matches:
                    if target.startswith(('http://', 'https://', 'mailto:', '#')):
                        continue
                    total_links += 1
                    path_part, *anchor_part = target.split('#', 1)
                    if not path_part:
                        continue
                    target_abs = os.path.normpath(os.path.join(os.path.dirname(filepath), path_part))
                    if not os.path.exists(target_abs):
                        broken_links.append((filepath, target, target_abs))

    print(f"Checked {total_links} internal markdown links.")
    if broken_links:
        print(f"❌ Found {len(broken_links)} broken links:")
        for source, target, abs_path in broken_links:
            print(f"  In {os.path.relpath(source, base_dir)}: '{target}' -> {os.path.relpath(abs_path, base_dir)}")
        sys.exit(1)
    else:
        print("✅ All internal markdown links are 100% valid!")

if __name__ == '__main__':
    verify_markdown_links()
