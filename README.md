# CloudPilot Mail ☁️✉️

> **Your Cloudflare Temp Email Command Center** — A modern, feature-rich browser extension for managing [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) backend workers, inspired by [CloudMail](https://github.com/Lur1N77777/CloudMail).

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## ✨ Features

- **👑 Dual Role Operating System**: Switch effortlessly between **Admin Mode** (full worker control, stats analytics, sender access rules, password viewing, mailbox cleanup) and **User Mode** (individual address management, balance check, access requests).
- **🛡️ Sender Access Control**: Grant, modify, and monitor sender permissions, account balances, and request access workflows.
- **🌐 Multi-Worker Management**: Configure, test connection health, and switch seamlessly between multiple `cloudflare_temp_email` Worker instances.
- **✉️ Mailbox Command Center**: Create custom prefix/subdomain addresses, generate random subdomains, copy JWT credentials and auto-login links, clear inbox, or delete mailboxes.
- **📥 Real-Time Inbox & Mail Reader**: View incoming emails, inspect HTML previews securely in a sandboxed viewer, extract verification (OTP) codes automatically with one-click copy, and iterate between messages with inline navigation.
- **📤 Outbound & Unknown Mail**: Track system outbound emails and inspect mail sent to non-existent/catch-all addresses.
- **✍️ Rich Email Composer**: Compose and send emails directly using any of your authorized mailbox identities with custom display names.
- **🎯 Custom Scrollable Controls**: Custom select dropdown system (`enhanceSelect`) ensuring clean, isolated vertical scrolling within the 420x580 popup frame without native OS popover overflow.
- **🌍 Multilingual (i18n)**: Native English, Simplified Chinese (`简体中文`), and Traditional Chinese (`繁體中文`) support with instant language switching.
- **🎨 Premium UI & Themes**: Glassmorphism design system supporting **Light Mode**, **Dark Mode**, and **System Sync**.

---

## 🛠️ Technology Stack

- **Extension Specification**: Manifest V3 (Chrome, Edge, Brave, Opera, Firefox compatible)
- **Language**: TypeScript 5.7
- **Bundler**: `esbuild` for ultra-fast JS & CSS compilation
- **Styling**: Vanilla CSS with Design System Tokens & modular CSS structure (`variables.css`, `components.css`, `header.css`, etc.)
- **Icons**: Custom SVG vector icon library & sharp multi-resolution PNG assets

---

## 📂 Project Architecture

```text
temp-mail-cf-ext/
├── manifest.json            # Manifest V3 extension configuration
├── build.mjs                # esbuild JS & CSS bundle script
├── generate-icons.mts       # Icon PNG generator script
├── package.json             # Project dependencies & build scripts
├── tsconfig.json            # TypeScript configuration
├── icons/                   # Extension icons (16, 32, 48, 128 px + SVG)
├── src/
│   ├── popup.html           # Main popup HTML container
│   ├── css/                 # Modular stylesheets
│   │   ├── variables.css    # Design system tokens (colors, light/dark themes)
│   │   ├── base.css         # Reset & layout viewport bounds
│   │   ├── components.css   # Buttons, cards, inputs, custom select, modals, toasts, badges
│   │   ├── header.css       # Navigation header & worker bar
│   │   ├── dashboard.css    # Analytics overview grid
│   │   ├── email.css        # Mail lists & reader detail view
│   │   ├── settings.css     # Worker profiles & preference pickers
│   │   ├── utilities.css    # Keyframes, spinners & helper classes
│   │   ├── role-select.css  # Role selection screen styles
│   │   └── styles.css       # Main CSS bundle entrypoint
│   └── ts/                  # TypeScript source modules
│       ├── app.ts           # Main application orchestrator
│       ├── i18n.ts          # Internationalization dictionary & state
│       ├── storage.ts       # Typed chrome.storage.local wrapper
│       ├── icons.ts         # Inline SVG icon library
│       ├── utils.ts         # Helper utilities (toast, clipboard, custom select enhancer)
│       ├── api/             # Type-safe API client layer
│       │   ├── admin.ts     # Admin endpoints (stats, addresses, mails, sendbox, send access)
│       │   ├── user.ts      # User endpoints (user_api mails, address JWT, settings)
│       │   ├── common.ts    # HTTP request handler & paginated result normalizer
│       │   ├── index.ts     # Main API entrypoint dispatcher
│       │   └── types.ts     # API interface definitions
│       └── views/           # Modular view controllers
│           ├── dashboard.ts   # Stats overview tab
│           ├── addresses.ts   # Mailbox management tab
│           ├── inbox.ts       # Email list & reader modal tab
│           ├── sent.ts        # Sent email log tab
│           ├── send_access.ts # Sender access control tab
│           ├── unknown.ts     # Unknown address email log tab
│           ├── compose.ts     # Send email tab
│           ├── role_select.ts # Role picker view
│           └── settings.ts    # Worker settings & UI preferences tab
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` or `pnpm`

### Installation & Build

1. Clone the repository:
   ```bash
   git clone https://github.com/chahakshahcs5/cloudpilot-mail.git
   cd cloudpilot-mail
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```
   *The compiled extension assets (JS, CSS, HTML, manifest) will be generated in `dist/`.*

4. For development with auto-rebuild on file changes:
   ```bash
   npm run watch
   ```

---

## 🧩 Loading into Browser

### Google Chrome / Microsoft Edge / Brave / Opera

1. Open your browser and navigate to `chrome://extensions/` (or `edge://extensions/`).
2. Enable **Developer mode** using the toggle switch in the top right.
3. Click the **Load unpacked** button.
4. Select the `dist/` directory inside this repository.
5. Click the **CloudPilot Mail** icon in your browser toolbar to open the extension!

---

## 📜 Acknowledgements & License

- Built upon the API ecosystem of [dreamhunter2333/cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email).
- Feature inspiration from [Lur1N77777/CloudMail](https://github.com/Lur1N77777/CloudMail).
- Released under the [MIT License](LICENSE).
