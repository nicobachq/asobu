export type SharePayload = {
  title: string;
  text?: string;
  url: string;
};

export function buildAbsoluteUrl(pathOrUrl: string) {
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }

  const origin = window.location.origin;
  return pathOrUrl.startsWith('/') ? `${origin}${pathOrUrl}` : `${origin}/${pathOrUrl}`;
}

function buildClipboardValue(payload: SharePayload) {
  return [payload.title, payload.text, payload.url].filter(Boolean).join('\n\n');
}

export async function shareOrCopy(payload: SharePayload) {
  const shareData: ShareData = {
    title: payload.title,
    text: payload.text,
    url: payload.url,
  };

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share(shareData);
      return 'shared' as const;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return 'cancelled' as const;
      }
    }
  }

  const clipboardValue = buildClipboardValue(payload);

  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(clipboardValue);
    return 'copied' as const;
  }

  const textarea = document.createElement('textarea');
  textarea.value = clipboardValue;
  textarea.setAttribute('readonly', 'true');
  textarea.style.position = 'absolute';
  textarea.style.left = '-9999px';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  document.body.removeChild(textarea);
  return 'copied' as const;
}
