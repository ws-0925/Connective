import axios from "axios";
import { useState, useEffect, useRef, Dispatch, SetStateAction } from "react";
import Layout from "../../components/layout";
import { withIronSession } from "next-iron-session";
import { useRouter } from "next/router";
import Head from "next/head";
import Avatar from "../../components/avatar";
import { User, Message, Conversation } from "../../types/types";
import {
  MessagesApiResponse,
  IApiResponseError,
  ProfileApiResponse,
} from "../../types/apiResponseTypes";

type PropsMessage = {
  text: string;
  sent: boolean;
};

const Message = ({ text, sent }: PropsMessage) => {
  if (sent) {
    return (
      <div className="ml-auto bg-blue-100 w-3/5 p-2 rounded-lg shadow-md">
        <p>{text}</p>
      </div>
    );
  } else {
    return (
      <div className="bg-slate-100 w-3/5 p-2 rounded-lg shadow">
        <p>{text}</p>
      </div>
    );
  }
};

type PropsConversations = {
  selectedUser: Conversation;
  setSelectedUser: Dispatch<SetStateAction<Conversation>>;
  conversations: Array<Conversation>;
  unreadMessagesCount: Array<number>;
};

const Conversations = ({
  selectedUser,
  setSelectedUser,
  conversations,
  unreadMessagesCount,
}: PropsConversations) => {
  const [filter, setFilter] = useState<string>("");
  const [filteredConversations, setFilteredConversations] = useState<
    Array<Conversation>
  >([]);

  useEffect(() => {
    setFilteredConversations([...conversations]);
  }, [conversations]);

  useEffect(() => {
    if (filter != "")
      setFilteredConversations(
        conversations.filter(
          (a: { username: string; email: string }) =>
            a.username.toLowerCase().includes(filter.toLowerCase()) ||
            a.email.toLowerCase().includes(filter.toLowerCase())
        )
      );
  }, [filter]);

  return (
    <div className="flex flex-col w-1/5 overflow-y-scroll bg-black/5">
      <Head>
        <title>Messages - Conenctive</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </Head>
      <input
        placeholder="Search..."
        onChange={(e) => {
          setFilter(e.target.value);
        }}
        className="outline-none pl-[32px] pr-[14px] text-sm py-2 rounded-full m-5 shadow-lg focus:outline-blue-200 transition-all hover:outline hover:outline-blue-300"
      ></input>

      {filteredConversations.map((item, index) => {
        return (
          <div
            onClick={() => {
              setSelectedUser(item);
            }}
            className={`flex items-center  flex-row p-2 cursor-pointer border-b border-slate-200 ${
              selectedUser?.id == item.id ? "bg-white" : "bg-slate-100"
            } hover:bg-slate-100/50 transition-all`}
          >
            {item.logo ? (
              <img
                src={item.logo}
                className="w-12 h-12 bg-white rounded-full shadow-lg"
              />
            ) : (
              <Avatar
                className="rounded-full shadow-lg"
                width="50px"
                height="50px"
                title={item.username}
              />
            )}
            <p className="my-auto ml-2 text-md font-medium">{item.username}</p>
            {
              // console.log(item, item.unread)
            }
            {unreadMessagesCount[item.id] > 0 ? (
              <span className="ml-auto mr-2 bg-[#D0342C] rounded-full min-w-[25px] min-h-[25px] text-white flex items-center justify-center">
                {unreadMessagesCount[item.id]}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};

type PropsChat = {
  users: Array<User>;
  selectedUser: Conversation;
  user: User;
  conversations: Array<Conversation>;
  getConversations: () => Promise<void>;
};

const Chat = ({
  users,
  selectedUser,
  user,
  conversations,
  getConversations,
}: PropsChat) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [userOptions, setUserOptions] = useState<
    Array<{ value: number; label: string }>
  >([]);
  const [text, setText] = useState<string>("");
  let prevMessages = 0;

  useEffect(() => {
    let temp = [];
    users.forEach((user: { id: number; username: string; email: string }) => {
      temp.push({
        value: user.id,
        label: user.username + " (" + user.email + ")",
      });
    });
    setUserOptions(temp);
  }, [users]);

  useEffect(() => {
    if (selectedUser != null) getMessages();
    else setMessages([]);

    let intervalId = setInterval(() => {
      if (selectedUser != null) getMessages();
    }, 1000);

    return () => clearInterval(intervalId);
  }, [selectedUser]);

  const sendMessage = async () => {
    // @ts-ignore
    if (document.getElementById("message-input").value != "") {
      await axios.post("/api/messages/" + selectedUser.id, { text });
      // @ts-ignore
      document.getElementById("message-input").value = "";

      //Re-fetch the list of conversations if the message was sent to a new conversation
      console.log(
        conversations.filter((a: { id: number }) => a.id == selectedUser.id)
      );
      if (
        conversations.filter((a: { id: number }) => a.id == selectedUser.id)
          .length == 0
      ) {
        getConversations();
      }
      setMessages([...messages, { sender: user.id, text }]);
    }
  };

  const getMessages = async () => {
    const res: MessagesApiResponse.IGetOtherID | IApiResponseError = (
      await axios.get("/api/messages/" + selectedUser.id)
    ).data;
    if (res.type == "IApiResponseError") {
      throw res;
    } else {
      if (res.messages.length > prevMessages) {
        document.getElementById("messages-container").scroll({
          top: document.getElementById("messages-container").scrollHeight,
          behavior: "smooth",
        });
      }
      prevMessages = res.messages.length;
      setMessages(res.messages);

      const unReadMesssages = res.messages.filter((message) => {
        return (
          !message.read &&
          message.receiver == user.id &&
          message.sender == selectedUser.id
        );
      });
      await axios("/api/messages/unread-messages-mailer", {
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
      });
      await readMessages(unReadMesssages);
    }
  };

  const readMessages = async (unReadMesssages: Array<Message>) => {
    console.log("EEEEEE", unReadMesssages);
    await axios.post("/api/messages/read-message", {
      header: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      data: unReadMesssages,
    });
  };

  // Send message on pressing Enter key
  const messageInputRef = useRef(null);
  useEffect(() => {
    const keyDownHandler = (event: { key: string }) => {
      if (
        event.key === "Enter" &&
        document.activeElement === messageInputRef.current
      ) {
        document.getElementById("message-submit-button").click();
      }
    };
    document.addEventListener("keydown", keyDownHandler);
    return () => {
      document.removeEventListener("keydown", keyDownHandler);
    };
  }, []);

  return (
    <div className="flex flex-col h-full w-4/5 rounded-r-lg">
      {selectedUser && (
        <div className="flex flex-row w-full p-2">
          <p className="font-medium text-lg w-full mt-2 pb-2 border-b-2 border-slate-100">
            {selectedUser?.username + " (" + selectedUser?.email + ")"}
          </p>
        </div>
      )}
      <div
        id="messages-container"
        className="h-full overflow-y-scroll p-5 flex flex-col gap-10"
      >
        {messages.map((item, index) => {
          return (
            <Message text={item.text} sent={item.sender == user.id}></Message>
          );
        })}
      </div>
      {selectedUser && (
        <div className="flex flex-row p-5 gap-5">
          <input
            ref={messageInputRef}
            id="message-input"
            placeholder="Type something..."
            onChange={(e) => {
              setText(e.target.value);
            }}
            className="outline-none w-full pl-[32px] pr-[14px] text-[14px] h-[47px] border border-black/20 rounded-md focus:outline-blue-200 transition-all hover:outline hover:outline-blue-300"
          ></input>
          <button
            id="message-submit-button"
            className="w-fit px-10"
            onClick={sendMessage}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
};

const UserDetails = ({ selectedUser }) => {
  return (
    <div className="w-1/5 h-full px-2">
      {selectedUser && (
        <>
          {selectedUser.logo ? (
            <img
              src={selectedUser.logo}
              className="w-12 h-12 bg-white rounded-full shadow-lg"
            />
          ) : (
            <Avatar
              className="rounded-full shadow-lg mt-5"
              width="30px"
              height="30px"
              title={selectedUser.username}
            />
          )}
          <p className="font-bold text-lg text-center mt-5">
            {selectedUser.username}
          </p>
          <p className="text-sm font-bold mt-10">Contact Details:</p>
          <div className="flex flex-row gap-2 my-5">
            <div className="bg-black/5 rounded-full p-[7px] w-8 h-8 shadow-lg">
              <img src="/assets/email.png"></img>
            </div>
            <p className="text-sm my-auto break-all">{selectedUser.email}</p>
          </div>
          <div className="flex flex-row gap-2">
            <div className="bg-black/5 rounded-full p-[7px] w-8 h-8 shadow-lg">
              <img src="/assets/location.png"></img>
            </div>
            <p className="text-sm my-auto break-all">{selectedUser.location}</p>
          </div>
        </>
      )}
    </div>
  );
};

export default function Messages({ user }) {
  const router = useRouter();
  const { newUser } = router.query;
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUser, setSelectedUser] = useState<Conversation>();

  // Automatically open latest (last opened) conversation when navigating to messages page
  useEffect(() => {
    let x: (prevState: undefined) => undefined;
    if (sessionStorage.selectedUser)
      x = JSON.parse(sessionStorage.selectedUser);
    if (x !== undefined) {
      setSelectedUser(x);
    }
  }, []);
  useEffect(() => {
    if (selectedUser != undefined) {
      window.sessionStorage.setItem(
        "selectedUser",
        JSON.stringify(selectedUser)
      );
    }
  }, [selectedUser]);

  const [conversations, setConversations] = useState<Array<Conversation>>([]);
  let unreadMessagesCount = [];
  let sum = 0;
  const getUsers = async () => {
    const data: ProfileApiResponse.IProfiles = (
      await axios.get("/api/profiles/all")
    ).data;
    setUsers(data.users);
    if (newUser) {
      const temp = data.users.filter(
        (item) => item.id.toString() == newUser
      )[0];
      const selectedUser = {
        id: temp.id,
        email: temp.email,
        username: temp.username,
        location: "",
        logo: temp.logo,
      } as Conversation;
      setSelectedUser(selectedUser);
    }
  };

  const getConversations = async () => {
    const data: MessagesApiResponse.IConversations = (await axios.get(
      "/api/messages/conversations"
    )).data;
    let temp = [];
    console.log(data);
    data.conversations.forEach((item: Conversation) => {
      let tempItem = data.conversations.filter(
        (a: { id: number }) => a.id != user.id
      )[0];
      if (tempItem != undefined)
        if (temp.filter((a) => a.id == tempItem.id).length == 0)
          temp.push(tempItem);
    });
    let temp2 = [...temp];
    temp2?.map(async (item, index) => {
      let x = await getUnreadMessages(item.id);
      item.unread = x;
      unreadMessagesCount[item.id] = x;
    });
    setConversations(temp2);
    sum = unreadMessagesCount?.reduce((a, v) => a + v, 0);
  };

  const getUnreadMessages = async (id: string) => {
    const res: MessagesApiResponse.IGetOtherID | IApiResponseError =
      await axios.get("/api/messages/" + id);
    if (res.type == "IApiResponseError") throw res;
    const unReadMesssages = res.messages.filter((message) => {
      return message.read && message.receiver == user.id;
    }).length;
    return unReadMesssages;
  };

  useEffect(() => {
    getUsers();
    getConversations();

    let intervalId = setInterval(() => {
      getConversations();
    }, 5000);

    return () => clearInterval(intervalId);
  }, []);

  return (
    <Layout user={user} title="Messages">
      <div className="bg-white h-full overflow-clip mt-5 flex flex-row">
        <Conversations
          unreadMessagesCount={unreadMessagesCount}
          selectedUser={selectedUser}
          conversations={conversations}
          setSelectedUser={setSelectedUser}
        ></Conversations>
        <Chat
          user={user}
          users={users}
          selectedUser={selectedUser}
          conversations={conversations}
          getConversations={getConversations}
        ></Chat>
        <UserDetails selectedUser={selectedUser}></UserDetails>
      </div>
    </Layout>
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
