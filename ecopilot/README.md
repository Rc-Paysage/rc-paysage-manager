# EcoPilot — V0

Assistant d'optimisation des déplacements automobiles. Prototype V0 : la priorité est le
moteur de calcul et de recommandation, testable indépendamment de l'interface.

Ce dossier est une application Next.js/TypeScript autonome, volontairement séparée du reste
du dépôt `rc-paysage-manager` (site vitrine sans rapport avec EcoPilot).

## Démarrer

```bash
cd ecopilot
npm install
npm run dev        # http://localhost:3000
npm test           # moteur de calcul (Vitest)
npm run typecheck
npm run build
```

## Utilisation en voiture (iPhone + Waze dans CarPlay)

EcoPilot est une application web installable, pas une app CarPlay : CarPlay n'accepte que des
applications natives validées par Apple, et Waze n'expose aucune API tierce. Le fonctionnement
prévu est donc : Waze sur l'écran CarPlay de la voiture, EcoPilot sur le téléphone à côté.

1. Ouvrir l'URL de l'app dans Safari, puis **Partager → Sur l'écran d'accueil** : EcoPilot se
   lance ensuite comme une app, plein écran.
2. Avant de partir : destination, distance, type de trajet, tolérance de temps, et la **durée
   annoncée par Waze** (facultatif mais recommandé : c'est ce qui ancre les temps sur la réalité).
3. **Calculer ma stratégie**, puis **Ouvrir dans Waze** (lien universel Waze, lance la navigation)
   et **Mode conduite** : vitesse conseillée, économie estimée, temps ajouté — écran maintenu
   allumé, aucune interaction au volant.

Le mode avancé (`/avance`) conserve la saisie segment par segment ; le Test Lab (`/lab`) enregistre
les relevés réels.

## Architecture

```
src/
  types/        VehicleProfile, Trip, RouteSegment, Scenario, ScenarioResult,
                 UserPreferences, TestLabRecord — sans logique, purement des formes de données.
  engine/        Fonctions pures, aucune dépendance à React/Next/au stockage :
                   consumptionCurve.ts   interpolation vitesse -> consommation
                   estimateConsumption.ts consommation d'un segment (carburant/électrique/hybride)
                   evaluateScenario.ts    fonction centrale : évalue un scénario complet
                   speedCandidates.ts     balayage de vitesses candidates par segment
                   generateScenarios.ts   construit FAST / BALANCED / ECO
                   recommendation.ts      selectRecommendedScenario (§11 : coût minimal sous
                                          contrainte de temps)
                   confidence.ts          calculateConfidenceScore (heuristique, pas une
                                          probabilité statistique validée)
  data/vehicles/ Profils véhicule en tant que données (le Captur laboratoire n'est jamais codé
                 en dur dans le moteur).
  lib/           Persistance (localStorage derrière une interface Repository<T> remplaçable),
                 identifiants, dernière prédiction (pour le Test Lab).
  app/           UI Next.js (App Router) : écran trajet + résultats, Test Lab.
```

## Pourquoi ces choix

- **Le moteur ne connaît rien de React ni du stockage.** `evaluateScenario(trip, vehicle, scenario)`
  prend des objets typés en entrée et retourne un `ScenarioResult` — testable sans navigateur,
  réutilisable côté serveur plus tard.
- **Aucune vitesse cible ne dépasse jamais la limitation légale d'un segment** (sécurité avant
  économie, §2.1) : `evaluateScenario` la borne systématiquement, et `speedCandidates.ts` ne
  génère que des fractions ≤ 1.0 de la limite.
- **La courbe vitesse/consommation est une donnée, pas une formule figée.** Elle est marquée
  `ESTIMATED_UNCALIBRATED` tant qu'elle n'a pas été recalibrée à partir de plusieurs relevés
  Test Lab à des vitesses différentes.
- **Le modèle hybride distingue** carburant consommé, énergie électrique utilisée, distance
  électrique et énergie récupérée (§10), même si le calcul V0 utilise une répartition
  heuristique par type de route plutôt qu'une simulation physique.
- **La confiance est une heuristique explicable** (km calibrés, échantillons, trajets
  comparables, stabilité des erreurs récentes), pas une vraie probabilité (§19) — le score et
  les fourchettes de coût affichées à l'écran reflètent cette incertitude plutôt qu'une fausse
  précision à deux décimales (§2.3).

## Hypothèses à valider avec des données réelles

- La courbe de consommation du Captur (3 points constructeur/estimés) est un point de départ,
  pas une mesure.
- Le facteur trafic reliant vitesse cible et vitesse moyenne réelle est fixé à 1.0 (aucun
  ralentissement modélisé en V0).
- La répartition carburant/électrique par type de route (`ELECTRIC_DISTANCE_FRACTION_BY_ROAD_TYPE`)
  et le ratio de récupération par freinage régénératif sont des heuristiques de départ.
- La formule de `calculateConfidenceScore` n'a pas été validée statistiquement.

## Ce qui fonctionne aujourd'hui (critères §23)

1–8. Profil véhicule (Captur, seedé automatiquement), saisie manuelle d'un trajet en
segments, prix du carburant, tolérance de temps, génération de scénarios FAST/BALANCED/ECO,
recommandation EcoPilot sous contrainte de temps, comparaison temps/carburant/coût/CO₂.
9–10. Enregistrement d'un relevé réel dans le Test Lab, comparaison prévision vs réalité
avec calcul d'erreur.
11. Historique des relevés Test Lab conservé (localStorage).
12. Recalibration : chaque relevé Test Lab augmente `calibrationDistanceKm` et
`calibrationSampleCount` du véhicule, donc son score de confiance — la courbe de consommation
elle-même n'est pas encore recalculée automatiquement (prochaine étape).

## Prochaines étapes suggérées

- Recalibrer réellement la courbe de consommation à partir des `TestLabRecord` accumulés
  (régression simple par tranche de vitesse), plutôt que de ne mettre à jour que les compteurs.
- Faire influencer la recommandation par `UserPreferences` (priorité principale, sensibilité
  environnementale), au-delà de la seule tolérance de temps.
- Écran de bilan post-trajet (§16) et compteur d'économies du mois.
- Modélisation du trafic/dénivelé sur `RouteSegment` (les champs existent déjà, non exploités).
