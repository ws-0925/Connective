import { withIronSession } from "next-iron-session";

const mysql = require("mysql2");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
 
export async function handler(req, res) {
  try {
    const host = req.headers.host;
    if (req.method === "POST") {
      const connection = mysql.createConnection(process.env.DATABASE_URL);
      let user = req.session.get().user;
      if (typeof user == "undefined") {
        return res.status(500).json({ success: false, error: "Not signed in" });
      }
      var [result, fields, err] = await connection
        .promise()
        .query(`SELECT * FROM Users WHERE id='${user.id}';`);

      connection.close();
      if (result.length > 0) {
        // fetch stripeID from the db;
        const accountLink = await stripe.accountLinks.create({
          account: result[0].stripeID,
          refresh_url: process.env.NODE_ENV === "test" ? 'http:' : 'https:' + '//' + host + process.env.refreshURL,
          return_url: process.env.NODE_ENV === "test" ? 'http:' : 'https:' + '//' + host + process.env.returnURL,
          type: "account_onboarding",
        });
         return res.status(200).json({success: true, accountLink: accountLink.url})
      } else {
        return res.json({ error: "User not found", success: false });
      }
    } else {
      return res.json({ error: "Only POST request is valid", success: false });
    }
  } catch(e) {
    console.log(e)
    return res.json({ error: "Server error", success: false });
  }
}

export default withIronSession(handler, {
  password: process.env.APPLICATION_SECRET,
  cookieName: "Connective",
  // if your localhost is served on http:// then disable the secure flag
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
});
