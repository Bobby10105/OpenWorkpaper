import re

with open("src/app/api/audits/[id]/route.ts", "r") as f:
    content = f.read()

# Replace $queryRawUnsafe calls with $queryRaw tagged template literals
# Example 1: rawGroups
content = re.sub(
    r"await prisma\.\$queryRawUnsafe\(\s*`SELECT \* FROM ProcedureGroup WHERE auditId = \? ORDER BY displayOrder ASC`,\s*auditId\s*\)",
    r"await prisma.$queryRaw`SELECT * FROM ProcedureGroup WHERE auditId = ${auditId} ORDER BY displayOrder ASC`",
    content
)

# Example 2: rawProcedures try block
content = re.sub(
    r"await prisma\.\$queryRawUnsafe\(\s*`SELECT p\.\*, t\.name as assignedToName, t\.role as assignedToRole, t\.email as assignedToEmail\n\s*FROM Procedure p\n\s*LEFT JOIN TeamMember t ON p\.assignedToId = t\.id\n\s*WHERE p\.auditId = \?`,\s*auditId\s*\)",
    r"await prisma.$queryRaw`SELECT p.*, t.name as assignedToName, t.role as assignedToRole, t.email as assignedToEmail\n       FROM Procedure p\n       LEFT JOIN TeamMember t ON p.assignedToId = t.id\n       WHERE p.auditId = ${auditId}`",
    content
)

# Example 3: rawProcedures catch block
content = re.sub(
    r"await prisma\.\$queryRawUnsafe\(\s*`SELECT \* FROM Procedure WHERE auditId = \?`,\s*auditId\s*\)",
    r"await prisma.$queryRaw`SELECT * FROM Procedure WHERE auditId = ${auditId}`",
    content
)

with open("src/app/api/audits/[id]/route.ts", "w") as f:
    f.write(content)

print("Fixed route.ts!")
