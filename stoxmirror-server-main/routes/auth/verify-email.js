var express = require("express");
const UsersDatabase = require("../../models/User");
var router = express.Router();

router.put("/:email/verify", async function (request, response) {
  const { email } = request.params;

  try {
    const user = await UsersDatabase.findOne({ email });

    if (!user) {
      return response.status(404).json({
        success: false,
        status: 404,
        message: "User not found",
      });
    }

    await user.updateOne({
      verified: true,
    });

    return response.status(200).json({ success: true, message: "Email verified" });
  } catch (error) {
    console.log(error);
    return response.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
});

module.exports = router;
