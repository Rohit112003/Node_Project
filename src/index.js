import 'dotenv/config'
import connectDB from "./db/index.js";
import {app} from './app.js'



connectDB().then(()=>{
    app.listen(process.env.PORT|| 8000, ()=>{
        console.log("Server is listening on 8000 ")
    })
}).catch((error)=>{
    console.log("MongoDb Connection Failed")
})







// import express from "express"
// const app = express();
// ( async()=>{
//     try{
//         await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
//         app.on("error", (error)=>{
//             console.log("ERROR", error);
//             throw error
//         })
//         app.listen(process.env.PORT , ()=>{
//             console.log(`App is listening on ${PORT}`)
//         })

//     }catch(error){
//         console.log(error);
//     }
// })()