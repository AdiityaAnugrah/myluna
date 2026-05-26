'use client';

import { useEffect } from 'react';

const FRAMES = ['🚚', '📦', '🚚', '✅'];
const INTERVAL_MS = 700;

function emojiToDataUrl(emoji: string) {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
      <text x="50%" y="54%" text-anchor="middle" dominant-baseline="middle" font-size="52">
        ${emoji}
      </text>
    </svg>
  `;

  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function FaviconAnimator() {
  useEffect(() => {
    let index = 0;
    const iconLink =
      document.querySelector<HTMLLinkElement>("link[rel='icon']") ||
      document.querySelector<HTMLLinkElement>("link[rel='shortcut icon']") ||
      (() => {
        const link = document.createElement('link');
        link.rel = 'icon';
        document.head.appendChild(link);
        return link;
      })();

    const updateIcon = () => {
      iconLink.type = 'image/svg+xml';
      iconLink.href = emojiToDataUrl(FRAMES[index]);
      index = (index + 1) % FRAMES.length;
    };

    updateIcon();
    const timer = window.setInterval(updateIcon, INTERVAL_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, []);

  return null;
}

