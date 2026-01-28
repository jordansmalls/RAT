import Project from "../models/project.model.js"

// @desc    create new project
// @route   POST /api/projects
// @access  public

export const createProject = async (req, res) => {
    const { clientName, description } = req.body;

    try {

        if(!clientName || !description) {
            return res.status(400).json({ message: "Invalid credentials: client name or description missing"})
        }

        const project = await Project.create({
            clientName: clientName.trim(),
            description: description.trim(),
        })

        if(!project) {
            console.log("DB error creating new project")
            return res.status(500).json({ message: "Internal server error"})
        } else {
            return res.status(201).json({
                message: "Project creation successful!",
                project
            })
        }
    } catch (err) {
       console.error("Error creating new project:", err);
       res.status(500).json({ message: "Internal server error" })
    }
}


// @desc     update project details
// @route    PUT /api/projects/:project_id
// @access   public

export const updateProject = async (req, res) => {
    const { clientName, description } = req.body;
    const { project_id } = req.params;

    try {

        if (!project_id) {
            return res.status(400).json({ message: "Invalid credentials: project_id missing" });
        };

        const project = await Project.findById(project_id);

        if(!project) {
            return res.status(404).json({ message: "Project not found." });
        };

        project.clientName = clientName.trim();
        project.description = description.trim();

        const updatedProject = await project.save();

        if(!updatedProject) {
            console.error("DB error while updating project!")
            return res.status(500).json({ message: "Internal server error" })
        } else {
            return res.status(200).json({
                message: "Project updated successfully.",
                project
            })
        }


    } catch (err) {
       console.error("Error updating project:", err)
       return res.status(500).json({ message: "Internal server error" })
    }
}



// @desc     fetch project details
// @route    GET /api/projects/:project_id
// @access   public

export const fetchProjectDetails = async (req, res) => {
    const { project_id } = req.params;

    try {
        if(!project_id) {
            return res.status(400).json({ message: "Invalid credentials: project_id missing"})
        };

        const project = await Project.findById(project_id);

        if(!project) {
            return res.status(404).json({ message: "Project not found." })
        } else {
            return res.status(200).json({
                project
            })
        }
    } catch (err) {
       console.error("Error fetching a project's details:", err);
       return res.status(500).json({ message: "Internal server error" });
    }
}



// @desc    delete existing project
// @route   DELETE /api/projects/:project_id
// @access  public (public for dev environments only)

export const deleteProject = async (req, res) => {
    const { confirmation } = req.body;
    const { project_id } = req.params;

    try {

        if (!project_id || !confirmation) {
            return res
                .status(401)
                .json({ message: "Invalid credentials: project_id or confirmation misisng" });
        }

        if(confirmation === true ) {
            const result = await Project.deleteOne({ _id: project_id });

            if(result.deletedCount === 0) {
                return res.status(404).json({ message: "Project not found." });
            }
            return res.status(204).send()
        } else {
            return res.status(400).json({ message: "Invalid credentials: must confirm project deletion" })
        }
    } catch (err) {
        console.error("Error deleting a project:", err)
        return res.status(500).json({ message: "Internal server error" })
    }
}