const mongoose = require("mongoose");

const UserBodyProfileSchema = new mongoose.Schema(
  {
    user_id:     { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, unique: true },
    height:      { type: Number, min: 100, max: 250 },   // cm
    weight:      { type: Number, min: 20,  max: 300 },   // kg
    chest:       { type: Number, min: 50,  max: 200 },   // cm
    waist:       { type: Number, min: 40,  max: 180 },   // cm
    hip:         { type: Number, min: 50,  max: 200 },   // cm
    shoulder:    { type: Number, min: 25,  max: 80  },   // cm
    leg_length:  { type: Number, min: 50,  max: 150 },   // cm
    body_length: { type: Number, min: 40,  max: 120 },   // cm
  },
  { timestamps: true }
);

module.exports = mongoose.model("UserBodyProfile", UserBodyProfileSchema);
