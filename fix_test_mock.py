import re

with open("src/app/api/audits/[id]/route.test.ts", "r") as f:
    content = f.read()

# Replace the mock for messages
content = re.sub(
    r"if \(q\.includes\('FROM ProcedureMessage'\)\) \{\n\s*if \(args\[0\] === 'proc-1'\) return mockMessagesProc1;\n\s*if \(args\[0\] === 'proc-2'\) return mockMessagesProc2;\n\s*\}",
    r"if (q.includes('FROM ProcedureMessage')) return [...mockMessagesProc1, ...mockMessagesProc2];",
    content
)

# Replace the mock for attachments
content = re.sub(
    r"if \(q\.includes\('FROM Attachment'\)\) \{\n\s*if \(args\[0\] === 'proc-1'\) return mockAttachmentsProc1;\n\s*if \(args\[0\] === 'proc-2'\) return mockAttachmentsProc2;\n\s*\}",
    r"if (q.includes('FROM Attachment')) return [...mockAttachmentsProc1, ...mockAttachmentsProc2];",
    content
)

with open("src/app/api/audits/[id]/route.test.ts", "w") as f:
    f.write(content)

print("Fixed test mock!")
