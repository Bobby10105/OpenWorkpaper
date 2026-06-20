import re

with open("src/app/api/audits/[id]/route.ts", "r") as f:
    content = f.read()

content = re.sub(
    r"const allAttachments = await prisma\.\$queryRawUnsafe<RawAttachment\[\]>\(\n\s*`SELECT \* FROM Attachment WHERE procedureId IN \(SELECT id FROM Procedure WHERE auditId = \?\) ORDER BY displayOrder ASC`,\n\s*auditId\n\s*\);",
    r"const allAttachments = await prisma.$queryRaw<RawAttachment[]>`SELECT * FROM Attachment WHERE procedureId IN (SELECT id FROM Procedure WHERE auditId = ${auditId}) ORDER BY displayOrder ASC`;",
    content
)

content = re.sub(
    r"const allMessages = await prisma\.\$queryRawUnsafe<RawMessage\[\]>\(\n\s*`SELECT \* FROM ProcedureMessage WHERE procedureId IN \(SELECT id FROM Procedure WHERE auditId = \?\) ORDER BY createdAt ASC`,\n\s*auditId\n\s*\);",
    r"const allMessages = await prisma.$queryRaw<RawMessage[]>`SELECT * FROM ProcedureMessage WHERE procedureId IN (SELECT id FROM Procedure WHERE auditId = ${auditId}) ORDER BY createdAt ASC`;",
    content
)

with open("src/app/api/audits/[id]/route.ts", "w") as f:
    f.write(content)

print("Fixed route.ts 2!")
