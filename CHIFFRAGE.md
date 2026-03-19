# Fonctionnalité de Chiffrage 💰

## Vue d'ensemble

La fonctionnalité de chiffrage permet de gérer l'estimation des coûts et du temps pour les **tâches locales** d'un projet. Cette fonctionnalité est optionnelle et s'active au niveau du projet.

> ⚠️ **Important** : Le chiffrage est uniquement disponible pour les **Tâches Locales**, pas pour les tickets classiques ni les tâches Odoo.

## Activation

### 1. Activer le chiffrage sur un projet

1. Allez dans les détails d'un projet
2. Cliquez sur **"💰 Configurer le Chiffrage"**
3. Cochez **"Activer le chiffrage sur ce projet"**
4. Définissez le **TJM (Taux Journalier Moyen)** en euros
5. Cliquez sur **"💾 Enregistrer"**

Le TJM sera utilisé pour calculer automatiquement les coûts estimés des tâches.

## Utilisation

### Créer ou éditer une tâche locale avec chiffrage

Une fois le chiffrage activé sur le projet, allez dans l'onglet **"✅ Tâches Locales"** du projet.

Les tâches locales peuvent inclure les informations suivantes :

#### Champs disponibles

- **Activer le chiffrage** : Checkbox pour activer/désactiver le chiffrage sur cette tâche spécifique
- **Numéro de lot** : Identifiant du lot (ex: LOT-001)
- **Difficulté** : Niveau de complexité
  - Facile
  - Moyen
  - Difficile
  - Expert
- **Priorité** : Toujours visible (Basse, Moyenne, Haute)
- **Temps estimé** : Durée estimée en heures
- **Coût estimé** : Calculé automatiquement (Temps estimé × TJM)

#### Affichage des champs

Les champs de chiffrage ne s'affichent que si :
1. Le chiffrage est activé sur le projet
2. La checkbox "Activer le chiffrage" est cochée sur la tâche locale
3. Vous êtes dans l'onglet "Tâches Locales" du projet

### Visualisation

#### Dans la liste des tâches locales

Les tâches avec chiffrage activé affichent :
- Un badge **💰 Chiffrage** distinctif
- Les informations résumées : Lot, Difficulté, Temps estimé, Coût

#### Dans les détails de la tâche

En mode édition, toutes les informations de chiffrage sont visibles et modifiables.

## Export Excel

### Générer l'export

1. Allez dans les détails d'un projet avec chiffrage activé
2. Cliquez sur **"📊 Exporter le Chiffrage"**
3. Un fichier CSV sera automatiquement téléchargé

### Contenu de l'export

Le fichier CSV contient :

| Colonne | Description |
|---------|-------------|
| Numéro de lot | Identifiant du lot |
| Titre | Titre du ticket |
| Difficulté | Niveau de difficulté |
| Priorité | Niveau de priorité |
| Temps estimé (h) | Durée estimée en heures |
| TJM (€) | Taux journalier moyen |
| Coût (€) | Coût calculé (temps × TJM) |
| Statut | Statut actuel du ticket |
| Description | Description du ticket (texte brut) |

Une ligne de **TOTAL** est ajoutée automatiquement avec :
- Total des temps estimés
- Total des coûts

### Nom du fichier

Format : `chiffrage_[nom_projet]_[date].csv`
Exemple : `chiffrage_Mon_Projet_2026-03-13.csv`

## Base de données

### Modifications du schéma

#### Projets
- `chiffrageEnabled` (boolean) : Active/désactive le chiffrage
- `tjm` (number) : Taux journalier moyen en euros

#### Tâches Locales
- `isChiffrage` (boolean) : Indique si la tâche utilise le chiffrage
- `lotNumber` (string) : Numéro de lot
- `difficulty` (string) : Niveau de difficulté (easy, medium, hard, expert)
- `estimatedTime` (number) : Temps estimé en heures

### Version de la base de données

La base de données a été mise à jour vers la **version 9** pour supporter ces nouveaux champs.

## Cas d'usage

### 1. Chiffrage de projet web

```
Projet: Site e-commerce
TJM: 500€

Tâches Locales:
- LOT-001: Architecture (Expert, 16h) = 8 000€
- LOT-001: Intégration API (Difficile, 12h) = 6 000€
- LOT-002: Front-end (Moyen, 24h) = 12 000€
- LOT-003: Tests (Facile, 8h) = 4 000€

Total: 60h = 30 000€
```

### 2. Découpage par lots

Organisez vos tâches locales par lots pour faciliter la facturation :
- LOT-001 : Backend
- LOT-002 : Frontend
- LOT-003 : Tests et déploiement

### 3. Suivi des estimations vs réel

- Utilisez le **temps estimé** dans le chiffrage
- Comparez avec le **temps réel** saisi dans les feuilles de temps
- Analysez les écarts pour améliorer vos estimations futures

## Conseils

### Bonnes pratiques

1. **Définir le TJM au début du projet** : Cela permettra des calculs cohérents
2. **Utiliser des lots cohérents** : Regroupez les tâches par phase ou fonctionnalité
3. **Être réaliste dans les estimations** : Inclure le temps de tests et de revue
4. **Exporter régulièrement** : Gardez une trace de l'évolution du chiffrage
5. **Utiliser les Tâches Locales** : Le chiffrage n'est disponible que pour les tâches locales

### Workflow recommandé

1. Créer le projet et activer le chiffrage
2. Définir les lots (LOT-001, LOT-002, etc.)
3. Aller dans l'onglet "Tâches Locales"
4. Créer les tâches avec estimations et chiffrage activé
5. Valider le chiffrage total
6. Exporter pour présentation client
7. Suivre l'avancement avec les feuilles de temps (si nécessaire)
8. Comparer estimé vs réel en fin de projet

## Compatibilité

- ✅ Uniquement pour les Tâches Locales
- ❌ Non disponible pour les tickets classiques
- ❌ Non disponible pour les tâches Odoo
- ✅ Compatible avec les sprints
- ✅ Intégré au système de kanban personnalisé

## Notes techniques

- Le calcul du coût est automatique (temps × TJM)
- L'export CSV est compatible Excel, LibreOffice, Google Sheets
- Les données sont stockées localement dans IndexedDB
- Pas besoin de connexion Internet pour utiliser le chiffrage

---

Profitez de cette fonctionnalité pour gérer vos estimations de projets ! 🚀
