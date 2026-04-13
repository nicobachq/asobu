export type ExternalMediaPlatform =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'x'
  | 'facebook'
  | 'linkedin'
  | 'link';

export type ExternalMediaPreview = {
  rawUrl: string;
  normalizedUrl: string;
  platform: ExternalMediaPlatform;
  platformLabel: string;
  hostname: string;
  displayUrl: string;
  embedUrl: string | null;
};

const URL_REGEX = /(?:https?:\/\/|www\.)[^\s<>()]+/i;

function trimTrailingPunctuation(value: string) {
  return value.replace(/[),.!?;:]+$/g, '');
}

function normalizeUrl(rawUrl: string) {
  const trimmed = trimTrailingPunctuation(rawUrl.trim());
  if (!trimmed) return null;
  return trimmed.startsWith('http://') || trimmed.startsWith('https://')
    ? trimmed
    : `https://${trimmed}`;
}

function getYouTubeVideoId(url: URL) {
  const hostname = url.hostname.replace(/^www\./, '');

  if (hostname === 'youtu.be') {
    const value = url.pathname.split('/').filter(Boolean)[0] || '';
    return value || null;
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v');
    }

    if (url.pathname.startsWith('/shorts/')) {
      return url.pathname.split('/').filter(Boolean)[1] || null;
    }

    if (url.pathname.startsWith('/embed/')) {
      return url.pathname.split('/').filter(Boolean)[1] || null;
    }
  }

  return null;
}

function getPlatformMeta(url: URL): Pick<ExternalMediaPreview, 'platform' | 'platformLabel' | 'embedUrl'> {
  const hostname = url.hostname.replace(/^www\./, '').toLowerCase();

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com' || hostname === 'youtu.be') {
    const videoId = getYouTubeVideoId(url);
    return {
      platform: 'youtube',
      platformLabel: 'YouTube',
      embedUrl: videoId ? `https://www.youtube.com/embed/${videoId}` : null,
    };
  }

  if (hostname.includes('instagram.com')) {
    return { platform: 'instagram', platformLabel: 'Instagram', embedUrl: null };
  }

  if (hostname.includes('tiktok.com')) {
    return { platform: 'tiktok', platformLabel: 'TikTok', embedUrl: null };
  }

  if (hostname.includes('twitter.com') || hostname.includes('x.com')) {
    return { platform: 'x', platformLabel: 'X', embedUrl: null };
  }

  if (hostname.includes('facebook.com') || hostname === 'fb.watch') {
    return { platform: 'facebook', platformLabel: 'Facebook', embedUrl: null };
  }

  if (hostname.includes('linkedin.com')) {
    return { platform: 'linkedin', platformLabel: 'LinkedIn', embedUrl: null };
  }

  return { platform: 'link', platformLabel: 'External link', embedUrl: null };
}

export function extractFirstUrl(text: string) {
  const match = text.match(URL_REGEX);
  return match?.[0] || null;
}

export function getExternalMediaPreview(text: string): ExternalMediaPreview | null {
  const rawUrl = extractFirstUrl(text);
  if (!rawUrl) return null;

  const normalizedUrl = normalizeUrl(rawUrl);
  if (!normalizedUrl) return null;

  try {
    const parsedUrl = new URL(normalizedUrl);
    const hostname = parsedUrl.hostname.replace(/^www\./, '');
    const displayUrl = `${hostname}${parsedUrl.pathname}${parsedUrl.search}`;
    const meta = getPlatformMeta(parsedUrl);

    return {
      rawUrl,
      normalizedUrl,
      hostname,
      displayUrl,
      ...meta,
    };
  } catch {
    return null;
  }
}
