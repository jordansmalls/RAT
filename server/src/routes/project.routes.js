import e from "express";
import {
    createProject,
    updateProject,
    fetchProjectDetails,
    deleteProject,
} from "../controllers/project.controller.js";

const router = e.Router();

// @desc    create new project
// @route   POST /api/projects
router.post("/", createProject);

// @desc     update project details
// @route    PUT /api/projects/:project_id
router.put("/:project_id", updateProject);

// @desc     fetch project details
// @route    GET /api/projects/:project_id
router.get("/:project_id", fetchProjectDetails);

// @desc    delete existing project
// @route   DELETE /api/projects/:project_id
router.delete("/:project_id", deleteProject);

export default router;
