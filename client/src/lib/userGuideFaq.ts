export interface UserGuideFaqEntry {
  question: string;
  answer: string;
}

// Written from the doubts a pharmacy owner actually raises day-to-day —
// not a generic FAQ template.
export const userGuideFaq: UserGuideFaqEntry[] = [
  {
    question: "What's the difference between Settings and User Management?",
    answer:
      "Settings (Store Profile, GST, Invoice options, Backups) configures how the pharmacy and invoices work. User Management — a tab inside the same page — is specifically for creating staff logins and assigning roles.",
  },
  {
    question: "Can two staff members bill at the same counter at the same time without stock going wrong?",
    answer:
      "Yes. Stock deductions and restocks happen as a single atomic update per sale or return, so two simultaneous sales of the last few units of a medicine can't both succeed and push stock negative.",
  },
  {
    question: "A customer wants to return only part of what they bought — is that possible?",
    answer:
      "Yes. Medicine Refund tracks how much of each line on an invoice has already been returned, so it can be returned across several visits and the total refunded can never exceed what was actually paid.",
  },
  {
    question: "Why isn't the refund just today's price × quantity returned?",
    answer:
      "The refund is calculated from what the customer actually paid on the original invoice — which may include a discount from that day — not the medicine's current selling price.",
  },
  {
    question: "Can I undo a completed sale?",
    answer:
      "Not directly. A completed sale isn't deleted or edited. To reverse it, process a return against it from Medicine Refund, which restocks the exact batch that was sold and refunds the amount paid.",
  },
  {
    question: "Why does a staff member not see a menu I expect them to have?",
    answer:
      "Menu access follows a priority order: an individual override for that user beats a menu group assigned directly to them, which beats their Role's default menu groups. Check Role Master first, then User Access for a one-off exception.",
  },
  {
    question: "What's the difference between the admin and support logins?",
    answer:
      "Support has full access to every feature, meant for troubleshooting. Admin has a curated day-to-day set of screens for running the pharmacy. Either one's menu set can be changed from Role Master.",
  },
  {
    question: "Why don't Card and Credit show up as payment options at checkout?",
    answer:
      "They're off by default. Turn them on in Settings → Invoice Settings and they'll appear as choices on New Sale.",
  },
  {
    question: "Why does the medicine search on New Sale show one batch before another?",
    answer:
      "It lists soonest-to-expire stock first (FEFO — First-Expiry-First-Out) so older stock sells before it expires.",
  },
  {
    question: "A medicine shows different stock numbers in different places — is something broken?",
    answer:
      "The true total is always the sum across every batch of that medicine. If two screens disagree, it usually means one hasn't refreshed after a recent sale or adjustment yet — refresh before assuming it's wrong.",
  },
  {
    question: "What happens if I try to sell more than what's in stock?",
    answer: "The sale is blocked at the batch level — you can't sell more of a specific batch than is actually available in it.",
  },
  {
    question: "How is \"Low Stock\" decided?",
    answer:
      "Each medicine has its own Reorder Level, set on the Medicines page. Once quantity falls below that level, it's flagged Low Stock — it isn't one fixed number across every medicine.",
  },
  {
    question: "Can I get access to a screen I don't currently have?",
    answer:
      "Ask whoever manages Role Master (owner or admin) to either move you to a role with that menu, or grant it to you individually from User Access.",
  },
  {
    question: "Where do I go to correct a stock count after a physical stock-take?",
    answer: "Stock Adjustments — pick the medicine and batch, choose Increase or Decrease, and record the reason as Stock Take Variance.",
  },
  {
    question: "Is there a way to see who changed something in the system?",
    answer: "Yes — Audit Log records every create, update, delete, login, and logout, along with who did it and when.",
  },
];
