import { APPLICATION_ROLES } from "../../../shared/constants/role";
import config from "../../../shared/config/index.js";
import ResponeFormatter from "../../../shared/utils/responseFormatter.js"

export class AuthController{
    constructor(authService){
        if(!authService){
            throw new Error("userService is Required");
        }
        this.authService=authService;
    };

    async onboardSuperAdmin(req,res,next){
        try{
            const {username,email,password} = req.body();
            const superAdminData={
                username,email,password,role:APPLICATION_ROLES.SUPER_ADMIN
            };
            const {token,user}=await this.authService.onboardSuperAdmin(superAdminData);
            res.cookie('authToken',token,{
                httpOnly:config.cookie.httpOnly,
                secure:config.cookie.secure,
                maxAge:config.cookie.expiresIn
            });
            res.status(201).json(
                ResponeFormatter.success(user,"Super Admin created successfully",201)
            )
        }
        catch(error){
            next(error);
        }
    }
}