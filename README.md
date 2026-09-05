# TCG

App web (installable en PWA) affichant les prochains passages en temps réel du
réseau de transport en commun de Grenoble (TAG / réseau M), en remplacement de
l'appli officielle « M ».

## Fonctionnalités

- Recherche instantanée parmi les ~860 arrêts du réseau
- Arrêts les plus proches via géolocalisation
- Prochains passages temps réel par arrêt (toutes lignes confondues), avec
  retard et niveau d'occupation, rafraîchis toutes les 30s
- Alertes trafic actives filtrées par ligne desservant l'arrêt
- Arrêts favoris persistés en local
- Installable comme app (PWA), fonctionne hors-ligne pour l'interface (les
  horaires temps réel nécessitent bien sûr une connexion)

## Données

Toutes les données viennent de l'API publique de **Mobilités M** (SMMAG /
Grenoble-Alpes Métropole), backend OpenTripPlanner exposé sur
`data.mobilites-m.fr` — aucune clé API requise. Voir
[src/api/mobilitesM.js](src/api/mobilitesM.js) pour le détail des endpoints.
Données sous licence ODbL.

⚠️ Le domaine historique `metromobilite.fr`, référencé dans d'anciens tutoriels
communautaires, a été repris par une agence publicitaire et n'a plus aucun
lien avec le réseau de transport — ignorer toute doc qui s'y réfère.

## Développement

```bash
npm install
npm run dev       # serveur de dev (http://localhost:5173)
npm run build     # build de production (+ génère le service worker PWA)
npm run preview   # sert le build de production localement
```

## Icônes PWA

Les icônes dans `public/icons/` sont générées depuis des SVG sources (non
versionnés) via `sharp`. Pour les régénérer après modification du design :

```bash
npm install --no-save sharp
node -e "..." # voir historique du projet pour le script de génération
```
