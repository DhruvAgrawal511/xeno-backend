// inside consumer.js when you process a customer message
import Customer from './models/Customer.js'; // path to your model

// after you parse the entry payload:
const payload = JSON.parse(message.payload);

// If payload._id present, use it when creating
if (payload._id) {
  try {
    // convert to ObjectId type if model expects ObjectId
    const doc = {
      _id: mongoose.Types.ObjectId(payload._id),
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      total_spend: payload.total_spend,
      visits: payload.visits,
      createdAt: payload.createdAt ? new Date(payload.createdAt) : new Date()
    };
    // Use create with provided _id (if duplicate _id may throw duplicate key - handle)
    await Customer.create(doc);
    console.log('Inserted customer with provided id', payload._id);
  } catch (e) {
    console.error('Consumer: failed to insert with provided id:', e.message);
    // If duplicate or other, you may want to update instead, or skip
  }
} else {
  // fallback: create normally
  await Customer.create({
    name: payload.name, email: payload.email, phone: payload.phone,
    total_spend: payload.total_spend, visits: payload.visits
  });
}
