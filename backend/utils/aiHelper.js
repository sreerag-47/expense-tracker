const { GoogleGenAI } = require('@google/genai');

const getApiKey = () => {
  return (process.env.GEMINI_API_KEY || '').trim();
};

const getGeminiClient = () => {
  const key = getApiKey();
  if (!key || key === 'your_gemini_api_key_here' || key === '') {
    return null;
  }
  try {
    return new GoogleGenAI({ apiKey: key });
  } catch (err) {
    console.error('Failed to init GoogleGenAI:', err);
    return null;
  }
};

/**
 * Generate spending insights using Gemini 2.5 Flash if available,
 * with seamless fallback to rule-based anomaly detection.
 */
const generateInsights = async ({ transactions, user, budgets }) => {
  if (!transactions || transactions.length === 0) {
    return {
      isLiveAI: false,
      insights: ['Start logging transactions to receive personalized AI insights!'],
      sdgTips: {
        sdg8: 'SDG 8: Aim to save at least 20% of your inflow into an emergency fund.',
        sdg4: 'SDG 4: Practice the 50/30/20 budgeting rule (Needs / Wants / Savings).',
        sdg12: 'SDG 12: Review recurring subscriptions to eliminate wasteful expenditures.',
      },
    };
  }

  const totalIncome = transactions
    .filter((t) => t.type === 'income')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const totalExpense = transactions
    .filter((t) => t.type === 'expense')
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

  const categoryTotals = {};
  transactions.forEach((t) => {
    if (t.type === 'expense') {
      categoryTotals[t.category] = (categoryTotals[t.category] || 0) + Number(t.amount || 0);
    }
  });

  // Calculate Heuristic / Rule-based Anomaly Insights
  const ruleInsights = [];
  for (const [cat, amt] of Object.entries(categoryTotals)) {
    if (totalExpense > 0 && amt > totalExpense * 0.4) {
      const pct = Math.round((amt / totalExpense) * 100);
      ruleInsights.push(
        `High spending alert: ${pct}% of your total outflow is spent on "${cat}". Consider reviewing non-essential purchases (SDG 12).`
      );
    }
  }

  const savingsRate = totalIncome > 0 ? (((totalIncome - totalExpense) / totalIncome) * 100).toFixed(1) : 0;

  if (totalExpense > 1000) {
    ruleInsights.push(
      'Your spending is higher than average this month. We recommend setting a 15-20% automatic savings goal (SDG 8).'
    );
  } else {
    ruleInsights.push(
      'Great job! You are maintaining a healthy spending margin. Keep allocating surplus to your reserve goals!'
    );
  }

  if (savingsRate >= 20) {
    ruleInsights.push(`Healthy savings rate detected: ${savingsRate}%. You are exceeding the SDG 8 resilience benchmark.`);
  }

  const ai = getGeminiClient();

  if (!ai) {
    return {
      isLiveAI: false,
      hasApiKey: false,
      insights: ruleInsights,
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        savingsRate: Number(savingsRate),
      },
      message: 'Rule-based anomaly engine active. To activate live Gemini 2.5 Flash analysis, set GEMINI_API_KEY in backend/.env.',
    };
  }

  // Live Gemini 2.5 Flash query
  try {
    const topCats = Object.entries(categoryTotals)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 4)
      .map(([c, a]) => `${c}: $${a}`)
      .join(', ');

    const prompt = `You are an AI financial planner integrated into the SpendWise Personal Expense Tracker (Group 18: Shivani Anil, Sreerag C Madhu, Sreya N V).
UN Sustainable Development Goals (SDG):
- SDG 8: Decent Work & Economic Growth
- SDG 4: Quality Education (Financial Literacy)
- SDG 12: Responsible Consumption & Production

User Profile: ${user.name || 'User'}
Financial Profile:
- Total Inflow: $${totalIncome}
- Total Outflow: $${totalExpense}
- Net Balance: $${totalIncome - totalExpense}
- Current Savings Rate: ${savingsRate}%
- Top Expense Categories: ${topCats || 'None'}
- Total Logged Transactions: ${transactions.length}

Generate an insightful, empowering, and concise financial advisory report formatted with clean Markdown bullet points.
Include:
1. 🩺 Financial Health Evaluation & Anomaly Check (highlight if any category exceeds 40% of outflow)
2. ⚠️ Wasteful Personal Spending Warning (SDG 12)
3. 📚 Financial Literacy Masterclass Tip (SDG 4: 50/30/20 rule or emergency cushion)
4. 🚀 Actionable Savings Targets (SDG 8: 2 concrete steps)`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return {
      isLiveAI: true,
      hasApiKey: true,
      insights: response.text ? [response.text] : ruleInsights,
      rawMarkdown: response.text || '',
      summary: {
        totalIncome,
        totalExpense,
        balance: totalIncome - totalExpense,
        savingsRate: Number(savingsRate),
      },
    };
  } catch (err) {
    console.error('Gemini API Error:', err.message);
    return {
      isLiveAI: false,
      hasApiKey: true,
      insights: ruleInsights,
      error: `Gemini API error (${err.message}). Defaulting to rule-based anomaly detection.`,
    };
  }
};

/**
 * Interactive Advisor Q&A
 */
const askGeminiAdvisor = async ({ question, user, transactions }) => {
  const ai = getGeminiClient();

  if (!ai) {
    return {
      isLiveAI: false,
      reply: `> **Notice:** Google Gemini API key is not configured.
      
To answer your question: "${question}"
- Establish an emergency cushion of 3-6 months of expenses (SDG 8).
- Allocate your net income using the 50/30/20 budgeting rule (SDG 4).
- Curb recurring micro-expenses and food deliveries (SDG 12).
- Configure your GEMINI_API_KEY in backend/.env to unlock real-time personalized AI answers!`,
    };
  }

  try {
    const totalIncome = (transactions || [])
      .filter((t) => t.type === 'income')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpense = (transactions || [])
      .filter((t) => t.type === 'expense')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const prompt = `You are the private AI financial advisor for ${user.name || 'User'} on SpendWise AI (Group 18).
Financial Snapshot:
- Inflow: $${totalIncome}
- Outflow: $${totalExpense}
- Net Balance: $${totalIncome - totalExpense}

Question: "${question}"

Provide a concise, practical, highly encouraging answer adhering to UN SDG 4, 8, and 12 principles. Use clean Markdown.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return {
      isLiveAI: true,
      reply: response.text || 'No response generated.',
    };
  } catch (err) {
    return {
      isLiveAI: false,
      reply: `Gemini API Error: ${err.message}. Please check your API key.`,
    };
  }
};

module.exports = {
  getApiKey,
  generateInsights,
  askGeminiAdvisor,
};
