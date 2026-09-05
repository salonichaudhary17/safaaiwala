import mongoose from 'mongoose';

const scrapCenterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    phone: { type: String, required: true, unique: true },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point' },
      coordinates: { type: [Number], required: true }, // [longitude, latitude]
    },
    acceptedMaterials: [{ type: String }],
    isOpen: { type: Boolean, default: true },
  },
  { timestamps: true }
);

scrapCenterSchema.index({ location: '2dsphere' });

export const ScrapCenter = mongoose.model('ScrapCenter', scrapCenterSchema);