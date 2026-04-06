import { User } from "../db/mongo.ts";


export default async function loginController(user : {username: string, password: string}) {

    const {username, password} = user;

    const userExists = await User.findOne({username});
    if(!userExists) throw new Error("User not found");

    if(userExists.password !== password) throw new Error("Invalid password");
    return userExists;
}