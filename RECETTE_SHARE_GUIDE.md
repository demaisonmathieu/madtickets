# 🧪 Partage public de recettes - Guide d'utilisation

## Fonctionnalité

Vous pouvez désormais générer un **lien de partage public** pour permettre aux clients/testeurs de consulter les recettes de vos tickets **sans avoir besoin d'accès à l'application** et **sans authentification**.

## Comment utiliser

### 1️⃣ Générer un lien de partage

1. Ouvrez un ticket en **recette**
2. Allez dans l'onglet **🧪 Recette**
3. Cherchez le bouton **📤 Partager la recette** (visible seulement si le ticket est en recette)
4. Cliquez sur le bouton
5. Le lien est **automatiquement copié** dans votre presse-papiers ✅

### 2️⃣ Partager le lien

- Le lien ressemble à : `https://vps-48aa0bd2.vps.ovh.net/recette-share/{UUID}`
- Envoyez-le par email ou message à vos clients/testeurs
- Ils peuvent l'ouvrir dans n'importe quel navigateur

### 3️⃣ Consulter les recettes (côté testeur)

Quand on clique sur le lien partagé :
- ✅ Pas de login nécessaire
- ✅ Affiche **tous les tickets du projet** qui sont en recette
- ✅ Pour chaque ticket : description, user stories, critères d'acceptation, couverture
- ✅ Vue **lecture seule** (impossible de modifier)
- ✅ Design responsive et moderne

## Points importants

### 📌 Tokens par projet
- **Un seul token par projet** (pas un par ticket)
- Si vous générez le lien une fois, il reste valide indefiniment
- Le lien affiche **tous les tickets en recette du projet**, pas juste un

### 📌 Sécurité
- ✅ Les tokens sont des UUIDs aléatoires (sécurisés)
- ✅ La page est publique mais le token doit être correct
- ✅ Aucune donnée n'est modifiable
- ✅ Fonctionne **avec ou sans connexion internet** (mode offline via PWA)

### 📌 Affichage côté client
Pour chaque ticket en recette, affichage :
- **Titre et statut** du ticket
- **Description** du ticket  
- **Couverture des critères** (% de validation)
- **User stories** avec tous les critères d'acceptation
- **Statut recette** : À tester, En test, Validé, etc.
- **Date et auteur** de la recette
- **Commentaires** si présents

## Exemple

### URL générée
```
https://vps-48aa0bd2.vps.ovh.net/recette-share/550e8400-e29b-41d4-a716-446655440000
```

### Partage
"Bonjour, voici le lien pour valider les recettes du projet X :
https://vps-48aa0bd2.vps.ovh.net/recette-share/550e8400-e29b-41d4-a716-446655440000"

### Résultat côté client
Page publique affichant :
- 📋 Projet "Mon projet"
- 🧪 Ticket 1: Feature A - Prêt à tester
  - User stories avec critères
  - Couverture: 8/10 critères (80%)
- 🧪 Ticket 2: Feature B - En test
  - ...

## Revocation/Modification

- Le token est stocké au niveau du **projet**, pas du ticket
- Si vous voulez modifier ou révoquer l'accès :
  - Contactez l'admin pour regénérer un nouveau token
  - L'ancien lien ne fonctionnera plus

## Bonnes pratiques

✅ **À faire**
- Générer le lien quand vous êtes prêt à mettre en recette
- Partager avec les bonnes personnes
- Utiliser des emails ou canaux sécurisés

❌ **À éviter**
- Ne publiez pas le lien publiquement (ex: sur les réseaux sociaux)
- Ne partagez pas le lien avec les personnes qui ne doivent pas valider la recette

## Support

Si vous avez des questions sur la fonctionnalité, contactez votre admin.

---

**Note technique** : Cette fonctionnalité utilise un système de tokens UUID stockés dans la base de données. Elle fonctionne en mode offline et est protégée par les paramètres de route Vue Router avec le flag `meta: { public: true }`.
