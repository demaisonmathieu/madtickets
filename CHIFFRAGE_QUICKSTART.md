# Guide Rapide - Chiffrage de Projet 💰

> ⚠️ **Le chiffrage est uniquement disponible pour les Tâches Locales**

## En 5 étapes

### 1️⃣ Activer le chiffrage
```
Projet → Configurer le Chiffrage → ✓ Activer → TJM: 500€ → Enregistrer
```

### 2️⃣ Créer une tâche locale avec chiffrage
```
Aller dans l'onglet "✅ Tâches Locales"
→ + Nouvelle Tâche Locale
→ ✓ Activer le chiffrage
→ Numéro de lot: LOT-001
→ Difficulté: Moyen
→ Temps estimé: 8h
→ Coût calculé automatiquement: 4000€
```

### 3️⃣ Voir le chiffrage dans la liste
Les tâches locales avec chiffrage affichent un badge **💰 Chiffrage** et les infos résumées.

### 4️⃣ Éditer une tâche
Les champs de chiffrage apparaissent dans le formulaire d'édition si activés sur le projet.

### 5️⃣ Exporter le chiffrage
```
Projet → 📊 Exporter le Chiffrage
→ Télécharge un fichier CSV avec toutes les tâches locales et totaux
```

## Exemple d'export

```csv
Numéro de lot,Titre,Difficulté,Priorité,Temps estimé (h),TJM (€),Coût (€),Statut,Description
"LOT-001","Architecture backend","Expert","Haute",16,500,8000.00,"En cours","..."
"LOT-001","API REST","Difficile","Haute",12,500,6000.00,"À faire","..."
"LOT-002","Interface utilisateur","Moyen","Moyenne",24,500,12000.00,"À faire","..."
"LOT-003","Tests unitaires","Facile","Basse",8,500,4000.00,"À faire","..."

"TOTAL","","","",60,500,30000.00,"",""
```

## Astuces

- 💡 Le TJM peut être modifié à tout moment
- 💡 Seules les tâches locales avec le chiffrage activé sont exportées
- 💡 Le coût se calcule automatiquement (temps × TJM)
- 💡 Utilisez les numéros de lot pour regrouper les tâches
- 💡 Le chiffrage n'est disponible que pour les Tâches Locales, pas les tickets classiques

C'est tout ! 🎉
