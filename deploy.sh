#!/bin/bash

# 🚀 Script de déploiement - Tickets PWA
# Ce script prépare et déploie l'application

set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🚀 DÉPLOIEMENT - Tickets PWA avec Intégration Gemini   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Couleurs
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 1. Vérifier les prérequis
echo -e "${BLUE}[1/6]${NC} Vérification des prérequis..."
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js n'est pas installé${NC}"
    exit 1
fi
if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm n'est pas installé${NC}"
    exit 1
fi
echo -e "${GREEN}✓ Node.js et npm trouvés${NC}"
echo ""

# 2. Nettoyer les builds précédents
echo -e "${BLUE}[2/6]${NC} Nettoyage..."
rm -rf dist/
echo -e "${GREEN}✓ Build précédent supprimé${NC}"
echo ""

# 3. Installer les dépendances
echo -e "${BLUE}[3/6]${NC} Installation des dépendances..."
npm install --legacy-peer-deps 2>&1 | tail -3
echo -e "${GREEN}✓ Dépendances installées${NC}"
echo ""

# 4. Compiler pour la production
echo -e "${BLUE}[4/6]${NC} Compilation production..."
npm run build 2>&1 | tail -5
echo -e "${GREEN}✓ Build production réussi${NC}"
echo ""

# 5. Vérifier le build
echo -e "${BLUE}[5/6]${NC} Vérification du build..."
if [ -d "dist" ] && [ -f "dist/index.html" ]; then
    DIST_SIZE=$(du -sh dist | cut -f1)
    echo -e "${GREEN}✓ Build validé - Taille: $DIST_SIZE${NC}"
else
    echo -e "${RED}❌ Build non trouvé${NC}"
    exit 1
fi
echo ""

# 6. Résumé
echo -e "${BLUE}[6/6]${NC} Résumé du déploiement..."
echo ""
echo -e "${GREEN}╔════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║          ✅ DÉPLOIEMENT RÉUSSI                      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "📦 Fichiers prêts dans: ${YELLOW}./dist${NC}"
echo -e "📊 Taille du build: ${YELLOW}$DIST_SIZE${NC}"
echo ""
echo -e "${YELLOW}Prochaines étapes:${NC}"
echo "  1. Pour le développement local:"
echo -e "     ${BLUE}npm run preview${NC}"
echo ""
echo "  2. Pour déployer sur VPS OVH:"
echo -e "     📖 Voir: ${BLUE}VPS_DEPLOY_OVH.md${NC}"
echo ""
echo "  3. Pour déployer avec Recette Share:"
echo -e "     📖 Voir: ${BLUE}RECETTE_SHARE_DEPLOYMENT.md${NC}"
echo ""
echo -e "  4. Fichiers disponibles:"
echo -e "     - ${BLUE}dist/index.html${NC} (page principale)"
echo -e "     - ${BLUE}dist/assets/{{NC}} (CSS/JS minifiés)"
echo -e "     - ${BLUE}dist/sw.js${NC} (Service Worker)"
echo -e "     - ${BLUE}dist/manifest.webmanifest${NC} (Manifest PWA)"
echo ""
echo -e "${YELLOW}📝 Documentation déploiement:${NC}"
echo "  - START_GEMINI.md (Gemini API)"
echo "  - VPS_DEPLOY_OVH.md (Déploiement VPS)"
echo "  - RECETTE_SHARE_DEPLOYMENT.md (Recette Share)"
echo "  - PWA.md (Mode offline)"
echo ""
echo -e "${GREEN}🎉 Déploiement terminé!${NC}"
echo ""
