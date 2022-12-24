const express = require("express");
const mongoose = require("mongoose");
var path = require("path");
var cors = require("cors");
const app = express();
const router = express.Router();
const config = require("./config");
const bodyParser = require("body-parser");
let cron = require("node-cron");
const ethers = require("ethers");
const PushAPI = require("@pushprotocol/restapi");
const userSchema = require("./src/models/users");
const balanceSchema = require("./src/models/balances");
const axios = require("axios");

let port = config.port;
let uriMongo = config.db_info;

const userRoute = require("./src/routes/user");

mongoose.connect(
  uriMongo,
  {
    //reconnectTries: Number.MAX_VALUE,
    useNewUrlParser: true,
    //useCreateIndex: true,
    //autoReconnect: true,
    useUnifiedTopology: true,
  },
  function (err, db) {
    if (err) {
      console.log("DB Connection errored");
      return;
    } else {
      console.log("DB Connected successfully");
    }
  }
);

app.use(cors());
app.use(express.json());

app.use("/user", userRoute);

app.listen(port, () => {
  console.log("App running at port:" + port);
});

//     const PK = config.CH_KEY;
//     const Pkey = `0x${config.PR_KEY}`;
//     const signer = new ethers.Wallet(Pkey);
//   console.log("in Cron");
//   let today;
//   try {
//     today = moment(new Date()).format("MM-DD");

//   const data = await memoriesSchema.find({
//     memoryDate: today,
//   }).populate('User');
//   console.log('level 1 length',data.length);

//   data.map(async (mem) => {
//     const profileID = mem.User.profileID;
//     const req = gql`{
//         followers(request: {
//           profileId: "${profileID}"
//         }) {
//           items {
//             wallet {
//               address
//             }
//           }
//         }
//       }`;

//       const followerData = await request(
//         'https://api-mumbai.lens.dev/',
//         req
//       );
//         let concatA = []
//         console.log('followersData', followerData);
//       followerData.followers.items.map(async(follower) => {
//         let constantV = 'eip155:80001:'
//         let final = `${constantV}${follower.wallet.address}`
//         concatA.push(final)
//       })
//       console.log("--------------------->", concatA);
//       let messageTitle = `Today is special for ${mem.User.Name}, let's congratulate together 🎊`
//       const apiResponse = await PushAPI.payloads.sendNotification({
//         signer,
//         type: 4, // subset
//         identityType: 2, // direct payload
//         notification: {
//           title: `${messageTitle}`,
//           body: `[s: ${mem.memoryDescription}]`
//         },
//         payload: {
//           title: `${messageTitle}`,
//           body: `[s: ${mem.memoryDescription}]`,
//           cta: '',
//           img: ''
//         },
//         recipients: concatA, // recipients addresses
//         channel: `eip155:80001:${config.CH_PKEY}`, // your channel address
//         env: 'staging'
//       });
//   })

// } catch (error) {
//     console.log(error);
// }
// });

cron.schedule("* * * * *", async () => {
  const PK = config.CH_KEY;
  const Pkey = `0x${config.PR_KEY}`;
  const signer = new ethers.Wallet(Pkey);

  console.log("in Cron");
  const users = await userSchema.find();

  users.map(async (user) => {
    console.log("user ===>", user);
    try {
      const address = user.walletAddress;
      // Alchemy URL --> Replace with your API key at the end
      const baseURL = `https://eth-mainnet.g.alchemy.com/v2/${config.AL_Key}`;

      // Data for making the request to query token balances
      const data = JSON.stringify({
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        headers: {
          "Content-Type": "application/json",
        },
        params: [`${address}`],
        id: 1,
      });

      // config object for making a request with axios
      const config1 = {
        method: "post",
        url: baseURL,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      let response = await axios(config1);
      response = response["data"];

      // Getting balances from the response
      const balances = response["result"];

      // Remove tokens with zero balance
      const nonZeroBalances = await balances.tokenBalances.filter((token) => {
        return token.tokenBalance !== "0";
      });

      for (let token of nonZeroBalances) {
        // Get balance of token
        let balance = token.tokenBalance;

        // options for making a request to get the token metadata
        const options = {
          method: "POST",
          url: baseURL,
          headers: {
            accept: "application/json",
            "content-type": "application/json",
          },
          data: {
            id: 1,
            jsonrpc: "2.0",
            method: "alchemy_getTokenMetadata",
            params: [token.contractAddress],
          },
        };

        // getting the token metadata
        const metadata = await axios.request(options);

        // Compute token balance in human-readable format
        balance = balance / Math.pow(10, metadata["data"]["result"].decimals);
        balance = balance.toFixed(2);

        // Print name, balance, and symbol of token

        const userBalance = await balanceSchema.findOne({
          tokenName: metadata["data"]["result"].name,
          user: user._id,
        });

        if (!userBalance) {
          const balanceObject = {
            tokenName: metadata["data"]["result"].name,
            user: user._id,
            amount: balance,
          };

          const b = balanceSchema(balanceObject);
          const balanceResponse = await b.save();

          let messageTitle = `${balance} ${metadata["data"]["result"].name} Credited`;
          let messageBody = `Your wallet ${user.walletAddress} has been credited with ${balance} ${metadata["data"]["result"].name}. Your current available balance is ${balance} ${metadata["data"]["result"].name}`;
          let constantV = "eip155:80001:";
          let final = `${constantV}${user.walletAddress}`;
          let recipients = final;
          console.log("new coin detected");
          console.log("final", final);

          const apiResponse = await PushAPI.payloads.sendNotification({
            signer,
            type: 3, // target
            identityType: 2, // direct payload
            notification: {
              title: `${messageTitle}`,
              body: `[s: ${messageBody}]`,
            },
            payload: {
              title: `${messageTitle}`,
              body: `[s: ${messageBody}]`,
              cta: `https://etherscan.io/tokenholdings?a=${user.walletAddress}`,
              img: metadata["data"]["result"].logo,
            },
            recipients: final, // recipients addresses
            channel: `eip155:80001:${config.CH_PKEY}`, // your channel address
            env: "staging",
          });
          console.log("notification sent");
        } else {
          let diff = userBalance.amount - balance;

          if (userBalance.amount < balance) {
            // credit
            diff = Math.abs(diff);
            let messageTitle = `${diff} ${metadata["data"]["result"].name} Credited`;
            let messageBody = `Your wallet ${user.walletAddress} has been credited with ${diff} ${metadata["data"]["result"].name}. Your current available balance is ${balance} ${metadata["data"]["result"].name}`;
            let constantV = "eip155:80001:";
            let final = `${constantV}${user.walletAddress}`;
            let recipients = final;
            console.log("new coin detected");
            console.log("final", final);

            const apiResponse = await PushAPI.payloads.sendNotification({
              signer,
              type: 3, // target
              identityType: 2, // direct payload
              notification: {
                title: `${messageTitle}`,
                body: `[s: ${messageBody}]`,
              },
              payload: {
                title: `${messageTitle}`,
                body: `[s: ${messageBody}]`,
                cta: `https://etherscan.io/tokenholdings?a=${user.walletAddress}`,
                img: metadata["data"]["result"].logo,
              },
              recipients: final, // recipients addresses
              channel: `eip155:80001:${config.CH_PKEY}`, // your channel address
              env: "staging",
            });
            userBalance.amount = balance;
            await userBalance.save();
            console.log("notification sent");
          } else {
            if (userBalance.amount > balance) {
              // debit
              diff = Math.abs(diff);
              let messageTitle = `${diff} ${metadata["data"]["result"].name} Debited`;
              let messageBody = `Your wallet ${user.walletAddress} has been debited with ${diff} ${metadata["data"]["result"].name}. Your current available balance is ${balance} ${metadata["data"]["result"].name}`;
              let constantV = "eip155:80001:";
              let final = `${constantV}${user.walletAddress}`;
              let recipients = final;
              console.log("new coin detected");
              console.log("final", final);

              const apiResponse = await PushAPI.payloads.sendNotification({
                signer,
                type: 3, // target
                identityType: 2, // direct payload
                notification: {
                  title: `${messageTitle}`,
                  body: `[s: ${messageBody}]`,
                },
                payload: {
                  title: `${messageTitle}`,
                  body: `[s: ${messageBody}]`,
                  cta: `https://etherscan.io/tokenholdings?a=${user.walletAddress}`,
                  img: metadata["data"]["result"].logo,
                },
                recipients: final, // recipients addresses
                channel: `eip155:80001:${config.CH_PKEY}`, // your channel address
                env: "staging",
              });
              userBalance.amount = balance;
              await userBalance.save();
              console.log("notification sent");
            }
          }
        }
      }
    } catch (error) {
      console.log(error);
    }
  });
});

module.exports = app;
