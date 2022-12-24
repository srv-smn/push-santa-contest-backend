const mongoose = require("mongoose");
const user = require("./users");

const balancesSchema = mongoose.Schema(
  {
    tokenName: {
      type: String,
      required: true,
    },
    amount: {
      type: Number,
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: user,
      required: true,
    },
  },

  { timestamps: true }
);

module.exports = mongoose.model("balances", balancesSchema);
