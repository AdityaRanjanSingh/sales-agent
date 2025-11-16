/**
 * Knowledge Base Tool
 * Retrieves company FAQs, policies, and information to help draft accurate email replies
 * Currently uses file-based storage, can be upgraded to vector database later
 */

import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from "zod";

const KnowledgeBaseInputSchema = z.object({
  topic: z
    .string()
    .describe(
      "The topic or question to search for in the knowledge base (e.g., 'pricing', 'shipping policy')"
    ),
});

/**
 * Knowledge base entry structure
 */
interface KnowledgeEntry {
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

/**
 * Initialize the knowledge base with sample data
 * In production, this would load from a file or database
 */
function initializeKnowledgeBase(): KnowledgeEntry[] {
    return [
      {
        category: "Pricing",
        question: "What are our pricing tiers?",
        answer:
          "We offer three pricing tiers:\n- Starter: $29/month - Perfect for small teams (up to 5 users)\n- Professional: $99/month - For growing businesses (up to 20 users)\n- Enterprise: Custom pricing - Unlimited users with dedicated support\n\nAll plans include a 14-day free trial with no credit card required.",
        keywords: ["pricing", "cost", "price", "tiers", "plans", "subscription"],
      },
      {
        category: "Pricing",
        question: "Do we offer discounts?",
        answer:
          "Yes! We offer:\n- 20% discount for annual billing (save 2+ months)\n- 15% discount for non-profits and educational institutions\n- Volume discounts for Enterprise plans (contact sales)\n- Seasonal promotions (check our website for current offers)",
        keywords: ["discount", "sale", "promotion", "save", "cheaper"],
      },
      {
        category: "Shipping",
        question: "What is our shipping policy?",
        answer:
          "Shipping Information:\n- Free standard shipping on all orders over $50\n- Standard shipping: 5-7 business days ($5.99)\n- Express shipping: 2-3 business days ($14.99)\n- Overnight shipping: Next business day ($24.99)\n\nInternational shipping available with rates calculated at checkout.",
        keywords: [
          "shipping",
          "delivery",
          "ship",
          "send",
          "mail",
          "freight",
        ],
      },
      {
        category: "Returns",
        question: "What is our return policy?",
        answer:
          "Return Policy:\n- 30-day money-back guarantee on all products\n- Items must be unused and in original packaging\n- Free return shipping for defective items\n- Refunds processed within 5-7 business days\n- Exchanges available for different sizes/colors\n\nTo initiate a return, contact support@company.com with your order number.",
        keywords: [
          "return",
          "refund",
          "exchange",
          "money back",
          "warranty",
        ],
      },
      {
        category: "Products",
        question: "What products do we offer?",
        answer:
          "Our Product Line:\n- Software Platform: Cloud-based business management solution\n- Mobile Apps: iOS and Android applications included\n- API Access: RESTful API for integrations (Professional+ plans)\n- Documentation: Detailed product information and user guides available\n- Training: Online courses and documentation included\n- Support: Email support (all plans), priority support (Professional+), dedicated account manager (Enterprise)",
        keywords: [
          "product",
          "features",
          "capabilities",
          "what do you offer",
          "services",
        ],
      },
      {
        category: "Support",
        question: "What support options are available?",
        answer:
          "Support Channels:\n- Email Support: support@company.com (response within 24 hours)\n- Live Chat: Available Mon-Fri, 9 AM - 6 PM EST\n- Phone Support: Professional and Enterprise plans only\n- Knowledge Base: Comprehensive documentation and tutorials\n- Community Forum: Connect with other users\n- Training: Video tutorials and webinars\n\nPremium Support (Enterprise): Dedicated account manager, priority response (2-hour SLA), custom training sessions.",
        keywords: ["support", "help", "assistance", "contact", "service"],
      },
      {
        category: "Technical",
        question: "What are the technical requirements?",
        answer:
          "Technical Requirements:\n- Browser: Latest version of Chrome, Firefox, Safari, or Edge\n- Internet: Broadband connection recommended\n- Mobile: iOS 13+ or Android 8+\n- Integrations: Connect with Slack, Google Workspace, Microsoft 365, Salesforce, and 100+ other apps\n- Security: SOC 2 Type II certified, GDPR compliant, SSL encryption\n- Uptime: 99.9% guaranteed uptime SLA",
        keywords: [
          "technical",
          "requirements",
          "compatibility",
          "integration",
          "security",
          "system",
        ],
      },
      {
        category: "Company",
        question: "About our company",
        answer:
          "About Us:\n- Founded in 2020 with a mission to simplify business operations\n- Serving 10,000+ customers across 50 countries\n- Headquartered in San Francisco, CA with remote team worldwide\n- Award-winning customer service (95% satisfaction rating)\n- Committed to sustainability and social responsibility\n- Regular product updates and feature releases\n\nOur Vision: Empowering businesses to work smarter, not harder.",
        keywords: ["company", "about", "who are you", "background", "history"],
      },
    ];
}

/**
 * Factory function to create KnowledgeBaseTool
 */
export function createKnowledgeBaseTool() {
  const knowledgeBase = initializeKnowledgeBase();

  return new DynamicStructuredTool({
    name: "retrieve_company_knowledge",
    description: `Retrieve company information, FAQs, policies, and product details to help draft accurate and informed email replies.

Input should be a topic or question (e.g., "pricing", "return policy", "product specifications").

Returns relevant company information that can be used to answer customer questions accurately.

Use this when:
- Customer asks about pricing, policies, or products
- You need to include accurate company information in replies
- You want to ensure consistent messaging

Examples:
- "pricing" → Returns pricing tiers, discounts, payment terms
- "shipping" → Returns shipping policies, timelines, costs
- "returns" → Returns return policy and procedures`,
    schema: KnowledgeBaseInputSchema,
    func: async ({ topic }: { topic: string }): Promise<string> => {
      try {
        const searchTerm = topic.toLowerCase().trim();

        console.log(`[KnowledgeBaseTool] Searching for topic: ${searchTerm}`);

        // Search through knowledge base
        const relevantEntries = knowledgeBase.filter((entry) => {
          // Check if search term matches category, question, answer, or keywords
          const categoryMatch = entry.category.toLowerCase().includes(searchTerm);
          const questionMatch = entry.question.toLowerCase().includes(searchTerm);
          const answerMatch = entry.answer.toLowerCase().includes(searchTerm);
          const keywordMatch = entry.keywords.some((keyword) =>
            keyword.toLowerCase().includes(searchTerm) ||
            searchTerm.includes(keyword.toLowerCase())
          );

          return categoryMatch || questionMatch || answerMatch || keywordMatch;
        });

        if (relevantEntries.length === 0) {
          return `No specific information found for "${topic}" in the knowledge base. Consider asking for more details or checking our general company information.`;
        }

        // Format results
        let result = `Found ${relevantEntries.length} relevant knowledge base ${relevantEntries.length === 1 ? "entry" : "entries"} for "${topic}":\n\n`;
        result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        result += `COMPANY KNOWLEDGE BASE\n`;
        result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        relevantEntries.forEach((entry, index) => {
          result += `${index + 1}. ${entry.category.toUpperCase()}\n`;
          result += `   ${entry.question}\n\n`;
          result += `   ${entry.answer}\n\n`;
          if (index < relevantEntries.length - 1) {
            result += `   ────────────────────────────────\n\n`;
          }
        });

        result += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        result += `\nUse this information to provide accurate and helpful responses to customers.`;

        return result;
      } catch (error) {
        console.error("[KnowledgeBaseTool] Error retrieving knowledge:", error);
        return `Error retrieving company knowledge: ${error instanceof Error ? error.message : "Unknown error"}`;
      }
    },
  });
}
