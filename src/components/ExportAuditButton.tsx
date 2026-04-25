'use client';

import { useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  HeadingLevel, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  AlignmentType 
} from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import type { AuditWithRelations } from '@/lib/types';

export default function ExportAuditButton({ audit }: { audit: AuditWithRelations }) {
  const [isExporting, setIsExporting] = useState(false);

  const stripHtml = (html: string | null) => {
    if (!html) return '';
    // Strip HTML tags and decode basic entities if needed, 
    // but for now simple tag stripping is enough to prevent raw HTML in Word
    return html.replace(/<[^>]*>?/gm, '');
  };

  const addProcedureDetails = (sections: any[], p: any) => {
    sections.push(
      new Paragraph({
        children: [new TextRun({ text: "Purpose:", bold: true })],
      }),
      new Paragraph({ text: stripHtml(p.purpose) || 'N/A', spacing: { after: 100 } }),
      
      new Paragraph({
        children: [new TextRun({ text: "Source:", bold: true })],
      }),
      new Paragraph({ text: stripHtml(p.source) || 'N/A', spacing: { after: 100 } }),

      new Paragraph({
        children: [new TextRun({ text: "Scope:", bold: true })],
      }),
      new Paragraph({ text: stripHtml(p.scope) || 'N/A', spacing: { after: 100 } }),

      new Paragraph({
        children: [new TextRun({ text: "Methodology:", bold: true })],
      }),
      new Paragraph({ text: stripHtml(p.methodology) || 'N/A', spacing: { after: 100 } }),

      new Paragraph({
        children: [new TextRun({ text: "Results:", bold: true })],
      }),
      new Paragraph({ text: stripHtml(p.results) || 'N/A', spacing: { after: 100 } }),

      new Paragraph({
        children: [new TextRun({ text: "Conclusions:", bold: true })],
      }),
      new Paragraph({ text: stripHtml(p.conclusions) || 'N/A', spacing: { after: 200 } })
    );

    // Sign-off Table
    sections.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Prepared By: ", bold: true }), new TextRun(p.preparedBy || 'N/A')] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Reviewed By: ", bold: true }), new TextRun(p.reviewedBy || 'N/A')] })],
              }),
            ],
          }),
          new TableRow({
            children: [
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(p.preparedDate ? format(new Date(p.preparedDate), 'PP') : 'N/A')] })],
              }),
              new TableCell({
                children: [new Paragraph({ children: [new TextRun({ text: "Date: ", bold: true }), new TextRun(p.reviewedDate ? format(new Date(p.reviewedDate), 'PP') : 'N/A')] })],
              }),
            ],
          }),
        ],
      }),
      new Paragraph({ text: "", spacing: { after: 400 } }) // Spacer
    );
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const sections = [];

      // Title Section
      sections.push(
        new Paragraph({
          text: `Audit Program: ${audit.title}`,
          heading: HeadingLevel.HEADING_1,
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 },
        })
      );

      // Category and Number
      if (audit.category || audit.auditNumber) {
        const subheaderChildren = [];
        if (audit.category) {
          subheaderChildren.push(new TextRun({ text: `Category: `, bold: true }));
          subheaderChildren.push(new TextRun({ text: `${audit.category}    ` }));
        }
        if (audit.auditNumber) {
          subheaderChildren.push(new TextRun({ text: `Audit #: `, bold: true }));
          subheaderChildren.push(new TextRun({ text: `${audit.auditNumber}` }));
        }

        sections.push(
          new Paragraph({
            children: subheaderChildren,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          })
        );
      }

      sections.push(
        new Paragraph({
          children: [
            new TextRun({ text: "Date Exported: ", bold: true }),
            new TextRun(format(new Date(), 'PPP')),
          ],
          spacing: { after: 400 },
        }),
        new Paragraph({
          text: "Audit Objective",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        new Paragraph({
          text: audit.objective || 'No objective provided.',
          spacing: { after: 400 },
        })
      );

      // Team Section
      if (audit.teamMembers && audit.teamMembers.length > 0) {
        sections.push(
          new Paragraph({
            text: "Audit Team",
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 200, after: 100 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Display Name", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Audit Role", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "System Username / Email", bold: true })] })] }),
                ],
              }),
              ...audit.teamMembers.map(member => new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ text: member.name || 'N/A' })] }),
                  new TableCell({ children: [new Paragraph({ text: member.role || 'N/A' })] }),
                  new TableCell({ children: [new Paragraph({ text: member.email || 'N/A' })] }),
                ],
              })),
            ],
          }),
          new Paragraph({ text: "", spacing: { after: 400 } })
        );
      }

      // Milestones Section
      const formatDate = (date: Date | null | undefined) => {
        if (!date) return 'N/A';
        try {
          const d = new Date(date);
          return isNaN(d.getTime()) ? 'N/A' : format(d, 'PP');
        } catch {
          return 'N/A';
        }
      };

      sections.push(
        new Paragraph({
          text: "Project Milestones",
          heading: HeadingLevel.HEADING_2,
          spacing: { before: 200, after: 100 },
        }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Milestone", bold: true })] })] }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Fieldwork Start Date" })] }),
                new TableCell({ children: [new Paragraph({ text: formatDate(audit.fieldworkStartDate) })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Fieldwork End Date" })] }),
                new TableCell({ children: [new Paragraph({ text: formatDate(audit.fieldworkEndDate) })] }),
              ],
            }),
            new TableRow({
              children: [
                new TableCell({ children: [new Paragraph({ text: "Report Issued Date" })] }),
                new TableCell({ children: [new Paragraph({ text: formatDate(audit.reportIssuedDate) })] }),
              ],
            }),
          ],
        }),
        new Paragraph({ text: "", spacing: { after: 400 } })
      );

      // Phases and Procedures
      const phases = ['Planning', 'Fieldwork', 'Reporting'];
      const phaseMap: Record<string, number> = { 'Planning': 1, 'Fieldwork': 2, 'Reporting': 3 };

      for (const phase of phases) {
        const phaseGroups = audit.procedureGroups.filter(g => g.phase === phase);
        const phaseUngrouped = audit.procedures.filter(p => p.phase === phase && !p.groupId);

        if (phaseGroups.length === 0 && phaseUngrouped.length === 0) continue;

        const phaseNum = phaseMap[phase];

        sections.push(
          new Paragraph({
            text: `Phase: ${phase}`,
            heading: HeadingLevel.HEADING_2,
            spacing: { before: 400, after: 200 },
          })
        );

        // Render Groups
        for (const [groupIndex, group] of phaseGroups.entries()) {
          const groupNomenclature = `${phaseNum}.${groupIndex + 1}`;
          
          sections.push(
            new Paragraph({
              text: `${groupNomenclature} Group: ${group.title}`,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 150 },
            })
          );

          for (const [procIndex, p] of group.procedures.entries()) {
            const procLetter = String.fromCharCode(97 + procIndex);
            const procNomenclature = `${groupNomenclature}.${procLetter}`;

            sections.push(
              new Paragraph({
                text: `Procedure ${procNomenclature}: ${p.title || 'Untitled'}`,
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 200, after: 100 },
              })
            );

            // Procedure details
            addProcedureDetails(sections, p);
          }
        }

        // Render Ungrouped Procedures
        if (phaseUngrouped.length > 0) {
          sections.push(
            new Paragraph({
              text: `${phaseNum}.? Ungrouped Items`,
              heading: HeadingLevel.HEADING_3,
              spacing: { before: 300, after: 150 },
            })
          );

          for (const [index, p] of phaseUngrouped.entries()) {
            const procNomenclature = `${phaseNum}.?.${index + 1}`;
            sections.push(
              new Paragraph({
                text: `Procedure ${procNomenclature}: ${p.title || 'Untitled'}`,
                heading: HeadingLevel.HEADING_4,
                spacing: { before: 200, after: 100 },
              })
            );

            // Procedure details
            addProcedureDetails(sections, p);
          }
        }
      }

      const doc = new Document({
        sections: [{
          properties: {},
          children: sections,
        }],
      });

      const blob = await Packer.toBlob(doc);
      saveAs(blob, `Audit_Program_${audit.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.docx`);
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export the audit documentation.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <button
      onClick={handleExport}
      disabled={isExporting}
      className="flex items-center space-x-2 px-4 py-2 bg-blue-900 text-white rounded-md hover:bg-blue-800 transition-colors disabled:opacity-50 shadow-sm"
    >
      {isExporting ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <FileText className="w-4 h-4" />
      )}
      <span>{isExporting ? 'Generating...' : 'Export Word (.docx)'}</span>
    </button>
  );
}
