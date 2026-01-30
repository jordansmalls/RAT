import mongoose from "mongoose";

const campaignSchema = new mongoose.Schema(
    {
        project: {
            type: mongoose.Types.ObjectId,
            ref: "Project",
            required: true,
        },
        title: {
            type: String,
            required: true,
            trim: true,
        },
        url: {
            type: String,
            required: true,
            trim: true,
        },
    },
    {
        timestamps: true,
    },
);

const Campaign = mongoose.model("Campaign", campaignSchema);

export default Campaign;
