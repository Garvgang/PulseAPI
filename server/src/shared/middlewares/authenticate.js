import ResponseFormatter from "../utils/responseFormatter.js";
import logger  from "../../../shared/config/logger.js";
import jwt from "jsonwebtoken";
import config  from "../config/index.js";

const authenticate = async (req,res,next) => {
    try{
        let token=null;
        if(req.cookies && req.cookies.authToken){
            token = req.cookies.authToken
        }
        if(!token){
            return res.status(401).json(ResponseFormatter.error("Authentication Token is required",401))
        }
        const decoded = jwt.verify(token,config.jwt.secret);
        
        const {userId,email,username,role,clientId}=decoded;
        req.user={
            userId,email,username,role,clientId
        }
        next();
    }
    catch(error){
        logger.error("Authentication Failed",{
            error:error.message,
            path:req.path
        });

        if(error.name==="TokenExpiredError"){
            return res.status(401).json(ResponseFormatter.error('Token expired',401));
        }

        return res.status(401).json(ResponseFormatter.error('Invalid Token',401));
    }
}