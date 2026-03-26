"use strict";

const BUSINESS_ARCHETYPES = [
  "Builder",
  "Architect",
  "Operator",
  "Connector",
  "Resource Generator",
  "Protector",
  "Nurturer",
  "Educator",
];

const CUSTOMER_ARCHETYPES = [
  "Value Seeker",
  "Loyal Supporter",
  "Convenience Buyer",
  "Experience Seeker",
  "Social Promoter",
  "Intentional Buyer",
  "Trend Explorer",
];

function q(qid, question, options) {
  return {
    qid,
    question,
    options: options.map((opt) => ({ key: opt.key, text: opt.text, maps: opt.maps })),
  };
}

const BUSINESS_QUESTIONS = [
  q("B01", "When something needs to get done, you:", [
    { key: "A", text: "Just start doing it", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Plan it out first", maps: ["Architect", "Operator"] },
    { key: "C", text: "Ask others or collaborate", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Research before acting", maps: ["Protector", "Educator"] },
  ]),
  q("B02", "Your biggest focus in business is:", [
    { key: "A", text: "Making money", maps: ["Resource Generator", "Builder"] },
    { key: "B", text: "Creating systems", maps: ["Architect", "Operator"] },
    { key: "C", text: "Helping people", maps: ["Nurturer", "Educator"] },
    { key: "D", text: "Building relationships", maps: ["Connector", "Nurturer"] },
  ]),
  q("B03", "When business slows down, you:", [
    { key: "A", text: "Go find new opportunities", maps: ["Resource Generator", "Builder"] },
    { key: "B", text: "Analyze what’s wrong", maps: ["Architect", "Protector"] },
    { key: "C", text: "Reach out to people", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Learn something new", maps: ["Educator", "Architect"] },
  ]),
  q("B04", "Your biggest strength is:", [
    { key: "A", text: "Taking action", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Planning", maps: ["Architect", "Operator"] },
    { key: "C", text: "Connecting", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Teaching", maps: ["Educator", "Nurturer"] },
  ]),
  q("B05", "Your biggest struggle is:", [
    { key: "A", text: "Staying consistent", maps: ["Builder", "Connector"] },
    { key: "B", text: "Taking action", maps: ["Architect", "Protector"] },
    { key: "C", text: "Charging enough", maps: ["Nurturer", "Educator"] },
    { key: "D", text: "Staying organized", maps: ["Resource Generator", "Connector"] },
  ]),
  q("B06", "When you set goals, you usually:", [
    { key: "A", text: "Start immediately, figure it out on the way", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Map a full plan and timeline", maps: ["Architect", "Operator"] },
    { key: "C", text: "Align the people first", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Make sure it’s low-risk and proven", maps: ["Protector", "Architect"] },
  ]),
  q("B07", "Your calendar looks like:", [
    { key: "A", text: "Flexible, changes daily", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Structured, planned blocks", maps: ["Operator", "Architect"] },
    { key: "C", text: "Full of meetings and check-ins", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Minimal commitments to avoid mistakes", maps: ["Protector", "Operator"] },
  ]),
  q("B08", "When someone gives you criticism, you:", [
    { key: "A", text: "Adjust quickly and keep moving", maps: ["Builder", "Operator"] },
    { key: "B", text: "Rework the whole strategy", maps: ["Architect", "Educator"] },
    { key: "C", text: "Talk it through to keep relationships strong", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Get cautious and double-check everything", maps: ["Protector", "Operator"] },
  ]),
  q("B09", "When money comes in, you:", [
    { key: "A", text: "Reinvest fast to grow", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Allocate to budgets and systems", maps: ["Operator", "Architect"] },
    { key: "C", text: "Spend on customer experience/community", maps: ["Nurturer", "Connector"] },
    { key: "D", text: "Save to reduce risk", maps: ["Protector", "Operator"] },
  ]),
  q("B10", "Sales to you feels like:", [
    { key: "A", text: "A numbers game—go get it", maps: ["Resource Generator", "Builder"] },
    { key: "B", text: "A process to optimize", maps: ["Operator", "Architect"] },
    { key: "C", text: "A relationship to build", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Something you prefer to master carefully first", maps: ["Educator", "Protector"] },
  ]),
  q("B11", "Your team needs you most for:", [
    { key: "A", text: "Momentum and execution", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Strategy and systems", maps: ["Architect", "Operator"] },
    { key: "C", text: "Culture and relationships", maps: ["Nurturer", "Connector"] },
    { key: "D", text: "Quality control and risk checks", maps: ["Protector", "Operator"] },
  ]),
  q("B12", "When you hire someone, you prioritize:", [
    { key: "A", text: "Hustle and speed", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Competence and structure", maps: ["Operator", "Architect"] },
    { key: "C", text: "People skills and trust", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Reliability and low risk", maps: ["Protector", "Operator"] },
  ]),
  q("B13", "Your pricing style is:", [
    { key: "A", text: "Let’s test and raise later", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Based on costs and margins", maps: ["Operator", "Architect"] },
    { key: "C", text: "Keep it fair, customer-first", maps: ["Nurturer", "Educator"] },
    { key: "D", text: "Conservative to avoid complaints", maps: ["Protector", "Nurturer"] },
  ]),
  q("B14", "Marketing that fits you is:", [
    { key: "A", text: "Aggressive outreach/DMs/partnerships", maps: ["Resource Generator", "Connector"] },
    { key: "B", text: "Systems + funnels + automation", maps: ["Operator", "Architect"] },
    { key: "C", text: "Storytelling + education + trust", maps: ["Educator", "Nurturer"] },
    { key: "D", text: "Reputation + reviews + proof", maps: ["Protector", "Operator"] },
  ]),
  q("B15", "When a process breaks, you:", [
    { key: "A", text: "Patch it quick and keep going", maps: ["Builder", "Operator"] },
    { key: "B", text: "Redesign the process completely", maps: ["Architect", "Operator"] },
    { key: "C", text: "Ask team/customers for feedback", maps: ["Connector", "Educator"] },
    { key: "D", text: "Pause and prevent risk first", maps: ["Protector", "Architect"] },
  ]),
  q("B16", "When you learn something new, you:", [
    { key: "A", text: "Apply immediately", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Document and systemize it", maps: ["Operator", "Architect"] },
    { key: "C", text: "Teach/share it", maps: ["Educator", "Connector"] },
    { key: "D", text: "Verify it’s safe and accurate", maps: ["Protector", "Educator"] },
  ]),
  q("B17", "Your decision-making is mostly:", [
    { key: "A", text: "Fast and instinctive", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Data-driven and structured", maps: ["Operator", "Architect"] },
    { key: "C", text: "Relationship/context driven", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Cautious and risk-aware", maps: ["Protector", "Operator"] },
  ]),
  q("B18", "If you had one superpower, you’d choose:", [
    { key: "A", text: "Speed/Execution", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Clarity/Strategy", maps: ["Architect", "Operator"] },
    { key: "C", text: "Community/Loyalty", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Trust/Authority", maps: ["Educator", "Protector"] },
  ]),
  q("B19", "When your business grows, your first move is:", [
    { key: "A", text: "Sell more immediately", maps: ["Resource Generator", "Builder"] },
    { key: "B", text: "Upgrade systems", maps: ["Operator", "Architect"] },
    { key: "C", text: "Strengthen customer experience", maps: ["Nurturer", "Connector"] },
    { key: "D", text: "Reduce risk and stabilize", maps: ["Protector", "Operator"] },
  ]),
  q("B20", "If you’re overwhelmed, you:", [
    { key: "A", text: "Push through with action", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Organize and prioritize", maps: ["Operator", "Architect"] },
    { key: "C", text: "Ask for help and delegate", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Slow down and reassess risk", maps: ["Protector", "Architect"] },
  ]),
  q("B21", "Your content style would be:", [
    { key: "A", text: "Bold offers + strong CTAs", maps: ["Resource Generator", "Builder"] },
    { key: "B", text: "Frameworks, checklists, systems", maps: ["Architect", "Operator"] },
    { key: "C", text: "Stories, testimonials, community", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Lessons, education, credibility", maps: ["Educator", "Protector"] },
  ]),
  q("B22", "Customer problems are solved by:", [
    { key: "A", text: "Fast fixes and action", maps: ["Builder", "Nurturer"] },
    { key: "B", text: "Better processes", maps: ["Operator", "Architect"] },
    { key: "C", text: "Better communication", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Prevention + quality control", maps: ["Protector", "Operator"] },
  ]),
  q("B23", "Your relationship to risk is:", [
    { key: "A", text: "Risk is part of winning", maps: ["Resource Generator", "Builder"] },
    { key: "B", text: "Risk is managed by systems", maps: ["Architect", "Operator"] },
    { key: "C", text: "Risk is managed by people trust", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Avoid risk unless proven", maps: ["Protector", "Educator"] },
  ]),
  q("B24", "Your ideal business feels like:", [
    { key: "A", text: "High momentum and growth", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Smooth operations and predictability", maps: ["Operator", "Architect"] },
    { key: "C", text: "Loved brand and loyal community", maps: ["Nurturer", "Connector"] },
    { key: "D", text: "Trusted brand with low problems", maps: ["Protector", "Educator"] },
  ]),
  q("B25", "If GARVEY coached you, you’d want it to:", [
    { key: "A", text: "Push you to execute faster", maps: ["Builder", "Resource Generator"] },
    { key: "B", text: "Give you a full system and roadmap", maps: ["Architect", "Operator"] },
    { key: "C", text: "Help you build community + referrals", maps: ["Connector", "Nurturer"] },
    { key: "D", text: "Help you reduce mistakes + risk", maps: ["Protector", "Educator"] },
  ]),
].map((question) => ({ ...question, type: "business_owner" }));

const CUSTOMER_QUESTIONS = [
  q("CU1", "When choosing where to go, you care most about:", [
    { key: "A", text: "Price/deals", maps: ["Value Seeker", "Convenience Buyer"] },
    { key: "B", text: "Familiar/trusted place", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Fast/easy access", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "Vibe/quality experience", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU2", "If you see a new business, you:", [
    { key: "A", text: "Wait for a discount", maps: ["Value Seeker", "Trend Explorer"] },
    { key: "B", text: "Try it if recommended by someone you trust", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Try it if it’s nearby/quick", maps: ["Convenience Buyer", "Trend Explorer"] },
    { key: "D", text: "Try it if it looks amazing online", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU3", "You return to a business when:", [
    { key: "A", text: "It stays affordable", maps: ["Value Seeker", "Loyal Supporter"] },
    { key: "B", text: "They treat you like a VIP", maps: ["Loyal Supporter", "Social Promoter"] },
    { key: "C", text: "It’s consistently easy", maps: ["Convenience Buyer", "Loyal Supporter"] },
    { key: "D", text: "It always feels premium", maps: ["Experience Seeker", "Intentional Buyer"] },
  ]),
  q("CU4", "Your ideal offer is:", [
    { key: "A", text: "Discount/bundle", maps: ["Value Seeker", "Trend Explorer"] },
    { key: "B", text: "Loyalty reward/VIP perk", maps: ["Loyal Supporter", "Value Seeker"] },
    { key: "C", text: "Skip-the-line / fast lane", maps: ["Convenience Buyer", "Experience Seeker"] },
    { key: "D", text: "Exclusive experience", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU5", "When a business posts online, you like:", [
    { key: "A", text: "Coupons/flash sales", maps: ["Value Seeker", "Convenience Buyer"] },
    { key: "B", text: "Thank-you / community posts", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Quick info (hours, availability)", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "High-quality visuals", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU6", "If service is slow, you:", [
    { key: "A", text: "Expect a discount", maps: ["Value Seeker", "Convenience Buyer"] },
    { key: "B", text: "Stay if they acknowledge you", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Leave and choose faster next time", maps: ["Convenience Buyer", "Trend Explorer"] },
    { key: "D", text: "Stay if the vibe is worth it", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU7", "Reviews matter because:", [
    { key: "A", text: "I want to avoid wasting money", maps: ["Value Seeker", "Intentional Buyer"] },
    { key: "B", text: "I want to confirm trust", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "I want to avoid wasting time", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "I want to see the experience", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU8", "When you love a place, you:", [
    { key: "A", text: "Come back when there’s a deal", maps: ["Value Seeker", "Loyal Supporter"] },
    { key: "B", text: "Become a regular", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Choose it because it’s easiest", maps: ["Convenience Buyer", "Loyal Supporter"] },
    { key: "D", text: "Tell people / post it", maps: ["Social Promoter", "Experience Seeker"] },
  ]),
  q("CU9", "Your buying style is:", [
    { key: "A", text: "Compare prices", maps: ["Value Seeker", "Intentional Buyer"] },
    { key: "B", text: "Stick with what’s proven", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Grab what’s easiest", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "Try what’s new/exciting", maps: ["Trend Explorer", "Social Promoter"] },
  ]),
  q("CU10", "A business wins you by:", [
    { key: "A", text: "Saving you money", maps: ["Value Seeker", "Loyal Supporter"] },
    { key: "B", text: "Making you feel appreciated", maps: ["Loyal Supporter", "Social Promoter"] },
    { key: "C", text: "Making it effortless", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "Making it memorable", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU11", "If a place changes owners/branding, you:", [
    { key: "A", text: "Wait for deals to try again", maps: ["Value Seeker", "Trend Explorer"] },
    { key: "B", text: "Give them a chance because you’re loyal", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Decide based on convenience", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "Decide based on quality/vibe", maps: ["Experience Seeker", "Intentional Buyer"] },
  ]),
  q("CU12", "You prefer communication that is:", [
    { key: "A", text: "Straight to the deal", maps: ["Value Seeker", "Convenience Buyer"] },
    { key: "B", text: "Personal and warm", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Short and practical", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "Story-driven and visual", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU13", "Loyalty programs matter if:", [
    { key: "A", text: "They save me money", maps: ["Value Seeker", "Loyal Supporter"] },
    { key: "B", text: "They recognize me", maps: ["Loyal Supporter", "Social Promoter"] },
    { key: "C", text: "They make checkout easy", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "They unlock special experiences", maps: ["Experience Seeker", "Trend Explorer"] },
  ]),
  q("CU14", "Your favorite kind of business is:", [
    { key: "A", text: "Best value for the price", maps: ["Value Seeker", "Intentional Buyer"] },
    { key: "B", text: "Feels like my spot", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Quick + consistent", maps: ["Convenience Buyer", "Loyal Supporter"] },
    { key: "D", text: "Beautiful + premium", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU15", "When you see limited-time, you:", [
    { key: "A", text: "Jump in for savings", maps: ["Value Seeker", "Trend Explorer"] },
    { key: "B", text: "Ignore unless it’s your regular spot", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Use it if it reduces effort", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "Use it if it’s exclusive", maps: ["Experience Seeker", "Trend Explorer"] },
  ]),
  q("CU16", "If something goes wrong, you want:", [
    { key: "A", text: "Refund/discount", maps: ["Value Seeker", "Convenience Buyer"] },
    { key: "B", text: "A sincere apology and fix", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Fast resolution", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "Make it right in a premium way", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU17", "You’re most likely to post if:", [
    { key: "A", text: "The deal is crazy", maps: ["Value Seeker", "Social Promoter"] },
    { key: "B", text: "You feel appreciated", maps: ["Loyal Supporter", "Social Promoter"] },
    { key: "C", text: "It’s super convenient", maps: ["Convenience Buyer", "Trend Explorer"] },
    { key: "D", text: "It looks amazing", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU18", "You’re most likely to try something new when:", [
    { key: "A", text: "It’s discounted", maps: ["Value Seeker", "Trend Explorer"] },
    { key: "B", text: "It aligns with your values", maps: ["Intentional Buyer", "Loyal Supporter"] },
    { key: "C", text: "It saves time", maps: ["Convenience Buyer", "Value Seeker"] },
    { key: "D", text: "It feels exclusive", maps: ["Trend Explorer", "Experience Seeker"] },
  ]),
  q("CU19", "Quality means:", [
    { key: "A", text: "Worth the price", maps: ["Value Seeker", "Intentional Buyer"] },
    { key: "B", text: "Consistent and trustworthy", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "Quick and accurate", maps: ["Convenience Buyer", "Loyal Supporter"] },
    { key: "D", text: "The whole vibe/experience", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
  q("CU20", "The best reason to come back is:", [
    { key: "A", text: "Better deal next time", maps: ["Value Seeker", "Loyal Supporter"] },
    { key: "B", text: "I feel like family there", maps: ["Loyal Supporter", "Intentional Buyer"] },
    { key: "C", text: "It’s easy every time", maps: ["Convenience Buyer", "Loyal Supporter"] },
    { key: "D", text: "It’s always a great experience", maps: ["Experience Seeker", "Social Promoter"] },
  ]),
].map((question) => ({ ...question, type: "customer" }));

module.exports = {
  BUSINESS_ARCHETYPES,
  CUSTOMER_ARCHETYPES,
  BUSINESS_QUESTIONS,
  CUSTOMER_QUESTIONS,
};
