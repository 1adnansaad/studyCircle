---
name: Luminous Learning
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#464554'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#767586'
  outline-variant: '#c7c4d7'
  surface-tint: '#494bd6'
  primary: '#4648d4'
  on-primary: '#ffffff'
  primary-container: '#6063ee'
  on-primary-container: '#fffbff'
  inverse-primary: '#c0c1ff'
  secondary: '#e2165f'
  on-secondary: '#ffffff'
  secondary-container: '#ec3b78'
  on-secondary-container: '#fffbff'
  secondary-tint: '#ffe1ec'
  tertiary: '#874e00'
  on-tertiary: '#ffffff'
  tertiary-container: '#ff8a3d'
  on-tertiary-container: '#2c1600'
  success: '#1a8f4f'
  on-success: '#ffffff'
  success-container: '#a6f2c0'
  on-success-container: '#00210f'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#ffd9de'
  secondary-fixed-dim: '#ffb2be'
  on-secondary-fixed: '#400014'
  on-secondary-fixed-variant: '#900038'
  tertiary-fixed: '#ffdcbe'
  tertiary-fixed-dim: '#ffb870'
  on-tertiary-fixed: '#2c1600'
  on-tertiary-fixed-variant: '#693c00'
  gradient-deep-from: '#3a2bb0'
  gradient-deep-to: '#6b3fd4'
  gradient-progress-from: '#4648d4'
  gradient-progress-to: '#e2165f'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  display-lg:
    fontFamily: Baloo Da 2
    fontSize: 36px
    fontWeight: '700'
    lineHeight: '1.2'
  headline-md:
    fontFamily: Baloo Da 2
    fontSize: 24px
    fontWeight: '600'
    lineHeight: '1.3'
  body-lg:
    fontFamily: beVietnamPro
    fontSize: 18px
    fontWeight: '400'
    lineHeight: '1.6'
  body-md:
    fontFamily: beVietnamPro
    fontSize: 16px
    fontWeight: '400'
    lineHeight: '1.5'
  label-sm:
    fontFamily: beVietnamPro
    fontSize: 12px
    fontWeight: '600'
    lineHeight: '1.2'
    letterSpacing: 0.05em
  headline-lg-mobile:
    fontFamily: Baloo Da 2
    fontSize: 28px
    fontWeight: '700'
    lineHeight: '1.2'
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  base: 8px
  margin-mobile: 16px
  margin-desktop: 24px
  gutter: 16px
  container-padding: 20px
---

## Brand & Style

The brand personality is energetic, motivating, and approachable, tailored for a Bangladeshi EdTech audience (students in classes 8–12 and admission-prep). It balances a **playful academic aesthetic** with high-performance structure. The UI should feel like a supportive companion in a student's journey — vibrant enough to keep users engaged, organized enough to reduce cognitive load during study.

The design style is **Modern/Tactile**: subtle depth, high-saturation accents, and soft rounded forms that create a sense of momentum and reward. It draws from:
- **Soft Minimalism:** generous white space on a cool blue-white canvas to prioritize legibility of educational content.
- **Micro-tactility:** soft, pill-shaped buttons and chips that feel satisfying to tap.
- **Vibrant Accents:** bold pink CTAs, deep indigo decorative surfaces, and "moments of delight" (confetti, gift box) at completion and reward points.

The product is **mobile-first** and **bilingual**, leaning heavily Bengali. Most headlines, labels, and body copy are in Bangla; Latin appears for codes, English abbreviations (SSC, MCQ, AI), and prices.

## Colors

The palette runs on a core triad, but note how the real product distributes attention — this is the most common place a generic build gets it wrong:

- **Secondary (Vibrant Pink/Magenta — the hero color).** This is the most visible, most-used accent. It owns primary CTA buttons, the **active bottom-navigation tab** (icon, label, and underline), active status indicators, the brand mark, and pagination dots. When in doubt about which color a key interactive element should be, it is pink. `secondary` for fills, `secondary-tint` for low-saturation chip backgrounds.
- **Primary (Indigo/Purple — structural and decorative depth).** Used for **deep surfaces**, not for most buttons: course-card thumbnail gradients, dark promo banners, the AI ("Shikho AI") sparkle, secondary-button text, and brand-system anchors. It reads as focus and professionalism and provides the dark backdrop against which pink and white pop.
- **Tertiary (Warm Orange).** Reserved for rewards and gamification — the gift box, "Free" value badges, streak/celebration accents.
- **Success (Green).** Effective/discounted prices, savings, "active" and positive confirmations. Pairs with a muted struck-through original price.
- **Neutral.** Cool slate gray for typography; a soft blue-white (`surface`) canvas with a faint lavender wash near the top of the home screen to minimize eye strain.

## Typography

Dual-font strategy, optimized for Bengali personality and Latin legibility:

- **Baloo Da 2:** primary font for all headlines and Bengali text. Its rounded, friendly glyphs give the approachable character essential for a learning tool while keeping excellent Bengali-script legibility.
- **Be Vietnam Pro:** secondary font for Latin body copy, labels, and numerals. Contemporary and clean; pairs with Baloo Da 2 without competing.

**Scaling:** on mobile, large display headers scale down to `headline-lg-mobile` to keep the layout compact and avoid word-breaking in long Bengali strings.

## Numerals & Currency

Render numbers in **Bengali numerals** (০–৯) in all student-facing copy, not Latin digits. Prices use the **Taka symbol ৳** (e.g. ৳১৪,৫০০/=). Day counts, class numbers, and counts on chips follow the same rule. Latin digits are acceptable only inside fixed English tokens like "SSC '28".

## Layout & Spacing

Fluid grid with high internal padding so content breathes.

- **Mobile:** 4-column system, 16px side margins. This is the primary target.
- **Desktop:** 12-column system centered within a 1280px max width.
- **Rhythm:** an 8px base unit drives all spacing; favor airy vertical padding (20–24px) to separate list items and cards.
- **Sectioning:** content groups into "Card Sections" with a 24px gap between vertical blocks for a structured, digestible feed.

## Elevation & Depth

Hierarchy comes from **Tonal Layering** plus soft **Ambient Shadows** — avoid harsh borders.

1. **Level 0 (Canvas):** the blue-white background, with an optional faint lavender→white gradient at the top of the home feed.
2. **Level 1 (Cards):** white surfaces with a soft, diffused shadow (≈10% opacity, 12px blur) lifting them off the canvas. 16px radius.
3. **Level 2 (Deep surfaces / floating):** indigo-gradient thumbnails, dark promo banners, and primary CTAs use richer color and a more pronounced shadow to read as interactive or important.

Differentiate sections with subtle container-background shifts rather than lines.

## Gradients & Moments of Delight

- **Deep decorative gradient** (`gradient-deep-from` → `gradient-deep-to`): course-card thumbnails and dark feature banners. Carries deep indigo into violet, often overlaid with neon/illustrative artwork (e.g. the book-fair banner's glowing figures).
- **Progress gradient** (`gradient-progress-from` → `gradient-progress-to`): indigo→pink, for completion bars to visualize "energy."
- **Celebration:** confetti in pink, violet, and yellow at reward/completion moments; the orange gift box is the recurring reward motif. Use sparingly, only at genuine milestones.

## Shapes

Consistently **Rounded**:
- **Standard components** (buttons, inputs, small cards): 0.5rem (8px).
- **Primary containers** (course cards, banners, main sections): 1rem (16px) for a friendly, non-intimidating feel.
- **Status tags / chips:** fully pill-shaped (`full`) to distinguish them from actionable buttons.

## Components

### App Bar (top)
- Left: the Shikho hummingbird brand mark (pink/indigo).
- Right cluster: the **AI sparkle** icon (indigo gradient → "Shikho AI"), an **outlined class chip** (e.g. "ক্লাস ৯"), and a **circular profile avatar** with a soft pink-tinted ring.
- Transparent over the canvas; no hard divider.

### Bottom Navigation
- Four tabs. **Active tab:** pink (`secondary`) filled icon, pink label, and a short pink underline indicator beneath it.
- **Inactive tabs:** muted slate (`on-surface-variant` / `outline`) outline icons and gray labels.
- A small pink notification dot may sit on an icon (e.g. AI/Inbox).
- White surface, soft top shadow, pinned to the bottom on mobile.

### Buttons
- **Primary:** pill-shaped, **vibrant pink** (`secondary` / `secondary-container`) background, white text, no border. This is the main CTA (e.g. "৩ দিন ফ্রিতে শিখুন").
- **Secondary:** light indigo-tint background (`primary-container` tint / `secondary-fixed`-style soft fill) with **indigo** (`primary`) text — used for lower-urgency actions like "Buy program."
- **Ghost:** transparent with indigo text, for the least urgent actions.

### Cards
- 16px radius, white background, soft diffused shadow.
- Educational cards carry either a 4px colored accent or a full-width header image to categorize the subject.

### Course Card (carousel item)
- **Thumbnail (left):** deep indigo-gradient rectangle with the course art; overlay a **days-left pill** (pink-tint background, pink text, e.g. "৩১৭ দিন বাকি") in the top-left.
- **Detail (right):** course title in dark text (Baloo Da 2), then pricing — **original price** in muted `on-surface-variant`, struck through, with the **effective price** below it in **green** (`success`), bold.
- **Primary CTA:** full-width pink pill ("৩ দিন ফ্রিতে শিখুন").
- **Secondary action:** full-width indigo-tint button below it ("প্রোগ্রামটি কিনুন").
- Carousel shows **pagination dots** beneath: active dot pink, inactive dots light gray.

### Promo / Feature Banner
- Large 16px-radius card on a **deep indigo→violet gradient** surface, with vibrant neon/illustrative artwork bleeding to one side.
- White Baloo Da 2 headline and light body copy. Used for campaigns and events.

### Input Fields
- Soft gray-tinted background, 8px radius. Focus state: 2px primary-indigo border.

### Chips & Badges
- Categories (e.g. "ক্লাস ৯") and status ("ফ্রি", days-left). Small, pill-shaped, low-saturation background with high-saturation text of the same hue.
- Outlined variant (thin `outline` border, transparent fill, dark text) is used for the class chip in the app bar.

### Progress Indicators
- Horizontal bars filled with the indigo→pink progress gradient to visualize completion energy.

## Voice & Microcopy

Write from the student's side of the screen, in Bangla, warm and direct. Verbs name exactly what happens ("৩ দিন ফ্রিতে শিখুন" / "join," "continue"). Empty states are invitations to act, not mood. Keep the register encouraging but uncluttered — a label labels, a badge signals value, nothing does double duty.
