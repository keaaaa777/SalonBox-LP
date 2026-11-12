
import sys

path = r'C:\Git\LP-salonbox\salonbox\js\form.js'
with open(path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Look for the duplicated block
new_lines = []
skip = False
for i in range(len(lines)):
    if i > 0 and 'contactForm.addEventListener(\'submit\', async function(e){' in lines[i] and 'contactForm.addEventListener(\'submit\', async function(e){' in lines[i-3 if i>=3 else 0:i]:
         # This is likely the duplicated one
         # We check if the previous lines match the pattern
         continue
    new_lines.append(lines[i])

# More specific fix based on line numbers 542-545 (0-indexed: 541-544)
# Lines are:
# 541: (empty)
# 542: contactForm.addEventListener...
# 543: e.preventDefault()
# 544: (empty)
# 545: contactForm.addEventListener...

final_lines = []
i = 0
while i < len(lines):
    if i == 541 and 'contactForm.addEventListener' in lines[i] and i+3 < len(lines) and 'contactForm.addEventListener' in lines[i+3]:
        final_lines.append(lines[i])
        final_lines.append(lines[i+1])
        i += 3 # skip line 543 (empty) and 544 (duplicate listener) and 545 (duplicate preventDefault)
    else:
        final_lines.append(lines[i])
        i += 1

with open(path, 'w', encoding='utf-8') as f:
    f.writelines(final_lines)
