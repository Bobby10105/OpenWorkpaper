import re

with open("src/app/api/attachments/[id]/__tests__/route.test.ts") as f:
    old_test = f.read()

with open("src/app/api/attachments/[id]/route.test.ts") as f:
    new_test = f.read()

# Extract describe block for GET from new_test
get_block_match = re.search(r"(describe\('GET /api/attachments/\[id\]'.*?\n\}\);)", new_test, re.DOTALL)
if get_block_match:
    get_block = get_block_match.group(1)
else:
    print("Could not find GET block in PR 64 test")
    exit(1)

# Extract describe block for PUT from old_test
put_block_match = re.search(r"(describe\('PUT /api/attachments/\[id\]'.*?\n\}\);)", old_test, re.DOTALL)
if put_block_match:
    put_block = put_block_match.group(1)
else:
    print("Could not find PUT block in our test")
    exit(1)

# Get imports and mocks from old_test
prefix = old_test[:put_block_match.start()]

with open("src/app/api/attachments/[id]/route.test.ts", "w") as f:
    f.write(prefix + "\n" + put_block + "\n\n" + get_block + "\n")

print("Merged!")
