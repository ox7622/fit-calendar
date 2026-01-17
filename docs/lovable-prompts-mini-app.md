# FitCalendar Mini App — Lovable AI Prompts

This document contains a series of optimized prompts for generating the FitCalendar Telegram Mini App using [Lovable](https://lovable.dev).

**Generated:** January 9, 2026
**Source:** front-end-spec.md, architecture.md

---

## How to Use These Prompts

1. **Start with Prompt 1** — Sets up foundation and design system
2. **Continue sequentially** — Each prompt builds on the previous
3. **Iterate and refine** — Review output after each prompt, ask Lovable to adjust
4. **Connect the pieces** — After components work, wire up navigation and state

### Tips for Lovable

-   If output is too generic, paste specific color hex codes again
-   Ask for "mobile preview" to see proper sizing
-   Use "make it more like Telegram" if it feels too web-app-like
-   Request "dark theme only" first, then add light theme support

---

## Prompt 1: Project Setup & Design System Foundation

```
Create a React + TypeScript project for a Telegram Mini App called "FitCalendar" — a fitness class schedule viewer for gym members.

## Tech Stack
- React 18+ with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- Framer Motion for animations

## Design System Setup

Create a theme system supporting dark and light modes. The app detects theme from Telegram but defaults to dark.

### Color Tokens (CSS Variables)

Dark Theme (default):
- --bg-primary: #17272B (app background)
- --bg-card: #1E3338 (cards, elevated surfaces)
- --text-primary: #FFFFFF (headings, titles)
- --text-secondary: #9E9E9E (captions, metadata)
- --divider: #2A4449 (borders, separators)
- --accent-primary: #229C8B (buttons, CTAs)
- --accent-active: #2BB8A3 (hover, active states)

Light Theme:
- --bg-primary: #BCDDE6
- --bg-card: #FFFFFF
- --text-primary: #0E0E0E
- --text-secondary: #4A5568
- --divider: #9BC5D1
- --accent-primary: #229C8B
- --accent-active: #1A7A6D

Semantic Colors (both themes):
- --success: #22C55E (beginner badge)
- --warning: #FFB300 (intermediate badge)
- --error: #FF5252 (advanced badge, errors)

### Typography
- Font: Inter (with system-ui fallback)
- H1: 24px / 700 weight
- H2: 20px / 600 weight
- H3: 16px / 600 weight
- Body: 14px / 400 weight
- Caption: 12px / 400 weight

### Spacing Scale
4px, 8px, 12px, 16px, 24px, 32px

### Border Radius
- sm: 4px (badges)
- md: 8px (buttons)
- lg: 12px (cards)
- full: 9999px (avatars)

## Initial Structure

Create a mobile-first layout (max 430px centered) with:
1. A ThemeProvider component that reads theme from CSS class on root
2. A basic App shell with bottom tab navigation
3. Four tabs: Schedule (calendar icon), Coaches (users icon), Reminders (bell icon), Club (home icon)

The Schedule tab should be active by default. Use teal (#229C8B) for active tab icon.

DO NOT add any page content yet — just the shell and navigation.
```

---

## Prompt 2: Core UI Components

```
Add the following reusable components to the FitCalendar app. Place them in a /components folder.

## 1. Button Component

Props: variant ('primary' | 'secondary' | 'ghost'), size ('sm' | 'md' | 'lg'), disabled, loading, children

- Primary: bg-[#229C8B], white text, hover bg-[#2BB8A3] (dark) or bg-[#1A7A6D] (light)
- Secondary: transparent bg, #229C8B border and text
- Ghost: transparent, text color only
- Loading state: show spinner, disable click
- Press animation: scale to 0.97 for 100ms

## 2. Card Component

Props: children, onClick (optional), className

- Background: var(--bg-card)
- Border: 1px solid var(--divider)
- Border radius: 12px
- Padding: 16px
- If onClick provided, add subtle press animation (scale 0.98)

## 3. DifficultyBadge Component

Props: level ('beginner' | 'intermediate' | 'advanced')

- Beginner: #22C55E background, #0E0E0E text, label "Beginner"
- Intermediate: #FFB300 background, #0E0E0E text, label "Intermediate"
- Advanced: #FF5252 background, #FFFFFF text, label "Advanced"
- Style: 4px border radius, 4px 12px padding, 12px font, 600 weight

## 4. Avatar Component

Props: src (optional), name, size ('sm' | 'md' | 'lg' | 'xl')

- Sizes: sm=32px, md=48px, lg=80px, xl=120px
- If no src: show initials on #229C8B background
- Fully rounded (border-radius: 9999px)
- Object-fit: cover for images

## 5. ImpactBadge Component

Props: type ('cardio' | 'strength' | 'flexibility' | 'balance')

- Small pill with icon + label
- Cardio: #FF6B6B, heart-pulse icon
- Strength: #4DA6FF, dumbbell icon
- Flexibility: #B388FF, stretch icon
- Balance: #64FFDA, scale icon
- 4px radius, 8px padding, 11px font

## 6. BottomSheet Component

Props: isOpen, onClose, title (optional), children

- Slides up from bottom with backdrop fade
- 300ms animation with ease-out curve
- Drag handle at top (40px wide, 4px tall, rounded, centered)
- Can be dismissed by dragging down or tapping backdrop
- Max height: 85vh, scrollable content area

Create a components/index.ts that exports all components.
```

---

## Prompt 3: Schedule Page — Class Cards

```
Create the Schedule page for FitCalendar with today's class list.

## Page Structure

1. Header section:
   - Date display: "Today, January 9" (H2, left-aligned)
   - Filter icon button (sliders icon) on the right
   - Segmented control below: "Today" | "Week" toggle
   - "Today" is active by default with accent underline

2. Class list (scrollable, vertical):
   - Show 5-6 sample fitness classes
   - Each class uses the ClassCard component (create it)

## ClassCard Component

Display a single fitness class with:

Layout (horizontal flex):
- Left: Coach Avatar (md size, 48px)
- Middle (flex-1):
  - Row 1: Class name (H3, 16px semibold) + DifficultyBadge (right-aligned)
  - Row 2: Coach name + "•" + duration (e.g., "Maria K. • 60 min") in text-secondary
  - Row 3: Time range (e.g., "09:00 - 10:00") in 14px semibold
- Full card is tappable

## Sample Data

Create mock data for these classes:
1. Morning Yoga, Maria K., 09:00-10:00, 60min, beginner
2. HIIT Cardio, Alex T., 10:30-11:15, 45min, intermediate
3. Power Strength, Viktor S., 12:00-13:00, 60min, advanced
4. Pilates Core, Elena M., 14:00-15:00, 60min, beginner
5. Boxing Fitness, Dmitry K., 16:00-17:00, 60min, intermediate
6. Evening Stretch, Maria K., 18:00-18:45, 45min, beginner

## Interactions

- Tapping a ClassCard should log to console for now (we'll add navigation later)
- Filter button should log "open filter" for now
- Pull-to-refresh gesture (optional)

## Empty State

If no classes, show centered message: "No classes scheduled for today" with a subtle calendar icon above.

Use the existing theme colors and components. The page should feel native to Telegram — clean, fast, information-dense.
```

---

## Prompt 4: Training Detail Modal

```
Create a Training Detail view that shows when a user taps a ClassCard. Implement as a full-screen overlay that slides in from the right.

## Layout

1. Header:
   - Back arrow button (left)
   - "Class Details" title (centered)
   - Transparent background that matches app bg

2. Content (scrollable):

   a. Class Header Section:
      - Large class name (H1, 24px bold)
      - Time: "09:00 - 10:00" + date "Thursday, Jan 9"
      - Duration badge: "60 min" in a subtle chip

   b. Coach Section (tappable card):
      - Avatar (lg, 80px) on left
      - Name (H3) + "View Profile →" link text
      - Specializations as small tags below

   c. Class Info Section:
      - DifficultyBadge (full width context)
      - Impact types row (ImpactBadges for the class)
      - Equipment needed (bullet list or chips)
      - Description text (2-3 sentences about the class)

   d. Sticky Footer:
      - "Remind Me" primary button (full width)
      - When tapped, changes to "Cancel Reminder ✓" with checkmark
      - Button uses accent-primary color

## States

1. Default: "Remind Me" button
2. Reminder Set: Button shows "Cancel Reminder ✓", slightly different style (outlined or with check icon)
3. Class Started/Passed: Button disabled, shows "Class has started"

## Animation

- Page slides in from right (250ms, ease-in-out)
- Back button slides page out to right
- Button state change: subtle icon morph animation

## Sample Data for Detail

Use the Morning Yoga class:
- Coach: Maria K., specializes in Yoga, Pilates, Meditation
- Difficulty: Beginner
- Impact: Flexibility, Balance
- Equipment: Yoga mat (provided)
- Description: "Start your day with gentle stretches and mindful breathing. Perfect for all levels, this class focuses on flexibility and mental clarity."

Connect this to the ClassCard tap action from the Schedule page.
```

---

## Prompt 5: Filter Bottom Sheet

```
Create a Filter Panel as a BottomSheet that opens when tapping the filter icon on the Schedule page.

## Filter Options

### 1. Training Type (Multi-select chips)
Options: All, Yoga, Cardio, Strength, Pilates, Boxing, Stretching

- Chips in a flex-wrap row
- Unselected: outlined style with text-secondary
- Selected: filled with accent-primary, white text
- "All" is selected by default

### 2. Difficulty Level (Single-select)
Options: Any, Beginner, Intermediate, Advanced

- Radio button style or segmented pills
- "Any" selected by default
- Use the difficulty colors as accents when selected

### 3. Coach (Dropdown)
- "Any Coach" as default
- Dropdown with list of coach names
- Searchable if more than 5 coaches

## Footer Buttons

Row with two buttons:
- "Clear All" (ghost button, left)
- "Apply Filters" (primary button, right)

## Behavior

1. Opening: BottomSheet slides up (partial height, ~60% screen)
2. Clear All: Resets all to defaults
3. Apply: Closes sheet, filters would be applied (log selected filters for now)
4. Active Filters Indicator: After applying, show a small badge on the filter icon (e.g., red dot or count)

## Visual Details

- Section headers: "Training Type", "Difficulty", "Coach" in caption style (12px, text-secondary, uppercase)
- 16px spacing between sections
- 24px padding on sides
- Drag handle at top of sheet

Ensure the sheet can be dismissed by:
- Tapping "Apply"
- Tapping backdrop
- Dragging down
```

---

## Prompt 6: Coaches Tab

```
Create the Coaches tab with a list/grid of fitness coaches.

## Page Layout

1. Header:
   - "Our Coaches" (H1, 24px)
   - Subtitle: "Meet your trainers" (text-secondary)

2. Coach Grid:
   - 2-column grid layout
   - Gap: 12px
   - Each coach in a CoachCard

## CoachCard Component

Vertical card layout:
- Avatar at top (xl size, 120px, centered)
- Name below (H3, 16px semibold, centered)
- Specialization tags (2-3 small chips, centered)
- Entire card tappable

Card styling:
- Uses Card component (bg-card, 12px radius)
- Padding: 16px
- Subtle hover/press effect

## Sample Coach Data

1. Maria K. — Yoga, Pilates, Meditation (photo placeholder)
2. Alex T. — HIIT, Cardio, CrossFit
3. Viktor S. — Strength, Powerlifting, Bodybuilding
4. Elena M. — Pilates, Stretching, Rehabilitation
5. Dmitry K. — Boxing, MMA, Conditioning
6. Anna S. — Dance, Aerobics, Zumba

## Interactions

- Tapping a CoachCard navigates to Coach Profile (implement navigation)
- Add subtle scale animation on press (0.98 scale)

## Empty State

If no coaches: "No coaches available" with users icon
```

---

## Prompt 7: Coach Profile Page

```
Create a Coach Profile page that shows when tapping a CoachCard.

## Layout

1. Header (with back navigation):
   - Back arrow
   - "Coach Profile" title

2. Hero Section:
   - Large Avatar (xl, 120px, centered)
   - Coach name (H1, centered)
   - Title/Role: "Fitness Instructor" (text-secondary, centered)

3. Specializations:
   - Row of chips/tags for specializations
   - Centered, with accent color

4. Bio Section:
   - Section header: "About"
   - 2-3 paragraphs about the coach
   - text-primary, 14px

5. Certifications Section:
   - Section header: "Certifications"
   - List with checkmark icons
   - e.g., "✓ ACE Certified Personal Trainer"

6. CTA Section:
   - "View Schedule" primary button (full width)
   - Tapping shows coach's upcoming classes

## Sample Data (Maria K.)

- Name: Maria Konstantinova
- Title: Senior Yoga Instructor
- Specializations: Yoga, Pilates, Meditation, Breathwork
- Bio: "Maria has been teaching yoga for over 10 years, bringing a gentle yet transformative approach to every class. Her sessions focus on mind-body connection, flexibility, and inner peace. Whether you're a complete beginner or advanced practitioner, Maria creates a welcoming space for growth."
- Certifications:
  - Yoga Alliance RYT-500
  - Pilates Method Alliance Certified
  - Mindfulness-Based Stress Reduction (MBSR)

## Coach Schedule View

When "View Schedule" is tapped, show a filtered list of this coach's upcoming classes (reuse ClassCard component). This could be a bottom sheet or a separate screen section.
```

---

## Prompt 8: Reminders Tab

```
Create the Reminders tab showing the user's active class reminders.

## Page Layout

1. Header:
   - "My Reminders" (H1)
   - Settings icon (gear) on right to adjust reminder timing

2. Reminder List:
   - Vertical list of ReminderCard components
   - Sorted by upcoming date/time

## ReminderCard Component

Similar to ClassCard but with reminder-specific info:
- Left: Coach Avatar (md)
- Middle:
  - Class name (H3)
  - Coach name (text-secondary)
  - Date + Time: "Tomorrow, 09:00" or "Jan 10, 14:00"
  - Reminder timing: "🔔 30 min before" (small, text-secondary)
- Right: Cancel button (X icon, ghost style, text-secondary)

Card styling:
- bg-card with accent-primary left border (3px)
- 12px radius
- 16px padding

## Interactions

- Tapping the card opens Training Detail
- Tapping X shows confirmation: "Cancel reminder?" with Cancel/Confirm buttons
- After canceling, card animates out (slide left + fade)

## Sample Reminders

1. Morning Yoga with Maria K. — Tomorrow, 09:00 — 30 min before
2. HIIT Cardio with Alex T. — Jan 10, 10:30 — 30 min before
3. Evening Stretch with Maria K. — Jan 10, 18:00 — 30 min before

## Empty State

If no reminders:
- Bell icon (large, muted)
- "No reminders yet"
- "Tap 'Remind Me' on any class to get notified"
- Subtle CTA: "Browse Schedule →"

## Settings Sheet

When tapping gear icon, show BottomSheet:
- "Reminder Settings" header
- "Notify me before class:"
- Options: 15 min, 30 min (default), 1 hour, 2 hours
- Save button
```

---

## Prompt 9: Club Info Tab

```
Create the Club tab showing club information and contact details.

## Page Layout

1. Header:
   - Club logo placeholder (or name in stylized text)
   - Club name: "FitLife Gym" (H1)

2. Info Cards (vertical stack):

### Contact Card
- Phone: "+7 (999) 123-45-67" (tappable, opens tel:)
- Telegram: "@fitlife_gym" (tappable)
- Address: "123 Fitness Street, Moscow" (tappable, opens maps)

### Working Hours Card
- Section header: "Working Hours"
- List of days with times:
  - Monday - Friday: 07:00 - 23:00
  - Saturday: 08:00 - 22:00
  - Sunday: 09:00 - 21:00
- Current status indicator: "Open now" (green) or "Closed" (red)

### Location Card (optional)
- Static map preview (placeholder image)
- "Get Directions" button

3. Footer:
- Social links row (Telegram, Instagram icons)
- Small text: "© 2026 FitLife Gym"

## Visual Style

- Each section in a Card component
- Icons from Lucide (Phone, MapPin, Clock, etc.)
- Text-secondary for labels, text-primary for values
- Tappable items have subtle hover/active state

## Interactions

- Phone taps → opens phone dialer
- Address taps → opens maps (Google Maps link)
- Telegram taps → opens Telegram link
```

---

## Prompt 10: Final Polish & Animations

```
Add final polish to the FitCalendar Mini App:

## 1. Page Transitions

Add smooth transitions between tabs and pages:
- Tab switches: content fades (150ms)
- Push navigation (to detail pages): slide from right (250ms)
- Back navigation: slide to right (250ms)
- Use Framer Motion AnimatePresence

## 2. Loading States

Add skeleton loaders for:
- ClassCard: gray shimmer rectangles matching card layout
- CoachCard: circular skeleton for avatar, rectangles for text
- Use a subtle shimmer animation (1.5s loop)

## 3. Pull to Refresh

On Schedule page:
- Pull down gesture shows refresh indicator
- Spinner with accent color
- Release triggers data refresh

## 4. Toast Notifications

Create a Toast component:
- Slides in from top
- Auto-dismisses after 3 seconds
- Variants: success (green), error (red), info (accent)
- Used for: "Reminder set!", "Reminder cancelled", errors

## 5. Haptic Feedback Hints

Add comments indicating where haptic feedback would trigger:
- Button presses
- Reminder toggle
- Successful actions

## 6. Empty States

Ensure all tabs have proper empty states with:
- Relevant icon (muted color)
- Friendly message
- Action suggestion where appropriate

## 7. Error States

Add error handling UI:
- "Something went wrong" message
- Retry button
- Maintain last known good state when possible

## 8. Micro-interactions

- Button press: scale 0.97
- Card press: scale 0.98
- Tab icon: subtle bounce on select
- Reminder button: icon morphs from bell to check

Ensure all animations respect prefers-reduced-motion media query.
```

---

## Next Steps After Generation

Once you've generated the Mini App with these prompts:

1. **Review and refine** — Ask Lovable to adjust specific components
2. **Connect to real API** — Replace mock data with actual API calls
3. **Add Telegram WebApp SDK** — Integrate `@twa-dev/sdk` for:
    - Theme detection (`WebApp.colorScheme`)
    - User authentication (`WebApp.initData`)
    - Native buttons (`WebApp.MainButton`, `WebApp.BackButton`)
    - Haptic feedback (`WebApp.HapticFeedback`)
4. **Test in Telegram** — Use BotFather to create a test bot and Mini App

---

## Important Reminder

All AI-generated code requires careful human review, testing, and refinement before production use. These prompts provide a starting framework — expect to iterate and customize the output to meet your exact requirements.

---

_Generated by Sally (UX Expert) using BMAD-METHOD_
