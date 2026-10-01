# Design QA — onglet Horaires

## Sources de vérité

- Catalogue de référence : `/home/evan/Téléchargements/Screenshot_20261001_114521_L'Appli M.jpg` (1080 × 4687 px).
- Carte Cars Région / Transaltitude : `/home/evan/Téléchargements/Screenshot_20261001_114548_L'Appli M.jpg` (1080 × 3634 px).
- Fiche de ligne : `/home/evan/Téléchargements/Screenshot_20261001_115016_L'Appli M.jpg` (1080 × 2340 px).
- Cible validée pour la fiche : `/home/evan/.codex/generated_images/01a0f6e0-32cf-7de0-af18-bba1794eceb0/exec-e7ebfbcf-7af7-47ed-8bcc-b159ea7fa24c.png` (853 × 1844 px, concept mobile destiné à un viewport CSS 390 × 844 ; densité de référence inconnue).
- État visé : catalogue clair mobile avec pastilles compactes et véhicules décoratifs, puis fiche en parcours vertical avec origine/destination, inversion de sens, navigation horaire et passages par arrêt.

## Preuves d’implémentation

- Implémentation : build Vite local réussi ; le serveur local répond sur le port 4173. Les cinq véhicules WebP sont présents dans le bundle.
- Contrôles fonctionnels : le normaliseur accepte les réponses réelles à deux sens (A et T40) et transforme les réponses vides saisonnières (TA2A, GRES) en absence de circulation.
- Capture de l’implémentation : indisponible. Aucun navigateur ni outil de capture n’est exposé dans cette session ; aucune comparaison visuelle fidèle ne peut être menée sans inventer une preuve. Dimensions, densité et capture du rendu : non disponibles.
- Interactions testées dans le navigateur et erreurs console : non vérifiables ici ; `npm test`, `npm run lint` et `npm run build` réussissent (trois avertissements lint préexistants).

## Vérification des surfaces de fidélité

- Typographie : non vérifiable visuellement ; la hiérarchie de la cible est transcrite en titre, terminus, ville, arrêt et passage le plus proche.
- Espacements et structure : non vérifiables visuellement ; la fiche utilise un résumé origine/destination, une rangée de deux boutons et un axe vertical d’arrêts. Les pastilles M réso restent limitées à 44 px dans le catalogue.
- Couleurs : les passages les plus proches sont bleus sans pastille de fond ; la première ligne d’arrêt est blanche, conformément à la cible. Contraste final non vérifiable par capture locale.
- Images et icônes : aucun visuel raster n’est nécessaire pour la fiche validée ; les icônes fonctionnelles (retour, inversion, terminus) utilisent Phosphor. Les véhicules WebP du catalogue restent inchangés.
- Texte : vérifié en source pour les libellés français, les états d’erreur/absence de service et les noms de terminus dynamiques.

## Findings

- [P1] Comparaison visuelle bloquée.
  - Evidence: les trois captures de référence sont disponibles, mais aucune capture navigateur de l’implémentation n’est possible dans cette session.
  - Impact: les différences éventuelles de rendu mobile, d’espacement ou de contraste ne peuvent pas être jugées de façon fiable.
  - Fix: ouvrir l’application locale dans un navigateur avec capture d’écran, puis comparer les vues catalogue et fiche au même viewport que les références.

## Historique de correction

- Écart signalé : pastilles circulaires trop grandes et véhicules absents des en-têtes.
- Correction : taille fixe de 44 px, grille fluide, quatre colonnes compactes pour les lignes régionales, badge rond « Bus » pour les relais tram, cinq découpes de véhicules.
- Preuve après correction : vérification du code, des assets, du build et de la réponse HTTP locale ; capture navigateur toujours indisponible. Comparaison pleine page et zooms ciblés non réalisables.
- Écart signalé : les boutons précédent/suivant étaient trop bas dans la fiche horaire.
- Correction retenue : barre segmentée « Précédent / Suivant » juste sous le sélecteur de sens et avant la liste des arrêts, avec zones tactiles de 50 px de haut et libellés complets.
- Preuve après correction : lint, tests, build et contrôle de diff réussissent ; capture navigateur toujours indisponible.
- Cible validée : fiche de parcours vertical, issue de la seconde proposition corrigée par l’utilisateur.
- Correction : remplacement des onglets de sens par un résumé origine/destination et un bouton d’inversion fonctionnel ; itinéraire vertical à points ; passages suivants bleus sans fond ; premier arrêt blanc.
- Preuve après correction : `npm test`, `npm run lint`, `npm run build` et `git diff --check` réussissent ; la capture navigateur, la comparaison pleine page et le contrôle des interactions clavier restent indisponibles.

## Open Questions

- Aucune question produit. Le blocage est uniquement l’absence d’outil de navigateur/capture dans l’environnement courant.

## Implementation Checklist

1. Ouvrir le serveur local dans un navigateur.
2. Capturer le catalogue et la fiche A en thème clair sur mobile, incluant les deux sens et la navigation précédente/suivante.
3. Comparer les captures aux références, corriger tout écart P1/P2, puis mettre ce rapport à jour.

## Follow-up Polish

- P3 : comparer la taille, la netteté et le placement des véhicules à la capture M une fois une capture locale disponible.
- P3 : vérifier que le trait vertical et les temps bleus restent nets et non tronqués sur 320 px, 390 px et en thème sombre.

final result: blocked
