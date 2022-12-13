const mysql = require("mysql2")
import {withIronSession} from "next-iron-session"
import {mailOptions, transporter} from 'services/nodemailer'
import Api from "services/api"

export async function handler(req, res) {
    try {
        let user = req.session.get().user
        if(typeof(user) == "undefined") {
            return res.status(500).json({success: false, error: "Not signed in"})
        }
        if (req.method == "GET") {
            const connection = mysql.createConnection(process.env.DATABASE_URL);
           
                var [messages] = await connection
              .promise()
              .query(
                "SELECT Users.email FROM messages LEFT JOIN Users ON Users.id=`receiver` WHERE `read`='0' AND messages.timestamp < DATE_SUB(CURDATE(), INTERVAL 24 HOUR) ORDER BY timestamp DESC;"
              )

              let emails = messages.map((message) =>{
                console.log(message);
                return message.email.replace(/\s/g, '')
              })
              
              emails = new Set(emails) 
              emails = [...emails]
            
            //   let groupedMessages = _.mapValues(_.groupBy(messages, 'email'),
            //   mlist => mlist.map(msg => _.omit(msg, msg.email)));
            
            // console.log(groupedMessages); 
            mailer(emails)
            //   console.log(results);
            res.status(200).json(emails);
        }
    } catch(e) {
        console.log(e)
        return res.status(200).json({success: false, error: e})
    }
}
async function mailer(emails)
{
    const mail = `
      <p>Hello There,</p>
      <p>You have an unread message from an affiliate partner on Connective. Please <a href="${process.env.BASE_URL}/auth/signin">sign in</a> below and respond to them.<br/>
      
      Thanks
      <br/>
      <br/>
      Team Connective</p>`

    for(var i = 0; i < emails.length; i++)
    {
        console.log(emails[i]);
        mailOptions.to = emails[i]
        await transporter.sendMail({
            ...mailOptions,
            subject: 'Affiliate partner sent you a message',
            text: mail.replace(/<[^>]*>?/gm, ''),
            html: mail
        })
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

export const config = {
    api: {
        bodyParser: {
            sizeLimit: "4mb"
        }
    }
}