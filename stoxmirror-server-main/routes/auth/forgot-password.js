var express = require("express");
const crypto = require("crypto");
const UsersDatabase = require("../../models/User");
const { hashPassword, compareHashedPassword, sendPasswordOtp } = require("../../utils");
const { rateLimit, clientIp } = require("../../middleware/rateLimit");
var router = express.Router();

const CODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const MAX_CODE_ATTEMPTS = 5;
const INVALID_CODE_MESSAGE = "That code is incorrect or has expired.";

const RESET_FIELDS = "+passwordResetOtp +passwordResetExpires +passwordResetAttempts";

// Each send costs an email, so cap requests per address.
const sendCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyFn: (req) =>
    typeof req.body.email === "string" ? `reset:${req.body.email.toLowerCase()}` : clientIp(req),
  message: "Too many reset requests. Please try again in a few minutes.",
});

// Returns the user only if the code matches. A wrong guess counts against the
// code, so it can't be brute-forced within its lifetime.
async function findUserWithValidCode(email, otp) {
  // Strings only: a JSON object here would be read as a Mongo query operator.
  if (typeof email !== "string" || typeof otp !== "string") return null;

  const user = await UsersDatabase.findByEmail(email, RESET_FIELDS);
  if (
    !user ||
    !user.passwordResetOtp ||
    !user.passwordResetExpires ||
    user.passwordResetExpires.getTime() < Date.now() ||
    (user.passwordResetAttempts || 0) >= MAX_CODE_ATTEMPTS
  ) {
    return null;
  }

  if (!compareHashedPassword(user.passwordResetOtp, otp)) {
    await user.updateOne({ $inc: { passwordResetAttempts: 1 } });
    return null;
  }

  return user;
}

// Step 1: email the user a one-time code. The code is never returned to the
// browser; only the person with access to the inbox can see it.
router.put("/forgot-password", sendCodeLimiter, async function (req, res) {
  const { email } = req.body;

  if (typeof email !== "string" || !email) {
    return res.status(400).json({ success: false, message: "Email is required" });
  }

  try {
    const user = await UsersDatabase.findByEmail(email);
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with that email" });
    }

    const otp = String(crypto.randomInt(100000, 1000000));
    await user.updateOne({
      passwordResetOtp: hashPassword(otp),
      passwordResetExpires: new Date(Date.now() + CODE_TTL_MS),
      passwordResetAttempts: 0,
    });

    await sendPasswordOtp({ to: user.email, otp });

    return res.status(200).json({ success: true, message: "Reset code sent" });
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.status(502).json({
      success: false,
      message: "We couldn't send the reset code. Please try again shortly.",
    });
  }
});

// Step 2: check the code before showing the new password form. Named
// check-code because /:email/verify would otherwise catch this path.
router.put("/forgot-password/check-code", async function (req, res) {
  try {
    const user = await findUserWithValidCode(req.body.email, req.body.otp);
    if (!user) {
      return res.status(400).json({ success: false, message: INVALID_CODE_MESSAGE });
    }
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("Check reset code error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Step 3: the code is checked again here, then used up.
router.put("/forgot-password/reset", async function (req, res) {
  const { email, otp, password } = req.body;

  if (typeof password !== "string" || password.length < 6) {
    return res.status(400).json({ success: false, message: "Password must be at least 6 characters." });
  }

  try {
    const user = await findUserWithValidCode(email, otp);
    if (!user) {
      return res.status(400).json({ success: false, message: INVALID_CODE_MESSAGE });
    }

    await user.updateOne({
      password: hashPassword(password),
      $unset: { passwordResetOtp: 1, passwordResetExpires: 1, passwordResetAttempts: 1 },
    });

    return res.status(200).json({ success: true, message: "update was successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    return res.status(500).json({ success: false, message: "Internal server error" });
  }
});

// Used by Change Password in the user dashboard.
router.put("/:_id/reset-password", async function (req, res, next) {
  const { _id } = req.params;
  const { password } = req.body;

  const user = await UsersDatabase.findOne({ _id });

  if (!user) {
    res.status(404).json({ message: "user not found" });
    return;
  }

  const hashedPassword = hashPassword(password);

  try {
    await user.updateOne({
      password: hashedPassword,
    });

    return res.status(200).json({
      message: "update was successful",
    });
  } catch (error) {
    console.log(error);
  }
});

module.exports = router;
