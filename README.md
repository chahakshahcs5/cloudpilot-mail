# CloudPilot Mail ☁️✉️

> **Your Cloudflare Temp Email Command Center** — A modern, feature-rich browser extension for managing [cloudflare_temp_email](https://github.com/dreamhunter2333/cloudflare_temp_email) backend workers, inspired by [CloudMail](https://github.com/Lur1N77777/CloudMail).

![Manifest V3](https://img.shields.io/badge/Manifest-V3-blue?style=flat-square)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6?style=flat-square&logo=typescript&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-green?style=flat-square)

---

## ✨ Features

- **🌐 Multi-Worker Support**: Configure and switch seamlessly between multiple `cloudflare_temp_email` Worker instances.
- **✉️ Address Management**: Search, create custom prefix/subdomain addresses, generate random subdomains, copy JWT credentials/login links, clear inbox, and delete mailboxes.
- **📥 Real-Time Inbox**: View received emails, inspect HTML previews securely in sandboxed view, and automatically extract verification (OTP) codes with one-click copy.
- **📤 Sent & Unknown Mail**: Track system outbound emails and catch emails sent to non-existent addresses.
- **✍️ Send Mail**: Compose and send emails directly using any of your configured mailbox identities.
- **🌍 Multilingual (i18n)**: Native English, Simplified Chinese (`简体中文`), and Traditional Chinese (`繁體中文`) support with instant language switching.
- **🎨 Premium UI & Themes**: Glassmorphism design system supporting **Light Mode**, **Dark Mode**, and **System Sync**.
- **⏱️ Auto-Refresh**: Configurable background polling interval to keep your inbox updated.

---

## 🛠️ Technology Stack

- **Extension Specification**: Manifest V3 (Chrome, Edge, Brave, Opera, Firefox compatible)
- **Language**: TypeScript 5.7
- **Bundler**: `esbuild` for ultra-fast compilation
- **Styling**: Vanilla CSS with Design System Tokens, CSS Modules (`variables.css`, `components.css`, `header.css`, etc.)
- **Icons**: Custom SVG vector icon library & PNG icons

---

## 📂 Project Architecture

```text
temp-mail-cf-ext/
├── manifest.json            # Manifest V3 extension configuration
├── build.mjs                # esbuild bundle & static copy script
├── generate-icons.mts       # Icon PNG generator script
├── package.json             # Project dependencies & build scripts
├── tsconfig.json            # TypeScript configuration
├── icons/                   # Extension icons (16, 32, 48, 128 px + SVG)
├── src/
│   ├── popup.html           # Main popup HTML container
│   ├── css/                 # Modular stylesheets
│   │   ├── variables.css    # Design tokens (colors, light/dark themes)
│   │   ├── base.css         # Reset & layout styles
│   │   ├── components.css   # Buttons, cards, inputs, modals, toasts, badges
│   │   ├── header.css       # Navigation header & worker bar
│   │   ├── dashboard.css    # Analytics overview grid
│   │   ├── email.css        # Mail lists & reader detail view
│   │   ├── settings.css     # Worker profiles & preference pickers
│   │   ├── utilities.css    # Keyframes, spinners & helper classes
│   │   └── styles.css       # Main CSS bundle entrypoint
│   └── ts/                  # TypeScript source modules
│       ├── app.ts           # Main application orchestrator
│       ├── api.ts           # Type-safe cloudflare_temp_email API client
│       ├── i18n.ts          # Internationalization dictionary & state
│       ├── storage.ts       # Typed chrome.storage.local wrapper
│       ├── icons.ts         # Inline SVG icon library
│       ├── utils.ts         # Helper utilities (toast, clipboard, formatting)
│       └── views/           # Modular view controllers
│           ├── dashboard.ts # Stats overview tab
│           ├── addresses.ts # Mailbox management tab
│           ├── inbox.ts     # Email list & reader tab
│           ├── sent.ts      # Sent email log tab
│           ├── unknown.ts   # Unknown address email log tab
│           ├── compose.ts   # Send email tab
│           └── settings.ts  # Worker settings & UI preferences tab
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18 or higher)
- `npm` or `pnpm`

### Installation & Build

1. Clone the repository:
   ```bash
   git clone https://github.com/your-username/temp-mail-cf-ext.git
   cd temp-mail-cf-ext
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Build the extension:
   ```bash
   npm run build
   ```
   *The compiled extension will be output to the `dist/` directory.*

4. For development with auto-rebuild on file change:
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
