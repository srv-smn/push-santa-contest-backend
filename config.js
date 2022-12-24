if(process.env.NODE_ENV){
    require ('custom-env').env(process.env.NODE_ENV || 'prod');
  }else{
    process.env.NODE_ENV = 'prod';
    require ('custom-env').env(process.env.NODE_ENV);
  }


  module.exports = {
    port: process.env.PORT,
    db_info:process.env.DB_URL,
    RPC: "https://rpc-mumbai.maticvigil.com/",
    PR_KEY: process.env.PR_KEY,
    CH_KEY: process.env.CH_KEY,
    CH_PKEY: process.env.CH_PKEY,
    AL_Key: process.env.AL_Key
  };