import {authController} from "../controllers/authController.js";
import {AuthService} from "../service/authService.js";
import MongoUserReository from "../repository/UserRepository.js";

class Container{
    static init(){
        const repositories={
            userRepository : MongoUserReository
        };
        
        const services={
            authService : new AuthService(repositories.userRepository)
        };

        const controller={
            authController : new AuthController(services.authService)
        };

        return {
            repositories,services,controller
        };
    }
}

const initialized= Container.init();
export {Container};
export default initialized;