import re

with open("src/app/api/audits/[id]/route.test.ts.ours") as f:
    ours = f.read()

with open("src/app/api/audits/[id]/route.test.ts.theirs") as f:
    theirs = f.read()

get_match = re.search(r"(describe\('Audit Detail API Route'.*?\n\}\);)", theirs, re.DOTALL)
if get_match:
    get_block = get_match.group(1)
    # Fix the test to use $queryRaw instead of $queryRawUnsafe
    get_block = get_block.replace('$queryRawUnsafe', '$queryRaw')
    
    # We already have a GET block in ours: describe('GET /api/audits/:id', ...)
    # Let's just append this new block to the end, or rather replace the old GET block.
    # Our old GET block only has the 500 error test. We can just keep both, or remove ours.
    # Actually, appending is safer.
    
    with open("src/app/api/audits/[id]/route.test.ts", "w") as out:
        out.write(ours + "\n\n" + get_block + "\n")
    print("Merged!")
else:
    print("Failed to find block")
