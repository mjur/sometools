#!/usr/bin/env python3
"""
Generate individual HTML pages for each unit combination
Creates pages like /convert/units/length/cm-to-inch/index.html
"""

import os
import json
import re

# Read unit definitions from the JS file
def extract_units_from_js():
    """Extract unit definitions from the JavaScript file"""
    units = {}
    categories = {}
    
    with open('js/utils/unit-definitions.js', 'r') as f:
        content = f.read()
    
    # Extract categories - handle multiline format
    cat_match = re.search(r'export const CATEGORIES = \[(.*?)\];', content, re.DOTALL)
    if cat_match:
        cat_content = cat_match.group(1)
        # Match category objects with flexible whitespace
        for match in re.finditer(r'\{[^}]*id:\s*\'([^\']+)\'[^}]*name:\s*\'([^\']+)\'[^}]*\}', cat_content):
            categories[match.group(1)] = match.group(2)
    
    # Extract units - improved regex to handle multiline and various formats
    # Match addUnits blocks and extract unit objects
    add_units_blocks = re.finditer(r'addUnits\(\[(.*?)\]\);', content, re.DOTALL)
    
    for block_match in add_units_blocks:
        block_content = block_match.group(1)
        # Extract individual unit objects - handle nested braces
        # Find all unit objects by matching balanced braces
        brace_count = 0
        start_idx = -1
        i = 0
        
        while i < len(block_content):
            if block_content[i] == '{':
                if brace_count == 0:
                    start_idx = i
                brace_count += 1
            elif block_content[i] == '}':
                brace_count -= 1
                if brace_count == 0 and start_idx != -1:
                    # Extract unit object
                    unit_obj = block_content[start_idx:i+1]
                    # Parse unit properties
                    id_match = re.search(r"id:\s*'([^']+)'", unit_obj)
                    name_match = re.search(r"name:\s*'([^']+)'", unit_obj)
                    symbol_match = re.search(r"symbol:\s*'([^']+)'", unit_obj)
                    category_match = re.search(r"category:\s*'([^']+)'", unit_obj)
                    
                    if id_match and name_match and symbol_match and category_match:
                        unit_id = id_match.group(1)
                        unit_name = name_match.group(1)
                        unit_symbol = symbol_match.group(1)
                        unit_category = category_match.group(1)
                        
                        if unit_category not in units:
                            units[unit_category] = []
                        
                        units[unit_category].append({
                            'id': unit_id,
                            'name': unit_name,
                            'symbol': unit_symbol
                        })
                    start_idx = -1
            i += 1
    
    return units, categories

def create_unit_page(category_id, category_name, from_unit, to_unit, base_path):
    """Create an HTML page for a unit combination"""
    
    from_name = from_unit['name']
    to_name = to_unit['name']
    from_symbol = from_unit['symbol']
    to_symbol = to_unit['symbol']
    from_unit_id = from_unit['id']
    to_unit_id = to_unit['id']
    
    page_title = f"{from_name} to {to_name} Converter | {category_name} | SomeTools"
    meta_description = f"Convert {from_name} ({from_symbol}) to {to_name} ({to_symbol}) and other {category_name.lower()} units. Free online unit converter."
    
    # Escape single quotes in strings for JavaScript
    from_unit_id_escaped = from_unit_id.replace("'", "\\'")
    to_unit_id_escaped = to_unit_id.replace("'", "\\'")
    
    html = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>{page_title}</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="description" content="{meta_description}">
  <link rel="canonical" href="https://example.com{base_path}">
  <link rel="stylesheet" href="/css/base.css">
  <link rel="stylesheet" href="/css/tool.css">
  <link rel="preload" href="/css/base.css" as="style">
  <link rel="icon" href="/favicon.ico">
  <link rel="manifest" href="/manifest.webmanifest">
  <script type="module" src="/js/analytics.js"></script>
  <meta property="og:title" content="{from_name} to {to_name} Converter">
  <meta property="og:description" content="{meta_description}">
  <meta property="og:type" content="website">
  <script type="application/ld+json">
  {{
    "@context": "https://schema.org",
    "@type": "WebApplication",
    "name": "{from_name} to {to_name} Converter",
    "description": "{meta_description}",
    "url": "https://example.com{base_path}",
    "applicationCategory": "UtilityApplication",
    "operatingSystem": "Any"
  }}
  </script>
</head>
<body>
  <a href="#main" class="skip-link">Skip to main content</a>
  <header>
    <a href="/">
      <h1>SomeTools</h1>
    </a>
    <button class="theme-toggle" id="theme-toggle" aria-label="Toggle theme">
      <span id="theme-icon">🌙</span>
    </button>
  </header>
  
  <nav aria-label="Breadcrumb">
    <a href="/">Home</a>
    <a href="/convert/units">Unit Converter</a>
    <a href="/convert/units/{category_id}">{category_name}</a>
    <span>{from_name} to {to_name}</span>
  </nav>
  
  <main id="main">
    <h1>{from_name} to {to_name} Converter</h1>
    <p>Convert {from_name} ({from_symbol}) to {to_name} ({to_symbol}) and other {category_name.lower()} units.</p>
    
    <div style="margin: 1rem 0;">
      <a href="/convert/units/{category_id}" style="color: var(--link); text-decoration: none;">← Back to {category_name} converter</a>
    </div>
    
    <div class="options">
      <div class="option-group">
        <label for="precision">Precision</label>
        <select id="precision">
          <option value="auto" selected>Auto</option>
          <option value="2">2 decimals</option>
          <option value="4">4 decimals</option>
          <option value="6">6 decimals</option>
          <option value="8">8 decimals</option>
          <option value="10">10 decimals</option>
        </select>
      </div>
    </div>
    
    <section class="tool" style="margin-top: 1.5rem;">
      <div style="display: flex; gap: 1rem; align-items: flex-start; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 250px; display: flex; flex-direction: column;">
          <label for="from-value">From</label>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <input type="number" id="from-value" step="any" placeholder="Enter value" style="font-size: 1.25rem; padding: 0.75rem;">
            <div style="position: relative;">
              <select id="from-unit" style="width: 100%; font-size: 1rem; padding: 0.75rem;">
                <option value="">Select unit...</option>
              </select>
            </div>
          </div>
          <div id="from-unit-info" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-subtle);"></div>
        </div>
        
        <div style="display: flex; align-items: center; justify-content: center; padding-top: 2.5rem; flex-shrink: 0;">
          <button id="swap-units" class="secondary" style="padding: 0.75rem 1.5rem; font-size: 1.25rem;" aria-label="Swap units">
            ⇄
          </button>
        </div>
        
        <div style="flex: 1; min-width: 250px; display: flex; flex-direction: column;">
          <label for="to-value">To</label>
          <div style="display: flex; flex-direction: column; gap: 0.5rem;">
            <input type="number" id="to-value" step="any" placeholder="Result" readonly style="font-size: 1.25rem; padding: 0.75rem; background-color: var(--bg-elev);">
            <div style="position: relative;">
              <select id="to-unit" style="width: 100%; font-size: 1rem; padding: 0.75rem;">
                <option value="">Select unit...</option>
              </select>
            </div>
          </div>
          <div id="to-unit-info" style="margin-top: 0.5rem; font-size: 0.875rem; color: var(--text-subtle);"></div>
        </div>
      </div>
    </section>
    
    <div id="conversion-info" style="margin-top: 1rem; padding: 1rem; background-color: var(--bg-elev); border-radius: 6px; display: none;">
      <h3 style="margin: 0 0 0.5rem 0; font-size: 1rem;">Conversion Formula</h3>
      <p id="formula-text" style="margin: 0; font-family: monospace; color: var(--text-subtle);"></p>
    </div>
    
    <section class="faq" aria-labelledby="faq-h" style="margin-top: 2rem;">
      <h2 id="faq-h">FAQ</h2>
      <details>
        <summary>How do I convert {from_name} to {to_name}?</summary>
        <p>Enter a value in {from_name} ({from_symbol}) in the "From" field, and the equivalent value in {to_name} ({to_symbol}) will be displayed in the "To" field automatically.</p>
      </details>
      <details>
        <summary>What is the conversion factor?</summary>
        <p>The conversion factor between {from_name} and {to_name} is calculated automatically based on their relationship to the base unit in the {category_name.lower()} category.</p>
      </details>
      <details>
        <summary>Can I convert other units?</summary>
        <p>Yes, you can convert between any units in the {category_name.lower()} category. Use the dropdown menus to select different units.</p>
      </details>
    </section>
  </main>
  
  <script type="module" src="/js/header.js"></script>
  <script type="module">
    // Preload units - store in sessionStorage to be picked up by unit-converter.js
    sessionStorage.setItem('preloadFromUnit', '{from_unit["id"]}');
    sessionStorage.setItem('preloadToUnit', '{to_unit["id"]}');
  </script>
  <script type="module" src="/js/tools/unit-converter.js"></script>
  <script type="module">
    import {{ initNotesWidget }} from '/js/utils/notes-widget.js';
    initNotesWidget();
  </script>
</body>
</html>'''
    
    return html

def main():
    print("Generating unit conversion pages...")
    
    units, categories = extract_units_from_js()
    
    if not units or not categories:
        print("Error: Could not extract units or categories from JavaScript file")
        return
    
    sitemap_entries = []
    total_pages = 0
    
    for category_id, category_name in categories.items():
        if category_id not in units:
            continue
        
        category_units = units[category_id]
        print(f"\nProcessing category: {category_name} ({len(category_units)} units)")
        
        # Create directory structure
        category_dir = f'convert/units/{category_id}'
        
        # Generate pages for each unit combination
        for i, from_unit in enumerate(category_units):
            for j, to_unit in enumerate(category_units):
                if i == j:
                    continue  # Skip same unit
                
                # Create directory for this combination
                combo_dir = f'{category_dir}/{from_unit["id"]}-to-{to_unit["id"]}'
                os.makedirs(combo_dir, exist_ok=True)
                
                # Create HTML page
                base_path = f'/{combo_dir}'
                html = create_unit_page(category_id, category_name, from_unit, to_unit, base_path)
                
                # Write file
                index_path = f'{combo_dir}/index.html'
                with open(index_path, 'w') as f:
                    f.write(html)
                
                # Add to sitemap
                sitemap_entries.append({
                    'loc': f'https://example.com{base_path}',
                    'changefreq': 'monthly',
                    'priority': '0.7'
                })
                
                total_pages += 1
                
                if total_pages % 100 == 0:
                    print(f"  Generated {total_pages} pages...")
    
    print(f"\nGenerated {total_pages} unit conversion pages")
    
    # Update sitemap
    print("\nUpdating sitemap.xml...")
    update_sitemap(sitemap_entries)
    
    print("\nDone!")

def update_sitemap(entries):
    """Add unit conversion pages to sitemap"""
    sitemap_path = 'sitemap.xml'
    
    # Read existing sitemap
    with open(sitemap_path, 'r') as f:
        content = f.read()
    
    # Find the closing urlset tag
    if '</urlset>' in content:
        # Insert entries before closing tag
        entries_xml = '\n'.join([
            f'  <url>\n    <loc>{entry["loc"]}</loc>\n    <changefreq>{entry["changefreq"]}</changefreq>\n    <priority>{entry["priority"]}</priority>\n  </url>'
            for entry in entries
        ])
        
        content = content.replace('</urlset>', f'{entries_xml}\n</urlset>')
        
        with open(sitemap_path, 'w') as f:
            f.write(content)
        
        print(f"Added {len(entries)} entries to sitemap.xml")
    else:
        print("Warning: Could not find </urlset> tag in sitemap.xml")

if __name__ == '__main__':
    main()

