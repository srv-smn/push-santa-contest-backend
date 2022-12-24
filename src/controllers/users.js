const userSchema = require("../models/users");
const balanceSchema = require("../models/balances");
const axios = require("axios");
const config = require('../../config')

const createUser = async (req, res) => {
  try {
    const walletAddress = req.body.walletAddress;
    const name = req.body.name;

    const userObject = {
      name: name,
      walletAddress: walletAddress,
    };

    const user = userSchema(userObject);
    const userResponse = await user.save();
    console.log(userResponse);

    const address = walletAddress;
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
    const config = {
      method: "post",
      url: baseURL,
      headers: {
        "Content-Type": "application/json",
      },
      data: data,
    };

    let response = await axios(config);
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
      //console.log(metadata["data"]);

      // Compute token balance in human-readable format
      balance = balance / Math.pow(10, metadata["data"]["result"].decimals);
      balance = balance.toFixed(2);

     

      const balanceObject = {
        tokenName: metadata["data"]["result"].name,
        user: userResponse._id,
        amount: balance
      };
  
      const b = balanceSchema(balanceObject);
      const balanceResponse = await b.save();
      console.log("userResponse._id=====>",userResponse._id);
      console.log("balanceResponse =======>", balanceResponse);

    }
    res.send('all done')
  } catch (error) {
    console.log(error);
    res.status(500).send(error)
  }
};

module.exports = {
    createUser
  };