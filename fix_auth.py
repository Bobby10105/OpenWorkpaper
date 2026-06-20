import re

with open('src/lib/__tests__/auth.test.ts', 'r') as f:
    data = f.read()

# remove everything between ======= and >>>>>>>
data = re.sub(r'=======\n.*?\n>>>>>>> origin/test/auth-update-session-4107648528377162357\n', '', data, flags=re.DOTALL)
# remove <<<<<<< HEAD\n
data = data.replace('<<<<<<< HEAD\n', '')

with open('src/lib/__tests__/auth.test.ts', 'w') as f:
    f.write(data)
