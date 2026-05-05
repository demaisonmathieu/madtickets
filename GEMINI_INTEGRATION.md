# Intégration Google Gemini 🔮

L'application supporte maintenant l'intégration avec **Google Gemini**, l'API d'IA générative de Google. Cette intégration permet d'utiliser Gemini directement pour enrichir l'Assistant IA de l'application.

## 🚀 Configuration

### 1. Obtenir une clé API Gemini

1. Allez sur [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Cliquez sur "Create API Key"
3. Sélectionnez ou créez un projet Google Cloud
4. Copiez votre clé API

### 2. Configurer dans l'application

1. Allez dans **Administration** → **🤖 Assistant IA**
2. Activez le mode LLM si ce n'est pas fait
3. Sélectionnez **Google Gemini** dans le dropdown "Provider"
4. Collez votre clé API Gemini
5. Sélectionnez un modèle parmi les disponibles :
   - **gemini-2.0-flash** (⚡ Recommandé - rapide et fiable)
   - **gemini-2.0-flash-exp** (Version expérimentale)
   - **gemini-1.5-pro** (Plus puissant, plus lent)
   - **gemini-1.5-flash** (Léger)
   - **gemini-1.5-pro-exp-0801** (Expérimental)

### 3. Tester la connexion

1. Dans la section Configuration Assistant IA, allez à "Tester l'agent IA"
2. Entrez un message de test
3. Cliquez sur "🚀 Lancer un test"
4. Vous devriez voir la confirmation "✅ Google Gemini opérationnel"

## 📝 Comment ça marche

### Mode de fonctionnement

Lorsque Gemini est configuré comme provider :

1. **Lors de l'ouverture de l'Assistant IA** : 
   - L'app calcule les suggestions locales (basées sur vos données)
   - Envoie le contexte à Google Gemini pour enrichissement
   - Affiche les suggestions enrichies

2. **Avantages** :
   - Pas de serveur backend requis (direct client → Gemini)
   - Contexte complet de vos projets, tickets et sprints
   - Suggestions intelligentes et personnalisées

3. **Limitations** :
   - Nécessite une clé API valide
   - Consomme des tokens Gemini (attention aux limites gratuites)

## 🔧 Architecture technique

### Service Gemini (`src/services/gemini.ts`)

Le service `GeminiService` fournit une interface complète à l'API Gemini :

```typescript
import GeminiService from '../services/gemini'

const service = new GeminiService({
  apiKey: 'votre-clé-api',
  model: 'gemini-2.0-flash',
  temperature: 0.7,
  maxTokens: 2048
})

// Générer du contenu
const response = await service.generateContent('Votre prompt')

// Analyser du texte
const analysis = await service.analyzeContent(
  'Texte à analyser',
  'Instructions d'analyse'
)

// Générer des suggestions
const suggestions = await service.generateSuggestions(
  'Contexte',
  5 // nombre de suggestions
)

// Et bien d'autres méthodes...
```

### Méthodes disponibles

- `generateContent()` - Génère du texte à partir d'un prompt
- `analyzeContent()` - Analyse du contenu
- `generateSuggestions()` - Génère une liste de suggestions
- `summarizeText()` - Résume un texte
- `translateText()` - Traduit vers une langue
- `classifyText()` - Classe le texte dans des catégories
- `extractInformation()` - Extrait des informations structurées
- `detectSentiment()` - Détecte le sentiment
- `generateCreativeContent()` - Génère du contenu créatif
- `askQuestion()` - Pose une question et obtient une réponse détaillée

### Intégration dans AIAssistant

Lorsque Gemini est configuré, le composant `AIAssistant.vue` :

1. Instancie `GeminiService` avec les paramètres de configuration
2. Envoie le contexte (projets, tickets, sprints, etc.)
3. Parse les suggestions de Gemini
4. Les affiche avec les métadonnées appropriées

## 💰 Coûts et limites

### Plan gratuit Google

- **Requêtes/minute** : 60 (variable selon le modèle)
- **Tokens/jour** : Limités mais généreux
- Gratuit jusqu'à certains seuils

### Optimisations pour réduire les coûts

- Utilisez `gemini-2.0-flash` pour un bon équilibre vitesse/coût
- Réglez `temperature` à 0.2 pour moins de variation (moins d'exploration)
- Limitez `maxTokens` au strict nécessaire

## 🔐 Sécurité

- Votre clé API est **stockée localement** dans localStorage
- Les requêtes sont envoyées directement depuis votre navigateur à Google
- Aucun serveur intermédiaire ne stocke ou n'accède à vos données

## 📊 Comparaison des providers IA

| Feature | Local | Mistral | Gemini | OpenAI |
|---------|-------|---------|--------|--------|
| Offline | ✅ | ❌ | ❌ | ❌ |
| Coût | Gratuit | Payant | Gratuit tier | Payant |
| Qualité | Basique | Bonne | Excellente | Excellente |
| Vitesse | Rapide | Moyen | Rapide | Moyen |
| Backend requis | Non | Oui | Non | Oui |
| Config simple | Oui | Non | Oui | Non |

## 🆘 Dépannage

### "Erreur 401: Invalid API Key"
- Vérifiez que votre clé API est correcte
- Assurez-vous d'avoir copié toute la clé
- Générez une nouvelle clé si nécessaire

### "Erreur 429: Rate limit exceeded"
- Vous avez dépassé les limites de requêtes
- Attendez quelques minutes avant de réessayer
- Réduisez la fréquence d'utilisation

### "Réponse vide de Gemini"
- Vérifiez que le prompt système est correct
- Essayez avec un modèle différent
- Augmentez `maxTokens`

### Gemini ne s'active pas
- Vérifiez que votre clé API est renseignée
- Vérifiez que vous avez sélectionné un modèle valide
- Testez directement dans "Tester l'agent IA"

## 📚 Documentation officielle

- [API Gemini - Documentation](https://ai.google.dev/docs)
- [Google AI Studio](https://aistudio.google.com)
- [Modèles disponibles](https://ai.google.dev/models)

## 🎯 Cas d'usage

### Suggestions intelligentes
```
L'app analyse vos sprints en cours, vos tickets bloquants,
vos tâches en retard, puis Gemini propose les actions les plus
importantesà faire maintenant.
```

### Analyse contextuelle
```
Gemini peut analyser vos notes de réunion, vos descriptions
de tickets, et proposer des améliorations ou regroupements.
```

### Priorisation automatique
```
Au lieu de la priorisation basée sur mots-clés,
Gemini comprend le contexte réel et propose
une priorisation plus intelligente.
```

## 🚀 Prochaines améliorations

- [ ] Support du streaming (réponses en temps réel)
- [ ] Cache des réponses Gemini
- [ ] Historique des interactions avec Gemini
- [ ] Fine-tuning avec historique des projets
- [ ] Intégration avec la génération des rapports

---

Pour plus d'aide, consultez les autres fichiers de documentation ou l'onglet Administration dans l'application.
