// Pont de récupération pour le cache PWA créé avant le changement de logo.
// Cet ancien bundle n'existe plus, mais certains navigateurs le demandent encore.
const recoveryFlag = 'tcg-pwa-cache-recovery-v1'

let recoveryAlreadyAttempted = false

try {
  recoveryAlreadyAttempted = sessionStorage.getItem(recoveryFlag) === '1'
  sessionStorage.setItem(recoveryFlag, '1')
} catch {
  // La récupération reste possible si le stockage de session est indisponible.
}

if (!recoveryAlreadyAttempted) {
  const unregisterWorkers =
    'serviceWorker' in navigator
      ? navigator.serviceWorker
          .getRegistrations()
          .then((registrations) =>
            Promise.all(registrations.map((registration) => registration.unregister())),
          )
      : Promise.resolve()

  const clearCaches =
    'caches' in window
      ? caches
          .keys()
          .then((keys) => Promise.all(keys.map((key) => caches.delete(key))))
      : Promise.resolve()

  Promise.allSettled([unregisterWorkers, clearCaches]).finally(() => {
    const cleanUrl = new URL('/', window.location.origin)
    cleanUrl.searchParams.set('cache-recovery', Date.now().toString())
    window.location.replace(cleanUrl)
  })
}
