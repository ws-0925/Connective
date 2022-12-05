import axios from "axios";
import { useState, useEffect } from "react";
import { withIronSession } from "next-iron-session";
import Sidebar from "../../../components/sidebar";
import BusinessProfile from "../../../components/profile/business";
import IndividualProfile from "../../../components/profile/individual";
import Util from "../../../util";
import {useRouter} from "next/router"
 
export default function Profile({ user }) {
  const [accountType, setAccountType] = useState();
  const router = useRouter()
  const {id} = router.query

  const getAccountType = async () => {
    setAccountType(await Util.accountType(id));
  };
  useEffect(() => {
    if(typeof(user) == "undefined") router.push("/auth/signin")
    getAccountType();
  }, []);

  return (
    <main  className="flex flex-row h-screen min-w-screen font-[Montserrat] bg-[#F5F5F5]">
      <Sidebar user={user}></Sidebar>
      <div  className="h-screen w-screen overflow-y-scroll">
        {accountType == "Business" && (
          <BusinessProfile user={user} id={id}></BusinessProfile>
        )}
        {accountType == "Individual" && (
          <IndividualProfile user={user} id={id}></IndividualProfile>
        )}
      </div>
    </main>
  );
}

export const getServerSideProps = withIronSession(
  async ({ req, res }) => {
    const user = req.session.get("user");

    if (!user) {
      return { props: {} };
    }

    return {
      props: { user },
    };
  },
  {
    cookieName: "Connective",
    cookieOptions: {
      secure: process.env.NODE_ENV == "production" ? true : false,
    },
    password: process.env.APPLICATION_SECRET,
  }
);
