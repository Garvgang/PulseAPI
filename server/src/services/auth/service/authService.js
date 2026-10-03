import AppError from "../../../shared/utils/AppError.js";
import config from "../../../shared/config/index.js"
import logger  from "../../../shared/config/logger.js";
import jwt from "jsonwebtoken";

export class AuthService{
    constructor(userRepository){
        if(!userRepository){
            throw new Error("New User is Required");
        }
        this.userRepository=userRepository;
    }
    
    generateToken(user){
        const {_id,email,username,role,clientId}=user ;
        const payload={
            userId:_id,
            username,
            email,
            role,
            clientId
        }
        return jwt.sign(payload,config.jwt.secret,{
            expiresIn:config.jwt.expiresIn
        })
    }
    
    formatUserForResponse(user){
        const userObj=user.toObject?user.toObject():{...user};
        delete userObj.password;
        return userObj;
    }

    async onboardSuperAdmin(superAdminData){
        try{
            const existingUser=await this.userRepository.findAll();
            if(existingUser.length > 0 && existingUser){
                throw new AppError("Super Admin Onbaording is disabled",403);
            }
            const user = await this.userRepository.create(superAdminData);
            const token= this.generateToken(user); 
            logger.info("Admin onboarded successfully",{
                username:user.username
            })
            return {
                user,
                token
            }
        }
        catch(error){
            logger.error("Error onboarding super admin :",error);
            throw error;    
        }
    }
}