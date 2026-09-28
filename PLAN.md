# Project Plan: AI-Powered Personal Expense Tracker

**Group Number:** 18  
**Team Members:**  
1. **Shivani Anil** (Roll No. 51)  
2. **Sreerag C Madhu** (Roll No. 52)  
3. **Sreya N V** (Roll No. 53)  

---

## 1. Project Overview & Architecture

The **AI-Powered Personal Expense Tracker** is a modern web application designed to simplify individual and household financial management. It empowers users to track income and expenses, monitor category-wise spending patterns in real time, visualize monthly cashflows, and leverage **Google Gemini AI** to gain automated, actionable savings advice and financial literacy coaching.

### **Tech Stack**
* **Frontend:** HTML5, CSS3 (Modern Flexbox/Grid, Glassmorphism, CSS Custom Properties), JavaScript (Vanilla ES6+), Chart.js (Interactive visual charts)
* **Backend:** Node.js, Express.js (RESTful API architecture)
* **Database:** MongoDB with Mongoose ODM (with automatic in-memory fallback for immediate zero-config demoing)
* **AI Engine:** Google Gemini API (`@google/genai` SDK using `gemini-2.5-flash`)

```
expense-tracker/
├── .env                    # Environment variables (PORT, MONGODB_URI, GEMINI_API_KEY)
├── .env.example            # Template for environment configuration
├── .gitignore              # Ignored files (node_modules, .env, logs)
├── package.json            # Project dependencies and npm scripts
├── PLAN.md                 # Complete project documentation & specification
├── server.js               # Express application, REST endpoints, and Gemini AI integration
├── models/
│   └── Expense.js          # Mongoose schema for transactions
└── public/
    ├── index.html          # Semantic HTML5 dashboard structure
    ├── style.css           # Premium dashboard styling with dark/light themes & responsiveness
    └── script.js           # Client-side state, API calls, Chart.js graphs, and UI interactions
```

---

## 2. Sustainable Development Goals (SDG) Alignment

* **SDG 8: Decent Work and Economic Growth**  
  * *Target:* Fostering financial resilience, systematic savings habits, emergency buffer accumulation, and personal wealth security.
  * *Application Impact:* The AI Advisor calculates personal savings rates, identifies high-interest debt traps, and recommends systematic savings strategies to improve long-term economic stability.

* **SDG 4: Quality Education**  
  * *Target:* Promoting lifelong learning and practical financial literacy.
  * *Application Impact:* Built-in AI educational masterclasses explain foundational economic concepts (e.g., the 50/30/20 rule, compound interest, emergency funds, and inflation hedging) in simple, accessible language.

* **SDG 12: Responsible Consumption and Production**  
  * *Target:* Encouraging mindful consumer behavior, curbing impulse purchases, and eliminating wasteful personal spending.
  * *Application Impact:* Category audits flag runaway discretionary costs (such as excessive food delivery or unused subscriptions) and encourage sustainable lifestyle budgeting.

---

## 3. Database Schema (`models/Expense.js`)

| Field | Type | Required | Description |
| :--- | :--- | :--- | :--- |
| `title` | `String` | Yes | Description or title of transaction (e.g., "Grocery Run") |
| `amount` | `Number` | Yes | Numeric value in local currency (e.g., ₹450.00) |
| `type` | `String` | Yes | Enum: `'income'` or `'expense'` |
| `category` | `String` | Yes | Classification (e.g., Food, Housing, Utilities, Salary, etc.) |
| `date` | `Date` | Yes | Transaction timestamp (defaults to current date) |
| `notes` | `String` | No | Additional optional notes or context |
| `createdAt` / `updatedAt` | `Date` | Auto | Mongoose automated timestamps |

---

## 4. RESTful API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/status` | System health check (MongoDB connection, AI key status) |
| `GET` | `/api/expenses` | Query transactions with filters (`type`, `category`, `startDate`, `endDate`, `search`) |
| `GET` | `/api/expenses/:id` | Fetch a single transaction by ID |
| `POST` | `/api/expenses` | Add a new transaction (income/expense) |
| `PUT` | `/api/expenses/:id` | Update an existing transaction |
| `DELETE` | `/api/expenses/:id` | Delete a transaction |
| `GET` | `/api/expenses/summary` | Aggregate analytics (totals, balance, savings rate, breakdown, monthly trends) |
| `POST` | `/api/ai/insights` | Run **Google Gemini 2.5 Flash** spending analysis & SDG recommendations |
| `POST` | `/api/ai/chat` | Interactive AI advisor to answer custom financial questions |

---

## 5. Setup & Running Instructions

### Prerequisites
- **Node.js**: v18 or higher (v22+ recommended)
- **MongoDB**: Local MongoDB community service or free MongoDB Atlas cluster URI
- **Google Gemini API Key**: Free key from [Google AI Studio](https://aistudio.google.com/)

### Installation
1. Navigate to the project directory:
   ```bash
   cd expense-tracker
   ```
2. Install npm dependencies:
   ```bash
   npm install
   ```
3. Create and configure your `.env` file:
   ```env
   PORT=3000
   MONGODB_URI=mongodb://localhost:27017/expense-tracker
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Start the server:
   ```bash
   npm start
   # or development mode with auto-reload:
   npm run dev
   ```
5. Open your web browser and navigate to:
   ```
   http://localhost:3000
   ```
