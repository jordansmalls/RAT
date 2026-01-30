import e from "express";
import {
    createProject,
    updateProject,
    fetchProjectDetails,
    deleteProject,
    fetchAllProjects,
    fetchProjectCampaigns,
} from "../controllers/project.controller.js";

const router = e.Router();

// @desc    create new project
// @route   POST /api/projects
router.post("/", createProject);

// @desc    fetch all projects
// @route   GET /api/projects
router.get("/", fetchAllProjects);

// @desc    fetch all campaigns for a project
// @route   GET /api/projects/:project_id/campaigns
router.get("/:project_id/campaigns", fetchProjectCampaigns);

// @desc     fetch project details
// @route    GET /api/projects/:project_id
router.get("/:project_id", fetchProjectDetails);

// @desc     update project details
// @route    PUT /api/projects/:project_id
router.put("/:project_id", updateProject);

// @desc    delete existing project
// @route   DELETE /api/projects/:project_id
router.delete("/:project_id", deleteProject);

export default router;
