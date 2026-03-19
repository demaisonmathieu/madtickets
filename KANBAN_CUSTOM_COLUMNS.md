# Colonnes Kanban Personnalisables 📊

## Fonctionnalité

Vous pouvez maintenant personnaliser les colonnes du kanban pour chaque projet ! Chaque projet peut avoir ses propres étapes de workflow avec des libellés et couleurs personnalisés.

## Utilisation

### 1. Configurer les colonnes d'un projet

1. Allez dans les détails d'un projet
2. Cliquez sur le bouton **"📊 Configurer le Kanban"**
3. Un éditeur s'ouvre avec les options suivantes :
   - **Ajouter une colonne** : Cliquez sur "+ Ajouter une colonne"
   - **Modifier le libellé** : Changez le texte de la colonne
   - **Changer la couleur** : Utilisez le sélecteur de couleur
   - **Réorganiser** : Les poignées ☰ permettent le drag & drop (à venir)
   - **Supprimer** : Cliquez sur 🗑️ (minimum 1 colonne requise)
4. Visualisez en temps réel dans l'aperçu
5. Cliquez sur **"💾 Enregistrer"** pour sauvegarder

### 2. Utilisation dans les vues Kanban

Les colonnes personnalisées sont utilisées dans :

#### Vue Kanban Globale
- Sélectionnez un projet dans le filtre
- Les colonnes de ce projet s'affichent automatiquement
- Drag & drop des tickets entre les colonnes
- Si aucun projet n'est sélectionné, les colonnes par défaut sont affichées

#### Kanban dans les Sprints
- Ouvre un sprint d'un projet
- Basculez en vue **📊 Kanban**
- Les colonnes du projet parent s'affichent automatiquement
- Drag & drop pour changer le statut des tickets

#### Création de tickets
- Le menu déroulant "Statut" affiche les colonnes du projet sélectionné
- Cela garantit que les nouveaux tickets utilisent les statuts corrects

## Colonnes par défaut

Si un projet n'a pas de colonnes personnalisées, les colonnes par défaut sont utilisées :

1. **À faire** (jaune pâle - #fff3cd)
2. **En cours** (bleu pâle - #cfe2ff)
3. **Terminé** (vert pâle - #d1e7dd)

## Migration de la base de données

- La base de données a été mise à jour vers la version 5
- Le champ `kanbanColumns` a été ajouté aux projets existants
- Les projets existants utilisent automatiquement les colonnes par défaut
- Aucune action requise de votre part !

## Exemples d'utilisation

### Projet de développement classique
- **À faire** (gris)
- **En cours** (bleu)
- **En revue** (orange)
- **Testé** (violet)
- **Terminé** (vert)

### Projet marketing
- **Idée** (jaune)
- **Planification** (orange)
- **En production** (bleu)
- **Publié** (vert)

### Support client
- **Nouveau** (rouge)
- **En traitement** (orange)
- **En attente client** (jaune)
- **Résolu** (vert)

## Caractéristiques techniques

- ✅ Nombre illimité de colonnes par projet
- ✅ Couleurs personnalisées avec sélecteur
- ✅ Libellés personnalisés
- ✅ Drag & drop des tickets entre colonnes
- ✅ Aperçu en temps réel
- ✅ Migration automatique de la base de données
- ✅ Fallback sur colonnes par défaut
- ✅ Mise à jour dynamique des dropdowns de statut

## Notes importantes

- **Minimum** : 1 colonne par projet (le bouton supprimer est désactivé sur la dernière colonne)
- **IDs uniques** : Chaque colonne a un ID unique généré automatiquement
- **Tickets existants** : Les tickets avec d'anciens statuts continueront à s'afficher normalement
- **Projet requis** : Dans la vue Kanban globale, sélectionnez un projet pour voir ses colonnes personnalisées

Profitez de vos workflows personnalisés ! 🚀
