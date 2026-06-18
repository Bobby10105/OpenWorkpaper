import { PrismaClient } from '@prisma/client';
import { faker } from '@faker-js/faker';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as crypto from 'crypto';

import { PrismaBetterSqlite3 } from '@prisma/adapter-better-sqlite3';

const dbUrl = process.env.DATABASE_URL || 'file:./prisma/data/dev.db';
const dbPath = dbUrl.replace(/^file:/, '');
const sqliteInput = {
  url: path.resolve(process.cwd(), dbPath)
};
const adapter = new PrismaBetterSqlite3(sqliteInput);
const prisma = new PrismaClient({ adapter });

import bcrypt from 'bcryptjs';

async function main() {
  console.log('Starting seed script...');
  
  // Set a deterministic seed so the same users and data are generated every time
  faker.seed(12345);
  
  // Clear existing data to avoid duplicates on re-run
  await prisma.attachment.deleteMany();
  await prisma.procedure.deleteMany();
  await prisma.procedureGroup.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.audit.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash('password123', 10);
  
  const officialRoles = [
    'IT Administrator',
    'Business Operations',
    'Audit Partner',
    'Audit Director',
    'Audit Manager',
    'Audit Manager',
    'Specialist',
    ...Array(8).fill('Auditor')
  ];

  // Create 15 mock users for the team members
  const users: any[] = [];
  console.log('Generating 15 users...');
  for (let i = 0; i < 15; i++) {
    const firstName = faker.person.firstName();
    const lastName = faker.person.lastName();
    const generatedUsername = `${firstName.toLowerCase()}.${lastName.toLowerCase()}_${i}`;
    const generatedEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`;
    const fullName = `${firstName} ${lastName}`;

    const user = await prisma.user.create({
      data: {
        username: generatedUsername,
        password: hashedPassword,
        role: officialRoles[i],
        mustChangePassword: false,
      }
    });
    
    users.push({
      ...user,
      fullName,
      email: generatedEmail
    });
    console.log(`Created user: ${user.username} | Role: ${user.role} | Password: password123`);
  }

  // Generate exactly 4 audits (2 active, 2 completed)
  const numAudits = 4;
  console.log(`Generating ${numAudits} audits...`);
  
  for (let i = 0; i < numAudits; i++) {
    const isArchived = i >= 2;
    const auditStatus = isArchived ? 'Completed' : faker.helpers.arrayElement(['Planning', 'In Progress', 'Reporting']);

    const audit = await prisma.audit.create({
      data: {
        title: `${faker.company.name()} - ${faker.finance.accountName()} Audit`,
        description: faker.lorem.paragraph(),
        category: faker.helpers.arrayElement(['Financial', 'IT', 'Operational', 'Compliance']),
        auditNumber: `AUD-${faker.number.int({ min: 1000, max: 9999 })}`,
        status: auditStatus,
        objective: faker.lorem.sentence(),
        fieldworkStartDate: faker.date.recent({ days: 30 }),
        fieldworkEndDate: faker.date.soon({ days: 30 }),
      }
    });

    console.log(`Created Audit: ${audit.title} (Status: ${audit.status})`);

    // Assign team members
    // Randomly pick 3-7 users
    const shuffledUsers = faker.helpers.shuffle(users).slice(0, faker.number.int({ min: 3, max: 7 }));
    const teamMembers: any[] = [];
    for (const u of shuffledUsers) {
      const tm = await prisma.teamMember.create({
        data: {
          auditId: audit.id,
          userId: u.id,
          name: u.fullName,
          role: u.role,
          email: u.email,
        }
      });
      teamMembers.push(tm);
    }

    // Create Procedure Groups
    const groups: any[] = [];
    for (const phase of ['Planning', 'Fieldwork', 'Reporting']) {
      const g = await prisma.procedureGroup.create({
        data: {
          auditId: audit.id,
          phase: phase,
          title: `${phase} Procedures`
        }
      });
      groups.push(g);
    }

    // Add Procedures
    const numProcedures = faker.number.int({ min: 10, max: 20 });
    const statuses = ['Populated', 'Completed', 'Pending Review', 'Reviewed'];
    
    const purposes = [
      "To verify the accuracy and completeness of the recorded transactions.",
      "To assess the effectiveness of the internal controls surrounding the financial reporting process.",
      "To ensure compliance with the established company policies and relevant regulatory requirements."
    ];

    const sources = [
      "General Ledger extract provided by the Finance department.",
      "System-generated access logs from the IT security team.",
      "Sample of vendor invoices and corresponding purchase orders.",
      "Bank statements and monthly reconciliation reports."
    ];

    const scopes = [
      "All transactions recorded in the specified account during the third quarter of the fiscal year.",
      "User access provisioning and de-provisioning records for the core banking system.",
      "Vendor payments exceeding $10,000 processed between January and June.",
      "Payroll processing cycle for the month of August, including overtime calculations."
    ];

    const methodologies = [
      "Obtained a system-generated report and selected a random sample of 25 transactions. Traced each transaction back to the original source documents to verify authorization and accuracy.",
      "Conducted walkthroughs with key process owners to understand the control environment. Documented the process flow and identified key control points.",
      "Performed a two-way match between the purchase orders and vendor invoices for the selected sample. Verified that appropriate approvals were obtained prior to payment.",
      "Reviewed the access logs and compared them against the list of authorized personnel. Verified that access was revoked in a timely manner for terminated employees."
    ];

    const resultTexts = [
      "Based on the testing performed, all 25 sampled transactions were properly authorized and accurately recorded in the general ledger. No exceptions were noted.",
      "Walkthroughs confirmed that the documented controls are in place and operating effectively. Process owners demonstrated a clear understanding of their responsibilities.",
      "Testing revealed two instances where the purchase order was not approved prior to the invoice payment. However, the amounts were immaterial and management has been notified.",
      "Access logs showed that three terminated employees retained access to the system for more than 48 hours after their departure. This represents a control deficiency."
    ];

    const conclusionTexts = [
      "The controls surrounding the financial reporting process appear to be operating effectively.",
      "The transactions recorded in the account are accurate and complete, with no material misstatements identified.",
      "While the majority of controls are functioning as intended, management should address the identified deficiencies in the access de-provisioning process.",
      "The vendor payment process is generally compliant with company policy, but the approval workflow should be reinforced to ensure strict adherence."
    ];
    
    const createProcedure = async (group: any, titleOverride: any = null) => {
      const tm = faker.helpers.arrayElement(teamMembers);
      const status = isArchived ? 'Reviewed' : faker.helpers.arrayElement(statuses);
      
      const isCompletedOrReview = ['Completed', 'Pending Review', 'Reviewed'].includes(status);
      
      const preparedDate = isCompletedOrReview ? faker.date.recent({ days: 60 }) : null;
      const reviewedDate = status === 'Reviewed' && preparedDate 
        ? new Date(preparedDate.getTime() + faker.number.int({ min: 10, max: 18 }) * 24 * 60 * 60 * 1000) 
        : null;
      
      const reviewerTm = faker.helpers.arrayElement(teamMembers);

      const procedure = await prisma.procedure.create({
        data: {
          auditId: audit.id,
          groupId: group.id,
          phase: group.phase,
          title: titleOverride || `Verify ${faker.finance.accountName()} controls`,
          purpose: faker.helpers.arrayElement(purposes),
          source: faker.helpers.arrayElement(sources),
          scope: faker.helpers.arrayElement(scopes),
          methodology: faker.helpers.arrayElement(methodologies),
          results: isCompletedOrReview ? faker.helpers.arrayElement(resultTexts) : null,
          conclusions: status === 'Reviewed' ? faker.helpers.arrayElement(conclusionTexts) : null,
          status: status,
          assignedToId: tm.id,
          preparedBy: isCompletedOrReview ? tm.name : null,
          preparedDate: preparedDate,
          reviewedBy: status === 'Reviewed' ? reviewerTm.name : null,
          reviewedDate: reviewedDate,
        }
      });
      
      // Attachments for roughly half of the completed procedures
      if (isCompletedOrReview && faker.datatype.boolean()) {
        const numAttachments = faker.number.int({ min: 1, max: 3 });
        for (let k = 0; k < numAttachments; k++) {
          const extension = faker.helpers.arrayElement(['xlsx', 'pdf', 'csv', 'docx']);
          const filenames = ['GL_Extract', 'Vendor_Invoice_Sample', 'Access_Logs', 'Bank_Reconciliation', 'Policy_Document'];
          const filename = `${faker.helpers.arrayElement(filenames)}.${extension}`;
          
          const uniqueSuffix = crypto.randomUUID();
          const safeFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
          const diskFilename = `${uniqueSuffix}-${safeFilename}`;
          
          const uploadDir = path.join(process.cwd(), 'public/uploads');
          const filepath = path.join(uploadDir, diskFilename);
          const dbFilepath = `/uploads/${diskFilename}`;
          
          // Ensure directory exists
          await fs.mkdir(uploadDir, { recursive: true });
          
          // Generate 1KB dummy file (1024 bytes)
          const buffer = Buffer.alloc(1024, '0');
          await fs.writeFile(filepath, buffer);
          
          await prisma.attachment.create({
            data: {
              procedureId: procedure.id,
              filename: filename,
              filepath: dbFilepath,
              mimetype: extension === 'pdf' ? 'application/pdf' : 'application/octet-stream',
              size: 1024,
              displayOrder: k + 1,
            }
          });
        }
      }
    };
    
    // Add random procedures
    for (let j = 0; j < numProcedures; j++) {
      // If it's an active audit, don't put random procedures in Reporting
      const availableGroups = !isArchived ? groups.filter(g => g.phase !== 'Reporting') : groups;
      const group = faker.helpers.arrayElement(availableGroups);
      await createProcedure(group);
    }
    
    // Add specific Reporting procedures for active audits
    if (!isArchived) {
      const reportingGroup = groups.find(g => g.phase === 'Reporting');
      if (reportingGroup) {
        await createProcedure(reportingGroup, "Draft Report");
        await createProcedure(reportingGroup, "Management Comments");
        await createProcedure(reportingGroup, "Final Report");
      }
    }
  }

  console.log('Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
