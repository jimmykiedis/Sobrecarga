# ⚡️ Sobrecarga

<p align="center">
  <a href="https://jimmykiedis.github.io/Sobrecarga/">
    <img src="icons/tarja.png" height="55" alt="Open Project">
  </a>
  <br>
  <em>Click the image to access the live demo.</em>
</p>

---

**Overload** is a PWA designed for psychological organization and personal tracking during periods of emotional, professional, or family overload.

The goal is not productivity or task management.

The goal is to give the user clarity to review their current state, understand what has changed, and identify which concrete step deserves attention.

The MVP can be accessed through GitHub Pages.

> **Note:** Access currently requires prior registration by the project owner.

---

## 🚧 Current Implementation

### Screen 1: Login

- Email and password authentication.
- Firebase Authentication integration.
- Responsive interface with loading and error states.

### Screen 2: Main Dashboard

The main dashboard currently renders 11 cards:

1. **Simple summary** with relevant data and a chart.
2. **Cardinal variables** representing key areas of the user's life, with values ranging from `49` to `99`.
3. Card for base variables related to the `Identity` cardinal.
4. Card for base variables related to the `Mental Health` cardinal.
5. Card for base variables related to the `Physical Health` cardinal.
6. Card for base variables related to the `Family` cardinal.
7. Card for base variables related to the `Professional` cardinal.
8. **Progress review pop-up**, asking about progress over a relative time period using a scale from `-3` to `+3`.
9. **Concrete next-step question**, with a leaf-search modal connected to card 8.
10. **Hidden card** with a `...` button to display changed leaves and value history.
11. **Organizational chart** showing progress between cardinal variables.

---

## 📱 PWA

The project is structured as a Progressive Web App and includes:

- `manifest.json`
- `sw.js`
- SVG icons.
- Automatic service worker registration in the browser.

---

## 💾 Local Persistence

The session state is stored per user using `localStorage`.

The application remembers:

- Cardinal values.
- Leaf values.
- Weekly review question.
- Concrete next step.
- Hidden card visibility state.

The `localStorage` state is automatically saved whenever a change occurs.

---

## ☁️ Remote Persistence

Data synchronization with Firestore is automatic and continuous.

The application synchronizes:

- When the application is opened.
- When the application regains focus.
- When returning from suspension.
- After local changes.

The `Save` button remains available as an optional shortcut to force synchronization.

The workspace also stores review metadata to help resolve conflicts between devices.

The first set of cardinal and leaf variables is loaded locally as the prototype's initial seed data.

---

# 📊 Prototype Data

## Cardinal Variables

The prototype currently uses five cardinal variables:

- Identity
- Mental Health
- Physical Health
- Family
- Professional

---

## 🌳 Tree Structure

The application's variable structure is organized into three levels:

### Level 1 — Root Cards

- Identity
- Mental Health
- Physical Health
- Family
- Professional

### Level 2 — Internal Cards

Branches inside each root/cardinal.

### Level 3 — Leaves

Individual variables containing values and time horizons.

Changing a leaf automatically updates the average value of its parent cardinal.

Changing the cardinal redistributes the change across the leaves belonging to that cardinal.

---

## 🌱 Base Variables

The prototype currently includes **69 seeded leaves**, including examples such as:

- Consistent sleep
- Short meditation
- Therapy session
- Daily walk
- Hydration
- Simple meals
- Time with my child
- Alignment conversation
- Home routine
- Deep focus
- Weekly prioritization
- Focused learning
- Self-awareness
- Personal values

---

## ✏️ Customizing Leaves

Users can rename leaves, add new ones, remove them, or hide them from their profile.

Because the prototype is still under testing, gender definitions and forms of address have not yet been fully implemented. Some seeded leaves may therefore use masculine forms.

The current solution is to allow users to rename leaves through an edit button represented by a pencil icon in the upper-right corner of each leaf card.

### Adding New Leaves

If the user determines that the seeded leaves do not cover all areas of their life, they can use the `+` button in the upper-right corner of a Level 2 node (branch) to add a new leaf.

### Removing or Hiding Leaves

Leaves, including the default seeded leaves, can be removed or hidden through a configuration button located next to the leaf inside its own card.

This reveals the `Delete` and `Hide` actions.

---

# 🧑‍💻 Development: Where to Modify Each Dashboard Leaf

If a new developer wants to change the name, description, or behavior of a leaf, branch, or cardinal, these are the relevant files.

### `src/js/services/variableService.js`

Defines the leaf seed data in the `leafSeed` array.

Main fields for each leaf include:

- `cardinalId`
- `nodeId`
- `nodeName`
- `name`
- `horizonDays`
- `currentValue`
- `targetValue`
- `note`
- `brothers`

To change the default name displayed on the dashboard, modify `name`.

To change the base description of the leaf, modify `note`.

### `src/js/ui/dashboard.js`

Defines the contextual help displayed when clicking the `i` icon on each leaf.

Relevant elements include:

- `leafHelpExamples`
- `renderLeafHelpModal`

If a leaf's description changes, this file should also be updated so that the contextual help remains consistent with the new name and description.

### `src/assets/text/frases_dashboard.json`

Stores motivational messages associated with each leaf name.

If a leaf is renamed, this file should also be reviewed so that the messages remain consistent.

### Practical Summary

```text
variableService.js     = where the leaf is created and receives its base name/description
dashboard.js            = where the leaf explains its meaning to the user
frases_dashboard.json   = where the supporting messages associated with the leaf are stored
```



---

## 📐 Leaf Rules

Each leaf contains:

- Value between `49` and `99`.
- Time horizon or deadline.
- Note.
- Relationship with its cardinal.
- Progress calculated in card 10.
- Daily review through a `-3` to `+3` status bar in the card 8 pop-up.

---

# 🛠 Development: How to Start the App

Use the local development server included in the project:

```bash
npm run dev
```

Then open:

```text
http://127.0.0.1:4173
```

### Important

- Open the application from the repository root using `index.html`.
- Do not use `src/index.html`, as it has been removed.
- The PWA files are also located in the root directory:
  - `manifest.json`
  - `sw.js`

---

# 🔐 Provisioning an Access User

There is currently no account creation screen.

Users can be created through the backend using the provisioning script.

## Script

```bash
npm run provision:user
```

## Required Variables

- `FIREBASE_EMAIL`
- `FIREBASE_PASSWORD`
- Optional: `FIREBASE_DISPLAY_NAME`

## Example

```powershell
$env:FIREBASE_EMAIL="mail@mail.com"
$env:FIREBASE_PASSWORD="123456789"
npm run provision:user
```

## Important

If Firebase returns `CONFIGURATION_NOT_FOUND`, it usually means that the `Email/Password` authentication provider has not yet been enabled for the project.

In that case:

1. Open the Firebase Console.
2. Go to `Authentication`.
3. Enable the `Email/Password` provider.
4. Save the configuration.
5. Run the provisioning script again.

---

# ⚡ Quick Start Guide

## 1. Run Locally

1. Open a terminal in the project root.
2. Run `npm run dev`.
3. Open `http://127.0.0.1:4173`, or the address returned by `npm run dev` in the terminal.

## 2. Sign In

1. Use a user with Email/Password Authentication enabled in Firebase.
2. Log in through the initial screen.
3. The main dashboard loads with the prototype data already defined.

## 3. Validate the Prototype

1. Adjust a cardinal variable in card 2.
2. Open the weekly question in card 8.
3. Use card 9 to search for a leaf.
4. Open card 10 using the `...` button.
5. Observe the progress chart in card 11.

## 4. Upload Data to Firestore

1. Make the desired changes.
2. Confirm that the state has been saved locally.
3. Click `Save` at the top of the main dashboard.
4. Wait for confirmation that the data has been sent to Firestore.

---

# 📁 Current Project Structure

```text
overload/
├── index.html
├── manifest.json
├── sw.js
├── package.json
├── scripts/
│   └── dev-server.mjs
├── icons/
│   ├── icon-192.svg
│   └── icon-512.svg
├── src/
│   ├── css/
│   │   ├── variables.css
│   │   ├── layout.css
│   │   ├── components.css
│   │   └── app.css
│   └── js/
│       ├── app.js
│       ├── firebase/
│       │   └── firebase.js
│       ├── models/
│       │   ├── BaseVariable.js
│       │   ├── CardinalVariable.js
│       │   └── WeeklyReview.js
│       ├── services/
│       │   ├── adviceService.js
│       │   ├── moodService.js
│       │   ├── reviewService.js
│       │   └── variableService.js
│       ├── ui/
│       │   ├── adviceModal.js
│       │   ├── dashboard.js
│       │   ├── moodPanel.js
│       │   └── radarChart.js
│       └── utils/
│           ├── calculations.js
│           └── dates.js
├── firebase.json
└── readme.md
```

---

# 🔥 Firebase Configuration

The Firebase configuration is currently centralized in:

```text
src/js/firebase/firebase.js
```

This avoids inconsistencies between `localhost`, GitHub Pages, and local scripts, since the same source of truth is used by the application and project utilities.

## Firebase Requirements

The Firebase project must have:

- Email/Password Authentication enabled.
- An active Firebase project.
- At least one registered test user.

### Troubleshooting

If login fails, the most common causes are:

- Invalid email or password.
- Firebase Authentication not enabled.
- The user has not yet been created in the Firebase Console.

# 🚀 Roadmap

## High Priority

- Create a first-login screen with questions to determine the user's current state and pre-establish values when creating the initial seeds.
- Implement a gender and form-of-address system.
- Create a dedicated interface for creating and editing leaves.
- Create a dedicated interface for creating and editing cardinal variables.

## Medium Priority

- Improve the leaf-search modal with more useful filters.
- Add new cards with more relevant information.
- Create a user profile with photo, username, and password-change functionality.
- Populate `frases_dashboard.json` with at least 15 pieces of advice for each base variable.

## Future

- Dynamic screens based on progress and the user's current "concrete step".
- Backup and export through JSON, CSV, or BIN.
- More complete graphical history.
- Add new parameters to the advice system and select recommendations based on the variable's current score.

---

# 📝 Important Notes

- The application is currently focused on both mobile and desktop.
- Cards 10 and 11 are hidden by default and can be opened using the `...` button.
- The radar chart is rendered using SVG, with no external dependency.
- The project is structured as a PWA but is still in the **functional prototype stage**.

---

# ✅ Project Continuation Checklist

## Before Working with Real Data

- Confirm that Firebase login is working.
- Create at least one test user.
- Validate whether the current `localStorage` implementation meets the prototype workflow.

## Before Connecting Firestore

- Verify the defined data and collection structure.
- Verify how cardinals, leaves, and weekly reviews will be stored.
