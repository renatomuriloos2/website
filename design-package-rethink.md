# Design Package: Rethink (rethink.hn)

Tier 1, single-journey scroll site. English. Real company, generated visuals (network policy blocks pulling their real photos; swap-in planned). Hero concept: **The clean drop**.

## 1. The brand premise

The drop. Textile dyeing is the industry's water problem, and Rethink's chemistry is the answer measured one drop at a time: concentrated auxiliaries, biotech, and reactive dyes that get precise color without waste. The whole site teaches one idea: **precision chemistry means nothing is wasted**. Every section, the hold-to-run-the-reaction moment, and the closing call to action all serve it.

## 2. The palette as CSS tokens

A light, lab-daylight world sampled from the footage: bright white fabric, cool laboratory air, one teal bloom. Deliberate deviation from the usual dark cinematic canvas, said out loud: this brand's world is a clean bright lab, so the page is light. Exact values re-sampled from approved footage after the video gate.

```css
:root{
  --canvas:#F3F6F5;        /* soft lab white, tinted cool, never pure #fff */
  --panel:#FCFDFD;         /* cards and raised surfaces */
  --ink:#0E1F1B;           /* text-primary, deep teal-black */
  --text-secondary:#44584F;
  --accent:#0B7E68;        /* the dye bloom teal; CTA and rare emphasis */
  --accent-hover:#0A6B58;
  --accent-muted:#BFE3DA;  /* whisper level: borders, ripples, particles */
}
```

Legibility over footage is INVERTED from the usual system, because the footage is bright: dark ink text over light frames, with soft light scrims (pale lab-white radial gradients) and a light glow text-shadow. The worst-frame audit hunts the darkest pixel under the text.

## 3. The type trio

- Display: **Sora** 600/700 (geometric, technical, quietly futuristic)
- Body: **Instrument Sans** 400/500
- Mono: **IBM Plex Mono** 400/500 (cert codes, lab labels, form microcopy)

## 4. The band map

Hero: 500vh. Drop falls dead center; captions flank left and right in the calm lab air. Ranges are labeled starting points, validated by the flick test.

| Band | Range (starting point) | Footage moment | Copy (verbatim) | Entrance |
|---|---|---|---|---|
| 1 | 0.00 to 0.18 | the drop hangs, gathering | "Color is chemistry." | approach-from-depth, blur clearing as focus arrives |
| 2 | 0.24 to 0.46 | the drop falls | "Dyeing one shirt can cost gallons of water." / "Ours asks for far less." | drift-down, echoing the fall |
| 3 | 0.52 to 0.72 | impact, the bloom spreads | "Precise color. Nothing wasted." | word-punch, "Nothing" lands on the impact |
| 4 | 0.78 to 1.00 | the colored weave at rest | "Rethink how textiles are made." + subline + CTA | word-by-word rise into a staged settle |

Band 4 subline (verbatim): "Sustainable chemistry for the textile industry: concentrated auxiliaries, biotech, and reactive dyes that cut water, energy, and time."
Band 4 CTA: "Request a pilot" (primary, to #pilot) · "See the chemistry" (ghost, to #chemistry)

"Precise color. Nothing wasted." is a designed staccato pair; it stays through the copy sweep.

## 5. The static-hero copy block

Over the ending frame (the colored weave at rest):
- Headline: "Rethink how textiles are made."
- Subline: "Sustainable chemistry for the textile industry: concentrated auxiliaries, biotech, and reactive dyes that cut water, energy, and time."
- CTA: "Request a pilot"

## 6. The below-fold outline

Nav: RETHINK wordmark · Chemistry · Proof · Lab · Why · button "Request a pilot". Footer funnels to #pilot. One CTA anchor: #pilot.

**S1 · #chemistry — kicker "THE CHEMISTRY" · H2 "Two lines. Every fiber."**
Intro: "Everything we make exists to do more with less inside a dye house."
Card THINK²DYE: "A complete dyeing line for natural, artificial, and synthetic fibers: concentrated auxiliaries, specialized biotech, and reactive dyes built to cut resource use."
Card THINK²FINISH: "Special finishes that change how fabric feels and performs: cool or warm touch, quick dry, wicking, soil release, water and oil repellency."

**S2 · #proof — kicker "PROOF, NOT PROMISES" · H2 "Certified, audited, patented."**
Intro: "Green claims are easy. These are checkable."
Cert chips (mono): ZDHC Level 3 · ISO 9001 · ISO 14001 · ISO 45001 · OEKO-TEX compliant · California Prop 65 compliant
Counters: 1 patent granted · 2 patents pending · 2 trade secrets

**S3 · #lab — kicker "THE LAB" · H2 "Your recipe, proven before it ships."**
Copy: "Every product starts in our laboratory in Choloma. We match the recipe to your fabric, your machines, and your water before a single drum leaves the plant."
THE interactive moment lives here: **Hold to run the reaction.** Press and hold fills a drop; on completion the bloom crosses a woven swatch and three lines light in sequence: "Less water." "Less energy." "Less time." Early release eases back; reduced motion gets the finished state.

**S4 · #why — kicker "WHY WE EXIST" · H2 "Together we can make a better world for a future generation."** (their real tagline)
Copy: "Textile production is one of the world's largest users of water. We exist to change what that costs: processes and chemicals that preserve natural resources and improve life for the people who depend on this industry."
The ending frame reused here as a design image.

**S5 — FAQ · H2 "The questions mills actually ask."**
Q: "Will it work with our fibers?" A: "Yes. THINK²DYE covers natural, artificial, and synthetic fibers, and the lab confirms fit on your fabric before anything ships."
Q: "Do we need new machines?" A: "No. Our chemistry is made for standard dyeing and finishing equipment. A pilot starts with your current process, not a rebuild."
Q: "How do we know the sustainability claims are real?" A: "You check them. ZDHC Level 3, ISO 14001, OEKO-TEX and California Prop 65 compliance are third-party verified, and we share the documentation during your pilot."
Q: "Where are you?" A: "Our plant and laboratory are in ZIP Choloma, Cortés, Honduras, in the heart of Central America's textile corridor."

**S6 · #pilot — kicker "START SMALL" · H2 "Request a pilot."**
Copy: "Tell us what you dye or finish. The lab answers with a recipe and a plan."
Form (mailto:rethink@rethink.hn, the honest static-site choice for a real business): Name · Company · Email · "What are you dyeing or finishing?" · button "Send to the lab".
Success state: "Your email app just opened with everything filled in. Press send and the lab takes it from there."
Beside the form: "Prefer to talk? (+504) 2617-7772"

**Footer:** Rethink S.A. de C.V. · ZIP Choloma, Carretera a Puerto Cortés, Choloma, Cortés, Honduras · rethink@rethink.hn · (+504) 2617-7772 · "Site imagery is concept renders, not product photography."

## 7. The vector layer plan

- **Signature element: the bloom ring.** Concentric ripple circles that draw themselves behind each section heading as it enters, emanating from the drop idea. Also the payoff of the hold interaction. Removing it would visibly flatten the page; the boldness budget lives here.
- A thin divider line with a centered drop node that draws across on scroll between sections.
- Whisper particles: 8 slow-drifting soft droplet dots in --accent-muted on one fixed background environment layer (soft teal glow drifting on a 70s cycle plus fine grain).
- Hand-drawn molecule bond line-art (hexagon chain) at whisper opacity behind the proof section.
- All of it honors reduced motion: final states shown, drives stopped.

## 8. The engineering list

The full standard from scrub-pipeline.md: Blob fetch (streamed with the loading ring if the encode lands over ~8 MB), dt-normalized lerp, gated seeks with the deadlock escape, delta-gated DOM writes, band pacing validated by the flick test, the four-layer legibility system (inverted to light scrims + dark ink for this bright footage), the five static-hero gates live in CSS and JS with change listeners, complete-without-video, reduced motion honored live in both directions, and the quality floor. Whole-site-animated standard from Phase 8.

## 9. The copy gate line

Every viewer-facing line above ships verbatim. The built page must pass the Phase 9 grep gate (zero em dashes; zero leverage/seamless/empower/unlock/robust/actionable/data-driven/solutions) and the body-copy sweep for AI tells before anyone sees it. "Precise color. Nothing wasted." and "Less water." / "Less energy." / "Less time." are designed devices and stay.
