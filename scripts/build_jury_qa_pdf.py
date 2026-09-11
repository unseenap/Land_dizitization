from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "SIH26018_Jury_Questions_and_Answers.pdf"

NAVY = colors.HexColor("#17345F")
BLUE = colors.HexColor("#2E5FA7")
ORANGE = colors.HexColor("#EF6C2C")
INK = colors.HexColor("#172235")
MUTED = colors.HexColor("#526174")
PALE_BLUE = colors.HexColor("#EEF4FB")
PALE_ORANGE = colors.HexColor("#FFF4EC")
LINE = colors.HexColor("#D8E0EA")
WHITE = colors.white


styles = getSampleStyleSheet()
styles.add(ParagraphStyle(
    name="CoverKicker", parent=styles["Normal"], fontName="Helvetica-Bold",
    fontSize=10, leading=13, textColor=ORANGE, alignment=TA_CENTER, spaceAfter=7,
))
styles.add(ParagraphStyle(
    name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold",
    fontSize=25, leading=30, textColor=NAVY, alignment=TA_CENTER, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="CoverSub", parent=styles["Normal"], fontName="Helvetica",
    fontSize=11, leading=16, textColor=MUTED, alignment=TA_CENTER, spaceAfter=8,
))
styles.add(ParagraphStyle(
    name="Section", parent=styles["Heading1"], fontName="Helvetica-Bold",
    fontSize=16, leading=20, textColor=NAVY, spaceBefore=4, spaceAfter=10,
))
styles.add(ParagraphStyle(
    name="Question", parent=styles["Heading2"], fontName="Helvetica-Bold",
    fontSize=11.2, leading=14.2, textColor=NAVY, spaceAfter=5,
))
styles.add(ParagraphStyle(
    name="Answer", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=9.4, leading=13.2, textColor=INK, spaceAfter=4,
))
styles.add(ParagraphStyle(
    name="Small", parent=styles["BodyText"], fontName="Helvetica",
    fontSize=8.5, leading=11.5, textColor=MUTED,
))
styles.add(ParagraphStyle(
    name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold",
    fontSize=10, leading=14, textColor=NAVY,
))
styles.add(ParagraphStyle(
    name="Footer", parent=styles["Normal"], fontName="Helvetica",
    fontSize=7.5, textColor=MUTED,
))


def header_footer(canvas, doc):
    canvas.saveState()
    width, height = A4
    if doc.page > 1:
        canvas.setStrokeColor(LINE)
        canvas.setLineWidth(0.5)
        canvas.line(18 * mm, height - 15 * mm, width - 18 * mm, height - 15 * mm)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.setFillColor(NAVY)
        canvas.drawString(18 * mm, height - 11.5 * mm, "TEAM SANGANAK  |  SIH26018")
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(MUTED)
        canvas.drawRightString(width - 18 * mm, height - 11.5 * mm, "Jury Questions & Answers")
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 13 * mm, width - 18 * mm, 13 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 8.8 * mm, "Intelligent Land Record Digitization and Validation System")
    canvas.drawRightString(width - 18 * mm, 8.8 * mm, f"Page {doc.page}")
    canvas.restoreState()


def qa(number, question, answer):
    block = Table(
        [[Paragraph(f"<b>Q{number}</b>", styles["Small"]),
          [Paragraph(question, styles["Question"]), Paragraph(answer, styles["Answer"])]]],
        colWidths=[13 * mm, 151 * mm],
        hAlign="LEFT",
    )
    block.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (0, 0), PALE_BLUE),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (0, 0), 6),
        ("RIGHTPADDING", (0, 0), (0, 0), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 7),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ("LEFTPADDING", (1, 0), (1, 0), 9),
        ("RIGHTPADDING", (1, 0), (1, 0), 9),
    ]))
    return block


sections = [
    ("A. Problem Understanding & Relevance  |  15 marks", [
        (1, "What problem are you solving?",
         "Historical land records are stored as scanned registers, PDFs, images, handwritten entries and inconsistent regional formats. Manual transcription is slow and error-prone, while raw OCR alone cannot establish that an owner name, khasra number or area is legally correct. Our system converts these documents into structured, searchable records while preserving the source and requiring accountable human approval."),
        (2, "Who are the beneficiaries?",
         "The direct users are land-record departments, document operators, verification officers, GIS/data officers, supervisors and administrators. Citizens benefit through faster retrieval, improved traceability, fewer transcription errors and more accountable land-record services."),
        (3, "How is the solution aligned with Problem Statement 26018?",
         "It addresses the full document-to-record lifecycle: secure upload, printed/handwritten/multilingual recognition, configurable field extraction, confidence, business validation, duplicate detection, officer verification, immutable approved records, search, dashboards, GIS links, government integration adapters, audit history and reviewed feedback for model improvement."),
        (4, "Why is this problem difficult?",
         "Old records may be faded, damaged, skewed, handwritten, multilingual and structurally inconsistent. Land data is also sensitive: one incorrect digit can change a parcel identity or area. The challenge is therefore not only reading text, but preserving evidence, managing uncertainty and creating a trustworthy approval trail."),
    ]),
    ("B. Innovation & Originality  |  15 marks", [
        (5, "Is this only an OCR application?",
         "No. OCR produces candidate text; it does not produce an authoritative land record. Our innovation is the evidence-to-approval workflow. Extracted fields remain connected to the source page, evidence, confidence, validation findings, corrections, model version and final officer decision."),
        (6, "What makes your solution different from existing approaches?",
         "We combine configurable document schemas, evidence-linked extraction, human-only approval, immutable record versions, scoped access, durable processing and audited corrections in one workflow. We also keep the OCR engine replaceable through a versioned API instead of locking the application to one model or vendor."),
        (7, "How can the system adapt to different states and record types?",
         "Administrators can create document types and publish versioned field schemas. Fields have stable keys, types, required flags and critical flags. Existing uploads retain their pinned schema version, so a new state-specific format can be added without rewriting historical records."),
        (8, "How does the system improve over time?",
         "Approved officer decisions generate prediction-versus-truth examples. Authorized users can assemble reviewed, versioned datasets and evaluate a chosen model version. These datasets support model comparison and later retraining, but training and deployment remain controlled actions rather than automatic changes from every correction."),
    ]),
    ("C. Technical Approach  |  20 marks", [
        (9, "Explain the end-to-end workflow.",
         "An authorized operator uploads a document. The application validates and privately preserves it, pins the administrative location and schema version, and creates a durable job. The OCR service preprocesses the source and returns text, structured candidate fields, confidence and evidence. The application validates the response, applies rules and duplicate checks, and creates a verification task. An officer accepts or corrects every field and approves the exact revision. Approval produces an immutable searchable record version."),
        (10, "What is your technology stack?",
         "Next.js App Router provides the frontend and application backend; TypeScript and React implement the UI and business modules; PostgreSQL stores relational data, jobs, versions and audit history; Drizzle and reviewed SQL manage database changes; Zod and JSON Schema validate contracts; private storage preserves source files; and OCR runs as a separately deployable model service."),
        (11, "Why did you separate the OCR model from the application?",
         "Model inference has different compute, framework and scaling requirements. Our OCR implementation is complete and runs locally on a teammate's laptop. We could not publicly host it within our available infrastructure, so the application communicates through a versioned model API boundary. This is a deployment constraint, not missing model functionality, and it allows either component to evolve independently."),
        (12, "If the OCR model is not hosted, how will you demonstrate it?",
         "We will run the model locally on the teammate's laptop and show its output on representative synthetic or authorized sample documents. We will then demonstrate how the application accepts the structured result through the same validated contract. We will clearly distinguish a local model demonstration from a public production deployment."),
        (13, "How do you support handwritten and multilingual records?",
         "The OCR side supports preprocessing and recognition for the targeted scripts and handwriting cases, while the application preserves Unicode, language information, page blocks, confidence and evidence. Capability is declared explicitly, and unsupported cases are shown honestly rather than converted into fabricated results."),
        (14, "What happens if OCR extracts a wrong value?",
         "The prediction remains a candidate. The verifier sees the original source and evidence, corrects the value and records a reason. The original prediction, corrected value, evidence, officer identity, timestamp and final decision remain preserved. The model never directly writes or approves an official record."),
        (15, "What is the difference between confidence and accuracy?",
         "Confidence is the model's score for one prediction. Accuracy is measured by comparing predictions with verified ground truth over a named dataset and denominator. We report them separately. Confidence helps prioritize review; it is never presented as proof that a field is correct."),
        (16, "How do you validate AI output?",
         "Before ingestion, we verify contract and schema versions, request/document/job IDs, revision, input hash, allowed field keys, value types, confidence ranges, evidence pages and bounding boxes, model metadata and size limits. Malformed or stale output is quarantined and cannot become a land record."),
        (17, "How are business validation and duplicate detection performed?",
         "The application checks required and critical fields, types, dates, positive area, units, administrative hierarchy and configured rules. Duplicate candidates use signals such as source hash, survey/khasra identifiers, owner, area, location and registration data. A possible match is reviewed by an officer; the system does not automatically delete or merge records."),
        (18, "How is security implemented?",
         "Authorization is enforced in server-side services with role, department and jurisdiction scope. The system uses protected sessions, HttpOnly cookies, CSRF checks, bounded inputs, private file endpoints and append-only audit events. Operators and approvers have separated permissions, and administrator status alone does not grant business approval."),
        (19, "What happens if the browser closes or the model service fails?",
         "The job is stored durably in PostgreSQL and does not depend on a browser request staying alive. Workers persist attempts, remote references, retry state and input hashes. Idempotency prevents duplicate logical processing, and late results for an older document revision cannot overwrite a newer revision."),
    ]),
    ("D. Feasibility & Implementability  |  15 marks", [
        (20, "Is the complete solution implemented?",
         "Yes, the complete solution has been developed across the team's machines. The web application and workflow are implemented, and the OCR model runs locally on a teammate's laptop. The only limitation is that we do not have suitable public hosting for the compute-heavy OCR service, so we demonstrate that component locally rather than claiming a hosted production endpoint."),
        (21, "How is the solution financially feasible?",
         "The application uses a widely available web stack and PostgreSQL. The variable costs are model inference, storage and verification time. Because the OCR service is replaceable, a department can choose on-premises hardware, an approved cloud environment or another compatible provider based on policy and budget."),
        (22, "How can this be deployed in a government environment?",
         "The Next.js application, PostgreSQL database, private object storage, durable workers and OCR service can be deployed as separate controlled services. Production rollout would add department-approved infrastructure, encrypted shared storage, backup and restore procedures, monitoring, malware scanning and security assessment."),
        (23, "How will you integrate with LRMS or DILRMP?",
         "The system has versioned LRMS, DILRMP and government-database adapters. An export pins one exact approved record version and preserves its payload hash, attempts, acknowledgement and audit history. During the prototype we use labelled adapters; a live connection requires official schemas, credentials, sandbox access and data-sharing authorization from the concerned department."),
        (24, "How scalable is the architecture?",
         "The web application, processing workers, OCR service, PostgreSQL and storage have separate responsibilities. Web instances and workers can scale horizontally, while inference capacity can scale independently. For large deployments, local file storage can be replaced by shared object storage without changing the verification and record workflow."),
    ]),
    ("E. Prototype & Demonstration  |  15 marks", [
        (25, "What can you demonstrate today?",
         "We can demonstrate scoped login, configurable document types, secure upload and preview, metadata history, durable processing, structured extraction ingestion, validation findings, duplicate review, field decisions and corrections, human approval, immutable records, scoped search, dashboards, GIS-link review, government-export workflow and feedback evaluation. OCR inference is demonstrated locally on the teammate's laptop."),
        (26, "How have you tested the prototype?",
         "The latest application acceptance gate passed TypeScript checks, lint, a production build, 25 PostgreSQL integration tests, a client-side secret scan and six Chrome end-to-end scenarios. These checks validate application behavior. OCR quality is evaluated separately using labelled ground truth rather than being inferred from software tests."),
        (27, "What should we watch during the demo?",
         "Watch how the original source remains connected to every stage: upload, extracted evidence, validation, correction, approval and final record. Also observe that unresolved blockers prevent approval, permissions restrict users by role and scope, and every important action creates a traceable history."),
    ]),
    ("F. Impact & Scalability  |  10 marks", [
        (28, "What impact do you expect?",
         "The expected impact is reduced repetitive transcription, faster retrieval, better visibility of uncertain fields, fewer untraceable corrections and a more accountable digitization process. Citizens benefit indirectly from clearer records and more efficient services, while departments gain searchable data and measurable workflows."),
        (29, "How will you measure impact?",
         "We will measure time per verified document, correction workload, field accuracy on an approved labelled dataset, processing failures, review backlog, duplicate confirmation, retrieval time, cost per verified record and progress by district/state. Intended benefits will not be presented as measured outcomes until a real pilot is conducted."),
        (30, "Can this solution scale across India?",
         "Yes, because record types, schemas, administrative hierarchy, languages, model providers and integration mappings are configurable. Scaling would be phased state by state, with representative datasets, local rules, authorized interfaces and human review policies validated for each jurisdiction."),
    ]),
    ("G. Presentation & Response  |  10 marks", [
        (31, "Why should the jury select your solution?",
         "Because we solve the complete trust problem, not only text recognition. We preserve the source, assist transcription with AI, validate the result, keep officers in control and create an immutable audit trail. The prototype demonstrates an implementable government workflow, while its modular architecture supports different record types, models and jurisdictions."),
        (32, "What is your final one-line message?",
         "Our system does not replace the land-record officer; it gives the officer faster extraction, visible evidence and a secure, traceable way to create verified digital records."),
    ]),
]


def build():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    frame = Frame(18 * mm, 17 * mm, A4[0] - 36 * mm, A4[1] - 34 * mm, id="normal")
    doc = BaseDocTemplate(
        str(OUTPUT), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
        topMargin=18 * mm, bottomMargin=17 * mm,
        title="SIH26018 Jury Questions and Answers",
        author="Team Sanganak",
        subject="Evaluator preparation aligned with the GBU SIH 2026 jury rubric",
    )
    doc.addPageTemplates([PageTemplate(id="all", frames=[frame], onPage=header_footer)])

    story = [Spacer(1, 25 * mm)]
    story.append(Paragraph("SMART INDIA HACKATHON 2026  |  TEAM SANGANAK", styles["CoverKicker"]))
    story.append(Paragraph("Jury Questions<br/>&amp; Model Answers", styles["CoverTitle"]))
    story.append(Paragraph("Problem Statement 26018", styles["CoverSub"]))
    story.append(Paragraph("Intelligent Land Record Digitization and Validation System", styles["CoverSub"]))
    story.append(Spacer(1, 8 * mm))

    intro = Table([[Paragraph(
        "<b>Core pitch:</b> Preserve the source. Assist transcription. Validate uncertainty. "
        "Let authorized officers approve every final record.", styles["Callout"]
    )]], colWidths=[164 * mm])
    intro.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_ORANGE),
        ("BOX", (0, 0), (-1, -1), 1, ORANGE),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
        ("TOPPADDING", (0, 0), (-1, -1), 11),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 11),
    ]))
    story.append(intro)
    story.append(Spacer(1, 10 * mm))
    story.append(Paragraph("30-second opening answer", styles["Section"]))
    story.append(Paragraph(
        "Our solution converts scanned, handwritten and multilingual historical land documents into "
        "structured, searchable and auditable digital records. Unlike plain OCR, it preserves the original "
        "evidence, validates extracted fields, detects possible duplicates and requires an authorized officer "
        "to verify the exact record. The application uses Next.js and PostgreSQL, while our completed OCR model "
        "runs locally on a teammate's laptop because suitable public hosting is not available to us. The model is "
        "kept behind a versioned API boundary so it can later be deployed without redesigning the application.",
        styles["Answer"]
    ))
    story.append(Spacer(1, 5 * mm))
    rubric_data = [
        [Paragraph("Evaluation criterion", styles["Small"]), Paragraph("Marks", styles["Small"])],
        ["Technical approach", "20"],
        ["Problem understanding & relevance", "15"],
        ["Innovation & originality", "15"],
        ["Feasibility & implementability", "15"],
        ["Prototype & demonstration", "15"],
        ["Impact & scalability", "10"],
        ["Presentation & response", "10"],
    ]
    rubric = Table(rubric_data, colWidths=[135 * mm, 29 * mm], hAlign="LEFT")
    rubric.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 1), (-1, -1), "Helvetica"),
        ("FONTSIZE", (0, 1), (-1, -1), 8.5),
        ("TEXTCOLOR", (0, 1), (-1, -1), INK),
        ("GRID", (0, 0), (-1, -1), 0.5, LINE),
        ("BACKGROUND", (0, 1), (-1, -1), colors.white),
        ("ALIGN", (1, 0), (1, -1), "CENTER"),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(rubric)
    story.append(PageBreak())

    for index, (heading, items) in enumerate(sections):
        section_heading = Paragraph(heading, styles["Section"])
        if len(items) <= 2:
            compact_section = [section_heading]
            for number, question, answer in items:
                compact_section.extend([qa(number, question, answer), Spacer(1, 4 * mm)])
            story.append(KeepTogether(compact_section))
        else:
            first_number, first_question, first_answer = items[0]
            story.append(KeepTogether([
                section_heading,
                qa(first_number, first_question, first_answer),
                Spacer(1, 4 * mm),
            ]))
            for number, question, answer in items[1:]:
                story.extend([qa(number, question, answer), Spacer(1, 4 * mm)])
        if index != len(sections) - 1:
            story.append(Spacer(1, 1 * mm))

    story.append(Spacer(1, 3 * mm))
    story.append(Paragraph("Demo narration", styles["Section"]))
    steps = [
        "The operator uploads a document, and the original is preserved privately.",
        "The document is pinned to a jurisdiction and versioned field schema.",
        "The locally running OCR model returns structured candidates with evidence and confidence.",
        "The application validates the result and identifies rule violations or duplicates.",
        "The verifier compares every field with its source and records corrections.",
        "Approval creates an immutable, searchable record version.",
        "Dashboards, GIS links, exports and feedback operate on controlled approved data.",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"<b>{i}.</b> {step}", styles["Answer"]))
        story.append(Spacer(1, 1.5 * mm))

    story.append(Spacer(1, 5 * mm))
    story.append(Paragraph("Important wording for the OCR hosting question", styles["Section"]))
    caution = Table([[Paragraph(
        "Say: <b>\"The OCR model is complete and runs locally on our teammate's laptop. Public hosting is "
        "unavailable because of infrastructure and compute constraints, so we demonstrate it locally through "
        "the same versioned contract.\"</b><br/><br/>Do not say that OCR is unfinished, and do not claim that a "
        "local demonstration is already a production government deployment.", styles["Answer"]
    )]], colWidths=[164 * mm])
    caution.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE_ORANGE),
        ("BOX", (0, 0), (-1, -1), 0.8, ORANGE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
    ]))
    story.append(caution)
    story.append(Spacer(1, 6 * mm))
    story.append(Paragraph(
        "Prepared from the GBU Internal Smart India Hackathon 2026 common evaluation rubric and the current "
        "SIH26018 project documentation. Answers are written for spoken delivery and should be adjusted only "
        "when the team has direct demonstration evidence.", styles["Small"]
    ))

    doc.build(story)
    print(OUTPUT)


if __name__ == "__main__":
    build()
