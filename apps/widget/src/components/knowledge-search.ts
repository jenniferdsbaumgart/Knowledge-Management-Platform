import { LitElement, html, css } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

interface SearchResult {
    id: string;
    documentId: string;
    documentTitle: string;
    content: string;
    score: number;
}

interface RAGResponse {
    answer: string;
    sources: SearchResult[];
}

@customElement('knowledge-search')
export class KnowledgeSearch extends LitElement {
    static styles = css`
    :host {
      --kp-primary: #6366f1;
      --kp-primary-hover: #4f46e5;
      --kp-bg: #ffffff;
      --kp-text: #1f2937;
      --kp-text-muted: #6b7280;
      --kp-border: #e5e7eb;
      --kp-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
      --kp-radius: 12px;
      
      display: block;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }

    :host([theme="dark"]) {
      --kp-bg: #1f2937;
      --kp-text: #f9fafb;
      --kp-text-muted: #9ca3af;
      --kp-border: #374151;
    }

    .widget-container {
      position: fixed;
      z-index: 9999;
    }

    :host([position="bottom-right"]) .widget-container {
      bottom: 20px;
      right: 20px;
    }

    :host([position="bottom-left"]) .widget-container {
      bottom: 20px;
      left: 20px;
    }

    .trigger-button {
      width: 56px;
      height: 56px;
      border-radius: 50%;
      background: var(--kp-primary);
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: var(--kp-shadow);
      transition: all 0.2s;
    }

    .trigger-button:hover {
      background: var(--kp-primary-hover);
      transform: scale(1.05);
    }

    .trigger-button svg {
      width: 24px;
      height: 24px;
      fill: white;
    }

    .panel {
      position: absolute;
      bottom: 70px;
      right: 0;
      width: 380px;
      max-height: 500px;
      background: var(--kp-bg);
      border-radius: var(--kp-radius);
      box-shadow: var(--kp-shadow);
      border: 1px solid var(--kp-border);
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .header {
      padding: 16px;
      border-bottom: 1px solid var(--kp-border);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .header h3 {
      margin: 0;
      font-size: 16px;
      font-weight: 600;
      color: var(--kp-text);
    }

    .close-button {
      background: none;
      border: none;
      cursor: pointer;
      padding: 4px;
      color: var(--kp-text-muted);
    }

    .search-box {
      padding: 16px;
      border-bottom: 1px solid var(--kp-border);
    }

    .search-input {
      width: 100%;
      padding: 12px 16px;
      border: 1px solid var(--kp-border);
      border-radius: 8px;
      font-size: 14px;
      background: var(--kp-bg);
      color: var(--kp-text);
      box-sizing: border-box;
    }

    .search-input:focus {
      outline: none;
      border-color: var(--kp-primary);
    }

    .results {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
    }

    .answer {
      background: linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 16px;
      color: #0c4a6e;
    }

    :host([theme="dark"]) .answer {
      background: linear-gradient(135deg, #1e3a5f 0%, #1e3a8a 100%);
      color: #e0f2fe;
    }

    .answer-text {
      font-size: 14px;
      line-height: 1.6;
    }

    .sources-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--kp-text-muted);
      margin: 16px 0 8px;
      text-transform: uppercase;
    }

    .result-item {
      padding: 12px;
      border: 1px solid var(--kp-border);
      border-radius: 8px;
      margin-bottom: 8px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .result-item:hover {
      border-color: var(--kp-primary);
      background: rgba(99, 102, 241, 0.05);
    }

    .result-title {
      font-size: 14px;
      font-weight: 500;
      color: var(--kp-text);
      margin-bottom: 4px;
    }

    .result-content {
      font-size: 12px;
      color: var(--kp-text-muted);
      line-height: 1.5;
    }

    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 32px;
    }

    .spinner {
      width: 24px;
      height: 24px;
      border: 2px solid var(--kp-border);
      border-top-color: var(--kp-primary);
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .feedback {
      display: flex;
      gap: 8px;
      margin-top: 12px;
      padding-top: 12px;
      border-top: 1px solid var(--kp-border);
    }

    .feedback-button {
      flex: 1;
      padding: 8px;
      border: 1px solid var(--kp-border);
      border-radius: 6px;
      background: var(--kp-bg);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      font-size: 12px;
      color: var(--kp-text-muted);
      transition: all 0.2s;
    }

    .feedback-button:hover {
      border-color: var(--kp-primary);
      color: var(--kp-primary);
    }

    .feedback-button.selected {
      background: var(--kp-primary);
      color: white;
      border-color: var(--kp-primary);
    }

    .empty {
      text-align: center;
      padding: 32px;
      color: var(--kp-text-muted);
    }
  `;

    @property({ type: String, attribute: 'api-url' })
    apiUrl = 'http://localhost:3333/api/v1';

    @property({ type: String, attribute: 'api-key' })
    apiKey = '';

    @property({ type: String })
    theme = 'light';

    @property({ type: String })
    position = 'bottom-right';

    @state()
    private isOpen = false;

    @state()
    private query = '';

    @state()
    private loading = false;

    @state()
    private response: RAGResponse | null = null;

    @state()
    private feedback: 'positive' | 'negative' | null = null;

    private async search() {
        if (!this.query.trim()) return;

        this.loading = true;
        this.response = null;
        this.feedback = null;

        try {
            const res = await fetch(`${this.apiUrl}/search/rag`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` }),
                },
                body: JSON.stringify({ query: this.query }),
            });

            if (res.ok) {
                this.response = await res.json();
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            this.loading = false;
        }
    }

    private async submitFeedback(rating: 'positive' | 'negative') {
        this.feedback = rating;

        try {
            await fetch(`${this.apiUrl}/webhooks/feedback`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    rating,
                    query: this.query,
                }),
            });
        } catch (error) {
            console.error('Feedback failed:', error);
        }
    }

    private handleKeyDown(e: KeyboardEvent) {
        if (e.key === 'Enter') {
            this.search();
        }
    }

    render() {
        return html`
      <div class="widget-container">
        ${this.isOpen ? this.renderPanel() : ''}
        <button class="trigger-button" @click=${() => this.isOpen = !this.isOpen}>
          <svg viewBox="0 0 24 24">
            ${this.isOpen
                ? html`<path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>`
                : html`<path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>`
            }
          </svg>
        </button>
      </div>
    `;
    }

    private renderPanel() {
        return html`
      <div class="panel">
        <div class="header">
          <h3>Ask a Question</h3>
          <button class="close-button" @click=${() => this.isOpen = false}>✕</button>
        </div>

        <div class="search-box">
          <input
            class="search-input"
            type="text"
            placeholder="Type your question..."
            .value=${this.query}
            @input=${(e: InputEvent) => this.query = (e.target as HTMLInputElement).value}
            @keydown=${this.handleKeyDown}
          />
        </div>

        <div class="results">
          ${this.loading ? html`
            <div class="loading">
              <div class="spinner"></div>
            </div>
          ` : this.response ? this.renderResponse() : html`
            <div class="empty">
              Ask a question to search the knowledge base
            </div>
          `}
        </div>
      </div>
    `;
    }

    private renderResponse() {
        if (!this.response) return '';

        return html`
      <div class="answer">
        <div class="answer-text">${this.response.answer}</div>
        <div class="feedback">
          <button 
            class="feedback-button ${this.feedback === 'positive' ? 'selected' : ''}"
            @click=${() => this.submitFeedback('positive')}
          >
            👍 Helpful
          </button>
          <button 
            class="feedback-button ${this.feedback === 'negative' ? 'selected' : ''}"
            @click=${() => this.submitFeedback('negative')}
          >
            👎 Not helpful
          </button>
        </div>
      </div>

      ${this.response.sources.length > 0 ? html`
        <div class="sources-title">Sources</div>
        ${this.response.sources.map(source => html`
          <div class="result-item">
            <div class="result-title">${source.documentTitle}</div>
            <div class="result-content">${source.content}</div>
          </div>
        `)}
      ` : ''}
    `;
    }
}

declare global {
    interface HTMLElementTagNameMap {
        'knowledge-search': KnowledgeSearch;
    }
}
