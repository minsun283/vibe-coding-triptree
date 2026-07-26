const AUTH_PATHS = new Set(['/login', '/signup'])

function isSafeRedirectPath(path) {
  return typeof path === 'string' && path.startsWith('/') && !path.startsWith('//')
}

export function buildLoginRedirect(location) {
  const from = `${location.pathname}${location.search}`

  if (!isSafeRedirectPath(from) || AUTH_PATHS.has(location.pathname)) {
    return {}
  }

  const state = { from }

  if (location.state && Object.keys(location.state).length > 0) {
    state.returnState = location.state
  }

  return state
}

export function getPostLoginNavigation(loginState) {
  const from = loginState?.from

  if (!isSafeRedirectPath(from) || AUTH_PATHS.has(from.split('?')[0])) {
    return { path: '/', options: { replace: true } }
  }

  if (loginState?.returnState != null) {
    return {
      path: from,
      options: { replace: true, state: loginState.returnState },
    }
  }

  return { path: from, options: { replace: true } }
}
