import e from "express";
const router = e.Router();
import { handleRedirect } from "../controllers/redirect.controller.js";

//  @desc    handle short link redirect + analytics tracking
//  @route   GET /:slug
router.get("/:slug", handleRedirect);

export default router;
