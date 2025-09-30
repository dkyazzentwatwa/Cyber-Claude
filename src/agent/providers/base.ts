// Base provider interface for AI models
export interface AIProvider {
  /**
   * Send a message and get a response
   */
  chat(messages: ConversationMessage[], systemPrompt: string): Promise<string>;

  /**
   * Get provider name
   */
  getProviderName(): string;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}