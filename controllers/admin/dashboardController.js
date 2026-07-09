const dashboardService = require("../../services/dashboardService");

async function getDashboard(req, res, next) {
  try {
    const period = req.query.period || 'tudo';
    const stats = await dashboardService.getDashboardStats(period);
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboard };
