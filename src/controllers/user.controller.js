import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { User } from "../models/user.model.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"

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
    //req bodu-> data
    //username or email
    //find the user
    ////password check 
    //access and refresh token
    //send cookies 
    //response succefully login


    const { email, password, username } = req.body;
    if (!username || !email) {
        throw new ApiError(400, "username or email is required");

    }
    const user = await User.findOne({
        $or: [{ username }, { email }]
    })
    if (!user) {
        throw new ApiError(404, "User does not exist");
    }

    const isPasswordValid = await user.isPsswordCorrect(password);
    if (!isPasswordValid) {
        throw new ApiError(401, "Invalid user credentials");
    }

   const {accessToken, refreshToken}=await generateAccessAndRefreshTokens(user._id);
   const loggedInUSer = User.findById(user._id).select("-password -refreshToken");

   const options = {
    httpOnly:true,
    secure:true,
   }
   return res.status(200)
   .cookie("accessToken", accessToken,options)
   .cookie("refreshToken", refreshToken,options)
   .json(
    new ApiResponse(200,{
        user:loggedInUSer,accessToken,refreshToken

    },

    "User logged in Succesfully"
)
   )

   



})
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


export { registerUser ,loiginUser, logoutUser}