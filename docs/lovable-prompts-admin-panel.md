# FitCalendar Admin Panel — Lovable AI Prompts

This document contains a series of optimized prompts for generating the FitCalendar Admin Panel using [Lovable](https://lovable.dev).

**Generated:** January 9, 2026
**Source:** front-end-spec.md, architecture.md

---

## How to Use These Prompts

1. **Start with Prompt 1** — Sets up foundation, layout, and design system
2. **Continue sequentially** — Each prompt builds on the previous
3. **Iterate and refine** — Review output after each prompt, ask Lovable to adjust
4. **Connect to API** — Replace mock data with real API calls last

### Admin Panel Context

- **Target:** Desktop-first, responsive to tablet
- **Users:** Club staff managing schedules, coaches, and settings
- **Auth:** JWT-based login (separate from Telegram users)

---

## Prompt 1: Project Setup & Admin Layout

```
Create a React + TypeScript admin panel for "FitCalendar" — a fitness club management dashboard.

## Tech Stack
- React 18+ with TypeScript
- Tailwind CSS for styling
- Lucide React for icons
- React Router for navigation

## Design System

Use a professional, clean admin aesthetic with the same color tokens as the main app.

### Color Tokens (CSS Variables)

Light Theme (default for admin):
- --bg-primary: #F5F7FA (page background)
- --bg-card: #FFFFFF (cards, panels)
- --bg-sidebar: #1E3338 (dark sidebar)
- --text-primary: #0E0E0E
- --text-secondary: #4A5568
- --text-sidebar: #FFFFFF
- --text-sidebar-muted: #9E9E9E
- --divider: #E2E8F0
- --accent-primary: #229C8B
- --accent-active: #1A7A6D

Semantic Colors:
- --success: #22C55E
- --warning: #FFB300
- --error: #FF5252

### Typography
- Font: Inter (with system-ui fallback)
- H1: 28px / 700 weight
- H2: 22px / 600 weight
- H3: 18px / 600 weight
- Body: 14px / 400 weight
- Caption: 12px / 400 weight

## Admin Layout Structure

Create a classic admin layout with:

### 1. Sidebar (Fixed Left, 260px wide)
- Dark background (#1E3338)
- Logo/brand area at top: "FitCalendar Admin"
- Navigation menu with icons:
  - Dashboard (grid icon)
  - Schedule (calendar icon)
  - Coaches (users icon)
  - Training Types (tag icon)
  - Club Settings (building icon)
- Active item: accent background (#229C8B), white text
- Inactive: muted text (#9E9E9E)
- Collapsible to icons-only (64px) on tablet
- User section at bottom: avatar + name + logout

### 2. Top Bar (Fixed Top, right of sidebar)
- White background with subtle shadow
- Page title on left
- Right side: notification bell, user dropdown

### 3. Main Content Area
- Scrollable
- Max-width: 1400px centered
- Padding: 24px
- Background: #F5F7FA

## Initial Routes

Set up React Router with these routes:
- /dashboard
- /schedule
- /coaches
- /training-types
- /settings

Dashboard should be the default. Create placeholder pages for each route showing just the page title.

DO NOT add login yet — assume user is authenticated.
```

---

## Prompt 2: Shared Admin Components

```
Add the following reusable admin components to the FitCalendar admin panel. Place them in /components/admin folder.

## 1. Button Component

Props: variant ('primary' | 'secondary' | 'ghost' | 'danger'), size ('sm' | 'md' | 'lg'), disabled, loading, leftIcon, rightIcon, children

- Primary: bg-[#229C8B], white text, hover bg-[#1A7A6D]
- Secondary: white bg, #229C8B border and text
- Ghost: transparent, text color only
- Danger: bg-[#FF5252], white text
- Loading: show spinner, disable click
- Icon support on left or right of text

## 2. Card Component

Props: title (optional), actions (optional ReactNode), children, className

- White background
- Subtle border (#E2E8F0)
- Border radius: 8px
- If title provided: header with 16px bottom padding and border
- Actions render in header right side (e.g., buttons)
- Content padding: 24px

## 3. DataTable Component

Props: columns, data, onRowClick (optional), loading, emptyMessage

- Full-width table with clean styling
- Header row: gray background (#F5F7FA), semibold text
- Body rows: white, hover effect
- Borders between rows
- Support for custom cell renderers via columns config
- Loading state: skeleton rows
- Empty state: centered message

Column config shape:
```typescript
{
  key: string;
  header: string;
  width?: string;
  render?: (value, row) => ReactNode;
}
```

## 4. Modal Component

Props: isOpen, onClose, title, size ('sm' | 'md' | 'lg' | 'xl'), children, footer

- Centered overlay with backdrop
- Sizes: sm=400px, md=560px, lg=720px, xl=900px
- Header with title and X close button
- Scrollable content area
- Optional footer for action buttons
- Close on backdrop click and Escape key
- Smooth fade + scale animation

## 5. Input Component

Props: label, type, placeholder, value, onChange, error, helperText, required, disabled

- Label above input
- Full-width input with border
- Focus: accent border color
- Error state: red border, error message below
- Helper text in muted color

## 6. Select Component

Props: label, options, value, onChange, placeholder, error, required

- Same styling as Input
- Options as array of { value, label }
- Chevron down icon

## 7. Badge Component

Props: variant ('default' | 'success' | 'warning' | 'error'), children

- Small pill style
- Default: gray
- Success: green
- Warning: amber
- Error: red

## 8. PageHeader Component

Props: title, subtitle (optional), actions (optional ReactNode)

- Title: H1 style
- Subtitle: text-secondary below
- Actions: right-aligned (e.g., "Add New" button)
- Bottom margin for spacing from content

Create a components/admin/index.ts that exports all components.
```

---

## Prompt 3: Dashboard Page

```
Create the Dashboard page for FitCalendar admin panel.

## Page Layout

### Header
Use PageHeader component:
- Title: "Dashboard"
- Subtitle: "Welcome back! Here's what's happening today."

### Stats Cards Row (4 columns on desktop, 2 on tablet)

Create a StatCard component with:
- Icon (in colored circle)
- Label (text-secondary)
- Value (large number, H2)
- Optional trend indicator (+12% ↑ in green, -5% ↓ in red)

Stats to show:
1. Today's Classes: 8 (calendar icon, accent color)
2. Active Reminders: 24 (bell icon, blue)
3. Total Coaches: 6 (users icon, purple)
4. Weekly Attendance: 156 (trending-up icon, green)

### Today's Schedule Card

Card with:
- Title: "Today's Schedule"
- Action button: "View All →"
- Content: List of today's classes (compact view)

Each class row shows:
- Time (09:00)
- Class name
- Coach name
- Reminder count badge

Show 5-6 classes, sorted by time.

### Recent Activity Card

Card with:
- Title: "Recent Activity"
- Content: Activity feed list

Activity items:
- "New reminder set for Morning Yoga" — 5 min ago
- "Elena M. updated her profile" — 1 hour ago
- "HIIT Cardio class cancelled" — 2 hours ago
- "3 new reminders for Power Strength" — 3 hours ago

Each item has:
- Activity icon (bell, user, x-circle, etc.)
- Description text
- Relative timestamp (text-secondary)

### Quick Actions Card (optional)

Card with shortcut buttons:
- "Add Class" (primary)
- "Add Coach" (secondary)
- "View Schedule" (ghost)

## Layout Grid

Use CSS Grid:
- Stats: 4 columns
- Below: 2 columns (Today's Schedule 60%, Recent Activity 40%)
- On tablet: stack vertically

```

---

## Prompt 4: Schedule Management — Calendar View

```
Create the Schedule Management page with a weekly calendar view.

## Page Layout

### Header
- Title: "Schedule Management"
- Actions: "Add Class" primary button

### Calendar Navigation

Row with:
- Left arrow button
- Current week display: "January 6 - 12, 2026"
- Right arrow button
- Today button (ghost): "Today"
- View toggle: "Week" | "Day" (Week active by default)

### Weekly Calendar Grid

Create a calendar grid showing 7 days:

Structure:
- Header row: Day names + dates (Mon 6, Tue 7, Wed 8, etc.)
- Today's column highlighted with accent background tint
- Time column on left: 07:00 to 22:00 (1-hour increments)
- Grid cells for each hour/day intersection

### Class Blocks

Classes appear as colored blocks in the grid:
- Position based on start time and duration
- Height proportional to duration
- Background: accent color with 80% opacity
- Border-left: 3px solid accent
- Content: Class name, Coach name (truncated if needed)
- Hover: show full details tooltip
- Click: opens edit modal

### Class Block Colors by Type
- Yoga: teal (#229C8B)
- Cardio: coral (#FF6B6B)
- Strength: blue (#4DA6FF)
- Pilates: purple (#B388FF)
- Boxing: orange (#FF9800)

### Sample Data

Populate with classes across the week:
- Monday: Morning Yoga 09:00, HIIT 17:00
- Tuesday: Pilates 10:00, Boxing 18:00
- Wednesday: Strength 12:00, Yoga 19:00
- Thursday: Cardio 08:00, Stretch 20:00
- Friday: Boxing 11:00, Strength 17:00
- Saturday: Yoga 09:00, 10:00, 11:00
- Sunday: Stretch 10:00

### Interactions

- Click empty cell: Open "Add Class" modal with pre-filled date/time
- Click class block: Open "Edit Class" modal
- Drag class block: Reschedule (optional, advanced)
- Hover class: Show tooltip with full details

### Day View (when toggled)

Single day expanded view:
- Same time column
- Classes shown as larger blocks with more detail
- Easier to see overlapping classes

```

---

## Prompt 5: Schedule Management — Class Form Modal

```
Create the Class Form modal for adding and editing schedule entries.

## Modal Structure

Use Modal component with size="lg" (720px)

### Header
- Add mode: "Add New Class"
- Edit mode: "Edit Class"
- X close button

### Form Layout (2 columns on desktop)

#### Left Column

1. Training Type (Select, required)
   - Options: Yoga, HIIT Cardio, Power Strength, Pilates Core, Boxing Fitness, Evening Stretch
   - Placeholder: "Select training type"

2. Coach (Select, required)
   - Options: Maria K., Alex T., Viktor S., Elena M., Dmitry K., Anna S.
   - Placeholder: "Select coach"

3. Date (Date picker, required)
   - Default: selected date from calendar or today

4. Start Time (Time picker, required)
   - 15-minute increments
   - Default: next hour

5. Duration (Select, required)
   - Options: 30 min, 45 min, 60 min, 90 min
   - Default: 60 min

#### Right Column

6. Status (Radio buttons)
   - Scheduled (default)
   - Cancelled

7. Cancellation Reason (Textarea, only if Cancelled)
   - Placeholder: "Reason for cancellation (will be sent to subscribers)"
   - Max 200 characters

8. Notes (Textarea, optional)
   - Placeholder: "Internal notes (not shown to users)"

### Preview Section

Below the form, show a preview card:
- "Preview" label
- ClassCard-style preview showing how it will appear to users
- Updates in real-time as form changes

### Footer Actions

- Cancel button (ghost)
- Delete button (danger, only in edit mode) — shows confirmation
- Save button (primary)

### Validation

- All required fields must be filled
- Start time must be in the future (for new classes)
- Show inline errors

### Edit Mode Extras

When editing:
- Pre-fill all fields with existing data
- Show "X subscribers will be notified of changes" warning
- Delete button with confirmation: "Delete this class? X users have reminders set."

### Cancel Class Flow

When status changed to Cancelled:
1. Show cancellation reason field
2. On save, show confirmation: "Cancel this class and notify X subscribers?"
3. After confirm: class stays in calendar but grayed out with "CANCELLED" badge

```

---

## Prompt 6: Coach Management — List & Table

```
Create the Coaches management page with a data table.

## Page Layout

### Header
- Title: "Coach Management"
- Subtitle: "Manage your fitness instructors"
- Action: "Add Coach" primary button

### Filters Row

Row with filter controls:
- Search input: "Search coaches..." (searches name)
- Status filter (Select): All, Active, Inactive
- Specialization filter (Select): All, Yoga, Cardio, Strength, etc.

### Coaches Table

Use DataTable component with columns:

| Column | Width | Content |
|--------|-------|---------|
| Coach | 300px | Avatar (sm) + Name + Email |
| Specializations | 250px | Chip tags (max 3, +N more) |
| Classes | 100px | Number this week |
| Status | 100px | Badge (Active=green, Inactive=gray) |
| Actions | 120px | Edit, Deactivate buttons |

### Sample Data

| Name | Email | Specializations | Classes | Status |
|------|-------|-----------------|---------|--------|
| Maria Konstantinova | maria@fitlife.ru | Yoga, Pilates, Meditation | 12 | Active |
| Alex Tretyakov | alex@fitlife.ru | HIIT, Cardio, CrossFit | 8 | Active |
| Viktor Smirnov | viktor@fitlife.ru | Strength, Powerlifting | 6 | Active |
| Elena Mikhailova | elena@fitlife.ru | Pilates, Stretching | 10 | Active |
| Dmitry Kozlov | dmitry@fitlife.ru | Boxing, MMA | 5 | Active |
| Anna Sokolova | anna@fitlife.ru | Dance, Aerobics | 0 | Inactive |

### Row Interactions

- Click row: Open coach detail/edit modal
- Edit button: Same as row click
- Deactivate button: Show confirmation, then toggle status

### Empty State

If no coaches match filters:
- "No coaches found"
- "Try adjusting your filters or add a new coach"
- "Add Coach" button

### Pagination

Below table:
- "Showing 1-6 of 6 coaches"
- Page size selector: 10, 25, 50
- Page navigation (if more than one page)

```

---

## Prompt 7: Coach Management — Add/Edit Form

```
Create the Coach Form modal for adding and editing coaches.

## Modal Structure

Use Modal component with size="lg" (720px)

### Header
- Add mode: "Add New Coach"
- Edit mode: "Edit Coach"

### Form Layout

#### Photo Section (Top)

Photo upload area:
- Current photo preview (120px circle) or placeholder
- "Upload Photo" button below
- "Remove" link if photo exists
- Accepted: JPG, PNG, max 5MB
- Shows upload progress
- Photo will be sent to Cloudinary (note in comments)

#### Basic Info Section

1. Full Name (Input, required)
   - Placeholder: "Enter coach's full name"

2. Email (Input, email type, required)
   - Placeholder: "coach@fitlife.ru"

3. Phone (Input, tel type, optional)
   - Placeholder: "+7 (999) 123-45-67"

#### Professional Info Section

4. Specializations (Multi-select chips)
   - Options: Yoga, Pilates, HIIT, Cardio, Strength, Boxing, Dance, Stretching, CrossFit, MMA
   - Click to toggle selection
   - At least one required

5. Bio (Textarea, optional)
   - Placeholder: "Brief biography for the coach profile..."
   - Max 500 characters
   - Character count shown

6. Certifications (Dynamic list)
   - Add certification input + "Add" button
   - Each certification shows as removable tag
   - Examples: "Yoga Alliance RYT-500", "ACE Certified"

#### Status Section

7. Status (Toggle switch)
   - Active / Inactive
   - Default: Active
   - Inactive coaches don't appear in Mini App

### Footer Actions

- Cancel button (ghost)
- Delete button (danger, edit mode only)
- Save button (primary)

### Validation

- Name: required, min 2 characters
- Email: required, valid email format, unique
- Specializations: at least one selected
- Photo: optional but recommended

### Delete Confirmation

"Delete this coach? They have X upcoming classes that will need to be reassigned."

Options:
- Cancel
- Delete (danger)

```

---

## Prompt 8: Training Types Management

```
Create the Training Types management page.

## Page Layout

### Header
- Title: "Training Types"
- Subtitle: "Define class categories and their attributes"
- Action: "Add Training Type" primary button

### Training Types Grid

Display as cards in a 3-column grid (2 on tablet):

### TrainingTypeCard Component

Card layout:
- Header: Name (H3) + Status badge
- Color indicator strip on left edge
- Description (2 lines, truncated)
- Attributes row:
  - Difficulty badge
  - Impact types (small icons)
- Equipment list (if any)
- Footer: Edit button, class count ("12 classes scheduled")

### Sample Data

1. **Morning Yoga**
   - Difficulty: Beginner
   - Impacts: Flexibility, Balance
   - Equipment: Yoga mat
   - Color: Teal
   - 8 classes scheduled

2. **HIIT Cardio**
   - Difficulty: Intermediate
   - Impacts: Cardio, Strength
   - Equipment: None
   - Color: Coral
   - 6 classes scheduled

3. **Power Strength**
   - Difficulty: Advanced
   - Impacts: Strength
   - Equipment: Dumbbells, Barbell, Bench
   - Color: Blue
   - 4 classes scheduled

4. **Pilates Core**
   - Difficulty: Beginner
   - Impacts: Flexibility, Balance
   - Equipment: Mat, Resistance band
   - Color: Purple
   - 5 classes scheduled

5. **Boxing Fitness**
   - Difficulty: Intermediate
   - Impacts: Cardio, Strength
   - Equipment: Boxing gloves, Punching bag
   - Color: Orange
   - 3 classes scheduled

6. **Evening Stretch**
   - Difficulty: Beginner
   - Impacts: Flexibility
   - Equipment: Mat
   - Color: Teal
   - 4 classes scheduled

### Training Type Form Modal

Modal (size="md") with fields:

1. Name (Input, required)
2. Description (Textarea, optional, max 200 chars)
3. Difficulty (Select): Beginner, Intermediate, Advanced
4. Impact Types (Multi-select): Cardio, Strength, Flexibility, Balance
5. Equipment (Dynamic list): Add/remove equipment items
6. Color (Color picker or preset swatches)
7. Status (Toggle): Active/Inactive

### Interactions

- Click card: Open edit modal
- Add button: Open add modal
- Deactivate: Training type hidden from schedule creation

```

---

## Prompt 9: Club Settings Page

```
Create the Club Settings page for managing club information.

## Page Layout

### Header
- Title: "Club Settings"
- Subtitle: "Manage your club's public information"

### Settings Sections (Stacked cards)

#### 1. Basic Information Card

Form fields:
- Club Name (Input, required): "FitLife Gym"
- Phone (Input): "+7 (999) 123-45-67"
- Email (Input): "info@fitlife.ru"
- Telegram Handle (Input): "@fitlife_gym"

Logo upload:
- Current logo preview (160x160)
- Upload button
- Remove link

Save button at bottom of card

#### 2. Address & Location Card

Form fields:
- Street Address (Input): "123 Fitness Street"
- City (Input): "Moscow"
- Postal Code (Input): "123456"

Map Section:
- Latitude (Input): "55.7558"
- Longitude (Input): "37.6173"
- "Pick on Map" button (opens map picker modal)
- Map preview showing pin at coordinates

Save button at bottom of card

#### 3. Working Hours Card

Weekly schedule editor:

| Day | Status Toggle | Open Time | Close Time |
|-----|--------------|-----------|------------|
| Monday | ✓ On | 07:00 | 23:00 |
| Tuesday | ✓ On | 07:00 | 23:00 |
| Wednesday | ✓ On | 07:00 | 23:00 |
| Thursday | ✓ On | 07:00 | 23:00 |
| Friday | ✓ On | 07:00 | 23:00 |
| Saturday | ✓ On | 08:00 | 22:00 |
| Sunday | ✓ On | 09:00 | 21:00 |

- Toggle off = Closed that day (times disabled)
- Time pickers for open/close
- "Apply to all weekdays" quick action

Save button at bottom of card

#### 4. Admin Users Card

Mini table of admin users:

| Name | Email | Last Login | Actions |
|------|-------|------------|---------|
| Admin User | admin@fitlife.ru | Today, 10:30 | Edit |
| Manager | manager@fitlife.ru | Yesterday | Edit, Remove |

- "Add Admin" button
- Edit opens user form modal
- Cannot remove yourself

### Admin User Form Modal

Fields:
- Name (Input, required)
- Email (Input, required)
- Password (Input, only for new users or if "Change password" checked)
- Status (Toggle): Active/Inactive

### Success Feedback

After saving any section:
- Show success toast: "Settings saved successfully"
- Subtle check animation on save button

```

---

## Prompt 10: Login Page

```
Create the Admin Login page for FitCalendar.

## Page Layout

Centered card on gradient or subtle pattern background.

### Login Card (max-width: 400px)

#### Header
- FitCalendar logo or text mark
- "Admin Panel" subtitle
- Divider line

#### Form

1. Email Input
   - Label: "Email"
   - Type: email
   - Placeholder: "admin@fitlife.ru"
   - Icon: Mail (left side)

2. Password Input
   - Label: "Password"
   - Type: password (with show/hide toggle)
   - Placeholder: "Enter your password"
   - Icon: Lock (left side)

3. Remember Me Checkbox
   - "Remember me for 30 days"

4. Login Button
   - Full width, primary style
   - "Sign In"
   - Loading state with spinner

#### Footer
- "Forgot password?" link (can be non-functional placeholder)
- Small copyright: "© 2026 FitCalendar"

### States

1. Default: Empty form, button enabled
2. Loading: Button shows spinner, inputs disabled
3. Error: Red border on invalid field, error message below
4. Success: Redirect to dashboard

### Error Messages

- Empty email: "Email is required"
- Invalid email: "Please enter a valid email"
- Empty password: "Password is required"
- Wrong credentials: "Invalid email or password" (toast or inline)

### Validation

- Validate on blur and on submit
- Disable submit until both fields have values

### After Login

- Store JWT token (localStorage or cookie)
- Redirect to /dashboard
- Show welcome toast: "Welcome back, [Name]!"

### Already Logged In

If user visits /login with valid token:
- Redirect to /dashboard automatically

### Background Styling

Options (choose one):
- Solid color (#1E3338 dark)
- Gradient (dark teal to darker)
- Subtle pattern or shapes

Keep it professional and clean.

```

---

## Prompt 11: Final Polish & Responsive

```
Add final polish to the FitCalendar Admin Panel:

## 1. Responsive Behavior

### Sidebar
- Desktop (1024px+): Full sidebar (260px)
- Tablet (768-1023px): Collapsed icons-only (64px)
- Mobile (<768px): Hidden, hamburger menu in top bar

### Tables
- Horizontal scroll on smaller screens
- Priority columns stay visible

### Forms
- Stack to single column below 640px

### Calendar
- Week view → 5 days on tablet
- Week view → Day view on mobile

## 2. Loading States

Add loading indicators:
- Page load: Centered spinner
- Table load: Skeleton rows
- Form submit: Button spinner
- Calendar: Skeleton grid

## 3. Toast Notifications

Create toast system:
- Position: top-right
- Auto-dismiss: 5 seconds
- Variants: success, error, warning, info
- Stack multiple toasts

Use for:
- "Class saved successfully"
- "Coach profile updated"
- "Settings saved"
- Error messages

## 4. Confirmation Dialogs

Create reusable ConfirmDialog component:
- Modal with warning icon
- Title and message
- Cancel + Confirm buttons
- Danger variant for destructive actions

Use for:
- Delete operations
- Deactivate coach/training type
- Cancel class with subscribers

## 5. Empty States

All list pages need empty states:
- Relevant illustration or icon
- Helpful message
- CTA to add first item

## 6. Keyboard Navigation

- Escape closes modals
- Enter submits forms
- Tab navigation through form fields
- Arrow keys in calendar (optional)

## 7. Form Improvements

- Auto-save draft (optional)
- Unsaved changes warning when navigating away
- Field validation on blur

## 8. Breadcrumbs (Optional)

For deep pages:
- Dashboard > Coaches > Maria K.
- Dashboard > Schedule > January 9

## 9. Dark Mode Toggle (Optional)

Add toggle in top bar or settings:
- Switches admin panel theme
- Persists to localStorage

Ensure this is thorough and production-ready.
```

---

## API Integration Notes

After generating the UI, connect to these API endpoints:

### Auth
- `POST /admin/auth/login` — Login, returns JWT

### Schedule
- `GET /admin/schedule?week=2026-01-06` — Week's classes
- `POST /admin/schedule` — Create class
- `PUT /admin/schedule/:id` — Update class
- `POST /admin/schedule/:id/cancel` — Cancel with notification
- `DELETE /admin/schedule/:id` — Delete class

### Coaches
- `GET /admin/coaches` — List all coaches
- `POST /admin/coaches` — Create coach
- `PUT /admin/coaches/:id` — Update coach
- `POST /admin/coaches/:id/photo` — Upload photo
- `DELETE /admin/coaches/:id` — Delete coach

### Training Types
- `GET /admin/training-types` — List all
- `POST /admin/training-types` — Create
- `PUT /admin/training-types/:id` — Update
- `DELETE /admin/training-types/:id` — Delete

### Club Info
- `GET /admin/club-info` — Get settings
- `PUT /admin/club-info` — Update settings

### Admin Users
- `GET /admin/users` — List admins
- `POST /admin/users` — Create admin
- `PUT /admin/users/:id` — Update admin
- `DELETE /admin/users/:id` — Delete admin

---

## Quick Reference — Prompt Sequence

| # | Prompt | Purpose |
|---|--------|---------|
| 1 | Project Setup | Layout shell, sidebar, routing |
| 2 | Shared Components | Button, Card, Table, Modal, Form inputs |
| 3 | Dashboard | Stats, today's classes, activity feed |
| 4 | Schedule Calendar | Weekly grid view, class blocks |
| 5 | Class Form | Add/edit schedule entries |
| 6 | Coach List | Data table with filters |
| 7 | Coach Form | Add/edit coach profiles |
| 8 | Training Types | Type management cards |
| 9 | Club Settings | Club info, hours, admins |
| 10 | Login Page | Authentication UI |
| 11 | Final Polish | Responsive, loading, toasts |

---

## Important Reminder

All AI-generated code requires careful human review, testing, and refinement before production use. These prompts provide a starting framework — expect to iterate and customize the output to meet your exact requirements.

---

*Generated by Sally (UX Expert) using BMAD-METHOD*
