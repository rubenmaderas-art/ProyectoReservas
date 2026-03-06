import { useEffect, useState } from 'react';

const mediaListenerEvent = 'change';
const getMediaState = (query) => {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.matchMedia(query).matches;
};

const useIsMobile = (maxWidth = 768) => {
  const query = `(max-width: ${maxWidth}px)`;
  const [isMobile, setIsMobile] = useState(() => getMediaState(query));

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mediaQuery = window.matchMedia(query);
    const onChange = (event) => setIsMobile(event.matches);

    setIsMobile(mediaQuery.matches);

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener(mediaListenerEvent, onChange);
      return () => mediaQuery.removeEventListener(mediaListenerEvent, onChange);
    }

    mediaQuery.addEventListener(onChange);
    return () => mediaQuery.removeEventListener(onChange);

  }, [query]);
  return isMobile;
};

export default useIsMobile;