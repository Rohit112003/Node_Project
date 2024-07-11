import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import { json } from "express"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken();
        user.refreshToken = refreshToken;
        await  user.save({validiteBeforeSave:false});
        return {refreshToken,accessToken};
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating refresh And access token")
    }
}



const registerUser = asyncHandler(async (req, res) => {
    const { fullname, email, username, password } = req.body
    if (
        [fullname, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All field are required")
    }
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (existedUser) {
        throw new ApiError(409, "user with email or username already exists")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    //    const coverImageLocalPath =  req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required");
    }
    const user = await User.create({
        fullname,
        avatar: avatar.url,
        email,
        password,
        coverImage: coverImage?.url || "",
        username: username.toLowerCase()
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User is registered succesfully")
    )



})
const loiginUser = asyncHandler(async (req, res) => {
    const { email, password, username } = req.body;

    if (!username && !email) {
        throw new ApiError(400, "username or email is required");
    }

    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPsswordCorrect(password);

    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

    const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true,
        sameSite: "Strict",
        maxAge: 24 * 60 * 60 * 1000 
    };

    res.cookie("accessToken", accessToken, options);
    res.cookie("refreshToken", refreshToken, options);

    res.status(200).json(new ApiResponse(200, {
        user: loggedInUser,
        accessToken,
        refreshToken
    }, "User logged in successfully"));
});

const logoutUser  = asyncHandler(async(req,res)=>{
      await  User.findByIdAndUpdate(
            req.user._id,
            {
                $set:{
                    refreshToken:undefined
                }
            },
            {
                new :true
            }
        )
        const options = {
            httpOnly:true,
            secure:true,
           }
           return res.status(200).clearCookie("accessToken",options).clearCookie("refreshToken",options)
           .json(new ApiResponse(200,{},"User log out"))

})

const refreshAccessToken = asyncHandler(async(req,res)=>{
   const incomingRefreshToken =  req.cookie.refreshToken || req.body.refreshToken
   if(!incomingRefreshToken){
    throw new ApiError(400, "Unathorized request")
   }

 try {
    const decodedToken =  jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET)
 const user = await User.findById(decodedToken?._id);
 if(!user){
    throw new ApiError(400, "Invalid refresh token")
   }

   if(incomingRefreshToken!== user?.refreshToken){
    throw new ApiError(401, "Refresh token is expired or used")
   }

   const  options = {
    httpOnly:true,
    secure:true
   }

  const {accessToken,newrefreshToken} =  await generateAccessAndRefreshTokens(user._id);
   return res.status(200).cookie("accessToken",accessToken ).cookie("refreshToken", newrefreshToken)
   .json(
    new ApiResponse(200, {accessToken,newrefreshToken}),
    "Accestoken refreshed Succesfully"
   )
 } catch (error) {
   throw new ApiError(401,error?.message|| "invalid refresh token" )
 }


})

const changeCurrentpassword = asyncHandler(async(req,res)=>{
    const {oldPassword, newPassword,confPassword} = req.body

    if(newPassword!==confPassword){
        throw new ApiError(401, "password is not matched with current password")
    }
    const user= await User.findById(req.user?._id);
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    if(!isPasswordCorrect){
        throw new ApiError(400,"Invalid ")
    }
    user.password = newPassword
    await user.save({validiteBeforeSave:false})

    return res.status(200, json(new ApiResponse(200, {}, "password Change SuccesFully")))
})

const getCurrentUser = asyncHandler(async( req,res)=>{
    return res.status(200).json(200, req.user, "Current USer fetched SuccesFully")
})


const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullname,email,username} = req.body
    if(!fullname || !email){
        throw new ApiError(400, "All fields are required");
    }
   const user =  User.findByIdAndUpdate(req.user?._id,{
        $set:{
            fullname,
            email
        }
    }, {new :true}).select("-password")

    return res.status(200).json(new ApiResponse(200, user,"Account Details updated SuccessFully"));

})


const updateavatarOrCoverImage = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.files?.avatar[0]?.path;
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files?.coverImage[0]?.path;
    }
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }
    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover file is required");
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if (!avatar.url) {
        throw new ApiError(400, "Avatar file is required");
    }
    if (!coverImage.url) {
        throw new ApiError(400, "Avatar file is required");
    }

    const user = User.findByIdAndUpdate(user._id, {
        $set:{
            avatar:avatar.url,
            coverImage:coverImage.url
        },
        
    } ,{new:true}).select("-password")

    return res.status(200).json(new ApiResponse(200, user,"Account Details updated SuccessFully"));

})
const updateUserAvatar = asyncHandler(async(req, res) => {
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is missing")
    }

    //TODO: delete old image - assignment

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if (!avatar.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Avatar image updated successfully")
    )
})

const updateUserCoverImage = asyncHandler(async(req, res) => {
    const coverImageLocalPath = req.file?.path

    if (!coverImageLocalPath) {
        throw new ApiError(400, "Cover image file is missing")
    }




 const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!coverImage.url) {
        throw new ApiError(400, "Error while uploading on avatar")
        
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200, user, "Cover image updated successfully")
    )
})


const getUserChannelProfile = asyncHandler(async(req,res)=>{
   const {username} =req.params
   if(!username?.trim()){
    throw new ApiError(400,"Username is missing")
   }
   const channel = await User.aggregate([
    {
        $match:{
            username:username?.toLowerCase()
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"channel",
            as:"Subsrcibers"
        }
    },
    {
        $lookup:{
            from:"subscriptions",
            localField:"_id",
            foreignField:"subsriber",
            as:"SubsrcibedTo"
        }
    },
    {        
        $addFields:{
            subscriberscount:{
                $size:"$subscribers"
            },
            channelsSubsribetoCount:{
                $size:"$SubsrcibedTo"
            },
            isSubscribed:{
                $cond:{
                    if:{$in:[req.user?._id,"$subscribers.subscriber"]},
                    then:true,
                    else:false 
                }
            }
        }
    },{
        $project:{
            fullname:1,
            username:1,
            avatar:1,
            coverImage:1,
            subscriberscount,
            channelsSubsribetoCount:1,
            isSubscribed:1,
            email:1
        }
    }
])
   if(!channel?.length){
    throw new ApiError(404, "Channel does not exist")
   }
   return res.status(200).json(new ApiResponse(200,channel[0], "User Channel fetched succesfully"))
})




export { registerUser 
    ,loiginUser,
     logoutUser,
     refreshAccessToken
     ,changeCurrentpassword
     ,getCurrentUser,
     updateAccountDetails
     ,updateavatarOrCoverImage
     ,updateUserAvatar
     ,updateUserCoverImage
    ,getUserChannelProfile 
    ,channel
}