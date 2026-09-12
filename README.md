# TCG

App web (installable en PWA) affichant les prochains passages en temps réel du
réseau de transport en commun de Grenoble (TAG / réseau M), en remplacement de
l'appli officielle « M ».

En ligne : **https://tcg-wheat.vercel.app/**
Dépôt : **https://github.com/yesman-plg/TCG**

## Fonctionnalités

**Onglet Rechercher**
- Recherche instantanée parmi les ~860 arrêts du réseau
- Carte interactive (fond terrain, tracé de chaque ligne dans sa couleur
  officielle, arrêts cliquables) — voir [Limites connues](#limites-connues)
- Arrêts les plus proches via géolocalisation
- Prochains passages temps réel par arrêt, toutes lignes confondues, triés
  trams → bus Chrono → reste du réseau, avec retard (couleur), niveau
  d'occupation et heure de passage ; rafraîchis toutes les 15s (décompte
  affiché recalculé toutes les 5s entre deux rafraîchissements)

**Onglet Mes favoris**
- Mettre un arrêt en favori propose de choisir la/les ligne(s) précise(s) à
  suivre s'il en dessert plusieurs
- Un arrêt = une seule ligne dépliable (menu déroulant), même avec plusieurs
  lignes favorites à cet arrêt

**Onglet Trafic**
- Toutes les lignes du réseau urbain ayant une perturbation active, avec le
  détail (popup) au clic

**Alertes par ligne** : un petit indicateur apparaît sur le badge d'une ligne
uniquement si elle a une perturbation active à cet arrêt (au lieu d'un bandeau
global mélangeant toutes les lignes).

**PWA** : installable sur mobile, app shell disponible hors-ligne (les
horaires temps réel nécessitent évidemment une connexion — jamais mis en
cache pour éviter d'afficher des données périmées sans le dire).

## Limites connues

- **Pas d'accès aux titres de transport / abonnements achetés** : aucune API
  publique n'existe pour ça (données de compte privées, système de
  billettique fermé). Voir la discussion dans l'historique du projet.
- **Tracé manquant sur la carte pour ~13 lignes** (dont C5, C8) : l'API
  `lines/poly` de Mobilités M renvoie une géométrie quasi vide pour ces
  lignes — vérifié sur la donnée brute, ce n'est pas un bug côté app. Les
  horaires de ces lignes fonctionnent normalement, seul le tracé décoratif
  manque.
- **Widget d'écran d'accueil** : pas réalisable depuis une PWA sur iOS ni
  Android (limite de plateforme, pas un manque d'effort). Une PWA peut en
  revanche déclarer des raccourcis (`shortcuts` du manifest), pas encore fait.

## Données

Toutes les données viennent de l'API publique de **Mobilités M** (SMMAG /
Grenoble-Alpes Métropole), backend OpenTripPlanner exposé sur
`data.mobilites-m.fr` — aucune clé API requise. Voir
[src/api/mobilitesM.js](src/api/mobilitesM.js) pour le détail des endpoints.
Données sous licence ODbL.

⚠️ Le domaine historique `metromobilite.fr`, référencé dans d'anciens tutoriels
communautaires, a été repris par une agence publicitaire et n'a plus aucun
lien avec le réseau de transport — ignorer toute doc qui s'y réfère.

Fond de carte : Esri World_Topo_Map (gratuit, sans clé). Tracés de lignes
décodés depuis le format "polyline encodée" via
[src/utils/polyline.js](src/utils/polyline.js).

## Structure

```
src/
  api/mobilitesM.js       Client API Mobilités M (tous les endpoints)
  hooks/                  useStops, useRoutes, useStopTimes, useDisruptions,
                          useFavorites, useGeolocation, useLinesGeometry,
                          useCachedResource (cache localStorage générique)
  components/
    StopSearch, NearbyStops, MapView   sélection d'un arrêt
    DepartureBoard                    horaires d'un arrêt (+ picker favoris,
                                       alertes par ligne, mode compact)
    FavoriteRow                       ligne dépliable de l'onglet Favoris
    TrafficTab, Modal
  utils/                  disruptions (filtrage/regroupement), sort (tri des
                          lignes), geo (distances), polyline (décodage), time
```

## Développement

```bash
npm install
npm run dev       # serveur de dev (http://localhost:5173)
npm run build     # build de production (+ génère le service worker PWA)
npm run preview   # sert le build de production localement
```

Déploiement : push sur `master` → redéploiement automatique par Vercel (lié
au dépôt GitHub).

## Icônes PWA

Les icônes dans `public/icons/` sont générées depuis des SVG sources (non
versionnés) via `sharp`. Pour les régénérer après modification du design :

```bash
npm install --no-save sharp
node -e "..." # voir historique du projet pour le script de génération
```
