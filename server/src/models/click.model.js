import mongoose from "mongoose";

const clickSchema = new mongoose.Schema(
    {
        // Relationships
        link: {
            type: mongoose.Types.ObjectId,
            ref: "Link",
            required: true,
            index: true,
        },
        campaign: {
            type: mongoose.Types.ObjectId,
            ref: "Campaign",
            required: true,
            index: true,
        },
        project: {
            type: mongoose.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },

        // Destination
        destinationUrl: {
            type: String,
            required: true,
        },

        // Time Dimensions
        clickedAt: {
            type: Date,
            default: Date.now,
            index: true,
        },
        dayOfWeek: {
            type: Number,
            min: 0,
            max: 6,
            index: true,
        },
        hourOfDay: {
            type: Number,
            min: 0,
            max: 23,
            index: true,
        },
        fullDateClicked: {
            type: String,
            required: true,
        },

        // Visitor Network
        ip: {
            type: String,
            select: false, // hidden by default (privacy)
        },

        geo: {
            country: { type: String, index: true },
            region: String,
            city: String,
            timezone: String,
            ll: {
                lat: Number,
                lon: Number,
            },
        },

        // Device (UAParser)
        device: {
            type: {
                type: String,
                enum: [
                    "mobile",
                    "tablet",
                    "desktop",
                    "smarttv",
                    "console",
                    "wearable",
                    "embedded",
                    "unknown",
                ],
                index: true,
            },
            vendor: String, // Apple, Samsung
            model: String, // iPhone, SM-G991B
            cpu: {
                architecture: String, // arm64, amd64
            },
        },

        // OS
        os: {
            name: { type: String, index: true }, // macOS, Windows, Android
            version: String,
        },

        // Browser
        browser: {
            name: { type: String, index: true }, // Chrome, Safari, Firefox
            version: String,
            major: String,
            engine: {
                name: String, // Blink, WebKit, Gecko
                version: String,
            },
        },
        // Traffic Source
        referrer: String,

        // Bot Detection Flag
        isBot: {
            type: Boolean,
            default: false,
            index: true,
        },
    },
    {
        timestamps: true,
    },
);

clickSchema.index({ project: 1, clickedAt: -1 });
clickSchema.index({ campaign: 1, clickedAt: -1 });
clickSchema.index({ link: 1, clickedAt: -1 });
clickSchema.index({ "geo.country": 1 });
clickSchema.index({ "device.type": 1 });
clickSchema.index({ "browser.name": 1 });
clickSchema.index({ "os.name": 1 });

export default mongoose.model("Click", clickSchema);
