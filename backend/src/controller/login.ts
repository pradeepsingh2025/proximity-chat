import { User } from "../db/mongo.ts";
import bcrypt from "bcrypt";


export default async function loginController(user : {username: string, password: string}) {

    const {username, password} = user;

    const userExists = await User.findOne({username});
    if(!userExists) throw new Error("User not found");

    const decodedPassword = await bcrypt.compare(password, userExists.password);

    if(!decodedPassword) throw new Error("Invalid password");
    return {username: userExists.username};
}