import e from "express"
import {
    createCampaign,
    fetchCampaignDetails,
    updateCampaign,
    deleteCampaign,
    fetchAllCampaigns,
    fetchCampaignLinks,
    createLinkManual
} from "../controllers/campaign.controller.js"
const router = e.Router()


// @desc    fetch all campaigns
// @route   GET /api/campaigns
router.get("/", fetchAllCampaigns)

// @desc    fetch all links for a campaign
// @route   GET /api/campaigns/:campaign_id/links
// @access  public
router.get("/:campaign_id/links", fetchCampaignLinks)

// @desc    create new campaign
// @route   POST /api/campaigns
router.post("/", createCampaign)

// @desc    manually create new link
// @route   POST /api/campaigns/manual
router.post("/manual", createLinkManual)

// @desc    fetch campaign details
// @route   GET /api/campaigns/:campaign_id
router.get("/:campaign_id", fetchCampaignDetails);

// @desc    update campaign details
// @route   PUT /api/campaigns/:campaign_id
router.put("/:campaign_id", updateCampaign);

// @desc    delete campaign
// @route   DELETE /api/campaigns/:campaign_id
router.delete("/:campaign_id", deleteCampaign);


export default router;