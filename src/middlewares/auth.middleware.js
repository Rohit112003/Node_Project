import  jwt  from "jsonwebtoken";
import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { User } from "../models/user.model.js";

export const verifiyJWT= asyncHandler(async(req,_,next)=>{
   try{
    const token =    req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
    if(!token){
        throw new ApiError(401,"Unauthorized Access")
    }
    const decodedToken =  jwt.verifiy(token,process.env.ACCESS_TOKEN_SECRET);
    const user = await User.findById(decodedToken?._id).select("-password -refresToken");
    if (!user) {
        throw new ApiError(401, "Invalid Access Token")
    } 
    req.user=user;
    next();
   }catch(error){
   throw new ApiError(410, error?.message || "Invalid Access Token")
   }
})