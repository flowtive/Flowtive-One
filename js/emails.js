/* Flowtive One — Email templates: data, library, detail modal, copy/edit */

/* ── Email Templates & Golden Rules ───────────────────────────── */
var EMAIL_TEMPLATES = {
  "Agency": {
    "owner": "Emran",
    "buyerPsychology": "Ego-driven. Knows the site needs work but never prioritises it. The cobbler's shoes irony lands immediately. Responds to peers not vendors. Competitive about how they look to clients.",
    "tone": "Peer-to-peer. Wry but warm. Treats them as an equal who already knows the problem. No flattery, no corporate language.",
    "emails": [
      {
        "day": 1,
        "label": "Pattern interrupt, peer to peer, under 100 words",
        "subject": "quick thought on [Agency Name]",
        "body": "Hi [First Name],\n\nSpent a few minutes on your site this morning, the way a prospective client would.\n\nThe work is clearly strong. But the website isn't winning the rooms you should be in. Positioning is vague, the best projects are buried, and nothing makes a visitor feel like they found the right team.\n\nWe rebuild agency sites on Webflow, sharp, stripped back, built to bring in better clients.\n\nWorth 15 minutes this week?\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The cobbler's shoes, completely different angle, not a repeat",
        "subject": "re: [Agency Name]'s site",
        "body": "Hi [First Name],\n\nFollowing up, and I'll be direct rather than send a generic nudge.\n\nEvery agency owner I've spoken to says the same thing: the website has been on the list for two years and somehow never reaches the top. Meanwhile you're delivering great work for clients while your own front door hasn't been touched since you outgrew it.\n\nThe cost isn't obvious. It shows up in pitches you almost win, referrals that go quiet after Googling you, and rates that are harder to defend than they should be.\n\nHappy to do a free honest 15 minute look, no deck, no pitch.\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, gives something useful regardless of reply",
        "subject": "one thing worth testing on [Agency Name]'s homepage",
        "body": "Hi [First Name],\n\nLast follow-up, and I want to make it worth your time either way.\n\nThe single biggest conversion problem on most agency homepages: the headline tries to appeal to everyone and ends up speaking to no one. A visitor in the first five seconds should know immediately what type of client you're best for.\n\nWorth testing: replace the current headline with one sentence that names your ideal client and the one thing they'll get. Agencies who try this consistently see a jump in enquiry quality within weeks, regardless of whether they rebuild the whole site.\n\nHappy to draft a few options for [Agency Name] specifically, no strings.\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Final close, clean, no pressure, under 60 words",
        "subject": "leaving this here, [First Name]",
        "body": "Hi [First Name],\n\nLast one from me, I know you're busy.\n\nWhen [Agency Name]'s website makes it to the top of the list, we'd love to be involved. We work fast, build on Webflow, and care about the result as much as you do.\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 5
      }
    ]
  },
  "Law Firms": {
    "owner": "Emran",
    "buyerPsychology": "Reputation is everything. Trust is formed before first contact. Responds to credibility, precision, and respect for their time. Dislikes anything that feels like a mass blast or a shortcut. The website is a reflection of the firm's standing.",
    "tone": "Formal, measured, authoritative. Every word chosen carefully. Like a note from a respected peer firm. Zero fluff, zero informality.",
    "emails": [
      {
        "day": 1,
        "label": "Credibility gap, observed specifically, not assumed generically",
        "subject": "a note on [Firm Name]'s website",
        "body": "Hi [First Name],\n\nTook some time on [Firm Name]'s website this morning.\n\nThe practice has a strong reputation, but the website doesn't reflect that standing. The homepage doesn't lead with your strongest practice areas, there's no clear path from arrival to a consultation request, and the design hasn't kept pace with the calibre of work your team is doing.\n\nA prospective client forms a judgment about a firm before they make contact. Right now that judgment isn't being shaped in your favour.\n\nWe design and build Webflow websites for law firms. Would a brief conversation this week be worthwhile?\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The 8-second decision, different angle, the cost of a weak first impression",
        "subject": "what a prospective client decides before they call you",
        "body": "Hi [First Name],\n\nA brief follow-up.\n\nResearch consistently shows that visitors to a professional services website make a trust judgment within the first few seconds. Three things shape that judgment immediately: whether the design communicates authority, whether the firm's specialism is instantly clear, and whether there is an obvious and low-friction next step.\n\nWhen any of those three are weak, a qualified prospect doesn't call, they move to the next firm on their list. That cost never appears on any report.\n\nI'd be glad to provide a free honest assessment of [Firm Name]'s site.\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, one specific actionable insight for law firms",
        "subject": "one thing on [Firm Name]'s site worth changing",
        "body": "Hi [First Name],\n\nOne final note, and I'll make it useful.\n\nThe most common missed opportunity on law firm websites: the contact page asks only for name, email, and message. Adding a single intake question, 'What type of legal matter are you enquiring about?', does two things simultaneously. It qualifies the enquiry before it reaches your team. And it signals to the prospective client that the firm takes their matter seriously from the very first moment of contact.\n\nA small change. A meaningful difference in the quality of inbound enquiries.\n\nHappy to show what this looks like on [Firm Name]'s site specifically.\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Formal final close, respectful, leaves the door open",
        "subject": "a final note from Flowtive",
        "body": "Hi [First Name],\n\nLast note from me, I won't take up any more of your time.\n\nShould improving [Firm Name]'s online presence become a priority this year, I'd welcome the conversation.\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 5
      }
    ]
  },
  "Consulting": {
    "owner": "Emran",
    "buyerPsychology": "Intellectual and self-aware. Sells expertise and thinking. Responds to insight and challenges to their perspective. Dislikes being sold to, prefers to feel like they are discovering something. The website is a strategic positioning asset not a design project.",
    "tone": "Sharp and intellectual. Frames everything strategically. Treats the website as their most important pitch. Challenges their thinking without being confrontational.",
    "emails": [
      {
        "day": 1,
        "label": "Strategic miss, website as underselling positioning asset",
        "subject": "[Firm Name]'s website is leaving positioning on the table",
        "body": "Hi [First Name],\n\nSpent some time on [Firm Name]'s website.\n\nYou're in the business of helping clients see things differently. But the website reads like a services list rather than a point of view. There's no distinctive thinking, no methodology that makes a prospect feel you see their problem in a way no one else does.\n\nFor a consulting firm, the website is the first pitch. It should be doing more work than it currently is.\n\nWe build Webflow websites for consulting firms that do that work. Worth 15 minutes?\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The pre-meeting check, what clients do before they agree to meet",
        "subject": "what happens in the 90 seconds before your prospect agrees to meet",
        "body": "Hi [First Name],\n\nA brief follow-up.\n\nBefore almost every consulting engagement begins, a prospective client does a quiet check. They visit the website, look at LinkedIn, and form a view. What they're assessing isn't just capabilities, it's whether the firm looks like the kind of organisation worth the fee they're about to commit.\n\nMost consulting websites fail that check at the same three points: positioning too broad to be memorable, no visible evidence of the firm's thinking, and nothing on the page that creates any sense of urgency to reach out.\n\nWarm leads go cold at that moment. It's a quiet problem.\n\nHappy to do a free look at [Firm Name]'s site.\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the thought leadership gap that changes how prospects experience the site",
        "subject": "the positioning gap most consulting websites leave open",
        "body": "Hi [First Name],\n\nOne more, and something genuinely worth knowing.\n\nThe consulting firms that consistently win better mandates online share one thing their competitors don't: their website contains a piece of original thinking. A framework, a model, a clearly articulated perspective on a problem in their industry. Not service descriptions, an actual point of view.\n\nThis single addition changes how a prospect experiences the site. They arrive looking for a service provider and leave feeling like they've found a thought leader. That shift changes the conversation before it even starts.\n\nHappy to think through what that looks like for [Firm Name] specifically, no commitment required.\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Clean intellectual close, no pressure, respects their intelligence",
        "subject": "last note",
        "body": "Hi [First Name],\n\nLast one from me.\n\nIf repositioning [Firm Name]'s website becomes a priority this year, we'd be glad to be part of that conversation.\n\nEmran\nFounder, Flowtive\nflowtive.co",
        "wait": 5
      }
    ]
  },
  "SaaS": {
    "owner": "Milton",
    "buyerPsychology": "Data-aware and conversion-obsessed. Speaks in metrics. Responds to specifics not generics. Very short attention span. Respects directness.",
    "tone": "Founder-to-founder. Tight. Every sentence pulls its weight. No corporate language.",
    "emails": [
      {
        "day": 1,
        "label": "The 5-second test, failed",
        "subject": "quick one on [Company Name]'s homepage",
        "body": "Hi [First Name],\n\nRan a quick test on [Company Name]'s homepage, timed how long it took me to understand what you do, who it's for, and why I should start a trial.\n\nTook longer than 5 seconds. That's most of your top-of-funnel gone before anyone reads a word.\n\nValue prop above the fold is too feature-led. CTA asks for commitment before trust is built. Nothing creates urgency to sign up today.\n\nWe build SaaS websites on Webflow around the buyer journey. Quick call?\n\nMilton\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The funnel leak, where visitors are actually leaving",
        "subject": "where [Company Name]'s homepage is losing people",
        "body": "Hi [First Name],\n\nFollowing up, something specific.\n\nMost SaaS homepages lose visitors at three points: headline talks about features instead of outcomes, social proof is placed too far down the page where most visitors never reach it, and the primary CTA asks for too much before any trust is built.\n\nEach one is a quiet leak. Together they compound.\n\nHappy to do a free homepage audit, show you exactly where [Company Name] is bleeding visitors and what to fix first. No deck.\n\nMilton\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the one headline test",
        "subject": "a quick homepage test worth running this week",
        "body": "Hi [First Name],\n\nOne more, something you can test this week regardless of whether we work together.\n\nReplace your current headline with this structure: '[Outcome] for [Specific Customer] without [Main Friction]'. Then A/B test it against what you have now for two weeks.\n\nThis single change consistently moves trial conversion rates by 10 to 20% for SaaS products. The reason: it speaks to what the customer gets rather than what the product does.\n\nHappy to draft a few headline options for [Company Name], no strings.\n\nMilton\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Clean exit",
        "subject": "leaving this here",
        "body": "Hi [First Name],\n\nLast one from me.\n\nWhen conversion rate improvements make it onto the roadmap, we'd love to be involved. Webflow, fast builds, built around the buyer.\n\nMilton\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Startup": {
    "owner": "Milton",
    "buyerPsychology": "Ambitious and fast-moving. Slightly defensive about the placeholder site. Responds to someone who gets startup context without being patronising.",
    "tone": "Founder-to-founder. Honest. Energetic. Shows you understand the pressure they're under.",
    "emails": [
      {
        "day": 1,
        "label": "The placeholder problem",
        "subject": "honest thought on [Company Name]'s site",
        "body": "Hi [First Name],\n\nCame across [Company Name], what you're building is genuinely interesting.\n\nBut the website still reads like a placeholder. It doesn't tell the story, doesn't create urgency, and doesn't make a visitor feel like they found something worth paying attention to.\n\nEvery investor or enterprise buyer checks the website before agreeing to anything. The site is doing due diligence for them, and right now it's not helping you pass.\n\nWe build Webflow sites for growth-stage startups. Worth a call?\n\nMilton\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The investor check",
        "subject": "what happens when an investor Googles [Company Name]",
        "body": "Hi [First Name],\n\nFollowing up.\n\nBefore most investors or enterprise buyers agree to a meeting, they spend 60 to 90 seconds on your site. They're not looking for everything, just one thing: does this team look like they know where they're going?\n\nMost early-stage startup sites don't pass that test. Not because the team isn't ready, usually the team is way ahead of the website. But perception shapes pipeline.\n\nHappy to do a free look at [Company Name]'s site, honest, no pitch.\n\nMilton\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the narrative gap",
        "subject": "the story [Company Name]'s website isn't telling",
        "body": "Hi [First Name],\n\nOne more, something useful regardless.\n\nThe most common gap on startup websites: the problem being solved isn't stated clearly enough for someone who doesn't already know the space. Every homepage should answer these three things in the first scroll: what problem exists, why it matters, and why this team is the one to fix it.\n\nMost founders write for people who already get it. The best startup websites write for the person who is deciding whether to get it.\n\nHappy to take a look at how [Company Name]'s story lands on someone new to the space.\n\nMilton\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Open door close",
        "subject": "still here when the timing is right",
        "body": "Hi [First Name],\n\nLast one, completely understand if now isn't the moment.\n\nWhen [Company Name] is ready to build a site that matches where you're heading, we'd love to be part of that.\n\nMilton\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Restaurant & Food": {
    "owner": "Milton",
    "buyerPsychology": "Proud of the experience. Passionate about food. Time-poor. Responds to someone who clearly visited the site and noticed the gap between the real experience and how it comes across online.",
    "tone": "Warm, sensory, direct. Makes them feel the gap between their actual experience and how the website represents it.",
    "emails": [
      {
        "day": 1,
        "label": "The appetite gap",
        "subject": "your restaurant doesn't come through on the website, [First Name]",
        "body": "Hi [First Name],\n\nSpent time on [Restaurant Name]'s website this morning.\n\nThe experience you offer is clearly something special, but the website doesn't make someone feel that. It's slow on mobile, the menu isn't presented in a way that makes the food look irresistible, and getting to the reservation button has too many steps.\n\nMost guests discover restaurants on their phones. If the site doesn't make them want to be there tonight, they move on.\n\nWe build Webflow restaurant websites built around one thing, getting people to the table.\n\nQuick call?\n\nMilton\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The mobile moment",
        "subject": "where [Restaurant Name] is losing reservations",
        "body": "Hi [First Name],\n\nFollowing up.\n\nMost restaurant bookings start on a phone, a quick search, a tap on the first result, a snap decision. Three things decide that in seconds: how fast the site loads, how the photography looks on a small screen, and how easy it is to reserve without leaving the page.\n\nWhen any of those disappoint, the guest doesn't call, they scroll to the next option.\n\nHappy to do a free look at [Restaurant Name]'s site, honest, no pitch.\n\nMilton\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the menu presentation problem",
        "subject": "one thing every great restaurant website gets right",
        "body": "Hi [First Name],\n\nOne more, something worth knowing.\n\nThe restaurants with the highest online booking conversion share one thing: the menu on the website doesn't just list dishes, it sells them. Short descriptive lines that create appetite. Photography that makes a specific dish look unmissable. A layout that guides the eye rather than presenting a wall of text.\n\nMost restaurant websites treat the menu as information. The best ones treat it as their strongest sales page.\n\nHappy to show what that looks like for [Restaurant Name] specifically.\n\nMilton\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Warm close",
        "subject": "last one from me",
        "body": "Hi [First Name],\n\nLast note from me.\n\nWhen [Restaurant Name] is ready for a website that does the experience proper justice, we'd love to build it.\n\nMilton\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Marketing & Advertising": {
    "owner": "Mugdho",
    "buyerPsychology": "Self-aware and slightly embarrassed by their own site. The irony angle lands hard. Competitive and respond to the idea that their site makes them look less capable than they are.",
    "tone": "Wry and collegial. Lean into the irony without being smug. Peer speaks to peer.",
    "emails": [
      {
        "day": 1,
        "label": "The cobbler's shoes",
        "subject": "the marketing agency with a website that doesn't market",
        "body": "Hi [First Name],\n\nHad to say something after looking at [Agency Name]'s website.\n\nYou help clients grow through better digital experiences every day. But your own site isn't doing that for you. The positioning could belong to any agency in any city. The work is buried three clicks deep. And nothing makes a visitor feel like they found the team they've been looking for.\n\nEvery prospect Googles you before the first meeting. What they find shapes what they're willing to pay.\n\nWe rebuild marketing agency sites on Webflow that actually practice what you preach. Worth 15 minutes?\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The prospect's first impression",
        "subject": "what a new prospect sees before they meet you",
        "body": "Hi [First Name],\n\nFollowing up.\n\nThere's a simple test every agency website either passes or fails. A new prospect lands on it and asks one question: does this agency look like the kind of team I want working on my brand?\n\nMost fail at the same three points, a homepage that doesn't differentiate in any meaningful way, case studies that describe the work without making the reader feel the impact, and no compelling reason to reach out today.\n\nThe irony is that fixing these is exactly what you do for clients.\n\nHappy to do a free honest look at [Agency Name]'s site, no strings.\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the case study problem",
        "subject": "why your case studies aren't converting visitors into enquiries",
        "body": "Hi [First Name],\n\nOne more, something specific.\n\nThe most underperforming part of most agency websites: case studies written for the client who already agreed to the project rather than the prospect who is still deciding. They focus on what was done instead of what changed for the client as a result.\n\nA simple reframe, lead each case study with the before state, the obstacle, and the measurable outcome, turns a portfolio piece into a sales asset.\n\nHappy to show what that looks like for one of [Agency Name]'s existing case studies as a free example.\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Clean exit",
        "subject": "last one from me",
        "body": "Hi [First Name],\n\nLast note, leaving it here.\n\nWhen [Agency Name]'s website rises to the top of the list, we'd love to be the ones to build it.\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Finance & Accounting": {
    "owner": "Mugdho",
    "buyerPsychology": "Cautious, trust-led, highly rational. Won't respond to hype. Responds to credibility, specificity, and evidence of understanding their world.",
    "tone": "Measured, formal, precise. Mirrors the way they communicate. Substance over style.",
    "emails": [
      {
        "day": 1,
        "label": "Trust established before first contact",
        "subject": "a note on [Firm Name]'s website",
        "body": "Hi [First Name],\n\nReviewed [Firm Name]'s website this morning.\n\nIn financial services, a prospective client forms a view of your firm before they ever speak to anyone. The website is where that view starts, and right now it's not working as hard as it should. The design reads as dated rather than precise. Services are described as outputs rather than outcomes. And there's no clear path for someone who's ready to engage.\n\nWe build Webflow websites for finance and accounting firms that establish authority on arrival.\n\nWould a brief conversation this week be worthwhile?\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The invisible revenue cost",
        "subject": "the business that leaves quietly through a weak website",
        "body": "Hi [First Name],\n\nA brief follow-up.\n\nThe cost of a weak website in professional services never appears in a report. It shows up as referrals that went cold after someone Googled the firm. Inbound leads that chose a competitor whose site communicated more confidence. Prospects who simply never reached out.\n\nThe root cause is usually the same, a design that doesn't communicate modernity, service descriptions that don't speak to outcomes, and no clear signal that this is the right firm for this type of client.\n\nHappy to share a free honest assessment of [Firm Name]'s site.\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the outcomes language shift",
        "subject": "one language change that improves financial services websites significantly",
        "body": "Hi [First Name],\n\nOne more, something actionable.\n\nThe most common gap on finance and accounting firm websites: service pages describe what the firm does rather than what the client achieves. 'Tax planning and compliance' versus 'Reduce your tax liability and stay ahead of HMRC without the stress.' Same service. Completely different impact on a prospective client reading the page.\n\nThis single shift, from service language to outcome language, consistently improves enquiry rates from website visitors.\n\nHappy to apply this to one of [Firm Name]'s service pages as a free example.\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Formal close",
        "subject": "a final note from Flowtive",
        "body": "Hi [First Name],\n\nLast note from me.\n\nShould improving [Firm Name]'s web presence become a priority this year, I'd welcome the conversation.\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Fitness & Gym": {
    "owner": "Mugdho",
    "buyerPsychology": "Passionate about their community. Competitive locally. Very mobile-aware. Responds to direct specific observations about what's actually costing them members.",
    "tone": "Direct and energetic. Mobile-first framing. Speaks to the business problem not just the design problem.",
    "emails": [
      {
        "day": 1,
        "label": "The phone test",
        "subject": "pulled up [Gym Name] on my phone, here's what I found",
        "body": "Hi [First Name],\n\nChecked [Gym Name]'s website on my phone this morning, the way a potential new member would.\n\nIt's slow, finding the class schedule takes too long, and the page doesn't have the energy that makes someone want to walk through the door. Most gym sign-ups happen on mobile after a quick search. If the experience disappoints in those first seconds, that person signs up somewhere else.\n\nWe build Webflow gym websites that are fast, look the part on mobile, and are built around getting people through the door.\n\nWorth a quick call?\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The membership leak",
        "subject": "where [Gym Name] is losing members it shouldn't be",
        "body": "Hi [First Name],\n\nFollowing up.\n\nGym memberships are typically decided fast, someone has a moment of motivation, searches on their phone, lands on your site, and either commits or doesn't. Three things kill that moment consistently: slow load on mobile, pricing and class info buried rather than front and centre, and a page that doesn't visually communicate the energy of the gym.\n\nNone of these are big problems. Together they're costing memberships every week.\n\nFree look at [Gym Name]'s site, no pitch, just honest feedback.\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the urgency problem",
        "subject": "the one thing missing from most gym websites",
        "body": "Hi [First Name],\n\nOne more, something specific.\n\nThe gyms with the best online sign-up rates share one thing their competitors don't: they make the visitor feel that joining today is better than joining next week. A limited new member offer, a class starting soon, a community that's currently active, something that creates urgency without feeling pushy.\n\nMost gym websites are static. The best ones feel alive.\n\nHappy to show what that looks like for [Gym Name], no strings.\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Energetic close",
        "subject": "last one from me",
        "body": "Hi [First Name],\n\nLast note from me.\n\nWhen [Gym Name] is ready for a website that works as hard as the people who train there, we'd love to build it.\n\nMugdho\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Tech & IT Services": {
    "owner": "Ashik",
    "buyerPsychology": "Rational, sceptical, busy. Has heard every vendor pitch. Responds to specificity and differentiation arguments. Dislikes being told what they already know.",
    "tone": "Direct and no-nonsense. Differentiation-led. Challenges without being rude.",
    "emails": [
      {
        "day": 1,
        "label": "The sameness problem",
        "subject": "opened your site and three competitors, couldn't tell them apart",
        "body": "Hi [First Name],\n\nOpened [Company Name]'s website alongside three competitors this morning.\n\nHonestly, I couldn't tell them apart. Same layout, similar service descriptions, same stock imagery. A prospective client doing the same comparison has no clear reason to choose you.\n\nIn IT services the work speaks for itself in a meeting. But the website has to get you into the room first, and right now it isn't making the case for why [Company Name] specifically.\n\nWe build Webflow sites for IT companies that communicate a real point of difference.\n\n15 minutes this week?\n\nAshik\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "Why stronger companies lose to weaker ones",
        "subject": "why technically stronger IT companies lose leads to weaker ones",
        "body": "Hi [First Name],\n\nFollowing up, something worth sharing.\n\nTechnically excellent IT firms lose qualified leads to weaker competitors consistently. It almost always comes down to how the two firms present themselves online, not the actual quality of their service.\n\nThe gap sits in three places: leading with capabilities instead of business outcomes, no differentiating story that makes the firm stick in the mind, and an enquiry process with too many steps.\n\nHappy to do a free look at [Company Name]'s site, honest, no strings.\n\nAshik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the outcomes language shift",
        "subject": "the framing that separates IT websites that win from those that don't",
        "body": "Hi [First Name],\n\nOne more, something you can apply right now.\n\nThe IT companies that consistently win new business online make one framing shift across their whole website: they replace capability language with outcome language. Not 'managed IT support and cybersecurity', 'Your systems stay up, your data stays safe, and your team can focus on the work that matters.'\n\nSame service. Completely different impact on a prospective client reading the page.\n\nHappy to show how this applies to [Company Name]'s homepage specifically.\n\nAshik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Clean exit",
        "subject": "last note from Flowtive",
        "body": "Hi [First Name],\n\nLast note from me.\n\nWhen [Company Name] is ready to stand clearly apart from every other IT firm in your market, we'd be glad to help.\n\nAshik\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Photography & Creative": {
    "owner": "Ashik",
    "buyerPsychology": "Proud of their craft. Sensitive to dismissal of the work. Responds to genuine appreciation paired with honest assessment of how it's being presented.",
    "tone": "Craft-respecting. Honest about the presentation gap without dismissing the work. Visual language.",
    "emails": [
      {
        "day": 1,
        "label": "The presentation gap",
        "subject": "spent time on your portfolio, the work deserves better",
        "body": "Hi [First Name],\n\nWent through [Studio Name]'s portfolio properly this morning.\n\nThe photography is genuinely impressive, there are shots in there that stopped me. But the website isn't presenting it the way it deserves. It loads slowly on mobile, the portfolio isn't sequenced to tell a clear story, and there's no natural moment where admiration turns into an enquiry.\n\nStrong work presented poorly loses projects to weaker work presented well.\n\nWe build Webflow portfolio sites for creative studios, fast, precise, built to convert.\n\nQuick call?\n\nAshik\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "How a client reads a portfolio",
        "subject": "what a client is actually looking for in your portfolio",
        "body": "Hi [First Name],\n\nFollowing up, something worth knowing.\n\nWhen a new client visits a creative studio website, they're asking three questions even if they can't articulate them: what does this studio specialise in, have they worked with clients at my level, and if I reach out do I know what happens next?\n\nMost portfolio sites leave all three unanswered. The work is there, it's just not presented in a way that guides the visitor to the right conclusion.\n\nHappy to do a free look at [Studio Name]'s site, no pitch, just honest feedback.\n\nAshik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, portfolio sequencing",
        "subject": "the sequencing change that gets more enquiries from portfolio sites",
        "body": "Hi [First Name],\n\nOne more, something specific.\n\nThe most common missed opportunity on creative portfolio sites: work is shown in chronological order or by category rather than by strategic intent. The portfolio should open with the work you want to be hired to do next, not the work you did first.\n\nResequencing a portfolio around the ideal client brief rather than the project timeline consistently increases the quality of inbound enquiries.\n\nHappy to think through what that looks like for [Studio Name]'s portfolio specifically.\n\nAshik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Creative close",
        "subject": "last one from me, [First Name]",
        "body": "Hi [First Name],\n\nLast note from me.\n\nWhen [Studio Name] is ready for a website that gives the work the stage it deserves, we'd love to build it.\n\nAshik\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Beauty & Wellness": {
    "owner": "Ashik",
    "buyerPsychology": "Experience-led and brand-conscious. Frustrated when the online presence doesn't match the in-person experience. Responds to someone who specifically noticed that gap.",
    "tone": "Premium and direct. Speaks to the brand gap and the lost bookings in a way that feels personal not clinical.",
    "emails": [
      {
        "day": 1,
        "label": "The brand gap",
        "subject": "the website doesn't match the experience you're delivering",
        "body": "Hi [First Name],\n\nVisited [Business Name]'s website on my phone this morning.\n\nThe experience you offer is clearly premium, but the website doesn't communicate that before someone books. It's slow, services and pricing aren't easy to find, and the visual presentation doesn't create the feeling of stepping into somewhere special.\n\nMost bookings are decided in a 30-second window on a phone. If the site doesn't close that decision, the booking goes somewhere else.\n\nWe build Webflow beauty and wellness websites that feel as good as the experience they represent.\n\nWorth a quick call?\n\nAshik\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The 30-second booking window",
        "subject": "the 30 seconds between a visitor and a booking",
        "body": "Hi [First Name],\n\nFollowing up.\n\nThere's a specific moment that determines whether someone books or doesn't, they've landed on your site, they're interested, and deciding whether to commit now or think about it later. In almost every case, later means never.\n\nThree things decide that moment: whether the site loads fast enough that they don't get impatient, whether services and pricing are immediately visible, and whether the visual feel creates enough desire that they don't want to leave.\n\nHappy to do a free look at [Business Name]'s site, honest, no strings.\n\nAshik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the social proof gap",
        "subject": "the trust element most beauty websites are missing",
        "body": "Hi [First Name],\n\nOne more, something actionable.\n\nThe beauty and wellness businesses with the highest online booking rates share one element most competitors don't use well: real client transformation stories placed where they can be seen before the booking decision is made, not buried in a separate reviews tab.\n\nA before and after result, a short client quote, or a visible star rating near the booking button can increase conversions meaningfully. It's social proof placed at the point of decision rather than after it.\n\nHappy to think through where this fits on [Business Name]'s site, no strings.\n\nAshik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Premium close",
        "subject": "last one from me",
        "body": "Hi [First Name],\n\nLast one from me.\n\nWhen [Business Name] is ready for a website as polished as the experience you deliver, we'd love to build it.\n\nAshik\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Healthcare": {
    "owner": "Sadman",
    "buyerPsychology": "Trust and safety are paramount. Cautious about anything that sounds like a hard sell. Responds to patient-first framing and genuine understanding of the trust dynamic in healthcare.",
    "tone": "Warm formality. Professional but not cold. Patient-centric language throughout.",
    "emails": [
      {
        "day": 1,
        "label": "Patient trust starts before first contact",
        "subject": "a note on [Practice Name]'s website",
        "body": "Hi [First Name],\n\nTook some time on [Practice Name]'s website this morning.\n\nFor a new patient, the website is the first impression of the practice, and it shapes their decision to book before they've spoken to anyone on your team. Right now it doesn't communicate the level of care you provide. The design feels dated, services aren't described in plain patient language, and the path to booking isn't as clear as it should be.\n\nPatients who feel uncertain don't call, they find a different practice.\n\nWe build Webflow websites for private healthcare practices that establish trust immediately.\n\nWould a brief conversation this week be worthwhile?\n\nSadman\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The 8-second trust window",
        "subject": "what a patient decides in the first moment on your site",
        "body": "Hi [First Name],\n\nA brief follow-up.\n\nIn private healthcare, a patient makes a judgment very quickly, and that judgment is almost entirely about trust. Three things determine it: whether the design feels modern and professional, whether services are described in plain language that answers the patient's real question, and whether there's a clear welcoming way to take the next step.\n\nMost private clinic websites fall short on at least two. The patient who feels uncertain simply chooses a practice whose website gave them more confidence.\n\nHappy to share a free honest assessment of [Practice Name]'s website.\n\nSadman\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the patient language shift",
        "subject": "one language change that makes a real difference on healthcare websites",
        "body": "Hi [First Name],\n\nOne more, something specific.\n\nThe private practices that consistently attract new patients through their website share one characteristic: they write for the patient's fear, not the clinician's vocabulary. 'Joint pain and mobility issues' versus 'If your knees hurt when you climb stairs or sit for long periods, we can help.'\n\nSame condition. Completely different emotional impact on someone sitting at home wondering whether to make an appointment.\n\nHappy to apply this to one of [Practice Name]'s service pages as a free example.\n\nSadman\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Warm formal close",
        "subject": "a final note from Flowtive",
        "body": "Hi [First Name],\n\nLast note from me.\n\nIf improving [Practice Name]'s website becomes a priority this year, we'd be glad to help build something that reflects the standard of care your team provides.\n\nSadman\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Dental & Cosmetic": {
    "owner": "Sadman",
    "buyerPsychology": "Results-oriented. Before/after results are their biggest asset. Competitive locally. High-value cosmetic cases are the goal not routine check-ups.",
    "tone": "Results-focused. Specific about high-value cases. Speaks to the cosmetic side not the clinical side.",
    "emails": [
      {
        "day": 1,
        "label": "The high-value case gap",
        "subject": "[Practice Name] may be losing its best cases to the website",
        "body": "Hi [First Name],\n\nVisited [Practice Name]'s website this morning.\n\nIn cosmetic dentistry, before and after results are the most powerful thing a practice has. A prospective patient visits the site, looks for results that match what they want to achieve, and books a consultation if they feel that confidence. Right now the website isn't giving them that moment clearly enough.\n\nThe high-value cases, veneers, smile makeovers, implants, go to practices whose websites make patients feel certain before they even call.\n\nWe build Webflow dental websites that put results front and centre. Worth a call?\n\nSadman\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "Where high-value cases actually go",
        "subject": "why high-value cosmetic cases choose one practice over another",
        "body": "Hi [First Name],\n\nFollowing up.\n\nHigh-value cosmetic cases don't go to the best dentist in the area. They go to the practice whose website made the patient feel most confident. Three things drive that confidence: a design that looks as premium as the treatment on offer, before and after results that are visible and emotionally compelling, and a clear easy path to booking a consultation.\n\nMost dental websites are missing at least two of these.\n\nHappy to do a free look at [Practice Name]'s site, honest, no strings.\n\nSadman\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the transformation story format",
        "subject": "the before and after format that converts dental prospects",
        "body": "Hi [First Name],\n\nOne more, something specific.\n\nThe dental practices with the best cosmetic case conversion online don't just show before and after photos. They tell a brief transformation story: the patient's concern, why they chose the practice, what the process felt like, and how they feel about the result now.\n\nTwo to three sentences alongside the images. That's all it takes to turn a photograph into a trust-builder.\n\nHappy to show what this looks like applied to one of [Practice Name]'s existing cases.\n\nSadman\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Results-led close",
        "subject": "last note from Flowtive",
        "body": "Hi [First Name],\n\nLast one from me.\n\nWhen [Practice Name] is ready to build a website that wins more of the high-value cases your team deserves, we'd love to make that happen.\n\nSadman\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Hospitality & Hotels": {
    "owner": "Sadman",
    "buyerPsychology": "OTA commission is a genuine pain point. Revenue-conscious. Proud of the property. Responds to revenue language and someone who understands the direct booking challenge.",
    "tone": "Revenue-led and story-aware. Commission costs framed as a real business problem not just a design issue.",
    "emails": [
      {
        "day": 1,
        "label": "The OTA commission problem",
        "subject": "[Hotel Name] is paying commission it shouldn't have to pay",
        "body": "Hi [First Name],\n\nVisited [Hotel Name]'s website this morning.\n\nEvery booking through Booking.com or Expedia costs between 15 and 25% in commission. That revenue stays with the hotel when a guest books directly, but only if the website is compelling enough for a guest to choose you over a platform they already trust.\n\nRight now the property's character isn't coming through clearly enough, and the direct booking experience is harder than it should be.\n\nWe build Webflow hotel websites with one goal, driving direct bookings. Quick call?\n\nSadman\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "Why guests choose the platform",
        "subject": "why guests choose Booking.com when they could book direct",
        "body": "Hi [First Name],\n\nFollowing up.\n\nGuests choose OTAs over direct booking for one reason, the platform feels safer and easier in the moment. To win that comparison a hotel website needs to do three things: create enough emotional desire that a guest doesn't feel the need to compare, make direct booking as smooth or smoother than a platform, and communicate the unique character of the property clearly enough to justify choosing it specifically.\n\nShifting even a portion of OTA bookings to direct has a real effect on margin.\n\nHappy to do a free look at [Hotel Name]'s site, honest, no pitch.\n\nSadman\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the storytelling gap",
        "subject": "the one thing OTAs can't give you that your website can",
        "body": "Hi [First Name],\n\nOne more, something specific.\n\nThe one thing an OTA listing can never give a hotel is its full story. The origin of the property, the people behind it, the specific experience that makes it unlike anything else in the area. Guests who book directly are often choosing to do so because the hotel's website made them feel a connection that a platform listing cannot.\n\nMost hotel websites underuse this. A well-told story on the About or Experience page consistently increases direct booking conversion.\n\nHappy to think through what [Hotel Name]'s story looks like online, no strings.\n\nSadman\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Revenue close",
        "subject": "last note from Flowtive",
        "body": "Hi [First Name],\n\nLast one from me.\n\nWhen [Hotel Name] is ready to reduce commission dependency and drive more direct bookings, we'd love to build the site that makes that happen.\n\nSadman\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Real Estate": {
    "owner": "Rafik",
    "buyerPsychology": "Relationship-driven but data-aware. Website is their storefront. Competitive in a crowded market. Responds to someone who understands the first showing happens online.",
    "tone": "Premium, mobile-first framing. Speaks to competition and the first impression problem.",
    "emails": [
      {
        "day": 1,
        "label": "The digital first showing",
        "subject": "the first showing is happening online, and it's not winning",
        "body": "Hi [First Name],\n\nSpent some time on [Agency Name]'s website this morning.\n\nIn real estate, a buyer or seller forms an opinion about your agency before they speak to anyone. The website is the first showing, and right now it's slow on mobile, listings are harder to navigate than they should be, and there's nothing that gives a visitor a clear reason to choose [Agency Name] over the next firm they'll Google.\n\nWe build Webflow real estate websites that look premium, present properties properly, and convert visitors into qualified leads.\n\nWorth 15 minutes?\n\nRafik\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "Where transactions are being lost",
        "subject": "where [Agency Name] is losing leads before first contact",
        "body": "Hi [First Name],\n\nFollowing up.\n\nMost real estate leads are lost before anyone picks up the phone, at three points online. The site isn't fast on mobile where most property searches happen. Photography isn't presented in a way that creates emotional connection. And there's no clear frictionless lead capture that makes it easy for a motivated buyer or seller to take action right now.\n\nEach of these is a separate leak. Together they represent transactions going to competitors.\n\nHappy to do a free honest look at [Agency Name]'s site, no strings.\n\nRafik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the emotional listing gap",
        "subject": "why some property listings convert and others don't",
        "body": "Hi [First Name],\n\nOne more, something worth applying.\n\nThe highest-converting property listings online share one thing: they sell the life, not just the home. Not '3 bedroom semi-detached with garden', 'A quiet street five minutes from the park, with enough space for the life you're building.'\n\nSame property. Completely different emotional response from a buyer scrolling through listings on their phone.\n\nHappy to show what this looks like applied to one of [Agency Name]'s current listings, no strings.\n\nRafik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Market-led close",
        "subject": "last note from Flowtive",
        "body": "Hi [First Name],\n\nLast one from me.\n\nWhen [Agency Name] is ready to build a website that sets you clearly apart in your market, we'd love to be the ones to build it.\n\nRafik\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Travel & Tourism": {
    "owner": "Rafik",
    "buyerPsychology": "Passionate about experiences. Frustrated competing with OTAs. Responds to someone who understands the battle is won or lost on trust and inspiration not price.",
    "tone": "Aspirational and trust-led. Speaks to OTA competition in emotional not just commercial terms.",
    "emails": [
      {
        "day": 1,
        "label": "The inspiration gap",
        "subject": "your website isn't making me want to travel with you, [First Name]",
        "body": "Hi [First Name],\n\nSpent time on [Agency Name]'s website this morning.\n\nTravel is one of the most emotionally-driven purchases a person makes online. A great travel agency website needs to do two things simultaneously, make the destination feel irresistible, and make the agency feel like the only sensible way to get there. Right now the site isn't quite achieving either.\n\nThe photography doesn't create enough desire, the agency's expertise isn't communicated compellingly, and the enquiry process has too much friction for someone still in the dreaming stage.\n\nWe build Webflow travel agency websites that inspire and convert. Quick call?\n\nRafik\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "Why they choose the platform",
        "subject": "what makes someone choose Expedia over booking with you",
        "body": "Hi [First Name],\n\nFollowing up.\n\nTravellers choose platforms over agencies for two reasons, trust and ease. The platform feels safer because it's familiar, and easier because the booking flow has been optimised by a billion-dollar UX team.\n\nTo win against that, a travel agency website has to do one thing the platform can't: communicate genuine human expertise and personalised care in a way that makes a traveller feel self-booking is actually the riskier choice.\n\nMost agency sites don't get there, the expertise is present but the website doesn't show it compellingly.\n\nFree look at [Agency Name]'s site, honest, no pitch.\n\nRafik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, the expertise signal",
        "subject": "the one thing your website should show that Expedia never can",
        "body": "Hi [First Name],\n\nOne more, something specific.\n\nThe travel agencies that consistently win bookings over OTAs communicate one thing the platforms structurally cannot: the person behind the recommendation. A short genuine bio, a specific trip they know better than anyone, a destination insight that only comes from having been there, these signals build a level of trust that no algorithm can replicate.\n\nMost agency websites bury this or omit it entirely. The best ones put it front and centre.\n\nHappy to think through how [Agency Name] presents this on the site, no strings.\n\nRafik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Aspirational close",
        "subject": "last note from Flowtive",
        "body": "Hi [First Name],\n\nLast one from me.\n\nWhen [Agency Name] is ready for a website that makes every visitor want to book, we'd love to build it.\n\nRafik\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  },
  "Architecture & Interior": {
    "owner": "Rafik",
    "buyerPsychology": "Design-literate and proud. Will instantly judge quality of anyone reaching out by how they present themselves. Responds to genuine engagement with the work before writing.",
    "tone": "Refined and specific. Treats them as the design expert they are. No generic design language.",
    "emails": [
      {
        "day": 1,
        "label": "Genuine engagement, presentation gap",
        "subject": "looked at [Firm Name]'s portfolio properly, the work deserves more",
        "body": "Hi [First Name],\n\nSpent real time on [Firm Name]'s portfolio this morning, not a skim.\n\nThe quality of the work is genuinely striking. But the website isn't presenting it at the level it deserves. It loads slowly, projects aren't sequenced in a way that builds a cumulative picture of the firm's creative vision, and a prospective client arriving for the first time has no clear reason to reach out rather than continue browsing.\n\nHigh-budget clients choose design firms on gut, and that gut is formed in the first 60 seconds on the website.\n\nWe build Webflow portfolio sites for architecture and interior design firms. Worth 15 minutes?\n\nRafik\nFlowtive · flowtive.co",
        "wait": 0
      },
      {
        "day": 5,
        "label": "The high-budget client's first minute",
        "subject": "what a high-budget client looks for in your portfolio",
        "body": "Hi [First Name],\n\nFollowing up.\n\nWhen a client with a serious budget visits a design firm website, they assess three things in the first minute: whether the firm has a clear and distinctive creative point of view, whether there's evidence of work at the scale they're considering, and whether the website itself communicates the kind of taste they'd expect from a firm they're about to invest in.\n\nMost architecture and interior design websites fall short on at least one. The consequence is projects going to firms whose websites make a stronger first impression, regardless of whose actual work is better.\n\nHappy to do a free look at [Firm Name]'s site, honest, no strings.\n\nRafik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 9,
        "label": "Value add, project narrative gap",
        "subject": "what's missing from most architecture portfolio pages",
        "body": "Hi [First Name],\n\nOne more, something specific.\n\nThe architecture and interior design firms that consistently win the right projects online share one thing: every portfolio project tells a brief story, the client's original brief, the design challenge, the decision that defined the outcome. Not just photographs and a title.\n\nA prospective client with a project in mind isn't just looking at the images. They're trying to understand how the firm thinks. That narrative is the thing that answers the question.\n\nHappy to show what this looks like applied to one of [Firm Name]'s existing projects.\n\nRafik\nFlowtive · flowtive.co",
        "wait": 4
      },
      {
        "day": 14,
        "label": "Craft close",
        "subject": "last note from Flowtive",
        "body": "Hi [First Name],\n\nLast one from me.\n\nWhen [Firm Name] is ready for a website that attracts the calibre of projects your work deserves, we'd love to be involved.\n\nRafik\nFlowtive · flowtive.co",
        "wait": 5
      }
    ]
  }
};

var GOLDEN_RULES = [
  "Email 1 is under 100 words. If it is longer, cut it. Every sentence that is not earning its place is working against you.",
  "The subject line must sound like a real human wrote it. Would you send this subject line in a normal work email? If not, rewrite it.",
  "Never start a cold email with I. Open with an observation, a time reference, or an action. Spam filters and humans both react better.",
  "Before sending Email 1, visit their website and add one specific observation. Not generic. Something you actually noticed. This single habit doubles reply rates.",
  "Never send with a bracket still in the email. [First Name] left in is an instant delete and signals you did not check before sending.",
  "Send Tuesday to Thursday only. 6pm to 8pm Bangladesh time hits USA East Coast at 8am to 10am, their most productive email window.",
  "Maximum 20 emails per day. Maximum 5 to 7 per hour. Never batch send all at once.",
  "Log the send date in the Email 1 column of the sheet the moment you hit send. Not later. Now.",
  "Email 2, 3, and 4 exist because 42% of replies do not come from Email 1. Never skip the follow-up sequence.",
  "One CTA per email. One question. One ask. Never two."
];

/* Email-specific runtime state (escapeHtml lives in util.js since it's generic) */
var emailOverrides = {}; // key: ind+'::'+idx → {subject, body, editedBy, editedAt}
var _currentOpenInd = null;
var _emailListener = false;

function getEffectiveEmail(ind, idx){
  var def = EMAIL_TEMPLATES[ind] && EMAIL_TEMPLATES[ind].emails[idx];
  if(!def) return null;
  var override = emailOverrides[ind+'::'+idx];
  if(!override) return {subject:def.subject, body:def.body, label:def.label, day:def.day, wait:def.wait, edited:false};
  return {subject:override.subject, body:override.body, label:def.label, day:def.day, wait:def.wait, edited:true, editedBy:override.editedBy, editedAt:override.editedAt};
}

function renderEmailCard(ind, idx){
  var e = getEffectiveEmail(ind, idx);
  if(!e) return '';
  var dotCls = 'd'+(idx+1);
  var safeInd = ind.replace(/'/g,"\\'");
  var waitHtml = (e.wait && e.wait > 0) ? '<div class="email-wait" data-email-sep="'+idx+'">Wait '+e.wait+' days</div>' : '';
  var editedBadge = e.edited ? '<span class="email-edited-badge" title="'+(e.editedBy?'Edited by '+escapeHtml(e.editedBy):'Edited')+'">● Edited</span>' : '';
  return waitHtml +
    '<div class="email-tl-item" id="email-tl-'+idx+'">'+
      '<div class="email-tl-dot '+dotCls+'"></div>'+
      '<div class="email-card" id="email-card-'+idx+'">'+
        '<div class="email-card-head">'+
          '<span class="email-pill '+dotCls+'">'+escapeHtml(e.label)+' — Day '+e.day+'</span>'+
          editedBadge+
          '<button class="email-copy" onclick="copyEmail(\''+safeInd+'\','+idx+',this)" type="button">'+
            '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="4" y="4" width="8" height="9" rx="1"/><path d="M2 10V2a1 1 0 011-1h7"/></svg>'+
            '<span class="email-copy-label">Copy</span>'+
          '</button>'+
          '<button class="email-edit" onclick="editEmail(\''+safeInd+'\','+idx+')" type="button" title="Edit email">'+
            '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 1.5l3 3-8 8H1.5v-3z"/></svg>'+
            'Edit'+
          '</button>'+
        '</div>'+
        '<div class="email-subj-row"><span class="email-subj-label">Subject:</span><span class="email-subj-val">'+escapeHtml(e.subject)+'</span></div>'+
        '<div class="email-body">'+escapeHtml(e.body)+'</div>'+
      '</div>'+
    '</div>';
}

var _emailFromLibrary = false;
function openEmailModal(ind, fromLibrary){
  var data = EMAIL_TEMPLATES[ind];
  if(!data){ emailToast('No templates for '+ind); return; }
  _currentOpenInd = ind;
  _emailFromLibrary = !!fromLibrary;
  document.getElementById('email-modal-title').textContent = ind+' — Email Templates';
  document.getElementById('email-modal-sub').textContent = data.owner+' · '+data.tone;
  var backBtn = document.getElementById('email-modal-back');
  if(backBtn) backBtn.classList.toggle('app-hidden', !_emailFromLibrary);
  var body = document.getElementById('email-modal-body');
  var html = '';
  if(data.buyerPsychology){
    html += '<div class="buyer-psych"><div class="buyer-psych-label">Buyer psychology</div><div class="buyer-psych-text">'+escapeHtml(data.buyerPsychology)+'</div></div>';
  }
  html += '<div class="email-timeline">';
  data.emails.forEach(function(_, i){
    html += renderEmailCard(ind, i);
  });
  html += '</div>';
  body.innerHTML = html;
  body.scrollTop = 0;
  showEmailBackdrop('email-backdrop');
}

/* ── Backdrop show / hide with enter + exit animations ── */
function showEmailBackdrop(id){
  var bd = document.getElementById(id);
  if(!bd) return;
  bd.classList.remove('em-exiting');
  bd.classList.remove('app-hidden');
  // During a swap the swap logic owns the animation — skip the fresh-open fade.
  if(bd.classList.contains('swap-bg-transparent')) return;
  bd.classList.remove('em-entering');
  void bd.offsetWidth;
  bd.classList.add('em-entering');
  clearTimeout(bd._emEnterT);
  bd._emEnterT = setTimeout(function(){ bd.classList.remove('em-entering'); }, 260);
}

function hideEmailBackdrop(id){
  var bd = document.getElementById(id);
  if(!bd) return;
  if(bd.classList.contains('app-hidden')) return;
  bd.classList.remove('em-entering');
  bd.classList.add('em-exiting');
  clearTimeout(bd._emExitT);
  bd._emExitT = setTimeout(function(){
    bd.classList.add('app-hidden');
    bd.classList.remove('em-exiting');
  }, 200);
}

function backToEmailLibrary(){
  _emailFromLibrary = false;
  swapEmailBackdrops('email-backdrop', 'lib-backdrop', function(){
    openEmailLibrary();
  });
}

/* ── Smooth cross-fade between the two email backdrops ──
   Keeps a single dark backdrop visible the whole time by making the
   incoming one transparent until the outgoing backdrop is hidden. */
function swapEmailBackdrops(fromId, toId, openFn){
  var fromBd = document.getElementById(fromId);
  var toBd   = document.getElementById(toId);
  if(!fromBd || !toBd){ if(openFn) openFn(); return; }
  var fromModal = fromBd.querySelector('.email-modal');

  // Open destination with its backdrop momentarily transparent
  toBd.classList.add('swap-bg-transparent');
  openFn();
  var toModal = toBd.querySelector('.email-modal');
  if(toModal){
    toModal.classList.add('xfade-in');
  }

  // Animate the outgoing modal out
  if(fromModal) fromModal.classList.add('xfade-out');

  setTimeout(function(){
    fromBd.classList.add('app-hidden');
    if(fromModal) fromModal.classList.remove('xfade-out');
    toBd.classList.remove('swap-bg-transparent');
    if(toModal) toModal.classList.remove('xfade-in');
    closeGoldenRulesPop();
  }, 220);
}

function rerenderEmailCard(ind, idx){
  var tl = document.getElementById('email-tl-'+idx);
  if(!tl) return;
  // Remove preceding wait separator if present (to be re-rendered)
  var prev = tl.previousElementSibling;
  if(prev && prev.getAttribute && prev.getAttribute('data-email-sep') === String(idx)){
    prev.parentNode.removeChild(prev);
  }
  var temp = document.createElement('div');
  temp.innerHTML = renderEmailCard(ind, idx);
  var parent = tl.parentNode;
  // Insert any wait separator first (firstChild of temp is the separator if present)
  while(temp.firstChild){
    parent.insertBefore(temp.firstChild, tl);
  }
  parent.removeChild(tl);
}

function editEmail(ind, idx){
  var e = getEffectiveEmail(ind, idx);
  if(!e) return;
  var card = document.getElementById('email-card-'+idx);
  if(!card) return;
  var dotCls = 'd'+(idx+1);
  var safeInd = ind.replace(/'/g,"\\'");
  var subjAttr = String(e.subject).replace(/"/g,'&quot;').replace(/</g,'&lt;');
  card.innerHTML =
    '<div class="email-card-head">'+
      '<span class="email-pill '+dotCls+'">'+escapeHtml(e.label)+' — Day '+e.day+'</span>'+
      '<span style="font-size:11px;color:var(--muted);margin-left:4px">Editing…</span>'+
    '</div>'+
    '<label class="email-edit-label">Subject</label>'+
    '<input class="email-edit-input" id="edit-subj-'+idx+'" type="text" value="'+subjAttr+'">'+
    '<label class="email-edit-label">Body</label>'+
    '<textarea class="email-edit-textarea" id="edit-body-'+idx+'">'+escapeHtml(e.body)+'</textarea>'+
    '<div class="email-edit-actions">'+
      '<button class="email-edit-save" onclick="saveEmailEdit(\''+safeInd+'\','+idx+')" type="button">Save</button>'+
      '<button class="email-edit-cancel" onclick="cancelEmailEdit(\''+safeInd+'\','+idx+')" type="button">Cancel</button>'+
      (e.edited ? '<button class="email-edit-reset" onclick="resetEmailEdit(\''+safeInd+'\','+idx+')" type="button">Reset to default</button>' : '')+
    '</div>';
  var si = document.getElementById('edit-subj-'+idx); if(si) si.focus();
}

function saveEmailEdit(ind, idx){
  var subjEl = document.getElementById('edit-subj-'+idx);
  var bodyEl = document.getElementById('edit-body-'+idx);
  if(!subjEl || !bodyEl) return;
  var newSubj = subjEl.value.trim();
  var newBody = bodyEl.value.trim();
  if(!newSubj || !newBody){ emailToast('Subject and body cannot be empty'); return; }
  var def = EMAIL_TEMPLATES[ind] && EMAIL_TEMPLATES[ind].emails[idx];
  if(!def) return;
  var key = ind+'::'+idx;
  var isEdit = (newSubj !== def.subject || newBody !== def.body);
  if(!isEdit){
    delete emailOverrides[key];
  } else {
    emailOverrides[key] = {
      subject: newSubj,
      body: newBody,
      editedBy: currentUser ? currentUser.name : 'Unknown',
      editedAt: Date.now()
    };
  }
  saveEmailOverrides();
  rerenderEmailCard(ind, idx);
  emailToast('Email saved');
  if(isEdit && currentUser){
    logActivity(currentUser.name, 'email_edit', ind, null, null, {emailIdx: idx, emailDay: def.day});
  }
}

function cancelEmailEdit(ind, idx){
  rerenderEmailCard(ind, idx);
}

function resetEmailEdit(ind, idx){
  if(!confirm('Reset this email to the original template? The custom version will be removed for everyone.')) return;
  delete emailOverrides[ind+'::'+idx];
  saveEmailOverrides();
  rerenderEmailCard(ind, idx);
  emailToast('Email reset to default');
}

function saveEmailOverrides(){
  try{
    localStorage.setItem('flowtive_email_overrides_v1', JSON.stringify(emailOverrides));
  }catch(e){}
  if(firebaseReady && firebaseDb){
    setSyncing('syncing');
    firebaseDb.ref('flowtive_email_templates').set(emailOverrides).then(function(){
      setSyncing('live');
    }).catch(function(err){
      console.warn('Email templates sync failed:', err.message);
      setSyncing('error');
    });
  }
}

function closeEmailModal(e){
  if(e && e.target && e.target.id !== 'email-backdrop' && e.type === 'click') return;
  hideEmailBackdrop('email-backdrop');
  _currentOpenInd = null;
  _emailFromLibrary = false;
}

function copyEmail(ind, idx, btn){
  var e = getEffectiveEmail(ind, idx);
  if(!e) return;
  var text = 'Subject: '+e.subject+'\n\n'+e.body;
  var done = function(){
    btn.classList.add('copied');
    var lbl = btn.querySelector('.email-copy-label');
    var prev = lbl ? lbl.textContent : '';
    if(lbl) lbl.textContent = 'Copied';
    emailToast('Email copied — paste into your mail client');
    setTimeout(function(){
      btn.classList.remove('copied');
      if(lbl) lbl.textContent = prev || 'Copy';
    }, 1800);
    if(currentUser){
      logActivity(currentUser.name, 'email_copy', ind, null, null, {emailIdx: idx, emailDay: e.day});
    }
  };
  if(navigator.clipboard && navigator.clipboard.writeText){
    navigator.clipboard.writeText(text).then(done).catch(function(){ fallbackCopy(text); done(); });
  } else {
    fallbackCopy(text); done();
  }
}

function fallbackCopy(text){
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.position = 'fixed';
  ta.style.top = '-9999px';
  document.body.appendChild(ta);
  ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  document.body.removeChild(ta);
}

/* Email-modal-specific toast that uses the fixed #email-toast DOM element.
   Distinct from the generic showToast(msg, color) in util.js, which creates
   a fresh DOM element each time and supports a colour argument. */
var _toastTimer = null;
function emailToast(msg){
  var t = document.getElementById('email-toast');
  if(!t) return;
  t.textContent = msg;
  t.classList.add('show');
  if(_toastTimer) clearTimeout(_toastTimer);
  _toastTimer = setTimeout(function(){ t.classList.remove('show'); }, 2000);
}

function toggleGoldenRulesPop(e){
  if(e){ e.stopPropagation(); }
  var btn = document.getElementById('lib-info-btn');
  var pop = document.getElementById('lib-info-pop');
  var list = document.getElementById('lib-info-pop-list');
  if(!btn || !pop || !list) return;
  if(!list.childElementCount){
    GOLDEN_RULES.forEach(function(r, i){
      var li = document.createElement('li');
      li.innerHTML = '<span class="gr-num">'+(i+1)+'</span><span>'+escapeHtml(r)+'</span>';
      list.appendChild(li);
    });
  }
  var isOpen = pop.classList.toggle('show');
  btn.classList.toggle('open', isOpen);
}

function closeGoldenRulesPop(){
  var pop = document.getElementById('lib-info-pop');
  var btn = document.getElementById('lib-info-btn');
  if(pop) pop.classList.remove('show');
  if(btn) btn.classList.remove('open');
}

document.addEventListener('click', function(e){
  var pop = document.getElementById('lib-info-pop');
  var btn = document.getElementById('lib-info-btn');
  if(!pop || !pop.classList.contains('show')) return;
  if(pop.contains(e.target) || (btn && btn.contains(e.target))) return;
  closeGoldenRulesPop();
});

function ensureGoldenRulesPopList(){
  var list = document.getElementById('lib-info-pop-list');
  if(!list || list.childElementCount) return;
  GOLDEN_RULES.forEach(function(r, i){
    var li = document.createElement('li');
    li.innerHTML = '<span class="gr-num">'+(i+1)+'</span><span>'+escapeHtml(r)+'</span>';
    list.appendChild(li);
  });
}

function openEmailLibrary(){
  ensureGoldenRulesPopList();
  var body = document.getElementById('lib-modal-body');
  var html = '';
  // Group by owner using MEMBERS order
  MEMBERS.forEach(function(m){
    html += '<div class="lib-owner-section">'+
      '<div class="lib-owner-head">'+
        (function(){
          var img = (typeof loadAvatar==='function') ? loadAvatar(m.name) : null;
          var inner = img ? '<img src="'+img+'" alt="'+escapeHtml(m.name)+'">' : escapeHtml(m.name.substring(0,2).toUpperCase());
          var bg = img ? 'transparent' : m.color;
          return '<div class="lib-owner-av" style="background:'+bg+'">'+inner+'</div>';
        })()+
        '<span class="lib-owner-name">'+escapeHtml(m.name)+'</span>'+
        '<span class="lib-owner-count">'+m.inds.length+' industries · '+(m.inds.length*4)+' emails</span>'+
      '</div>'+
      '<div class="lib-grid">';
    m.inds.forEach(function(ind){
      var data = EMAIL_TEMPLATES[ind];
      if(!data) return;
      var editedCount = 0;
      data.emails.forEach(function(_, i){ if(emailOverrides[ind+'::'+i]) editedCount++; });
      var editedBadge = editedCount>0 ? '<span class="lib-card-edited email-edited-badge" title="'+editedCount+' email(s) edited">● '+editedCount+'</span>' : '';
      var safeInd = ind.replace(/'/g,"\\'");
      html += '<button class="lib-card" type="button" onclick="openEmailFromLibrary(\''+safeInd+'\')">'+
        '<div class="lib-card-top">'+
          '<span class="lib-card-name">'+escapeHtml(ind)+'</span>'+
          editedBadge+
        '</div>'+
        '<div class="lib-card-tone">'+escapeHtml(data.tone)+'</div>'+
        '<div class="lib-card-meta">'+
          '<svg viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="1.5" y="3" width="11" height="8" rx="1"/><path d="M2 4l5 4 5-4"/></svg>'+
          '4 emails · Day 1 · 5 · 9 · 14'+
        '</div>'+
      '</button>';
    });
    html += '</div></div>';
  });
  body.innerHTML = html;
  body.scrollTop = 0;
  showEmailBackdrop('lib-backdrop');
}

function closeEmailLibrary(e){
  if(e && e.target && e.target.id !== 'lib-backdrop' && e.type === 'click') return;
  hideEmailBackdrop('lib-backdrop');
  closeGoldenRulesPop();
}

function openEmailFromLibrary(ind){
  swapEmailBackdrops('lib-backdrop', 'email-backdrop', function(){
    openEmailModal(ind, true);
  });
}

function openGoldenRules(){
  var ul = document.getElementById('gr-list');
  if(!ul.childElementCount){
    GOLDEN_RULES.forEach(function(r, i){
      var li = document.createElement('li');
      li.innerHTML = '<span class="gr-num">'+(i+1)+'</span><span>'+escapeHtml(r)+'</span>';
      ul.appendChild(li);
    });
  }
  document.getElementById('gr-backdrop').classList.remove('app-hidden');
}

function closeGoldenRules(e){
  if(e && e.target && e.target.id !== 'gr-backdrop' && e.type === 'click') return;
  document.getElementById('gr-backdrop').classList.add('app-hidden');
}

