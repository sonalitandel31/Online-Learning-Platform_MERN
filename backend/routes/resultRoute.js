const express = require("express");
const router = express.Router();
const resultCtrl = require("../controller/resultController");

router.post("/", resultCtrl.createResult);
router.get("/:id", resultCtrl.getResultById);

module.exports = router;
