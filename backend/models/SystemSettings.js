const mongoose = require("mongoose");

const systemSettingsSchema = new mongoose.Schema(
  {
    defaultPlatformCommission: {
      type: Number,
      default: 30,
      min: 0,
      max: 100,
    },

    categoryCommissionOverrides: [
      {
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "category",
        },
        platformCommission: { type: Number, min: 0, max: 100 },
      },
    ],

    contentApproval: {
      mode: {
        type: String,
        enum: ["manual", "auto"],
        default: "manual",
      },

      reviewNoteRequiredOnReject: {
        type: Boolean,
        default: true,
      },

      rejectionReasons: {
        type: [String],
        default: [
          "Copyright issue",
          "Low video/audio quality",
          "Incomplete course content",
          "Misleading title/description",
        ],
      },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemSettings", systemSettingsSchema);