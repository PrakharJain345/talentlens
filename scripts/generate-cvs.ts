import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";

export interface CVData {
  id: string;
  filenameBase: string;
  name: string;
  role: string;
  expYears: number;
  noticeDays: number;
  location: string;
  email: string;
  phone: string;
  ctcLpa?: number;
  summary: string;
  skills: string[];
  experienceHighlights: string[];
  piiDetails?: string[];
  isDuplicate?: boolean;
}

const SAMPLE_PROFILES: CVData[] = [
  // 1. Brief Candidate: Ritika Bansal (Top Fit)
  {
    id: "CND-91022",
    filenameBase: "01_Ritika_Bansal_Senior_Java",
    name: "Ritika Bansal",
    role: "Senior Java Developer",
    expYears: 6.5,
    noticeDays: 60,
    location: "Noida, Sector 62",
    email: "ritika.bansal@example.com",
    phone: "+91 9876543210",
    ctcLpa: 18.5,
    summary:
      "Senior Java Developer with 6.5 years of experience in enterprise backend architecture, Spring Boot microservices, and distributed data pipelines in Noida.",
    skills: [
      "Java 17",
      "Spring Boot",
      "Microservices",
      "REST APIs",
      "Docker",
      "PostgreSQL",
      "Kafka",
      "Redis",
      "Kubernetes",
      "JUnit",
      "Git",
    ],
    experienceHighlights: [
      "Led the transition of monolithic banking core systems to Spring Boot microservices in Noida, increasing system throughput by 42%.",
      "Designed resilient REST APIs handling 8M+ daily requests with 99.98% uptime using Java 17 and Docker.",
      "Implemented distributed caching with Redis and event streaming using Apache Kafka for real-time transactions.",
      "Total software engineering experience: 6.5 years across BFSI and IT services sectors. Available notice period: 60 days.",
    ],
  },

  // 2. Brief Candidate: Arjun Rawat (KYC Analyst - Low/Mismatched Fit for Java JD)
  {
    id: "CND-91047",
    filenameBase: "02_Arjun_Rawat_KYC_Analyst",
    name: "Arjun Rawat",
    role: "KYC Analyst",
    expYears: 3.0,
    noticeDays: 30,
    location: "Gurugram, Haryana",
    email: "arjun.rawat@example.com",
    phone: "+91 9812345678",
    ctcLpa: 6.5,
    summary:
      "KYC & AML Compliance Analyst with 3 years of banking experience conducting customer due diligence, sanctions screening, and regulatory reporting.",
    skills: [
      "KYC",
      "AML Checks",
      "Customer Due Diligence (CDD)",
      "Excel",
      "Transaction Monitoring",
      "Finacle",
      "Regulatory Compliance",
    ],
    experienceHighlights: [
      "Conducted end-to-end KYC reviews and AML sanctions screening for over 1,500 commercial banking accounts.",
      "Identified suspicious transactions and submitted SAR reports adhering strictly to RBI compliance directives.",
      "Maintained accurate compliance audit trail in Excel and Finacle with 99.4% quality score.",
      "Total career experience: 3.0 years in banking back-office operations. Notice period: 30 days.",
    ],
  },

  // 3. Brief Candidate: Pooja Nair (Java Developer - Partial Fit: 4 yrs exp, 90d notice)
  {
    id: "CND-91088",
    filenameBase: "03_Pooja_Nair_Java_Developer",
    name: "Pooja Nair",
    role: "Java Developer",
    expYears: 4.0,
    noticeDays: 90,
    location: "Bengaluru, Karnataka (Open to relocation)",
    email: "pooja.nair@example.com",
    phone: "+91 9898989898",
    ctcLpa: 11.0,
    summary:
      "Java Developer with 4 years of experience building scalable backend web applications using Java, Hibernate ORM, and RESTful web services.",
    skills: [
      "Java",
      "Hibernate",
      "Spring MVC",
      "REST APIs",
      "MySQL",
      "Maven",
      "Git",
      "Postman",
    ],
    experienceHighlights: [
      "Developed modular REST APIs using Java and Hibernate for high-volume retail order management platforms.",
      "Optimized MySQL database queries and JPA mapping, slashing latency for search endpoints by 25%.",
      "Built automated integration test suites using JUnit and Mockito within CI/CD pipelines.",
      "Total experience: 4.0 years in enterprise software delivery. Notice period is 90 days.",
    ],
  },

  // 4. Duplicate of Ritika Bansal (Same Email & Phone, Alternate Layout & Consultant Title)
  {
    id: "CND-DUP-01",
    filenameBase: "04_Ritika_Bansal_Duplicate",
    name: "Ritika Bansal",
    role: "Lead Backend Consultant (Java / Spring)",
    expYears: 6.5,
    noticeDays: 60,
    location: "Noida, India",
    email: "ritika.bansal@example.com", // EXACT DUPLICATE EMAIL
    phone: "+91 9876543210", // EXACT DUPLICATE PHONE
    ctcLpa: 18.5,
    summary:
      "Consulting Java Architect specializing in scalable microservice architectures, enterprise cloud deployments, and mission-critical financial backend systems.",
    skills: [
      "Java",
      "Spring Boot",
      "Microservices Architecture",
      "Kafka",
      "Docker",
      "PostgreSQL",
      "Redis",
      "REST Services",
    ],
    experienceHighlights: [
      "Client engagement lead delivering Spring Boot microservice overhauls for Tier-1 corporate banking entities.",
      "Architected message-driven microservices processing millions of daily transactions with Kafka and Redis.",
      "Spearheaded technical interviews and mentorship programs for junior backend teams across Noida.",
      "Experience: 6.5 years. Standard notice: 60 calendar days.",
    ],
    isDuplicate: true,
  },

  // 5. PII Redaction Test Candidate: Kavita Sharma (Contains "Marital Status: Married" and "DOB: 12/04/1999")
  {
    id: "CND-PII-01",
    filenameBase: "07_Kavita_Sharma_PII_Redaction_Test",
    name: "Kavita Sharma",
    role: "Senior Java Backend Engineer",
    expYears: 5.5,
    noticeDays: 45,
    location: "Noida, UP",
    email: "kavita.sharma@example.com",
    phone: "+91 9711223344",
    ctcLpa: 16.0,
    piiDetails: [
      "DOB: 12/04/1999",
      "Marital Status: Married",
      "Gender: Female",
      "Father's Name: Ramesh Sharma",
      "Nationality: Indian",
    ],
    summary:
      "Senior Java Backend Engineer with 5.5 years of experience architecting Spring Boot microservices, REST APIs, and PostgreSQL database solutions in Noida.",
    skills: [
      "Java 17",
      "Spring Boot",
      "Microservices",
      "RESTful APIs",
      "PostgreSQL",
      "Docker",
      "AWS",
      "Git",
    ],
    experienceHighlights: [
      "Engineered core payment microservices with Spring Boot and PostgreSQL, serving 30,000 active concurrent users in Noida.",
      "Integrated AWS cloud infrastructure with Dockerized containers to ensure elastic scaling.",
      "Wrote comprehensive unit and component tests ensuring 92% test coverage.",
      "Total professional experience: 5.5 years. Serving notice: 45 days.",
    ],
  },

  // 6. Vikram Sethi (High Fit: 7.5 yrs, Java/Spring Boot, Noida, 30 days notice)
  {
    id: "CND-91051",
    filenameBase: "08_Vikram_Sethi_Senior_Java",
    name: "Vikram Sethi",
    role: "Senior Java Specialist",
    expYears: 7.5,
    noticeDays: 30,
    location: "Noida, Sector 128",
    email: "vikram.sethi@example.com",
    phone: "+91 9822334455",
    ctcLpa: 21.0,
    summary:
      "Senior Java Specialist with 7.5 years of expertise in Spring Boot, cloud-native microservices, Kafka streaming, and secure API gateways in Noida.",
    skills: [
      "Java",
      "Spring Boot",
      "Microservices",
      "Kafka",
      "Docker",
      "Kubernetes",
      "AWS",
      "PostgreSQL",
      "Redis",
    ],
    experienceHighlights: [
      "Built resilient distributed microservices using Spring Boot and Docker deployed to Kubernetes clusters.",
      "Orchestrated asynchronous Kafka event bus processing 15,000 events/sec across Noida engineering teams.",
      "Reduced service API response time from 350ms to 45ms using Redis caching strategies.",
      "Total experience: 7.5 years. Immediate readiness with 30 days notice period.",
    ],
  },

  // 7. Ananya Deshmukh (Full Stack Java/React, 5.0 yrs, 60 days notice, Noida)
  {
    id: "CND-91052",
    filenameBase: "09_Ananya_Deshmukh_FullStack_Java",
    name: "Ananya Deshmukh",
    role: "Full Stack Java Developer",
    expYears: 5.0,
    noticeDays: 60,
    location: "Noida, Sector 16",
    email: "ananya.d@example.com",
    phone: "+91 9833445566",
    ctcLpa: 14.5,
    summary:
      "Full Stack Developer with 5 years of experience delivering end-to-end applications with Java Spring Boot backends and React frontends in Noida.",
    skills: [
      "Java",
      "Spring Boot",
      "Microservices",
      "React",
      "TypeScript",
      "REST APIs",
      "PostgreSQL",
      "Docker",
    ],
    experienceHighlights: [
      "Developed high-performance Spring Boot REST services integrated with React and TypeScript dashboards in Noida.",
      "Structured relational PostgreSQL schemas with Flyway database migrations.",
      "Contributed to CI/CD pipeline deployments using Docker and GitHub Actions.",
      "Total experience: 5.0 years. Notice period: 60 days.",
    ],
  },

  // 8. Rohan Verma (Senior Backend Engineer, 7.0 yrs, Spring Cloud, Kafka, Delhi NCR)
  {
    id: "CND-91053",
    filenameBase: "10_Rohan_Verma_Senior_Backend",
    name: "Rohan Verma",
    role: "Senior Backend Engineer",
    expYears: 7.0,
    noticeDays: 45,
    location: "Delhi NCR (Noida Commute)",
    email: "rohan.verma@example.com",
    phone: "+91 9844556677",
    ctcLpa: 19.0,
    summary:
      "Senior Backend Engineer with 7 years of deep Java engineering experience building high-concurrency Spring Cloud microservices in Delhi NCR.",
    skills: [
      "Java 17",
      "Spring Boot",
      "Spring Cloud",
      "Microservices",
      "Kafka",
      "Cassandra",
      "Docker",
      "REST APIs",
    ],
    experienceHighlights: [
      "Architected Spring Cloud microservices backbone handling distributed configuration and service discovery.",
      "Optimized multi-threaded Java applications achieving sub-50ms latencies for mission-critical services.",
      "Total experience: 7.0 years. Notice period: 45 days.",
    ],
  },

  // 9. Sneha Kulkarni (Backend Developer, 3.5 yrs - Junior/Partial Exp Fit)
  {
    id: "CND-91054",
    filenameBase: "11_Sneha_Kulkarni_Backend_Java",
    name: "Sneha Kulkarni",
    role: "Java Backend Engineer",
    expYears: 3.5,
    noticeDays: 30,
    location: "Pune (Relocating to Noida)",
    email: "sneha.k@example.com",
    phone: "+91 9855667788",
    ctcLpa: 9.0,
    summary:
      "Java Backend Engineer with 3.5 years of experience in Spring Boot REST APIs and database optimization.",
    skills: [
      "Java",
      "Spring Boot",
      "Hibernate",
      "PostgreSQL",
      "REST APIs",
      "Git",
    ],
    experienceHighlights: [
      "Implemented Spring Boot RESTful services for internal inventory management.",
      "Wrote complex PostgreSQL queries and maintained Hibernate entity mappings.",
      "Total experience: 3.5 years. Notice period: 30 days.",
    ],
  },

  // 10. Amit Patel (Microservices Engineer, 6.0 yrs, Spring Boot, Docker, Noida)
  {
    id: "CND-91055",
    filenameBase: "12_Amit_Patel_Microservices",
    name: "Amit Patel",
    role: "Java Microservices Engineer",
    expYears: 6.0,
    noticeDays: 60,
    location: "Noida, Sector 63",
    email: "amit.patel@example.com",
    phone: "+91 9866778899",
    ctcLpa: 17.0,
    summary:
      "Microservices Engineer with 6 years of expertise designing Spring Boot microservices and RESTful API ecosystems in Noida.",
    skills: [
      "Java",
      "Spring Boot",
      "Microservices",
      "Docker",
      "CI/CD",
      "PostgreSQL",
      "REST APIs",
    ],
    experienceHighlights: [
      "Engineered decoupled Spring Boot microservices with automated Docker container builds in Noida.",
      "Established centralized logging and Prometheus metrics monitoring across 12 microservices.",
      "Total experience: 6.0 years. Notice period: 60 days.",
    ],
  },

  // 11. Divya Krishnan (Junior Java Programmer, 1.5 yrs - Below Experience Requirement)
  {
    id: "CND-91056",
    filenameBase: "13_Divya_Krishnan_Junior_Java",
    name: "Divya Krishnan",
    role: "Junior Java Programmer",
    expYears: 1.5,
    noticeDays: 15,
    location: "Noida",
    email: "divya.k@example.com",
    phone: "+91 9877889900",
    ctcLpa: 4.5,
    summary:
      "Junior Java Programmer with 1.5 years of experience working on Core Java, JDBC, and bug fixing.",
    skills: ["Core Java", "JDBC", "Servlets", "MySQL", "Git", "HTML/CSS"],
    experienceHighlights: [
      "Assisted in maintaining legacy Java web modules and fixing customer defect tickets.",
      "Developed basic database connectivity scripts using JDBC and MySQL.",
      "Total experience: 1.5 years. Notice period: 15 days.",
    ],
  },

  // 12. Manish Gupta (Senior Java Consultant, 8.0 yrs, Spring Boot, Hibernate, Noida)
  {
    id: "CND-91057",
    filenameBase: "14_Manish_Gupta_Senior_Consultant",
    name: "Manish Gupta",
    role: "Senior Java Consultant",
    expYears: 8.0,
    noticeDays: 60,
    location: "Greater Noida, UP",
    email: "manish.gupta@example.com",
    phone: "+91 9888990011",
    ctcLpa: 22.0,
    summary:
      "Senior Java Consultant with 8 years of specialized background in Spring Boot enterprise integration and database tuning.",
    skills: [
      "Java",
      "Spring Boot",
      "Hibernate",
      "Oracle",
      "Microservices",
      "Docker",
      "REST APIs",
    ],
    experienceHighlights: [
      "Consulted on multi-datacenter Spring Boot applications processing 10M+ daily records in Greater Noida.",
      "Optimized Hibernate object-relational caching reducing database transaction locks by 30%.",
      "Total experience: 8.0 years. Notice period: 60 days.",
    ],
  },

  // 13. Neha Singhal (Python / Django Developer - Wrong Tech Stack)
  {
    id: "CND-91058",
    filenameBase: "15_Neha_Singhal_Python_Dev",
    name: "Neha Singhal",
    role: "Senior Python Developer",
    expYears: 5.5,
    noticeDays: 30,
    location: "Gurgaon, Haryana",
    email: "neha.singhal@example.com",
    phone: "+91 9899001122",
    ctcLpa: 15.0,
    summary:
      "Senior Python Developer with 5.5 years of experience crafting asynchronous APIs with FastAPI, Django, and Celery.",
    skills: [
      "Python",
      "FastAPI",
      "Django",
      "PostgreSQL",
      "Celery",
      "Redis",
      "Docker",
    ],
    experienceHighlights: [
      "Engineered asynchronous microservices using FastAPI and PostgreSQL handling automated notifications.",
      "Configured distributed task workers using Celery and Redis in Docker containers.",
      "Total experience: 5.5 years. Notice period: 30 days.",
    ],
  },

  // 14. Rajesh Kumar (Senior KYC & Compliance Officer - Banking/KYC Fit)
  {
    id: "CND-91059",
    filenameBase: "16_Rajesh_Kumar_Senior_KYC",
    name: "Rajesh Kumar",
    role: "Senior KYC & AML Compliance Manager",
    expYears: 6.0,
    noticeDays: 30,
    location: "New Delhi",
    email: "rajesh.kumar@example.com",
    phone: "+91 9811122334",
    ctcLpa: 12.0,
    summary:
      "Senior KYC and AML Compliance Manager with 6 years leading regulatory audits and suspicious activity investigations in retail banking.",
    skills: [
      "KYC",
      "AML Regulations",
      "Sanctions Screening",
      "Regulatory Reporting",
      "Team Leadership",
      "Finacle",
    ],
    experienceHighlights: [
      "Managed team of 10 compliance analysts reviewing institutional KYC documentation and AML compliance.",
      "Liaised with internal and external audit teams ensuring zero regulatory audit penalties.",
      "Total experience: 6.0 years. Notice period: 30 days.",
    ],
  },

  // 15. Tanvi Mehta (Java Developer - Long Notice: 90 Days)
  {
    id: "CND-91060",
    filenameBase: "17_Tanvi_Mehta_Java_Long_Notice",
    name: "Tanvi Mehta",
    role: "Senior Java Developer",
    expYears: 5.5,
    noticeDays: 90,
    location: "Mumbai (Relocating to Noida)",
    email: "tanvi.mehta@example.com",
    phone: "+91 9822233445",
    ctcLpa: 16.5,
    summary:
      "Senior Java Developer with 5.5 years of hands-on experience developing Spring Boot RESTful services and microservices.",
    skills: [
      "Java 11/17",
      "Spring Boot",
      "REST APIs",
      "Microservices",
      "PostgreSQL",
      "JUnit",
      "Git",
    ],
    experienceHighlights: [
      "Developed secured REST APIs with Spring Boot and Spring Security for insurance claims processing.",
      "Implemented comprehensive automated JUnit testing suites.",
      "Total experience: 5.5 years. Standard firm notice period: 90 days.",
    ],
  },

  // 16. Deepak Joshi (Java & Cloud Engineer, 6.2 yrs, Spring Boot, Noida)
  {
    id: "CND-91061",
    filenameBase: "18_Deepak_Joshi_Java_Cloud",
    name: "Deepak Joshi",
    role: "Senior Java & Cloud Engineer",
    expYears: 6.2,
    noticeDays: 60,
    location: "Noida, Sector 135",
    email: "deepak.joshi@example.com",
    phone: "+91 9833344556",
    ctcLpa: 17.5,
    summary:
      "Senior Java and Cloud Engineer with 6.2 years of experience specializing in Java 17, Spring Boot, and Azure cloud services in Noida.",
    skills: [
      "Java 17",
      "Spring Boot",
      "Microservices",
      "Azure",
      "Redis",
      "PostgreSQL",
      "Docker",
      "REST APIs",
    ],
    experienceHighlights: [
      "Constructed cloud-native Spring Boot microservices deployed on Azure Container Apps in Noida.",
      "Reduced database read pressures by 50% through targeted Redis caching implementations.",
      "Total experience: 6.2 years. Notice period: 60 days.",
    ],
  },

  // 17. Priya Sundaram (Senior Software Engineer, 5.8 yrs, Spring Boot, Noida)
  {
    id: "CND-91062",
    filenameBase: "19_Priya_Sundaram_Software_Engineer",
    name: "Priya Sundaram",
    role: "Senior Software Engineer (Java)",
    expYears: 5.8,
    noticeDays: 45,
    location: "Noida, Sector 142",
    email: "priya.sundaram@example.com",
    phone: "+91 9844455667",
    ctcLpa: 16.0,
    summary:
      "Senior Software Engineer with 5.8 years of expertise in Java, Spring Boot, RabbitMQ message brokers, and MongoDB.",
    skills: [
      "Java",
      "Spring Boot",
      "Microservices",
      "RabbitMQ",
      "MongoDB",
      "Docker",
      "REST APIs",
    ],
    experienceHighlights: [
      "Developed real-time notification dispatch engine utilizing Spring Boot and RabbitMQ in Noida.",
      "Designed and documented OpenAPI/Swagger compliant REST endpoints for client integrations.",
      "Total experience: 5.8 years. Notice period: 45 days.",
    ],
  },

  // 18. Sandeep Chawla (KYC Operations Specialist, 2.5 yrs)
  {
    id: "CND-91063",
    filenameBase: "20_Sandeep_Chawla_KYC_Ops",
    name: "Sandeep Chawla",
    role: "KYC Operations Specialist",
    expYears: 2.5,
    noticeDays: 15,
    location: "Noida",
    email: "sandeep.c@example.com",
    phone: "+91 9855566778",
    ctcLpa: 5.2,
    summary:
      "KYC Specialist with 2.5 years of experience verifying retail identity records, AML watchlists, and maintaining banking databases in Noida.",
    skills: [
      "KYC Documentation",
      "Identity Verification",
      "Excel",
      "AML Watchlists",
      "Finacle",
    ],
    experienceHighlights: [
      "Processed over 50 client KYC identity verifications daily adhering to compliance standards in Noida.",
      "Flagged identity discrepancies and maintained clean digital customer profile logs.",
      "Total experience: 2.5 years. Notice period: 15 days.",
    ],
  },

  // 19. Varun Aggarwal (Staff Java Engineer - 11.0 yrs, High Experience)
  {
    id: "CND-91064",
    filenameBase: "21_Varun_Aggarwal_Staff_Java",
    name: "Varun Aggarwal",
    role: "Staff Java Architect",
    expYears: 11.0,
    noticeDays: 60,
    location: "Noida, Sector 125",
    email: "varun.aggarwal@example.com",
    phone: "+91 9866677889",
    ctcLpa: 32.0,
    summary:
      "Staff Java Architect with 11 years of architectural leadership in distributed systems, Spring Boot microservices, and fault-tolerant cloud backends in Noida.",
    skills: [
      "Java",
      "Spring Boot",
      "Distributed Architecture",
      "Microservices",
      "Kubernetes",
      "Kafka",
      "PostgreSQL",
    ],
    experienceHighlights: [
      "Direct technical architecture across 4 engineering pods delivering enterprise Spring Boot microservices in Noida.",
      "Authored company-wide architectural standards for microservice observability, fault isolation, and resilience.",
      "Total experience: 11.0 years. Notice period: 60 days.",
    ],
  },
];

async function generatePdf(filePath: string, cv: CVData): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Header: Name & Role
    doc.fontSize(18).font("Helvetica-Bold").fillColor("#0F172A").text(cv.name);
    doc.fontSize(12).font("Helvetica").fillColor("#4F46E5").text(cv.role);
    doc.moveDown(0.3);

    // Contact Information Line
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor("#64748B")
      .text(`${cv.email}   |   ${cv.phone}   |   ${cv.location}`);

    // If PII redaction test CV, output explicit personal fields
    if (cv.piiDetails && cv.piiDetails.length > 0) {
      doc.moveDown(0.2);
      doc
        .fontSize(9)
        .font("Helvetica-Bold")
        .fillColor("#DC2626")
        .text(cv.piiDetails.join("   |   "));
    }

    doc.moveDown(0.6);
    doc
      .moveTo(40, doc.y)
      .lineTo(555, doc.y)
      .strokeColor("#E5E7EB")
      .stroke();
    doc.moveDown(0.6);

    // Professional Summary
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#0F172A")
      .text("PROFESSIONAL SUMMARY");
    doc.moveDown(0.2);
    doc.fontSize(9.5).font("Helvetica").fillColor("#334155").text(cv.summary, {
      align: "justify",
      lineGap: 2,
    });
    doc.moveDown(0.6);

    // Core Metrics
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#0F172A")
      .text("KEY DETAILS");
    doc.moveDown(0.2);
    doc
      .fontSize(9.5)
      .font("Helvetica")
      .fillColor("#334155")
      .text(`• Total Experience: ${cv.expYears} years`);
    doc.text(`• Notice Period: ${cv.noticeDays} days`);
    if (cv.ctcLpa) {
      doc.text(`• Current CTC: INR ${cv.ctcLpa} LPA`);
    }
    doc.text(`• Current Location: ${cv.location}`);
    doc.moveDown(0.6);

    // Skills
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#0F172A")
      .text("CORE TECHNICAL SKILLS");
    doc.moveDown(0.2);
    doc
      .fontSize(9.5)
      .font("Helvetica")
      .fillColor("#334155")
      .text(cv.skills.join("  •  "));
    doc.moveDown(0.6);

    // Experience / Verbatim Evidence Quotes
    doc
      .fontSize(11)
      .font("Helvetica-Bold")
      .fillColor("#0F172A")
      .text("PROFESSIONAL EXPERIENCE & ACHIEVEMENTS");
    doc.moveDown(0.3);

    for (const highlight of cv.experienceHighlights) {
      doc
        .fontSize(9.5)
        .font("Helvetica")
        .fillColor("#334155")
        .text(`• ${highlight}`, { lineGap: 2 });
      doc.moveDown(0.2);
    }

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

async function generateDocx(filePath: string, cv: CVData): Promise<void> {
  const children: Paragraph[] = [
    new Paragraph({
      text: cv.name,
      heading: HeadingLevel.TITLE,
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: cv.role,
          bold: true,
          color: "4F46E5",
          size: 24,
        }),
      ],
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `${cv.email}  |  ${cv.phone}  |  ${cv.location}`,
          color: "64748B",
          size: 18,
        }),
      ],
    }),
  ];

  if (cv.piiDetails && cv.piiDetails.length > 0) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: cv.piiDetails.join("  |  "),
            color: "DC2626",
            bold: true,
            size: 18,
          }),
        ],
      })
    );
  }

  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      text: "PROFESSIONAL SUMMARY",
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph({ text: cv.summary }),
    new Paragraph({ text: "" }),
    new Paragraph({
      text: "KEY DETAILS",
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph({ text: `• Total Experience: ${cv.expYears} years` }),
    new Paragraph({ text: `• Notice Period: ${cv.noticeDays} days` }),
    new Paragraph({ text: `• Current Location: ${cv.location}` })
  );

  if (cv.ctcLpa) {
    children.push(new Paragraph({ text: `• Current CTC: INR ${cv.ctcLpa} LPA` }));
  }

  children.push(
    new Paragraph({ text: "" }),
    new Paragraph({
      text: "CORE TECHNICAL SKILLS",
      heading: HeadingLevel.HEADING_2,
    }),
    new Paragraph({ text: cv.skills.join("  •  ") }),
    new Paragraph({ text: "" }),
    new Paragraph({
      text: "PROFESSIONAL EXPERIENCE & ACHIEVEMENTS",
      heading: HeadingLevel.HEADING_2,
    })
  );

  for (const highlight of cv.experienceHighlights) {
    children.push(
      new Paragraph({
        bullet: { level: 0 },
        text: highlight,
      })
    );
  }

  const doc = new Document({
    sections: [
      {
        properties: {},
        children,
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
}

// 5. Scanned Image-Only PDF (Vector Graphic Simulation with ZERO text stream)
async function generateScannedImageOnlyPdf(filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 40, size: "A4" });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    // Draw scanned document bounding box & graphic marks without any doc.text()
    // unpdf / pdf-parse will extract 0 chars (text.length < 200 -> status: needs_ocr)
    doc.rect(40, 40, 515, 762).lineWidth(1.5).strokeColor("#94A3B8").stroke();

    // Simulated scanned photo box
    doc.rect(430, 60, 95, 110).fillAndStroke("#E2E8F0", "#CBD5E1");

    // Header banner simulation (raster-like vector blocks)
    doc.rect(60, 65, 220, 24).fill("#334155");
    doc.rect(60, 95, 340, 10).fill("#94A3B8");
    doc.rect(60, 112, 280, 8).fill("#CBD5E1");

    // Horizontal divider
    doc.rect(60, 140, 475, 2).fill("#E2E8F0");

    // Simulated paragraph lines (scanned document artifacts)
    for (let i = 0; i < 22; i++) {
      const y = 160 + i * 25;
      const width = 360 + ((i * 37) % 115);
      doc.rect(60, y, width, 9).fill("#E2E8F0");
    }

    doc.end();
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

// 5b. Scanned DOCX counterpart (< 200 chars to test needs_ocr status)
async function generateScannedDocx(filePath: string): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          new Paragraph({
            text: "[SCANNED IMAGE DOCUMENT - NO EMBEDDED TEXT LAYER]",
            heading: HeadingLevel.TITLE,
          }),
        ],
      },
    ],
  });

  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(filePath, buffer);
}

// 6. Corrupt / Truncated File
function generateCorruptFiles(pdfPath: string, docxPath: string) {
  // Truncated binary header that fails PDF parser without crashing batch
  fs.writeFileSync(
    pdfPath,
    "%PDF-1.7\n%CORRUPT_TRUNCATED_STREAM_FILE_BYTE_FAULT_TEST\n<< /Type /Catalog /Pages 2 0 R >>\n%%EOF"
  );

  // Invalid zip header for docx
  fs.writeFileSync(
    docxPath,
    "PK\x03\x04\x14\x00\x08\x00\x08\x00CORRUPT_ARCHIVE_DATA_TRUNCATED_OFFSET_ERR"
  );
}

async function main() {
  console.log("=========================================================");
  console.log("📄 Generating Sample CV Pack in /sample-cvs (PDF & DOCX)");
  console.log("=========================================================");

  const outputDir = path.resolve(process.cwd(), "sample-cvs");
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let count = 0;

  // 1. Generate Standard & Special Profiles
  for (const cv of SAMPLE_PROFILES) {
    const pdfPath = path.join(outputDir, `${cv.filenameBase}.pdf`);
    const docxPath = path.join(outputDir, `${cv.filenameBase}.docx`);

    await generatePdf(pdfPath, cv);
    await generateDocx(docxPath, cv);
    count++;
    console.log(
      `  [${count.toString().padStart(2, "0")}] Generated: ${cv.name} (${cv.role}) -> .pdf & .docx`
    );
  }

  // 2. Generate Image-Only / Scanned CV (05_Scanned_CV_NoTextLayer)
  const scannedPdfPath = path.join(
    outputDir,
    "05_Scanned_CV_NoTextLayer.pdf"
  );
  const scannedDocxPath = path.join(
    outputDir,
    "05_Scanned_CV_NoTextLayer.docx"
  );
  await generateScannedImageOnlyPdf(scannedPdfPath);
  await generateScannedDocx(scannedDocxPath);
  count++;
  console.log(
    `  [${count.toString().padStart(2, "0")}] Generated: Image-only Scanned CV (no text layer) -> .pdf & .docx`
  );

  // 3. Generate Corrupt / Truncated File (06_Corrupt_Truncated_CV)
  const corruptPdfPath = path.join(
    outputDir,
    "06_Corrupt_Truncated_CV.pdf"
  );
  const corruptDocxPath = path.join(
    outputDir,
    "06_Corrupt_Truncated_CV.docx"
  );
  generateCorruptFiles(corruptPdfPath, corruptDocxPath);
  count++;
  console.log(
    `  [${count.toString().padStart(2, "0")}] Generated: Corrupt/Truncated File (error isolation test) -> .pdf & .docx`
  );

  console.log("\n=========================================================");
  console.log(`✅ Successfully generated ${count} CV profiles into:`);
  console.log(`   ${outputDir}`);
  console.log(`   Total files created: ${count * 2} (${count} PDF + ${count} DOCX)`);
  console.log("=========================================================\n");
}

main().catch((err) => {
  console.error("❌ Failed to generate CVs:", err);
  process.exit(1);
});

