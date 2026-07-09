const express = require("express");
const dashboardController = require("../../controllers/admin/dashboardController");

const router = express.Router();

router.get("/", dashboardController.getDashboard);

module.exports = router;
