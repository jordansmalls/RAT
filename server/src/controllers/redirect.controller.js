import Link from "../models/link.model.js";
import Click from "../models/click.model.js";
import requestIp from "request-ip";
import geoip from "geoip-lite";
import { env } from "../config/env.js";
import * as UAParser from "ua-parser-js";
import { formatFullDateClicked } from "../utils/format.date.js";

//  @desc    handle short link redirect + analytics tracking
//  @route   GET /:slug
//  @access  public

export const handleRedirect = async (req, res) => {
    const slug = req.params.slug?.trim().toLowerCase();

    try {
        if (!slug) return res.redirect(env.frontendLink);

        const link = await Link.findOne({ slug, isActive: true }).lean();
        if (!link) return res.redirect(env.frontendLink);

        // non blocking click count increment
        Link.updateOne({ _id: link._id }, { $inc: { clickCount: 1 } }).exec();

        // Fire-and-forget click tracking
        setImmediate(async () => {
            try {
                const now = new Date();

                // Get IP and geo info
                const ip = requestIp.getClientIp(req) || null;
                const geo = ip ? geoip.lookup(ip) : null;

                // Parse user-agent
                const parser = new UAParser.UAParser(req.headers["user-agent"]);
                const ua = parser.getResult();

                // Map device type correctly: fallback to "desktop"
                const deviceType = ua.device.type || "desktop";

                // Determine if visitor is likely a bot
                const isBot = /bot|crawler|spider|crawling/i.test(ua.ua || "");

                await Click.create({
                    link: link._id,
                    campaign: link.campaign,
                    project: link.project,
                    destinationUrl: link.destinationUrl,

                    clickedAt: now,
                    dayOfWeek: now.getDay(), // 0-6 (Sun-Sat)
                    hourOfDay: now.getHours(), // 0-23
                    fullDateClicked: formatFullDateClicked(now),

                    ip,
                    geo: geo
                        ? {
                              country: geo.country || null,
                              region: geo.region || null,
                              city: geo.city || null,
                              ll: geo.ll ? { lat: geo.ll[0], lon: geo.ll[1] } : undefined,
                              timezone: geo.timezone || null,
                          }
                        : null,

                    device: {
                        type: deviceType, // mobile | tablet | desktop | smarttv | console | wearable | embedded | unknown
                        vendor: ua.device.vendor || null,
                        model: ua.device.model || null,
                        cpu: {
                            architecture: ua.cpu.architecture || null,
                        },
                    },

                    os: {
                        name: ua.os.name || null,
                        version: ua.os.version || null,
                    },

                    browser: {
                        name: ua.browser.name || null,
                        version: ua.browser.version || null,
                        major: ua.browser.major || null,
                        engine: {
                            name: ua.engine.name || null,
                            version: ua.engine.version || null,
                        },
                    },

                    referrer: req.get("Referrer") || null,
                    isBot,
                });
            } catch (err) {
                console.error("Error tracking click:", err.message);
            }
        });

        return res.redirect(link.destinationUrl);
    } catch (err) {
        console.error("Redirection error:", err);
        return res.redirect(env.frontendLink);
    }
};




// @desc    fetch aggregated analytics for a project
// @route   GET /api/projects/:project_id/stats
// @access  public

export const fetchProjectStats = async (req, res) => {
    const { project_id } = req.params;

    try {
        const projectObjectId = project_id;

        const [
            totalClicks,
            clicksByDay,
            clicksByHour,
            deviceBreakdown,
            browserBreakdown,
            osBreakdown,
            countryBreakdown,
            referrerBreakdown,
        ] = await Promise.all([
            // Total clicks
            Click.countDocuments({ project: projectObjectId }),

            // Clicks per day of week
            Click.aggregate([
                { $match: { project: projectObjectId } },
                { $group: { _id: "$dayOfWeek", count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),

            // Clicks per hour
            Click.aggregate([
                { $match: { project: projectObjectId } },
                { $group: { _id: "$hourOfDay", count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]),

            // Device types
            Click.aggregate([
                { $match: { project: projectObjectId } },
                { $group: { _id: "$device.type", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),

            // Browsers
            Click.aggregate([
                { $match: { project: projectObjectId } },
                { $group: { _id: "$device.browser", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),

            // Operating systems
            Click.aggregate([
                { $match: { project: projectObjectId } },
                { $group: { _id: "$device.os", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
            ]),

            // Countries
            Click.aggregate([
                { $match: { project: projectObjectId } },
                { $group: { _id: "$geo.country", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),

            // Referrers
            Click.aggregate([
                { $match: { project: projectObjectId } },
                { $group: { _id: "$referrer", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 10 },
            ]),
        ]);

        return res.json({
            success: true,
            stats: {
                totalClicks,
                clicksByDay,
                clicksByHour,
                deviceBreakdown,
                browserBreakdown,
                osBreakdown,
                topCountries: countryBreakdown,
                topReferrers: referrerBreakdown,
            },
        });
    } catch (err) {
        console.error("Project stats error:", err);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch project statistics",
        });
    }
};
