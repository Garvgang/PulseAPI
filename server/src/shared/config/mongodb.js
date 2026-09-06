import mongoose from 'mongoose';
import config from './index';
import logger from './logger';

// Mongodb database manager
class MongoConnection{
    constructor(){
        this.connection=null;
    }
    // connects to mongodb and uses singleton design pattern 
    async connect(){
        try{
            if(this.connection){
                logger.info("Mongodb already connected");
                return this.connection;
            }
            
            await mongoose.connect(config.mongo.uri,{
                dbName:config.mongo.dbName
            })
            
            this.connection=mongoose.connection;

            logger.info(`MongoDB connected: ${config.mongo.uri}`);

            this.connection.on("error",err=>{
                logger.error("MongoDB connection error :",error);
            })

            this.connection.on("disconnected",err=>{
                logger.error("MongoDB Disconnected");
            })
            return this.connection;
        }
        catch(error){
            logger.error("Failed to connect to MongoDB:",error);
            throw error;
        }
    }
    // disconnects to mongodb 
    async disconnect(){
        try{
            if(this.connection){
                await mongoose.disconnect();
                this.connection=null;
                logger.info("Mongodb disconnected");
            }
        }
        catch(error){
            logger.error('Failed to disconnect to Mongodb:',error);
            throw error;
        }
    }
    // get the active connection
    getConnection(){
        return ths.connection;
    }
}