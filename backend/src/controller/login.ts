import type { UserData } from "../types/player.ts";
import { User } from "../db/mongo.ts";
import { db } from "../db/connection.ts";


export default async function loginController(user : UserData) {

    const {userId, username, password} = user;

    const userExists = await User.findOne({userId});
    if(!userExists) throw new Error("User not found");

    const usernameExists = await User.findOne({username});
    if(!usernameExists) throw new Error("Username not found");

    if(userExists.password !== password) throw new Error("Invalid password");
    if(usernameExists.password !== password) throw new Error("Invalid password");
    return userExists;
}