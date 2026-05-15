import os
import re

def check_file(filepath):
    try:
        with open(filepath, 'r') as f:
            content = f.read()
    except Exception as e:
        print(f"Error reading {filepath}: {e}")
        return

    # Check for unbalanced braces
    open_braces = content.count('{')
    close_braces = content.count('}')
    
    suspicious = []
    
    # Check for "AAAAAA" or "LLLLLL"
    if "AAAAAA" in content:
        suspicious.append("AAAAAA found")
    if "LLLLLL" in content:
        suspicious.append("LLLLLL found")
    
    # Check for specific typos
    # sole.error not preceded by 'con'
    if re.search(r'(?<!con)sole\.error', content):
        suspicious.append("Typo 'sole.error' found (not preceded by 'con')")
    
    if "con sole.error" in content:
        suspicious.append("Typo 'con sole.error' found")
        
    if "NextResponse. json" in content:
        suspicious.append("Typo 'NextResponse. json' found")
    
    # Check for trailing garbage (anything after the last closing brace that isn't whitespace)
    # This is tricky because some files might end with a semicolon or other valid tokens outside braces
    # But usually Next.js files end with a brace or a newline.
    last_brace = content.rfind('}')
    if last_brace != -1:
        trailing = content[last_brace+1:].strip()
        # Common valid trailing chars: ; (for some exports/statements)
        if trailing and trailing not in [';']:
            # If it's just comments, it's fine
            if not trailing.startswith('//') and not (trailing.startswith('/*') and trailing.endswith('*/')):
                 suspicious.append(f"Suspicious trailing garbage: '{trailing[:50]}'")

    if open_braces != close_braces or suspicious:
        print(f"{filepath}:")
        if open_braces != close_braces:
            print(f"  Unbalanced braces: {open_braces} {{ vs {close_braces} }}")
        for s in suspicious:
            print(f"  {s}")

def main():
    root_dir = '/home/bobby/Gemini/OpenWorkpaper/src/app'
    for root, dirs, files in os.walk(root_dir):
        for file in files:
            if file.endswith(('route.ts', 'page.tsx')):
                check_file(os.path.join(root, file))

if __name__ == "__main__":
    main()
