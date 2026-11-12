
import os

path = r'C:\Git\LP-salonbox\salonbox\js\form.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# The specific duplicated string to remove
bad_string = "    contactForm.addEventListener('submit', async function(e){\n      e.preventDefault();\n    contactForm.addEventListener('submit', async function(e){\n      e.preventDefault();"
good_string = "    contactForm.addEventListener('submit', async function(e){\n      e.preventDefault();"

if bad_string in content:
    new_content = content.replace(bad_string, good_string)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed!")
else:
    # Try with variant line endings or spaces if needed
    print("Not found")
