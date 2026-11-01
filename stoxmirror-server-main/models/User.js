const mongoose = require("mongoose");

const UsersSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
  },
  lastName: {
    type: String,
    required: true,
  },
  
kycApprovedAt: { type: Date },
kycRejectedAt: { type: Date },
kycRejectionReason: { type: String },

  copytrading: {
    type: String,
    
  },
  phone: {
    type: String,
    
  },
  trader: {
    type: String,
    
  },
  condition: {
    type: String,
    
  },
  kyc: {
    type: String,
    
  },


  email: {
    type: String,
    required: true,
    unique: true,
  },
  referralCode:{
    type:String,
  },
  referredUsers:{
    type:Array,
  },
  planHistory:{
    type:Array,
  },
  referredBy:{
    type:String,
  },
  plan:{
    type:Array,
  },
 
  country: {
    type: String,
    required: true,
  },
  password: {
    type: String,
    required: true,
    min: 6,
    max: 50,
  },
  amountDeposited: {
    type: String,
  },
  profit: {
    type: Number,
  },
  balance: {
    type: Number,
  },
  referalBonus: {
    type: String,
  },
  transactions: {
    type: Array,
  },
  walletAdjustments: {
    type: Array,
    default: [],
  },
  accounts: {
    type: Object,
  },
  // Per-coin crypto balances for the in-app Converter, e.g. { BTC: 0.05, ETH: 1.2 }.
  // Distinct from `accounts`, which holds external deposit wallet addresses.
  holdings: {
    type: Object,
    default: {},
  },
  // History of in-app crypto conversions (see POST /transactions/:_id/convert).
  conversions: {
    type: Array,
    default: [],
  },
  withdrawals: {
    type: Array,
  },
   rewards: {
    type: Array,
  },
  copyTradingActive: {
    type: Array,
  },
  verified: {
    type: Boolean,
  },
  isDisabled: {
    type: Boolean,
  },
  isAdmin: {
    type: Boolean,
    default: false,
  },
  // Manual admin approval. /register sets this to false and login is blocked
  // until an admin approves. Deliberately has no default: accounts created
  // before this field existed stay undefined and keep logging in.
  accountApproved: {
    type: Boolean,
  },
  approvedAt: { type: Date },
  approvedBy: { type: String },
  // Forgot-password code (bcrypt hash). select:false keeps these out of every
  // normal query, so they never appear in API responses such as GET /users/:email.
  passwordResetOtp: { type: String, select: false },
  passwordResetExpires: { type: Date, select: false },
  passwordResetAttempts: { type: Number, select: false },

  // Collected on the registration page (register.html) and shown in the
  // admin "Edit User" → KYC Survey Data card.
  // Chosen at registration: "individual" or "business" (shown on the dashboard).
  accountType: { type: String, enum: ["individual", "business"], default: "individual" },
  currency: { type: String },
  termsAcceptedAt: { type: Date },
  survey_yearsOfExperience: { type: String },
  survey_knowledgeLevel: { type: String },
  survey_tradingFrequency: { type: String },
  survey_preferredMarkets: { type: String },
  survey_instrumentsTraded: { type: String },
  survey_tradingPlatforms: { type: String },
  survey_annualIncome: { type: String },
  survey_primaryIncomeSource: { type: String },
  survey_taxResidency: { type: String },
  surveyCompleted: { type: Boolean, default: false },
});

// Emails are stored as typed at registration, so an exact match can miss an
// account saved as "Name@Gmail.com". An exact match still wins if two accounts
// differ only by case.
UsersSchema.statics.findByEmail = async function (email, select = "") {
  const exact = await this.findOne({ email }).select(select);
  if (exact) return exact;
  return this.findOne({ email }).select(select).collation({ locale: "en", strength: 2 });
};

module.exports = mongoose.model("users", UsersSchema);
