import mongoose, { Document, Schema } from "mongoose";

export interface IUserProfile extends Document {
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;  // Made explicit in interface
    phone?: string;
    birthDate?: Date;
    emergencyContact?: {
        name: string;
        relationship: string;
        phone: string;
    };
    address?: {
        street: string;
        city: string;
        state: string;
        country: string;
        postalCode: string;
    };
    employeeId?: mongoose.Types.ObjectId;
    customFields?: { key: string; value: string; }[];
    links?: string[];
    updateAvatar: (url: string) => Promise<void>;  // New method
}

const UserProfileSchema = new Schema<IUserProfile>(
    {
        firstName: {
            type: String,
            required: true,
            trim: true,
        },
        lastName: {
            type: String,
            required: true,
            trim: true,
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
        },
        avatarUrl: {
            type: String,
            validate: {
                validator: function(v: string) {
                    // Basic URL validation
                    return !v || /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/.test(v);
                },
                message: 'Invalid URL format for avatar'
            }
        },
        phone: String,
        emergencyContact: {
            name: String,
            relationship: String,
            phone: String,
        },
        address: {
            street: String,
            city: String,
            state: String,
            country: String,
            postalCode: String,
        },
        employeeId: {
            type: Schema.Types.ObjectId,
            ref: "Employee",
        },
        birthDate: Date,
        customFields: [{
            key: String,
            value: String
        }],
        links: [String]
    },
    {
        timestamps: true,
    }
);

// Method to update avatar URL
UserProfileSchema.methods.updateAvatar = async function(url: string) {
    this.avatarUrl = url;
    await this.save();
};

export const UserProfile = mongoose.model<IUserProfile>("UserProfile", UserProfileSchema);