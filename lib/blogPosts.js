// Blog posts, for SEO purposes only - a pure content-marketing
// surface, not a CMS. Each post is plain data; the actual page
// templates (app/blog/page.js, app/blog/[slug]/page.js) handle
// rendering and metadata. Adding a new post means adding an entry
// here - no database, no admin UI, matches the stated scope.
//
// Keeping content fresh: when actually revising a post's copy (not
// just a rendering/styling change elsewhere in the app), add or bump
// its updatedAt field (same "YYYY-MM-DD" format as publishedAt).
// That's what the sitemap's lastModified and the "Last updated" note
// on the post itself both read from - Google does treat this as a
// freshness signal, and per direct research done for this site
// (see the commit history), updating an existing ranked post beats
// publishing a new one at a fresh URL, since the existing URL keeps
// whatever link equity it's already accumulated. A post with no
// updatedAt has never been substantively revised since publish.
//
// shopLink uses the un-suffixed /gift-shop entry point (not
// /gift-shop-uk or -us directly) so proxy.js's own region-detection
// redirect still runs and sends UK/US visitors to the right regional
// shop - it only rewrites the path, the ?occasion=/?relationship=
// query string passes through untouched to the destination, where
// GiftShopClient.jsx picks it up and pre-applies the filter.

export const BLOG_POSTS = [
  {
    slug: "fathers-day-gift-ideas",
    title: "Father's Day Gift Ideas That Actually Land",
    description: "Thoughtful Father's Day gift ideas for every kind of dad - the golfer, the coffee obsessive, the one who says he doesn't want anything.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=fathers-day",
    shopLinkLabel: "Browse Father's Day gift ideas",
    intro: "Every Father's Day, the same thing happens: you want to get something better than a tie or a card, but \u201cwhat does Dad actually want\u201d turns out to be a genuinely hard question. He's impossible to buy for because he never asks for anything - so here's where to actually start looking.",
    sections: [
      {
        heading: "Start with what he already does, not what he says he wants",
        body: "Most dads won't tell you what they want, but they'll show you constantly - the same coffee order every morning, the tool he keeps borrowing back off you, the golf gloves that are falling apart. The best Father's Day gifts almost never come from asking \u201cwhat do you want,\u201d they come from paying attention to what he's already reaching for.",
      },
      {
        heading: "When you're stuck, let a group cover something bigger",
        body: "If a few of you (you and your siblings, you and your mum) want to go in on something more meaningful than any one person's budget - a proper set of golf clubs, a weekend away, a good chair - HintDrop's group pots let everyone chip in toward one gift instead of five smaller ones that don't add up to much.",
      },
    ],
  },
  {
    slug: "birthday-gift-ideas",
    title: "Birthday Gift Ideas for When You've Run Out of Ideas",
    description: "Birthday gift ideas for the person you've already bought for a dozen times - plus how to stop it being a last-minute scramble every single year.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=birthday",
    shopLinkLabel: "Browse birthday gift ideas",
    intro: "Birthdays are the one occasion that comes back every single year, for every single person in your life - which is exactly why they're the hardest to keep fresh. By the fifth birthday in a row, \u201csomething they'll actually like\u201d starts to feel like a much bigger ask than it should be.",
    sections: [
      {
        heading: "The real problem isn't ideas, it's timing",
        body: "Most birthday gifts aren't bad because nobody could think of anything - they're rushed because the date crept up again. HintDrop's reminders exist for exactly this: a heads-up early enough that you're choosing something, not grabbing whatever's nearest the till on the day.",
      },
      {
        heading: "Let them tell you, without it feeling like a hint dropped too hard",
        body: "The easiest birthdays to shop for are the ones where you already know what's on someone's mind - a hint they saved months ago, not something you have to fish for over text a week before. That's the whole point of a shared hint list: the wanting happens naturally, long before the actual asking would.",
      },
    ],
  },
  {
    slug: "christmas-gift-ideas",
    title: "Christmas Gift Ideas for a Whole List of People",
    description: "Christmas gift ideas for working through a full list of people without losing track of who's getting what, or repeating yourself.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=christmas",
    shopLinkLabel: "Browse Christmas gift ideas",
    intro: "Christmas isn't one gift to think about, it's ten or twenty - parents, siblings, partners, the in-laws, the office Secret Santa - all landing at once, all needing to feel considered rather than identical. The problem was never coming up with one good idea, it's doing that ten times over without losing your mind.",
    sections: [
      {
        heading: "One list, not ten scattered notes",
        body: "The usual failure mode is half-remembered ideas spread across notes apps, texts, and \u201cI'll remember it\u201d - which mostly means someone gets a gift card in December because the actual idea from July is long gone. Keeping everyone's hints in one place means nothing gets lost between when you think of it and when you need it.",
      },
      {
        heading: "For the big family gift, let everyone chip in",
        body: "If the family's going in on one bigger present rather than everyone buying separately, a group pot means nobody's stuck chasing five people for money over WhatsApp in mid-December - everyone contributes when they can, and you can see exactly where it's at.",
      },
    ],
  },
  {
    slug: "anniversary-gift-ideas",
    title: "Anniversary Gift Ideas That Don't Feel Like a Repeat",
    description: "Anniversary gift ideas for couples who've already done flowers, done dinner, and want this year to actually feel different.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=anniversary",
    shopLinkLabel: "Browse anniversary gift ideas",
    intro: "The tricky thing about an anniversary is that it's not a one-off - you're doing this again next year, and the year after. Flowers and a nice dinner cover year one just fine; by year five, it starts to feel like you're repeating yourself.",
    sections: [
      {
        heading: "Save the idea the moment it comes up",
        body: "The best anniversary gifts are usually things your partner mentioned once, months earlier, not something invented under pressure the week before. A shared hint list turns a passing \u201coh, I'd love one of those\u201d into something you can actually act on later, instead of trying to remember it from memory alone.",
      },
      {
        heading: "For a bigger milestone year, pool it with people who care",
        body: "For the years that call for something bigger than a solo budget - a proper trip, a piece of furniture, an experience - a group pot lets close family or friends contribute toward one meaningful gift instead of everyone giving something smaller and separate.",
      },
    ],
  },
  {
    slug: "valentines-day-gift-ideas",
    title: "Valentine's Day Gift Ideas Beyond Flowers and Chocolate",
    description: "Valentine's Day gift ideas for when you want this year to feel more specific to your actual partner than the default options.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=valentines-day",
    shopLinkLabel: "Browse Valentine's Day gift ideas",
    intro: "Flowers and chocolate aren't wrong, they're just the default - the thing you get when you haven't had time to think about what this specific person, this specific year, would actually love. A little more thought goes a long way on a day that's entirely about that.",
    sections: [
      {
        heading: "Specific beats sentimental",
        body: "The Valentine's gifts that land best usually aren't the most romantic-sounding ones on paper - they're the ones that show you noticed something particular to your partner. That's easier when you've actually got a running list of things they've mentioned wanting, rather than trying to reconstruct it from memory on February 13th.",
      },
      {
        heading: "It doesn't have to be a surprise to still feel thoughtful",
        body: "There's a myth that a good gift has to be a total surprise - in practice, most people are just glad to get something they genuinely wanted. Sharing your own hints works both ways: you're just as likely to get something you'll actually use as you are to give one.",
      },
    ],
  },
  {
    slug: "thank-you-gift-ideas",
    title: "Thank You Gift Ideas for When 'Thanks' Isn't Quite Enough",
    description: "Thank you gift ideas for the people who did something that deserves more than a text - without needing a special occasion as the excuse.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=thank-you",
    shopLinkLabel: "Browse thank you gift ideas",
    intro: "Some things genuinely warrant more than a quick \u201cthank you so much!\u201d text - the friend who helped you move, the colleague who covered for you, the neighbour who took in your post for three weeks. There's no calendar date attached to any of it, which is exactly why it's so easy to let the moment pass without doing anything at all.",
    sections: [
      {
        heading: "A thank-you gift doesn't need a big budget to land well",
        body: "The gifts that read as genuinely appreciative are rarely the most expensive ones - they're the ones that show you actually thought about what this person would like, rather than grabbing the nearest generic option. That's a much smaller ask than it sounds.",
      },
      {
        heading: "Keep a running list so you're never starting from scratch",
        body: "If you keep half an eye on what the people around you mention liking - even completely unprompted, in an ordinary conversation - you'll never be stuck starting from zero the next time you want to say a proper thank you.",
      },
    ],
  },
  {
    slug: "new-baby-gift-ideas",
    title: "New Baby Gift Ideas Beyond Another Babygrow",
    description: "New baby gift ideas for when you want to get something the new parents will actually use, not just another well-meant babygrow.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=new-baby",
    shopLinkLabel: "Browse new baby gift ideas",
    intro: "New parents tend to end up with more tiny outfits than any baby could wear before growing out of them. The gifts that actually get used are usually the ones the parents mentioned needing themselves - which means the trick is knowing what that is before you buy.",
    sections: [
      {
        heading: "Ask what's on the list, not what feels traditional",
        body: "The most useful new-baby gifts are rarely the cutest-looking ones in the shop - they're the practical things the parents have already been thinking about, from a proper pram to help with the first few sleepless weeks. A shared hint list means you're buying from their actual list, not guessing at tradition.",
      },
      {
        heading: "Split the big-ticket items with everyone who wants to help",
        body: "The genuinely useful new-baby items - a pram, a cot, help with childcare costs - are often more than any one person wants to spend alone. A group pot lets grandparents, aunts, uncles, and friends all put something toward the same big thing, rather than a pile of smaller separate gifts.",
      },
    ],
  },
  {
    slug: "housewarming-gift-ideas",
    title: "Housewarming Gift Ideas for an Actual New Home",
    description: "Housewarming gift ideas that go beyond a bottle of wine, for people who are properly settling into a whole new space.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=housewarming",
    shopLinkLabel: "Browse housewarming gift ideas",
    intro: "A bottle of wine is a fine housewarming gift, but a new home is a big change - new rooms to fill, new routines to build - and there's usually something more specific the person has actually been meaning to buy for the place, if you know to ask.",
    sections: [
      {
        heading: "The best housewarming gifts solve a specific gap",
        body: "New homeowners usually have a mental list of things the new place needs - a particular lamp, a rug for that one empty corner, something for the kitchen they didn't bring with them. Knowing that list in advance turns a generic gift into one that solves an actual problem.",
      },
      {
        heading: "For furniture-sized gifts, bring a few people in",
        body: "Anything bigger than a candle - a proper piece of furniture, a good sofa, help with a big first purchase for the new place - is a natural fit for a group pot, letting friends and family split something meaningful rather than each giving something smaller on their own.",
      },
    ],
  },
  {
    slug: "wedding-gift-ideas",
    title: "Wedding Gift Ideas Beyond the Standard Registry",
    description: "Wedding gift ideas for guests who want to give something that actually matches what the couple wants, not just what's left on a registry.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=wedding",
    shopLinkLabel: "Browse wedding gift ideas",
    intro: "Traditional registries solve the basic problem - at least you know it's wanted - but they can feel a bit impersonal, and by the time you check, half the good options are already taken. A couple's own shared hints, kept somewhere that isn't a store-specific list, tend to reflect what they actually want a lot more precisely.",
    sections: [
      {
        heading: "Couples can save what they actually want, not just what a store stocks",
        body: "A traditional registry only ever shows what one shop happens to sell. When a couple keeps their own list of hints instead, it can include anything from anywhere - which usually means guests end up giving something far closer to what was actually wanted.",
      },
      {
        heading: "For the honeymoon or a big first purchase, pool it together",
        body: "Plenty of couples would rather have help toward a honeymoon, a house deposit, or one big shared purchase than another set of glasses. A group pot lets guests contribute toward exactly that, with everyone able to see how it's building up toward the goal.",
      },
    ],
  },
  {
    slug: "graduation-gift-ideas",
    title: "Graduation Gift Ideas for the Next Chapter",
    description: "Graduation gift ideas that mark the moment properly, whether that's something sentimental or something genuinely useful for what's next.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=graduation",
    shopLinkLabel: "Browse graduation gift ideas",
    intro: "Graduation sits in an odd spot - it deserves something that marks the moment, but the graduate is also about to need a lot of practical things for whatever comes next. The best gifts usually manage to be both at once.",
    sections: [
      {
        heading: "Know whether they want sentimental or practical (or ask)",
        body: "Some graduates want something to remember the day by; others would rather have something genuinely useful for the job, course, or move that's coming next. Knowing which one someone actually wants makes a much bigger difference than the gift itself.",
      },
      {
        heading: "For a bigger send-off gift, bring the group in",
        body: "A laptop, a proper suitcase for the move, a contribution toward the first flat - these are exactly the kind of gifts that work better as a group pot than as one person's sole responsibility, letting family and friends put in what they can toward one thing that actually matters.",
      },
    ],
  },
  {
    slug: "just-because-gift-ideas",
    title: "Just Because Gift Ideas (No Occasion Required)",
    description: "Just because gift ideas for showing someone you're thinking of them, with no birthday, holiday, or excuse required at all.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=just-because",
    shopLinkLabel: "Browse just because gift ideas",
    intro: "Some of the best gifts have no occasion attached at all - they're just a way of saying you were thinking of someone, on an entirely ordinary Tuesday. The only hard part is that there's no date to remind you, so it has to come from actually paying attention.",
    sections: [
      {
        heading: "The absence of an occasion is the whole point",
        body: "A gift with no reason behind it tends to land harder precisely because it wasn't expected - there's no calendar prompting it, just something that made you think of someone. It doesn't need to be big to work; it just needs to be genuinely them.",
      },
      {
        heading: "Keep a running list of things people mention, for exactly this moment",
        body: "The easiest way to give a great just-because gift is to already know what someone's been eyeing up - something they mentioned once in passing, saved as a hint, waiting for a moment just like this one.",
      },
    ],
  },
  {
    slug: "mothers-day-gift-ideas",
    title: "Mother's Day Gift Ideas That Aren't Just Flowers",
    description: "Mother's Day gift ideas for the mum who says she doesn't need anything, and deserves better than the same bouquet as last year.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?occasion=mothers-day",
    shopLinkLabel: "Browse Mother's Day gift ideas",
    intro: "Mums are notoriously bad at telling you what they actually want - \u201coh, don't get me anything\u201d is doing a lot of heavy lifting every March. Flowers are always safe, but safe isn't the same as thoughtful, and this is one of the few days a year that's entirely about her.",
    sections: [
      {
        heading: "Pay attention to the small things she mentions and moves past",
        body: "The gifts that land best are rarely the big obvious ones - they're the small comment she made in passing months ago and clearly didn't expect anyone to remember. That's exactly the kind of thing worth saving the moment you hear it, rather than trying to recall it under pressure in May.",
      },
      {
        heading: "For something bigger, bring the whole family in",
        body: "If you and your siblings want to get her something more significant than any one of you could justify alone - a proper day out, something for the house, a bigger treat entirely - a group pot means everyone can put in what they're able to, toward one gift that actually feels special.",
      },
    ],
  },
  {
    slug: "boyfriend-gift-ideas",
    title: "Boyfriend Gift Ideas When You're Still Learning What He Likes",
    description: "Boyfriend gift ideas for when you don't know his taste inside out yet, without overshooting into something too serious too soon.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=boyfriend",
    shopLinkLabel: "Browse boyfriend gift ideas",
    intro: "Early on, buying for a boyfriend is its own particular challenge - you want to get it right, but you're still working out what he actually likes, and there's a real risk of either playing it too safe or going too big too soon.",
    sections: [
      {
        heading: "Let what he mentions do the work, not your best guess",
        body: "The safest read on someone you're still getting to know isn't a guess at all - it's whatever he's actually mentioned wanting, even once, in passing. Saving that as a hint the moment it comes up beats trying to reconstruct it from memory weeks later.",
      },
      {
        heading: "Match the gift to where things actually are",
        body: "A gift can be thoughtful without being a grand gesture - the goal early on is showing you were paying attention, not making a statement. Something specific to him, at a sensible scale, tends to land far better than something impressive but generic.",
      },
    ],
  },
  {
    slug: "girlfriend-gift-ideas",
    title: "Girlfriend Gift Ideas Beyond the Obvious",
    description: "Girlfriend gift ideas that go past the default jewellery-or-flowers options, toward something that actually reflects her.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=girlfriend",
    shopLinkLabel: "Browse girlfriend gift ideas",
    intro: "Jewellery and flowers are the default answer for a reason - they're rarely wrong. But \u201crarely wrong\u201d isn't the same as \u201cactually her,\u201d and the gifts that stand out are usually the ones that clearly took her specific interests into account.",
    sections: [
      {
        heading: "Specific beats safe",
        body: "The gift that gets remembered isn't usually the most expensive one - it's the one that proves you were listening to something she said weeks ago, not the one that could have been bought for anyone.",
      },
      {
        heading: "Keep track of what she's mentioned, as it happens",
        body: "Most good gift ideas surface in completely ordinary conversation, not when you're actively trying to think of one. Saving those moments as they happen means you're never starting from a blank page when the occasion actually arrives.",
      },
    ],
  },
  {
    slug: "husband-gift-ideas",
    title: "Husband Gift Ideas for the Man Who Says He Doesn't Need Anything",
    description: "Husband gift ideas for years into a relationship, when \u201cI don't need anything\u201d has become his standard answer to every occasion.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=husband",
    shopLinkLabel: "Browse husband gift ideas",
    intro: "Years in, \u201cI don't need anything\u201d becomes the default answer to basically every gift-related question - not because he doesn't want anything, but because nothing's top of mind when you actually ask him directly.",
    sections: [
      {
        heading: "He's telling you all year, just not when you ask",
        body: "The things a long-term partner actually wants tend to come out sideways - a comment about a tool he keeps borrowing, a hobby he's been getting back into - not as a direct answer to \u201cwhat do you want.\u201d Those offhand moments are worth more than a direct question ever is.",
      },
      {
        heading: "For a bigger milestone, don't do it alone",
        body: "For an anniversary or birthday that calls for something more than usual, a group pot lets you bring in his friends or family toward one meaningful gift, rather than you covering something bigger entirely on your own.",
      },
    ],
  },
  {
    slug: "wife-gift-ideas",
    title: "Wife Gift Ideas That Don't Default to Flowers Again",
    description: "Wife gift ideas for when you want this occasion to feel more considered than the usual flowers-and-dinner routine.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=wife",
    shopLinkLabel: "Browse wife gift ideas",
    intro: "Flowers and a nice dinner are a fine baseline, but after enough years together, they start to feel like the default rather than the thoughtful choice. The gifts that actually land tend to track what she's into right now, not what worked five years ago.",
    sections: [
      {
        heading: "Her taste has probably moved on since the last time you really thought about it",
        body: "It's easy to keep buying the version of someone you knew a few years ago. Paying attention to what she's actually into now - and saving it somewhere, rather than trusting yourself to remember - keeps gifts feeling current instead of stuck in the past.",
      },
      {
        heading: "For a proper milestone, bring people in",
        body: "For the bigger anniversaries, a group pot lets close family and friends contribute toward something genuinely significant - a trip, a piece of furniture, an experience - instead of it landing entirely on you alone.",
      },
    ],
  },
  {
    slug: "mum-gift-ideas",
    title: "Gift Ideas for Mum, for Any Occasion",
    description: "Gift ideas for your mum that work for any occasion, not just Mother's Day - for the woman who's genuinely hard to buy for because she gives more than she asks.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=mother",
    shopLinkLabel: "Browse gift ideas for mum",
    intro: "Mums tend to be some of the hardest people to buy for, for a simple reason: they spend most of their time thinking about what everyone else needs, and very little thinking about what they want for themselves. That makes \u201cwhat does Mum actually want\u201d a genuinely open question most of the year, not just in March.",
    sections: [
      {
        heading: "Notice what she stops herself from buying",
        body: "The best clue is usually something she considered for herself and talked herself out of - too indulgent, not necessary, someone else needs it more. That's exactly the kind of thing worth remembering and getting her anyway.",
      },
      {
        heading: "A family group gift can mean more than any one person's",
        body: "If several of you want to get her something bigger than any single budget allows, a group pot means everyone contributes toward one properly thoughtful gift, rather than it falling to one person to sort out alone.",
      },
    ],
  },
  {
    slug: "dad-gift-ideas",
    title: "Gift Ideas for Dad, for Any Occasion",
    description: "Gift ideas for your dad that work any time of year, not just Father's Day - for the man who genuinely never asks for anything.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=father",
    shopLinkLabel: "Browse gift ideas for dad",
    intro: "Dads have a habit of being genuinely hard to shop for outside of June - not because nothing would suit him, but because he's rarely the one bringing it up. The good ideas are usually already there, just not stated directly.",
    sections: [
      {
        heading: "Watch what he does, not what he says",
        body: "He's unlikely to ask for anything outright, but he'll show you constantly - the same order at the coffee place, the tool he keeps meaning to replace, the hobby he talks about more than he actually does. That's where the real gift ideas live.",
      },
      {
        heading: "Group together for something bigger",
        body: "For something more significant than any one person's budget covers alone, a group pot lets you and your siblings put toward one proper gift together, rather than several smaller ones that don't add up to much.",
      },
    ],
  },
  {
    slug: "daughter-gift-ideas",
    title: "Gift Ideas for Your Daughter, Whatever Age She Is",
    description: "Gift ideas for a daughter at any age - staying current with what she's actually into, not what she liked a year or two ago.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=daughter",
    shopLinkLabel: "Browse gift ideas for a daughter",
    intro: "What a daughter wants can shift fast, especially through her teens and twenties - the things that landed brilliantly eighteen months ago can miss completely today. Staying current matters more here than almost any other relationship on this list.",
    sections: [
      {
        heading: "Keep up with what she's into right now",
        body: "The gifts that land best are the ones that track her current interests, not the ones based on what she liked last time you really paid attention. Little, ongoing signals - something she mentioned wanting, a new interest she's picked up - are worth far more than a guess based on the past.",
      },
      {
        heading: "For a bigger milestone, pool it together",
        body: "For graduations, big birthdays, or moving into her first place, a group pot lets grandparents, aunts, uncles, and siblings all contribute toward one gift that actually matters, rather than several smaller, separate ones.",
      },
    ],
  },
  {
    slug: "son-gift-ideas",
    title: "Gift Ideas for Your Son, Whatever Age He Is",
    description: "Gift ideas for a son at any age - keeping pace with what he's actually into as his interests keep changing.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=son",
    shopLinkLabel: "Browse gift ideas for a son",
    intro: "A son's interests can move on faster than you'd expect - what he was completely into last year might be old news by now. The gifts that land best are the ones that reflect where he actually is, not where he was.",
    sections: [
      {
        heading: "Pay attention to what's changed recently",
        body: "Rather than relying on what you remember him liking, keep half an eye on what he's mentioned more recently - a new interest, a specific thing he's been wanting. Saving that as it comes up beats trying to guess from an outdated picture of him.",
      },
      {
        heading: "For bigger milestones, bring the wider family in",
        body: "For graduations, moving out, or a big birthday, a group pot means the wider family can put toward one properly significant gift together, rather than it being scattered across several smaller ones.",
      },
    ],
  },
  {
    slug: "sister-gift-ideas",
    title: "Sister Gift Ideas from Someone Who Actually Knows Her",
    description: "Sister gift ideas that lean on the years of shared history you already have, instead of starting from scratch every time.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=sister",
    shopLinkLabel: "Browse sister gift ideas",
    intro: "You've got a real advantage buying for a sister that most people don't have with anyone else - years of shared history, inside jokes, and actually knowing how her taste has changed over time. The trick is using that instead of defaulting to something generic because it's easier.",
    sections: [
      {
        heading: "Lean on what you already know",
        body: "You probably already know more about what she'd actually want than you're giving yourself credit for - it just needs pulling together rather than trying to think of something completely new. A shared hint list turns that existing knowledge into an actual, useable list.",
      },
      {
        heading: "For a bigger occasion, get the rest of the family in on it",
        body: "For a milestone birthday or a big life change, a group pot lets you, your parents, and anyone else who wants to contribute all put toward one meaningful gift instead of several smaller, separate ones.",
      },
    ],
  },
  {
    slug: "brother-gift-ideas",
    title: "Brother Gift Ideas (Even If He's 'Impossible' to Buy For)",
    description: "Brother gift ideas for the sibling everyone calls impossible to shop for, because he never seems to want anything specific.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=brother",
    shopLinkLabel: "Browse brother gift ideas",
    intro: "Every family seems to have one - the brother who's somehow impossible to buy for, who shrugs off every \u201cwhat do you want\u201d with \u201cI don't know, whatever.\u201d He's not actually gift-proof, he's just not going to hand you the answer directly.",
    sections: [
      {
        heading: "He's shown you, even if he hasn't said it",
        body: "The \u201cimpossible to buy for\u201d brother usually isn't impossible at all - he just won't tell you outright. Whatever he's been going on about lately, whatever he keeps mentioning wanting to try, is worth more than anything you'd guess cold.",
      },
      {
        heading: "Team up with the rest of the family",
        body: "For a bigger birthday or a proper milestone, a group pot means you don't have to solve \u201cwhat does he actually want\u201d alone - the whole family can put toward one gift that's genuinely worth the effort.",
      },
    ],
  },
  {
    slug: "friend-gift-ideas",
    title: "Friend Gift Ideas for No Particular Reason",
    description: "Friend gift ideas for the people who don't expect anything from you, which is exactly why a genuine one means so much.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=friend",
    shopLinkLabel: "Browse friend gift ideas",
    intro: "Gifts between friends don't come with the same built-in expectation as family or partners - which means there's no obligation weighing it down, but also no occasion forcing the moment either. A good friend gift tends to happen because you actually thought of them, not because a calendar told you to.",
    sections: [
      {
        heading: "It doesn't need a reason to count",
        body: "Some of the best gifts between friends have no occasion attached at all - just something that made you think of them. It lands well precisely because there was no obligation behind it.",
      },
      {
        heading: "Remember what they've mentioned, for when the moment's right",
        body: "Friends mention wanting things constantly, usually in passing and rarely expecting anyone to remember. Keeping track of those moments means you'll have a genuinely good idea ready whenever the right occasion actually comes up.",
      },
    ],
  },
  {
    slug: "colleague-gift-ideas",
    title: "Colleague Gift Ideas That Get the Tone Right",
    description: "Colleague gift ideas that stay appropriate for a work relationship while still feeling like more than an afterthought.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=colleague",
    shopLinkLabel: "Browse colleague gift ideas",
    intro: "Buying for a colleague sits in an odd middle ground - too generic and it feels like an afterthought, too personal and it can feel like it's crossed a line. The sweet spot is usually something thoughtful but appropriately scaled to the relationship.",
    sections: [
      {
        heading: "Keep it proportionate to the relationship",
        body: "A colleague gift works best when it matches the actual closeness of the relationship - genuinely thoughtful without needing to be personal in the way a gift for family or close friends would be. Something specific to a shared interest or a running joke usually lands better than anything generic.",
      },
      {
        heading: "For leaving gifts or office collections, a group pot keeps it simple",
        body: "For a leaving gift, a big office birthday, or any collection everyone's chipping into, a group pot means no more chasing people round the office for cash - everyone contributes what they're comfortable with, and it's all tracked in one place.",
      },
    ],
  },
  {
    slug: "gifts-for-him",
    title: "Gift Ideas for Him When You're Stuck",
    description: "Gift ideas for him that go beyond the usual defaults - for any man in your life you're currently drawing a blank on.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=for-him",
    shopLinkLabel: "Browse gift ideas for him",
    intro: "\u201cSomething for him\u201d is one of the most common gift-shopping dead ends there is - broad enough that it barely narrows anything down, specific enough that the usual defaults (socks, a mug, another wallet) start to feel like giving up.",
    sections: [
      {
        heading: "Broad doesn't have to mean generic",
        body: "Even without knowing every detail of someone's taste, there's usually something you do know - a hobby, a habit, a thing he's mentioned once. Starting there beats reaching for whatever's safest and most forgettable.",
      },
      {
        heading: "For something more significant, don't cover it alone",
        body: "If a few of you are getting something together rather than separately, a group pot means everyone chips in toward one gift worth giving, rather than several smaller ones that don't add up to much.",
      },
    ],
  },
  {
    slug: "gifts-for-her",
    title: "Gift Ideas for Her When You're Stuck",
    description: "Gift ideas for her that go beyond the usual defaults - for any woman in your life you're currently drawing a blank on.",
    publishedAt: "2026-09-12",
    shopLink: "/gift-shop?relationship=for-her",
    shopLinkLabel: "Browse gift ideas for her",
    intro: "\u201cSomething for her\u201d covers a lot of ground and narrows almost nothing down - broad enough to fit anyone, which is exactly why it's so easy to default to flowers, candles, or whatever's nearest the till.",
    sections: [
      {
        heading: "Work with what you actually know",
        body: "Even a small detail - something she mentioned once, a colour she always wears, a brand she's loyal to - narrows things down far more than starting from a completely blank page.",
      },
      {
        heading: "For something bigger, bring others in",
        body: "For a gift that's more than any one person would normally spend alone, a group pot lets everyone who wants to contribute put something toward one gift that's actually worth giving.",
      },
    ],
  },
];

export function getBlogPost(slug) {
  return BLOG_POSTS.find((p) => p.slug === slug) || null;
}
