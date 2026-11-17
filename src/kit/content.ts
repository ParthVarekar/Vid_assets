// ProtoVinci's own published content, used by the social templates.
// Source: protovinci.vercel.app (home, /services, /projects), LinkedIn and X,
// read 13 November 2026. Nothing here is invented: edit this file when the
// site changes, and every template updates.

import type { IconName } from "../three/data/icons";

export const BRAND = {
  name: "ProtoVinci",
  url: "protovinci.vercel.app",
  email: "protovincistudio@gmail.com",
  tagline: "Build. Automate. Scale.",
  motto: "Creativity, Engineered.",
  location: "Mumbai, India",
};

export type Pillar = "Build" | "Automate" | "Create";

export const SERVICES: Array<{
  no: string;
  pillar: Pillar;
  title: string;
  icon: IconName;
  description: string;
  items: string[];
}> = [
  { no: "01", pillar: "Build", title: "Website & Web Application Development", icon: "globe", description: "Responsive websites and web apps, from business sites and product catalogues to dashboards and portals, built on modern frameworks.", items: ["Business & marketing websites", "Web apps & dashboards", "E-commerce & catalogues", "SEO-ready, responsive builds"] },
  { no: "02", pillar: "Build", title: "Custom Software Development", icon: "code", description: "Software shaped around how your business actually works: internal tools, management systems and platforms that replace spreadsheets and manual steps.", items: ["Internal tools & admin panels", "Management systems", "Specialised platforms", "Clean, documented code"] },
  { no: "03", pillar: "Build", title: "Mobile App Development", icon: "mobile", description: "Android and iOS apps that put your product or service in your customers' hands, designed for everyday use.", items: ["iOS & Android apps", "App UI/UX & prototypes", "Backend & API connectivity", "Store launch support"] },
  { no: "04", pillar: "Build", title: "Cloud & Technology Solutions", icon: "cloud", description: "Hosting, deployment and cloud setup that keep your applications secure, fast and ready to scale, with guidance on the right technology choices.", items: ["Cloud hosting & deployment", "Domain, email & server setup", "Performance & security", "Technology consulting"] },
  { no: "05", pillar: "Build", title: "Website & Software Maintenance", icon: "check", description: "Ongoing care after launch: updates, fixes, backups and improvements, so your website and software stay secure and up to date.", items: ["Updates & security patches", "Bug fixes & monitoring", "Backups", "Content & feature changes"] },
  { no: "06", pillar: "Automate", title: "AI Solutions & Integrations", icon: "ai-agent", description: "AI built into your workflows and products: chatbots, assistants, document processing and smart features powered by modern AI models.", items: ["AI chatbots & assistants", "Document & data processing", "AI features in existing apps", "Model integration"] },
  { no: "07", pillar: "Automate", title: "Workflow & Business Automation", icon: "lightning", description: "We find the repetitive tasks in your process and automate them, from data entry and reporting to document generation and email workflows.", items: ["Process mapping", "Automated documents & reports", "Email & notification flows", "Spreadsheet & form automation"] },
  { no: "08", pillar: "Automate", title: "API & System Integrations", icon: "integration", description: "Connect the tools you already rely on so data flows between them: CRMs, payment gateways, messaging platforms and third-party APIs.", items: ["Third-party API integrations", "Payment gateways", "CRM & WhatsApp integrations", "Custom APIs & data sync"] },
  { no: "09", pillar: "Create", title: "UI/UX & Digital Design", icon: "layers", description: "Clear, consistent interfaces, from wireframes and prototypes to complete design systems and brand visuals.", items: ["Wireframes & user flows", "High-fidelity UI & prototypes", "Design systems", "Brand & digital visuals"] },
  { no: "10", pillar: "Create", title: "Video Editing & Creative Services", icon: "dashboard", description: "Video and visual content for social media, ads and your website: edited, paced and branded to hold attention.", items: ["Reels & short-form video", "Promo & product videos", "Motion graphics", "Social media creatives"] },
];

export const PILLARS: Array<{ name: Pillar; label: string; summary: string; icon: IconName }> = [
  { name: "Build", label: "Technology & Development", summary: "Fast, scalable websites, apps and custom software engineered for performance.", icon: "code" },
  { name: "Automate", label: "AI & Automation", summary: "Practical AI, automation and integrations that take repetitive work off your team's plate.", icon: "ai-agent" },
  { name: "Create", label: "Design & Creative", summary: "Interfaces people enjoy using and content that tells your story.", icon: "layers" },
];

export const PROJECTS: Array<{ name: string; type: string; weeks: string; image: string; description: string }> = [
  { name: "RK Enterprises", type: "Product Catalogue", weeks: "2 weeks", image: "rk-enterprises.webp", description: "An industrial equipment platform with machine catalogues, instant quotation flows and a precise responsive layout." },
  { name: "Firdosh Marble Arts", type: "Digital Showroom", weeks: "2 weeks", image: "firdosh.webp", description: "A digital showroom for handcrafted marble art, temple architecture and bespoke fountains." },
  { name: "Gully Culture", type: "Social Commerce", weeks: "3 weeks", image: "gullyculture.webp", description: "A street-culture e-commerce landing experience with bold art direction and social order channels." },
  { name: "SocialxBrand Pilot", type: "Agency Website", weeks: "3 weeks", image: "socialxbrand.webp", description: "A conversion-focused brand presence for a marketing agency." },
  { name: "WMC Labs", type: "Educational Software", weeks: "6 weeks", image: "wmc.webp", description: "A virtual laboratory for wireless and mobile communication, with hands-on experiments in the browser." },
  { name: "AwardDock", type: "Workflow Automation", weeks: "6 weeks", image: "awarddock.webp", description: "Certificate automation that generates, verifies and delivers credentials at volume." },
  { name: "The Art Events", type: "Celebration Décor", weeks: "1 week", image: "theart.webp", description: "A décor and styling showcase that turns event themes into client enquiries." },
];

/** The site's process. Only phase 01 has a published description. */
export const PROCESS: Array<{ no: string; name: string; detail: string }> = [
  { no: "01", name: "Understand", detail: "Discovery & strategic immersion" },
  { no: "02", name: "Shape", detail: "Turn what we learn into a plan" },
  { no: "03", name: "Create", detail: "Design and build, in the open" },
  { no: "04", name: "Elevate", detail: "Launch, measure, keep improving" },
];

/** Figures shown on the site's projects page. */
export const STATS: Array<{ value: string; label: string; note: string }> = [
  { value: "07", label: "projects shipped", note: "Selected work, 2026 – now" },
  { value: "3 wks", label: "average delivery", note: "Across shipped projects" },
  { value: "7/7", label: "live in production", note: "Every project we shipped" },
];

/** Working model stated on the site. */
export const PROMISES: Array<{ title: string; detail: string; icon: IconName }> = [
  { title: "2–6 weeks", detail: "Most projects wrap up within 2–6 weeks, with a clear timeline after our first call.", icon: "lightning" },
  { title: "Unlimited revisions", detail: "Within the agreed scope, we keep refining until it matches your vision.", icon: "check" },
  { title: "Direct access", detail: "Slack, WhatsApp, Discord or Telegram, with regular check-ins.", icon: "email" },
  { title: "Post-launch support", detail: "Maintenance plans keep your site secure and up to date.", icon: "dashboard" },
];

/** Published on the brand's own channels. */
export const QUOTES: string[] = [
  "Some ideas shouldn't stay ideas.",
  "We build things that should already exist.",
  "Bring us the thing nobody will build.",
  "One team. Idea to launch.",
  "Got a vision? Let's ship it.",
];

/** Published on protovinci.vercel.app with names and roles. Confirm consent before paid use. */
export const TESTIMONIALS: Array<{ quote: string; name: string; role: string; project: string }> = [
  { quote: "Issuing certificates for events used to mean hours of manual work. With AwardDock we import participants from a spreadsheet, and personalised certificates are generated and emailed automatically.", name: "Dr. B.R. Patil", role: "Principal, K.C. College of Engineering, Thane", project: "AwardDock" },
  { quote: "ProtoVinci turned our wireless communication syllabus into a virtual lab our students genuinely enjoy.", name: "Prof. Priyadarshini Badgujjar", role: "Faculty, K.C. College of Engineering, Thane", project: "WMC Virtual Lab" },
  { quote: "Our machines finally have a proper home online. The website looks professional and gives customers confidence before they even call us.", name: "Ramesh Kumar", role: "Owner, RK Enterprises", project: "RK Enterprises" },
  { quote: "Marble work has to be seen to be appreciated, and ProtoVinci understood that from the start.", name: "Kalamuddin", role: "Founder, Firdosh Marble Arts", project: "Firdosh Marble Arts" },
  { quote: "They got the vibe of Gully Culture from day one. The site feels exactly like our brand: bold, street and full of energy.", name: "Rudra Mewadi", role: "Founder, Gully Culture", project: "Gully Culture" },
  { quote: "ProtoVinci shaped our services, portfolio and messaging into a site that makes a strong first impression.", name: "Sanket Shedge", role: "Founder, Vishay Group of Companies", project: "SocialxBrand Pilot" },
];
