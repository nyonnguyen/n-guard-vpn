const express = require("express");
const router = express.Router();
const githubService = require("../services/githubService");
const config = require("../utils/config");

/**
 * Home page - redirect to about
 */
router.get("/", (req, res) => {
  res.redirect("/about");
});

/**
 * About page
 */
router.get("/about", async (req, res, next) => {
  try {
    const version = await githubService.getCurrentVersion();

    res.render("about", {
      title: "About - N-Guard VPN",
      version,
      repo: config.github.repo
    });
  } catch (error) {
    next(error);
  }
});

/**
 * Update page
 */
router.get("/update", async (req, res, next) => {
  try {
    const version = await githubService.getCurrentVersion();

    res.render("update", {
      title: "Update - N-Guard VPN",
      version,
      repo: config.github.repo
    });
  } catch (error) {
    next(error);
  }
});

/**
 * System status page
 */
router.get("/status", async (req, res, next) => {
  try {
    const version = await githubService.getCurrentVersion();

    res.render("status", {
      title: "System Status - N-Guard VPN",
      version,
      repo: config.github.repo
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
