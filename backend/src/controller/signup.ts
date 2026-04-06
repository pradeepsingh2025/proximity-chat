import type { UserData } from "../types/player.ts";
import { User } from "../db/mongo.ts";


export default async function signupController(user: UserData){
    const {userId, username, password} = user;


    const userExists = await User.findOne({userId});
    if(userExists) throw new Error("User already exists");

    const usernameExists = await User.findOne({username});
    if(usernameExists) throw new Error("Username already exists");

    const newUser = new User({userId, username, password});
    await newUser.save();
    return newUser;
}