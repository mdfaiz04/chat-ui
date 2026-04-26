import mongoose, { Schema, model, models } from "mongoose";

const UserSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    passwordHash: {
      type: String,
      required: false, // Optional because OAuth users don't have a password
    },
    resetToken: {
      type: String,
    },
    resetTokenExpiry: {
      type: Date,
    },
    provider: {
      type: String,
      enum: ["google", "credentials", "github"],
      default: "credentials",
    },
    image: {
      type: String,
    },
  },
  {
    timestamps: true, // This automatically adds createdAt and updatedAt fields
  }
);

const User = models.User || model("User", UserSchema);

export default User;
