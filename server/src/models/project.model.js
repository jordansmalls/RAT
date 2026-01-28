import mongoose from "mongoose";

const projectSchema = new mongoose.Schema({
    clientName: {
        type: String,
        required: true,
        trim: true,
    },
    description: {
        type: String,
        required: true,
    },

}, {
    timestamps: true,
})

export default mongoose.model("Project", projectSchema)