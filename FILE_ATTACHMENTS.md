# 📎 Gestion des Pièces Jointes

## Vue d'ensemble

L'application permet maintenant d'attacher des fichiers et screenshots à vos tickets et tâches locales !

## ✨ Fonctionnalités

### Types de fichiers supportés
- **Images** : PNG, JPG, GIF, SVG, etc. 🖼️
- **Documents** : PDF, Word (.doc, .docx), Excel (.xls, .xlsx) 📄
- **Texte** : .txt 📝
- **Archives** : .zip 📦
- **Autres** : Tous types de fichiers 📎

### Limite de taille
- **Maximum** : 5MB par fichier
- Les fichiers dépassant cette limite seront rejetés avec un message d'erreur

## 📝 Utilisation

### Ajouter des fichiers à un ticket

1. Créez un nouveau ticket ou modifiez un existant
2. Dans le formulaire, trouvez la section **"📎 Pièces jointes"**
3. Cliquez sur **"Choisir des fichiers"**
4. Sélectionnez un ou plusieurs fichiers (Ctrl/Cmd + clic pour multi-sélection)
5. Les fichiers apparaissent avec leur icône, nom et taille
6. Vous pouvez supprimer un fichier avec le bouton 🗑️
7. Enregistrez le ticket

### Ajouter des fichiers à une tâche locale

1. Dans un projet, allez dans l'onglet **"🔧 Tâches Locales"**
2. Créez une nouvelle tâche
3. Dans le formulaire, trouvez la section **"📎 Pièces jointes"**
4. Procédez de la même manière que pour les tickets

### Voir les fichiers attachés

Les fichiers attachés sont affichés :
- ✅ Dans les cartes de tickets/tâches
- ✅ Dans la vue détaillée
- ✅ Avec une icône selon le type de fichier
- ✅ Avec la taille du fichier

### Télécharger un fichier

1. Cliquez sur une pièce jointe dans la liste
2. Le fichier se télécharge automatiquement
3. Pour les images, vous pouvez les ouvrir dans un nouvel onglet

## 🔧 Stockage

### Où sont stockés les fichiers ?
- **IndexedDB** : Tous les fichiers sont stockés localement dans votre navigateur
- **Format** : Base64 (encodage des fichiers en texte)
- **Persistance** : Les fichiers restent disponibles même hors ligne

### Taille maximale de la base
- Dépend du navigateur (généralement 50MB à 1GB disponible)
- Surveillez l'utilisation dans les DevTools (Application → Storage)

## 📱 Cas d'usage

### Screenshots
1. Prenez un screenshot (Impr. Écran / Cmd+Shift+4)
2. Collez-le dans un éditeur d'image (Paint, Preview, etc.)
3. Sauvegardez en PNG/JPG
4. Attachez-le à votre ticket

### Captures d'erreur
- Idéal pour documenter des bugs visuels
- Attachez des screenshots d'erreurs
- Ajoutez des logs en fichiers .txt

### Cahiers des charges
- Attachez des PDF de spécifications
- Documents Word de requirements
- Fichiers Excel de données

### Maquettes
- Designs en PNG/JPG
- Fichiers Figma exportés
- Wireframes

## ⚠️ Limitations

1. **Taille fichier** : 5MB max par fichier
2. **Taille totale** : Limité par le navigateur (50MB-1GB selon navigateur)
3. **Pas de preview images** : Pour l'instant, cliquer télécharge le fichier
4. **Pas de modification** : Une fois attaché, un fichier ne peut qu'être supprimé

## 🚀 Améliorations futures

- [ ] Preview d'images dans une modale
- [ ] Galerie d'images en miniatures
- [ ] Drag & drop de fichiers
- [ ] Copier-coller de screenshots directement
- [ ] Compression automatique des images
- [ ] Support de vidéos courtes
- [ ] Annotations sur les images

## 💡 Astuces

### Optimiser les images
Avant d'attacher des images volumineuses :
1. Réduisez la résolution (pas besoin de 4K)
2. Compressez avec TinyPNG ou similaire
3. Préférez PNG pour les screenshots, JPG pour les photos

### Nommer vos fichiers
Utilisez des noms explicites :
- ✅ `erreur-login-2024-01-15.png`
- ✅ `specs-module-paiement.pdf`
- ❌ `Capture1.png`
- ❌ `Sans titre.jpg`

### Organiser les pièces jointes
- Un ticket = un sujet
- Regroupez les fichiers connexes dans le même ticket
- Utilisez la description pour expliquer les fichiers

## 🐛 Dépannage

### Le fichier ne s'upload pas
- Vérifiez la taille (< 5MB)
- Vérifiez le type de fichier
- Essayez de renommer le fichier (caractères spéciaux)

### Le fichier ne se télécharge pas
- Désactivez les bloqueurs de pop-up
- Vérifiez les permissions du navigateur
- Essayez dans un autre navigateur

### Espace disque insuffisant
1. Ouvrez les DevTools (F12)
2. Application → Storage
3. Vérifiez "tickets-db"
4. Supprimez des anciens tickets avec pièces jointes

## 📊 Statistiques

Visualisez l'utilisation du stockage :
1. DevTools (F12)
2. Application → Storage
3. IndexedDB → tickets-db

Vous verrez :
- Nombre d'objets
- Taille approximative
- Stores utilisés

---

💡 **Astuce** : Cette fonctionnalité fonctionne 100% en local, aucune donnée n'est envoyée sur un serveur !
