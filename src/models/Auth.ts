import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IAuth extends Document {
    email: string;
    password: string;
    userId: mongoose.Types.ObjectId;
    lastLogin?: Date;
    isActive: boolean;
    comparePassword(password: string): Promise<boolean>;
    lastLogout?: Date;

    createdAt: Date;
    updatedAt: Date;
}

const AuthSchema = new Schema<IAuth>(
    {
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        password: {
            type: String,
            required: true,
            select: false,
        },
        userId: {
            type: Schema.Types.ObjectId,
            ref: "UserProfile",
            required: true,
        },
        lastLogin: Date,
        isActive: {
            type: Boolean,
            default: true,
        },
        lastLogout: Date,
    },
    {
        timestamps: true,
    }
);

// Password comparison method
AuthSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
};

// Hash password before saving
AuthSchema.pre("save", async function (next) {
    if (this.isModified("password")) {
        this.password = await bcrypt.hash(this.password, 10);
    }
    next();
});

export const Auth = mongoose.model<IAuth>("Auth", AuthSchema);