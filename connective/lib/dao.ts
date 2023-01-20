import moment from "moment";
import mysql, { OkPacket, RowDataPacket } from "mysql2";
import {
  Message,
  User,
  DiscoverUser,
  Business as Business_Type,
  Individual as Individual_Type,
  ListItem,
  UnreadNotification,
  StripePrice,
  Conversation,
} from "../types/types";

export namespace DAO {
  const connection = mysql.createConnection(process.env.DATABASE_URL || "");

  /**
   * Contains functions for interacting with Users in the database
   */
  export class Users {
    /**
     * Gets a user by their id
     * @param {number} id The users email
     * @returns {User} The user object
     */
    static async getById(id: number): Promise<User> {
      var query = `SELECT * FROM Users WHERE id=?;`;
      var [results] = await connection.promise().query(query, [id]);
      return results[0] as User;
    }

    /**
     * Gets a user by their email
     * @param {string} email The users email
     * @returns {User} The user object
     */
    static async getByEmail(email: string): Promise<User> {
      var query = `SELECT * FROM Users WHERE email=?;`;
      var [results] = await connection.promise().query(query, [email]);
      return results[0] as User;
    }

    /**
     * Gets all users
     * @returns {User[]}
     */
    static async getAll(): Promise<User[]> {
      var query = `SELECT * FROM Users;`;
      var [results] = await connection.promise().query(query);
      return results as Array<User>;
    }

    /**
     * Gets a user by their email and verification id
     * @param {string} email The users email
     * @param {string} verificationId The users verification id
     * @returns {User} The user object
     */
    static async getByEmailAndVerificationId(
      email: string,
      verificationId: string
    ): Promise<User> {
      var query = `SELECT * FROM Users WHERE email=? AND verification_id=?;`;
      var [results] = await connection
        .promise()
        .query(query, [email, verificationId]);
      return results[0] as User;
    }

    /**
     * Adds a new user to the database
     * @param {string} username The users username
     * @param {string} password_hash The users hashed password
     * @param {string} email The users email
     * @param {string} stripeID The users stripe id
     * @param {boolean} isSignupWithGoogle The user signed up with Google SSO
     * @returns {number | boolean} The users insert id, or false if the insert failed
     */
    static async add(
      username: string,
      password_hash: string,
      email: string,
      stripeID: string,
      isSignupWithGoogle: boolean = false
    ): Promise<number | boolean> {
      var query = `INSERT INTO Users (username, password_hash, email, stripeID) VALUES (?,?,?,?);`;
      if (isSignupWithGoogle) {
        query = `INSERT INTO Users (username, password_hash, email, stripeID, email_verified, is_signup_with_google) VALUES (?,?,?,?,?,?);`;
        var [result] = await connection
          .promise()
          .execute<OkPacket>(query, [
            username,
            password_hash,
            email,
            stripeID,
            true,
            true,
          ]);
        return result.insertId;
      } else {
        var [result] = await connection
          .promise()
          .execute<OkPacket>(query, [username, password_hash, email, stripeID]);
        return result.insertId;
      }
    }

    /**
     * Updates the email verification status of the given user
     * @param {boolean} status The new verification status of the user
     * @param {string} email The users email
     */
    static async updateVerificationStatus(
      status: boolean,
      email: string
    ): Promise<void> {
      var query = `UPDATE Users SET verify_email_otp = null, email_verified = ? WHERE email=?;`;
      await connection
        .promise()
        .execute(query, [status == true ? "true" : "false", email]);
    }

    /**
     * Sets the one time passcode for the given user by their email
     * @param {string} code The new OTP code
     * @param {string} email The users email
     */
    static async setOtpCode(code: string, email: string): Promise<void> {
      var query = `UPDATE Users SET verify_email_otp = ? WHERE email=?;`;
      await connection.promise().execute(query, [code, email]);
    }

    /**
     * Updates the one time passcode for a user, as well as the # of attempts for the given user
     * @param {string} code The new OTP code
     * @param {number} sendCodeAttempt The number of attempts which have occured
     * @param {string} email The users email
     */
    static async updateOtpCode(
      code: string,
      sendCodeAttempt: number,
      email: string
    ): Promise<void> {
      var query = `UPDATE Users SET verify_email_otp = ?, send_code_attempt = ?, last_code_sent_time = ? WHERE email=?;`;
      await connection
        .promise()
        .query(query, [
          code,
          sendCodeAttempt,
          moment().format("YYYY/MM/DD HH:mm:ss"),
          email,
        ]);
    }

    /**
     * Updates the password hash value for a user
     * @param {string} hash The new password hash
     * @param {string} email The users email
     */
    static async updatePasswordHash(
      hash: string,
      email: string
    ): Promise<void> {
      await connection
        .promise()
        .query(
          `UPDATE Users SET password_hash='${hash}' WHERE email='${email}';`
        );
    }

    /**
     * Updates the password hash value and verification id for a user
     * @param {string} hash The new password hash
     * @param {string} verificationId The new verification id
     * @param {string} email The users email
     */
    static async updatePasswordHashAndVerificationId(
      hash: string,
      verificationId: string,
      email: string
    ): Promise<void> {
      await connection
        .promise()
        .query(
          `UPDATE Users SET password_hash='${hash}', verification_id = '${verificationId}' WHERE email='${email}';`
        );
    }

    /**
     * Updates the verification id value for a user
     * @param {string} verificationId The new verification id
     * @param {string} email The users email
     */
    static async updateVerificationId(
      verificationId: string,
      email: string
    ): Promise<void> {
      await connection
        .promise()
        .query(
          `UPDATE Users SET verification_id = '${verificationId}', verification_timestamp = "${moment().format(
            "YYYY/MM/DD HH:mm:ss"
          )}" WHERE email='${email}';`
        );
    }

    /**
     * Updates the verification status for a user
     * @param {string} token The new password hash
     * @param {string} sendCodeAttempt The sending code attempt
     * @param {string} email The users email
     */
    static async updateVerification(
      token: string,
      sendCodeAttempt: number,
      email: string
    ): Promise<void> {
      await connection
        .promise()
        .query(
          `UPDATE Users SET verification_id = '${token}', send_code_attempt = ${sendCodeAttempt}, verification_timestamp = "${moment().format(
            "YYYY/MM/DD HH:mm:ss"
          )}" WHERE email='${email}';`
        );
    }
  }

  export class Discover {
    /**
     *
     * @returns {DiscoverUser[]} All users who are displayed on the discover page
     */
    static async getAll(): Promise<Array<DiscoverUser>> {
      var query = `SELECT Users.show_on_discover, Users.id, Users.email, Business.industry, Business.company_name as username, Business.logo, Business.description, Business.status FROM Users JOIN Business on Users.id = Business.user_id UNION ALL SELECT Users.show_on_discover, Users.id, Users.email, '' as industry, Individual.name as username, Individual.profile_picture AS logo, Individual.bio AS description, Individual.status FROM Users JOIN Individual on Users.id = Individual.user_id;`;
      var [results] = await connection.promise().query(query);

      return results as Array<DiscoverUser>;
    }
  }

  /**
   * Contains functions for interacting with Businesses in the database
   */
  export class Business {
    /**
     * Determines if a user is a business
     * @param {number} id The users id
     * @returns {boolean} True if the user is a business
     */
    static async isBusiness(id: number): Promise<boolean> {
      var query = `SELECT COUNT(id) FROM Business WHERE user_id=?;`;
      let [res] = await connection.promise().query(query, [id]);
      return res[0]["count(id)"] > 0;
    }

    /**
     * Gets a business by its user id
     * @param {number} userId The businesses user id
     * @returns {Business} A Business object representing the business
     */
    static async getByUserId(userId: number): Promise<Business_Type> {
      var query = `SELECT * FROM Business WHERE user_id=?;`;
      var [result] = await connection.promise().query(query, [userId]);
      return result[0] as Business_Type;
    }

    /**
     * Adds a new business to the database
     * @param {number} userId The businesses user id
     * @param {string} name The businesses name
     * @param {string} description The businesses description
     * @param {string} pfp A link to the businesses profile picture
     * @param {string} url The businesses site url
     * @param {string} location
     * @param {string} industry
     * @param {string} size
     * @param {string} status
     * @returns
     */
    static async add(
      userId: number,
      name: string,
      description: string,
      pfp: string,
      url: string,
      location: string,
      industry: string,
      size: string,
      status: string
    ): Promise<number> {
      var query = `INSERT INTO Business (
                            user_id, company_name, description, logo, website, location, industry, size, status
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?
                        );`;
      var [result] = await connection
        .promise()
        .execute<OkPacket>(query, [
          userId,
          name,
          description,
          pfp,
          url,
          location,
          industry,
          size,
          status,
        ]);

      return result.insertId;
    }

    /**
     * Updates the information for the given business
     * @param {number} userId The businesses user id
     * @param {string} name The new name for the businesses
     * @param {boolean} pfpChanged Weather or not there is a profile picture
     * @param {string} pfp The profile picture for the businesses
     * @param {string} description The new description for the business
     * @param {string} location The new location of the business
     * @param {number} industry The new industry of the business (a number relating to a specific label)
     * @param {string} size The size of the business
     * @param {string} url The new site url of the business
     * @param {string} status The new status for the business
     */
    static async update(
      userId: number,
      name: string,
      pfpChanged: boolean,
      pfp: string,
      description: string,
      location: string,
      industry: number,
      size: string,
      url: string,
      status: string
    ): Promise<void> {
      var query = `UPDATE Business SET company_name = ?, ?, description = ?, location = ?, industry = ?, size = ?, website = ?, status = ? WHERE user_id = ?;`;
      await connection
        .promise()
        .execute(query, [
          name,
          pfpChanged ? "logo =" + `'${pfp}',` : "",
          description,
          location,
          industry,
          size,
          url,
          status,
          userId,
        ]);
    }

    /**
     * Increments the number of views for the given business by their user id
     * @param userId The users ID
     */
    static async incrementProfileViews(userId: number): Promise<void> {
      var query =
        "UPDATE Business SET profileViews = profileViews + 1 WHERE user_id=?;";
      await connection.promise().execute(query, [userId]);
    }
  }

  /**
   * Contains functions for interacting with Individuals in the database
   */
  export class Individual {
    /**
     * Determines if a user is an individual
     * @param {number} id The individuals user id
     * @returns {boolean} True if the user is an individual
     */
    static async isIndividual(id: number): Promise<boolean> {
      var query = `SELECT COUNT(id) FROM Individual WHERE user_id=?;`;
      let [res] = await connection.promise().query(query, [id]);
      return res[0]["count(id)"] > 0;
    }

    /**
     * Gets an individual by its user id
     * @param {number} userId The individuals user id
     * @returns {Individual} An Indivual object representing the individual
     */
    static async getByUserId(userId: number): Promise<Individual_Type> {
      var query = `SELECT * FROM Individual WHERE user_id=?;`;
      var [result] = await connection.promise().query(query, [userId]);
      return result[0] as Individual_Type;
    }

    /**
     * Adds a new individual to the database
     * @param {number} userId The individual user id
     * @param {string} name The individual name
     * @param {string} bio The individual bio
     * @param {string} pfp A link to the individual profile picture
     * @param {string} location location
     * @param {number} profileViews profile views count
     * @param {number} listViews list views count
     * @param {string} industry
     * @param {string} status
     * @param {string} occupation
     * @returns
     */
    static async add(
      userId: number,
      name: string,
      bio: string,
      pfp: string,
      location: string,
      profileViews: number,
      listViews: number,
      industry: string,
      status: string,
      occupation: string
    ): Promise<number> {
      var query = `INSERT INTO Individual (
                            user_id, name, bio, profile_picture, location, profileViews, listViews, status, industry, occupation
                        ) VALUES (
                            ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                        );`;
      var [result] = await connection
        .promise()
        .execute<OkPacket>(query, [
          userId,
          name,
          bio,
          pfp,
          location,
          profileViews,
          listViews,
          status,
          industry,
          occupation,
        ]);

      return result.insertId;
    }

    /**
     * Update individual user data
     * @param userId
     * @param pfpChanged
     * @param pfp
     * @param name
     * @param bio
     * @param location
     * @param status
     */
    static async update(
      userId: number,
      pfpChanged: boolean,
      pfp: string,
      name: string,
      bio: string,
      location: string,
      status: string
    ): Promise<void> {
      let query = "";
      if (pfpChanged) {
        query = `UPDATE Individual SET name = '${name}', ${
          pfpChanged ?? "profile_picture =" + `'${pfp}',`
        } bio = '${bio}', location = '${location}', status = '${status}' WHERE user_id = '${userId}';`;
      } else {
        query = `UPDATE Individual SET name = '${name}',bio = '${bio}', location = '${location}', status = '${status}' WHERE user_id = '${userId}';`;
      }
      await connection.promise().execute(query);
    }

    /**
     * Increments the number of views for the given individual by their user id
     * @param userId The users ID
     */
    static async incrementProfileViews(userId: number): Promise<void> {
      var query =
        "UPDATE Individual SET profileViews = profileViews + 1 WHERE user_id=?;";
      await connection.promise().execute(query, [userId]);
    }
  }

  /**
   * Contains functions for interacting with List in the database
   */
  export class Lists {
    /**
     * Gets all urls from lists
     * @returns urls array
     */
    static async getUrls(): Promise<Array<string>> {
      const [lists] = await connection.promise().query(`SELECT url FROM Lists`);
      const urls: Array<string> = (lists as Array<RowDataPacket>).map(
        (list) => {
          return list.url;
        }
      );
      return urls;
    }

    /**
     * Gets purchased list by the specific buyer id
     * @param buyerId The buyers Id
     * @returns Purchased list for buyer
     */
    static async getPurchasedListByBuyerId(
      buyerId: number
    ): Promise<Array<ListItem>> {
      const query = `select * from Lists join purchased_lists on purchased_lists.list_id = Lists.id WHERE buyer_id = ${buyerId}`;
      const [purchasedListsResults] = await connection.promise().query(query);
      return purchasedListsResults as Array<ListItem>;
    }

    /**
     * Gets purchased list by the specific creator id
     * @param creatorId The creators Id
     * @returns Purchased list for creator
     */
    static async getPurchasedListByCreatorId(
      creatorId: number
    ): Promise<Array<ListItem>> {
      const query = `select * from Lists join purchased_lists on purchased_lists.list_id = Lists.id WHERE creator = ${creatorId}`;
      const [soldListResults] = await connection.promise().query(query);
      return soldListResults as Array<ListItem>;
    }

    /**
     * Gets list by the specific creator id
     * @param creatorId The creators Id
     * @returns List for the creators
     */
    static async getListsByCreator(
      creatorId: number
    ): Promise<Array<ListItem>> {
      const query = `select * from Lists where creator = ${creatorId}`;
      const [createdListResults] = await connection.promise().query(query);
      return createdListResults as Array<ListItem>;
    }

    /**
     * Get stripe price for the specific list item
     * @param id list id
     * @returns
     */
    static async getListStripePrice(id: number): Promise<StripePrice> {
      var [result] = await connection
        .promise()
        .query(
          `SELECT Lists.price, Users.stripeID FROM Lists INNER JOIN Users ON Lists.creator = Users.id WHERE Lists.id="${id}"`
        );
      return result[0] as StripePrice;
    }
  }

  /**
   * Contains functions for interacting with Messages in the database
   */
  export class Messages {
    /**
     * Gets all messages between one user and antoher
     * @param {number} userId The first users id
     * @param {number} otherId The second users id
     * @returns {Message[]} An array of Message objects representing the conversation
     */
    static async getByOtherUser(
      userId: number,
      otherId: number
    ): Promise<Array<Message>> {
      var query = `SELECT * FROM messages WHERE sender=? and receiver=? UNION ALL SELECT * FROM messages WHERE receiver=? and sender=?;`;
      var [results] = await connection
        .promise()
        .query(query, [userId, otherId, userId, otherId]);

      return results as Array<Message>;
    }

    /**
     * Adds a new message to the database
     * @param {number} senderId The user id of the message sender
     * @param {number} receiverId The user id of the message receiver
     * @param {string} text The text content within the message
     * @returns {number} The messages insert id
     */
    static async add(
      senderId: number,
      receiverId: number,
      text: string
    ): Promise<number> {
      var query =
        `INSERT INTO messages (` +
        "`sender`" +
        `, ` +
        "`receiver`" +
        `, ` +
        "`text`" +
        `, ` +
        "`read`" +
        `, ` +
        "`notified`" +
        `) VALUES (?, ?, ?, '0', '0')`;
      var [result] = await connection
        .promise()
        .query<OkPacket>(query, [senderId, receiverId, text]);

      return result.insertId;
    }

    /**
     * Gets all conversations from the given user
     * @param {number} userId The users id
     * @returns An array of conversations
     */
    static async getConversations(userId: number) {
      var query1 = `select distinct sender, receiver from messages where sender = ? union all select distinct sender, receiver from messages where receiver = ?;`;
      var [results] = await connection
        .promise()
        .query<RowDataPacket[]>(query1, [userId, userId]);

      var query2 = `SELECT Users.id, Users.email, Business.company_name as username, Business.location, Business.logo FROM Users JOIN Business on Users.id = Business.user_id UNION ALL SELECT Users.id, Users.email, Individual.name as username, Individual.location, Individual.profile_picture AS logo FROM Users JOIN Individual on Users.id = Individual.user_id;`;
      var [profiles] = await connection
        .promise()
        .query<RowDataPacket[]>(query2);

      let temp: Array<Conversation> = [];
      // Refactor this
      (results as Array<{ sender: number; receiver: number }>).forEach(
        (result: { sender: number; receiver: number }) => {
          const filtered = (profiles as Array<Conversation>).filter(
            (a: Conversation) =>
              a.id == result.sender || a.id == result.receiver
          );
          temp.push(...filtered);
        }
      );
      let conversations: Array<Conversation> = [];
      temp.forEach((item) => {
        if (conversations.filter((a) => a.id == item.id).length == 0) {
          conversations.push(item);
        }
      });
      return conversations as Array<Conversation>;
    }

    /**
     * Gets all unread & unnotified messages accross all users
     * @returns {{id: number, email: string}[]} All unread and unnotified messages
     */
    static async getUnnotified(): Promise<Array<UnreadNotification>> {
      var query =
        "SELECT messages.id, Users.email FROM messages LEFT JOIN Users ON Users.id=`receiver` WHERE `read`='0' AND messages.timestamp < DATE_SUB(NOW(), interval 2 minute) AND `notified` ='0' ORDER BY timestamp DESC;";
      var [messages] = await connection.promise().query(query);

      return messages as Array<UnreadNotification>;
    }

    /**
     * Updates notified flag to present sent
     * @param id message id
     */
    static async updateNotifyForSentMessage(id: number): Promise<void> {
      await connection
        .promise()
        .query("UPDATE messages SET `notified`='1' WHERE id =" + id + ";");
    }

    /**
     * Updates read flag to read message
     * @param ids message id array
     */
    static async updateReadMessage(ids: Array<number>): Promise<void> {
      await connection
        .promise()
        .query(
          'UPDATE messages SET `read`="1" WHERE id IN (' + ids.join(", ") + ");"
        );
    }
  }
}
