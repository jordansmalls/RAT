// import Click from "../models/click.model.js";
// import Campaign from "../models/campaign.model.js";
// import Project from "../models/project.model.js";

// /**
//  * @desc Get human confidence percentage (non-bot clicks)
//  * @route GET /api/analytics/project/:projectId/human-confidence
//  * @access Private
//  */
// export const getHumanConfidence = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $group: {
//                     _id: null,
//                     total: { $sum: 1 },
//                     human: { $sum: { $cond: [{ $eq: ["$isBot", false] }, 1, 0] } },
//                 },
//             },
//         ]);

//         if (result.length === 0) {
//             return res.json({ message: "Human confidence calculated", confidence: 0 });
//         }

//         const confidence = (result[0].human / result[0].total) * 100;
//         return res.json({
//             message: "Human confidence calculated",
//             confidence: Number(confidence.toFixed(1)),
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Export clicks data in JSON or CSV format
//  * @route GET /api/analytics/project/:projectId/export
//  * @access Private
//  */
// export const downloadClicks = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         const { format = "json" } = req.query;

//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         if (!["json", "csv"].includes(format)) {
//             return res.status(400).json({ message: "Format must be 'json' or 'csv'" });
//         }

//         const clicks = await Click.find({ project: projectId }).lean();

//         if (format === "csv") {
//             const headers = [
//                 "_id",
//                 "link",
//                 "campaign",
//                 "project",
//                 "clickedAt",
//                 "dayOfWeek",
//                 "hourOfDay",
//                 "geoCountry",
//                 "deviceType",
//                 "ip",
//                 "isBot",
//             ];
//             const rows = clicks.map((c) => [
//                 c._id,
//                 c.link,
//                 c.campaign,
//                 c.project,
//                 c.clickedAt,
//                 c.dayOfWeek,
//                 c.hourOfDay,
//                 c.geo?.country || "",
//                 c.device?.type || "",
//                 c.ip,
//                 c.isBot,
//             ]);
//             const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");

//             res.setHeader("Content-Type", "text/csv");
//             res.setHeader("Content-Disposition", `attachment; filename="clicks-${projectId}.csv"`);
//             return res.send(csv);
//         }

//         res.setHeader("Content-Type", "application/json");
//         res.setHeader("Content-Disposition", `attachment; filename="clicks-${projectId}.json"`);
//         return res.send(JSON.stringify(clicks, null, 2));
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get click counts per platform
//  * @route GET /api/analytics/project/:projectId/clicks-per-platform
//  * @access Private
//  */
// export const getClicksPerPlatform = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $lookup: {
//                     from: "links",
//                     localField: "link",
//                     foreignField: "_id",
//                     as: "linkDoc",
//                 },
//             },
//             { $unwind: "$linkDoc" },
//             {
//                 $group: {
//                     _id: "$linkDoc.platform",
//                     count: { $sum: 1 },
//                 },
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     platform: "$_id",
//                     count: 1,
//                 },
//             },
//         ]);

//         return res.json({ message: "Clicks per platform retrieved", data: result });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get global reach by country
//  * @route GET /api/analytics/project/:projectId/global-reach
//  * @access Private
//  */
// export const getGlobalReach = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $group: {
//                     _id: "$geo.country",
//                     count: { $sum: 1 },
//                 },
//             },
//             { $sort: { count: -1 } },
//             { $limit: 50 },
//             {
//                 $project: {
//                     _id: 0,
//                     country: "$_id",
//                     count: 1,
//                 },
//             },
//         ]);

//         return res.json({ message: "Global reach retrieved", data: result });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get platform efficiency (unique IPs / total clicks)
//  * @route GET /api/analytics/project/:projectId/efficiency
//  * @access Private
//  */
// export const getPlatformEfficiency = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $lookup: {
//                     from: "links",
//                     localField: "link",
//                     foreignField: "_id",
//                     as: "linkDoc",
//                 },
//             },
//             { $unwind: "$linkDoc" },
//             {
//                 $group: {
//                     _id: "$linkDoc.platform",
//                     totalClicks: { $sum: 1 },
//                     uniqueIPs: { $addToSet: "$ip" },
//                 },
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     platform: "$_id",
//                     intent: {
//                         $round: [{ $divide: [{ $size: "$uniqueIPs" }, "$totalClicks"] }, 2],
//                     },
//                 },
//             },
//         ]);

//         return res.json({ message: "Platform efficiency retrieved", data: result });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get heatmap data by day of week and hour of day
//  * @route GET /api/analytics/project/:projectId/heatmap
//  * @access Private
//  */
// export const getGoldenHour = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $group: {
//                     _id: { day: "$dayOfWeek", hour: "$hourOfDay" },
//                     clicks: { $sum: 1 },
//                 },
//             },
//             {
//                 $project: {
//                     _id: 0,
//                     day: "$_id.day",
//                     hour: "$_id.hour",
//                     clicks: 1,
//                 },
//             },
//         ]);

//         return res.json({ message: "Heatmap retrieved", heatmap: result });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get loyalty metrics (unique IPs vs total clicks)
//  * @route GET /api/analytics/project/:projectId/loyalty
//  * @access Private
//  */
// export const getLoyalty = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $group: {
//                     _id: null,
//                     totalClicks: { $sum: 1 },
//                     uniqueIPs: { $addToSet: "$ip" },
//                 },
//             },
//         ]);

//         if (result.length === 0) {
//             return res.json({
//                 message: "Loyalty metrics calculated",
//                 uniqueIPs: 0,
//                 totalClicks: 0,
//                 ratio: 0,
//             });
//         }

//         const uniqueIPs = result[0].uniqueIPs.length;
//         const totalClicks = result[0].totalClicks;
//         const ratio = Number((uniqueIPs / totalClicks).toFixed(2));

//         return res.json({
//             message: "Loyalty metrics calculated",
//             uniqueIPs,
//             totalClicks,
//             ratio,
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get device breakdown percentages
//  * @route GET /api/analytics/project/:projectId/device-breakdown
//  * @access Private
//  */
// export const getDeviceBreakdown = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $group: {
//                     _id: "$device.type",
//                     count: { $sum: 1 },
//                 },
//             },
//         ]);

//         const total = result.reduce((sum, r) => sum + r.count, 0);
//         if (total === 0) {
//             return res.json({
//                 message: "Device breakdown calculated",
//                 mobile: 0,
//                 tablet: 0,
//                 desktop: 0,
//             });
//         }

//         const breakdown = { mobile: 0, tablet: 0, desktop: 0 };
//         for (const item of result) {
//             const type = item._id?.toLowerCase();
//             if (type === "mobile") breakdown.mobile = (item.count / total) * 100;
//             else if (type === "tablet") breakdown.tablet = (item.count / total) * 100;
//             else if (type === "desktop") breakdown.desktop = (item.count / total) * 100;
//         }

//         return res.json({
//             message: "Device breakdown calculated",
//             mobile: Number(breakdown.mobile.toFixed(1)),
//             tablet: Number(breakdown.tablet.toFixed(1)),
//             desktop: Number(breakdown.desktop.toFixed(1)),
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get recent activity (last 10 clicks)
//  * @route GET /api/analytics/project/:projectId/recent-activity
//  * @access Private
//  */
// export const getRecentActivity = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const clicks = await Click.find({ project: projectId })
//             .sort({ clickedAt: -1 })
//             .limit(10)
//             .populate({
//                 path: "link",
//                 select: "platform",
//             })
//             .lean();

//         const result = clicks.map((c) => ({
//             country: c.geo?.country || null,
//             platform: c.link?.platform || null,
//             clickedAt: c.clickedAt,
//         }));

//         return res.json({ message: "Recent activity retrieved", data: result });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get platform dominance (percentage share)
//  * @route GET /api/analytics/project/:projectId/platform-dominance
//  * @access Private
//  */
// export const getPlatformDominance = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $lookup: {
//                     from: "links",
//                     localField: "link",
//                     foreignField: "_id",
//                     as: "linkDoc",
//                 },
//             },
//             { $unwind: "$linkDoc" },
//             {
//                 $group: {
//                     _id: "$linkDoc.platform",
//                     count: { $sum: 1 },
//                 },
//             },
//         ]);

//         const total = result.reduce((sum, r) => sum + r.count, 0);
//         if (total === 0) {
//             return res.json({ message: "Platform dominance calculated", data: [] });
//         }

//         const dominance = result.map((r) => ({
//             platform: r._id,
//             share: Number(((r.count / total) * 100).toFixed(1)),
//         }));

//         return res.json({ message: "Platform dominance calculated", data: dominance });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get network effect metrics
//  * @route GET /api/analytics/project/:projectId/network-effect
//  * @access Private
//  */
// export const getNetworkEffect = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $group: {
//                     _id: null,
//                     totalClicks: { $sum: 1 },
//                     uniqueVisitors: { $addToSet: "$ip" },
//                 },
//             },
//         ]);

//         if (result.length === 0) {
//             return res.json({
//                 message: "Network effect calculated",
//                 totalClicks: 0,
//                 uniqueVisitors: 0,
//                 ratio: 0,
//             });
//         }

//         const totalClicks = result[0].totalClicks;
//         const uniqueVisitors = result[0].uniqueVisitors.length;
//         const ratio = Number((totalClicks / uniqueVisitors).toFixed(2));

//         return res.json({
//             message: "Network effect calculated",
//             totalClicks,
//             uniqueVisitors,
//             ratio,
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get velocity (growth comparison of last 30 days vs previous 30 days)
//  * @route GET /api/analytics/project/:projectId/velocity
//  * @access Private
//  */
// export const getVelocity = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const now = new Date();
//         const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
//         const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $facet: {
//                     last30: [
//                         { $match: { clickedAt: { $gte: thirtyDaysAgo } } },
//                         { $count: "count" },
//                     ],
//                     prev30: [
//                         {
//                             $match: {
//                                 clickedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
//                             },
//                         },
//                         { $count: "count" },
//                     ],
//                 },
//             },
//         ]);

//         const last30 = result[0].last30[0]?.count || 0;
//         const prev30 = result[0].prev30[0]?.count || 0;

//         let growth = 0;
//         if (prev30 === 0) {
//             growth = last30 > 0 ? 100 : 0;
//         } else {
//             growth = ((last30 - prev30) / prev30) * 100;
//         }

//         return res.json({
//             message: "Velocity calculated",
//             growth: Number(growth.toFixed(1)),
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get hero campaign (campaign with most clicks)
//  * @route GET /api/analytics/project/:projectId/hero-campaign
//  * @access Private
//  */
// export const getHeroCampaign = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         const result = await Click.aggregate([
//             { $match: { project: projectId } },
//             {
//                 $group: {
//                     _id: "$campaign",
//                     clickCount: { $sum: 1 },
//                 },
//             },
//             { $sort: { clickCount: -1 } },
//             { $limit: 1 },
//         ]);

//         if (result.length === 0) {
//             return res.status(404).json({ message: "No campaigns found" });
//         }

//         const campaign = await Campaign.findById(result[0]._id).lean();
//         if (!campaign) {
//             return res.status(404).json({ message: "Campaign not found" });
//         }

//         return res.json({
//             message: "Hero campaign retrieved",
//             campaignId: campaign._id,
//             title: campaign.title,
//             clickCount: result[0].clickCount,
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

// /**
//  * @desc Get monthly health report (aggregates multiple metrics)
//  * @route GET /api/analytics/project/:projectId/monthly-health
//  * @access Private
//  */
// export const getMonthlyHealth = async (req, res) => {
//     try {
//         const { projectId } = req.params;
//         if (!projectId) {
//             return res.status(400).json({ message: "Project ID is required" });
//         }

//         // Create mock req/res objects for internal calls
//         const createMockRes = () => {
//             let statusCode = 200;
//             let jsonData = null;
//             return {
//                 status: (code) => {
//                     statusCode = code;
//                     return {
//                         json: (data) => {
//                             jsonData = data;
//                             return { statusCode, data };
//                         },
//                     };
//                 },
//                 json: (data) => {
//                     jsonData = data;
//                     return { statusCode, data };
//                 },
//                 getData: () => jsonData,
//                 getStatus: () => statusCode,
//             };
//         };

//         // Execute all four metrics in parallel
//         const [networkEffectRes, dominanceRes, velocityRes, heroCampaignRes] = await Promise.all([
//             (async () => {
//                 const mockReq = { params: { projectId } };
//                 const mockRes = createMockRes();
//                 await getNetworkEffect(mockReq, mockRes);
//                 return mockRes.getData();
//             })(),
//             (async () => {
//                 const mockReq = { params: { projectId } };
//                 const mockRes = createMockRes();
//                 await getPlatformDominance(mockReq, mockRes);
//                 return mockRes.getData();
//             })(),
//             (async () => {
//                 const mockReq = { params: { projectId } };
//                 const mockRes = createMockRes();
//                 await getVelocity(mockReq, mockRes);
//                 return mockRes.getData();
//             })(),
//             (async () => {
//                 const mockReq = { params: { projectId } };
//                 const mockRes = createMockRes();
//                 await getHeroCampaign(mockReq, mockRes);
//                 return mockRes.getData();
//             })(),
//         ]);

//         // Check if any call failed
//         if (networkEffectRes.message === "Internal server error") {
//             throw new Error("Network effect calculation failed");
//         }
//         if (dominanceRes.message === "Internal server error") {
//             throw new Error("Platform dominance calculation failed");
//         }
//         if (velocityRes.message === "Internal server error") {
//             throw new Error("Velocity calculation failed");
//         }
//         if (heroCampaignRes.message === "Internal server error") {
//             throw new Error("Hero campaign calculation failed");
//         }

//         return res.json({
//             message: "Monthly health report generated",
//             networkEffect: {
//                 totalClicks: networkEffectRes.totalClicks,
//                 uniqueVisitors: networkEffectRes.uniqueVisitors,
//                 ratio: networkEffectRes.ratio,
//             },
//             dominance: dominanceRes.data,
//             velocity: { growth: velocityRes.growth },
//             heroCampaign: heroCampaignRes.campaignId
//                 ? {
//                       campaignId: heroCampaignRes.campaignId,
//                       title: heroCampaignRes.title,
//                       clickCount: heroCampaignRes.clickCount,
//                   }
//                 : null,
//         });
//     } catch (error) {
//         console.error(error);
//         return res.status(500).json({ message: "Internal server error" });
//     }
// };

//TODO: later add time based stats (clicks today, this week, etc.)

import Click from "../models/click.model.js";
import Campaign from "../models/campaign.model.js";
import Link from "../models/link.model.js";
import mongoose from "mongoose";

const getClickMatch = (projectId, linkId) => {
    if (!mongoose.isValidObjectId(projectId) || (linkId && !mongoose.isValidObjectId(linkId))) {
        return null;
    }

    return {
        project: new mongoose.Types.ObjectId(projectId),
        ...(linkId && { link: new mongoose.Types.ObjectId(linkId) }),
    };
};

/**
 * @desc    Get human confidence percentage
 * @route   GET /api/analytics/project/:projectId/human-confidence
 * @access  Private
 */
export const getHumanConfidence = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const total = await Click.countDocuments({ project: projectId });

        if (total === 0) {
            return res.status(200).json({ message: "Human confidence calculated", confidence: 0 });
        }

        const humanClicks = await Click.countDocuments({
            project: projectId,
            isBot: false,
        });

        const confidence = (humanClicks / total);

        return res.status(200).json({
            message: "Human confidence calculated",
            confidence: parseFloat(confidence.toFixed(1)),
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Download clicks as JSON or CSV
 * @route   GET /api/analytics/project/:projectId/export
 * @access  Private
 */
export const downloadClicks = async (req, res) => {
    try {
        const { projectId } = req.params;
        const { format = "json" } = req.query;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        if (!["json", "csv"].includes(format)) {
            return res.status(400).json({ message: "Format must be json or csv" });
        }

        const clicks = await Click.find({ project: projectId }).lean();

        if (format === "json") {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", `attachment; filename="clicks-${projectId}.json"`);
            return res.send(JSON.stringify(clicks, null, 2));
        }

        if (format === "csv") {
            let csv = "";
            if (clicks.length > 0) {
                const flattenObject = (obj, prefix = "") => {
                    let result = {};
                    for (const key in obj) {
                        if (
                            obj[key] !== null &&
                            typeof obj[key] === "object" &&
                            !Array.isArray(obj[key]) &&
                            !(obj[key] instanceof Date)
                        ) {
                            Object.assign(result, flattenObject(obj[key], `${prefix}${key}.`));
                        } else {
                            result[`${prefix}${key}`] = obj[key];
                        }
                    }
                    return result;
                };

                const flatClicks = clicks.map((click) => flattenObject(click));
                const headers = [...new Set(flatClicks.flatMap((obj) => Object.keys(obj)))];
                csv += headers.join(",") + "\n";

                for (const click of flatClicks) {
                    const values = headers.map((header) => {
                        const value = click[header];
                        if (value === null || value === undefined) return "";
                        const stringValue = String(value).replace(/"/g, '""');
                        return `"${stringValue}"`;
                    });
                    csv += values.join(",") + "\n";
                }
            }

            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename="clicks-${projectId}.csv"`);
            return res.send(csv);
        }
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get clicks per platform
 * @route   GET /api/analytics/project/:projectId/clicks-per-platform
 * @access  Private
 */
export const getClicksPerPlatform = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const result = await Click.aggregate([
            { $match: { project: projectId } },
            {
                $lookup: {
                    from: "links",
                    localField: "link",
                    foreignField: "_id",
                    as: "linkData",
                },
            },
            { $unwind: { path: "$linkData", preserveNullAndEmptyArrays: false } },
            {
                $group: {
                    _id: "$linkData.platform",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    platform: "$_id",
                    count: 1,
                },
            },
        ]);

        return res.status(200).json({ message: "Clicks per platform retrieved", data: result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get global reach by country
 * @route   GET /api/analytics/project/:projectId/global-reach
 * @access  Private
 */
export const getGlobalReach = async (req, res) => {
    try {
        const { projectId } = req.params;
        const match = getClickMatch(projectId, req.query.linkId);

        if (!match) {
            return res.status(400).json({ message: "A valid project ID is required" });
        }

        const result = await Click.aggregate([
            { $match: match },
            {
                $group: {
                    _id: "$geo.country",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    country: "$_id",
                    count: 1,
                },
            },
            { $sort: { count: -1 } },
            { $limit: 50 },
        ]);

        return res.status(200).json({ message: "Global reach retrieved", data: result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get platform efficiency (intent ratio)
 * @route   GET /api/analytics/project/:projectId/efficiency
 * @access  Private
 */
export const getPlatformEfficiency = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const result = await Click.aggregate([
            { $match: { project: projectId } },
            {
                $lookup: {
                    from: "links",
                    localField: "link",
                    foreignField: "_id",
                    as: "linkData",
                },
            },
            { $unwind: { path: "$linkData", preserveNullAndEmptyArrays: false } },
            {
                $group: {
                    _id: "$linkData.platform",
                    totalClicks: { $sum: 1 },
                    uniqueIPs: { $addToSet: "$ip" },
                },
            },
            {
                $project: {
                    _id: 0,
                    platform: "$_id",
                    intent: {
                        $cond: {
                            if: { $eq: ["$totalClicks", 0] },
                            then: 0,
                            else: { $divide: [{ $size: "$uniqueIPs" }, "$totalClicks"] },
                        },
                    },
                },
            },
        ]);

        const formatted = result.map((item) => ({
            platform: item.platform,
            intent: parseFloat(item.intent.toFixed(2)),
        }));

        return res.status(200).json({ message: "Platform efficiency retrieved", data: formatted });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get golden hour heatmap
 * @route   GET /api/analytics/project/:projectId/heatmap
 * @access  Private
 */
export const getGoldenHour = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const result = await Click.aggregate([
            { $match: { project: projectId } },
            {
                $group: {
                    _id: { day: "$dayOfWeek", hour: "$hourOfDay" },
                    clicks: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    day: "$_id.day",
                    hour: "$_id.hour",
                    clicks: 1,
                },
            },
        ]);

        return res.status(200).json({ message: "Heatmap retrieved", heatmap: result });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get loyalty metrics
 * @route   GET /api/analytics/project/:projectId/loyalty
 * @access  Private
 */
export const getLoyalty = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const totalClicks = await Click.countDocuments({ project: projectId });
        const uniqueIPs = await Click.distinct("ip", { project: projectId });
        const uniqueIPsCount = uniqueIPs.length;

        const ratio = totalClicks > 0 ? parseFloat((uniqueIPsCount / totalClicks).toFixed(2)) : 0;

        return res.status(200).json({
            message: "Loyalty metrics retrieved",
            uniqueIPs: uniqueIPsCount,
            totalClicks,
            ratio,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get device breakdown
 * @route   GET /api/analytics/project/:projectId/device-breakdown
 * @access  Private
 */
export const getDeviceBreakdown = async (req, res) => {
    try {
        const { projectId } = req.params;
        const match = getClickMatch(projectId, req.query.linkId);

        if (!match) {
            return res.status(400).json({ message: "A valid project ID is required" });
        }

        const total = await Click.countDocuments(match);

        if (total === 0) {
            return res
                .status(200)
                .json({ message: "Device breakdown retrieved", mobile: 0, tablet: 0, desktop: 0 });
        }

        const mobileCount = await Click.countDocuments({
            ...match,
            "device.type": "mobile",
        });
        const tabletCount = await Click.countDocuments({
            ...match,
            "device.type": "tablet",
        });
        const desktopCount = await Click.countDocuments({
            ...match,
            "device.type": "desktop",
        });

        // The dashboard uses these values as chart values and to calculate the
        // total click count, so return counts rather than percentages. Recharts
        // calculates the slice proportions from the counts automatically.
        return res.status(200).json({
            message: "Device breakdown retrieved",
            mobile: mobileCount,
            tablet: tabletCount,
            desktop: desktopCount,
            total,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get recent activity
 * @route   GET /api/analytics/project/:projectId/recent-activity
 * @access  Private
 */
export const getRecentActivity = async (req, res) => {
    try {
        const { projectId } = req.params;
        const match = getClickMatch(projectId, req.query.linkId);

        if (!match) {
            return res.status(400).json({ message: "A valid project ID is required" });
        }

        const clicks = await Click.aggregate([
            { $match: match },
            { $sort: { clickedAt: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: "links",
                    localField: "link",
                    foreignField: "_id",
                    as: "linkData",
                },
            },
            { $unwind: { path: "$linkData", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    _id: 0,
                    geo: 1,
                    device: 1,
                    browser: 1,
                    os: 1,
                    platform: "$linkData.platform",
                    clickedAt: 1,
                },
            },
        ]);

        return res.status(200).json({ message: "Recent activity retrieved", data: clicks });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get platform dominance
 * @route   GET /api/analytics/project/:projectId/platform-dominance
 * @access  Private
 */
export const getPlatformDominance = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const total = await Click.countDocuments({ project: projectId });

        if (total === 0) {
            return res.status(200).json({ message: "Platform dominance retrieved", data: [] });
        }

        const result = await Click.aggregate([
            { $match: { project: projectId } },
            {
                $lookup: {
                    from: "links",
                    localField: "link",
                    foreignField: "_id",
                    as: "linkData",
                },
            },
            { $unwind: { path: "$linkData", preserveNullAndEmptyArrays: false } },
            {
                $group: {
                    _id: "$linkData.platform",
                    count: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    platform: "$_id",
                    share: {
                        $multiply: [{ $divide: ["$count", total] }, 100],
                    },
                },
            },
        ]);

        const formatted = result.map((item) => ({
            platform: item.platform,
            share: parseFloat(item.share.toFixed(1)),
        }));

        return res.status(200).json({ message: "Platform dominance retrieved", data: formatted });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get network effect
 * @route   GET /api/analytics/project/:projectId/network-effect
 * @access  Private
 */
export const getNetworkEffect = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const totalClicks = await Click.countDocuments({ project: projectId });
        const uniqueVisitors = await Click.distinct("ip", { project: projectId });
        const uniqueVisitorsCount = uniqueVisitors.length;

        const ratio =
            uniqueVisitorsCount > 0
                ? parseFloat((totalClicks / uniqueVisitorsCount).toFixed(2))
                : 0;

        return res.status(200).json({
            message: "Network effect retrieved",
            totalClicks,
            uniqueVisitors: uniqueVisitorsCount,
            ratio,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get velocity (growth rate)
 * @route   GET /api/analytics/project/:projectId/velocity
 * @access  Private
 */
export const getVelocity = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        const lastThirtyDays = await Click.countDocuments({
            project: projectId,
            clickedAt: { $gte: thirtyDaysAgo, $lte: now },
        });

        const previousThirtyDays = await Click.countDocuments({
            project: projectId,
            clickedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
        });

        let growth = 0;
        if (previousThirtyDays > 0) {
            growth = ((lastThirtyDays - previousThirtyDays) / previousThirtyDays) * 100;
        } else if (lastThirtyDays > 0) {
            growth = 100;
        }

        return res
            .status(200)
            .json({ message: "Velocity retrieved", growth: parseFloat(growth.toFixed(1)) });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get hero campaign
 * @route   GET /api/analytics/project/:projectId/hero-campaign
 * @access  Private
 */
export const getHeroCampaign = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const result = await Click.aggregate([
            { $match: { project: projectId } },
            {
                $group: {
                    _id: "$campaign",
                    clickCount: { $sum: 1 },
                },
            },
            { $sort: { clickCount: -1 } },
            { $limit: 1 },
        ]);

        if (result.length === 0) {
            return res.status(200).json({
                message: "Hero campaign retrieved",
                campaignId: null,
                title: null,
                clickCount: 0,
            });
        }

        const campaignId = result[0]._id;
        const clickCount = result[0].clickCount;

        const campaign = await Campaign.findById(campaignId).select("title").lean();
        const title = campaign ? campaign.title : null;

        return res
            .status(200)
            .json({ message: "Hero campaign retrieved", campaignId, title, clickCount });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};

/**
 * @desc    Get monthly health
 * @route   GET /api/analytics/project/:projectId/monthly-health
 * @access  Private
 */
export const getMonthlyHealth = async (req, res) => {
    try {
        const { projectId } = req.params;

        if (!projectId) {
            return res.status(400).json({ message: "Project ID is required" });
        }

        const [networkEffectResult, dominanceResult, velocityResult, heroCampaignResult] =
            await Promise.all([
                (async () => {
                    const totalClicks = await Click.countDocuments({ project: projectId });
                    const uniqueVisitors = await Click.distinct("ip", { project: projectId });
                    const uniqueVisitorsCount = uniqueVisitors.length;
                    const ratio =
                        uniqueVisitorsCount > 0
                            ? parseFloat((totalClicks / uniqueVisitorsCount).toFixed(2))
                            : 0;
                    return { totalClicks, uniqueVisitors: uniqueVisitorsCount, ratio };
                })(),
                (async () => {
                    const total = await Click.countDocuments({ project: projectId });
                    if (total === 0) return [];
                    const result = await Click.aggregate([
                        { $match: { project: projectId } },
                        {
                            $lookup: {
                                from: "links",
                                localField: "link",
                                foreignField: "_id",
                                as: "linkData",
                            },
                        },
                        { $unwind: { path: "$linkData", preserveNullAndEmptyArrays: false } },
                        { $group: { _id: "$linkData.platform", count: { $sum: 1 } } },
                        {
                            $project: {
                                _id: 0,
                                platform: "$_id",
                                share: { $multiply: [{ $divide: ["$count", total] }, 100] },
                            },
                        },
                    ]);
                    return result.map((item) => ({
                        platform: item.platform,
                        share: parseFloat(item.share.toFixed(1)),
                    }));
                })(),
                (async () => {
                    const now = new Date();
                    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);
                    const lastThirtyDays = await Click.countDocuments({
                        project: projectId,
                        clickedAt: { $gte: thirtyDaysAgo, $lte: now },
                    });
                    const previousThirtyDays = await Click.countDocuments({
                        project: projectId,
                        clickedAt: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo },
                    });
                    let growth = 0;
                    if (previousThirtyDays > 0) {
                        growth = ((lastThirtyDays - previousThirtyDays) / previousThirtyDays) * 100;
                    } else if (lastThirtyDays > 0) {
                        growth = 100;
                    }
                    return { growth: parseFloat(growth.toFixed(1)) };
                })(),
                (async () => {
                    const result = await Click.aggregate([
                        { $match: { project: projectId } },
                        { $group: { _id: "$campaign", clickCount: { $sum: 1 } } },
                        { $sort: { clickCount: -1 } },
                        { $limit: 1 },
                    ]);
                    if (result.length === 0)
                        return { campaignId: null, title: null, clickCount: 0 };
                    const campaignId = result[0]._id;
                    const clickCount = result[0].clickCount;
                    const campaign = await Campaign.findById(campaignId).select("title").lean();
                    const title = campaign ? campaign.title : null;
                    return { campaignId, title, clickCount };
                })(),
            ]);

        return res.status(200).json({
            message: "Monthly health retrieved",
            networkEffect: networkEffectResult,
            dominance: dominanceResult,
            velocity: velocityResult,
            heroCampaign: heroCampaignResult,
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
};
