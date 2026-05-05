/**
 * Service Google Gemini API
 * Intégration avec Google Gemini pour l'IA
 */

export interface GeminiConfig {
  apiKey: string
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface GeminiMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface GeminiGenerateRequest {
  contents: Array<{
    role: 'user' | 'model'
    parts: Array<{
      text: string
    }>
  }>
  generationConfig?: {
    temperature?: number
    maxOutputTokens?: number
    topP?: number
    topK?: number
  }
  safetySettings?: Array<{
    category: string
    threshold: string
  }>
  systemInstruction?: {
    parts: Array<{
      text: string
    }>
  }
}

export interface GeminiGenerateResponse {
  candidates: Array<{
    content: {
      parts: Array<{
        text: string
      }>
      role: string
    }
    finishReason: string
    safetyRatings?: Array<{
      category: string
      probability: string
    }>
  }>
  usageMetadata?: {
    promptTokenCount: number
    candidatesTokenCount: number
    totalTokenCount: number
  }
}

const DEFAULT_MODEL = 'gemini-2.0-flash'
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models'

export class GeminiService {
  private apiKey: string
  private model: string
  private temperature: number
  private maxTokens: number

  constructor(config: GeminiConfig) {
    if (!config.apiKey) {
      throw new Error('API key Gemini requise')
    }
    this.apiKey = config.apiKey
    this.model = config.model || DEFAULT_MODEL
    this.temperature = config.temperature ?? 0.7
    this.maxTokens = config.maxTokens ?? 2048
  }

  /**
   * Génère une réponse à partir d'un prompt
   */
  async generateContent(
    prompt: string,
    systemPrompt?: string,
    options?: {
      temperature?: number
      maxTokens?: number
    }
  ): Promise<string> {
    const temperature = options?.temperature ?? this.temperature
    const maxTokens = options?.maxTokens ?? this.maxTokens

    const request: GeminiGenerateRequest = {
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ],
      generationConfig: {
        temperature,
        maxOutputTokens: maxTokens,
        topP: 0.95,
        topK: 40
      }
    }

    if (systemPrompt) {
      request.systemInstruction = {
        parts: [{ text: systemPrompt }]
      }
    }

    try {
      const response = await fetch(
        `${GEMINI_API_BASE}/${this.model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(request)
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({}))
        throw new Error(`Gemini API error: ${response.status} - ${error.error?.message || response.statusText}`)
      }

      const data: GeminiGenerateResponse = await response.json()

      if (!data.candidates || data.candidates.length === 0) {
        throw new Error('Aucune réponse de Gemini')
      }

      const firstCandidate = data.candidates[0]
      if (!firstCandidate.content.parts || firstCandidate.content.parts.length === 0) {
        throw new Error('Réponse Gemini vide')
      }

      return firstCandidate.content.parts
        .map(part => part.text)
        .join('\n')
    } catch (error) {
      throw new Error(`Erreur Gemini: ${error instanceof Error ? error.message : String(error)}`)
    }
  }

  /**
   * Analyse du contenu avec streaming (optionnel pour futur usage)
   * Retourne du texte analysé
   */
  async analyzeContent(
    content: string,
    analysisPrompt: string,
    systemPrompt?: string
  ): Promise<string> {
    const fullPrompt = `${analysisPrompt}\n\nContenu à analyser:\n${content}`
    return this.generateContent(fullPrompt, systemPrompt, {
      temperature: 0.5,
      maxTokens: 1024
    })
  }

  /**
   * Génère des suggestions à partir d'un contexte
   */
  async generateSuggestions(
    context: string,
    numberOfSuggestions: number = 5,
    systemPrompt?: string
  ): Promise<string[]> {
    const prompt = `Génère exactement ${numberOfSuggestions} suggestions basées sur ce contexte:

${context}

Formate chaque suggestion sur une ligne avec numérotation (1., 2., etc.)`

    const response = await this.generateContent(prompt, systemPrompt, {
      temperature: 0.8,
      maxTokens: 1024
    })

    return response
      .split('\n')
      .filter(line => line.trim().length > 0)
      .map(line => line.replace(/^\d+\.\s*/, '').trim())
      .filter(line => line.length > 0)
  }

  /**
   * Résume le texte
   */
  async summarizeText(text: string, maxLength: number = 500): Promise<string> {
    const prompt = `Résume le texte suivant en ${maxLength} caractères maximum:

${text}`

    return this.generateContent(prompt, 'Tu es un expert en résumé de texte. Sois concis et pertinent.', {
      temperature: 0.3,
      maxTokens: 500
    })
  }

  /**
   * Traduit le texte
   */
  async translateText(text: string, targetLanguage: string): Promise<string> {
    const prompt = `Traduis le texte suivant en ${targetLanguage}:

${text}`

    return this.generateContent(prompt, `Tu es un traducteur expert en ${targetLanguage}.`, {
      temperature: 0.3,
      maxTokens: text.length * 2
    })
  }

  /**
   * Classification du texte
   */
  async classifyText(
    text: string,
    categories: string[],
    systemPrompt?: string
  ): Promise<string> {
    const categoriesList = categories.join(', ')
    const prompt = `Classe le texte suivant dans l'une de ces catégories: ${categoriesList}

Texte: ${text}

Réponds uniquement avec le nom de la catégorie.`

    return this.generateContent(prompt, systemPrompt, {
      temperature: 0.2,
      maxTokens: 50
    })
  }

  /**
   * Extraction d'informations
   */
  async extractInformation(
    text: string,
    fieldsToExtract: string[],
    systemPrompt?: string
  ): Promise<Record<string, string>> {
    const fields = fieldsToExtract.join(', ')
    const prompt = `Extrais les informations suivantes du texte: ${fields}

Texte: ${text}

Formate la réponse en JSON avec les clés: ${fieldsToExtract.map(f => `"${f}"`).join(', ')}`

    const response = await this.generateContent(prompt, systemPrompt, {
      temperature: 0.2,
      maxTokens: 1024
    })

    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
    } catch {
      // Fallback si le JSON ne peut pas être parsé
    }

    return { extracted: response }
  }

  /**
   * Détecte le sentiment du texte
   */
  async detectSentiment(text: string, systemPrompt?: string): Promise<string> {
    const prompt = `Analyse le sentiment du texte suivant et réponds uniquement avec: positif, neutre ou négatif

Texte: ${text}`

    return this.generateContent(prompt, systemPrompt, {
      temperature: 0.2,
      maxTokens: 50
    })
  }

  /**
   * Génère du contenu créatif
   */
  async generateCreativeContent(
    topic: string,
    style: string,
    systemPrompt?: string
  ): Promise<string> {
    const prompt = `Génère un contenu ${style} sur le sujet suivant: ${topic}`

    return this.generateContent(prompt, systemPrompt, {
      temperature: 0.9,
      maxTokens: 2048
    })
  }

  /**
   * Pose une question et obtient une réponse détaillée
   */
  async askQuestion(
    question: string,
    context?: string,
    systemPrompt?: string
  ): Promise<string> {
    const fullPrompt = context ? `Contexte: ${context}\n\nQuestion: ${question}` : question

    return this.generateContent(fullPrompt, systemPrompt, {
      temperature: 0.7,
      maxTokens: 2048
    })
  }

  /**
   * Valide la configuration
   */
  static async validateConfig(config: GeminiConfig): Promise<boolean> {
    if (!config.apiKey) {
      return false
    }

    try {
      const service = new GeminiService(config)
      await service.generateContent('Test', undefined, { maxTokens: 10 })
      return true
    } catch {
      return false
    }
  }

  /**
   * Retourne le modèle actuellement utilisé
   */
  getModel(): string {
    return this.model
  }

  /**
   * Change le modèle
   */
  setModel(model: string): void {
    this.model = model
  }

  /**
   * Retourne les modèles disponibles
   */
  static getAvailableModels(): string[] {
    return [
      'gemini-2.0-flash',
      'gemini-2.0-flash-exp',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-pro-exp-0801'
    ]
  }
}

export default GeminiService
