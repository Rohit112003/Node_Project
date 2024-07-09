import { Router } from "express";
import { loiginUser, registerUser,logoutUser,refreshAccessToken } from "../controllers/user.controller.js";
import {upload} from "../middlewares/multer.middleware.js"
import { verifiyJWT } from "../middlewares/auth.middleware.js";
const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name:"avatar",
            maxCount:1
        },
        {
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser
)
router.route("/login").post(loiginUser)

//securedroutes

router.route("/logout").post(verifiyJWT,logoutUser)
router.route("/refresh-token").post(refreshAccessToken)



           
export default router;