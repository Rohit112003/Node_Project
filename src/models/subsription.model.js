import mongoose, {Schema} from "mongoose";


const subscriptionSchema = new Schema(
    {
        subsrciber:{
            type:Schema.Types.ObjectId, //one who is subsribing
            ref:"User"

        },
        channel:{
            type:Schema.Types.ObjectId, //one to whom 'subscriber is subscribing'
            ref:"User" 
        },


    },{timestamps:true}
)



export const subscription = mongoose.model("Subscription", subscriptionSchema)