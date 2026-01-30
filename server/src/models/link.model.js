import mongoose from "mongoose";

const linkSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Project",
            required: true,
            index: true,
        },

        campaign: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Campaign",
            required: true,
            index: true,
        },
        title: {
            type: String,
            trim: true,
        },
        platform: {
            type: String,
            required: true,
            enum: [
                "tiktok",
                "twitter",
                "instagram",
                "facebook",
                "threads",
                "reddit",
                "linkedin",
                "twitch",
                "pinterest",
                "other",
            ],
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            index: true,
            lowercase: true,
            trim: true,
        },

        destinationUrl: {
            type: String,
            required: true,
            trim: true,
        },
        customUrl: {
            type: String,
            required: true,
        },

        isActive: {
            type: Boolean,
            default: true,
        },

        clickCount: {
            type: Number,
            default: 0,
        },
    },
    {
        timestamps: true,
    },
);

export default mongoose.model("Link", linkSchema);
