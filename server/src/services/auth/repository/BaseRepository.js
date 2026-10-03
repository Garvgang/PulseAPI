//  Interface

export default class BaseRepository{
    constructor(model){
        this.model=model;
    }
    async create(data){
        throw new Error('Method not Implemeneted');
    }
    async findById(id){
        throw new Error('Method not Implemeneted');
    }
    async findByUsername(username){
        throw new Error('Method not Implemeneted');
    }
    async findByEmail(email){
        throw new Error('Method not Implemeneted');
    }
    async findAll(){
        throw new Error('Method not Implemeneted');
    }
}