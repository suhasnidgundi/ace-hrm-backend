import mongoose from "mongoose";

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    firstName: String,
    lastName: String,
    avatarUrl: String,
    role: {
      type: String,
      enum: ["Manager", "Employee"],
      default: "Employee",
    },
    teamId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Team",
    },
    jobTitle: String,
    address: String,
    phone: String,
    birthdate: Date,
    links: [String],
    customFields: [
      {
        key: String,
        value: String,
      },
    ],
    availableAnnualLeaveDays: {
      type: Number,
      default: 30,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
  },
  {
    timestamps: true,
  }
);
