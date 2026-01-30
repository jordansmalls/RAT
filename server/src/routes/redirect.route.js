import e from "express"
const router = e.Router()
import { handleRedirect } from "../controllers/redirect.controller.js"


router.get("/:slug", handleRedirect)

export default router;