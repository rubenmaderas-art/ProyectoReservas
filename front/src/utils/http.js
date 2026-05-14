const isRequestToApi = (input) => {
  const url = typeof input === 'string' ? input : input?.url;
  return typeof url === 'string' && url.includes('/api/');
};

const isLoginRequest = (input) => {
  const url = typeof input === 'string' ? input : input?.url;
  return typeof url === 'string' && url.includes('/api/auth/login');
};

export const createSessionAwareFetch = (originalFetch, onUnauthorized) => {
  return async (...args) => {
    let [input, init] = args;

    if (input instanceof Request) {
      const nextCredentials = input.credentials === 'omit' ? 'omit' : 'include';
      input = new Request(input, { credentials: nextCredentials });
      init = undefined;
    } else {
      init = { ...(init || {}), credentials: init?.credentials ?? 'include' };
    }

    const response = await originalFetch(input, init);

    if ((response.status === 401 || response.status === 403) && isRequestToApi(args[0]) && !isLoginRequest(args[0])) {
      onUnauthorized?.();
    }

    return response;
  };
};

export const installFetchInterceptor = (globalObject = window) => {
  const originalFetch = globalObject.fetch.bind(globalObject);
  globalObject.fetch = createSessionAwareFetch(originalFetch, () => {
    globalObject.dispatchEvent(new Event('force-logout'));
  });

  return () => {
    globalObject.fetch = originalFetch;
  };
};
