function getConversationId(): string | null {
  const pathSegments = window.location.pathname.split('/');
  const index = pathSegments.indexOf('c');
  return index !== -1 && index + 1 < pathSegments.length
    ? pathSegments[index + 1]
    : null;
}

// More comprehensive selector to find the prompt input
function findPromptArea(): {
  element: HTMLElement;
  type: 'prosemirror' | 'textarea';
} | null {
  // Try to find ProseMirror editor first
  const prosemirrorEditor = document.querySelector(
    'div.ProseMirror[id="prompt-textarea"]'
  );
  if (prosemirrorEditor) {
    return {
      element: prosemirrorEditor as HTMLElement,
      type: 'prosemirror',
    };
  }

  // Try to find textarea
  const textarea = document.querySelector(
    'textarea[id="prompt-textarea"], textarea[placeholder="Ask anything"]'
  );
  if (textarea) {
    return {
      element: textarea as HTMLElement,
      type: 'textarea',
    };
  }

  return null;
}

function savePrompt(
  conversationId: string,
  value: string
): void {
  if (value.trim()) {
    chrome.storage.local.set({ [conversationId]: value });
    console.log(
      `Saved prompt for conversation: ${conversationId}`,
      value
    );
  } else {
    chrome.storage.local.remove(conversationId);
    console.log(
      `Removed empty prompt for conversation: ${conversationId}`
    );
  }
}

function setContentEditableText(
  element: HTMLElement,
  text: string
): void {
  // Clear existing content
  element.innerHTML = '';

  // Create a text node with the content
  const textNode = document.createTextNode(text);

  // Create a paragraph element (matching ChatGPT's structure)
  const paragraph = document.createElement('p');
  paragraph.appendChild(textNode);

  // Add the paragraph to the editor
  element.appendChild(paragraph);

  // Dispatch an input event to trigger ChatGPT's internal handlers
  element.dispatchEvent(
    new Event('input', { bubbles: true })
  );
}

function setupPromptObserver(
  elementInfo: {
    element: HTMLElement;
    type: 'prosemirror' | 'textarea';
  },
  conversationId: string
): void {
  const { element, type } = elementInfo;

  if (type === 'prosemirror') {
    // For contenteditable div
    console.log(
      'Setting up observer for ProseMirror editor'
    );

    // Monitor changes using MutationObserver
    const observer = new MutationObserver(() => {
      const content = element.textContent || '';
      savePrompt(conversationId, content);
    });

    observer.observe(element, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    // Also listen for input events
    element.addEventListener('input', () => {
      const content = element.textContent || '';
      savePrompt(conversationId, content);
    });
  } else {
    // For standard textarea
    console.log('Setting up observer for textarea');
    element.addEventListener('input', () => {
      savePrompt(
        conversationId,
        (element as HTMLTextAreaElement).value
      );
    });

    // Also save on keydown to catch more events
    element.addEventListener('keydown', () => {
      setTimeout(() => {
        savePrompt(
          conversationId,
          (element as HTMLTextAreaElement).value
        );
      }, 0);
    });
  }

  // Clear on form submission
  const form = element.closest('form');
  if (form) {
    console.log('Form found, adding submit listener');
    form.addEventListener('submit', () => {
      chrome.storage.local.remove(conversationId);
      console.log(
        `Cleared prompt after submission for: ${conversationId}`
      );
    });
  } else {
    console.log('No form found for the input element');

    // Look for send button
    const sendButton = document.querySelector(
      'button[data-testid="send-button"], button[aria-label="Send message"]'
    );
    if (sendButton) {
      console.log(
        'Send button found, adding click listener'
      );
      sendButton.addEventListener('click', () => {
        chrome.storage.local.remove(conversationId);
        console.log(
          `Cleared prompt after clicking send for: ${conversationId}`
        );
      });
    }
  }
}

function restorePrompt(
  elementInfo: {
    element: HTMLElement;
    type: 'prosemirror' | 'textarea';
  },
  conversationId: string
): void {
  const { element, type } = elementInfo;

  chrome.storage.local.get([conversationId], (result) => {
    const savedPrompt = result[conversationId];
    if (!savedPrompt) {
      console.log(
        'No saved prompt found for this conversation'
      );
      return;
    }

    console.log(
      `Attempting to restore prompt: "${savedPrompt}"`
    );

    if (type === 'prosemirror') {
      // For contenteditable div, we need special handling
      try {
        setContentEditableText(element, savedPrompt);
        console.log('Restored prompt using custom method');
      } catch (e) {
        console.error('Error restoring to ProseMirror:', e);

        // Fallback: try simpler approach
        try {
          element.textContent = savedPrompt;
          console.log('Restored prompt using textContent');
        } catch (e2) {
          console.error(
            'Error with fallback approach:',
            e2
          );
        }
      }
    } else {
      // For standard textarea
      try {
        (element as HTMLTextAreaElement).value =
          savedPrompt;
        // Dispatch an input event to ensure ChatGPT's UI updates
        element.dispatchEvent(
          new Event('input', { bubbles: true })
        );
        console.log('Restored prompt to textarea');
      } catch (e) {
        console.error('Error restoring to textarea:', e);
      }
    }
  });
}

function initPromptSaver(): void {
  const conversationId = getConversationId();
  if (!conversationId) {
    console.log('No conversation ID found in URL');
    return;
  }

  const promptElementInfo = findPromptArea();
  if (!promptElementInfo) {
    console.log(
      'Prompt input area not found, will retry later'
    );
    return;
  }

  console.log(
    `Initializing prompt saver for conversation: ${conversationId}`
  );
  console.log(
    `Found element type: ${promptElementInfo.type}`
  );

  // First set up the observer to catch any changes
  setupPromptObserver(promptElementInfo, conversationId);

  // Then restore the prompt (with small delay to ensure UI is ready)
  setTimeout(() => {
    restorePrompt(promptElementInfo, conversationId);
  }, 300);
}

// Run immediately and then periodically check
setTimeout(initPromptSaver, 1000);

// Re-initialize when URL changes (for SPA navigation)
let lastUrl = location.href;
new MutationObserver(() => {
  if (location.href !== lastUrl) {
    lastUrl = location.href;
    console.log('URL changed, reinitializing...');
    setTimeout(initPromptSaver, 1000);
  }
}).observe(document, { subtree: true, childList: true });

// Re-check periodically in case of dynamic content loading
setInterval(() => {
  const currentConversationId = getConversationId();
  if (currentConversationId) {
    console.log(
      'Periodic check, ensuring prompt saver is initialized'
    );
    initPromptSaver();
  }
}, 5000);

// Add a visual indicator that the extension is active
function addStatusIndicator() {
  const indicator = document.createElement('div');
  indicator.style.position = 'fixed';
  indicator.style.bottom = '10px';
  indicator.style.right = '10px';
  indicator.style.backgroundColor = 'rgba(0, 128, 0, 0.7)';
  indicator.style.color = 'white';
  indicator.style.padding = '5px 10px';
  indicator.style.borderRadius = '4px';
  indicator.style.fontSize = '12px';
  indicator.style.zIndex = '9999';
  indicator.textContent = 'ChatGPT Prompt Saver Active';
  indicator.style.opacity = '0.8';

  // Make it less obtrusive after a few seconds
  setTimeout(() => {
    indicator.style.opacity = '0.2';
    indicator.style.transform = 'scale(0.8)';
    indicator.style.transition =
      'opacity 0.5s, transform 0.5s';

    // Show on hover
    indicator.addEventListener('mouseenter', () => {
      indicator.style.opacity = '0.8';
      indicator.style.transform = 'scale(1)';
    });

    indicator.addEventListener('mouseleave', () => {
      indicator.style.opacity = '0.2';
      indicator.style.transform = 'scale(0.8)';
    });
  }, 3000);

  document.body.appendChild(indicator);
}

// Add the indicator when the extension loads
setTimeout(addStatusIndicator, 2000);
