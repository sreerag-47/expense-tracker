const express = require('express');
const router = express.Router();
const {
  getSpendingInsights,
  askAdvisor,
  getApiKeyStatus,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/insights').get(getSpendingInsights).post(getSpendingInsights);
router.post('/chat', askAdvisor);
router.get('/apikey', getApiKeyStatus);

module.exports = router;
