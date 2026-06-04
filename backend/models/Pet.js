const mongoose = require('mongoose');

const petSchema = new mongoose.Schema(
  {
    name:     { type: String, required: true },
    species:  { type: String },
    breed:    { type: String },
    age:      { type: Number },
    gender:   { type: String },
    ownerId:         { type: String },
    profileImageUrl: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Pet', petSchema);
