import mongoose from "mongoose";
import Project from "../models/project.model.js";
import Campaign from "../models/campaign.model.js";
import Link from "../models/link.model.js";
import Click from "../models/click.model.js"

// @desc    create new project
// @route   POST /api/projects
// @access  public

export const createProject = async (req, res) => {
    const { clientName, description } = req.body;

    try {
        if (!clientName || !description) {
            return res
                .status(400)
                .json({ message: "Invalid credentials: client name or description missing" });
        }

        const project = await Project.create({
            clientName: clientName.trim(),
            description: description.trim(),
        });

        if (!project) {
            console.log("DB error creating new project");
            return res.status(500).json({ message: "Internal server error" });
        } else {
            return res.status(201).json({
                message: "Project creation successful!",
                project,
            });
        }
    } catch (err) {
        console.error("Error creating new project:", err);
        res.status(500).json({ message: "Internal server error" });
    }
};

// @desc     update project details
// @route    PUT /api/projects/:project_id
// @access   public

export const updateProject = async (req, res) => {
    const { clientName, description } = req.body;
    const { project_id } = req.params;

    try {
        if (!project_id) {
            return res.status(400).json({ message: "Invalid credentials: project_id missing" });
        }

        const project = await Project.findById(project_id);

        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        }

        project.clientName = clientName.trim();
        project.description = description.trim();

        const updatedProject = await project.save();

        if (!updatedProject) {
            console.error("DB error while updating project!");
            return res.status(500).json({ message: "Internal server error" });
        } else {
            return res.status(200).json({
                message: "Project updated successfully.",
                project,
            });
        }
    } catch (err) {
        console.error("Error updating project:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// @desc     fetch project details
// @route    GET /api/projects/:project_id
// @access   public

export const fetchProjectDetails = async (req, res) => {
    const { project_id } = req.params;

    try {
        if (!project_id) {
            return res.status(400).json({ message: "Invalid credentials: project_id missing" });
        }

        const project = await Project.findById(project_id);

        if (!project) {
            return res.status(404).json({ message: "Project not found." });
        } else {
            return res.status(200).json({
                project,
            });
        }
    } catch (err) {
        console.error("Error fetching a project's details:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    delete existing project
// @route   DELETE /api/projects/:project_id
// @access  public

export const deleteProject = async (req, res) => {
    const { confirmation } = req.body;
    const { project_id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(project_id)) {
        return res.status(400).json({ message: "Invalid credentials: invalid project_id" });
    }

    if (confirmation !== true) {
        return res.status(400).json({ message: "You must confirm deletion!" });
    }

    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        // Find campaigns under the project
        const campaigns = await Campaign.find({ project: project_id }).session(session);
        const campaignIds = campaigns.map((c) => c._id);

        // Find links under those campaigns
        const links = await Link.find({ campaign: { $in: campaignIds } }).session(session);
        const linkIds = links.map((l) => l._id);

        // Delete clicks for those links
        await Click.deleteMany({ link: { $in: linkIds } }).session(session);

        // Delete links
        await Link.deleteMany({ campaign: { $in: campaignIds } }).session(session);

        // Delete campaigns
        await Campaign.deleteMany({ project: project_id }).session(session);

        // Delete project
        const deletedProject = await Project.findByIdAndDelete(project_id).session(session);

        if (!deletedProject) {
            await session.abortTransaction();
            session.endSession();
            return res.status(404).json({ message: "Project not found" });
        }

        await session.commitTransaction();
        session.endSession();

        return res.status(200).json({
            message: "Project and all related data deleted successfully",
        });
    } catch (err) {
        await session.abortTransaction();
        session.endSession();
        console.error("Error deleting project (Cascade delete failed):", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    fetch all projects
// @route   GET /api/projects/
// @access  public

export const fetchAllProjects = async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });

        if (projects.length === 0) {
            return res.status(404).json({ message: "No projects found." });
        }

        return res.status(200).json({
            message: `${projects.length} projects found.`,
            projects,
        });
    } catch (err) {
        console.error("Error fetching all projects:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

// @desc    fetch all campaigns for a project
// @route   GET /api/projects/:project_id/campaigns
// @access  public

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);

export const fetchProjectCampaigns = async (req, res) => {
    try {
        const { project_id } = req.params;

        if (!isValidId(project_id)) {
            return res.status(400).json({ message: "Invalid credentials: invalid project_id" });
        }

        const campaigns = await Campaign.find({ project: project_id }).sort({ createdAt: -1 }).lean();
        const counts = await Link.aggregate([
            { $match: { project: new mongoose.Types.ObjectId(project_id) } },
            { $group: { _id: "$campaign", count: { $sum: 1 } } },
        ]);
        const countsByCampaign = new Map(counts.map((row) => [String(row._id), row.count]));

        if (campaigns.length === 0) {
            return res.status(404).json({ message: "No campaigns found." });
        }

        return res.status(200).json({
            message: `${campaigns.length} campaigns found for this project.`,
            campaigns: campaigns.map((campaign) => ({ ...campaign, linkCount: countsByCampaign.get(String(campaign._id)) || 0 })),
        });
    } catch (err) {
        console.error("Error fetching project campaigns:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};
