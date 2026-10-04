import mongoose from 'mongoose';
export default mongoose.model('WebhookEvent', new mongoose.Schema({
  eventId: { type: String, unique: true, required: true },
  type: String, processedAt: Date,
}, { timestamps: true }));
