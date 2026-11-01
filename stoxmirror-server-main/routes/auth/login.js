var express = require("express");
var { compareHashedPassword } = require("../../utils");
const UsersDatabase = require("../../models/User");
const { signAdminToken, requireAdmin } = require("../../middleware/auth");
var router = express.Router();

function isAdminUser(user) {
  return user.isAdmin === true;
}

router.post("/login", async function (request, response) {
  const { email, password } = request.body;
  /**
   * step1: check if a user exists with that email
   * step2: check if the password to the email is correct
   * step3: if it is correct, return some data
   */

  if (typeof email !== "string" || typeof password !== "string") {
    return response.status(400).json({ code: "email and password are required" });
  }

  // An uncaught error in this async handler would take the whole server down.
  try {
    // step1
    const user = await UsersDatabase.findByEmail(email);

    if (user) {
      // step2 (bcrypt throws if an account has no stored password)
      const passwordIsCorrect =
        typeof user.password === "string" && compareHashedPassword(user.password, password);

      if (passwordIsCorrect) {
        // Strict false: accounts from before approval existed are undefined.
        if (user.accountApproved === false && !isAdminUser(user)) {
          return response.status(403).json({
            code: "account not approved",
            message:
              "Your account is awaiting admin approval. Please contact your personal trader for access.",
          });
        }

        const responseBody = { code: "Ok", data: user };
        if (isAdminUser(user)) {
          // Only admin accounts get a token — this is what the admin
          // dashboard sends back as Authorization: Bearer <token> to prove
          // it's really talking to an authenticated admin.
          responseBody.token = signAdminToken(user);
        }
        response.status(200).json(responseBody);
      } else {
        response.status(502).json({ code: "invalid credentials" });
      }
    } else {
      response.status(404).json({ code: "no user found" });
    }
  } catch (error) {
    console.error("Login error:", error);
    response.status(500).json({ code: "server error" });
  }
});


router.put("/login/:_id/enable", requireAdmin, async (req, res) => {
  const { _id } = req.params; // Use req.params to get the _id from the URL
  try {
    const user = await UsersDatabase.findOne({ _id });

    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "User not found",
      });
    }

    // Update the user's "condition" property to "enabled"
    user.condition = "enabled";

    // Save the updated user
    await user.save();

    res.status(200).json({
      success: true,
      status: 200,
      message: "User enabled successfully",
      user: user, // You can omit this line if you don't want to send the updated user back in the response
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
});


router.put("/login/:_id/disable", requireAdmin, async (req, res) => {
  const { _id } = req.params; // Use req.params to get the _id from the URL
  try {
    const user = await UsersDatabase.findOne({ _id });

    if (!user) {
      return res.status(404).json({
        success: false,
        status: 404,
        message: "User not found",
      });
    }

    // Update the user's "condition" property to "enabled"
    user.condition = "disabled";

    // Save the updated user
    await user.save();

    res.status(200).json({
      success: true,
      status: 200,
      message: "User disabled successfully",
      user: user, // You can omit this line if you don't want to send the updated user back in the response
    });
    
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      status: 500,
      message: "Internal Server Error",
    });
  }
});



router.post("/loginadmin", async function (request, response) {
  const { email} = request.body;
  /**
   * step1: check if a user exists with that email
   * step2: check if the password to the email is correct
   * step3: if it is correct, return some data
   */

  // step1
  const user = await UsersDatabase.findOne({ email: email });

  if (user) {
    // step2
   
      response.status(200).json({ code: "Ok", data: user });
   
}});



module.exports = router;
