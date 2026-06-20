import re

with open('src/app/api/reports/export/route.ts', 'r') as f:
    data = f.read()

# Replace $queryRaw`...` with $queryRaw(Prisma.sql`...`) is one way, but it is better to use the template literal tag
data = re.sub(
    r'await prisma\.\$queryRaw<ProcedureExport\[\]>\(\s*`([^`]+)`\s*\)',
    r'await prisma.$queryRaw<ProcedureExport[]>`\1`',
    data
)

with open('src/app/api/reports/export/route.ts', 'w') as f:
    f.write(data)
