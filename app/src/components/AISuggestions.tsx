import { AISuggestion } from "../services/subscriptionService";
import "./AISuggestions.css";

interface AISuggestionsProps {
  suggestions: AISuggestion[];
  onCancel: (subscriptionId: string) => void;
}

export default function AISuggestions({ suggestions, onCancel }: AISuggestionsProps) {
  if (suggestions.length === 0) return null;

  const getSuggestionIcon = (type: string) => {
    switch (type) {
      case 'SAVINGS_OPPORTUNITY':
        return '💰';
      case 'USAGE_ALERT':
        return '⚠️';
      case 'PAYMENT_REMINDER':
        return '🔔';
      default:
        return '🤖';
    }
  };

  const getSuggestionColor = (type: string) => {
    switch (type) {
      case 'SAVINGS_OPPORTUNITY':
        return 'suggestion-savings';
      case 'USAGE_ALERT':
        return 'suggestion-warning';
      case 'PAYMENT_REMINDER':
        return 'suggestion-info';
      default:
        return '';
    }
  };

  return (
    <div className="ai-suggestions-section">
      <h2 className="section-title">
        <span className="section-icon">🤖</span>
        AI Suggestions
      </h2>
      <div className="suggestions-list">
        {suggestions.map((suggestion, index) => (
          <div
            key={index}
            className={`suggestion-card card ${getSuggestionColor(suggestion.type)}`}
          >
            <div className="suggestion-header">
              <div className="suggestion-icon">
                {getSuggestionIcon(suggestion.type)}
              </div>
              <div className="suggestion-content">
                <div className="suggestion-type">{suggestion.type.replace('_', ' ')}</div>
                <div className="suggestion-message">{suggestion.message}</div>
                {suggestion.potentialSavings && (
                  <div className="suggestion-savings">
                    Potential savings: <strong>${suggestion.potentialSavings.toFixed(3)}/month</strong>
                  </div>
                )}
              </div>
            </div>
            
            {suggestion.subscriptions.length > 0 && (
              <div className="suggestion-subscriptions">
                <div className="suggestion-subscriptions-header">
                  Recommended to cancel:
                </div>
                <div className="suggestion-subscriptions-list">
                  {suggestion.subscriptions.map((sub) => (
                    <div key={sub.id} className="suggestion-subscription-item">
                      <div className="suggestion-sub-info">
                        <span className="suggestion-sub-name">{sub.service}</span>
                        <span className="suggestion-sub-cost">${sub.cost.toFixed(3)}/{sub.frequency}</span>
                      </div>
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => onCancel(sub.id)}
                      >
                        Cancel
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}






















