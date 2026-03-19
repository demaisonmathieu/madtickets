# Génération des icônes PWA

Pour générer les icônes de l'application PWA, suivez l'une de ces méthodes :

## Méthode 1 : Avec le fichier HTML (recommandé)

1. Ouvrez le fichier `generate-icons.html` dans votre navigateur
2. Cliquez sur "Télécharger 192x192" pour obtenir la première icône
3. Cliquez sur "Télécharger 512x512" pour obtenir la deuxième icône
4. Placez les fichiers téléchargés dans le dossier `public/`

## Méthode 2 : Avec ImageMagick (si installé)

```bash
# Installer ImageMagick (si nécessaire)
sudo apt install imagemagick  # Ubuntu/Debian
# ou
brew install imagemagick       # macOS

# Générer les icônes
cd public
convert icon.svg -resize 192x192 icon-192x192.png
convert icon.svg -resize 512x512 icon-512x512.png
```

## Méthode 3 : Avec un outil en ligne

1. Utilisez un service comme https://realfavicongenerator.net/
2. Uploadez le fichier `public/icon.svg`
3. Téléchargez les icônes générées
4. Placez-les dans le dossier `public/`

## Méthode 4 : Avec sharp (Node.js)

```bash
npm install -g sharp-cli
sharp -i public/icon.svg -o public/icon-192x192.png resize 192 192
sharp -i public/icon.svg -o public/icon-512x512.png resize 512 512
```

Une fois les icônes générées, l'application PWA sera prête !
