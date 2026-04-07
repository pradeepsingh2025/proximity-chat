import { User } from "../db/mongo.ts";


export default async function signupController(user: {username: string, password: string}){
    const {username, password} = user;


    const userExists = await User.findOne({username});
    if(userExists) throw new Error("User already exists");

    const newUser = new User({username, password});
    await newUser.save();
    return {username: newUser.username};
}