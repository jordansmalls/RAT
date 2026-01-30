import Campaign from "../models/campaign.model.js"
import Project from "../models/project.model.js"
import Link from "../models/link.model.js"
import { generateSlug } from "../utils/generate.slug.js"
import { env } from "../config/env.js"
import mongoose from "mongoose"

// @desc    create new campaign
// @route   POST /api/campaigns
// @access  public
export const createCampaign = async (req, res) => {
    const { project_id, title, url } = req.body;

    try {

        if(!project_id) {
            return res.status(400).json({ message: "Invalid credentials: project_id missing" })
        }
        if (!title) {
            return res.status(400).json({ message: "Invalid credentials: title missing" });
        }
        if (!url) {
            return res.status(400).json({ message: "Invalid credentials: URL missing" });
        }

        const project = await Project.findById(project_id);

        if(!project) {
            return res.status(404).json({ message: "Project not found" })
        }

        const campaign = await Campaign.create({
            project: project_id,
            title: title,
            url: url,
        })

        if(!campaign) {
            console.error("DB error attempting to create campaign!")
            return res.status(500).json({ message: "Internal server error"})
        } else {

            // create a custom link for each platform
            const platforms = [
                "tiktok",
                "twitter",
                "instagram",
                "facebook",
                "threads",
                "reddit",
                "linkedin",
                "twitch",
                "pinterest",
            ];

            for(const platform of platforms) {

                const slug = await generateSlug(4);

                await Link.create({
                    project: campaign.project,
                    campaign: campaign._id,
                    title: platform,
                    platform,
                    slug: slug,
                    destinationUrl: campaign.url,
                    customUrl: `${env.baseUrl}/${slug}`
                })
            }

            // store each link in an object/array/map and return alongside campaign object
            let links = await Link.find({ campaign: campaign._id })


            return res.status(201).json({
                message: "Campaign successfully created!",
                campaign,
                links
            })
        }

    } catch (err) {
       console.error("Error creating new campaign:", err)
       return res.status(500).json({ message: "Internal server error" })
    }
}



// @desc    manually create new link
// @route   POST /api/campaigns/manual
// @access  public

export const createLinkManual = async (req, res) => {
    const { project_id, campaign_id, title  } = req.body;

    try {

        if(!project_id || !campaign_id || !title) {
            return res.status(400).json({ message: "Invalid credentials: missing project_id, campaign_id, or title" })
        }

        const project = await Project.findOne({ _id: project_id })

        if(!project) {
            return res.status(404).json({ message: "Project not found" })
        }

        const campaign = await Campaign.findOne({ _id: campaign_id });

        if (!campaign) {
            return res.status(404).json({ message: "Campaign not found" });
        }

        const slug = await generateSlug(4);

        const link = await Link.create({
            project: campaign.project,
            campaign: campaign._id,
            title: title,
            platform: "other",
            slug: slug,
            destinationUrl: campaign.url,
            customUrl: `${env.baseUrl}/${slug}`,
        });

        if(!link) {
            console.error("DB error attempting to manually create custom link!")
            return res.status(500).json({ message: "Internal server error" })
        } else {
            return res.status(201).json({
                message: `Successfully created the "${link.title}" link.`,
                link
            })
        }

    } catch (err) {
       console.error("Error manually creating extra custom link:", err);
       return res.status(500).json({ message: "Internal server error" })
    }

}

// @desc    fetch campaign details
// @route   GET /api/campaigns/:campaign_id
// @access  public

export const fetchCampaignDetails = async (req, res) => {
    const { campaign_id } = req.params;

    try {

        if(!campaign_id) {
            return res.status(400).json({ message: "Invalid credentials: campaign_id missing" });
        }

        if(!mongoose.Types.ObjectId.isValid(campaign_id)) {
            return res.status(400).json({ message: "Invalid credentials: invalid campaign_id format" })
        }

        const campaign = await Campaign.findById(campaign_id)

        if(!campaign) {
            return res.status(404).json({ message: "Campaign not found."})
        } else {
            return res.status(200).json(campaign)
        }

    } catch (err) {
       console.error("Error fetching campaign details:", err)
       return res.status(500).json({ message: "Internal server error" })
    }
}

// @desc    update campaign details
// @route   PUT /api/campaigns/:campaign_id
// @access  public

export const updateCampaign = async (req, res) => {
    const { campaign_id } = req.params;
    const { title, url } = req.body;

    try {

        if(!campaign_id) {
            return res.status(400).json({ message: "Invalid credentials: campaign_id missing" })
        }

        const campaign = await Campaign.findById(campaign_id)

        if(!campaign) {
            return res.status(404).json({ message: "Campaign not found." })
        }

        campaign.title = title
        campaign.url = url

        await campaign.save()

        return res.status(200).json({
            message: "Campaign updated successfully!",
            campaign,
        });


    } catch (err) {
       console.error("Error updating campaign details:", err);
       return res.status(500).json({ message: "Internal server error" });
    }
}


// @desc    delete campaign
// @route   DELETE /api/campaigns/:campaign_id
// @access  public

export const deleteCampaign = async (req, res) => {
    try {
        const { campaign_id } = req.params;
        const { confirmation } = req.body;

        if (!campaign_id) {
            return res.status(400).json({ message: "Invalid credentials: campaign_id missing" });
        }

        if (confirmation !== true) {
            return res.status(400).json({ message: "Invalid credentials: deletion must be confirmed" });
        }

        const result = await Campaign.deleteOne({ _id: campaign_id });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: "Campaign not found." });
        }

        return res.status(204).send();
    } catch (err) {
        console.error("Error deleting campaign:", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};


// @desc    fetch all campaigns
// @route   GET /api/campaigns
// @access  public

export const fetchAllCampaigns = async (req, res) => {
    try {
        let campaigns = await Campaign.find()

        if(campaigns.length === 0) {
            return res.status(404).json({ message: "No campaigns found." })
        }

          return res.status(200).json({
              message: `${campaigns.length} campaigns found.`,
              campaigns,
          });
    } catch (err) {
       console.error("Error fetching all campaigns:", err);
       return res.status(500).json({ message: "Internal Server Error" });
    }
}


// @desc    fetch all links for a campaign
// @route   GET /api/campaigns/:campaign_id/links
// @access  public



export const fetchCampaignLinks = async (req, res) => {
    const { campaign_id } = req.params;
    try {
        if(!campaign_id) {
            return res.status(400).json({ message: "Invalid credentials: campaign_id missing" })
        }

        let links = await Link.find({ campaign: campaign_id })

        if(!links) {
            return res.status(404).json({ message: "We found no associated links for this campaign" })
        } else {
            return res.status(200).json({
                message: `${links.length} links found for this campaign.`,
                links
            })
        }

    } catch (err) {
        console.error("Error fetching all campaign links:", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
}