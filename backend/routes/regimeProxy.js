const express = require('express');
const router  = express.Router();
// Stub — regime analysis now handled client-side in RegimeAnalysisPage.jsx
router.all('*', (req, res) => res.json({ message: 'Regime analysis is handled client-side.' }));
module.exports = router;
