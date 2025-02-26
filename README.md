# ChatGPT Prompt Recovery Extension

A Chrome extension that automatically saves unsent ChatGPT prompts locally for each conversation. If your browser crashes or you accidentally close a tab, your drafted prompts will be restored when you return to the conversation.

## Features

- Automatically saves prompt drafts as you type
- Restores unsent prompts when returning to a conversation
- Works with both classic textarea and ProseMirror editor interfaces
- Clears saved prompts after successful submission
- Visual indicator showing the extension is active
- Local storage only - your drafts never leave your browser

## Installation

1. Clone this repository:
```bash
git clone git@github.com:bizprat/chatgpt-prompt-recovery-chrome-extension.git
```

2. Install dependencies:
```bash
npm install
```

3. Build the extension:
```bash
npm run build
```

4. Load the extension in Chrome:
   - Open Chrome and navigate to `chrome://extensions/`
   - Enable "Developer mode" in the top-right corner
   - Click "Load unpacked"
   - Select the directory containing this repository

## Development

- Use `npm run watch` to automatically rebuild the extension when files change
- The extension will automatically reload in Chrome when rebuilt

## Technical Details

- Built with TypeScript and Webpack
- Uses Chrome's storage API for saving prompts
- Supports both old and new ChatGPT interfaces
- Handles SPA navigation and dynamic content loading

## Project Structure

```
├── src/
│   └── content.ts    # Main extension logic
├── dist/            # Compiled JavaScript
├── icons/           # Extension icons
├── manifest.json    # Extension manifest
├── webpack.config.js
└── tsconfig.json    # TypeScript configuration
```

## How It Works

- Monitors the ChatGPT prompt input area
- Saves drafts to Chrome's local storage using conversation ID as key
- Automatically restores saved prompts when revisiting conversations
- Cleans up storage when prompts are successfully sent
